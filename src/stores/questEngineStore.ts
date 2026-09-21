'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { CompiledQuest, CompiledQuestPlan, QuestLog } from '@/types/questCompiler';

interface QuestEngineState {
  plans: CompiledQuestPlan[];
  activePlanId: string | null;
  logs: QuestLog[];
  addPlan: (plan: CompiledQuestPlan) => void;
  setActivePlan: (planId: string | null) => void;
  completeQuest: (planId: string, quest: CompiledQuest, reflection?: string) => QuestLog;
  undoQuest: (questId: string) => void;
  clearLogs: () => void;
}

export const useQuestEngineStore = create<QuestEngineState>()(
  persist(
    (set) => ({
      plans: [],
      activePlanId: null,
      logs: [],
      addPlan: (plan) =>
        set((state) => ({
          plans: [plan, ...state.plans.filter((item) => item.id !== plan.id)].slice(0, 30),
          activePlanId: plan.id,
        })),
      setActivePlan: (planId) => set({ activePlanId: planId }),
      completeQuest: (planId, quest, reflection) => {
        const log: QuestLog = {
          id: nanoid(),
          planId,
          questId: quest.id,
          questTitle: quest.title,
          completedAt: new Date().toISOString(),
          xp: quest.xp,
          growthAxes: quest.growthAxes,
          reflection: reflection?.trim() || undefined,
        };
        set((state) => ({
          logs: [log, ...state.logs.filter((item) => item.questId !== quest.id)],
        }));
        return log;
      },
      undoQuest: (questId) =>
        set((state) => ({ logs: state.logs.filter((item) => item.questId !== questId) })),
      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: 'ace-quest-engine-v0',
      version: 1,
    },
  ),
);
