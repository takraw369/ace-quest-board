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
  const [levelUpInfo, setLevelUpInfo] = useState<{ show: boolean; level: number }>({
    show: false,
    level: 1,
  });

  const { visions } = useQuestStore();

  // Seed data on first load (empty store)
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

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1e] text-white overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-tight text-indigo-400">ACE</span>
          <span className="text-lg font-semibold text-white">Quest Board</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/want-to" className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-200 transition hover:bg-indigo-500/20">
            ✦ Want to Master
          </Link>
          <div className="hidden text-xs text-slate-600 sm:block">Phase 1 · MVP</div>
        </div>
      </header>

      {/* Player status bar */}
      <PlayerStatus />

      {/* Main board area */}
      <main className="flex-1 overflow-hidden relative">
        <GameBoard onQuestClick={(questId) => setSelectedQuestId(questId)} />
      </main>

      {/* Quest detail panel */}
      <QuestPanel
        questId={selectedQuestId}
        onClose={() => setSelectedQuestId(null)}
      />

      {/* FAB */}
      <QuickAdd />

      {/* Level up modal */}
      <LevelUpModal
        show={levelUpInfo.show}
        level={levelUpInfo.level}
        onClose={() => setLevelUpInfo({ show: false, level: 1 })}
      />
    </div>
  );
}
