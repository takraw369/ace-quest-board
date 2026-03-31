'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { nanoid } from 'nanoid';
import { useQuestStore } from '@/stores/questStore';
import TaskItem from './TaskItem';

interface Props {
  questId: string;
}

export default function TaskList({ questId }: Props) {
  const { getTasksForQuest, updateTask, addTask } = useQuestStore();
  const tasks = getTasksForQuest(questId);
  const [newTitle, setNewTitle] = useState('');
  const [newMins, setNewMins] = useState(30);

  const handleToggle = (taskId: string, currentStatus: string) => {
    updateTask(taskId, {
      status: currentStatus === 'done' ? 'todo' : 'done',
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask({
      questId,
      title: newTitle.trim(),
      estimatedMinutes: newMins,
      status: 'todo',
      order: tasks.length,
    });
    setNewTitle('');
    setNewMins(30);
  };

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => handleToggle(task.id, task.status)}
          />
        ))}
      </AnimatePresence>

      {tasks.length === 0 && (
        <p className="text-slate-600 text-sm py-2">タスクがありません</p>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 pt-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="タスクを追加..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500"
        />
        <input
          type="number"
          value={newMins}
          onChange={(e) => setNewMins(Number(e.target.value))}
          min={5}
          step={5}
          className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500 text-center"
        />
        <button
          type="submit"
          className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3 py-2 text-sm transition-colors"
        >
          ＋
        </button>
      </form>
    </div>
  );
}
