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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyAceAdapter(supabaseUrl: string, adminKey: string, personId: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/ace-recommendation-adapter`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": adminKey },
    body: JSON.stringify({ contact_id: personId }),
  });
  if (!response.ok) throw new Error(`ace_adapter_${response.status}`);
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
    const previousRecommendationId = body?.previous_recommendation_id
      ? String(body.previous_recommendation_id)
      : null;
    const session = await verifySession(token, adminKey);
    if (!session) {
      return Response.json({ ok: false, error: "invalid_or_expired_session" }, { status: 401, headers: cors });
    }

    const personId = String(session.sub);
    const supabase = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const { data: rows, error } = await supabase
        .from("education_recommendations")
        .select("id,recommendation_type,recommendation_ref,destination,reason,confidence,alternative,metadata,status,generated_at")
        .eq("person_id", personId)
        .eq("status", "proposed")
        .order("generated_at", { ascending: false })
        .limit(12);
      if (error) throw error;

      const recommendations = rows ?? [];
      const freshQuest = recommendations.find((row) =>
        row.recommendation_type === "quest" && row.id !== previousRecommendationId
      );

      if (freshQuest) {
        await applyAceAdapter(supabaseUrl, adminKey, personId);

        const { data: adaptedRows, error: adaptedError } = await supabase
          .from("education_recommendations")
          .select("id,recommendation_type,recommendation_ref,destination,reason,confidence,alternative,metadata,status,generated_at")
          .eq("person_id", personId)
          .eq("status", "proposed")
          .order("generated_at", { ascending: false })
          .limit(12);
        if (adaptedError) throw adaptedError;

        const latestByType = ["education", "quest", "connection"]
          .map((type) => (adaptedRows ?? []).find((row) => row.recommendation_type === type))
          .filter(Boolean);

        const { data: contact } = await supabase
          .from("contacts")
          .select("metadata")
          .eq("id", personId)
          .maybeSingle();

        return Response.json({
          ok: true,
          pending: false,
          recommendations: latestByType,
          recommendation_summary: contact?.metadata?.current_recommendations ?? null,
          ace_adapted: latestByType.some((row: any) => row?.metadata?.ace_adapter === "ace-recommendation-adapter-v1"),
        }, { headers: cors });
      }

      await sleep(250);
    }

    return Response.json({
      ok: true,
      pending: true,
      recommendations: [],
      recommendation_summary: null,
    }, { status: 202, headers: cors });
  } catch (error) {
    console.error("pwa-refresh-recommendations error", error);
    return Response.json({ ok: false, error: "refresh_failed" }, { status: 500, headers: cors });
  }
});
