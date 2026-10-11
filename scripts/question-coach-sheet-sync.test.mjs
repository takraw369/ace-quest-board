import assert from "node:assert/strict";
import test from "node:test";
import { HEADERS, selectApprovedRows } from "./question-coach-sheet-sync.mjs";

const base = () => [
  "test-question", "thinking", "どうすれば良い問いを作れますか？", "より良い質問は？\n質問の質を上げる",
  "目的・前提・根拠・行動を別々に書き出します。その上で結論に影響する最も重要な条件から確認します。",
  "結論が変わる前提は何ですか？",
  "曖昧な問いから検証可能な問いへ変換できるため。",
  "ASSUMPTION", "確認した事実は？\n反証は？", "質問\n検証",
  "curated:reviewed", "not_in_db", "APPROVED", "NOT_SYNCED", "", "Review completed", "MASA",
];

test("approved row is the only published payload", () => {
  const existing = [...base()];
  existing[0] = "another-question";
  existing[12] = "DRAFT";
  const r = selectApprovedRows([HEADERS, base(), existing]);
  assert.equal(r.approved.length, 1);
  assert.equal(r.approved[0].data.status, "published");
  assert.deepEqual(r.approved[0].data.aliases, ["より良い質問は？", "質問の質を上げる"]);
  assert.equal(r.approved[0].sheetRow, 2);
  assert.equal(r.drafts, 1);
});

test("draft never publishes", () => {
  const draft = base();
  draft[12] = "DRAFT";
  assert.equal(selectApprovedRows([HEADERS, draft]).approved.length, 0);
});

test("reviewer is mandatory", () => {
  const row = base();
  row[16] = "";
  assert.throws(() => selectApprovedRows([HEADERS, row]), /reviewer/);
});

test("invalid lens rejects the entire batch", () => {
  const row = base();
  row[7] = "UNREVIEWED";
  assert.throws(() => selectApprovedRows([HEADERS, row]), /Thinking Lens/);
});

test("duplicate IDs reject sync even when one is draft", () => {
  const row = base();
  const other = [...base()];
  other[12] = "DRAFT";
  assert.throws(() => selectApprovedRows([HEADERS, row, other]), /Duplicate/);
});

test("unexpected header blocks sync", () => {
  const wrongHeader = [...HEADERS];
  wrongHeader[4] = "Model answer";
  assert.throws(() => selectApprovedRows([wrongHeader, base()]), /header mismatch/);
});

test("unreviewed live rows are not re-published", () => {
  const existing = [...base()];
  existing[11] = "published";
  existing[12] = "REVIEW_REQUIRED";
  assert.equal(selectApprovedRows([HEADERS, existing]).approved.length, 0);
});
