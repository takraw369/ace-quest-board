import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const SIGNAL_TYPES = new Set([
  "comment",
  "reply",
  "mention",
  "dm",
  "quote",
  "share",
  "click",
  "lead",
  "question",
  "objection",
  "praise",
  "confusion",
  "manual_signal",
  "competitor_observation",
  "conversion_signal",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function finiteOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function engagementTotal(row: Record<string, unknown>) {
  const fields = ["likes", "replies", "comments", "reposts", "shares", "bookmarks", "saves"];
  const values = fields.map((field) => finiteOrNull(row[field]));
  const known = values.filter((value): value is number => value !== null);
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
}

function safeText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>).text;
  return typeof value === "string" ? value : null;
}

async function hashString(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ error: "supabase_runtime_config_missing" }, 500);

  const authorization = req.headers.get("authorization") ?? "";
  const apiKey = req.headers.get("apikey") ?? "";
  const serviceAuthorized = authorization === `Bearer ${serviceRole}` || apiKey === serviceRole;
  if (!serviceAuthorized) return json({ error: "unauthorized" }, 401);

  const db = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "overview";
  const provider = typeof body?.provider === "string" && body.provider.trim() ? body.provider.trim() : null;
  const accountRef = typeof body?.account_ref === "string" && body.account_ref.trim() ? body.account_ref.trim() : null;
  const campaignRef = typeof body?.campaign_ref === "string" && body.campaign_ref.trim() ? body.campaign_ref.trim() : null;
  const limit = clampInt(body?.limit, 50, 1, 200);

  async function planner() {
    let query = db
      .from("publish_queue")
      .select("id,provider,account_ref,content_type,source_ref,campaign_ref,variant_ref,cta_ref,status,scheduled_for,approved_at,queued_at,created_at,payload")
      .in("status", ["draft", "approved", "queued", "publishing"])
      .order("scheduled_for", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(limit);
    if (provider) query = query.eq("provider", provider);
    if (accountRef) query = query.eq("account_ref", accountRef);
    if (campaignRef) query = query.eq("campaign_ref", campaignRef);

    const { data, error } = await query;
    if (error) throw new Error(`planner_read_failed:${error.message}`);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      provider: row.provider,
      account_ref: row.account_ref,
      content_type: row.content_type,
      source_ref: row.source_ref,
      campaign_ref: row.campaign_ref,
      variant_ref: row.variant_ref,
      cta_ref: row.cta_ref,
      status: row.status,
      scheduled_for: row.scheduled_for,
      approved_at: row.approved_at,
      queued_at: row.queued_at,
      created_at: row.created_at,
      text: safeText(row.payload),
      delivery_mode: row?.payload?.delivery_mode ?? null,
      human_approved: row?.payload?.human_approved === true,
    }));
  }

  async function bestTimes() {
    const lookbackDays = clampInt(body?.lookback_days, 90, 7, 366);
    const bestLimit = clampInt(body?.limit, 12, 1, 50);
    const { data, error } = await db.rpc("get_distribution_best_times_v1", {
      p_provider: provider,
      p_account_ref: accountRef,
      p_lookback_days: lookbackDays,
      p_limit: bestLimit,
    });
    if (error) throw new Error(`best_times_failed:${error.message}`);
    return data ?? [];
  }

  async function report() {
    const lookbackDays = clampInt(body?.lookback_days, 90, 1, 366);
    const from = typeof body?.from === "string" ? body.from : new Date(Date.now() - lookbackDays * 86_400_000).toISOString();
    const to = typeof body?.to === "string" ? body.to : new Date().toISOString();

    let queueQuery = db
      .from("publish_queue")
      .select("id,provider,account_ref,source_ref,campaign_ref,variant_ref,cta_ref,published_at,provider_publish_id")
      .eq("status", "published")
      .not("published_at", "is", null)
      .gte("published_at", from)
      .lte("published_at", to)
      .order("published_at", { ascending: false })
      .limit(200);
    if (provider) queueQuery = queueQuery.eq("provider", provider);
    if (accountRef) queueQuery = queueQuery.eq("account_ref", accountRef);
    if (campaignRef) queueQuery = queueQuery.eq("campaign_ref", campaignRef);

    const { data: queueRows, error: queueError } = await queueQuery;
    if (queueError) throw new Error(`report_queue_failed:${queueError.message}`);
    const rows = queueRows ?? [];
    if (!rows.length) return { from, to, published_count: 0, by_provider: [], by_campaign: [], top_content: [] };

    const queueIds = rows.map((row: any) => row.id);
    const { data: snapshots, error: snapshotError } = await db
      .from("content_metric_snapshots")
      .select("publish_queue_id,captured_at,impressions,views,likes,replies,comments,reposts,shares,bookmarks,saves,clicks")
      .in("publish_queue_id", queueIds)
      .order("captured_at", { ascending: false });
    if (snapshotError) throw new Error(`report_snapshot_failed:${snapshotError.message}`);

    const latest = new Map<string, Record<string, unknown>>();
    for (const snapshot of snapshots ?? []) {
      const qid = typeof snapshot.publish_queue_id === "string" ? snapshot.publish_queue_id : null;
      if (qid && !latest.has(qid)) latest.set(qid, snapshot as Record<string, unknown>);
    }

    const enriched = rows.map((row: any) => {
      const metrics = latest.get(row.id) ?? {};
      const engagements = engagementTotal(metrics);
      const impressions = finiteOrNull(metrics.impressions);
      const engagementRate = impressions && impressions > 0 && engagements !== null ? engagements / impressions : null;
      return {
        ...row,
        metrics: {
          impressions,
          views: finiteOrNull(metrics.views),
          engagements,
          clicks: finiteOrNull(metrics.clicks),
          engagement_rate: engagementRate,
        },
      };
    });

    function aggregate(key: "provider" | "campaign_ref") {
      const groups = new Map<string, { key: string; posts: number; impressions: number; impressionSamples: number; engagements: number; engagementSamples: number; clicks: number; clickSamples: number }>();
      for (const row of enriched) {
        const rawKey = row[key];
        const groupKey = typeof rawKey === "string" && rawKey ? rawKey : "(none)";
        if (!groups.has(groupKey)) groups.set(groupKey, { key: groupKey, posts: 0, impressions: 0, impressionSamples: 0, engagements: 0, engagementSamples: 0, clicks: 0, clickSamples: 0 });
        const g = groups.get(groupKey)!;
        g.posts += 1;
        if (row.metrics.impressions !== null) { g.impressions += row.metrics.impressions; g.impressionSamples += 1; }
        if (row.metrics.engagements !== null) { g.engagements += row.metrics.engagements; g.engagementSamples += 1; }
        if (row.metrics.clicks !== null) { g.clicks += row.metrics.clicks; g.clickSamples += 1; }
      }
      return Array.from(groups.values()).map((g) => ({
        key: g.key,
        posts: g.posts,
        impressions: g.impressionSamples ? g.impressions : null,
        engagements: g.engagementSamples ? g.engagements : null,
        clicks: g.clickSamples ? g.clicks : null,
        engagement_rate: g.impressionSamples && g.engagementSamples && g.impressions > 0 ? g.engagements / g.impressions : null,
      })).sort((a, b) => (b.impressions ?? -1) - (a.impressions ?? -1));
    }

    const topContent = [...enriched]
      .sort((a, b) => (b.metrics.impressions ?? -1) - (a.metrics.impressions ?? -1))
      .slice(0, 20)
      .map((row) => ({
        queue_id: row.id,
        provider: row.provider,
        source_ref: row.source_ref,
        campaign_ref: row.campaign_ref,
        variant_ref: row.variant_ref,
        cta_ref: row.cta_ref,
        published_at: row.published_at,
        provider_publish_id: row.provider_publish_id,
        ...row.metrics,
      }));

    return {
      from,
      to,
      published_count: rows.length,
      by_provider: aggregate("provider"),
      by_campaign: aggregate("campaign_ref"),
      top_content: topContent,
    };
  }

  async function inbox() {
    let query = db
      .from("feedback_events")
      .select("id,publish_queue_id,source_ref,provider,provider_post_id,event_type,text,actor_ref,occurred_at,ingested_at,status")
      .order("ingested_at", { ascending: false })
      .limit(limit);
    if (provider) query = query.eq("provider", provider);
    if (typeof body?.status === "string" && body.status) query = query.eq("status", body.status);
    const { data, error } = await query;
    if (error) throw new Error(`inbox_failed:${error.message}`);
    return (data ?? []).map((row: any) => ({ ...row, text: typeof row.text === "string" ? row.text.slice(0, 1000) : null }));
  }

  async function ingestSignal() {
    const event = body?.event;
    if (!event || typeof event !== "object") throw new Error("event_required");
    const providerValue = typeof event.provider === "string" ? event.provider.trim() : "";
    const eventType = typeof event.event_type === "string" ? event.event_type.trim() : "";
    if (!providerValue) throw new Error("event.provider_required");
    if (!SIGNAL_TYPES.has(eventType)) throw new Error("unsupported_event_type");

    let queueId = typeof event.publish_queue_id === "string" ? event.publish_queue_id : null;
    let sourceRef = typeof event.source_ref === "string" ? event.source_ref : null;
    const providerPostId = typeof event.provider_post_id === "string" ? event.provider_post_id : null;

    if (!queueId && providerPostId) {
      const { data: queueMatch } = await db
        .from("publish_queue")
        .select("id,source_ref")
        .eq("provider", providerValue)
        .eq("provider_publish_id", providerPostId)
        .limit(1)
        .maybeSingle();
      if (queueMatch?.id) {
        queueId = queueMatch.id;
        sourceRef = sourceRef ?? queueMatch.source_ref ?? null;
      }
    }

    const occurredAt = typeof event.occurred_at === "string" ? event.occurred_at : new Date().toISOString();
    const providerEventId = typeof event.provider_event_id === "string" ? event.provider_event_id : null;
    const text = typeof event.text === "string" ? event.text : null;
    const actorRef = typeof event.actor_ref === "string" ? event.actor_ref : null;
    const suppliedDedupe = typeof event.dedupe_key === "string" && event.dedupe_key.trim() ? event.dedupe_key.trim() : null;
    const dedupeKey = suppliedDedupe ?? `distribution:${await hashString([providerValue, eventType, providerEventId ?? "", providerPostId ?? "", actorRef ?? "", occurredAt, text ?? ""].join("|"))}`;

    const rawPayload = event.raw_payload && typeof event.raw_payload === "object" ? event.raw_payload : {};
    const attribution = {
      campaign_ref: typeof event.campaign_ref === "string" ? event.campaign_ref : null,
      variant_ref: typeof event.variant_ref === "string" ? event.variant_ref : null,
      cta_ref: typeof event.cta_ref === "string" ? event.cta_ref : null,
    };

    const { error: insertError } = await db.from("feedback_events").upsert({
      publish_queue_id: queueId,
      source_ref: sourceRef,
      provider: providerValue,
      provider_post_id: providerPostId,
      provider_event_id: providerEventId,
      event_type: eventType,
      text,
      actor_ref: actorRef,
      occurred_at: occurredAt,
      raw_payload: { ...rawPayload, attribution },
      dedupe_key: dedupeKey,
      status: "new",
    }, { onConflict: "dedupe_key", ignoreDuplicates: true });
    if (insertError) throw new Error(`signal_insert_failed:${insertError.message}`);

    const { data: stored, error: storedError } = await db
      .from("feedback_events")
      .select("id,publish_queue_id,source_ref,provider,event_type,dedupe_key")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    if (storedError || !stored) throw new Error(`signal_readback_failed:${storedError?.message ?? "missing"}`);

    const summary = typeof event.summary === "string" && event.summary.trim() ? event.summary.trim() : null;
    const signalType = typeof event.signal_type === "string" && event.signal_type.trim() ? event.signal_type.trim() : null;
    if (summary && signalType) {
      const topic = typeof event.topic === "string" ? event.topic : null;
      const { data: existingInsight } = await db
        .from("feedback_insights")
        .select("id")
        .eq("feedback_event_id", stored.id)
        .eq("signal_type", signalType)
        .limit(1)
        .maybeSingle();
      if (!existingInsight?.id) {
        const { error: insightError } = await db.from("feedback_insights").insert({
          feedback_event_id: stored.id,
          publish_queue_id: stored.publish_queue_id,
          source_ref: stored.source_ref,
          provider: stored.provider,
          signal_type: signalType,
          topic,
          summary,
          confidence: finiteOrNull(event.confidence),
          impact_score: finiteOrNull(event.impact_score),
          recommended_route: stored.source_ref ? `CONTENT_OS:${stored.source_ref}` : "CONTENT_OS_REVIEW",
          analysis_model: "adapter_supplied:distribution-intelligence-v1",
        });
        if (insightError) throw new Error(`insight_insert_failed:${insightError.message}`);
      }
    }

    return { ok: true, state: "ingested", feedback_event_id: stored.id, dedupe_key: dedupeKey, source_ref: stored.source_ref };
  }

  try {
    if (action === "planner") return json({ ok: true, action, items: await planner() });
    if (action === "best_times") return json({ ok: true, action, items: await bestTimes() });
    if (action === "report") return json({ ok: true, action, report: await report() });
    if (action === "inbox") return json({ ok: true, action, items: await inbox() });
    if (action === "ingest_signal") return json(await ingestSignal());
    if (action !== "overview") return json({ error: "unsupported_action", accepted: ["overview", "planner", "best_times", "report", "inbox", "ingest_signal"] }, 422);

    const [plan, times, performance, signals] = await Promise.all([planner(), bestTimes(), report(), inbox()]);
    return json({
      ok: true,
      action: "overview",
      planner: plan,
      best_times: times,
      report: performance,
      inbox: signals,
      principles: {
        content_source_of_truth: "CONTENT_OS",
        queue: "publish_queue",
        feedback: "Reality Loop",
        publish_gate: "human approval remains required",
        best_time_basis: "MASA own observed metrics",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("distribution-intelligence", message);
    const status = message.includes("required") || message.includes("unsupported") ? 422 : 500;
    return json({ ok: false, error: "distribution_intelligence_failed", detail: message }, status);
  }
});
