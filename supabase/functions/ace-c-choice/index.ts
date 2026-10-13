import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const C_KEYS = new Set([
  "curiosity",
  "challenge",
  "creation",
  "connection",
  "contribution",
  "change",
  "care",
  "choice",
  "courage",
  "competition",
  "confidence",
  "community",
  "communication",
  "craft",
  "culture",
]);

const REASON_CLUSTERS = new Set([
  "recover",
  "breakthrough",
  "expand",
  "explore",
  "express",
  "relate",
  "contribute",
  "rechoose",
  "unknown",
]);

const ACTIONS = new Set([
  "get_state",
  "choice_started",
  "choice_completed",
  "first_quest_started",
  "first_quest_completed",
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

function safeText(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readChoice(metadata: Record<string, unknown> | null | undefined) {
  const meta = metadata ?? {};
  const currentC = C_KEYS.has(String(meta.current_c ?? "")) ? String(meta.current_c) : null;
  const candidates = Array.isArray(meta.current_c_candidates)
    ? meta.current_c_candidates.map(String).filter((value) => C_KEYS.has(value)).slice(0, 3)
    : currentC ? [currentC] : [];
  const reasonCluster = REASON_CLUSTERS.has(String(meta.current_c_reason_cluster ?? ""))
    ? String(meta.current_c_reason_cluster)
    : null;
  return {
    candidates,
    current_c: currentC,
    reason_text: safeText(meta.current_c_reason_text),
    reason_cluster: reasonCluster,
    desired_change_text: safeText(meta.current_c_desired_change),
    selected_at: typeof meta.current_c_selected_at === "string" ? meta.current_c_selected_at : null,
    first_quest_started_at: typeof meta.current_c_first_quest_started_at === "string"
      ? meta.current_c_first_quest_started_at
      : null,
    first_quest_completed_at: typeof meta.current_c_first_quest_completed_at === "string"
      ? meta.current_c_first_quest_completed_at
      : null,
    reflection_text: safeText(meta.current_c_first_quest_reflection, 800),
  };
}

async function advanceStage(
  supabaseUrl: string,
  adminKey: string,
  personId: string,
  toStage: string,
  reason: string,
) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/contact-stage-router`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": adminKey,
      },
      body: JSON.stringify({
        contact_id: personId,
        to_stage: toStage,
        reason,
        source: "c_choice",
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.ok !== true) {
      console.error("C-Choice lifecycle routing failed", toStage, response.status, result);
      return null;
    }
    return result;
  } catch (error) {
    console.error("C-Choice lifecycle routing error", toStage, error);
    return null;
  }
}

async function insertEvent(
  supabase: ReturnType<typeof createClient>,
  personId: string,
  eventType: string,
  payload: Record<string, unknown>,
  clientEventId: string | null,
) {
  if (clientEventId) {
    const { data: existing, error: existingError } = await supabase
      .from("funnel_events")
      .select("id")
      .eq("contact_id", personId)
      .eq("event_type", eventType)
      .contains("payload", { client_event_id: clientEventId })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return { duplicate: true };
  }

  const { error } = await supabase.from("funnel_events").insert({
    contact_id: personId,
    event_type: eventType,
    channel: "pwa",
    payload,
  });
  if (error) throw error;
  return { duplicate: false };
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

    const action = String(body?.action ?? "");
    if (!ACTIONS.has(action)) {
      return Response.json({ ok: false, error: "invalid_action" }, { status: 400, headers: cors });
    }

    const personId = String(session.sub);
    const source = safeText(body?.source, 40) || "ace";
    const clientEventId = safeText(body?.client_event_id, 120) || null;
    const data = body?.data ?? {};
    const supabase = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id,metadata,lifecycle_stage")
      .eq("id", personId)
      .single();
    if (contactError || !contact) {
      return Response.json({ ok: false, error: "contact_not_found" }, { status: 404, headers: cors });
    }

    if (action === "get_state") {
      return Response.json({ ok: true, choice: readChoice(contact.metadata ?? {}) }, { headers: cors });
    }

    const now = new Date().toISOString();
    const commonPayload = {
      client_event_id: clientEventId,
      source,
      version: 1,
    };

    if (action === "choice_started") {
      const result = await insertEvent(
        supabase,
        personId,
        "c_choice_started",
        { ...commonPayload },
        clientEventId,
      );
      return Response.json({ ok: true, event: "c_choice_started", ...result }, { headers: cors });
    }

    const rawCandidates = Array.isArray(data?.candidates) ? data.candidates.map(String) : [];
    const candidates = [...new Set(rawCandidates.filter((value) => C_KEYS.has(value)))].slice(0, 3);
    const currentC = String(data?.current_c ?? "");
    if (!C_KEYS.has(currentC)) {
      return Response.json({ ok: false, error: "invalid_current_c" }, { status: 400, headers: cors });
    }
    if (!candidates.includes(currentC)) candidates.push(currentC);
    const finalCandidates = candidates.slice(0, 3);
    const reasonText = safeText(data?.reason_text);
    const reasonCluster = REASON_CLUSTERS.has(String(data?.reason_cluster ?? ""))
      ? String(data.reason_cluster)
      : "unknown";
    const desiredChangeText = safeText(data?.desired_change_text);
    const reflectionText = safeText(data?.reflection_text, 800);

    if (action === "choice_completed") {
      if (!reasonText) {
        return Response.json({ ok: false, error: "reason_required" }, { status: 400, headers: cors });
      }

      const metadata = {
        ...(contact.metadata ?? {}),
        current_c: currentC,
        current_c_candidates: finalCandidates,
        current_c_reason_text: reasonText,
        current_c_reason_cluster: reasonCluster,
        current_c_desired_change: desiredChangeText || null,
        current_c_selected_at: now,
        current_c_version: 1,
        current_c_first_quest_started_at: null,
        current_c_first_quest_completed_at: null,
        current_c_first_quest_reflection: null,
      };

      const { error: updateError } = await supabase
        .from("contacts")
        .update({ metadata, updated_at: now })
        .eq("id", personId);
      if (updateError) throw updateError;

      const eventPayload = {
        ...commonPayload,
        candidates: finalCandidates,
        current_c: currentC,
        reason_text: reasonText,
        reason_cluster: reasonCluster,
        desired_change_text: desiredChangeText || null,
        client_selected_at: safeText(data?.selected_at, 40) || null,
      };
      const eventResult = await insertEvent(
        supabase,
        personId,
        "c_choice_completed",
        eventPayload,
        clientEventId,
      );

      if (!eventResult.duplicate) {
        const { error: observationError } = await supabase.from("growth_observations").insert({
          person_id: personId,
          domain: "ace",
          signal: "ace_c_choice",
          value: {
            candidates: finalCandidates,
            current_c: currentC,
            reason_text: reasonText,
            reason_cluster: reasonCluster,
            desired_change_text: desiredChangeText || null,
          },
          observation_kind: "self_report",
          confidence: 1,
          occurred_at: now,
          metadata: { source, version: 1 },
        });
        if (observationError) throw observationError;
      }

      const lifecycle = contact.lifecycle_stage === "registered"
        ? await advanceStage(supabaseUrl, adminKey, personId, "engaged", "c_choice_completed")
        : null;

      return Response.json({
        ok: true,
        event: "c_choice_completed",
        lifecycle,
        duplicate: eventResult.duplicate,
        choice: readChoice(metadata),
      }, { headers: cors });
    }

    if (action === "first_quest_started") {
      const metadata = {
        ...(contact.metadata ?? {}),
        current_c_first_quest_started_at: typeof contact.metadata?.current_c_first_quest_started_at === "string"
          ? contact.metadata.current_c_first_quest_started_at
          : now,
      };
      const { error: updateError } = await supabase
        .from("contacts")
        .update({ metadata, updated_at: now })
        .eq("id", personId);
      if (updateError) throw updateError;

      const eventResult = await insertEvent(
        supabase,
        personId,
        "c_first_quest_started",
        {
          ...commonPayload,
          current_c: currentC,
          prompt_version: 1,
        },
        clientEventId,
      );

      return Response.json({
        ok: true,
        event: "c_first_quest_started",
        duplicate: eventResult.duplicate,
        choice: readChoice(metadata),
      }, { headers: cors });
    }

    if (action === "first_quest_completed") {
      const startedAt = typeof contact.metadata?.current_c_first_quest_started_at === "string"
        ? contact.metadata.current_c_first_quest_started_at
        : now;
      const metadata = {
        ...(contact.metadata ?? {}),
        current_c_first_quest_started_at: startedAt,
        current_c_first_quest_completed_at: now,
        current_c_first_quest_reflection: reflectionText || null,
      };

      const { error: updateError } = await supabase
        .from("contacts")
        .update({ metadata, updated_at: now })
        .eq("id", personId);
      if (updateError) throw updateError;

      const eventPayload = {
        ...commonPayload,
        current_c: currentC,
        reflection_text: reflectionText || null,
        client_started_at: safeText(data?.first_quest_started_at, 40) || null,
        client_completed_at: safeText(data?.first_quest_completed_at, 40) || null,
      };
      const eventResult = await insertEvent(
        supabase,
        personId,
        "c_first_quest_completed",
        eventPayload,
        clientEventId,
      );

      if (!eventResult.duplicate) {
        const { error: observationError } = await supabase.from("growth_observations").insert({
          person_id: personId,
          domain: "ace",
          signal: "ace_c_first_quest_completed",
          value: {
            current_c: currentC,
            reflection_text: reflectionText || null,
          },
          observation_kind: "fact",
          confidence: 1,
          occurred_at: now,
          metadata: { source, version: 1 },
        });
        if (observationError) throw observationError;
      }

      let lifecycle = null;
      if (contact.lifecycle_stage === "registered") {
        await advanceStage(supabaseUrl, adminKey, personId, "engaged", "c_choice_completed_before_first_quest");
        lifecycle = await advanceStage(supabaseUrl, adminKey, personId, "ace_trial", "c_first_quest_completed");
      } else if (contact.lifecycle_stage === "engaged") {
        lifecycle = await advanceStage(supabaseUrl, adminKey, personId, "ace_trial", "c_first_quest_completed");
      }

      return Response.json({
        ok: true,
        event: "c_first_quest_completed",
        lifecycle,
        duplicate: eventResult.duplicate,
        choice: readChoice(metadata),
      }, { headers: cors });
    }

    return Response.json({ ok: false, error: "unsupported_action" }, { status: 400, headers: cors });
  } catch (error) {
    console.error("ace-c-choice error", error);
    return Response.json({ ok: false, error: "c_choice_failed" }, { status: 500, headers: cors });
  }
});
