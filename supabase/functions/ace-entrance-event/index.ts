import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MILESTONES = new Set([
  "character_saved",
  "connected",
  "calibrated",
  "first_quest_selected",
]);

function getAdminKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      return JSON.parse(raw)?.default;
    } catch (_) {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const configured = (Deno.env.get("PWA_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = configured.length === 0 || configured.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : configured.length === 0 ? "*" : configured[0],
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}

function fromB64url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return new Uint8Array([...binary].map((char) => char.charCodeAt(0)));
}

async function verifySession(token: string, secret: string) {
  try {
    const [payloadPart, sigPart] = token.split(".");
    if (!payloadPart || !sigPart) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromB64url(sigPart),
      new TextEncoder().encode(payloadPart),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromB64url(payloadPart)));
    const now = Math.floor(Date.now() / 1000);
    if (payload?.aud !== "flow-pwa" || !payload?.sub || Number(payload?.exp ?? 0) <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: cors });
  }

  const adminKey = getAdminKey();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!adminKey || !supabaseUrl) {
    return Response.json({ ok: false, error: "server_not_configured" }, { status: 503, headers: cors });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const session = await verifySession(String(body?.session_token ?? ""), adminKey);
    if (!session) {
      return Response.json({ ok: false, error: "invalid_or_expired_session" }, { status: 401, headers: cors });
    }

    const milestone = String(body?.milestone ?? "");
    if (!MILESTONES.has(milestone)) {
      return Response.json({ ok: false, error: "invalid_milestone" }, { status: 400, headers: cors });
    }

    const personId = String(session.sub);
    const eventType = `ace_entrance_${milestone}`;
    const supabase = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existing, error: existingError } = await supabase
      .from("funnel_events")
      .select("id")
      .eq("contact_id", personId)
      .eq("event_type", eventType)
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return Response.json({ ok: true, event: eventType, duplicate: true }, { headers: cors });
    }

    const payload = {
      milestone,
      client_event_id: body?.client_event_id ? String(body.client_event_id).slice(0, 100) : null,
      occurred_at: body?.occurred_at ? String(body.occurred_at).slice(0, 40) : null,
      source: "ace_start_gate_v2",
    };

    const { error } = await supabase.from("funnel_events").insert({
      contact_id: personId,
      event_type: eventType,
      channel: "pwa",
      payload,
    });
    if (error) throw error;

    return Response.json({ ok: true, event: eventType, duplicate: false }, { headers: cors });
  } catch (error) {
    console.error("ace-entrance-event error", error);
    return Response.json({ ok: false, error: "event_failed" }, { status: 500, headers: cors });
  }
});
