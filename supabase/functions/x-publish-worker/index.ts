import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const X_API = "https://api.x.com";

type QueueRow = {
  id: string;
  idempotency_key: string;
  source_ref: string | null;
  provider: string;
  status: string;
  payload: Record<string, unknown>;
  provider_publish_id: string | null;
  attempt_count: number;
  scheduled_for: string | null;
};

type HarnessAccount = {
  id?: unknown;
  isActive?: unknown;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function resolveHarnessAccount(base: string, key: string) {
  const configured = (Deno.env.get("X_HARNESS_ACCOUNT_ID") ?? "").trim();
  if (configured) {
    return { ok: true, xAccountId: configured, source: "runtime_config" };
  }

  const res = await fetch(`${base}/api/x-accounts`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, body, error: "x_harness_account_lookup_failed" };
  }

  const accounts = Array.isArray(body?.data) ? body.data as HarnessAccount[] : [];
  const account = accounts.find((item) => item?.isActive !== false && typeof item?.id === "string")
    ?? accounts.find((item) => typeof item?.id === "string");
  const xAccountId = typeof account?.id === "string" ? account.id : null;
  if (!xAccountId) {
    return { ok: false, status: 404, body: { account_count: accounts.length }, error: "x_harness_account_missing" };
  }

  return { ok: true, xAccountId, source: "x_harness_accounts" };
}

async function publishViaHarness(text: string, mediaIds: string[] | undefined) {
  const base = (Deno.env.get("X_HARNESS_API_URL") ?? "").replace(/\/$/, "");
  const key = Deno.env.get("X_HARNESS_API_KEY") ?? "";
  if (!base || !key) return null;

  const account = await resolveHarnessAccount(base, key);
  if (!account.ok || !account.xAccountId) {
    return {
      ok: false,
      id: null,
      body: account.body ?? { error: account.error },
      status: account.status ?? 502,
      adapter: "x_harness",
      stage: "account_lookup",
    };
  }

  const createBody: Record<string, unknown> = {
    xAccountId: account.xAccountId,
    text,
  };
  if (mediaIds?.length) createBody.mediaIds = mediaIds;

  const res = await fetch(`${base}/api/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createBody),
  });
  const body = await res.json().catch(() => ({}));
  const id = typeof body?.data?.id === "string" ? body.data.id : null;
  return {
    ok: res.ok && !!id,
    id,
    body,
    status: res.status,
    adapter: "x_harness",
    x_account_id: account.xAccountId,
  };
}

async function publishDirect(text: string, payload: Record<string, unknown>) {
  const token = Deno.env.get("X_USER_ACCESS_TOKEN") ?? "";
  if (!token) return null;
  const createPayload: Record<string, unknown> = { text };
  if (typeof payload.reply_to_post_id === "string" && payload.reply_to_post_id) {
    createPayload.reply = { in_reply_to_tweet_id: payload.reply_to_post_id };
  }
  if (typeof payload.reply_settings === "string" && payload.reply_settings) {
    createPayload.reply_settings = payload.reply_settings;
  }
  if (payload.made_with_ai === true) createPayload.made_with_ai = true;

  const res = await fetch(`${X_API}/2/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createPayload),
  });
  const body = await res.json().catch(() => ({}));
  const id = typeof body?.data?.id === "string" ? body.data.id : null;
  return { ok: res.ok && !!id, id, body, status: res.status, adapter: "direct_x_api" };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ error: "supabase_runtime_config_missing" }, 500);

  const db = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const body = await req.json().catch(() => ({}));
  const queueId = typeof body?.queue_id === "string" ? body.queue_id : null;
  const nowIso = new Date().toISOString();

  let q = db
    .from("publish_queue")
    .select("id,idempotency_key,source_ref,provider,status,payload,provider_publish_id,attempt_count,scheduled_for")
    .in("provider", ["x", "twitter"]);
  if (queueId) q = q.eq("id", queueId);
  else {
    q = q
      .eq("status", "queued")
      .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
      .order("scheduled_for", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(1);
  }

  const { data, error } = await q.maybeSingle();
  if (error) return json({ error: "queue_read_failed", detail: error.message }, 500);
  if (!data) return json({ ok: true, state: "idle" });

  const row = data as QueueRow;
  if (row.provider_publish_id) {
    return json({ ok: true, state: "already_published", queue_id: row.id, post_id: row.provider_publish_id });
  }
  if (row.status !== "queued") return json({ error: "invalid_queue_state", status: row.status }, 409);
  if (row.scheduled_for && new Date(row.scheduled_for).getTime() > Date.now()) {
    return json({ ok: true, state: "scheduled", queue_id: row.id, scheduled_for: row.scheduled_for });
  }

  const payload = row.payload ?? {};
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (payload.human_approved !== true) return json({ error: "human_approval_required" }, 422);
  if (!text) return json({ error: "payload.text_required" }, 422);

  const hasHarness = !!Deno.env.get("X_HARNESS_API_URL") && !!Deno.env.get("X_HARNESS_API_KEY");
  const hasDirect = !!Deno.env.get("X_USER_ACCESS_TOKEN");
  if (!hasHarness && !hasDirect) {
    return json({
      ok: false,
      state: "credentials_missing",
      queue_id: row.id,
      accepted_secrets: ["X_HARNESS_API_URL + X_HARNESS_API_KEY", "X_USER_ACCESS_TOKEN"],
    }, 412);
  }

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

  const mediaIds = Array.isArray(payload.media_ids)
    ? payload.media_ids.filter((x): x is string => typeof x === "string")
    : undefined;

  let result = await publishViaHarness(text, mediaIds);
  if (result && !result.ok && hasDirect) result = await publishDirect(text, payload);
  if (!result) result = await publishDirect(text, payload);

  if (!result || !result.ok || !result.id) {
    const now = new Date().toISOString();
    await db.from("publish_queue").update({
      status: "failed",
      failed_at: now,
      provider_status: `HTTP_${result?.status ?? 0}`,
      provider_result: {
        adapter: result?.adapter ?? "none",
        response: result?.body ?? null,
      },
      error_code: result?.body?.title ?? result?.body?.errors?.[0]?.type ?? result?.body?.error ?? "x_publish_failed",
      error_message: result?.body?.detail ?? result?.body?.error ?? "X publish failed",
      updated_at: now,
    }).eq("id", row.id);
    return json({
      ok: false,
      state: "publish_failed",
      queue_id: row.id,
      adapter: result?.adapter ?? null,
      provider: result?.body ?? null,
    }, 502);
  }

  const now = new Date().toISOString();
  const { error: updateError } = await db.from("publish_queue").update({
    status: "published",
    provider_publish_id: result.id,
    provider_status: "PUBLISHED",
    provider_result: { adapter: result.adapter, response: result.body },
    published_at: now,
    next_poll_at: null,
    error_code: null,
    error_message: null,
    updated_at: now,
  }).eq("id", row.id);
  if (updateError) return json({ error: "queue_update_failed", detail: updateError.message, post_id: result.id }, 500);

  return json({
    ok: true,
    state: "published",
    queue_id: row.id,
    post_id: result.id,
    adapter: result.adapter,
    source_ref: row.source_ref,
  });
});