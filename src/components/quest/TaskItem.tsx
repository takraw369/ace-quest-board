'use client';

import { motion } from 'framer-motion';
import type { Task } from '@/types/quest';

interface Props {
  task: Task;
  onToggle: () => void;
}

export default function TaskItem({ task, onToggle }: Props) {
  const isDone = task.status === 'done';

  return (
    <motion.div
      layout
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isDone
          ? 'border-slate-700 bg-slate-800/40 opacity-60'
          : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 hover:border-emerald-400'
        }`}
      >
        {isDone && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            viewBox="0 0 12 12"
            className="w-3 h-3"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </motion.svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <span
          className={`text-sm ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}
        >
          {task.title}
        </span>
      </div>

      <div className="flex-shrink-0 text-xs text-slate-500">
        {task.estimatedMinutes}分
      </div>
    </motion.div>
  );
}
