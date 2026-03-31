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

  const progress = Math.min(
    ((totalXp - currentTierStart) / (nextLevelXp - currentTierStart)) * 100,
    100
  );

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/80 border-b border-slate-800">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
        {level}
      </div>

      {/* Level info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-semibold text-slate-200 truncate">{title}</span>
          <span className="text-xs text-slate-500 ml-2 flex-shrink-0">{totalXp} XP</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Streak */}
      {streakDays > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0 text-xs text-orange-400 font-bold">
          🔥 {streakDays}
        </div>
      )}
    </div>
  );
}
