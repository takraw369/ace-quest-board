import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function getAdminKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try { return JSON.parse(raw)?.default; } catch (_) {}
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
  if (req.method !== "POST") return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: cors });

  const adminKey = getAdminKey();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!adminKey || !supabaseUrl) {
    return Response.json({ ok: false, error: "server_not_configured" }, { status: 503, headers: cors });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const session = await verifySession(String(body?.session_token ?? ""), adminKey);
    if (!session) return Response.json({ ok: false, error: "invalid_or_expired_session" }, { status: 401, headers: cors });

    const endpoint = String(body?.subscription?.endpoint ?? "").trim();
    const p256dh = String(body?.subscription?.keys?.p256dh ?? "").trim();
    const auth = String(body?.subscription?.keys?.auth ?? "").trim();
    if (!endpoint || !p256dh || !auth) {
      return Response.json({ ok: false, error: "invalid_subscription" }, { status: 400, headers: cors });
    }
    if (!endpoint.startsWith("https://")) {
      return Response.json({ ok: false, error: "invalid_endpoint" }, { status: 400, headers: cors });
    }

    const now = new Date().toISOString();
    const supabase = createClient(supabaseUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await supabase.from("pwa_push_subscriptions").upsert({
      contact_id: String(session.sub),
      endpoint,
      p256dh,
      auth,
      user_agent: String(req.headers.get("user-agent") ?? "").slice(0, 500) || null,
      enabled: true,
      updated_at: now,
      last_seen_at: now,
    }, { onConflict: "endpoint" });
    if (error) throw error;

    return Response.json({ ok: true }, { headers: cors });
  } catch (error) {
    console.error("pwa-push-subscribe failed", error);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500, headers: cors });
  }
});
