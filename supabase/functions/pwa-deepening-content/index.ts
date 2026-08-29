import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function getAdminKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try { return JSON.parse(raw)?.default; } catch (_) {}
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

function flowDayWindow(now = new Date()) {
  const JST = 9 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + JST);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const beforeFive = local.getUTCHours() < 5;
  const localDayMs = Date.UTC(y, m, d) - (beforeFive ? 24 * 60 * 60 * 1000 : 0);
  const start = new Date(localDayMs - JST + 5 * 60 * 60 * 1000);
  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const keyLocal = new Date(start.getTime() + JST);
  const key = `${keyLocal.getUTCFullYear()}-${String(keyLocal.getUTCMonth() + 1).padStart(2, "0")}-${String(keyLocal.getUTCDate()).padStart(2, "0")}`;
  return { start, next, key };
}

function nodeFromQuest(quest: any) {
  const metaNode = String(quest?.metadata?.node_id ?? "").trim();
  if (metaNode) return metaNode;
  const match = String(quest?.recommendation_ref ?? "").match(/experiment:(N\d+):/);
  return match?.[1] ?? null;
}

function checkoutForPerson(base: string | null, personId: string) {
  if (!base) return null;
  try {
    const url = new URL(base);
    url.searchParams.set("client_reference_id", personId);
    return url.toString();
  } catch {
    return base;
  }
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: cors });

  const adminKey = getAdminKey();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!adminKey || !supabaseUrl) {
    return Response.json({ ok: false, error: "server_not_configured" }, { status: 503, headers: cors });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.session_token ?? "");
    const session = await verifySession(token, adminKey);
    if (!session) {
      return Response.json({ ok: false, error: "invalid_or_expired_session" }, { status: 401, headers: cors });
    }

    const personId = String(session.sub);
    const supabase = createClient(supabaseUrl, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const day = flowDayWindow();

    const { data: completedQuest, error: questError } = await supabase
      .from("education_recommendations")
      .select("id,recommendation_ref,acted_at,metadata")
      .eq("person_id", personId)
      .eq("recommendation_type", "quest")
      .eq("status", "completed")
      .gte("acted_at", day.start.toISOString())
      .lt("acted_at", day.next.toISOString())
      .order("acted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (questError) throw questError;

    if (!completedQuest) {
      return Response.json({
        ok: true,
        unlocked: false,
        flow_day: day.key,
        reason: "complete_today_quest_first",
        items: [],
        offer: null,
      }, { headers: cors });
    }

    const nodeId = nodeFromQuest(completedQuest);
    if (!nodeId) {
      return Response.json({ ok: true, unlocked: true, flow_day: day.key, node_id: null, items: [], offer: null }, { headers: cors });
    }

    const { data: links, error: linksError } = await supabase
      .from("curriculum_content_links")
      .select("id,node_id,asset_id,content_kind,display_title,why_text,public_summary,public_body,public_url,access_tier,offer_slug,display_order,metadata")
      .eq("node_id", nodeId)
      .eq("status", "active")
      .order("display_order", { ascending: true })
      .limit(6);
    if (linksError) throw linksError;

    const assetIds = [...new Set((links ?? []).map((link: any) => link.asset_id).filter(Boolean))];
    const assetsById = new Map<string, any>();
    if (assetIds.length > 0) {
      const { data: assets, error: assetsError } = await supabase
        .from("os_content_items")
        .select("asset_id,current_title,genre,productization_status,sell_readiness,related_project")
        .in("asset_id", assetIds);
      if (assetsError) throw assetsError;
      for (const asset of assets ?? []) assetsById.set(asset.asset_id, asset);
    }

    const items = (links ?? []).map((link: any) => {
      const asset = assetsById.get(link.asset_id) ?? {};
      return {
        id: link.id,
        asset_id: link.asset_id,
        node_id: link.node_id,
        kind: link.content_kind,
        title: link.display_title || asset.current_title || link.asset_id,
        why: link.why_text ?? null,
        summary: link.public_summary ?? null,
        body: link.public_body ?? null,
        url: link.public_url ?? null,
        access_tier: link.access_tier,
        genre: asset.genre ?? null,
        source_asset_title: asset.current_title ?? null,
        source_project: asset.related_project ?? null,
        readiness: asset.sell_readiness ?? null,
      };
    });

    const offerSlug = (links ?? []).map((link: any) => link.offer_slug).find(Boolean) ?? "winning_os_90";
    const { data: offerRow, error: offerError } = await supabase
      .from("offers")
      .select("slug,name,tier,price_jpy,status,checkout_url,description,metadata")
      .eq("slug", offerSlug)
      .eq("status", "active")
      .maybeSingle();
    if (offerError) throw offerError;

    const offer = offerRow ? {
      slug: offerRow.slug,
      name: offerRow.name,
      tier: offerRow.tier,
      price_jpy: offerRow.price_jpy,
      description: offerRow.description,
      checkout_url: checkoutForPerson(offerRow.checkout_url, personId),
    } : null;

    return Response.json({
      ok: true,
      unlocked: true,
      flow_day: day.key,
      completed_quest_id: completedQuest.id,
      completed_at: completedQuest.acted_at,
      node_id: nodeId,
      items,
      offer,
    }, { headers: cors });
  } catch (error) {
    console.error("pwa-deepening-content error", error);
    return Response.json({ ok: false, error: "deepening_failed" }, { status: 500, headers: cors });
  }
});
