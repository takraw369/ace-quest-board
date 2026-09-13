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

type FunnelEvent = {
  event_type: string;
  occurred_at: string;
  payload: Record<string, unknown>;
};

function returnId(event: FunnelEvent) {
  const value = event.payload?.return_id;
  return typeof value === "string" ? value : null;
}

function stateFromEvents(events: FunnelEvent[]) {
  const starts = events.filter((event) => event.event_type === "ace_return_started");
  const completions = events.filter((event) => event.event_type === "ace_return_completed");
  const completedIds = new Set(completions.map(returnId).filter(Boolean));
  const activeStart = starts.find((event) => {
    const id = returnId(event);
    return id && !completedIds.has(id);
  }) ?? null;

  const latencyValues = completions
    .map((event) => Number(event.payload?.latency_seconds))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
  const median = latencyValues.length === 0
    ? null
    : latencyValues.length % 2 === 1
      ? latencyValues[Math.floor(latencyValues.length / 2)]
      : Math.round((latencyValues[latencyValues.length / 2 - 1] + latencyValues[latencyValues.length / 2]) / 2);
  const latestCompletion = completions[0] ?? null;
  const latestLatency = latestCompletion ? Number(latestCompletion.payload?.latency_seconds) : NaN;

  return {
    active: activeStart
      ? { return_id: returnId(activeStart), started_at: activeStart.occurred_at }
      : null,
    metrics: {
      return_count: completions.length,
      last_latency_seconds: Number.isFinite(latestLatency) ? latestLatency : null,
      median_latency_seconds: median,
      last_completed_at: latestCompletion?.occurred_at ?? null,
    },
  };
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: cors });

  const adminKey = getAdminKey();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!adminKey || !supabaseUrl) return Response.json({ ok: false, error: "server_not_configured" }, { status: 503, headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const session = await verifySession(String(body?.session_token ?? ""), adminKey);
    if (!session) return Response.json({ ok: false, error: "invalid_or_expired_session" }, { status: 401, headers: cors });

    const personId = String(session.sub);
    const action = String(body?.action ?? "status");
    if (!["status", "start", "complete"].includes(action)) {
      return Response.json({ ok: false, error: "invalid_action" }, { status: 400, headers: cors });
    }

    const supabase = createClient(supabaseUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const loadEvents = async () => {
      const { data, error } = await supabase
        .from("funnel_events")
        .select("event_type,occurred_at,payload")
        .eq("contact_id", personId)
        .in("event_type", ["ace_return_started", "ace_return_completed"])
        .order("occurred_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as FunnelEvent[];
    };

    let events = await loadEvents();
    let state = stateFromEvents(events);

    if (action === "status") return Response.json({ ok: true, ...state }, { headers: cors });

    if (action === "start") {
      if (state.active) return Response.json({ ok: true, ...state, duplicate: true }, { headers: cors });
      const id = crypto.randomUUID();
      const { error } = await supabase.from("funnel_events").insert({
        contact_id: personId,
        event_type: "ace_return_started",
        channel: "pwa",
        payload: { return_id: id, source: "today_return_path_v1" },
      });
      if (error) throw error;
      events = await loadEvents();
      state = stateFromEvents(events);
      return Response.json({ ok: true, ...state, duplicate: false }, { headers: cors });
    }

    const id = String(body?.return_id ?? "");
    if (!id) return Response.json({ ok: false, error: "return_id_required" }, { status: 400, headers: cors });
    const start = events.find((event) => event.event_type === "ace_return_started" && returnId(event) === id);
    if (!start) return Response.json({ ok: false, error: "return_not_found" }, { status: 404, headers: cors });
    const already = events.find((event) => event.event_type === "ace_return_completed" && returnId(event) === id);
    if (!already) {
      const startedMs = new Date(start.occurred_at).getTime();
      const completedAt = new Date();
      const latencySeconds = Math.max(0, Math.round((completedAt.getTime() - startedMs) / 1000));
      const { error } = await supabase.from("funnel_events").insert({
        contact_id: personId,
        event_type: "ace_return_completed",
        channel: "pwa",
        payload: {
          return_id: id,
          latency_seconds: latencySeconds,
          completion_source: "quest_complete",
          client_completed_at: body?.completed_at ? String(body.completed_at).slice(0, 40) : null,
        },
      });
      if (error) throw error;
    }

    events = await loadEvents();
    state = stateFromEvents(events);
    return Response.json({ ok: true, ...state, duplicate: Boolean(already) }, { headers: cors });
  } catch (error) {
    console.error("ace-return-event error", error);
    return Response.json({ ok: false, error: "return_event_failed" }, { status: 500, headers: cors });
  }
});
