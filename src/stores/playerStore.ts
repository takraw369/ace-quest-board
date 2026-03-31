'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player } from '@/types/quest';
import { getLevelInfo } from '@/lib/xp';

interface PlayerState extends Player {
  addXp: (amount: number) => { leveledUp: boolean; newLevel: number };
  setPosition: (visionId: string, milestoneId: string, questId: string) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
}

const DEFAULT_PLAYER: Player = {
  level: 1,
  totalXp: 0,
  currentPosition: { visionId: '', milestoneId: '', questId: '' },
  streakDays: 0,
  title: '見習いクエスター',
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PLAYER,

      addXp: (amount) => {
        const prev = get();
        const newTotal = prev.totalXp + amount;
        const info = getLevelInfo(newTotal);
        const leveledUp = info.level > prev.level;
        set({ totalXp: newTotal, level: info.level, title: info.title });
        return { leveledUp, newLevel: info.level };
      },

      setPosition: (visionId, milestoneId, questId) =>
        set({ currentPosition: { visionId, milestoneId, questId } }),

      incrementStreak: () => set((s) => ({ streakDays: s.streakDays + 1 })),
      resetStreak: () => set({ streakDays: 0 }),
    }),
    { name: 'ace-player-store' }
  )
);
