"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACE_SEARCH_DOCUMENTS,
  keywordSearch,
  type AceSearchDocument,
} from "@/lib/aceLocalSearch";

type RankedMatch = { id: string; score: number };
type WorkerEvent = {
  type: "progress" | "ready" | "results" | "error";
  message?: string;
  device?: string;
  count?: number;
  fromCache?: boolean;
  requestId?: number;
  matches?: RankedMatch[];
};

const suggestedQuestions = [
  "本番前の緊張を整えたい",
  "練習を振り返って成長したい",
  "毎日少しずつ運動したい",
  "次のQuestを選びたい",
];

export default function AceLocalSearchPage() {
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [runtime, setRuntime] = useState("");
  const [message, setMessage] = useState("");
  const [matches, setMatches] = useState<RankedMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const currentRequest = useRef(0);

  const basicResults = useMemo(() => keywordSearch(submitted), [submitted]);
  const byId = useMemo(
    () => new Map(ACE_SEARCH_DOCUMENTS.map((doc) => [doc.id, doc])),
    [],
  );

  const results = useMemo(() => {
    if (matches && submitted) {
      return matches.flatMap((match) => {
        const doc = byId.get(match.id);
        return doc ? [{ doc, score: match.score }] : [];
      });
    }
    return basicResults.map((doc) => ({ doc, score: null }));
  }, [matches, submitted, basicResults, byId]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  function runSearch(nextQuestion: string) {
    const clean = nextQuestion.trim().slice(0, 500);
    setQuestion(clean);
    setSubmitted(clean);
    setMatches(null);
    setMessage("");
    setSearching(false);
    currentRequest.current += 1;
    if (clean && phase === "ready" && workerRef.current) {
      setSearching(true);
      workerRef.current.postMessage({
        type: "search",
        query: clean,
        requestId: currentRequest.current,
      });
    }
  }

  function activateAI() {
    if (phase === "loading" || phase === "ready") return;
    if (typeof Worker === "undefined") {
      setMessage("このブラウザはWeb Workerに対応していません。通常検索をご利用ください。");
      setPhase("error");
      return;
    }
    workerRef.current?.terminate();
    const worker = new Worker("/embeddinggemma2-worker.js", { type: "module" });
    workerRef.current = worker;
    setPhase("loading");
    setProgress("準備中…");
    setMessage("");

    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      const data = event.data;
      if (data.type === "progress") {
        setProgress(data.message || "索引を作成中…");
      }
      if (data.type === "ready") {
        setRuntime(data.device || "local");
        setProgress(data.fromCache ? "保存済みの索引を利用" : String(data.count || 0) + "件の索引を作成");
        setPhase("ready");
        // Query is optional: starting the model alone must not submit a search.
      }
      if (data.type === "results" && data.requestId === currentRequest.current) {
        setMatches(data.matches || []);
        setSearching(false);
      }
      if (data.type === "error") {
        if (data.requestId !== undefined && data.requestId !== currentRequest.current) return;
        setSearching(false);
        setMatches(null);
        setMessage("端末内AIを利用できません: " + (data.message || "初期化に失敗しました") + "。通常検索は引き続き利用できます。");
        if (data.requestId === undefined) setPhase("error");
      }
    };
    worker.onerror = () => {
      setPhase("error");
      setSearching(false);
      setMessage("AIの読み込みに失敗しました。ネット接続やブラウザを確認してください。通常検索は利用できます。");
    };
    worker.postMessage({ type: "init", documents: ACE_SEARCH_DOCUMENTS });
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-[#080d16] pb-32 text-[#edf2f8]">
      <main className="mx-auto w-full max-w-4xl min-w-0 px-4 py-7 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[.22em] text-[#ffad62]">ACE KNOWLEDGE / DEVICE SEARCH</p>
            <h1 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">自分の端末で、知識を探す。</h1>
          </div>
          <Link href="/knowledge" className="flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm text-[#d5dfec]">
            Knowledgeに戻る
          </Link>
        </header>

        <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-6">
          <p className="text-sm leading-7 text-[#acb7c7]">
            ACEの公開済み学習カードと機能ガイドを検索します。まずは軽い通常検索。
            EmbeddingGemma 2を起動すると、検索語が一致しなくても意味から探せます。
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              runSearch(question);
            }}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="ace-search-question" className="sr-only">探したいこと</label>
            <input
              id="ace-search-question"
              type="search"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="例：練習で疲れた時は？"
              maxLength={500}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/20 bg-[#0b1524] px-4 text-base text-white outline-none placeholder:text-[#8590a0] focus:border-[#ffad62]"
            />
            <button
              type="submit"
              className="min-h-12 shrink-0 rounded-xl bg-[#ff8a1f] px-6 text-base font-semibold text-[#08121f] transition hover:brightness-110"
            >
              {phase === "ready" ? "意味検索する" : "検索する"}
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="検索例">
            {suggestedQuestions.map((example) => (
              <button
                type="button"
                key={example}
                onClick={() => runSearch(example)}
                className="min-h-11 max-w-full rounded-full border border-white/15 px-3 py-2 text-left text-xs text-[#b6c2d1]"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-[#ff8a1f]/20 bg-[#ff8a1f]/[0.04] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-semibold">EmbeddingGemma 2（実験版）</h2>
              <p className="mt-1 text-sm leading-6 text-[#9faec0]">
                AIは押した時だけ取得。初回は数百MB規模の通信・追加メモリが必要な場合があります。
                端末の性能やブラウザによっては起動できません。
              </p>
            </div>
            <button
              type="button"
              onClick={activateAI}
              disabled={phase === "loading" || phase === "ready"}
              className="min-h-12 shrink-0 rounded-xl border border-[#ffad62]/60 px-4 text-sm font-bold text-[#ffb36d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phase === "idle" || phase === "error" ? "端末内AIを起動" : phase === "loading" ? "読み込み中…" : "AI起動済み"}
            </button>
          </div>
          <p className="mt-3 break-words text-xs leading-6 text-[#e0ad80]" role="status" aria-live="polite">
            {phase === "loading" ? progress : phase === "ready" ? "端末内AIが利用可能（" + runtime + "）。" + progress : "現在は通常検索モードです。"}
          </p>
          {message && <p role="alert" className="mt-2 break-words text-sm text-[#ffc2a8]">{message}</p>}
          <p className="mt-2 text-xs leading-6 text-[#8592a6]">
            検索語の埋め込み計算は端末内で実行。AIの起動時は外部CDN・Hugging Faceからコードとモデルを取得します。
            現段階では非公開の個人記録やDriveの文書は検索対象に含めません。
          </p>
        </section>

        <section className="mt-8" aria-label="検索結果">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold">{submitted ? "検索結果" : "検索できるACE教材"}</h2>
            <span className="text-xs text-[#8a97aa]">
              {searching ? "意味検索中…" : matches && submitted ? "意味検索（端末内AI）" : "通常検索"} ・{results.length}件
            </span>
          </div>
          {results.length === 0 && (
            <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm text-[#aeb9c8]">
              該当する教材が見つかりません。別の言葉で検索するか、端末内AIを試してください。
            </p>
          )}
          <div className="mt-4 grid min-w-0 gap-3">
            {results.map(({ doc, score }: { doc: AceSearchDocument; score: number | null }) => (
              <Link
                key={doc.id}
                href={doc.href}
                className="block min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-[#ff8a1f]/40 hover:bg-white/[0.05]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#ffb16d]">{doc.category}</span>
                  {score !== null && <span className="text-xs text-[#98a8bc]">関連度 {Math.round(score * 100)}%</span>}
                </div>
                <h3 className="mt-2 break-words font-semibold leading-7 text-[#edf2f8]">{doc.title}</h3>
                <p className="mt-2 break-words text-sm leading-7 text-[#9daabd]">{doc.text}</p>
                <div className="mt-3 text-xs text-[#ffb16d]">関連ページを開く →</div>
              </Link>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-[#7b8899]">
            この機能は検索であり、AIによる回答生成・医学的判断ではありません。検索結果は元の教材で確認してください。
          </p>
        </section>
      </main>
    </div>
  );
}
