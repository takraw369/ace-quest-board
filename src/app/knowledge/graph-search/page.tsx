"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_ROUTES } from "@/lib/appRoutes";
import { buildAceKnowledgeGraph, searchAceKnowledgeGraph } from "@/lib/aceKnowledgeGraph";

const examples = [
  "緊張したときの次の一手",
  "練習と振り返り",
  "睡眠と注意",
  "Questと成長記録",
];

export default function KnowledgeGraphSearchPage() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [canvas, setCanvas] = useState<unknown>(null);
  const [canvasNotice, setCanvasNotice] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ace-knowledge-canvas-v1");
      if (!raw) return;
      if (raw.length > 500_000) {
        setCanvasNotice("Canvasのデータが大きいため読み込みを省略しました。");
        return;
      }
      setCanvas(JSON.parse(raw));
    } catch {
      setCanvasNotice("Canvasの保存内容を読み込めませんでした。公開ACE教材だけを検索します。");
    }
  }, []);

  const graph = useMemo(() => buildAceKnowledgeGraph(canvas), [canvas]);
  const hits = useMemo(() => searchAceKnowledgeGraph(graph, submitted), [graph, submitted]);
  const canvasCount = graph.nodes.filter((node) => node.kind === "canvas").length;

  function search(value: string) {
    const cleaned = value.trim().slice(0, 300);
    setInput(cleaned);
    setSubmitted(cleaned);
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-[#080d16] pb-28 text-[#edf2f8]">
      <main className="mx-auto w-full max-w-4xl min-w-0 px-4 py-7 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[.2em] text-[#ffad62]">ACE KNOWLEDGE / GRAPH EXPLORER</p>
            <h1 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">知識の「つながり」から探す。</h1>
          </div>
          <Link href={APP_ROUTES.knowledge} className="flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm text-[#d5dfec]">
            Knowledgeへ戻る
          </Link>
        </header>

        <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-6">
          <div className="inline-flex rounded-full border border-[#ff8a1f]/30 bg-[#ff8a1f]/10 px-3 py-1 text-xs font-semibold text-[#ffb878]">
            関係探索・実験版
          </div>
          <p className="mt-4 text-sm leading-7 text-[#abb8ca]">
            ACEの公開教材と、この端末のKnowledge Canvasで自分がつないだノードを探索します。
            質問に直接関係する教材から、最大2つ先の関係までたどり、どんなつながりで見つかったかを表示します。
          </p>
          <form
            className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row"
            onSubmit={(event) => { event.preventDefault(); search(input); }}
          >
            <label htmlFor="graph-query" className="sr-only">関係から探したいこと</label>
            <input
              id="graph-query"
              type="search"
              maxLength={300}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="例：練習を振り返り成長につなぐ"
              className="min-h-12 w-full min-w-0 flex-1 rounded-xl border border-white/20 bg-[#0b1524] px-4 text-base text-white outline-none placeholder:text-[#8293a7] focus:border-[#ffad62]"
            />
            <button type="submit" className="min-h-12 rounded-xl bg-[#ff8a1f] px-5 text-base font-semibold text-[#07121f]">
              関係を探索
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="探索例">
            {examples.map((example) => (
              <button
                type="button"
                key={example}
                onClick={() => search(example)}
                className="min-h-11 max-w-full rounded-full border border-white/15 px-3 py-2 text-left text-xs text-[#c4d0dc]"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2" aria-label="探索対象">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <p className="text-[11px] text-[#8d9caf]">対象データ</p>
            <p className="mt-1 text-sm font-semibold">公開ACE教材 + Canvas {canvasCount}件</p>
            <p className="mt-2 text-xs leading-6 text-[#8290a3]">
              Canvasはこのブラウザに保存された内容のみ。同期・送信はしません。
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <p className="text-[11px] text-[#8d9caf]">探索方式</p>
            <p className="mt-1 text-sm font-semibold">ルールベース・最大2ホップ</p>
            <p className="mt-2 text-xs leading-6 text-[#8290a3]">
              外部API・Jev・LLMは未接続。関係の追加・編集はKnowledge Canvasへ。
            </p>
          </div>
        </section>

        {canvasNotice && <p role="status" className="mt-3 text-xs text-[#f6bb8d]">{canvasNotice}</p>}

        <div className="mt-5 flex min-w-0 flex-wrap gap-3">
          <Link href={APP_ROUTES.knowledgeMap} className="flex min-h-11 items-center rounded-xl border border-[#ffad62]/30 px-4 text-sm text-[#ffb878]">
            Knowledge Canvasで関係を編集 →
          </Link>
          <Link href={APP_ROUTES.knowledgeLocalSearch} className="flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm text-[#dce4ed]">
            端末内ベクトル検索と使い分ける →
          </Link>
        </div>

        <section className="mt-9" aria-label="探索結果">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold">{submitted ? "探索結果" : "つながりから、次の学びへ"}</h2>
            <p role="status" aria-live="polite" className="text-xs text-[#8d9caf]">
              {submitted ? hits.length + "件の候補" : graph.nodes.length + "ノード・" + graph.edges.length + "本の関係"}
            </p>
          </div>
          {!submitted && (
            <p className="mt-4 rounded-2xl border border-white/10 p-5 text-sm leading-7 text-[#a4b2c2]">
              探したい問いを入力すると、直接一致した情報に加えて、知識の関係線を通じて見つかった候補を表示します。
              文章の意味で探したいときは既存の端末内AI検索をご利用ください。
            </p>
          )}
          {submitted && hits.length === 0 && (
            <p className="mt-4 rounded-2xl border border-white/10 p-5 text-sm leading-7 text-[#b6c2ce]">
              つながる教材が見つかりませんでした。別のキーワードを試すか、端末内AI検索をお試しください。
              データに存在しない関係は作りません。
            </p>
          )}
          <div className="mt-4 grid min-w-0 gap-3">
            {hits.map((hit) => (
              <article key={hit.node.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className={hit.basis === "direct" ? "font-semibold text-[#ffb878]" : "font-semibold text-[#93dcb9]"}>
                    {hit.basis === "direct" ? "質問に直接関連" : "関係をたどって発見"}
                  </span>
                  <span className="text-[#8d9caf]">{hit.hops}ホップ · {hit.node.source === "canvas" ? "端末内Canvas" : "公開ACE教材"}</span>
                </div>
                <h3 className="mt-3 break-words text-base font-semibold leading-7">{hit.node.title}</h3>
                <p className="mt-2 break-words text-sm leading-7 text-[#9daec0]">{hit.node.text.slice(0, 260)}</p>
                <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#0b1421] p-3">
                  <p className="text-[11px] font-semibold text-[#91a1b5]">この候補までの経路（推論の根拠ではなく接続の記録）</p>
                  <ol className="mt-2 flex min-w-0 flex-col gap-2">
                    {hit.path.map((step, index) => (
                      <li key={index} className="min-w-0 break-words text-xs leading-6 text-[#c5d0dc]">
                        {index > 0 && <span className="mr-2 text-[#ffad62]">↓ {step.via} →</span>}
                        {step.node.title}
                      </li>
                    ))}
                  </ol>
                </div>
                {hit.node.href && (
                  <Link href={hit.node.href} className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[#ffad62]/30 px-4 text-sm font-semibold text-[#ffb878]">
                    {hit.node.source === "canvas" ? "Canvasを開く" : "元の教材を開く"} →
                  </Link>
                )}
              </article>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-[#8290a3]">
            検索候補は回答や科学的因果関係の保証ではありません。関係は既存の教材分類・編集した接続・Canvasの線から構成されます。
            個人データをクラウドのAIに送る仕組みや、Jevによる判断はこの試作には含みません。
          </p>
        </section>
      </main>
    </div>
  );
}
