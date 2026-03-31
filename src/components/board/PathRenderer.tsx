'use client';

import type { BoardEdge, BoardNode } from '@/lib/board-layout';
import { getNodeCenter } from '@/lib/board-layout';

interface Props {
  edges: BoardEdge[];
  nodes: BoardNode[];
}

export default function PathRenderer({ edges, nodes }: Props) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <g>
      {edges.map((edge, i) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return null;

        const fc = getNodeCenter(from);
        const tc = getNodeCenter(to);

        // Bezier curve for smooth path
        const dx = tc.x - fc.x;
        const cp1x = fc.x + dx * 0.5;
        const cp2x = tc.x - dx * 0.5;
        const d = `M ${fc.x} ${fc.y} C ${cp1x} ${fc.y}, ${cp2x} ${tc.y}, ${tc.x} ${tc.y}`;

        return (
          <g key={i}>
            {/* Shadow path */}
            <path
              d={d}
              stroke={edge.visionColor}
              strokeWidth={4}
              fill="none"
              opacity={0.15}
              strokeLinecap="round"
            />
            {/* Main path */}
            <path
              d={d}
              stroke={edge.visionColor}
              strokeWidth={2}
              fill="none"
              opacity={0.6}
              strokeLinecap="round"
              strokeDasharray="0"
            />
          </g>
        );
      })}
    </g>
  );
}
