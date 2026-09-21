import type { GrowthAxis, MonthlyGrowthReport, QuestLog } from '@/types/questCompiler';

const AXES: GrowthAxis[] = [
  'body',
  'focus',
  'mind',
  'learning',
  'execution',
  'connection',
  'legacy',
];

const AXIS_LABELS: Record<GrowthAxis, string> = {
  body: 'Body',
  focus: 'Focus',
  mind: 'Mind',
  learning: 'Learning',
  execution: 'Execution',
  connection: 'Connection',
  legacy: 'Legacy',
};

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function buildMonthlyGrowthReport(logs: QuestLog[], date = new Date()): MonthlyGrowthReport {
  const { start, end } = monthRange(date);
  const monthlyLogs = logs.filter((log) => {
    const completedAt = new Date(log.completedAt);
    return completedAt >= start && completedAt <= end;
  });

  const growthAxisXp = Object.fromEntries(AXES.map((axis) => [axis, 0])) as Record<
    GrowthAxis,
    number
  >;

  for (const log of monthlyLogs) {
    const splitXp = Math.max(1, Math.round(log.xp / Math.max(log.growthAxes.length, 1)));
    for (const axis of log.growthAxes) growthAxisXp[axis] += splitXp;
  }

  const rankedAxes = AXES.map((axis) => [axis, growthAxisXp[axis]] as const)
    .filter(([, xp]) => xp > 0)
    .sort((a, b) => b[1] - a[1]);
  const strongestAxes = rankedAxes.slice(0, 3).map(([axis]) => axis);
  const totalXp = monthlyLogs.reduce((sum, log) => sum + log.xp, 0);

  const highlights = monthlyLogs
    .slice()
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 3)
    .map((log) => `${log.questTitle} (+${log.xp} XP)`);

  const pattern =
    monthlyLogs.length === 0
      ? 'まだ今月のQuest Logがありません。最初の小さな実験を1つ完了すると、成長パターンが見え始めます。'
      : strongestAxes.length === 0
        ? `${monthlyLogs.length}件の実践が記録されています。次はGrowth Axisを付けて変化の方向を見える化します。`
        : `今月は${strongestAxes.map((axis) => AXIS_LABELS[axis]).join(' / ')}に実践が集中しています。固定タイプではなく、今月どこへ行動を投資したかを示す動的な記録です。`;

  const nextQuests = strongestAxes.length
    ? strongestAxes.map((axis) => `${AXIS_LABELS[axis]}を一段深めるChallenge Questを1つ設計する`)
    : ['Daily Questを1つ完了する', '実践後に1行Reflectionを残す'];

  return {
    periodLabel: `${date.getFullYear()}年${date.getMonth() + 1}月`,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    completedCount: monthlyLogs.length,
    totalXp,
    growthAxisXp,
    strongestAxes,
    highlights,
    pattern,
    nextQuests,
  };
}

export { AXIS_LABELS };
