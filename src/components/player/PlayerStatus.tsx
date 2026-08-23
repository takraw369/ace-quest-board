'use client';

import { motion } from 'framer-motion';
import { usePlayerStore } from '@/stores/playerStore';
import { getLevelInfo } from '@/lib/xp';

export default function PlayerStatus() {
  const { level, totalXp, title, streakDays } = usePlayerStore();
  const { nextLevelXp } = getLevelInfo(totalXp);

  const currentTierStart = (() => {
    const thresholds = [0, 501, 2001, 5001, 15001];
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (totalXp >= thresholds[i]) return thresholds[i];
    }
    return 0;
  })();

  const denominator = Math.max(nextLevelXp - currentTierStart, 1);
  const progress = Math.min(((totalXp - currentTierStart) / denominator) * 100, 100);

  return (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-indigo-300/15 bg-indigo-400/10 text-sm font-black text-indigo-200 shadow-[0_12px_30px_rgba(99,102,241,0.12)]">
          {level}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Current level</div>
          <div className="mt-0.5 text-sm font-bold text-white">{title}</div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-500">Experience</span>
          <span className="font-bold text-slate-300">{totalXp} / {nextLevelXp} XP</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-xs">
        <span className="rounded-full border border-white/8 bg-white/[0.035] px-3 py-1.5 font-semibold text-slate-400">
          {streakDays > 0 ? `🔥 ${streakDays} day streak` : 'Streak 0'}
        </span>
      </div>
    </div>
  );
}
