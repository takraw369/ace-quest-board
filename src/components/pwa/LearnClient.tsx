'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import {
  DeepeningPayload,
  loadBootstrap,
  loadDeepeningContent,
  PwaBootstrap,
  recommendationOf,
  sessionIsUsable,
  trackContentAction,
} from '@/lib/pwa';

function contentTrackingPayload(
  item: DeepeningPayload['items'][number],
  index: number,
  deepening: DeepeningPayload,
  surface: string,
) {
  return {
    content_id: item.id,
    asset_id: item.asset_id,
    node_id: item.node_id ?? deepening.node_id ?? null,
    title: item.title,
    kind: item.kind,
    position: index + 1,
    surface,
    flow_day: deepening.flow_day ?? null,
    completed_quest_id: deepening.completed_quest_id ?? null,
  };
}

export default function LearnClient() {
  const [data, setData] = useState<PwaBootstrap | null>(null);
  const [deepening, setDeepening] = useState<DeepeningPayload | null>(null);
  const [deepeningError, setDeepeningError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const impressionKeyRef = useRef<string | null>(null);

  useEffect(() => setData(loadBootstrap()), []);
  const rec = useMemo(() => recommendationOf(data, 'education'), [data]);
  const dailyDone = data?.daily_quest?.status === 'completed';

  useEffect(() => {
    if (!data || !dailyDone || !sessionIsUsable(data)) return;
    let cancelled = false;
    setDeepeningError(null);
    void loadDeepeningContent(data)
      .then((payload) => {
        if (!cancelled) setDeepening(payload);
      })
      .catch((error) => {
        if (!cancelled) setDeepeningError(error instanceof Error ? error.message : 'deepening_failed');
      });
    return () => { cancelled = true; };
  }, [data?.session_token, dailyDone]);

  const visibleItems = deepening?.items.slice(0, 3) ?? [];
  const visibleItemIds = visibleItems.map((item) => item.id).join(',');

  useEffect(() => {
    if (!data || !deepening || visibleItems.length === 0 || !sessionIsUsable(data)) return;
    const key = `learn:${deepening.flow_day ?? ''}:${deepening.completed_quest_id ?? ''}:${visibleItemIds}`;
    if (impressionKeyRef.current === key) return;
    impressionKeyRef.current = key;
    void trackContentAction(data, 'content_impression', {
      items: visibleItems.map((item, index) => contentTrackingPayload(item, index, deepening, 'learn')),
    }).catch(() => undefined);
  }, [data, deepening, visibleItemIds, visibleItems]);

  useEffect(() => {
    if (!deepening || typeof window === 'undefined' || !window.location.hash.startsWith('#content-')) return;
    const id = decodeURIComponent(window.location.hash.slice('#content-'.length));
    const item = deepening.items.find((candidate) => candidate.id === id);
    if (!item) return;
    setExpandedId(item.id);
    window.setTimeout(() => {
      document.getElementById(`content-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [deepening]);

  if (!data?.ok || !sessionIsUsable(data)) {
    return <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]"><div className="mx-auto max-w-md"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">LEARN</p><h1 className="mt-3 font-serif text-3xl font-semibold">LINEと接続して学びを始める</h1><p className="mt-4 text-sm leading-7 text-[#939a92]">本人データと接続すると、今の状態に合わせたEducationが出ます。</p><Link href="/connect/line" className="mt-7 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">LINEと接続</Link></div><PwaNav /></main>;
  }

  if (dailyDone) {
    const items = deepening?.items ?? [];
    const completedNode = deepening?.node_id ?? data.daily_quest?.completed_node_id ?? null;
    const stage = deepening?.progression?.stage ?? null;

    return (
      <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
        <div className="mx-auto max-w-xl">
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">LEARN / PICK YOUR NEXT INSIGHT</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">今日の体験から、気になるものを1つ</h1>
          <p className="mt-4 text-sm leading-7 text-[#9da29b]">全部読む必要はなし。タイトルを見て「これ何？」と思ったものだけ拾う。そこから次の見方が増えれば十分。</p>

          <section className="mt-6 rounded-[28px] border border-[#789581]/20 bg-[#789581]/[0.06] p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ab0a0]">TODAY&apos;S EXPERIENCE</p>
              {stage && <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8f958e]">{stage}</span>}
            </div>
            <p className="mt-3 text-sm leading-7 text-[#d8ded7]">{completedNode ? `${completedNode} を実際にやったデータ` : '今日のQuestで取れた自分のデータ'}を起点に選んでいます。</p>
          </section>

          {!deepening && !deepeningError && <p className="mt-7 text-sm text-[#939a92]">関連する学びを選んでいます…</p>}
          {deepeningError && <p className="mt-7 text-sm text-[#c98f83]">学びの取得に失敗しました。LINEからFLOW OSを開き直すと再取得できます。</p>}

          {items.length > 0 && (
            <div className="mt-7 space-y-4">
              {items.slice(0, 3).map((item, index) => {
                const expanded = expandedId === item.id;
                const saved = savedIds.includes(item.id);
                const kindLabel = item.kind === 'video' ? 'VIDEO' : item.kind === 'audio' ? 'AUDIO' : 'ARTICLE';
                const tracking = deepening ? contentTrackingPayload(item, index, deepening, 'learn') : null;
                return (
                  <article id={`content-${item.id}`} key={item.id} className="scroll-mt-6 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">0{index + 1} / {kindLabel}</p>
                      {item.genre && <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-[#8f958e]">{item.genre}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextExpanded = !expanded;
                        setExpandedId(nextExpanded ? item.id : null);
                        if (nextExpanded && tracking) {
                          void trackContentAction(data, 'content_opened', tracking).catch(() => undefined);
                        }
                      }}
                      className="mt-3 w-full text-left"
                    >
                      <h2 className="font-serif text-xl font-semibold leading-8 text-[#eee8dc]">{item.title}</h2>
                      {item.why && <p className="mt-3 text-xs leading-6 text-[#8fa795]">{item.why}</p>}
                      {item.summary && <p className="mt-3 text-sm leading-7 text-[#aeb5ad]">{item.summary}</p>}
                      {item.body && <p className="mt-4 text-xs font-semibold text-[#d9c18d]">{expanded ? '閉じる ↑' : '読む →'}</p>}
                    </button>

                    {expanded && item.body && (
                      <div className="mt-4 border-t border-white/10 pt-4">
                        <p className="whitespace-pre-wrap text-sm leading-8 text-[#d5d8d2]">{item.body}</p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saved}
                        onClick={() => {
                          if (saved || !tracking) return;
                          setSavedIds((current) => current.includes(item.id) ? current : [...current, item.id]);
                          void trackContentAction(data, 'content_saved', tracking).catch(() => {
                            setSavedIds((current) => current.filter((id) => id !== item.id));
                          });
                        }}
                        className="rounded-full border border-[#789581]/30 px-4 py-2 text-xs font-semibold text-[#a9c0af] disabled:opacity-60"
                      >
                        {saved ? '保存済み ✓' : 'あとで見る +'}
                      </button>
                      {item.url && <a href={item.url} className="rounded-full border border-white/10 px-4 py-2 text-xs text-[#aeb5ad]">関連コンテンツを見る</a>}
                      {item.kind === 'video' && !item.url && <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-[#777d77]">動画準備中</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <Link href="/today" className="mt-6 flex w-full items-center justify-center rounded-full border border-white/10 px-5 py-4 text-sm font-semibold text-[#b2b7b1]">今日はここまで</Link>
        </div>
        <PwaNav />
      </main>
    );
  }

  if (!rec) return <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]"><div className="mx-auto max-w-md"><h1 className="font-serif text-3xl font-semibold">おすすめを準備中</h1><p className="mt-4 text-sm text-[#939a92]">LINEからもう一度FLOW OSを開くと、最新の推薦を取得します。</p></div><PwaNav /></main>;

  const alt = (rec.alternative ?? {}) as Record<string, unknown>;
  const question = typeof alt.question_text === 'string' ? alt.question_text : null;
  const focus = typeof alt.focus === 'string' ? alt.focus : null;
  const nodeTitle = (rec.metadata?.node_title as string | undefined) ?? rec.recommendation_ref ?? '今のEducation';

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">LEARN / SEE THE POINT</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">{nodeTitle}</h1>
        <p className="mt-4 text-sm leading-7 text-[#9da29b]">{rec.reason}</p>

        <section className="mt-7 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">WHAT TO NOTICE</p>
          <p className="mt-4 font-serif text-xl leading-9 text-[#eee8dc]">{focus ?? '結果そのものより、予想と実際の差を見る。'}</p>
          <p className="mt-4 text-sm leading-7 text-[#929992]">ここでは答えを覚えない。次のQuestで、自分の反応を実際に取りにいく。</p>
        </section>

        {question && <section className="mt-4 rounded-[28px] border border-[#789581]/20 bg-[#789581]/[0.06] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ab0a0]">QUESTION</p><p className="mt-3 font-serif text-xl leading-9 text-[#e6e2d9]">{question}</p></section>}

        <Link href="/quest" className="mt-6 flex w-full items-center justify-center rounded-full bg-[#d9c18d] px-5 py-4 text-sm font-semibold text-[#171813]">Questで確かめる →</Link>
      </div>
      <PwaNav />
    </main>
  );
}
