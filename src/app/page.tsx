'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import GameBoard from '@/components/board/GameBoard';
import QuestPanel from '@/components/quest/QuestPanel';
import QuickAdd from '@/components/input/QuickAdd';
import PlayerStatus from '@/components/player/PlayerStatus';
import LevelUpModal from '@/components/player/LevelUpModal';
import { useQuestStore } from '@/stores/questStore';
import { APP_ROUTES } from '@/lib/appRoutes';
import {
  SEED_VISIONS,
  SEED_MILESTONES,
  SEED_QUESTS,
  SEED_TASKS,
} from '@/lib/seed';

export default function HomePage() {
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [handledDeepLink, setHandledDeepLink] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<{ show: boolean; level: number }>({ show: false, level: 1 });
  const { visions, quests } = useQuestStore();

  useEffect(() => {
    if (visions.length === 0) {
      useQuestStore.setState({
        visions: SEED_VISIONS,
        milestones: SEED_MILESTONES,
        quests: SEED_QUESTS,
        tasks: SEED_TASKS,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (handledDeepLink || quests.length === 0) return;
    const requested = new URLSearchParams(window.location.search).get('quest');
    if (requested && quests.some((quest) => quest.id === requested)) {
      setSelectedQuestId(requested);
    }
    setHandledDeepLink(true);
  }, [quests, handledDeepLink]);

  const activeCount = quests.filter((q) => q.status === 'in_progress' || q.status === 'available').length;
  const doneCount = quests.filter((q) => q.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#090a08] text-[#e9e1d1] selection:bg-[#c8ab72]/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-56 h-[560px] w-[560px] rounded-full bg-[#789581]/10 blur-[135px]" />
        <div className="absolute -right-40 top-40 h-[460px] w-[460px] rounded-full bg-[#c8ab72]/[0.055] blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(233,225,209,.14) 1px, transparent 0)', backgroundSize: '34px 34px' }} />
      </div>

      <header className="sticky top-0 z-40 border-b border-[#c8ab72]/10 bg-[#090a08]/82 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-[#c8ab72]/35 bg-[#c8ab72]/[0.055] font-serif text-sm text-[#dfc68f] shadow-[inset_0_0_20px_rgba(200,171,114,.05)]">行</div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold tracking-[0.22em] text-[#c8ab72]">ACE</span>
                <span className="font-serif text-base font-semibold text-[#eee8dc]">Quest Board</span>
              </div>
              <p className="mt-0.5 text-[9px] font-medium tracking-[0.12em] text-[#687069]">知を、進みたくなる道へ。</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <span className="hidden rounded-full border border-white/[0.06] bg-white/[0.018] px-3 py-2 text-[10px] font-semibold text-[#737a73] xl:inline-flex">{visions.length} Visions · {doneCount} Done</span>
            <Link href={APP_ROUTES.knowledge} className="hidden rounded-full border border-[#c8ab72]/16 bg-[#c8ab72]/[0.035] px-3.5 py-2 text-[10px] font-semibold tracking-wide text-[#bba67d] transition hover:-translate-y-0.5 hover:border-[#c8ab72]/35 hover:text-[#e0c994] sm:inline-flex">
              知 · Knowledge
            </Link>
            <Link href={APP_ROUTES.wantTo} className="rounded-full border border-[#789581]/30 bg-[#789581]/10 px-4 py-2 text-[10px] font-bold tracking-wide text-[#c9d5ca] transition hover:-translate-y-0.5 hover:bg-[#789581]/15">
              望 · Want to
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1440px] px-5 pb-24 pt-8 md:px-8 md:pt-10">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_460px] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 border-l border-[#c8ab72]/45 pl-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#777f77]">
              Action layer · 行
            </div>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.16] tracking-[-0.025em] text-[#eee8dc] md:text-6xl">
              人生を、<span className="bg-gradient-to-r from-[#d9c18d] via-[#aaba9f] to-[#789581] bg-clip-text text-transparent">歩ける思想</span>にする。
            </h1>
            <p className="mt-5 max-w-2xl font-serif text-sm leading-8 text-[#8b9189] md:text-[15px]">
              Knowledgeで意味を知り、Want toで方向を定め、Questで現実を一歩進める。
            </p>
          </div>

          <div className="rounded-[22px] border border-[#c8ab72]/10 bg-white/[0.022] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <PlayerStatus />
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#c8ab72]/10 pt-4">
              <div><div className="text-[9px] uppercase tracking-[0.18em] text-[#5f665f]">Vision</div><div className="mt-1 font-serif text-xl font-semibold">{visions.length}</div></div>
              <div><div className="text-[9px] uppercase tracking-[0.18em] text-[#5f665f]">Active</div><div className="mt-1 font-serif text-xl font-semibold">{activeCount}</div></div>
              <div><div className="text-[9px] uppercase tracking-[0.18em] text-[#5f665f]">Done</div><div className="mt-1 font-serif text-xl font-semibold">{doneCount}</div></div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#5d655e]">Your paths</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-[#e8e2d7]">望みから、次の一手へ</h2>
            </div>
            <p className="hidden text-xs text-[#626963] sm:block">カードを押すと詳細を開けます</p>
          </div>
          <GameBoard onQuestClick={(questId) => setSelectedQuestId(questId)} />
        </section>
      </main>

      <QuestPanel questId={selectedQuestId} onClose={() => setSelectedQuestId(null)} />
      <QuickAdd />
      <LevelUpModal show={levelUpInfo.show} level={levelUpInfo.level} onClose={() => setLevelUpInfo({ show: false, level: 1 })} />
    </div>
  );
}
