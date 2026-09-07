import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const X_API = "https://api.x.com";

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
  const accessToken = Deno.env.get("X_USER_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceRole) return json({ error: "supabase_runtime_config_missing" }, 500);

  const db = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await req.json().catch(() => ({}));
  const queueId = typeof body?.queue_id === "string" ? body.queue_id : null;

  let query = db
    .from("publish_queue")
    .select("id,idempotency_key,provider,status,payload,provider_publish_id,attempt_count")
    .in("provider", ["x", "twitter"]);

  if (queueId) query = query.eq("id", queueId);
  else query = query.eq("status", "queued").order("created_at", { ascending: true }).limit(1);

  const { data, error: readError } = await query.maybeSingle();
  if (readError) return json({ error: "queue_read_failed", detail: readError.message }, 500);
  if (!data) return json({ ok: true, state: "idle" });

  const row = data as QueueRow;
  if (!accessToken) {
    return json({ ok: false, state: "credentials_missing", queue_id: row.id, required_secret: "X_USER_ACCESS_TOKEN" }, 412);
  }
  if (row.provider_publish_id) {
    return json({ ok: true, state: "already_published", queue_id: row.id, post_id: row.provider_publish_id });
  }
  if (row.status !== "queued") return json({ error: "invalid_queue_state", status: row.status }, 409);

  const payload = row.payload ?? {};
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const humanApproved = payload.human_approved === true;
  if (!humanApproved) return json({ error: "human_approval_required" }, 422);
  if (!text) return json({ error: "payload.text_required" }, 422);

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

  const createPayload: Record<string, unknown> = { text };
  if (typeof payload.reply_to_post_id === "string" && payload.reply_to_post_id) {
    createPayload.reply = { in_reply_to_tweet_id: payload.reply_to_post_id };
  }
  if (typeof payload.reply_settings === "string" && payload.reply_settings) {
    createPayload.reply_settings = payload.reply_settings;
  }
  if (payload.made_with_ai === true) createPayload.made_with_ai = true;

  const postRes = await fetch(`${X_API}/2/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createPayload),
  });
  const postBody = await postRes.json().catch(() => ({}));
  const postId = postBody?.data?.id ?? null;

  if (!postRes.ok || !postId) {
    await db.from("publish_queue").update({
      status: "failed",
      failed_at: new Date().toISOString(),
      provider_status: `HTTP_${postRes.status}`,
      provider_result: postBody,
      error_code: postBody?.errors?.[0]?.type ?? postBody?.title ?? `http_${postRes.status}`,
      error_message: postBody?.errors?.[0]?.detail ?? postBody?.detail ?? "X create post failed",
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    return json({ ok: false, state: "publish_failed", queue_id: row.id, provider: postBody }, 502);
  }

  const publishedAt = new Date().toISOString();
  const { error: updateError } = await db.from("publish_queue").update({
    status: "published",
    provider_publish_id: postId,
    provider_status: "PUBLISHED",
    provider_result: postBody,
    published_at: publishedAt,
    next_poll_at: null,
    error_code: null,
    error_message: null,
    updated_at: publishedAt,
  }).eq("id", row.id);
  if (updateError) return json({ error: "queue_update_failed", detail: updateError.message, post_id: postId }, 500);

  return json({ ok: true, state: "published", queue_id: row.id, post_id: postId, source_ref: payload.source_ref ?? null });
});
