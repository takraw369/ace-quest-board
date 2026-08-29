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

async function refreshRecommendations(url: string, key: string, personId: string) {
  try {
    await fetch(`${url}/functions/v1/education-recommender`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": key },
      body: JSON.stringify({ contact_id: personId }),
    });
  } catch (_) {}
}

function contentPayload(data: any) {
  return {
    content_id: String(data?.content_id ?? "").trim(),
    asset_id: data?.asset_id ? String(data.asset_id) : null,
    node_id: data?.node_id ? String(data.node_id) : null,
    title: data?.title ? String(data.title).slice(0, 240) : null,
    kind: data?.kind ? String(data.kind) : null,
    position: Number.isFinite(Number(data?.position)) ? Number(data.position) : null,
    surface: data?.surface ? String(data.surface).slice(0, 80) : "learn",
    flow_day: data?.flow_day ? String(data.flow_day) : null,
    completed_quest_id: data?.completed_quest_id ? String(data.completed_quest_id) : null,
    read_depth: Number.isFinite(Number(data?.read_depth)) ? Math.max(0, Math.min(100, Number(data.read_depth))) : null,
    dwell_ms: Number.isFinite(Number(data?.dwell_ms)) ? Math.max(0, Math.round(Number(data.dwell_ms))) : null,
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
    if (!session) return Response.json({ ok: false, error: "invalid_or_expired_session" }, { status: 401, headers: cors });

    const personId = String(session.sub);
    const action = String(body?.action ?? "");
    const recommendationId = body?.recommendation_id ? String(body.recommendation_id) : null;
    const data = body?.data ?? {};
    const supabase = createClient(supabaseUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });

    if (action === "content_impression") {
      const rawItems = Array.isArray(data?.items) ? data.items.slice(0, 6) : [];
      const items = rawItems.map(contentPayload).filter((item: any) => item.content_id);
      if (items.length === 0) return Response.json({ ok: false, error: "content_items_required" }, { status: 400, headers: cors });
      const rows = items.map((payload: any) => ({ contact_id: personId, event_type: "content_impression", channel: "pwa", payload }));
      const { error } = await supabase.from("funnel_events").insert(rows);
      if (error) throw error;
      return Response.json({ ok: true, event: "content_impression", count: rows.length }, { headers: cors });
    }

    const contentActions = new Set([
      "content_opened",
      "content_saved",
      "content_read_25",
      "content_read_50",
      "content_read_90",
      "content_completed",
    ]);
    if (contentActions.has(action)) {
      const payload = contentPayload(data);
      if (!payload.content_id) return Response.json({ ok: false, error: "content_id_required" }, { status: 400, headers: cors });

      const shouldDedupe = action !== "content_opened";
      if (shouldDedupe) {
        let query = supabase
          .from("funnel_events")
          .select("id")
          .eq("contact_id", personId)
          .eq("event_type", action)
          .contains("payload", { content_id: payload.content_id });
        if (action !== "content_saved" && payload.flow_day) {
          query = query.contains("payload", { flow_day: payload.flow_day });
        }
        const { data: existing, error: existingError } = await query.limit(1).maybeSingle();
        if (existingError) throw existingError;
        if (existing) {
          return Response.json({ ok: true, event: action, saved: action === "content_saved", duplicate: true }, { headers: cors });
        }
      }

      const { error } = await supabase.from("funnel_events").insert({ contact_id: personId, event_type: action, channel: "pwa", payload });
      if (error) throw error;
      return Response.json({ ok: true, event: action, saved: action === "content_saved", duplicate: false }, { headers: cors });
    }

    let rec: any = null;
    if (recommendationId) {
      const { data: found, error } = await supabase
        .from("education_recommendations")
        .select("*")
        .eq("id", recommendationId)
        .eq("person_id", personId)
        .maybeSingle();
      if (error) throw error;
      if (!found) return Response.json({ ok: false, error: "recommendation_not_found" }, { status: 404, headers: cors });
      rec = found;
    }

    const now = new Date().toISOString();

    if (action === "education_start") {
      if (!rec || rec.recommendation_type !== "education") return Response.json({ ok: false, error: "education_recommendation_required" }, { status: 400, headers: cors });
      if (rec.status === "completed") return Response.json({ ok: false, error: "already_completed" }, { status: 409, headers: cors });
      if (["proposed", "shown"].includes(rec.status)) await supabase.from("education_recommendations").update({ status: "accepted", acted_at: now }).eq("id", rec.id);
      const payload = { domain: rec.metadata?.domain ?? "general", learning: { domain: rec.metadata?.domain ?? "general" }, recommendation_id: rec.id, node_id: rec.recommendation_ref, node_title: rec.metadata?.node_title ?? rec.recommendation_ref };
      await supabase.from("funnel_events").insert({ contact_id: personId, event_type: "education_experience_started", channel: "pwa", payload });
      return Response.json({ ok: true, event: "education_experience_started" }, { headers: cors });
    }

    if (action === "education_prediction") {
      if (!rec || rec.recommendation_type !== "education") return Response.json({ ok: false, error: "education_recommendation_required" }, { status: 400, headers: cors });
      if (rec.status === "completed") return Response.json({ ok: false, error: "already_completed" }, { status: 409, headers: cors });
      const prediction = String(data?.prediction ?? "").trim();
      if (!prediction) return Response.json({ ok: false, error: "prediction_required" }, { status: 400, headers: cors });
      const payload = { domain: rec.metadata?.domain ?? "general", learning: { domain: rec.metadata?.domain ?? "general" }, recommendation_id: rec.id, node_id: rec.recommendation_ref, node_title: rec.metadata?.node_title ?? rec.recommendation_ref, prediction };
      await supabase.from("funnel_events").insert({ contact_id: personId, event_type: "education_prediction_recorded", channel: "pwa", payload });
      return Response.json({ ok: true, event: "education_prediction_recorded" }, { headers: cors });
    }

    if (action === "education_complete") {
      if (!rec || rec.recommendation_type !== "education") return Response.json({ ok: false, error: "education_recommendation_required" }, { status: 400, headers: cors });
      if (rec.status === "completed") return Response.json({ ok: false, error: "already_completed" }, { status: 409, headers: cors });
      const domain = rec.metadata?.domain ?? "general";
      const base = { domain, learning: { domain }, recommendation_id: rec.id, node_id: rec.recommendation_ref, node_title: rec.metadata?.node_title ?? rec.recommendation_ref };
      const prediction = String(data?.prediction ?? "").trim();
      const actual = String(data?.actual ?? "").trim();
      const reflection = String(data?.reflection ?? "").trim();
      if (prediction) await supabase.from("funnel_events").insert({ contact_id: personId, event_type: "education_prediction_recorded", channel: "pwa", payload: { ...base, prediction } });
      if (actual) await supabase.from("funnel_events").insert({ contact_id: personId, event_type: "education_result_recorded", channel: "pwa", payload: { ...base, actual, prediction } });
      if (reflection) await supabase.from("funnel_events").insert({ contact_id: personId, event_type: "education_reflection_recorded", channel: "pwa", payload: { ...base, reflection, prediction, actual } });
      const { data: ev, error: eventError } = await supabase.from("funnel_events").insert({ contact_id: personId, event_type: "education_completed", channel: "pwa", payload: { ...base, prediction, actual, reflection } }).select("id").single();
      if (eventError) throw eventError;
      await supabase.from("education_recommendations").update({ status: "completed", acted_at: now, outcome: { completed: true, via: "pwa", prediction, actual, reflection } }).eq("id", rec.id);
      const [{ data: progress }, { data: ledger }] = await Promise.all([
        supabase.from("person_progress").select("xp_total,growth_level,growth_rank,streak_current,streak_best,actions_completed,quests_completed,education_completed").eq("contact_id", personId).maybeSingle(),
        supabase.from("xp_ledger").select("xp_amount,reason,metadata").eq("funnel_event_id", ev.id).maybeSingle(),
      ]);
      EdgeRuntime.waitUntil(refreshRecommendations(supabaseUrl, adminKey, personId));
      return Response.json({ ok: true, event: "education_completed", xp: ledger ?? null, progress: progress ?? null }, { headers: cors });
    }

    if (action === "quest_complete") {
      if (!rec || rec.recommendation_type !== "quest") return Response.json({ ok: false, error: "quest_recommendation_required" }, { status: 400, headers: cors });
      if (rec.status === "completed") return Response.json({ ok: false, error: "already_completed" }, { status: 409, headers: cors });
      const domain = rec.metadata?.domain ?? "action";
      const choice = rec.alternative?.duration ?? rec.metadata?.duration ?? "3分Quest";
      const detail = rec.alternative?.action ?? "Questを完了";
      const prediction = String(data?.prediction ?? "").trim();
      const actual = String(data?.actual ?? "").trim();
      const reflection = String(data?.reflection ?? "").trim();
      const payload = { domain, action: { domain, choice, detail, recommendation_id: rec.id }, recommendation_id: rec.id, prediction, actual, reflection, experiment: rec.alternative?.experiment ?? null };
      const { data: ev, error: eventError } = await supabase.from("funnel_events").insert({ contact_id: personId, event_type: "micro_action_completed", channel: "pwa", payload }).select("id").single();
      if (eventError) throw eventError;
      await supabase.from("education_recommendations").update({ status: "completed", acted_at: now, outcome: { completed: true, via: "pwa", prediction, actual, reflection } }).eq("id", rec.id);
      const [{ data: progress }, { data: ledger }] = await Promise.all([
        supabase.from("person_progress").select("xp_total,growth_level,growth_rank,streak_current,streak_best,actions_completed,quests_completed,education_completed").eq("contact_id", personId).maybeSingle(),
        supabase.from("xp_ledger").select("xp_amount,reason,metadata").eq("funnel_event_id", ev.id).maybeSingle(),
      ]);
      EdgeRuntime.waitUntil(refreshRecommendations(supabaseUrl, adminKey, personId));
      return Response.json({ ok: true, event: "quest_completed", xp: ledger ?? null, progress: progress ?? null }, { headers: cors });
    }

    if (action === "connection_interest") {
      const choice = String(data?.type ?? "").trim();
      if (!["人", "場所", "イベント"].includes(choice)) return Response.json({ ok: false, error: "invalid_connection_type" }, { status: 400, headers: cors });
      const { data: contact } = await supabase.from("contacts").select("metadata").eq("id", personId).single();
      await supabase.from("contacts").update({ metadata: { ...(contact?.metadata ?? {}), connection_interest: { type: choice, selected_at: now } }, updated_at: now }).eq("id", personId);
      await supabase.from("funnel_events").insert({ contact_id: personId, event_type: "connection_interest_selected", channel: "pwa", payload: { choice, domain: "connection", recommendation_id: rec?.id ?? null } });
      if (rec?.recommendation_type === "connection") await supabase.from("education_recommendations").update({ status: "accepted", acted_at: now, outcome: { interest_type: choice, via: "pwa" } }).eq("id", rec.id);
      EdgeRuntime.waitUntil(refreshRecommendations(supabaseUrl, adminKey, personId));
      return Response.json({ ok: true, event: "connection_interest_selected" }, { headers: cors });
    }

    return Response.json({ ok: false, error: "unsupported_action" }, { status: 400, headers: cors });
  } catch (error) {
    console.error("pwa-growth-action error", error);
    return Response.json({ ok: false, error: "action_failed" }, { status: 500, headers: cors });
  }
});