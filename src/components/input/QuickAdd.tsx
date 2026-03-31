'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuestStore } from '@/stores/questStore';
import VisionPicker from './VisionPicker';

type Step = 'quest' | 'tasks';

const VISION_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];
const VISION_ICONS = ['🎯', '🚀', '💡', '🏆', '⚡', '🌟', '🔥', '💪', '🌈', '🎓'];

export default function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('quest');

  // Quest fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedVisionId, setSelectedVisionId] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');
  const [hours, setHours] = useState(2);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [tags, setTags] = useState<string[]>([]);

  // Quick vision creation
  const [newVisionTitle, setNewVisionTitle] = useState('');
  const [newVisionIcon, setNewVisionIcon] = useState('🎯');
  const [newVisionColor, setNewVisionColor] = useState(VISION_COLORS[0]);
  const [showNewVision, setShowNewVision] = useState(false);

  // Created quest id for task step
  const [createdQuestId, setCreatedQuestId] = useState('');

  const { visions, milestones, addVision, addMilestone, addQuest, addTask } = useQuestStore();

  const reset = () => {
    setStep('quest');
    setTitle('');
    setDescription('');
    setSelectedVisionId('');
    setSelectedMilestoneId('');
    setHours(2);
    setDifficulty(2);
    setTags([]);
    setShowNewVision(false);
    setCreatedQuestId('');
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleCreateVision = () => {
    if (!newVisionTitle.trim()) return;
    const v = addVision({
      title: newVisionTitle.trim(),
      description: '',
      color: newVisionColor,
      icon: newVisionIcon,
      order: visions.length,
    });
    // Auto-create default milestone
    const m = addMilestone({
      visionId: v.id,
      title: `${newVisionTitle.trim()} 最初のマイルストーン`,
      description: '',
      status: 'active',
      order: 1,
    });
    setSelectedVisionId(v.id);
    setSelectedMilestoneId(m.id);
    setNewVisionTitle('');
    setShowNewVision(false);
  };

  const handleSubmitQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedMilestoneId) return;
    const xpReward = difficulty * 100;
    const quest = addQuest({
      milestoneId: selectedMilestoneId,
      title: title.trim(),
      description,
      estimatedHours: hours,
      difficulty,
      xpReward,
      status: 'available',
      tags,
    });
    setCreatedQuestId(quest.id);
    setStep('tasks');
  };

  const [taskLines, setTaskLines] = useState('');

  const handleSubmitTasks = () => {
    const lines = taskLines.split('\n').filter((l) => l.trim());
    lines.forEach((line, i) => {
      addTask({
        questId: createdQuestId,
        title: line.trim(),
        estimatedMinutes: 30,
        status: 'todo',
        order: i,
      });
    });
    handleClose();
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-2xl font-light shadow-xl flex items-center justify-center z-30 transition-colors"
      >
        ＋
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={handleClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
                <h2 className="font-bold text-white">
                  {step === 'quest' ? '新しいクエストを追加' : 'タスクを分解'}
                </h2>
                <button onClick={handleClose} className="text-slate-500 hover:text-white text-xl">✕</button>
              </div>

              <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
                {step === 'quest' ? (
                  <form onSubmit={handleSubmitQuest} className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">クエストタイトル *</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="例: LP完成クエスト"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">説明（任意）</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    {/* Vision Picker */}
                    <VisionPicker
                      visions={visions}
                      milestones={milestones}
                      selectedVisionId={selectedVisionId}
                      selectedMilestoneId={selectedMilestoneId}
                      onVisionChange={setSelectedVisionId}
                      onMilestoneChange={setSelectedMilestoneId}
                    />

                    {/* New Vision quick-create */}
                    {!showNewVision ? (
                      <button
                        type="button"
                        onClick={() => setShowNewVision(true)}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        ＋ 新しいビジョンを作成
                      </button>
                    ) : (
                      <div className="border border-slate-700 rounded-xl p-3 space-y-3">
                        <p className="text-xs text-slate-400 font-semibold">新しいビジョン</p>
                        <div className="flex gap-2">
                          <select
                            value={newVisionIcon}
                            onChange={(e) => setNewVisionIcon(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm"
                          >
                            {VISION_ICONS.map((icon) => (
                              <option key={icon} value={icon}>{icon}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={newVisionTitle}
                            onChange={(e) => setNewVisionTitle(e.target.value)}
                            placeholder="ビジョン名..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {VISION_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewVisionColor(c)}
                              className={`w-6 h-6 rounded-full transition-transform ${newVisionColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleCreateVision}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg"
                        >
                          作成
                        </button>
                      </div>
                    )}

                    {/* Hours + Difficulty */}
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">見積もり工数 (h)</label>
                        <input
                          type="number"
                          value={hours}
                          onChange={(e) => setHours(Number(e.target.value))}
                          min={0.5}
                          step={0.5}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">難易度</label>
                        <div className="flex gap-1 pt-1">
                          {([1, 2, 3, 4, 5] as const).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDifficulty(d)}
                              className={`text-lg transition-opacity ${d <= difficulty ? 'opacity-100' : 'opacity-25'}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">タグ</label>
                      <div className="flex gap-2 flex-wrap">
                        {['dev', 'content', 'design', 'marketing'].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                              tags.includes(tag)
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!title.trim() || !selectedMilestoneId}
                      className="w-full py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      次へ → タスクを追加
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-400">
                      タスクを1行ずつ入力してください（スキップ可）
                    </p>
                    <textarea
                      value={taskLines}
                      onChange={(e) => setTaskLines(e.target.value)}
                      rows={6}
                      placeholder={`例:\nヒーローセクションのコピー作成\nデザインカンプ作成\nコーディング\nテスト`}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleClose}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-400 border border-slate-700 hover:border-slate-500 transition-colors"
                      >
                        スキップ
                      </button>
                      <button
                        onClick={handleSubmitTasks}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                      >
                        追加して完了
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
