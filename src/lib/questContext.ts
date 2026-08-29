import type { Recommendation } from './pwa';

export type QuestMode = 'quick' | 'deep';
export type AttentionLevel = 'light' | 'focused';
export type PhysicalRequirement = 'none' | 'light' | 'standing_balance';

export type QuestContext = {
  quest_mode: QuestMode;
  time_budget_minutes: number;
  attention_level: AttentionLevel;
  availability_context: string[];
  device: string[];
  environment: string[];
  physical_requirement: PhysicalRequirement;
};

function stringList(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const list = value.map((item) => String(item).trim()).filter(Boolean);
    return list.length ? list : null;
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return null;
}

function minutesFrom(rec: Recommendation): number {
  const metadata = rec.metadata ?? {};
  const alternative = rec.alternative ?? {};
  const direct = Number(metadata.time_budget_minutes ?? alternative.recommended_minutes);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const duration = String(metadata.duration ?? alternative.duration ?? '');
  const match = duration.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : 3;
}

export function questContextOf(rec: Recommendation | null | undefined): QuestContext {
  const metadata = rec?.metadata ?? {};
  const alternative = rec?.alternative ?? {};
  const minutes = rec ? minutesFrom(rec) : 3;
  const explicitMode = metadata.quest_mode;
  const questMode: QuestMode = explicitMode === 'deep' || explicitMode === 'quick'
    ? explicitMode
    : minutes <= 3 ? 'quick' : 'deep';

  const nodeId = String(metadata.node_id ?? rec?.recommendation_ref ?? '');
  const explicitPhysical = metadata.physical_requirement;
  const physicalRequirement: PhysicalRequirement = explicitPhysical === 'standing_balance' || explicitPhysical === 'light' || explicitPhysical === 'none'
    ? explicitPhysical
    : nodeId.includes('N002') ? 'standing_balance' : 'none';

  return {
    quest_mode: questMode,
    time_budget_minutes: minutes,
    attention_level: metadata.attention_level === 'focused' || metadata.attention_level === 'light'
      ? metadata.attention_level
      : questMode === 'quick' ? 'light' : 'focused',
    availability_context: stringList(metadata.availability_context)
      ?? (questMode === 'quick' ? ['break', 'waiting', 'before_after_commute'] : ['desk', 'quiet_time']),
    device: stringList(metadata.device)
      ?? (questMode === 'quick' ? ['phone'] : ['phone', 'pc', 'paper']),
    environment: stringList(metadata.environment)
      ?? (physicalRequirement === 'standing_balance' ? ['safe_standing_space'] : questMode === 'quick' ? ['flexible'] : ['quiet_space']),
    physical_requirement: physicalRequirement,
  };
}

export function questContextLabel(context: QuestContext) {
  const place = context.environment.includes('safe_standing_space')
    ? '安全に止まれる場所'
    : context.quest_mode === 'quick' ? '休憩・待ち時間OK' : '落ち着ける場所';
  const device = context.device.length === 1 && context.device[0] === 'phone' ? 'スマホだけ' : 'スマホ / PC / 紙';
  return `${context.time_budget_minutes}分 / ${device} / ${place}`;
}
