export interface Vision {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  createdAt: string;
  order: number;
  userId?: string;
}

export interface Milestone {
  id: string;
  visionId: string;
  title: string;
  description: string;
  targetDate?: string;
  status: 'locked' | 'active' | 'completed';
  order: number;
  userId?: string;
}

export interface Quest {
  id: string;
  milestoneId: string;
  title: string;
  description: string;
  estimatedHours: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  xpReward: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  deadline?: string;
  tags: string[];
  userId?: string;
}

export interface Task {
  id: string;
  questId: string;
  title: string;
  estimatedMinutes: number;
  actualMinutes?: number;
  status: 'todo' | 'in_progress' | 'done';
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  order: number;
  userId?: string;
}

export interface Player {
  level: number;
  totalXp: number;
  currentPosition: {
    visionId: string;
    milestoneId: string;
    questId: string;
  };
  streakDays: number;
  title: string;
  userId?: string;
}

export type QuestStatus = Quest['status'];
export type TaskStatus = Task['status'];
export type MilestoneStatus = Milestone['status'];
