'use client';

import { motion } from 'framer-motion';
import type { BoardNode } from '@/lib/board-layout';

interface Props {
  node: BoardNode;
  isPlayerHere: boolean;
  onClick: () => void;
}

const STATUS_STYLES: Record<string, { fill: string; stroke: string; opacity: number }> = {
  locked:       { fill: '#1e293b', stroke: '#475569', opacity: 0.5 },
  available:    { fill: 'transparent', stroke: 'currentColor', opacity: 1 },
  in_progress:  { fill: 'transparent', stroke: 'currentColor', opacity: 1 },
  completed:    { fill: 'currentColor', stroke: 'currentColor', opacity: 1 },
  active:       { fill: 'currentColor', stroke: 'currentColor', opacity: 1 },
};

export default function QuestNode({ node, isPlayerHere, onClick }: Props) {
  const style = STATUS_STYLES[node.status] ?? STATUS_STYLES.locked;
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const r = node.width / 2 - 4;

  return (
    <g
      onClick={onClick}
      style={{ cursor: node.status === 'locked' ? 'default' : 'pointer' }}
      className="group"
    >
      {/* Pulse ring for in_progress */}
      {node.status === 'in_progress' && (
        <motion.circle
          cx={cx}
          cy={cy}
          r={r + 6}
          fill="none"
          stroke={node.visionColor}
          strokeWidth={2}
          opacity={0.4}
          animate={{ r: [r + 6, r + 14], opacity: [0.4, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}

      {/* Main circle */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill={style.fill === 'currentColor' ? node.visionColor : style.fill}
        stroke={style.stroke === 'currentColor' ? node.visionColor : style.stroke}
        strokeWidth={2}
        opacity={style.opacity}
        whileHover={node.status !== 'locked' ? { scale: 1.15 } : {}}
        transition={{ type: 'spring', stiffness: 400 }}
      />

      {/* Completed checkmark */}
      {node.status === 'completed' && (
        <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize={20} fontWeight="bold">
          ✓
        </text>
      )}

      {/* Available / in_progress icon */}
      {(node.status === 'available' || node.status === 'in_progress') && (
        <text x={cx} y={cy + 5} textAnchor="middle" fill={node.visionColor} fontSize={18}>
          ⚔
        </text>
      )}

      {/* Locked icon */}
      {node.status === 'locked' && (
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#475569" fontSize={16}>
          🔒
        </text>
      )}

      {/* Player token */}
      {isPlayerHere && (
        <motion.circle
          cx={cx}
          cy={node.y - 12}
          r={8}
          fill="#facc15"
          stroke="#1e293b"
          strokeWidth={2}
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
      )}

      {/* Label below */}
      <foreignObject
        x={node.x - 20}
        y={node.y + node.height + 4}
        width={node.width + 40}
        height={40}
      >
        <div
          className="text-center text-xs leading-tight text-slate-300 group-hover:text-white transition-colors line-clamp-2"
          style={{ fontSize: '10px' }}
        >
          {node.label}
        </div>
      </foreignObject>
    </g>
  );
}
