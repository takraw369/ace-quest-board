'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useQuestStore } from '@/stores/questStore';
import { usePlayerStore } from '@/stores/playerStore';
import { calcQuestXp } from '@/lib/xp';
import TaskList from './TaskList';

const DIFFICULTY_LABELS: Record<number, string> = {
  1: '★☆☆☆☆',
  2: '★★☆☆☆',
  3: '★★★☆☆',
  4: '★★★★☆',
  5: '★★★★★',
};

const TAG_COLORS: Record<string, string> = {
  dev: 'bg-blue-900/60 text-blue-300',
  content: 'bg-purple-900/60 text-purple-300',
  design: 'bg-pink-900/60 text-pink-300',
  marketing: 'bg-orange-900/60 text-orange-300',
};

interface Props {
  questId: string | null;
  onClose: () => void;
}

export default function QuestPanel({ questId, onClose }: Props) {
  const { quests, milestones, visions, getTasksForQuest, getQuestProgress, updateQuest } = useQuestStore();
  const { addXp, setPosition, streakDays } = usePlayerStore();

  const quest = questId ? quests.find((q) => q.id === questId) : null;
  const milestone = quest ? milestones.find((m) => m.id === quest.milestoneId) : null;
  const vision = milestone ? visions.find((v) => v.id === milestone.visionId) : null;

  const tasks = quest ? getTasksForQuest(quest.id) : [];
  const progress = quest ? getQuestProgress(quest.id) : 0;
  const totalMins = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
  const doneMins = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + t.estimatedMinutes, 0);

  const handleCompleteQuest = () => {
    if (!quest || !milestone || !vision) return;
    const xp = calcQuestXp(quest.difficulty, quest.estimatedHours, true, streakDays);
    updateQuest(quest.id, { status: 'completed' });
    addXp(xp);
    setPosition(vision.id, milestone.id, quest.id);
  };

  const handleStartQuest = () => {
    if (!quest) return;
    updateQuest(quest.id, { status: 'in_progress' });
  };

  return (
    <AnimatePresence>
      {quest && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div
              className="px-5 pt-5 pb-4 border-b border-slate-800"
              style={{ borderTop: `3px solid ${vision?.color ?? '#6366f1'}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 text-xs text-slate-500">
                    <span>{vision?.icon}</span>
                    <span className="truncate">{vision?.title}</span>
                    <span>/</span>
                    <span className="truncate">{milestone?.title}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white leading-tight">{quest.title}</h2>
                  {quest.description && (
                    <p className="text-sm text-slate-400 mt-1">{quest.description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-500 hover:text-white transition-colors text-xl leading-none mt-1"
                >
                  ✕
                </button>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-yellow-400">{DIFFICULTY_LABELS[quest.difficulty]}</span>
                <span className="text-slate-400">{quest.estimatedHours}h</span>
                <span className="text-indigo-400 font-bold">+{quest.xpReward} XP</span>
              </div>

              {/* Tags */}
              {quest.tags.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {quest.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs px-2 py-0.5 rounded-full ${TAG_COLORS[tag] ?? 'bg-slate-700 text-slate-300'}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="px-5 py-4 border-b border-slate-800">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>進捗</span>
                <span>{progress}%（{doneMins}/{totalMins}分）</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: vision?.color ?? '#6366f1' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">タスク一覧</h3>
              <TaskList questId={quest.id} />
            </div>

            {/* Action button */}
            <div className="px-5 pb-6 pt-4 border-t border-slate-800">
              {quest.status === 'available' && (
                <button
                  onClick={handleStartQuest}
                  className="w-full py-3 rounded-xl font-bold text-white transition-all active:scale-95"
                  style={{ backgroundColor: vision?.color ?? '#6366f1' }}
                >
                  クエスト開始
                </button>
              )}
              {quest.status === 'in_progress' && (
                <button
                  onClick={handleCompleteQuest}
                  disabled={progress < 100}
                  className={`w-full py-3 rounded-xl font-bold text-white transition-all active:scale-95 ${
                    progress < 100 ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110'
                  }`}
                  style={{ backgroundColor: progress >= 100 ? '#10b981' : '#475569' }}
                >
                  {progress < 100
                    ? `クエスト完了まで ${100 - progress}%`
                    : `クエスト完了！ ＋${quest.xpReward} XP`}
                </button>
              )}
              {quest.status === 'completed' && (
                <div className="w-full py-3 rounded-xl font-bold text-emerald-400 text-center border border-emerald-800 bg-emerald-900/20">
                  ✓ クリア済み
                </div>
              )}
              {quest.status === 'locked' && (
                <div className="w-full py-3 rounded-xl font-bold text-slate-500 text-center border border-slate-700 bg-slate-800/20">
                  🔒 前のクエストをクリアしよう
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
