export const LEVEL_THRESHOLDS = [
  { min: 0, max: 500, level: 1, title: '見習いクエスター' },
  { min: 501, max: 2000, level: 6, title: '冒険者' },
  { min: 2001, max: 5000, level: 11, title: 'ACEランナー' },
  { min: 5001, max: 15000, level: 21, title: 'ビジョンマスター' },
  { min: 15001, max: Infinity, level: 31, title: '伝説のリアン' },
];

export function getLevelInfo(totalXp: number): { level: number; title: string; nextLevelXp: number } {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const tier = LEVEL_THRESHOLDS[i];
    if (totalXp >= tier.min) {
      const xpInTier = totalXp - tier.min;
      const tierRange = tier.max === Infinity ? 10000 : tier.max - tier.min;
      const levelsInTier = LEVEL_THRESHOLDS[i + 1]?.level
        ? LEVEL_THRESHOLDS[i + 1].level - tier.level
        : 10;
      const xpPerLevel = Math.floor(tierRange / levelsInTier);
      const levelInTier = Math.floor(xpInTier / xpPerLevel);
      const currentLevel = tier.level + levelInTier;
      const nextLevelXp = tier.min + (levelInTier + 1) * xpPerLevel;
      return { level: currentLevel, title: tier.title, nextLevelXp };
    }
  }
  return { level: 1, title: '見習いクエスター', nextLevelXp: 100 };
}

export function calcQuestXp(
  difficulty: number,
  estimatedHours: number,
  completedWithinEstimate: boolean,
  streakDays: number
): number {
  const base = difficulty * 100;
  const timeBonus = completedWithinEstimate ? Math.floor(base * 0.5) : 0;
  const streakBonus = streakDays * 10;
  return base + timeBonus + streakBonus;
}
