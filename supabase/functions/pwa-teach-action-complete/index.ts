import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function nullable(value: unknown, maxLength: number) {
  const text = clean(value, maxLength);
  return text || null;
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
    const token = clean(body?.session_token, 4096);
    const session = await verifySession(token, adminKey);
    if (!session) {
      return Response.json({ ok: false, error: "invalid_or_expired_session" }, { status: 401, headers: cors });
    }

    const personId = String(session.sub);
    const learningKey = clean(body?.learning_key, 128);
    const learningTitle = clean(body?.learning_title, 240);
    const teachTo = clean(body?.teach_to, 160);
    const teachNote = nullable(body?.teach_note, 2000);
    const actionTaken = clean(body?.action_taken, 2000);
    const reflection = nullable(body?.reflection, 2000);
    const contentId = nullable(body?.content_id, 160);
    const assetId = nullable(body?.asset_id, 160);
    const nodeId = nullable(body?.node_id, 160);
    const flowDay = nullable(body?.flow_day, 32);

    if (!learningKey) {
      return Response.json({ ok: false, error: "learning_key_required" }, { status: 400, headers: cors });
    }
    if (!learningTitle) {
      return Response.json({ ok: false, error: "learning_title_required" }, { status: 400, headers: cors });
    }
    if (!teachTo) {
      return Response.json({ ok: false, error: "teach_to_required" }, { status: 400, headers: cors });
    }
    if (!actionTaken) {
      return Response.json({ ok: false, error: "action_taken_required" }, { status: 400, headers: cors });
    }

    const supabase = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existing, error: existingError } = await supabase
      .from("funnel_events")
      .select("id,occurred_at")
      .eq("contact_id", personId)
      .eq("event_type", "education_completed")
      .contains("payload", { learning_key: learningKey })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      const [{ data: progress }, { data: ledger }] = await Promise.all([
        supabase
          .from("person_progress")
          .select("xp_total,growth_level,growth_rank,streak_current,streak_best,actions_completed,quests_completed,education_completed")
          .eq("contact_id", personId)
          .maybeSingle(),
        supabase
          .from("xp_ledger")
          .select("xp_amount,reason,metadata")
          .eq("funnel_event_id", existing.id)
          .maybeSingle(),
      ]);
      return Response.json({
        ok: true,
        duplicate: true,
        event: "education_completed",
        completion_rule: "teach+action",
        completed_at: existing.occurred_at,
        xp: ledger ?? null,
        progress: progress ?? null,
      }, { headers: cors });
    }

    const now = new Date().toISOString();
    const basePayload = {
      domain: "education",
      learning: {
        domain: "education",
        source: "48h_teach_loop",
        title: learningTitle,
      },
      learning_key: learningKey,
      learning_title: learningTitle,
      content_id: contentId,
      asset_id: assetId,
      node_id: nodeId,
      flow_day: flowDay,
      completion_rule: "teach+action",
    };

    const rows = [
      {
        contact_id: personId,
        event_type: "learning_teach_recorded",
        channel: "pwa",
        occurred_at: now,
        payload: {
          ...basePayload,
          evidence_kind: "teach",
          teach_to: teachTo,
          teach_note: teachNote,
        },
      },
      {
        contact_id: personId,
        event_type: "learning_action_completed",
        channel: "pwa",
        occurred_at: now,
        payload: {
          ...basePayload,
          evidence_kind: "action",
          action_taken: actionTaken,
          reflection,
        },
      },
      {
        contact_id: personId,
        event_type: "education_completed",
        channel: "pwa",
        occurred_at: now,
        payload: {
          ...basePayload,
          evidence: { teach: true, action: true },
          teach_to: teachTo,
          teach_note: teachNote,
          action_taken: actionTaken,
          reflection,
        },
      },
    ];

    const { data: events, error: eventError } = await supabase
      .from("funnel_events")
      .insert(rows)
      .select("id,event_type,occurred_at");
    if (eventError) throw eventError;

    const completedEvent = (events ?? []).find((event: any) => event.event_type === "education_completed");
    if (!completedEvent?.id) throw new Error("education_completion_event_missing");

    const { data: curriculum } = await supabase
      .from("curriculum_states")
      .select("metadata")
      .eq("person_id", personId)
      .maybeSingle();

    if (curriculum) {
      await supabase
        .from("curriculum_states")
        .update({
          learning_loop_position: "teach_action_complete",
          last_evidence_at: now,
          metadata: {
            ...(curriculum.metadata ?? {}),
            last_teach_action: {
              learning_key: learningKey,
              learning_title: learningTitle,
              completed_at: now,
            },
          },
          updated_at: now,
        })
        .eq("person_id", personId);
    }

    const [{ data: progress }, { data: ledger }] = await Promise.all([
      supabase
        .from("person_progress")
        .select("xp_total,growth_level,growth_rank,streak_current,streak_best,actions_completed,quests_completed,education_completed")
        .eq("contact_id", personId)
        .maybeSingle(),
      supabase
        .from("xp_ledger")
        .select("xp_amount,reason,metadata")
        .eq("funnel_event_id", completedEvent.id)
        .maybeSingle(),
    ]);

    return Response.json({
      ok: true,
      duplicate: false,
      event: "education_completed",
      completion_rule: "teach+action",
      completed_at: completedEvent.occurred_at,
      xp: ledger ?? null,
      progress: progress ?? null,
    }, { headers: cors });
  } catch (error) {
    console.error("pwa-teach-action-complete error", error);
    return Response.json({ ok: false, error: "teach_action_completion_failed" }, { status: 500, headers: cors });
  }
});
