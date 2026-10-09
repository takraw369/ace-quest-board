import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Tier = "light" | "standard" | "deep";

type Policy = {
  entitlement_id: string;
  feature_key: string;
  default_model_tier: Tier;
  fallback_model_tier: Tier;
  daily_request_limit: number;
  monthly_request_limit: number;
  monthly_cost_limit_jpy: number;
  deep_request_limit: number;
  max_input_tokens: number;
  max_output_tokens: number;
  action_on_limit: "fallback" | "wait" | "upgrade" | "stop" | "human";
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const tierRank: Record<Tier, number> = { light: 0, standard: 1, deep: 2 };

function modelForTier(tier: Tier) {
  if (tier === "deep") return Deno.env.get("OPENAI_ACE_DEEP_MODEL") || "gpt-5.6-sol";
  if (tier === "standard") return Deno.env.get("OPENAI_ACE_STANDARD_MODEL") || "gpt-5.6-terra";
  return Deno.env.get("OPENAI_ACE_LIGHT_MODEL") || "gpt-5.6-luna";
}

function pricePerMillion(tier: Tier) {
  const defaults: Record<Tier, { input: number; output: number }> = {
    light: { input: 0.2, output: 1.2 },
    standard: { input: 2, output: 12 },
    deep: { input: 4, output: 20 },
  };
  const prefix = tier.toUpperCase();
  return {
    input: Number(Deno.env.get(`AI_PRICE_${prefix}_INPUT_USD_M`) || defaults[tier].input),
    output: Number(Deno.env.get(`AI_PRICE_${prefix}_OUTPUT_USD_M`) || defaults[tier].output),
  };
}

function estimatedCostJpy(tier: Tier, inputTokens: number, outputTokens: number) {
  const rate = pricePerMillion(tier);
  const usd = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
  const usdJpy = Number(Deno.env.get("AI_USD_JPY") || "150");
  return Math.max(0, usd * usdJpy);
}

function startOfUtcDay() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

function startOfUtcMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const parts: string[] = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function instructionFor(feature: string) {
  if (feature === "daily_quest") {
    return "You are ACE Daily Quest Coach. Answer in concise Japanese. Convert the user's current state and goal into one realistic next action that can be completed today. Avoid diagnosis or medical claims. End with one Quest and one short completion criterion.";
  }
  if (feature === "deep_coaching") {
    return "You are ACE Deep Coaching. Answer in Japanese. Separate facts, interpretation, assumptions, and next action. Explore patterns deeply but do not diagnose mental or medical conditions. Prefer user agency and concrete experiments. Finish with 1-3 actions and what evidence would show progress.";
  }
  return "You are ACE AI Coach. Answer in Japanese. Help the user clarify the situation, identify the controllable point, and choose one concrete next action. Separate fact from interpretation when useful. Do not diagnose or make medical claims.";
}

function selectEntitlement(rows: any[]) {
  const planPriority: Record<string, number> = { pro: 3, monthly: 2, beta: 1 };
  return [...rows].sort((a, b) => {
    const ap = String(a?.entitlement_definitions?.metadata?.plan || "");
    const bp = String(b?.entitlement_definitions?.metadata?.plan || "");
    return (planPriority[bp] || 0) - (planPriority[ap] || 0);
  })[0] || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: cors });

  const authHeader = req.headers.get("authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!authHeader.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceRoleKey || !openaiKey) {
    return Response.json({ ok: false, error: "not_configured_or_unauthorized" }, { status: 401, headers: cors });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const requestId = crypto.randomUUID();

  try {
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: cors });
    }

    const body = await req.json().catch(() => ({}));
    const featureKey = String(body?.feature_key || "ai_coach").trim();
    const input = String(body?.input || "").trim();
    if (!input) return Response.json({ ok: false, error: "input_required" }, { status: 400, headers: cors });
    if (!new Set(["daily_quest", "ai_coach", "deep_coaching"]).has(featureKey)) {
      return Response.json({ ok: false, error: "unsupported_feature" }, { status: 400, headers: cors });
    }

    const { data: contact, error: contactError } = await admin
      .from("contacts")
      .select("id")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();
    if (contactError) throw contactError;
    if (!contact) return Response.json({ ok: false, error: "contact_not_found" }, { status: 403, headers: cors });

    const nowIso = new Date().toISOString();
    const { data: entitlementRows, error: entitlementError } = await admin
      .from("person_entitlements")
      .select("id,entitlement_id,expires_at,entitlement_definitions!inner(id,entitlement_key,resource_key,metadata)")
      .eq("contact_id", contact.id)
      .eq("status", "active")
      .eq("entitlement_definitions.resource_key", "ace_ai")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
    if (entitlementError) throw entitlementError;

    const held = selectEntitlement(entitlementRows || []);
    if (!held) {
      await admin.from("ai_usage").insert({
        request_id: requestId,
        contact_id: contact.id,
        feature_key: featureKey,
        model_tier: "light",
        provider: "openai",
        model: "none",
        status: "blocked",
        block_reason: "entitlement_required",
      });
      return Response.json({ ok: false, error: "ai_entitlement_required" }, { status: 403, headers: cors });
    }

    const entitlementId = held.entitlement_id as string;
    const entitlementMeta = held.entitlement_definitions?.metadata || {};
    const planKey = String(entitlementMeta?.plan || "unknown");

    const { data: policyRow, error: policyError } = await admin
      .from("ai_feature_policies")
      .select("entitlement_id,feature_key,default_model_tier,fallback_model_tier,daily_request_limit,monthly_request_limit,monthly_cost_limit_jpy,deep_request_limit,max_input_tokens,max_output_tokens,action_on_limit")
      .eq("entitlement_id", entitlementId)
      .eq("feature_key", featureKey)
      .eq("status", "active")
      .maybeSingle();
    if (policyError) throw policyError;
    if (!policyRow) return Response.json({ ok: false, error: "feature_not_in_plan" }, { status: 403, headers: cors });
    const policy = policyRow as Policy;

    // Conservative approximation: ~4 chars/token. Provider-side max_output_tokens is the hard output ceiling.
    if (input.length > policy.max_input_tokens * 4) {
      return Response.json({ ok: false, error: "input_too_large", max_input_tokens: policy.max_input_tokens }, { status: 413, headers: cors });
    }

    const monthStart = startOfUtcMonth();
    const dayStart = startOfUtcDay();
    const { data: monthUsage, error: usageError } = await admin
      .from("ai_usage")
      .select("created_at,estimated_cost_jpy,model_tier,status")
      .eq("contact_id", contact.id)
      .gte("created_at", monthStart)
      .order("created_at", { ascending: false })
      .limit(Math.max(500, policy.monthly_request_limit + 50));
    if (usageError) throw usageError;

    const usageRows = monthUsage || [];
    const billable = usageRows.filter((r: any) => r.status !== "blocked");
    const dailyRequests = billable.filter((r: any) => r.created_at >= dayStart).length;
    const monthlyRequests = billable.length;
    const monthlyCost = billable.reduce((sum: number, r: any) => sum + Number(r.estimated_cost_jpy || 0), 0);
    const monthlyDeep = billable.filter((r: any) => r.model_tier === "deep").length;

    let blockReason: string | null = null;
    if (dailyRequests >= policy.daily_request_limit) blockReason = "daily_request_limit";
    else if (monthlyRequests >= policy.monthly_request_limit) blockReason = "monthly_request_limit";
    else if (monthlyCost >= Number(policy.monthly_cost_limit_jpy)) blockReason = "monthly_cost_limit";
    else if (policy.default_model_tier === "deep" && monthlyDeep >= policy.deep_request_limit) blockReason = "deep_request_limit";

    if (blockReason) {
      await admin.from("ai_usage").insert({
        request_id: requestId,
        contact_id: contact.id,
        entitlement_id: entitlementId,
        plan_key: planKey,
        feature_key: featureKey,
        model_tier: policy.fallback_model_tier,
        provider: "openai",
        model: modelForTier(policy.fallback_model_tier),
        status: "blocked",
        block_reason: blockReason,
        metadata: { action_on_limit: policy.action_on_limit },
      });
      return Response.json({
        ok: false,
        error: "ai_limit_reached",
        reason: blockReason,
        action: policy.action_on_limit,
      }, { status: 429, headers: cors });
    }

    let tier = policy.default_model_tier;
    const costRatio = Number(policy.monthly_cost_limit_jpy) > 0 ? monthlyCost / Number(policy.monthly_cost_limit_jpy) : 1;
    if (costRatio >= 0.8 && tierRank[policy.fallback_model_tier] < tierRank[tier]) {
      tier = policy.fallback_model_tier;
    }

    const model = modelForTier(tier);
    const started = Date.now();
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions: instructionFor(featureKey),
        input,
        reasoning: { effort: tier === "deep" ? "high" : tier === "standard" ? "medium" : "low" },
        max_output_tokens: policy.max_output_tokens,
      }),
    });

    const latencyMs = Date.now() - started;
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      await admin.from("ai_usage").insert({
        request_id: requestId,
        contact_id: contact.id,
        entitlement_id: entitlementId,
        plan_key: planKey,
        feature_key: featureKey,
        model_tier: tier,
        provider: "openai",
        model,
        latency_ms: latencyMs,
        status: "error",
        metadata: { provider_status: response.status, provider_detail: detail.slice(0, 240) },
      });
      console.error("ace-ai-gateway provider error", response.status, detail.slice(0, 500));
      return Response.json({ ok: false, error: "ai_provider_failed" }, { status: 502, headers: cors });
    }

    const payload = await response.json();
    const inputTokens = Number(payload?.usage?.input_tokens || 0);
    const outputTokens = Number(payload?.usage?.output_tokens || 0);
    const costJpy = estimatedCostJpy(tier, inputTokens, outputTokens);
    const answer = extractResponseText(payload);

    const { error: logError } = await admin.from("ai_usage").insert({
      request_id: requestId,
      contact_id: contact.id,
      entitlement_id: entitlementId,
      plan_key: planKey,
      feature_key: featureKey,
      model_tier: tier,
      provider: "openai",
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_jpy: costJpy,
      latency_ms: latencyMs,
      status: "ok",
      metadata: { response_id: payload?.id || null },
    });
    if (logError) console.error("ace-ai-gateway usage log error", logError);

    return Response.json({
      ok: true,
      request_id: requestId,
      feature_key: featureKey,
      plan: planKey,
      model_tier: tier,
      model,
      answer,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_jpy: Math.round(costJpy * 1000) / 1000,
        monthly_cost_jpy_before_request: Math.round(monthlyCost * 1000) / 1000,
        monthly_cost_limit_jpy: Number(policy.monthly_cost_limit_jpy),
      },
    }, { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("ace-ai-gateway error", error);
    return Response.json({ ok: false, error: "ace_ai_gateway_failed", request_id: requestId }, { status: 500, headers: cors });
  }
});
