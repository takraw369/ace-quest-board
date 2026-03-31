import type { Vision, Milestone, Quest } from '@/types/quest';

export interface BoardNode {
  id: string;
  type: 'start' | 'quest' | 'milestone' | 'vision_goal';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  status: string;
  visionColor: string;
  questId?: string;
  milestoneId?: string;
  visionId?: string;
}

export interface BoardEdge {
  from: string;
  to: string;
  visionColor: string;
}

export interface BoardLayout {
  nodes: BoardNode[];
  edges: BoardEdge[];
  totalWidth: number;
  totalHeight: number;
}

const NODE_W = 80;
const NODE_H = 80;
const MILESTONE_W = 100;
const MILESTONE_H = 100;
const H_GAP = 60;
const V_GAP = 80;
const LANE_HEIGHT = 240;

export function computeBoardLayout(
  visions: Vision[],
  milestones: Milestone[],
  quests: Quest[]
): BoardLayout {
  const nodes: BoardNode[] = [];
  const edges: BoardEdge[] = [];

  let maxX = 0;
  let totalHeight = 60;

  const sortedVisions = [...visions].sort((a, b) => a.order - b.order);

  sortedVisions.forEach((vision, vIdx) => {
    const laneY = 60 + vIdx * LANE_HEIGHT;
    const visionMilestones = milestones
      .filter((m) => m.visionId === vision.id)
      .sort((a, b) => a.order - b.order);

    let curX = 40;

    // START node per vision
    const startId = `start-${vision.id}`;
    nodes.push({
      id: startId,
      type: 'start',
      x: curX,
      y: laneY + LANE_HEIGHT / 2 - NODE_H / 2,
      width: NODE_W,
      height: NODE_H,
      label: 'START',
      status: 'active',
      visionColor: vision.color,
      visionId: vision.id,
    });
    curX += NODE_W + H_GAP;

    let prevNodeId = startId;

    visionMilestones.forEach((milestone) => {
      const milestoneQuests = quests
        .filter((q) => q.milestoneId === milestone.id)
        .sort((a, b) => {
          const order = { completed: 0, in_progress: 1, available: 2, locked: 3 };
          return order[a.status] - order[b.status];
        });

      // Quests before milestone
      milestoneQuests.forEach((quest) => {
        const nodeId = `quest-${quest.id}`;
        nodes.push({
          id: nodeId,
          type: 'quest',
          x: curX,
          y: laneY + LANE_HEIGHT / 2 - NODE_H / 2,
          width: NODE_W,
          height: NODE_H,
          label: quest.title,
          status: quest.status,
          visionColor: vision.color,
          questId: quest.id,
          milestoneId: milestone.id,
          visionId: vision.id,
        });
        edges.push({ from: prevNodeId, to: nodeId, visionColor: vision.color });
        prevNodeId = nodeId;
        curX += NODE_W + H_GAP;
      });

      // Milestone node
      const milestoneNodeId = `milestone-${milestone.id}`;
      nodes.push({
        id: milestoneNodeId,
        type: 'milestone',
        x: curX,
        y: laneY + LANE_HEIGHT / 2 - MILESTONE_H / 2,
        width: MILESTONE_W,
        height: MILESTONE_H,
        label: milestone.title,
        status: milestone.status,
        visionColor: vision.color,
        milestoneId: milestone.id,
        visionId: vision.id,
      });
      edges.push({ from: prevNodeId, to: milestoneNodeId, visionColor: vision.color });
      prevNodeId = milestoneNodeId;
      curX += MILESTONE_W + H_GAP;
    });

    // Vision Goal node
    const goalId = `goal-${vision.id}`;
    nodes.push({
      id: goalId,
      type: 'vision_goal',
      x: curX,
      y: laneY + LANE_HEIGHT / 2 - MILESTONE_H / 2,
      width: MILESTONE_W,
      height: MILESTONE_H,
      label: vision.title,
      status: 'locked',
      visionColor: vision.color,
      visionId: vision.id,
    });
    edges.push({ from: prevNodeId, to: goalId, visionColor: vision.color });

    curX += MILESTONE_W + H_GAP;
    if (curX > maxX) maxX = curX;
    totalHeight = laneY + LANE_HEIGHT + 60;
  });

  if (sortedVisions.length === 0) {
    totalHeight = 400;
    maxX = 800;
  }

  return {
    nodes,
    edges,
    totalWidth: Math.max(maxX, 800),
    totalHeight,
  };
}

export function getNodeCenter(node: BoardNode): { x: number; y: number } {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}
