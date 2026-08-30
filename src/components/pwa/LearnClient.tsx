'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import {
  DeepeningPayload,
  growthAction,
  loadBootstrap,
  loadDeepeningContent,
  PwaBootstrap,
  recommendationOf,
  sessionIsUsable,
  trackContentAction,
} from '@/lib/pwa';

const CONTENT_ACTION_STATE_KEY = 'flow:content:action-state:v1';

type ContentActionState = {
  liked: string[];
  saved: string[];
};

function readActionState(): ContentActionState {
  if (typeof window === 'undefined') return { liked: [], saved: [] };
  try {
    const raw = window.localStorage.getItem(CONTENT_ACTION_STATE_KEY);
    if (!raw) return { liked: [], saved: [] };
    const parsed = JSON.parse(raw) as Partial<ContentActionState>;
    return {
      liked: Array.isArray(parsed.liked) ? parsed.liked : [],
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
    };
  } catch {
    return { liked: [], saved: [] };
  }
}

function writeActionState(liked: string[], saved: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONTENT_ACTION_STATE_KEY, JSON.stringify({ liked, saved }));
}

function ReadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5c2.8-.7 5.1-.2 8 1.7v12c-2.9-1.9-5.2-2.4-8-1.7z" />
      <path d="M20 5.5c-2.8-.7-5.1-.2-8 1.7v12c2.9-1.9 5.2-2.4 8-1.7z" />
    </svg>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-5 w-5 stroke-current ${active ? 'fill-current' : 'fill-none'}`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z" />
    </svg>
  );
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-5 w-5 stroke-current ${active ? 'fill-current' : 'fill-none'}`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2V21L12 17.4 6.5 21z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7.5 7.5 4.5-4.5 4.5 4.5" />
      <path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

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
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const impressionKeyRef = useRef<string | null>(null);
  const readDepthSentRef = useRef<Set<string>>(new Set());
  const openedAtRef = useRef<Record<string, number>>({});

  useEffect(() => {
    setData(loadBootstrap());
    const actionState = readActionState();
    setLikedIds(actionState.liked);
    setSavedIds(actionState.saved);
  }, []);

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
    if (!data || !deepening || typeof window === 'undefined' || !window.location.hash.startsWith('#content-')) return;
    const id = decodeURIComponent(window.location.hash.slice('#content-'.length));
    const item = deepening.items.find((candidate) => candidate.id === id);
    const index = deepening.items.slice(0, 3).findIndex((candidate) => candidate.id === id);
    if (!item || index < 0) return;
    openedAtRef.current[item.id] = Date.now();
    setExpandedId(item.id);
    const tracking = contentTrackingPayload(item, index, deepening, 'learn');
    void trackContentAction(data, 'content_opened', tracking).catch(() => undefined);
    window.setTimeout(() => {
      document.getElementById(`content-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [data, deepening]);

  useEffect(() => {
    if (!data || !deepening || !expandedId || typeof window === 'undefined' || !sessionIsUsable(data)) return;
    const index = visibleItems.findIndex((item) => item.id === expandedId);
    const item = index >= 0 ? visibleItems[index] : null;
    if (!item?.body) return;

    openedAtRef.current[item.id] ??= Date.now();
    const tracking = contentTrackingPayload(item, index, deepening, 'learn');
    let frame = 0;

    const emit = (action: 'content_read_25' | 'content_read_50' | 'content_read_90' | 'content_completed', depth: number, dwellMs: number) => {
      const key = `${deepening.flow_day ?? ''}:${item.id}:${action}`;
      if (readDepthSentRef.current.has(key)) return;
      readDepthSentRef.current.add(key);
      void growthAction(data, action, null, {
        ...tracking,
        read_depth: depth,
        dwell_ms: dwellMs,
      }).catch(() => {
        readDepthSentRef.current.delete(key);
      });
    };

    const evaluate = () => {
      const element = document.getElementById(`content-body-${item.id}`);
      if (!element || document.visibilityState === 'hidden') return;
      const rect = element.getBoundingClientRect();
      const height = Math.max(element.scrollHeight, rect.height, 1);
      const visibleThrough = window.innerHeight - rect.top;
      const progress = Math.max(0, Math.min(1, visibleThrough / height));
      const dwellMs = Math.max(0, Date.now() - (openedAtRef.current[item.id] ?? Date.now()));

      if (progress >= 0.25) emit('content_read_25', 25, dwellMs);
      if (progress >= 0.50) emit('content_read_50', 50, dwellMs);
      if (progress >= 0.90) emit('content_read_90', 90, dwellMs);
      if (progress >= 0.98 && dwellMs >= 5_000) emit('content_completed', 100, dwellMs);
    };

    const scheduleEvaluate = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(evaluate);
    };

    window.addEventListener('scroll', scheduleEvaluate, { passive: true });
    window.addEventListener('resize', scheduleEvaluate);
    document.addEventListener('visibilitychange', scheduleEvaluate);
    const timer = window.setInterval(evaluate, 1_000);
    window.setTimeout(evaluate, 80);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearInterval(timer);
      window.removeEventListener('scroll', scheduleEvaluate);
      window.removeEventListener('resize', scheduleEvaluate);
      document.removeEventListener('visibilitychange', scheduleEvaluate);
    };
  }, [data, deepening, expandedId, visibleItemIds]);

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
                const liked = likedIds.includes(item.id);
                const saved = savedIds.includes(item.id);
                const kindLabel = item.kind === 'video' ? 'VIDEO' : item.kind === 'audio' ? 'AUDIO' : 'ARTICLE';
                const tracking = deepening ? contentTrackingPayload(item, index, deepening, 'learn') : null;

                const toggleRead = () => {
                  if (!item.body && item.url) {
                    if (tracking) void trackContentAction(data, 'content_opened', tracking).catch(() => undefined);
                    window.open(item.url, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  if (!item.body) return;
                  const nextExpanded = !expanded;
                  if (nextExpanded) {
                    openedAtRef.current[item.id] = Date.now();
                  } else {
                    delete openedAtRef.current[item.id];
                  }
                  setExpandedId(nextExpanded ? item.id : null);
                  if (nextExpanded && tracking) {
                    void trackContentAction(data, 'content_opened', tracking).catch(() => undefined);
                  }
                };

                const toggleLike = () => {
                  setLikedIds((current) => {
                    const next = current.includes(item.id)
                      ? current.filter((id) => id !== item.id)
                      : [...current, item.id];
                    writeActionState(next, savedIds);
                    return next;
                  });
                };

                const saveItem = () => {
                  if (saved || !tracking) return;
                  setSavedIds((current) => {
                    const next = current.includes(item.id) ? current : [...current, item.id];
                    writeActionState(likedIds, next);
                    return next;
                  });
                  void trackContentAction(data, 'content_saved', tracking).catch(() => {
                    setSavedIds((current) => {
                      const next = current.filter((id) => id !== item.id);
                      writeActionState(likedIds, next);
                      return next;
                    });
                  });
                };

                const shareItem = async () => {
                  if (typeof window === 'undefined') return;
                  const shareUrl = item.url ?? `${window.location.origin}/learn#content-${encodeURIComponent(item.id)}`;
                  const shareText = item.why ?? item.summary ?? 'FLOW OSで見つけた学び';
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: item.title, text: shareText, url: shareUrl });
                    } else if (navigator.clipboard) {
                      await navigator.clipboard.writeText(`${item.title}\n${shareUrl}`);
                    }
                    setSharedId(item.id);
                    window.setTimeout(() => setSharedId((current) => current === item.id ? null : current), 1800);
                  } catch {
                    // Cancelling the native share sheet is not an error state for the user.
                  }
                };

                return (
                  <article id={`content-${item.id}`} key={item.id} className="scroll-mt-6 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">0{index + 1} / {kindLabel}</p>
                      {item.genre && <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-[#8f958e]">{item.genre}</span>}
                    </div>

                    <div className="mt-3">
                      <h2 className="font-serif text-xl font-semibold leading-8 text-[#eee8dc]">{item.title}</h2>
                      {item.why && <p className="mt-3 text-xs leading-6 text-[#8fa795]">{item.why}</p>}
                      {item.summary && <p className="mt-3 text-sm leading-7 text-[#aeb5ad]">{item.summary}</p>}
                    </div>

                    {expanded && item.body && (
                      <div id={`content-body-${item.id}`} className="mt-4 border-t border-white/10 pt-4">
                        <p className="whitespace-pre-wrap text-sm leading-8 text-[#d5d8d2]">{item.body}</p>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-4 border-t border-white/10 pt-2">
                      <button
                        type="button"
                        onClick={toggleRead}
                        disabled={!item.body && !item.url}
                        aria-label={expanded ? '記事を閉じる' : '記事を読む'}
                        className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition active:scale-95 disabled:opacity-30 ${expanded ? 'text-[#d9c18d]' : 'text-[#9aa09a]'}`}
                      >
                        <ReadIcon />
                        <span>{expanded ? '閉じる' : '読む'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={toggleLike}
                        aria-label={liked ? 'いいねを外す' : 'いいね'}
                        className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition active:scale-95 ${liked ? 'text-[#d6a0a0]' : 'text-[#9aa09a]'}`}
                      >
                        <HeartIcon active={liked} />
                        <span>{liked ? 'Liked' : 'Like'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={saveItem}
                        aria-label={saved ? '保存済み' : '保存'}
                        className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition active:scale-95 ${saved ? 'text-[#a9c0af]' : 'text-[#9aa09a]'}`}
                      >
                        <BookmarkIcon active={saved} />
                        <span>{saved ? '保存済み' : '保存'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareItem()}
                        aria-label="共有"
                        className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition active:scale-95 ${sharedId === item.id ? 'text-[#d9c18d]' : 'text-[#9aa09a]'}`}
                      >
                        <ShareIcon />
                        <span>{sharedId === item.id ? '共有済み' : '共有'}</span>
                      </button>
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
