import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TIKTOK_API = "https://open.tiktokapis.com";

type QueueRow = {
  id: string;
  idempotency_key: string;
  provider: string;
  status: string;
  payload: Record<string, unknown>;
  provider_publish_id: string | null;
  attempt_count: number;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = Deno.env.get("TIKTOK_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceRole) return json({ error: "supabase_runtime_config_missing" }, 500);

  const db = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await req.json().catch(() => ({}));
  const queueId = typeof body?.queue_id === "string" ? body.queue_id : null;

  let query = db
    .from("publish_queue")
    .select("id,idempotency_key,provider,status,payload,provider_publish_id,attempt_count")
    .eq("provider", "tiktok");

  if (queueId) query = query.eq("id", queueId);
  else query = query.in("status", ["queued", "publishing"]).order("created_at", { ascending: true }).limit(1);

  const { data, error: readError } = await query.maybeSingle();
  if (readError) return json({ error: "queue_read_failed", detail: readError.message }, 500);
  if (!data) return json({ ok: true, state: "idle" });

  const row = data as QueueRow;
  if (!accessToken) {
    return json({ ok: false, state: "credentials_missing", queue_id: row.id, required_secret: "TIKTOK_ACCESS_TOKEN" }, 412);
  }

  if (row.provider_publish_id) {
    const statusRes = await fetch(`${TIKTOK_API}/v2/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: row.provider_publish_id }),
    });
    const statusBody = await statusRes.json().catch(() => ({}));
    const providerStatus = statusBody?.data?.status ?? null;
    const terminalSuccess = providerStatus === "PUBLISH_COMPLETE";
    const terminalFailure = providerStatus === "FAILED";

    const patch: Record<string, unknown> = {
      provider_status: providerStatus,
      provider_result: statusBody,
      updated_at: new Date().toISOString(),
      next_poll_at: terminalSuccess || terminalFailure ? null : new Date(Date.now() + 60_000).toISOString(),
    };
    if (terminalSuccess) {
      patch.status = "published";
      patch.published_at = new Date().toISOString();
    } else if (terminalFailure) {
      patch.status = "failed";
      patch.failed_at = new Date().toISOString();
      patch.error_code = statusBody?.data?.fail_reason ?? statusBody?.error?.code ?? "tiktok_publish_failed";
      patch.error_message = statusBody?.error?.message ?? statusBody?.data?.fail_reason ?? "TikTok publish failed";
    }

    const { error: updateError } = await db.from("publish_queue").update(patch).eq("id", row.id);
    if (updateError) return json({ error: "queue_update_failed", detail: updateError.message }, 500);
    return json({ ok: statusRes.ok, state: "polled", queue_id: row.id, provider_status: providerStatus });
  }

  if (row.status !== "queued") return json({ error: "invalid_queue_state", status: row.status }, 409);

  const payload = row.payload ?? {};
  const videoUrl = typeof payload.video_url === "string" ? payload.video_url : null;
  const title = typeof payload.title === "string" ? payload.title : "";
  const privacyLevel = typeof payload.privacy_level === "string" ? payload.privacy_level : null;
  const creatorConfirmed = payload.creator_confirmed === true;

  if (!creatorConfirmed) return json({ error: "creator_consent_required" }, 422);
  if (!videoUrl) return json({ error: "payload.video_url_required" }, 422);
  if (!privacyLevel) return json({ error: "payload.privacy_level_required" }, 422);

  const claimedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await db
    .from("publish_queue")
    .update({
      status: "publishing",
      publishing_at: claimedAt,
      attempt_count: row.attempt_count + 1,
      updated_at: claimedAt,
    })
    .eq("id", row.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();
  if (claimError) return json({ error: "queue_claim_failed", detail: claimError.message }, 500);
  if (!claimed) return json({ error: "queue_already_claimed" }, 409);

  const initPayload = {
    post_info: {
      title,
      privacy_level: privacyLevel,
      disable_duet: payload.disable_duet === true,
      disable_comment: payload.disable_comment === true,
      disable_stitch: payload.disable_stitch === true,
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: videoUrl,
    },
  };

  const initRes = await fetch(`${TIKTOK_API}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(initPayload),
  });
  const initBody = await initRes.json().catch(() => ({}));
  const publishId = initBody?.data?.publish_id ?? null;
  const apiOk = initRes.ok && initBody?.error?.code === "ok" && publishId;

  if (!apiOk) {
    await db.from("publish_queue").update({
      status: "failed",
      failed_at: new Date().toISOString(),
      provider_status: "INIT_FAILED",
      provider_result: initBody,
      error_code: initBody?.error?.code ?? `http_${initRes.status}`,
      error_message: initBody?.error?.message ?? "TikTok init request failed",
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    return json({ ok: false, state: "init_failed", queue_id: row.id, provider: initBody }, 502);
  }

  await db.from("publish_queue").update({
    provider_publish_id: publishId,
    provider_status: "PROCESSING",
    provider_result: initBody,
    next_poll_at: new Date(Date.now() + 60_000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", row.id);

  return json({ ok: true, state: "submitted", queue_id: row.id, publish_id: publishId });
});
