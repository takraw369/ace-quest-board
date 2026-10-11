"use client";

import { useEffect, useMemo, useState } from "react";

export type QuestionCoaching = {
  should_show: boolean;
  upgraded_question: string;
  why_better: string;
  lens: string;
  deepeners: string[];
};

type SavedQuestion = {
  id: string;
  createdAt: string;
  originalQuestion: string;
  answer: string;
  upgradedQuestion: string;
  whyBetter: string;
  lens: string;
  deepeners: string[];
};

type Props = {
  originalQuestion: string;
  answer: string;
  coaching: QuestionCoaching | null | undefined;
  userId: string | null;
  mode: "ai" | "retrieval" | "curated";
  busy: boolean;
  onAskAgain: (question: string) => void;
};

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1qxKqUEzNDfug-of7sRBzC6FeCJrFSSFT6kBZtfLta5Q/edit#gid=950001";
const STORAGE_PREFIX = "ace:question-coach:v1:";

function storageKey(userId: string) {
  return STORAGE_PREFIX + userId;
}

function readHistory(userId: string): SavedQuestion[] {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedQuestion =>
      !!item && typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.createdAt === "string" &&
      typeof item.originalQuestion === "string" &&
      typeof item.upgradedQuestion === "string" &&
      typeof item.answer === "string" &&
      typeof item.lens === "string" &&
      Array.isArray(item.deepeners)
    ).slice(0, 50);
  } catch {
    return [];
  }
}

function driveCell(value: string) {
  const cleaned = value.replace(/[\t\r\n]+/g, " / ").trim();
  // Prevent spreadsheet formula injection when pasted into a Sheet.
  return /^[=+\-@]/.test(cleaned) ? "'" + cleaned : cleaned;
}

function asRefineryRow(item: SavedQuestion) {
  const row = [
    item.createdAt.slice(0, 10),
    item.originalQuestion,
    item.upgradedQuestion,
    item.whyBetter,
    item.lens,
    "REFRAME",
    "3",
    "",
    item.deepeners[0] || "",
    item.deepeners[1] || "",
    item.deepeners[2] || "",
    "ACE / KNOWLEDGE",
    "FLOW OS Question Coach",
    "R&D",
    "REVIEW",
  ];
  return row.map(driveCell).join("\t");
}

export default function QuestionCoachPanel({
  originalQuestion, answer, coaching, userId, mode, busy, onAskAgain,
}: Props) {
  const [history, setHistory] = useState<SavedQuestion[]>([]);
  const [notice, setNotice] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(userId ? readHistory(userId) : []);
    setNotice("");
  }, [userId]);

  const active = (mode === "ai" || mode === "curated") && !!coaching?.should_show &&
    !!coaching.upgraded_question.trim() && !!coaching.why_better.trim();

  const alreadySaved = active && history.some(
    (entry) => entry.originalQuestion === originalQuestion &&
      entry.upgradedQuestion === coaching?.upgraded_question,
  );

  const lensCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of history) {
      counts.set(entry.lens, (counts.get(entry.lens) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [history]);

  function currentEntry(): SavedQuestion | null {
    if (!active || !coaching) return null;
    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      originalQuestion,
      answer,
      upgradedQuestion: coaching.upgraded_question.trim(),
      whyBetter: coaching.why_better.trim(),
      lens: coaching.lens.trim() || "META",
      deepeners: coaching.deepeners.filter((q) => typeof q === "string" && q.trim()).slice(0, 3),
    };
  }

  function save() {
    if (!userId) {
      setNotice("ログイン情報を確認できず、端末保存できません。");
      return;
    }
    if (alreadySaved) {
      setNotice("この問いは端末に保存済みです。");
      return;
    }
    const entry = currentEntry();
    if (!entry) return;
    const next = [entry, ...history].slice(0, 50);
    try {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(next));
      setHistory(next);
      setNotice("この端末に保存しました。Driveへの自動同期はまだ行いません。");
    } catch {
      setNotice("端末への保存に失敗しました。ブラウザの保存設定をご確認ください。");
    }
  }

  async function copyForDrive() {
    const entry = currentEntry();
    if (!entry) return;
    try {
      await navigator.clipboard.writeText(asRefineryRow(entry));
      setNotice("Drive貼り付け用の15列をコピーしました。QUESTION_REFINERYの空行に貼り付けてください。");
    } catch {
      setNotice("コピーできませんでした。ブラウザのクリップボード権限を確認してください。");
    }
  }

  return (
    <section aria-label="Question Coach" className="rounded-3xl border border-[#bda57b]/20 bg-[#11171e] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#d3b77e]">QUESTION COACH / THINKING LAB</div>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-[#f4ead7]">答えから、問いを育てる。</h2>
          <p className="mt-2 text-xs leading-6 text-[#9eaab5]">
            回答が主役。登録済みの模範解答から、必要なときだけ次の視点を提示します。OpenAI APIは使いません。
          </p>
        </div>
        <span className="rounded-full border border-[#d3b77e]/25 px-3 py-1.5 text-[10px] text-[#d3b77e]">BETA</span>
      </div>

      {active && coaching ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[#d3b77e]/20 bg-[#d3b77e]/[.055] p-4">
            <p className="text-[10px] font-bold tracking-[.16em] text-[#d3b77e]">より秀逸な問い</p>
            <p className="mt-3 font-serif text-lg leading-8 text-[#eee4cf]">{coaching.upgraded_question}</p>
            <p className="mt-3 text-xs leading-6 text-[#aab0b4]">{coaching.why_better}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAskAgain(coaching.upgraded_question)}
              className="mt-4 rounded-xl bg-[#d3b77e] px-4 py-2.5 text-xs font-bold text-[#171d22] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              この問いで聞き直す →
            </button>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-lg border border-[#94b6a4]/25 bg-[#94b6a4]/[.08] px-2.5 py-1 text-xs font-bold text-[#b2d2c0]">
                LENS · {coaching.lens || "META"}
              </span>
              <span className="text-[10px] text-[#8e9baa]">使った思考のレンズ</span>
            </div>
            {!!coaching.deepeners?.length && (
              <div className="space-y-2">
                {coaching.deepeners.slice(0, 3).map((deeper, index) => (
                  <button
                    key={index}
                    type="button"
                    disabled={busy}
                    onClick={() => onAskAgain(deeper)}
                    className="block w-full rounded-xl border border-white/[.08] bg-white/[.025] px-4 py-3 text-left text-sm leading-6 text-[#cbd3db] transition hover:border-[#d3b77e]/35 hover:bg-white/[.05] disabled:opacity-50"
                  >
                    <span className="mr-2 text-[#d3b77e]">{index + 1}.</span>{deeper}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/[.08] pt-4">
            <button
              type="button"
              disabled={!userId || !!alreadySaved}
              onClick={save}
              className="rounded-xl border border-[#b2d2c0]/30 bg-[#b2d2c0]/[.07] px-4 py-2.5 text-xs font-semibold text-[#c7e5d1] disabled:opacity-45"
            >
              {alreadySaved ? "✓ 端末に保存済み" : "問いを端末に保存"}
            </button>
            <button
              type="button"
              onClick={copyForDrive}
              className="rounded-xl border border-white/[.14] px-4 py-2.5 text-xs font-semibold text-[#c6d2de] hover:bg-white/[.06]"
            >
              Drive貼り付け用にコピー
            </button>
            <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/[.08] px-4 py-2.5 text-xs text-[#a0aebd] hover:text-white">
              QUESTION_REFINERY ↗
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/[.10] p-4 text-xs leading-7 text-[#9ba7b3]">
          {mode === "retrieval"
            ? "今回は正本の検索結果です。登録済みの改善質問はまだありません。"
            : "今回は回答を優先。問いを改善する必要が低いと判断した場合、追加の質問は出しません。"}
        </div>
      )}
      {!!notice && <p role="status" className="mt-4 text-xs leading-6 text-[#b7d0c6]">{notice}</p>}

      <div className="mt-6 border-t border-white/[.08] pt-5">
        <button type="button" onClick={() => setShowHistory((v) => !v)}
          aria-expanded={showHistory} className="flex w-full items-center justify-between gap-3 text-left">
          <div>
            <p className="text-[10px] font-bold tracking-[.18em] text-[#d3b77e]">MY QUESTION HISTORY</p>
            <p className="mt-1 text-sm text-[#d5dde4]">端末に保存した問い {history.length} 件</p>
          </div>
          <span className="text-sm text-[#a5b1be]">{showHistory ? "閉じる −" : "開く ＋"}</span>
        </button>
        {showHistory && (
          <div className="mt-4 space-y-3">
            <p className="text-[11px] leading-6 text-[#8593a3]">
              保存先はログインユーザーごとのブラウザ領域です。他端末・Driveにはまだ同期されません。
            </p>
            {history.length === 0 && <p className="text-sm text-[#9ba7b3]">まだ記録がありません。</p>}
            {history.slice(0, 12).map((entry) => (
              <details key={entry.id} className="rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3">
                <summary className="cursor-pointer text-xs leading-6 text-[#d4dce4]">
                  <span className="mr-2 text-[#d3b77e]">{entry.lens}</span>
                  {entry.upgradedQuestion}
                </summary>
                <div className="mt-3 border-t border-white/[.08] pt-3 text-xs leading-6 text-[#9eacb9]">
                  <p>元の問い：{entry.originalQuestion}</p>
                  <p className="mt-2">改善理由：{entry.whyBetter}</p>
                  <p className="mt-2 text-[10px]">{new Date(entry.createdAt).toLocaleString("ja-JP")}</p>
                  <button type="button" disabled={busy} onClick={() => onAskAgain(entry.upgradedQuestion)}
                    className="mt-3 text-xs font-bold text-[#d3b77e] disabled:opacity-50">もう一度考える →</button>
                </div>
              </details>
            ))}
            {!!lensCounts.length && (
              <div className="rounded-xl border border-[#94b6a4]/10 bg-[#94b6a4]/[.035] p-4">
                <p className="text-[10px] font-bold tracking-[.15em] text-[#a6c6b6]">THINKING MAP / 利用傾向</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lensCounts.map(([lens, count]) => (
                    <span key={lens} className="rounded-lg bg-white/[.05] px-2.5 py-1.5 text-xs text-[#c6d1cc]">{lens} · {count}</span>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-[#869b90]">使用回数は思考能力の点数ではありません。</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
