'use client';

import { useMemo, useRef, useState } from 'react';
import { useQuestStore } from '@/stores/questStore';
import { usePlayerStore } from '@/stores/playerStore';
import { computeBoardLayout } from '@/lib/board-layout';
import PathRenderer from './PathRenderer';
import QuestNode from './QuestNode';
import MilestoneGate from './MilestoneGate';

interface Props {
  onQuestClick: (questId: string) => void;
}

export default function GameBoard({ onQuestClick }: Props) {
  const { visions, milestones, quests } = useQuestStore();
  const { currentPosition } = usePlayerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const layout = useMemo(
    () => computeBoardLayout(visions, milestones, quests),
    [visions, milestones, quests]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-node]')) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  };
  const handleMouseUp = () => setDragging(false);

  if (visions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <p className="text-lg font-medium">ボードが空です</p>
          <p className="text-sm mt-1">「＋」ボタンからクエストを追加してみよう</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative"
      style={{ cursor: dragging ? 'grabbing' : 'grab', background: 'transparent' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Vision lane labels */}
      <div
        className="absolute top-0 left-0 pointer-events-none"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
      >
        {visions.map((vision, idx) => (
          <div
            key={vision.id}
            className="absolute flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-30"
            style={{
              left: 8,
              top: 60 + idx * 240 + 240 / 2 - 8,
              color: vision.color,
            }}
          >
            <span>{vision.icon}</span>
            <span>{vision.title.slice(0, 20)}</span>
          </div>
        ))}
      </div>

      <svg
        width={layout.totalWidth}
        height={layout.totalHeight}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
      >
        {/* Grid dots background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill="#1e293b" />
          </pattern>
        </defs>
        <rect width={layout.totalWidth} height={layout.totalHeight} fill="url(#grid)" />

        <PathRenderer edges={layout.edges} nodes={layout.nodes} />

        {layout.nodes.map((node) => {
          const isPlayerHere = currentPosition.questId === node.questId && !!node.questId;

          if (node.type === 'quest') {
            return (
              <g key={node.id} data-node="true">
                <QuestNode
                  node={node}
                  isPlayerHere={isPlayerHere}
                  onClick={() => node.questId && onQuestClick(node.questId)}
                />
              </g>
            );
          }
          if (node.type === 'milestone' || node.type === 'vision_goal' || node.type === 'start') {
            return (
              <g key={node.id} data-node="true">
                <MilestoneGate node={node} isGoal={node.type === 'vision_goal'} />
              </g>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}
