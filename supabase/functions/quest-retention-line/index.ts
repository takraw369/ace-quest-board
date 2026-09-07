import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const SAFE_MONTHLY_MESSAGE_CAP = 200;
const DEFAULT_PWA_BASE_URL = "https://ace-quest-board.takraw501.workers.dev";

function getAdminKey(): string | null {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.default === "string" && parsed.default) return parsed.default;
    } catch (_) {
      // Fall through to legacy key.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function tokyoDate(now = new Date()): string {
  return new Date(now.getTime() + TOKYO_OFFSET_MS).toISOString().slice(0, 10);
}

async function linePush(to: string, text: string, accessToken: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) throw new Error(`LINE push failed: ${res.status} ${await res.text()}`);
}

async function getLineQuota(accessToken: string) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [quotaRes, usageRes] = await Promise.all([
    fetch("https://api.line.me/v2/bot/message/quota", { headers }),
    fetch("https://api.line.me/v2/bot/message/quota/consumption", { headers }),
  ]);
  if (!quotaRes.ok) throw new Error(`LINE quota failed: ${quotaRes.status} ${await quotaRes.text()}`);
  if (!usageRes.ok) throw new Error(`LINE usage failed: ${usageRes.status} ${await usageRes.text()}`);
  return { quota: await quotaRes.json(), usage: await usageRes.json() };
}

function renderReminder(baseUrl: string): string {
  const url = `${baseUrl.replace(/\/$/, "")}/quest`;
  return [
    "🌙 今日のQuest、まだなら3分だけ。",
    "",
    "完璧に終えるより、まず戻る。",
    "今日の自分を1回観察して、1つだけ進めよう。",
    "",
    `FLOW OS → ${url}`,
  ].join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = getAdminKey();
  const lineToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (!supabaseUrl || !adminKey || !lineToken) {
    return Response.json({ ok: false, reason: "server_secrets_not_configured" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cronSecret = req.headers.get("x-masa-cron-secret") ?? "";
  const { data: expectedSecret, error: secretError } = await supabase.rpc("get_masa_daily_cron_secret");
  if (secretError || !expectedSecret || cronSecret !== expectedSecret) {
    return new Response("unauthorized", { status: 401 });
  }

  const focusDate = tokyoDate();
  const startedAt = new Date().toISOString();
  let runId: string | null = null;

  try {
    const { data: run, error: runError } = await supabase
      .from("automation_run_logs")
      .insert({
        automation_key: "quest_retention_line",
        trigger_source: req.headers.get("x-automation-source") ?? "supabase_cron",
        status: "running",
        started_at: startedAt,
        metadata: { focus_date: focusDate, rollout: "masa_admin_pilot", edge_function: "quest-retention-line" },
      })
      .select("id")
      .single();
    if (runError) throw runError;
    runId = run?.id ?? null;

    const { quota, usage } = await getLineQuota(lineToken);
    const reportedLimit = quota?.type === "limited" ? Number(quota?.value ?? 0) : SAFE_MONTHLY_MESSAGE_CAP;
    const safeLimit = Math.min(
      Number.isFinite(reportedLimit) && reportedLimit > 0 ? reportedLimit : SAFE_MONTHLY_MESSAGE_CAP,
      SAFE_MONTHLY_MESSAGE_CAP,
    );
    const totalUsage = Number(usage?.totalUsage ?? 0);
    if (totalUsage >= safeLimit) {
      await supabase.from("automation_run_logs").update({
        status: "skipped",
        finished_at: new Date().toISOString(),
        target_count: 0,
        sent_count: 0,
        skipped_count: 1,
        error_count: 0,
        metadata: { focus_date: focusDate, reason: "free_message_safety_cap_reached", total_usage: totalUsage, safe_limit: safeLimit },
      }).eq("id", runId);
      return Response.json({ ok: true, skipped: "free_message_safety_cap_reached", total_usage: totalUsage, safe_limit: safeLimit });
    }

    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id,line_user_id,lifecycle_stage,tags")
      .contains("tags", ["masa_admin"])
      .not("line_user_id", "is", null)
      .neq("lifecycle_stage", "inactive")
      .limit(10);
    if (contactsError) throw contactsError;

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const results: Record<string, unknown>[] = [];
    const baseUrl = Deno.env.get("ACE_PWA_BASE_URL") || DEFAULT_PWA_BASE_URL;
    const message = renderReminder(baseUrl);

    for (const contact of contacts ?? []) {
      try {
        const { data: progress, error: progressError } = await supabase
          .from("person_progress")
          .select("last_completion_date,quests_completed,actions_completed")
          .eq("contact_id", contact.id)
          .maybeSingle();
        if (progressError) throw progressError;

        if (!progress) {
          skippedCount++;
          results.push({ contact_id: contact.id, skipped: "no_progress_record" });
          continue;
        }

        if (progress.last_completion_date === focusDate) {
          skippedCount++;
          results.push({ contact_id: contact.id, skipped: "completed_today" });
          continue;
        }

        const messageKey = "quest_retention_v1";
        const { data: claim, error: claimError } = await supabase
          .from("line_delivery_guard")
          .insert({
            contact_id: contact.id,
            message_key: messageKey,
            delivery_date: focusDate,
            metadata: { reason: "quest_not_completed_today", rollout: "masa_admin_pilot" },
          })
          .select("id")
          .single();

        if (claimError?.code === "23505") {
          skippedCount++;
          results.push({ contact_id: contact.id, skipped: "duplicate_guard" });
          continue;
        }
        if (claimError) throw claimError;

        try {
          await linePush(contact.line_user_id, message, lineToken);
        } catch (pushError) {
          await supabase.from("line_delivery_guard").delete().eq("id", claim.id);
          throw pushError;
        }

        await supabase.from("line_delivery_guard").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", claim.id);
        await supabase.from("line_message_log").insert({
          contact_id: contact.id,
          direction: "outbound",
          message_type: "text",
          body: message,
          payload: { transport: "push", automation: "quest_retention", message_key: messageKey, focus_date: focusDate, rollout: "masa_admin_pilot" },
          delivery_mode: "push",
          message_object_count: 1,
          billing_units: 1,
          delivery_reason: "quest_retention",
          cost_policy_decision: "allowed_under_free_cap",
          cost_metadata: { total_usage_before_send: totalUsage, safe_limit: safeLimit },
        });

        sentCount++;
        results.push({ contact_id: contact.id, sent: true });
      } catch (error) {
        errorCount++;
        results.push({ contact_id: contact.id, error: error instanceof Error ? error.message : String(error) });
      }
    }

    const finalStatus = errorCount > 0 ? (sentCount + skippedCount > 0 ? "partial" : "error") : "success";
    await supabase.from("automation_run_logs").update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      target_count: contacts?.length ?? 0,
      sent_count: sentCount,
      skipped_count: skippedCount,
      error_count: errorCount,
      metadata: { focus_date: focusDate, rollout: "masa_admin_pilot", total_usage_before_send: totalUsage, safe_limit: safeLimit },
    }).eq("id", runId);

    return Response.json({ ok: errorCount === 0, status: finalStatus, focus_date: focusDate, sent_count: sentCount, skipped_count: skippedCount, error_count: errorCount, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (runId) {
      await supabase.from("automation_run_logs").update({
        status: "error",
        finished_at: new Date().toISOString(),
        error_count: 1,
        error_message: message,
        metadata: { focus_date: focusDate, rollout: "masa_admin_pilot" },
      }).eq("id", runId);
    }
    console.error("quest-retention-line failed", error);
    return Response.json({ ok: false, reason: "quest_retention_failed", error: message }, { status: 500 });
  }
});
