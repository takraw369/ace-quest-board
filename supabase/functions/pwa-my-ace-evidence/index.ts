import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function getAdminKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { return JSON.parse(raw)?.default; } catch (_) {} }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const configured = (Deno.env.get("PWA_ALLOWED_ORIGINS") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
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
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, fromB64url(sigPart), new TextEncoder().encode(payloadPart));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(payloadPart)));
    if (payload?.aud !== "flow-pwa" || !payload?.sub || Number(payload?.exp ?? 0) <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: cors });

  const adminKey = getAdminKey(), supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!adminKey || !supabaseUrl) return Response.json({ ok: false, error: "server_not_configured" }, { status: 503, headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const session = await verifySession(String(body?.session_token ?? ""), adminKey);
    if (!session) return Response.json({ ok: false, error: "invalid_or_expired_session" }, { status: 401, headers: cors });
    const personId = String(session.sub);
    const limit = Math.min(50, Math.max(1, Number(body?.limit ?? 20)));
    const supabase = createClient(supabaseUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const [{ data: contact, error: contactError }, { data: progress, error: progressError }, { data: evidence, error: evidenceError }] = await Promise.all([
      supabase.from("contacts").select("display_name,lifecycle_stage").eq("id", personId).maybeSingle(),
      supabase.from("person_progress").select("xp_total,growth_level,growth_rank,streak_current,quests_completed").eq("contact_id", personId).maybeSingle(),
      supabase.from("education_recommendations")
        .select("id,recommendation_ref,reason,acted_at,outcome,metadata,alternative")
        .eq("person_id", personId)
        .eq("recommendation_type", "quest")
        .eq("status", "completed")
        .order("acted_at", { ascending: false })
        .limit(limit),
    ]);
    if (contactError) throw contactError;
    if (progressError) throw progressError;
    if (evidenceError) throw evidenceError;

    return Response.json({
      ok: true,
      profile: contact ?? null,
      progress: progress ?? { xp_total: 0, growth_level: 1, growth_rank: "seed", streak_current: 0, quests_completed: 0 },
      evidence: evidence ?? [],
    }, { headers: cors });
  } catch (error) {
    console.error("pwa-my-ace-evidence error", error);
    return Response.json({ ok: false, error: "my_ace_evidence_failed" }, { status: 500, headers: cors });
  }
});
