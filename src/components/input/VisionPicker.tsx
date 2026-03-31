'use client';

import type { Vision, Milestone } from '@/types/quest';

interface Props {
  visions: Vision[];
  milestones: Milestone[];
  selectedVisionId: string;
  selectedMilestoneId: string;
  onVisionChange: (id: string) => void;
  onMilestoneChange: (id: string) => void;
}

export default function VisionPicker({
  visions,
  milestones,
  selectedVisionId,
  selectedMilestoneId,
  onVisionChange,
  onMilestoneChange,
}: Props) {
  const filteredMilestones = milestones.filter((m) => m.visionId === selectedVisionId);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-slate-400 mb-1">ビジョン</label>
        <select
          value={selectedVisionId}
          onChange={(e) => {
            onVisionChange(e.target.value);
            onMilestoneChange('');
          }}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500"
        >
          <option value="">ビジョンを選択...</option>
          {visions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.icon} {v.title}
            </option>
          ))}
        </select>
      </div>

      {selectedVisionId && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">マイルストーン</label>
          <select
            value={selectedMilestoneId}
            onChange={(e) => onMilestoneChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500"
          >
            <option value="">マイルストーンを選択...</option>
            {filteredMilestones.map((m) => (
              <option key={m.id} value={m.id}>
                ★ {m.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
