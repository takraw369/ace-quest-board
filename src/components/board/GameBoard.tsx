'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuestStore } from '@/stores/questStore';
import { usePlayerStore } from '@/stores/playerStore';

interface Props {
  onQuestClick: (questId: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  locked: 'LOCKED',
  available: 'READY',
  in_progress: 'ACTIVE',
  completed: 'DONE',
};

const STATUS_CLASS: Record<string, string> = {
  locked: 'border-white/8 bg-white/[0.025] text-slate-500',
  available: 'border-white/12 bg-white/[0.045] text-slate-200',
  in_progress: 'border-white/20 bg-white/[0.07] text-white shadow-[0_12px_40px_rgba(0,0,0,0.22)]',
  completed: 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-100',
};

export default function GameBoard({ onQuestClick }: Props) {
  const { visions, milestones, quests } = useQuestStore();
  const { currentPosition } = usePlayerStore();

  const lanes = useMemo(() => visions.map((vision) => {
    const laneMilestones = milestones
      .filter((m) => m.visionId === vision.id)
      .sort((a, b) => a.order - b.order);
    const laneQuests = laneMilestones.flatMap((m) => quests
      .filter((q) => q.milestoneId === m.id)
      .map((q) => ({ ...q, milestoneTitle: m.title, milestoneStatus: m.status }))
    );
    const completed = laneQuests.filter((q) => q.status === 'completed').length;
    const progress = laneQuests.length ? Math.round((completed / laneQuests.length) * 100) : 0;
    return { vision, milestones: laneMilestones, quests: laneQuests, completed, progress };
  }), [visions, milestones, quests]);

  if (!visions.length) {
    return <div className="grid min-h-[420px] place-items-center text-slate-500">まだQuestがありません。</div>;
  }

  return (
    <div className="space-y-5 pb-28">
      {lanes.map(({ vision, milestones: laneMilestones, quests: laneQuests, completed, progress }, index) => (
        <motion.section
          key={vision.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          className="overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl"
        >
          <div className="grid gap-5 p-5 md:grid-cols-[240px_1fr] md:p-6">
            <aside className="flex flex-col justify-between rounded-[22px] border border-white/8 bg-black/15 p-5">
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <div
                    className="grid h-12 w-12 place-items-center rounded-2xl text-xl shadow-lg"
                    style={{ backgroundColor: `${vision.color}20`, color: vision.color, boxShadow: `0 10px 30px ${vision.color}18` }}
                  >
                    {vision.icon || '✦'}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Vision {String(index + 1).padStart(2, '0')}</span>
                </div>
                <h2 className="text-xl font-black leading-tight text-white">{vision.title}</h2>
                {vision.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{vision.description}</p>}
              </div>

              <div className="mt-7">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400">Progress</span>
                  <span className="font-black text-white">{progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: vision.color }} />
                </div>
                <div className="mt-3 text-xs text-slate-500">{completed} / {laneQuests.length} quests completed</div>
              </div>
            </aside>

            <div className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Quest path</p>
                  <p className="mt-1 text-sm text-slate-400">小さな達成をつないで、Visionへ進む。</p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  {laneMilestones.map((m) => (
                    <span key={m.id} className="rounded-full border border-white/8 bg-black/10 px-3 py-1.5 text-[10px] font-semibold text-slate-400">{m.title}</span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {laneQuests.map((quest, qIndex) => {
                  const active = currentPosition.questId === quest.id || quest.status === 'in_progress';
                  return (
                    <motion.button
                      key={quest.id}
                      type="button"
                      whileHover={quest.status !== 'locked' ? { y: -3 } : undefined}
                      onClick={() => quest.status !== 'locked' && onQuestClick(quest.id)}
                      className={`group relative min-h-[154px] overflow-hidden rounded-[20px] border p-4 text-left transition ${STATUS_CLASS[quest.status]} ${quest.status === 'locked' ? 'cursor-not-allowed' : 'cursor-pointer hover:border-white/20 hover:bg-white/[0.065]'}`}
                    >
                      {active && <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: vision.color }} />}
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-black/20 text-xs font-black text-slate-300">{String(qIndex + 1).padStart(2, '0')}</span>
                        <span className="rounded-full border border-white/8 bg-black/15 px-2.5 py-1 text-[9px] font-black tracking-[0.16em] text-slate-400">{STATUS_LABEL[quest.status]}</span>
                      </div>
                      <h3 className="mt-5 text-[15px] font-bold leading-6 text-inherit">{quest.title}</h3>
                      <div className="mt-4 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="truncate">{quest.milestoneTitle}</span>
                        <span className="flex-shrink-0 font-semibold">+{quest.xpReward} XP</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.section>
      ))}
    </div>
  );
}
