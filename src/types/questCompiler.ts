export type GrowthAxis =
  | 'body'
  | 'focus'
  | 'mind'
  | 'learning'
  | 'execution'
  | 'connection'
  | 'legacy';

export type QuestKind = 'main' | 'sub' | 'daily';

export interface CompiledQuest {
  id: string;
  kind: QuestKind;
  title: string;
  description: string;
  clearCondition: string;
  xp: number;
  growthAxes: GrowthAxis[];
  day?: number;
}

export interface CompiledQuestPlan {
  id: string;
  sourceTitle: string;
  sourceExcerpt: string;
  sourceKeywords: string[];
  createdAt: string;
  mainQuest: CompiledQuest;
  subQuests: CompiledQuest[];
  dailyQuests: CompiledQuest[];
  reviewPrompts: string[];
  nextUnlock: string;
}

export interface QuestLog {
  id: string;
  planId: string;
  questId: string;
  questTitle: string;
  completedAt: string;
  xp: number;
  growthAxes: GrowthAxis[];
  reflection?: string;
}

export interface MonthlyGrowthReport {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  completedCount: number;
  totalXp: number;
  growthAxisXp: Record<GrowthAxis, number>;
  strongestAxes: GrowthAxis[];
  highlights: string[];
  pattern: string;
  nextQuests: string[];
}
