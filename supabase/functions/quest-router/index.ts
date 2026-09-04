import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ENGINE = "quest-router-v1";
const DEFAULT_CAPABILITY = "self_regulation";
const ACTIVE_RECOMMENDATION_STATUSES = ["proposed", "shown", "accepted"];

function getAdminKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) { try { return JSON.parse(raw)?.default; } catch (_) {} }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const configured = (Deno.env.get("PWA_ALLOWED_ORIGINS") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
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
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, fromB64url(sigPart), new TextEncoder().encode(payloadPart));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(payloadPart)));
    if (payload?.aud !== "flow-pwa" || !payload?.sub || Number(payload?.exp ?? 0) <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

type RouterAttention = "light" | "focused";
type WantContext = { id?: string | null; title?: string | null; category?: string | null; action?: string | null; source?: string | null };
type CatalogItem = {
  id: string; quest_key: string; capability: string; phase_code: string; phase_order: number; global_order: number;
  age_band: string; title: string; instruction: string; actor_mode: string; estimated_minutes: number; difficulty: number;
  xp_reward: number; observation_axes: string[]; tags: string[]; recommendation_ref: string; experience: Record<string, unknown>; metadata: Record<string, unknown>;
};
type RankedCandidate = { item: CatalogItem; score: number; reasons: string[] };

function currentAxes(meta: Record<string, any>) {
  const axis = String(meta?.current_ace?.result_axis ?? "").toUpperCase();
  const axisMap: Record<string, string[]> = {
    BODY: ["body"], COGNITION: ["attention", "meta"], EMOTION: ["emotion", "impulse", "meta"], ACTION: ["action_planning", "impulse"],
  };
  if (axisMap[axis]) return axisMap[axis];
  const bottleneck = String(meta?.current_flow?.bottleneck ?? "").toLowerCase();
  const flowMap: Record<string, string[]> = {
    body: ["body"], mind: ["attention", "meta", "emotion"], action: ["action_planning", "impulse"], environment: ["attention", "action_planning"],
  };
  return flowMap[bottleneck] ?? [];
}

function wantAxes(want: WantContext | null) {
  if (!want?.title && !want?.category && !want?.action) return [];
  const text = `${want.category ?? ""} ${want.title ?? ""} ${want.action ?? ""}`.toLowerCase();
  const axes = new Set<string>();
  if (/健康|身体|睡眠|食事|運動|回復|呼吸|美容|スポーツ|競技|体力/.test(text)) axes.add("body");
  if (/家族|人間関係|パートナー|安心|信頼|感情|心|関係/.test(text)) { axes.add("emotion"); axes.add("meta"); }
  if (/研究|学習|理解|知識|分析|判断|発信|教育|集中|認知/.test(text)) { axes.add("attention"); axes.add("meta"); }
  if (/仕事|事業|収益|お金|資産|プロジェクト|作る|実行|挑戦|習慣|仕組み|社会|貢献|行動/.test(text)) axes.add("action_planning");
  if (/自由|自己|生き|purpose|人生|選択|方向|want to|統合|identity|役割/.test(text)) { axes.add("meta"); axes.add("action_planning"); }
  if (/誘惑|スマホ|衝動|止め|我慢|切り替/.test(text)) axes.add("impulse");
  return [...axes];
}

function scoreCandidate(item: CatalogItem, params: { timeBudget: number; attention: RouterAttention; current: string[]; want: string[] }) {
  let score = 0;
  const reasons: string[] = [];
  const overBy = item.estimated_minutes - params.timeBudget;
  if (overBy <= 0) { score += 60; reasons.push(`${item.estimated_minutes}分で今日の時間に収まる`); score += Math.max(0, 20 - Math.abs(params.timeBudget - item.estimated_minutes)); }
  else score -= overBy * 8;

  const currentOverlap = item.observation_axes.filter((axis) => params.current.includes(axis));
  if (currentOverlap.length) { score += Math.min(55, currentOverlap.length * 25); reasons.push(`Calibration / FLOWと${currentOverlap.length}軸つながる`); }
  const wantOverlap = item.observation_axes.filter((axis) => params.want.includes(axis));
  if (wantOverlap.length) { score += Math.min(45, wantOverlap.length * 20); reasons.push(`Want toと${wantOverlap.length}軸つながる`); }

  if (params.attention === "light") { if (item.estimated_minutes <= 7) score += 25; if (item.difficulty <= 2) score += 15; }
  else { if (item.estimated_minutes >= 10) score += 20; if (item.difficulty >= 2) score += 10; }
  score += Math.max(0, 12 - item.global_order / 10);
  return { score: Math.round(score * 10) / 10, reasons };
}

function candidatePayload(candidate: RankedCandidate) {
  const item = candidate.item;
  return { id: item.id, quest_key: item.quest_key, recommendation_ref: item.recommendation_ref, capability: item.capability, phase_code: item.phase_code,
    age_band: item.age_band, title: item.title, instruction: item.instruction, actor_mode: item.actor_mode, estimated_minutes: item.estimated_minutes,
    difficulty: item.difficulty, xp_reward: item.xp_reward, observation_axes: item.observation_axes, tags: item.tags, experience: item.experience,
    score: candidate.score, reasons: candidate.reasons };
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: cors });
  const adminKey = getAdminKey(), supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!adminKey || !supabaseUrl) return Response.json({ ok: false, error: "server_not_configured" }, { status: 503, headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const session = await verifySession(String(body?.session_token ?? ""), adminKey);
    if (!session) return Response.json({ ok: false, error: "invalid_or_expired_session" }, { status: 401, headers: cors });
    const action = body?.action === "select" ? "select" : "recommend";
    const personId = String(session.sub), ageBand = String(body?.age_band ?? "").trim();
    const capability = String(body?.capability ?? DEFAULT_CAPABILITY).trim() || DEFAULT_CAPABILITY;
    const timeBudget = Math.min(60, Math.max(1, Number(body?.time_budget_minutes ?? 10)));
    const attention: RouterAttention = body?.attention_level === "focused" ? "focused" : "light";
    const limit = Math.min(3, Math.max(1, Number(body?.limit ?? 3)));
    const want: WantContext | null = body?.want_context && typeof body.want_context === "object" ? body.want_context : null;
    if (!ageBand) return Response.json({ ok: false, error: "age_band_required" }, { status: 400, headers: cors });

    const supabase = createClient(supabaseUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const [{ data: contact, error: contactError }, { data: completed, error: completedError }] = await Promise.all([
      supabase.from("contacts").select("id,metadata").eq("id", personId).maybeSingle(),
      supabase.from("education_recommendations").select("recommendation_ref").eq("person_id", personId).eq("recommendation_type", "quest").eq("status", "completed"),
    ]);
    if (contactError) throw contactError;
    if (completedError) throw completedError;
    if (!contact) return Response.json({ ok: false, error: "contact_not_found" }, { status: 404, headers: cors });

    const completedRefs = new Set((completed ?? []).map((row: any) => String(row.recommendation_ref ?? "")).filter(Boolean));
    const { data: catalog, error: catalogError } = await supabase.from("quest_catalog")
      .select("id,quest_key,capability,phase_code,phase_order,global_order,age_band,title,instruction,actor_mode,estimated_minutes,difficulty,xp_reward,observation_axes,tags,recommendation_ref,experience,metadata")
      .eq("status", "active").eq("capability", capability).eq("age_band", ageBand).order("global_order", { ascending: true });
    if (catalogError) throw catalogError;

    const current = currentAxes(contact.metadata ?? {}), wantSignalAxes = wantAxes(want);
    let ranked = (catalog ?? []).filter((item: CatalogItem) => !completedRefs.has(item.recommendation_ref))
      .map((item: CatalogItem) => ({ item, ...scoreCandidate(item, { timeBudget, attention, current, want: wantSignalAxes }) }))
      .sort((a: RankedCandidate, b: RankedCandidate) => b.score - a.score || a.item.global_order - b.item.global_order);
    const withinBudget = ranked.filter((candidate) => candidate.item.estimated_minutes <= timeBudget);
    if (withinBudget.length) ranked = withinBudget;
    ranked = ranked.slice(0, limit);

    const context = { age_band: ageBand, capability, time_budget_minutes: timeBudget, attention_level: attention, focus_axes: current, want_axes: wantSignalAxes, want_context: want };
    if (!ranked.length) return Response.json({ ok: true, engine: ENGINE, candidates: [], reason: "no_available_quest_for_context", context }, { headers: cors });

    if (action === "select") {
      const selectedRef = String(body?.recommendation_ref ?? ""), selected = ranked.find((candidate) => candidate.item.recommendation_ref === selectedRef);
      if (!selected) return Response.json({ ok: false, error: "selected_quest_not_in_current_candidates" }, { status: 400, headers: cors });
      const { data: currentRec, error: currentRecError } = await supabase.from("education_recommendations")
        .select("id,metadata,alternative,status").eq("person_id", personId).eq("recommendation_type", "quest")
        .in("status", ACTIVE_RECOMMENDATION_STATUSES).order("generated_at", { ascending: false }).limit(1).maybeSingle();
      if (currentRecError) throw currentRecError;
      if (!currentRec) return Response.json({ ok: false, error: "base_quest_recommendation_missing", next: "refresh_recommendations" }, { status: 409, headers: cors });

      const item = selected.item, relatedNodeIds = Array.isArray(item.metadata?.related_node_ids) ? item.metadata.related_node_ids : [];
      const nodeId = relatedNodeIds.length ? String(relatedNodeIds[0]) : null;
      const reasonPrefix = want?.title ? `Want to「${String(want.title).slice(0, 80)}」と今の状態を重ね、` : "今の状態を見て、";
      const reason = `${reasonPrefix}${selected.reasons.join("・") || "今の条件に合う"}ため、このQuestを候補にしました。正解ではなく、次の事実を作る小さな実験です。`;
      const alternative = { ...(currentRec.alternative ?? {}), duration: `${item.estimated_minutes}分Quest`, action: item.instruction, experiment: item.experience,
        quest_catalog: { quest_key: item.quest_key, capability: item.capability, age_band: item.age_band, difficulty: item.difficulty, xp_reward: item.xp_reward, observation_axes: item.observation_axes } };
      const metadata = { ...(currentRec.metadata ?? {}), quest_router: ENGINE, quest_catalog_id: item.id, quest_key: item.quest_key, capability: item.capability,
        age_band: item.age_band, phase_code: item.phase_code, related_node_ids: relatedNodeIds, ...(nodeId ? { node_id: nodeId } : {}), router_context: context };
      const { data: updated, error: updateError } = await supabase.from("education_recommendations")
        .update({ recommendation_ref: item.recommendation_ref, reason, alternative, metadata }).eq("id", currentRec.id)
        .select("id,recommendation_type,recommendation_ref,destination,reason,confidence,alternative,status,generated_at,metadata").single();
      if (updateError) throw updateError;
      await supabase.from("funnel_events").insert({ contact_id: personId, event_type: "quest_router_selected", channel: "pwa",
        payload: { engine: ENGINE, recommendation_ref: item.recommendation_ref, quest_key: item.quest_key, context } });
      return Response.json({ ok: true, engine: ENGINE, selected: candidatePayload(selected), recommendation: updated, context }, { headers: cors });
    }

    return Response.json({ ok: true, engine: ENGINE, context, candidates: ranked.map(candidatePayload) }, { headers: cors });
  } catch (error) {
    console.error("quest-router error", error);
    return Response.json({ ok: false, error: "quest_router_failed" }, { status: 500, headers: cors });
  }
});
