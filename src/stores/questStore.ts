'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Vision, Milestone, Quest, Task } from '@/types/quest';

interface QuestState {
  visions: Vision[];
  milestones: Milestone[];
  quests: Quest[];
  tasks: Task[];

  // Vision CRUD
  addVision: (data: Omit<Vision, 'id' | 'createdAt'>) => Vision;
  updateVision: (id: string, data: Partial<Vision>) => void;
  deleteVision: (id: string) => void;

  // Milestone CRUD
  addMilestone: (data: Omit<Milestone, 'id'>) => Milestone;
  updateMilestone: (id: string, data: Partial<Milestone>) => void;
  deleteMilestone: (id: string) => void;

  // Quest CRUD
  addQuest: (data: Omit<Quest, 'id'>) => Quest;
  updateQuest: (id: string, data: Partial<Quest>) => void;
  deleteQuest: (id: string) => void;

  // Task CRUD
  addTask: (data: Omit<Task, 'id'>) => Task;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // Computed helpers
  getMilestonesForVision: (visionId: string) => Milestone[];
  getQuestsForMilestone: (milestoneId: string) => Quest[];
  getTasksForQuest: (questId: string) => Task[];
  getQuestProgress: (questId: string) => number;
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      visions: [],
      milestones: [],
      quests: [],
      tasks: [],

      addVision: (data) => {
        const vision: Vision = { ...data, id: nanoid(), createdAt: new Date().toISOString() };
        set((s) => ({ visions: [...s.visions, vision] }));
        return vision;
      },
      updateVision: (id, data) =>
        set((s) => ({ visions: s.visions.map((v) => (v.id === id ? { ...v, ...data } : v)) })),
      deleteVision: (id) =>
        set((s) => ({ visions: s.visions.filter((v) => v.id !== id) })),

      addMilestone: (data) => {
        const milestone: Milestone = { ...data, id: nanoid() };
        set((s) => ({ milestones: [...s.milestones, milestone] }));
        return milestone;
      },
      updateMilestone: (id, data) =>
        set((s) => ({ milestones: s.milestones.map((m) => (m.id === id ? { ...m, ...data } : m)) })),
      deleteMilestone: (id) =>
        set((s) => ({ milestones: s.milestones.filter((m) => m.id !== id) })),

      addQuest: (data) => {
        const quest: Quest = { ...data, id: nanoid() };
        set((s) => ({ quests: [...s.quests, quest] }));
        return quest;
      },
      updateQuest: (id, data) =>
        set((s) => ({ quests: s.quests.map((q) => (q.id === id ? { ...q, ...data } : q)) })),
      deleteQuest: (id) =>
        set((s) => ({ quests: s.quests.filter((q) => q.id !== id) })),

      addTask: (data) => {
        const task: Task = { ...data, id: nanoid() };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return task;
      },
      updateTask: (id, data) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)) })),
      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      getMilestonesForVision: (visionId) =>
        get().milestones.filter((m) => m.visionId === visionId).sort((a, b) => a.order - b.order),
      getQuestsForMilestone: (milestoneId) =>
        get().quests.filter((q) => q.milestoneId === milestoneId).sort((a, b) => {
          const order = { completed: 0, in_progress: 1, available: 2, locked: 3 };
          return order[a.status] - order[b.status];
        }),
      getTasksForQuest: (questId) =>
        get().tasks.filter((t) => t.questId === questId).sort((a, b) => a.order - b.order),
      getQuestProgress: (questId) => {
        const tasks = get().tasks.filter((t) => t.questId === questId);
        if (tasks.length === 0) return 0;
        const done = tasks.filter((t) => t.status === 'done').length;
        return Math.round((done / tasks.length) * 100);
      },
    }),
    { name: 'ace-quest-store' }
  )
);
