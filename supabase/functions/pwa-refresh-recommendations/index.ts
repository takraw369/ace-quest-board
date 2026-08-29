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

function flowDayWindow(now = new Date()) {
  const JST = 9 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + JST);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const beforeFive = local.getUTCHours() < 5;
  const localDayMs = Date.UTC(y, m, d) - (beforeFive ? 24 * 60 * 60 * 1000 : 0);
  const start = new Date(localDayMs - JST + 5 * 60 * 60 * 1000);
  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const keyLocal = new Date(start.getTime() + JST);
  const key = `${keyLocal.getUTCFullYear()}-${String(keyLocal.getUTCMonth() + 1).padStart(2, "0")}-${String(keyLocal.getUTCDate()).padStart(2, "0")}`;
  return { start, next, key };
}

async function currentDailyQuest(supabase: any, personId: string) {
  const window = flowDayWindow();
  const { data, error } = await supabase
    .from("education_recommendations")
    .select("id,recommendation_ref,acted_at,metadata")
    .eq("person_id", personId)
    .eq("recommendation_type", "quest")
    .eq("status", "completed")
    .gte("acted_at", window.start.toISOString())
    .lt("acted_at", window.next.toISOString())
    .order("acted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? {
    status: "completed",
    flow_day: window.key,
    completed_at: data.acted_at,
    completed_recommendation_id: data.id,
    completed_node_id: data?.metadata?.node_id ?? null,
    next_unlock_at: window.next.toISOString(),
  } : {
    status: "available",
    flow_day: window.key,
    completed_at: null,
    completed_recommendation_id: null,
    completed_node_id: null,
    next_unlock_at: window.next.toISOString(),
  };
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
    const token = String(body?.session_token ?? "");
    const session = await verifySession(token, adminKey);
    if (!session) {
      return Response.json({ ok: false, error: "invalid_or_expired_session" }, { status: 401, headers: cors });
    }

    const personId = String(session.sub);
    const supabase = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const dailyQuest = await currentDailyQuest(supabase, personId);
    const { data: contact } = await supabase
      .from("contacts")
      .select("metadata")
      .eq("id", personId)
      .maybeSingle();

    if (dailyQuest.status === "completed") {
      return Response.json({
        ok: true,
        pending: false,
        daily_complete: true,
        daily_quest: dailyQuest,
        recommendations: [],
        recommendation_summary: contact?.metadata?.current_recommendations ?? null,
      }, { headers: cors });
    }

    const { data: rows, error } = await supabase
      .from("education_recommendations")
      .select("id,recommendation_type,recommendation_ref,destination,reason,confidence,alternative,metadata,status,generated_at")
      .eq("person_id", personId)
      .eq("status", "proposed")
      .order("generated_at", { ascending: false })
      .limit(12);
    if (error) throw error;

    const latestByType = ["education", "quest", "connection"]
      .map((type) => (rows ?? []).find((row) => row.recommendation_type === type))
      .filter(Boolean);

    return Response.json({
      ok: true,
      pending: false,
      daily_complete: false,
      daily_quest: dailyQuest,
      recommendations: latestByType,
      recommendation_summary: contact?.metadata?.current_recommendations ?? null,
      ace_adapted: latestByType.some((row: any) => String(row?.metadata?.ace_adapter ?? "").startsWith("ace-recommendation-adapter-v")),
    }, { headers: cors });
  } catch (error) {
    console.error("pwa-refresh-recommendations error", error);
    return Response.json({ ok: false, error: "refresh_failed" }, { status: 500, headers: cors });
  }
});
