/**
 * Controlled Google Sheets -> Supabase sync for Question Coach.
 *
 * Flow: human changes M to APPROVED, signs Q -> next enabled run upserts
 * a published answer and resets M to REVIEW_REQUIRED to prevent silent resyncs.
 *
 * No LLM and no client-side service credentials.
 */
import { createSign } from "node:crypto";
import { pathToFileURL } from "node:url";

export const SHEET_ID = "1qxKqUEzNDfug-of7sRBzC6FeCJrFSSFT6kBZtfLta5Q";
export const TAB = "QUESTION_COACH_ANSWERS";
export const HEADERS = [
  "question_key", "分類", "元の質問（アプリ）", "言い換え候補（1行1件）",
  "模範解答（アプリにそのまま表示）", "より秀逸な問い", "改善理由",
  "Thinking Lens", "深掘り質問（1行1件）", "キーワード", "出典／根拠",
  "DB公開状態", "編集承認（APPROVEDで同期可）", "同期状況",
  "DB更新日時UTC", "レビューコメント", "確認者",
];
const VALID_LENSES = new Set([
  "DEFINITION", "ASSUMPTION", "EVIDENCE", "COUNTERFACTUAL", "EXCEPTION",
  "CAUSALITY", "PERSPECTIVE", "ABSTRACTION", "SYSTEM", "TRADEOFF",
  "TRANSFER", "PHASE", "ACTION", "META",
]);
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const clean = (value) => String(value ?? "").trim();
const splitLines = (value) => String(value ?? "").split(/\r?\n/)
  .map((item) => item.trim()).filter(Boolean);
const b64url = (value) => Buffer.from(value).toString("base64url");
const must = (condition, message) => {
  if (!condition) throw new Error(message);
};

export function selectApprovedRows(valueRows) {
  must(Array.isArray(valueRows) && valueRows.length > 0, "Missing Sheets rows");
  for (let i = 0; i < HEADERS.length; i++) {
    must(clean(valueRows[0][i]) === HEADERS[i], "Sheet header mismatch at " + (i + 1));
  }
  const seen = new Set();
  const approved = [];
  let drafts = 0;
  for (let i = 1; i < valueRows.length; i++) {
    const r = valueRows[i];
    if (!r || !r.some((v) => clean(v))) continue;
    const key = clean(r[0]);
    if (!key) {
      // Empty template rows are skipped. Populated rows must have an ID.
      must(!r.slice(1).some((v) => clean(v)), "Row " + (i + 1) + " has content but no question_key");
      continue;
    }
    must(!seen.has(key), "Duplicate question_key in Sheet: " + key);
    seen.add(key);
    const approval = clean(r[12]);
    if (approval !== "APPROVED") {
      drafts++;
      continue;
    }
    const label = "Row " + (i + 1) + " (" + key + ")";
    must(/^[a-z0-9][a-z0-9-]{2,79}$/.test(key), label + ": invalid question_key");
    must(clean(r[16]).length >= 2, label + ": reviewer Q is required");
    must(["published", "draft", "not_in_db"].includes(clean(r[11])), label + ": invalid DB state");
    must(clean(r[2]).length >= 6, label + ": missing question");
    must(clean(r[4]).length >= 30, label + ": answer too short");
    must(clean(r[5]).length >= 6, label + ": missing upgraded question");
    must(clean(r[6]).length >= 10, label + ": missing improvement reason");
    must(VALID_LENSES.has(clean(r[7]).toUpperCase()), label + ": unknown Thinking Lens");
    must(clean(r[10]).length >= 4, label + ": missing source");
    const answer = clean(r[4]);
    must(answer.length <= 15000, label + ": answer too long");
    const deepeners = splitLines(r[8]);
    must(deepeners.length <= 3, label + ": maximum three deepeners");
    const aliases = [...new Set(splitLines(r[3]))];
    must(aliases.length <= 20, label + ": too many aliases");
    const keywords = [...new Set(splitLines(r[9]))];
    must(keywords.length <= 25, label + ": too many keywords");
    approved.push({
      sheetRow: i + 1,
      data: {
        question_key: key,
        question_text: clean(r[2]),
        aliases,
        answer,
        upgraded_question: clean(r[5]),
        why_better: clean(r[6]),
        lens: clean(r[7]).toUpperCase(),
        deepeners,
        keywords,
        category: clean(r[1]) || "general",
        source_ref: clean(r[10]),
        status: "published",
        updated_at: new Date().toISOString(),
      },
    });
  }
  return { approved, drafts, total: seen.size };
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 280);
    throw new Error("HTTP " + response.status + " at " + new URL(url).host + ": " + detail);
  }
  return response;
}

async function googleAccessToken(serviceAccountJson) {
  let credential;
  try { credential = JSON.parse(serviceAccountJson); }
  catch { throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON"); }
  must(credential.type === "service_account" &&
    credential.client_email && credential.private_key,
    "Google service account must contain type, client_email and private_key");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64url(JSON.stringify({
      iss: credential.client_email,
      scope: GOOGLE_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }));
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const jwt = unsigned + "." + signer.sign(credential.private_key).toString("base64url");
  const resp = await request(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });
  const json = await resp.json();
  must(typeof json.access_token === "string", "Google OAuth token missing");
  return json.access_token;
}

export async function runSync({ dryRun = false, env = process.env } = {}) {
  const serviceAccountJson = env.QC_GOOGLE_SERVICE_ACCOUNT_JSON;
  must(serviceAccountJson, "Missing QC_GOOGLE_SERVICE_ACCOUNT_JSON. Share the Sheet with its service account.");
  const accessToken = await googleAccessToken(serviceAccountJson);
  const url = "https://sheets.googleapis.com/v4/spreadsheets/" + SHEET_ID +
    "/values/" + encodeURIComponent(TAB + "!A1:Q300");
  const read = await request(url, {
    headers: { Authorization: "Bearer " + accessToken },
  });
  const data = await read.json();
  const { approved, drafts, total } = selectApprovedRows(data.values ?? []);
  console.info(JSON.stringify({
    event: "question_coach_sync_plan", total, approved: approved.length, held: drafts, dryRun,
  }));
  if (dryRun || approved.length === 0) return { approved: approved.length, synced: 0, dryRun };

  must(env.QC_SYNC_ENABLED === "true",
    "QC_SYNC_ENABLED=true required before writing to Supabase");
  const base = clean(env.QC_SUPABASE_URL);
  const serviceRoleKey = clean(env.QC_SUPABASE_SERVICE_ROLE_KEY);
  must(base === "https://qydbtholbwbuwiswmqsr.supabase.co",
    "Unknown Supabase project; refusing cross-project writes");
  must(serviceRoleKey.length >= 20, "Missing QC_SUPABASE_SERVICE_ROLE_KEY");
  let synced = 0;
  // Per-row upsert + readback + Google status reset. Failed rows remain APPROVED and retry idempotently.
  for (const item of approved) {
    const endpoint = base + "/rest/v1/question_coach_answers?on_conflict=question_key";
    const response = await request(endpoint, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(item.data),
    });
    const returned = await response.json();
    must(Array.isArray(returned) && returned.length === 1 &&
      returned[0].question_key === item.data.question_key &&
      returned[0].answer === item.data.answer &&
      returned[0].status === "published",
    "Supabase upsert not verified at row " + item.sheetRow);

    const sheetUrl = "https://sheets.googleapis.com/v4/spreadsheets/" + SHEET_ID +
      "/values:batchUpdate";
    const timestamp = returned[0].updated_at || item.data.updated_at;
    const patch = {
      valueInputOption: "RAW",
      data: [{
        range: TAB + "!L" + item.sheetRow + ":O" + item.sheetRow,
        values: [["published", "REVIEW_REQUIRED", "DB_SYNCED", timestamp]],
      }],
    };
    await request(sheetUrl, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });
    synced++;
    console.info(JSON.stringify({ event: "question_coach_synced", key: item.data.question_key }));
  }
  return { approved: approved.length, synced, dryRun };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSync({ dryRun: process.argv.includes("--dry-run") })
    .then((result) => console.info(JSON.stringify({ event: "sync_complete", ...result })))
    .catch((err) => {
      console.error("Question Coach sync failed: " + err.message);
      process.exitCode = 1;
    });
}
