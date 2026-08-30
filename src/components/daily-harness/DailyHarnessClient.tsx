'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import { HARNESS_CARDS, PROTOTYPE_SELECTION } from '@/lib/dailyHarness';
import { drawHarnessSelection, redrawHarnessCard } from '@/lib/dailyHarnessDraw';
import {
  addHarnessRedraw,
  createHarnessDrawRecord,
  loadHarnessHistory,
  persistHarnessDraw,
  updateHarnessExecution,
  type HarnessDrawRecord,
} from '@/lib/dailyHarnessHistory';
import type { HarnessCard, HarnessDeck, HarnessSelection } from '@/types/dailyHarness';

const deckOrder: HarnessDeck[] = ['vision', 'theme', 'medium'];
const closedState: Record<HarnessDeck, boolean> = { vision: false, theme: false, medium: false };

const deckVisual: Record<HarnessDeck, { label: string; number: string; border: string; glow: string; accent: string; chip: string }> = {
  vision: {
    label: 'VISION',
    number: '01',
    border: 'border-[#d9c18d]/35',
    glow: 'shadow-[0_20px_60px_rgba(217,193,141,0.10)]',
    accent: 'text-[#e6d2a6]',
    chip: 'border-[#d9c18d]/25 bg-[#d9c18d]/10 text-[#e6d2a6]',
  },
  theme: {
    label: 'THEME',
    number: '02',
    border: 'border-[#789581]/35',
    glow: 'shadow-[0_20px_60px_rgba(120,149,129,0.10)]',
    accent: 'text-[#9fbaa7]',
    chip: 'border-[#789581]/25 bg-[#789581]/10 text-[#a9c1ae]',
  },
  medium: {
    label: 'MEDIUM',
    number: '03',
    border: 'border-[#8d91aa]/35',
    glow: 'shadow-[0_20px_60px_rgba(141,145,170,0.10)]',
    accent: 'text-[#b1b5d0]',
    chip: 'border-[#8d91aa]/25 bg-[#8d91aa]/10 text-[#b9bdd5]',
  },
};

function PlayingCard({ card, flipped, disabled, onToggle, onFocus }: {
  card: HarnessCard;
  flipped: boolean;
  disabled: boolean;
  onToggle: () => void;
  onFocus: () => void;
}) {
  const visual = deckVisual[card.deck];
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${visual.label}カードを${flipped ? '裏返す' : '表にする'}`}
      onClick={() => { onFocus(); onToggle(); }}
      className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9c18d]/60 disabled:cursor-default"
      style={{ perspective: 1000 }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.48, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative aspect-[5/7] w-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className={`absolute inset-0 overflow-hidden rounded-[18px] border ${visual.border} ${visual.glow} bg-[#10120f] p-3 sm:rounded-[22px] sm:p-4`} style={{ backfaceVisibility: 'hidden' }}>
          <div className="absolute inset-[7px] rounded-[14px] border border-white/[0.05] sm:inset-[9px] sm:rounded-[17px]" />
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.10)_0,transparent_2px)] [background-size:13px_13px]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-1">
              <span className={`text-[8px] font-bold tracking-[0.18em] sm:text-[9px] ${visual.accent}`}>{visual.label}</span>
              <span className="font-serif text-[11px] text-white/35 sm:text-xs">{visual.number}</span>
            </div>
            <div className="text-center">
              <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border ${visual.border} bg-black/20 font-serif text-lg sm:h-12 sm:w-12 sm:text-xl ${visual.accent}`}>
                {visual.label.slice(0, 1)}
              </div>
              <p className="mt-3 text-[8px] uppercase tracking-[0.18em] text-white/35 sm:text-[9px]">{disabled ? 'draw first' : 'tap to reveal'}</p>
            </div>
            <div className="flex items-end justify-between">
              <span className="font-serif text-[11px] text-white/25 sm:text-xs">ACE</span>
              <span className={`text-[8px] font-bold tracking-[0.16em] sm:text-[9px] ${visual.accent}`}>DAILY</span>
            </div>
          </div>
        </div>

        <div className={`absolute inset-0 overflow-hidden rounded-[18px] border ${visual.border} ${visual.glow} bg-[#11130f] p-3 sm:rounded-[22px] sm:p-4`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-1">
              <span className={`text-[8px] font-bold tracking-[0.18em] sm:text-[9px] ${visual.accent}`}>{visual.label}</span>
              <span className="font-serif text-[11px] text-white/35 sm:text-xs">{visual.number}</span>
            </div>
            <div className="my-auto py-2">
              <h2 className="font-serif text-[13px] font-semibold leading-[1.35] text-[#eee8dc] sm:text-base">{card.title}</h2>
              <p className="mt-2 line-clamp-4 text-[9px] leading-[1.55] text-[#8e948d] sm:text-[11px]">{card.subtitle}</p>
            </div>
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/25 sm:text-[9px]">ACE DAILY HARNESS</p>
          </div>
        </div>
      </motion.div>
    </button>
  );
}

function cardTitle(id: string) {
  return HARNESS_CARDS.find((card) => card.id === id)?.title ?? id;
}

export default function DailyHarnessClient() {
  const [selection, setSelection] = useState<HarnessSelection>(PROTOTYPE_SELECTION);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [flipped, setFlipped] = useState<Record<HarnessDeck, boolean>>(closedState);
  const [focusedDeck, setFocusedDeck] = useState<HarnessDeck>('theme');
  const [redrawDeck, setRedrawDeck] = useState<HarnessDeck | null>(null);
  const [redrawReason, setRedrawReason] = useState('');
  const [currentDraw, setCurrentDraw] = useState<HarnessDrawRecord | null>(null);
  const [intentionDraft, setIntentionDraft] = useState('');
  const [history, setHistory] = useState<HarnessDrawRecord[]>([]);

  useEffect(() => { setHistory(loadHarnessHistory()); }, []);

  const focusedCard = selection[focusedDeck];
  const focusedRevealed = hasDrawn && flipped[focusedDeck];
  const allOpen = deckOrder.every((deck) => flipped[deck]);

  const refreshHistory = () => setHistory(loadHarnessHistory());

  const drawToday = () => {
    const nextSelection = drawHarnessSelection();
    const record = createHarnessDrawRecord(nextSelection);
    persistHarnessDraw(record);
    setSelection(nextSelection);
    setCurrentDraw(record);
    setIntentionDraft('');
    setFlipped(closedState);
    setFocusedDeck('theme');
    setHasDrawn(true);
    setRedrawDeck(null);
    setRedrawReason('');
    refreshHistory();
  };

  const toggleDeck = (deck: HarnessDeck) => {
    setFlipped((current) => ({ ...current, [deck]: !current[deck] }));
    if (redrawDeck && redrawDeck !== deck) {
      setRedrawDeck(null);
      setRedrawReason('');
    }
  };

  const hideAll = () => {
    setFlipped(closedState);
    setFocusedDeck('theme');
    setRedrawDeck(null);
    setRedrawReason('');
  };

  const startRedraw = () => { setRedrawDeck(focusedDeck); setRedrawReason(''); };
  const cancelRedraw = () => { setRedrawDeck(null); setRedrawReason(''); };

  const confirmRedraw = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = redrawReason.trim();
    if (!redrawDeck || !reason || !currentDraw) return;

    const previous = selection[redrawDeck];
    const next = redrawHarnessCard(redrawDeck, previous.id);
    const nextSelection: HarnessSelection = { ...selection, [redrawDeck]: next };
    const updatedRecord = addHarnessRedraw(currentDraw, nextSelection, {
      deck: redrawDeck,
      fromCardId: previous.id,
      toCardId: next.id,
      reason,
      redrawnAt: new Date().toISOString(),
    });

    persistHarnessDraw(updatedRecord);
    setSelection(nextSelection);
    setCurrentDraw(updatedRecord);
    setFlipped((current) => ({ ...current, [redrawDeck]: false }));
    setFocusedDeck(redrawDeck);
    setRedrawDeck(null);
    setRedrawReason('');
    refreshHistory();
  };

  const saveIntention = () => {
    if (!currentDraw) return;
    const updated = updateHarnessExecution(currentDraw, { intention: intentionDraft.trim() });
    persistHarnessDraw(updated);
    setCurrentDraw(updated);
    refreshHistory();
  };

  const toggleCompleted = () => {
    if (!currentDraw) return;
    const updated = updateHarnessExecution(currentDraw, { completed: !currentDraw.completed });
    persistHarnessDraw(updated);
    setCurrentDraw(updated);
    refreshHistory();
  };

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-7 text-[#e9e1d1] sm:px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-44 -top-52 h-[480px] w-[480px] rounded-full bg-[#789581]/10 blur-[130px]" />
        <div className="absolute -right-40 top-40 h-[440px] w-[440px] rounded-full bg-[#c8ab72]/[0.06] blur-[125px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl">
        <header className="mb-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">ACE · DAILY HARNESS</p>
              <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">今日の3枚。</h1>
            </div>
            <Link href="/today" className="rounded-full border border-[#c8ab72]/15 px-3 py-1.5 text-[10px] font-semibold text-[#8c938c]">Todayへ</Link>
          </div>
          <p className="mt-4 max-w-lg text-sm leading-7 text-[#8f958e]">どこへ向かうか。何を扱うか。どこで形にするか。3枚を引いて、今日の練習メニューを観察する。</p>
        </header>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#5f675f]">DH-06 · LOCAL LOOP</p>
            <p className="text-[9px] text-[#555c56]">draw → notice → act → log</p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {deckOrder.map((deck) => {
              const card = selection[deck];
              return (
                <PlayingCard
                  key={`${deck}-${card.id}`}
                  card={card}
                  flipped={flipped[deck]}
                  disabled={!hasDrawn}
                  onToggle={() => toggleDeck(deck)}
                  onFocus={() => setFocusedDeck(deck)}
                />
              );
            })}
          </div>

          {!hasDrawn ? (
            <button type="button" onClick={drawToday} className="mt-5 w-full rounded-full bg-[#d9c18d] px-4 py-3.5 text-sm font-semibold text-[#171813]">今日の3枚を引く</button>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={allOpen ? hideAll : () => setFlipped({ vision: true, theme: true, medium: true })} className="rounded-full bg-[#d9c18d] px-4 py-3 text-sm font-semibold text-[#171813]">{allOpen ? '3枚を伏せる' : '3枚をめくる'}</button>
              <button type="button" onClick={hideAll} className="rounded-full border border-[#c8ab72]/20 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-[#b8b1a3]">伏せる</button>
            </div>
          )}
        </section>

        <section className="mt-7 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[9px] font-bold tracking-[0.16em] ${deckVisual[focusedDeck].chip}`}>{deckVisual[focusedDeck].label}</span>
            <span className="text-[10px] text-[#626963]">{!hasDrawn ? 'まず今日の3枚を引く' : focusedRevealed ? 'この反応も練習メニューの一部' : 'カードをめくると問いが現れます'}</span>
          </div>

          {!hasDrawn ? (
            <><h2 className="mt-4 font-serif text-2xl font-semibold">まだ見ない。まず引く。</h2><p className="mt-3 text-sm leading-7 text-[#9ca097]">Vision / Theme / Medium は、それぞれactiveカードとbaseWeightから独立して抽選されます。</p></>
          ) : focusedRevealed ? (
            <>
              <h2 className="mt-4 font-serif text-2xl font-semibold">{focusedCard.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#9ca097]">{focusedCard.question}</p>
              <div className="mt-5 flex flex-wrap gap-2">{focusedCard.ignitionWords.map((word) => <span key={word} className="rounded-full border border-white/[0.06] bg-black/10 px-3 py-1.5 text-[10px] text-[#7e857e]">{word}</span>)}</div>
              {!redrawDeck && <button type="button" onClick={startRedraw} className="mt-5 rounded-full border border-[#789581]/25 bg-[#789581]/10 px-4 py-2.5 text-xs font-semibold text-[#a9c1ae]">このカードを引き直したい</button>}
            </>
          ) : (
            <><h2 className="mt-4 font-serif text-2xl font-semibold">まだ伏せておく。</h2><p className="mt-3 text-sm leading-7 text-[#9ca097]">先に意味を探さず、カードをめくった瞬間の反応から観察する。</p></>
          )}
        </section>

        {redrawDeck && (
          <form onSubmit={confirmRedraw} className="mt-5 rounded-[24px] border border-[#789581]/25 bg-[#789581]/[0.07] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9bb2a1]">REDRAW · NOTICE FIRST</p>
            <h3 className="mt-2 font-serif text-xl font-semibold">なぜ「違う」と感じた？</h3>
            <p className="mt-2 text-xs leading-6 text-[#8f978f]">正しい理由を書く必要はありません。今の反応を1行残してから、{deckVisual[redrawDeck].label}だけ引き直します。</p>
            <textarea value={redrawReason} onChange={(event) => setRedrawReason(event.target.value)} rows={3} autoFocus placeholder="例：今日は発信より、まず体系を整理したい感覚がある" className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-[#e9e1d1] outline-none placeholder:text-[#555d56] focus:border-[#789581]/50" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="submit" disabled={!redrawReason.trim()} className="rounded-full bg-[#9fbaa7] px-4 py-3 text-sm font-semibold text-[#10140f] disabled:cursor-not-allowed disabled:opacity-35">理由を残して引き直す</button>
              <button type="button" onClick={cancelRedraw} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-[#9aa099]">今のカードに戻る</button>
            </div>
          </form>
        )}

        {currentDraw && (
          <section className="mt-5 rounded-[24px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8ab72]">TODAY · ACTION</p>
            <label className="mt-4 block text-xs font-semibold text-[#a7ada6]" htmlFor="harness-intention">この3枚で何を出す？</label>
            <input
              id="harness-intention"
              value={intentionDraft}
              onChange={(event) => setIntentionDraft(event.target.value)}
              onBlur={saveIntention}
              placeholder="1行で決める"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[#e9e1d1] outline-none placeholder:text-[#555d56] focus:border-[#c8ab72]/40"
            />
            <button type="button" onClick={toggleCompleted} className={`mt-4 w-full rounded-full px-4 py-3 text-sm font-semibold ${currentDraw.completed ? 'bg-[#789581] text-[#0e120f]' : 'border border-[#789581]/25 bg-[#789581]/10 text-[#a9c1ae]'}`}>
              {currentDraw.completed ? '✓ 今日の練習 完了' : '完了したらチェック'}
            </button>
          </section>
        )}

        <section className="mt-5 rounded-[24px] border border-[#789581]/20 bg-[#789581]/[0.05] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8aa391]">Layer 0 rule</p>
            {currentDraw && currentDraw.redrawCount > 0 && <span className="text-[10px] text-[#789581]">引き直し理由 {currentDraw.redrawCount}件</span>}
          </div>
          <p className="mt-2 text-xs leading-6 text-[#929a93]">引き直しそのものを禁止しない。ただし、その前に起きた違和感を観測する。選んだカードだけでなく、避けたカードと理由を自己認知データにする。</p>
          {currentDraw && currentDraw.redraws.length > 0 && <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">{currentDraw.redraws.map((item, index) => <p key={`${item.deck}-${index}`} className="text-[11px] leading-5 text-[#788079]">{deckVisual[item.deck].label}：{item.reason}</p>)}</div>}
        </section>

        {history.length > 0 && (
          <section className="mt-7">
            <div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#5f675f]">RECENT DRAWS</p><h2 className="mt-1 font-serif text-xl font-semibold">直近の練習ログ</h2></div><span className="text-[10px] text-[#555c56]">localStorage</span></div>
            <div className="space-y-3">
              {history.slice(0, 5).map((item) => (
                <article key={item.id} className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-[#b4b9b2]">{cardTitle(item.visionId)} × {cardTitle(item.themeId)} × {cardTitle(item.mediumId)}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] ${item.completed ? 'bg-[#789581]/15 text-[#9fbaa7]' : 'bg-white/[0.04] text-[#666d67]'}`}>{item.completed ? 'DONE' : 'OPEN'}</span></div>
                  {item.intention && <p className="mt-2 text-[11px] leading-5 text-[#7f867f]">→ {item.intention}</p>}
                  <div className="mt-2 flex gap-3 text-[9px] text-[#555c56]"><span>{new Date(item.drawnAt).toLocaleString('ja-JP')}</span><span>redraw {item.redrawCount}</span></div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <PwaNav />
    </main>
  );
}
