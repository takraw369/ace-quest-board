'use client';

import { motion } from 'framer-motion';
import type { BoardNode } from '@/lib/board-layout';

interface Props {
  node: BoardNode;
  isGoal?: boolean;
}

export default function MilestoneGate({ node, isGoal = false }: Props) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const size = node.width / 2 - 4;

  const isCompleted = node.status === 'completed';
  const isActive = node.status === 'active';

  // Star polygon points
  const starPoints = (cx: number, cy: number, outer: number, inner: number, points = 5) => {
    const pts: string[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI / points) * i - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  };

  return (
    <g>
      {/* Glow for completed/active */}
      {(isCompleted || isActive) && (
        <motion.circle
          cx={cx}
          cy={cy}
          r={size + 8}
          fill={node.visionColor}
          opacity={0.15}
          animate={{ opacity: [0.1, 0.25, 0.1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}

      {isGoal ? (
        // Trophy shape for vision goal
        <motion.rect
          x={node.x + 6}
          y={node.y + 6}
          width={node.width - 12}
          height={node.height - 12}
          rx={12}
          fill={isCompleted ? node.visionColor : 'transparent'}
          stroke={node.visionColor}
          strokeWidth={2.5}
          opacity={isCompleted ? 1 : 0.7}
          whileHover={{ scale: 1.1 }}
        />
      ) : (
        // Star for milestone
        <motion.polygon
          points={starPoints(cx, cy, size, size * 0.45)}
          fill={isCompleted ? node.visionColor : 'transparent'}
          stroke={node.visionColor}
          strokeWidth={2}
          opacity={isCompleted ? 1 : node.status === 'locked' ? 0.3 : 0.8}
          whileHover={{ scale: 1.1 }}
        />
      )}

      {/* Icon */}
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={isGoal ? 24 : 20}>
        {isGoal ? '🏆' : isCompleted ? '⭐' : '★'}
      </text>

      {/* Label */}
      <foreignObject
        x={node.x - 20}
        y={node.y + node.height + 4}
        width={node.width + 40}
        height={44}
      >
        <div
          className="text-center text-xs leading-tight text-slate-200 font-semibold line-clamp-2"
          style={{ fontSize: '10px' }}
        >
          {node.label}
        </div>
      </foreignObject>
    </g>
  );
}
