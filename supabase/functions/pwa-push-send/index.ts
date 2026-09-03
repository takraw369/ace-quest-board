import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = "BIpQyRl-rUcmW1L5V2max90V37uFcxCrKvTWWFlCml0bW4j9gF2B496Uu61V6wvq6ZgxbGpcBt04fg8sMVYXae8";

function getAdminKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try { return JSON.parse(raw)?.default; } catch (_) {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405 });

  const adminKey = getAdminKey();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!adminKey || !supabaseUrl) return Response.json({ ok: false, error: "server_not_configured" }, { status: 503 });
  if (req.headers.get("x-internal-key") !== adminKey) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const contactId = String(body?.contact_id ?? "").trim();
    const title = String(body?.title ?? "ACE").slice(0, 120);
    const message = String(body?.body ?? "新しい通知があります").slice(0, 240);
    const url = String(body?.url ?? "/today");
    const tag = String(body?.tag ?? "ace-update").slice(0, 120);
    if (!contactId) return Response.json({ ok: false, error: "contact_id_required" }, { status: 400 });

    const supabase = createClient(supabaseUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: privateKey, error: keyError } = await supabase.rpc("get_pwa_vapid_private_key");
    if (keyError || !privateKey) throw keyError ?? new Error("vapid_private_key_missing");

    webpush.setVapidDetails("https://masahiro-yamada.com", VAPID_PUBLIC_KEY, String(privateKey));

    const { data: subscriptions, error } = await supabase
      .from("pwa_push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("contact_id", contactId)
      .eq("enabled", true);
    if (error) throw error;

    let sent = 0;
    let disabled = 0;
    const failures: Array<{ id: string; status?: number }> = [];
    const payload = JSON.stringify({ title, body: message, url, tag });

    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 3600 },
        );
        sent += 1;
      } catch (pushError: any) {
        const status = Number(pushError?.statusCode ?? 0) || undefined;
        failures.push({ id: sub.id, status });
        if (status === 404 || status === 410) {
          await supabase.from("pwa_push_subscriptions")
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("id", sub.id);
          disabled += 1;
        }
      }
    }

    await supabase.from("funnel_events").insert({
      contact_id: contactId,
      event_type: "pwa_push_dispatched",
      channel: "pwa",
      payload: { title, url, tag, sent, disabled, failures: failures.length },
    });

    return Response.json({ ok: true, sent, disabled, failures });
  } catch (error) {
    console.error("pwa-push-send failed", error);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
});
