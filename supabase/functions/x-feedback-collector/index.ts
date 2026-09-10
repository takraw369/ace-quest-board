import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const X_API = "https://api.x.com";
const WINDOW_TARGET_HOURS: Record<string, number> = { "1h": 1, "24h": 24, "72h": 72, "7d": 168 };
const PREVIOUS_WINDOW: Record<string, string> = { "24h": "1h", "72h": "24h", "7d": "72h" };

type HarnessAccount = { id?: unknown; isActive?: unknown };
type MetricRow = {
  id: string;
  publication_id: string | null;
  source_ref: string | null;
  provider: string;
  provider_publish_id: string;
  published_at: string;
};
type StoredSnapshot = {
  publish_queue_id: string | null;
  captured_at: string;
  impressions: number | null;
  views: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  bookmarks: number | null;
  raw_metrics: Record<string, unknown> | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

function n(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "") {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function elapsedHours(publishedAt: string, now = Date.now()) {
  return Math.max(0, (now - new Date(publishedAt).getTime()) / 3_600_000);
}

function dueWindow(elapsed: number, existing: Set<string>) {
  const windows = [
    { label: "1h", start: 1, end: 6 },
    { label: "24h", start: 24, end: 48 },
    { label: "72h", start: 72, end: 96 },
    { label: "7d", start: 168, end: 192 },
  ];
  return windows.find((w) => elapsed >= w.start && elapsed < w.end && !existing.has(w.label))?.label ?? null;
}

function knownSum(values: Array<number | null>) {
  const known = values.filter((value): value is number => typeof value === "number");
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
}

function engagementTotal(snapshot: Pick<StoredSnapshot, "likes" | "replies" | "reposts" | "bookmarks">) {
  return knownSum([snapshot.likes, snapshot.replies, snapshot.reposts, snapshot.bookmarks]);
}

function delta(current: number | null, previous: number | null) {
  return current == null || previous == null ? null : current - previous;
}

function deriveInsightSummary(windowLabel: string, snapshot: StoredSnapshot, previousLabel: string | null, previous: StoredSnapshot | null) {
  const engagements = engagementTotal(snapshot);
  const rate = snapshot.impressions != null && snapshot.impressions > 0 && engagements != null ? (engagements / snapshot.impressions) * 100 : null;
  const impressionDelta = previous ? delta(snapshot.impressions, previous.impressions) : null;
  const engagementDelta = previous ? delta(engagements, engagementTotal(previous)) : null;

  const parts = [
    `X ${windowLabel} snapshot`,
    `impressions=${snapshot.impressions ?? "UNKNOWN"}`,
    `engagements=${engagements ?? "UNKNOWN"}`,
    `engagement_rate=${rate == null ? "UNKNOWN" : `${rate.toFixed(3)}%`}`,
  ];
  if (previousLabel) {
    parts.push(`vs_${previousLabel}_impressions_delta=${impressionDelta ?? "UNKNOWN"}`);
    parts.push(`vs_${previousLabel}_engagements_delta=${engagementDelta ?? "UNKNOWN"}`);
  }
  return {
    summary: parts.join(" | "),
    impactScore: rate == null ? null : Math.round(rate * 1000) / 1000,
    confidence: snapshot.impressions == null || engagements == null ? 0.9 : 1.0,
  };
}

async function resolveHarnessAccount(base: string, key: string) {
  const configured = (Deno.env.get("X_HARNESS_ACCOUNT_ID") ?? "").trim();
  if (configured) return { ok: true, xAccountId: configured };

  const res = await fetch(`${base}/api/x-accounts`, { headers: { Authorization: `Bearer ${key}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, body, error: "x_harness_account_lookup_failed" };

  const accounts = Array.isArray(body?.data) ? body.data as HarnessAccount[] : [];
  const account = accounts.find((item) => item?.isActive !== false && typeof item?.id === "string")
    ?? accounts.find((item) => typeof item?.id === "string");
  const xAccountId = typeof account?.id === "string" ? account.id : null;
  if (!xAccountId) return { ok: false, status: 404, body: { account_count: accounts.length }, error: "x_harness_account_missing" };
  return { ok: true, xAccountId };
}

async function getHarnessMetrics(postId: string) {
  const base = (Deno.env.get("X_HARNESS_API_URL") ?? "").replace(/\/$/, "");
  const key = Deno.env.get("X_HARNESS_API_KEY") ?? "";
  if (!base || !key) return null;

  const account = await resolveHarnessAccount(base, key);
  if (!account.ok || !account.xAccountId) {
    return { ok: false, adapter: "x_harness", status: account.status ?? 502, body: account.body ?? { error: account.error }, metrics: {} };
  }

  const url = new URL(`${base}/api/posts/history`);
  url.searchParams.set("xAccountId", account.xAccountId);
  url.searchParams.set("limit", "100");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  const body = await res.json().catch(() => ({}));
  const items = Array.isArray(body?.data?.items) ? body.data.items : [];
  const post = items.find((item: any) => String(item?.id ?? "") === postId) ?? null;
  if (!res.ok || !post) {
    return { ok: false, adapter: "x_harness", status: res.ok ? 404 : res.status, body: res.ok ? { error: "post_not_found_in_history", post_id: postId } : body, metrics: {} };
  }
  return { ok: true, adapter: "x_harness", status: res.status, body: { success: true, data: post }, metrics: post?.public_metrics ?? {} };
}

async function getDirectMetrics(postId: string) {
  const token = Deno.env.get("X_USER_ACCESS_TOKEN") ?? "";
  if (!token) return null;
  const url = new URL(`${X_API}/2/tweets/${postId}`);
  url.searchParams.set("tweet.fields", "created_at,public_metrics");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, adapter: "direct_x_api", status: res.status, body, metrics: body?.data?.public_metrics ?? {} };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ error: "supabase_runtime_config_missing" }, 500);
  const db = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  const cronSecret = req.headers.get("x-masa-cron-secret") ?? "";
  const apiKey = req.headers.get("apikey") ?? "";
  const authorization = req.headers.get("authorization") ?? "";
  const serviceAuthorized = apiKey === serviceRole || authorization === `Bearer ${serviceRole}`;
  if (cronSecret) {
    const { data: expectedSecret, error: secretError } = await db.rpc("get_masa_daily_cron_secret");
    if (secretError || !expectedSecret || cronSecret !== expectedSecret) return json({ error: "unauthorized" }, 401);
  } else if (!serviceAuthorized) return json({ error: "unauthorized" }, 401);

  const hasHarness = !!Deno.env.get("X_HARNESS_API_URL") && !!Deno.env.get("X_HARNESS_API_KEY");
  const hasDirect = !!Deno.env.get("X_USER_ACCESS_TOKEN");
  if (!hasHarness && !hasDirect) {
    if (cronSecret) return json({ ok: true, state: "waiting_for_x_credentials" });
    return json({ ok: false, state: "credentials_missing", accepted_secrets: ["X_HARNESS_API_URL + X_HARNESS_API_KEY", "X_USER_ACCESS_TOKEN"] }, 412);
  }

  const body = await req.json().catch(() => ({}));
  const queueId = typeof body?.queue_id === "string" ? body.queue_id : null;
  const requestedWindow = typeof body?.window === "string" ? body.window : null;
  const force = body?.force === true;
  if (requestedWindow && !WINDOW_TARGET_HOURS[requestedWindow] && requestedWindow !== "manual") return json({ error: "invalid_window", accepted: ["1h", "24h", "72h", "7d", "manual"] }, 422);

  let q = db
    .from("publish_queue")
    .select("id,publication_id,source_ref,provider,provider_publish_id,published_at")
    .in("provider", ["x", "twitter"])
    .eq("status", "published")
    .not("provider_publish_id", "is", null)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(100);
  if (queueId) q = q.eq("id", queueId);

  const { data, error } = await q;
  if (error) return json({ error: "queue_read_failed", detail: error.message }, 500);
  const rows = (data ?? []) as MetricRow[];
  if (!rows.length) return json({ ok: true, state: "idle", reason: "no_published_x_rows" });

  const queueIds = rows.map((row) => row.id);
  const { data: existingData, error: existingError } = await db
    .from("content_metric_snapshots")
    .select("publish_queue_id,captured_at,impressions,views,likes,replies,reposts,bookmarks,raw_metrics")
    .in("publish_queue_id", queueIds);
  if (existingError) return json({ error: "snapshot_read_failed", detail: existingError.message }, 500);

  const existingByQueue = new Map<string, Set<string>>();
  const snapshotsByQueue = new Map<string, StoredSnapshot[]>();
  for (const snapshot of (existingData ?? []) as StoredSnapshot[]) {
    const qid = typeof snapshot?.publish_queue_id === "string" ? snapshot.publish_queue_id : null;
    if (!qid) continue;
    if (!snapshotsByQueue.has(qid)) snapshotsByQueue.set(qid, []);
    snapshotsByQueue.get(qid)!.push(snapshot);
    const label = typeof snapshot?.raw_metrics?.window === "string" ? snapshot.raw_metrics.window : null;
    if (!label) continue;
    if (!existingByQueue.has(qid)) existingByQueue.set(qid, new Set());
    existingByQueue.get(qid)!.add(label);
  }

  const collected: any[] = [];
  const insights: any[] = [];
  const skipped: any[] = [];
  const failed: any[] = [];
  const warnings: any[] = [];
  const nowMs = Date.now();

  for (const row of rows) {
    const postId = row.provider_publish_id;
    const elapsed = elapsedHours(row.published_at, nowMs);
    const existing = existingByQueue.get(row.id) ?? new Set<string>();

    let windowLabel: string | null = null;
    if (requestedWindow) {
      const target = WINDOW_TARGET_HOURS[requestedWindow] ?? 0;
      if (!force && requestedWindow !== "manual" && elapsed < target) {
        skipped.push({ queue_id: row.id, post_id: postId, reason: "window_not_due", window: requestedWindow, elapsed_hours: elapsed });
        continue;
      }
      if (!force && existing.has(requestedWindow)) {
        skipped.push({ queue_id: row.id, post_id: postId, reason: "window_already_collected", window: requestedWindow });
        continue;
      }
      windowLabel = requestedWindow;
    } else {
      windowLabel = dueWindow(elapsed, existing);
      if (!windowLabel) {
        skipped.push({ queue_id: row.id, post_id: postId, reason: "no_due_window", elapsed_hours: elapsed });
        continue;
      }
    }

    let result = await getHarnessMetrics(postId);
    if (result && !result.ok && hasDirect) result = await getDirectMetrics(postId);
    if (!result) result = await getDirectMetrics(postId);
    if (!result || !result.ok) {
      failed.push({ queue_id: row.id, post_id: postId, window: windowLabel, adapter: result?.adapter ?? null, status: result?.status ?? null, reason: result?.body?.error ?? "metrics_fetch_failed" });
      continue;
    }

    const m = result.metrics ?? {};
    const snapshot = {
      publish_queue_id: row.id,
      source_ref: row.source_ref,
      provider: "x",
      provider_post_id: postId,
      captured_at: new Date(nowMs).toISOString(),
      impressions: n(m.impression_count ?? m.impressions),
      views: n(m.view_count ?? m.views),
      likes: n(m.like_count ?? m.likes),
      replies: n(m.reply_count ?? m.replies),
      comments: n(m.comment_count ?? m.comments),
      reposts: n(m.retweet_count ?? m.repost_count ?? m.reposts),
      shares: n(m.share_count ?? m.shares),
      bookmarks: n(m.bookmark_count ?? m.bookmarks),
      saves: n(m.save_count ?? m.saves),
      clicks: n(m.url_link_clicks ?? m.clicks),
      raw_metrics: {
        adapter: result.adapter,
        window: windowLabel,
        target_hours: WINDOW_TARGET_HOURS[windowLabel] ?? null,
        elapsed_hours: Math.round(elapsed * 1000) / 1000,
        response: result.body,
      },
    };

    const { error: insertError } = await db.from("content_metric_snapshots").insert(snapshot);
    if (insertError) {
      failed.push({ queue_id: row.id, post_id: postId, window: windowLabel, reason: "snapshot_insert_failed", detail: insertError.message });
      continue;
    }

    if (row.publication_id) {
      const publicationPatch: Record<string, unknown> = { status: "measured", observed_at: snapshot.captured_at, updated_at: snapshot.captured_at };
      if (snapshot.impressions !== null) publicationPatch.impressions = snapshot.impressions;
      const allEngagements = knownSum([snapshot.likes, snapshot.replies, snapshot.comments, snapshot.reposts, snapshot.shares, snapshot.bookmarks, snapshot.saves]);
      if (allEngagements !== null) publicationPatch.engagements = allEngagements;
      if (snapshot.clicks !== null) publicationPatch.clicks = snapshot.clicks;
      const { error: publicationError } = await db.from("content_publications").update(publicationPatch).eq("id", row.publication_id).in("status", ["published", "measured"]);
      if (publicationError) warnings.push({ queue_id: row.id, publication_id: row.publication_id, reason: "publication_metric_sync_failed", detail: publicationError.message });
    }

    existing.add(windowLabel);
    existingByQueue.set(row.id, existing);

    const storedSnapshot: StoredSnapshot = {
      publish_queue_id: row.id,
      captured_at: snapshot.captured_at,
      impressions: snapshot.impressions,
      views: snapshot.views,
      likes: snapshot.likes,
      replies: snapshot.replies,
      reposts: snapshot.reposts,
      bookmarks: snapshot.bookmarks,
      raw_metrics: snapshot.raw_metrics,
    };
    const previousLabel = PREVIOUS_WINDOW[windowLabel] ?? null;
    const previous = previousLabel ? (snapshotsByQueue.get(row.id) ?? []).find((item) => item?.raw_metrics?.window === previousLabel) ?? null : null;
    const derived = deriveInsightSummary(windowLabel, storedSnapshot, previousLabel, previous);
    const topic = `x_${windowLabel}`;
    const { data: priorInsight } = await db.from("feedback_insights").select("id").eq("publish_queue_id", row.id).eq("signal_type", "metric_window").eq("topic", topic).limit(1).maybeSingle();

    if (!priorInsight?.id) {
      const { error: insightError } = await db.from("feedback_insights").insert({
        publish_queue_id: row.id,
        source_ref: row.source_ref,
        provider: "x",
        signal_type: "metric_window",
        topic,
        summary: derived.summary,
        confidence: derived.confidence,
        impact_score: derived.impactScore,
        recommended_route: row.source_ref ? `CONTENT_OS:${row.source_ref}` : "CONTENT_OS_REVIEW",
        analysis_model: "deterministic:x-feedback-collector-v4",
      });
      if (insightError) failed.push({ queue_id: row.id, post_id: postId, window: windowLabel, reason: "insight_insert_failed", detail: insightError.message });
      else insights.push({ queue_id: row.id, source_ref: row.source_ref, window: windowLabel, route: row.source_ref ? `CONTENT_OS:${row.source_ref}` : "CONTENT_OS_REVIEW", summary: derived.summary });
    }

    if (!snapshotsByQueue.has(row.id)) snapshotsByQueue.set(row.id, []);
    snapshotsByQueue.get(row.id)!.push(storedSnapshot);
    collected.push({
      queue_id: row.id,
      publication_id: row.publication_id,
      source_ref: row.source_ref,
      post_id: postId,
      window: windowLabel,
      adapter: result.adapter,
      elapsed_hours: Math.round(elapsed * 1000) / 1000,
      metrics: {
        impressions: snapshot.impressions,
        views: snapshot.views,
        likes: snapshot.likes,
        replies: snapshot.replies,
        comments: snapshot.comments,
        reposts: snapshot.reposts,
        shares: snapshot.shares,
        bookmarks: snapshot.bookmarks,
        saves: snapshot.saves,
        clicks: snapshot.clicks,
      },
    });
  }

  return json({
    ok: failed.length === 0,
    state: "collected",
    collected_count: collected.length,
    insight_count: insights.length,
    skipped_count: skipped.length,
    warning_count: warnings.length,
    failed_count: failed.length,
    collected,
    insights,
    skipped,
    warnings,
    failed,
  }, failed.length ? 207 : 200);
});