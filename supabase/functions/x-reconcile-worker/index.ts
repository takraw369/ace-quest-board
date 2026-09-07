import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const X_API = "https://api.x.com";

type QueueRow = {
  id: string;
  source_ref: string | null;
  status: string;
  provider: string;
  payload: Record<string, unknown>;
  provider_publish_id: string | null;
  created_at: string;
};

type XPost = {
  id: string;
  text: string;
  created_at?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function normalizeText(input: string) {
  return input
    .normalize("NFKC")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function bigrams(input: string) {
  const s = normalizeText(input);
  if (s.length < 2) return s ? [s] : [];
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

function diceSimilarity(a: string, b: string) {
  const aa = bigrams(a);
  const bb = bigrams(b);
  if (!aa.length && !bb.length) return 1;
  if (!aa.length || !bb.length) return 0;
  const counts = new Map<string, number>();
  for (const x of aa) counts.set(x, (counts.get(x) ?? 0) + 1);
  let matches = 0;
  for (const x of bb) {
    const n = counts.get(x) ?? 0;
    if (n > 0) {
      matches += 1;
      counts.set(x, n - 1);
    }
  }
  return (2 * matches) / (aa.length + bb.length);
}

function ageHours(olderIso: string, newerIso?: string) {
  if (!newerIso) return Number.POSITIVE_INFINITY;
  return Math.abs(new Date(newerIso).getTime() - new Date(olderIso).getTime()) / 3_600_000;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = Deno.env.get("X_USER_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceRole) return json({ error: "supabase_runtime_config_missing" }, 500);
  if (!accessToken) return json({ ok: false, state: "credentials_missing", required_secret: "X_USER_ACCESS_TOKEN" }, 412);

  const db = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await req.json().catch(() => ({}));
  const queueId = typeof body?.queue_id === "string" ? body.queue_id : null;
  const threshold = typeof body?.threshold === "number" ? Math.max(0.85, Math.min(body.threshold, 1)) : 0.92;
  const maxHours = typeof body?.max_hours === "number" ? Math.max(1, Math.min(body.max_hours, 168)) : 48;

  let query = db
    .from("publish_queue")
    .select("id,source_ref,status,provider,payload,provider_publish_id,created_at")
    .in("provider", ["x", "twitter"])
    .is("provider_publish_id", null)
    .in("status", ["draft", "approved"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (queueId) query = query.eq("id", queueId);

  const { data, error: queueError } = await query;
  if (queueError) return json({ error: "queue_read_failed", detail: queueError.message }, 500);

  const intents = ((data ?? []) as QueueRow[]).filter((row) => {
    const mode = row.payload?.delivery_mode;
    return mode === "manual" || row.payload?.manual_post === true;
  });
  if (!intents.length) return json({ ok: true, state: "idle", reason: "no_manual_x_intents" });

  let userId = typeof body?.user_id === "string" ? body.user_id : Deno.env.get("X_USER_ID") ?? null;
  if (!userId) {
    const meRes = await fetch(`${X_API}/2/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meBody = await meRes.json().catch(() => ({}));
    userId = meBody?.data?.id ?? null;
    if (!meRes.ok || !userId) {
      return json({ ok: false, state: "user_lookup_failed", provider: meBody }, 502);
    }
  }

  const timelineUrl = new URL(`${X_API}/2/users/${userId}/tweets`);
  timelineUrl.searchParams.set("max_results", "25");
  timelineUrl.searchParams.set("tweet.fields", "created_at");
  timelineUrl.searchParams.set("exclude", "retweets,replies");

  const postsRes = await fetch(timelineUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const postsBody = await postsRes.json().catch(() => ({}));
  const posts = (postsBody?.data ?? []) as XPost[];
  if (!postsRes.ok) return json({ ok: false, state: "timeline_fetch_failed", provider: postsBody }, 502);

  const matched: Array<Record<string, unknown>> = [];
  const review: Array<Record<string, unknown>> = [];
  const usedPostIds = new Set<string>();

  for (const intent of intents) {
    const expected = typeof intent.payload?.text === "string" ? intent.payload.text : "";
    if (!expected.trim()) {
      review.push({ queue_id: intent.id, source_ref: intent.source_ref, reason: "payload.text_missing" });
      continue;
    }

    const candidates = posts
      .filter((post) => !usedPostIds.has(post.id) && ageHours(intent.created_at, post.created_at) <= maxHours)
      .map((post) => ({ post, score: diceSimilarity(expected, post.text) }))
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];
    const second = candidates[1];
    if (!best || best.score < threshold || (second && best.score - second.score < 0.03)) {
      review.push({
        queue_id: intent.id,
        source_ref: intent.source_ref,
        reason: !best ? "no_candidate" : best.score < threshold ? "below_threshold" : "ambiguous",
        best_score: best?.score ?? null,
        best_post_id: best?.post.id ?? null,
      });
      continue;
    }

    const now = new Date().toISOString();
    const { error: updateError } = await db.from("publish_queue").update({
      status: "published",
      provider_publish_id: best.post.id,
      provider_status: "RECONCILED_MANUAL",
      provider_result: {
        reconciliation: {
          score: best.score,
          matched_at: now,
          post_created_at: best.post.created_at ?? null,
          mode: "manual_post_auto_match",
        },
      },
      published_at: best.post.created_at ?? now,
      next_poll_at: null,
      updated_at: now,
    }).eq("id", intent.id).is("provider_publish_id", null);

    if (updateError) {
      review.push({ queue_id: intent.id, source_ref: intent.source_ref, reason: "queue_update_failed", detail: updateError.message });
      continue;
    }

    usedPostIds.add(best.post.id);
    matched.push({ queue_id: intent.id, source_ref: intent.source_ref, post_id: best.post.id, score: best.score });
  }

  return json({
    ok: true,
    state: "reconciled",
    matched_count: matched.length,
    review_count: review.length,
    matched,
    human_review: review,
  });
});
