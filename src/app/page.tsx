'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import GameBoard from '@/components/board/GameBoard';
import QuestPanel from '@/components/quest/QuestPanel';
import QuickAdd from '@/components/input/QuickAdd';
import PlayerStatus from '@/components/player/PlayerStatus';
import LevelUpModal from '@/components/player/LevelUpModal';
import { useQuestStore } from '@/stores/questStore';
import {
  SEED_VISIONS,
  SEED_MILESTONES,
  SEED_QUESTS,
  SEED_TASKS,
} from '@/lib/seed';

export default function HomePage() {
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
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

  const activeCount = quests.filter((q) => q.status === 'in_progress' || q.status === 'available').length;
  const doneCount = quests.filter((q) => q.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#080b14] text-white selection:bg-indigo-400/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-56 h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -right-40 top-40 h-[420px] w-[420px] rounded-full bg-cyan-400/[0.055] blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,.16) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#080b14]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-300/15 bg-indigo-400/10 text-sm font-black tracking-tight text-indigo-200">A</div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-black tracking-[0.18em] text-indigo-300">ACE</span>
                <span className="text-base font-bold text-white">Quest Board</span>
              </div>
              <p className="mt-0.5 text-[10px] font-medium tracking-wide text-slate-500">TURN YOUR WANT TO INTO A PATH</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <span className="hidden rounded-full border border-white/8 bg-white/[0.025] px-3 py-2 text-[11px] font-semibold text-slate-500 md:inline-flex">{visions.length} Visions · {doneCount} Done</span>
            <Link href="/want-to" className="rounded-full border border-indigo-300/20 bg-indigo-400/10 px-4 py-2 text-xs font-bold text-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-400/15">
              ✦ Want to Master
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1440px] px-5 pb-24 pt-8 md:px-8 md:pt-10">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_460px] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Life game · Phase 1
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.035em] text-white md:text-6xl">
              人生を、<span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">進みたくなる地図</span>にする。
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
              Visionを眺めるだけで終わらせず、今できるQuestへ落とす。達成したら次の道がひらく。
            </p>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.035] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            <PlayerStatus />
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/8 pt-4">
              <div><div className="text-[10px] uppercase tracking-[0.18em] text-slate-600">Vision</div><div className="mt-1 text-xl font-black">{visions.length}</div></div>
              <div><div className="text-[10px] uppercase tracking-[0.18em] text-slate-600">Active</div><div className="mt-1 text-xl font-black">{activeCount}</div></div>
              <div><div className="text-[10px] uppercase tracking-[0.18em] text-slate-600">Done</div><div className="mt-1 text-xl font-black">{doneCount}</div></div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Your paths</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">VisionからQuestへ</h2>
            </div>
            <p className="hidden text-xs text-slate-600 sm:block">カードを押すと詳細を開けます</p>
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
