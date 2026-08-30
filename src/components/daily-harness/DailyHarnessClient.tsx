'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import { PROTOTYPE_SELECTION } from '@/lib/dailyHarness';
import { drawHarnessSelection } from '@/lib/dailyHarnessDraw';
import type { HarnessCard, HarnessDeck, HarnessSelection } from '@/types/dailyHarness';

const deckOrder: HarnessDeck[] = ['vision', 'theme', 'medium'];

const deckVisual: Record<
  HarnessDeck,
  {
    label: string;
    number: string;
    border: string;
    glow: string;
    accent: string;
    chip: string;
  }
> = {
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

function PlayingCard({
  card,
  flipped,
  disabled,
  onToggle,
  onFocus,
}: {
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
      onClick={() => {
        onFocus();
        onToggle();
      }}
      className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9c18d]/60 disabled:cursor-default"
      style={{ perspective: 1000 }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.48, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative aspect-[5/7] w-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className={`absolute inset-0 overflow-hidden rounded-[18px] border ${visual.border} ${visual.glow} bg-[#10120f] p-3 sm:rounded-[22px] sm:p-4`}
          style={{ backfaceVisibility: 'hidden' }}
        >
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
              <p className="mt-3 text-[8px] uppercase tracking-[0.18em] text-white/35 sm:text-[9px]">
                {disabled ? 'draw first' : 'tap to reveal'}
              </p>
            </div>
            <div className="flex items-end justify-between">
              <span className="font-serif text-[11px] text-white/25 sm:text-xs">ACE</span>
              <span className={`text-[8px] font-bold tracking-[0.16em] sm:text-[9px] ${visual.accent}`}>DAILY</span>
            </div>
          </div>
        </div>

        <div
          className={`absolute inset-0 overflow-hidden rounded-[18px] border ${visual.border} ${visual.glow} bg-[#11130f] p-3 sm:rounded-[22px] sm:p-4`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
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

const closedState: Record<HarnessDeck, boolean> = {
  vision: false,
  theme: false,
  medium: false,
};

export default function DailyHarnessClient() {
  const [selection, setSelection] = useState<HarnessSelection>(PROTOTYPE_SELECTION);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [flipped, setFlipped] = useState<Record<HarnessDeck, boolean>>(closedState);
  const [focusedDeck, setFocusedDeck] = useState<HarnessDeck>('theme');

  const focusedCard = selection[focusedDeck];
  const allOpen = deckOrder.every((deck) => flipped[deck]);

  const drawToday = () => {
    setSelection(drawHarnessSelection());
    setFlipped(closedState);
    setFocusedDeck('theme');
    setHasDrawn(true);
  };

  const toggleDeck = (deck: HarnessDeck) => {
    setFlipped((current) => ({ ...current, [deck]: !current[deck] }));
  };

  const revealAll = () => {
    setFlipped({ vision: true, theme: true, medium: true });
  };

  const hideAll = () => {
    setFlipped(closedState);
    setFocusedDeck('theme');
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
            <Link href="/today" className="rounded-full border border-[#c8ab72]/15 px-3 py-1.5 text-[10px] font-semibold text-[#8c938c]">
              Todayへ
            </Link>
          </div>
          <p className="mt-4 max-w-lg text-sm leading-7 text-[#8f958e]">
            どこへ向かうか。何を扱うか。どこで形にするか。3枚を引いて、今日の練習メニューを観察する。
          </p>
        </header>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#5f675f]">DH-03 · WEIGHTED DRAW</p>
            <p className="text-[9px] text-[#555c56]">active × baseWeight</p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {deckOrder.map((deck) => {
              const card = selection[deck];
              return (
                <PlayingCard
                  key={`${card.id}-${hasDrawn ? 'drawn' : 'idle'}`}
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
            <button
              type="button"
              onClick={drawToday}
              className="mt-5 w-full rounded-full bg-[#d9c18d] px-4 py-3.5 text-sm font-semibold text-[#171813]"
            >
              今日の3枚を引く
            </button>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={allOpen ? hideAll : revealAll}
                className="rounded-full bg-[#d9c18d] px-4 py-3 text-sm font-semibold text-[#171813]"
              >
                {allOpen ? '3枚を伏せる' : '3枚をめくる'}
              </button>
              <button
                type="button"
                onClick={hideAll}
                className="rounded-full border border-[#c8ab72]/20 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-[#b8b1a3]"
              >
                伏せる
              </button>
            </div>
          )}
        </section>

        <section className="mt-7 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[9px] font-bold tracking-[0.16em] ${deckVisual[focusedDeck].chip}`}>
              {deckVisual[focusedDeck].label}
            </span>
            <span className="text-[10px] text-[#626963]">
              {hasDrawn ? 'カードをタップすると、この問いが切り替わります' : 'まず今日の3枚を引く'}
            </span>
          </div>
          <h2 className="mt-4 font-serif text-2xl font-semibold">{hasDrawn ? focusedCard.title : 'まだ見ない。まず引く。'}</h2>
          <p className="mt-3 text-sm leading-7 text-[#9ca097]">
            {hasDrawn ? focusedCard.question : 'Vision / Theme / Medium は、それぞれ現在のactiveカードとbaseWeightから独立して抽選されます。'}
          </p>
          {hasDrawn && (
            <div className="mt-5 flex flex-wrap gap-2">
              {focusedCard.ignitionWords.map((word) => (
                <span key={word} className="rounded-full border border-white/[0.06] bg-black/10 px-3 py-1.5 text-[10px] text-[#7e857e]">
                  {word}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-[24px] border border-[#789581]/20 bg-[#789581]/[0.05] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8aa391]">Layer 0 rule</p>
          <p className="mt-2 text-xs leading-6 text-[#929a93]">
            この段階では自由な引き直しを入れない。次のDH-05で「違う」と感じた理由を先に言語化してから引き直せるようにし、その反応自体を自己認知データにする。
          </p>
        </section>
      </div>

      <PwaNav />
    </main>
  );
}
