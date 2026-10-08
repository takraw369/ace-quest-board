export type AthleteTab = 'home' | 'note' | 'checkin' | 'growth';
export type AthleteQuest = 'reset' | 'one' | 'sense';
export type AthleteCheckin = {
  at: string;
  energy: number;
  focus: number;
  body: number;
  sleep: number;
  mood: number;
  goal: string;
  quest: AthleteQuest;
};
export type AthleteReflection = { good: string; improve: string; confidence: number };
export type AthleteDrill = { id: string; name: string; done: boolean };
export type AthleteLog = {
  id: string; userId: null; date: string; title: string; sport: string;
  duration: number; rpe: number; focus: string;
  drills: AthleteDrill[]; memo: string;
  checkin: AthleteCheckin | null;
  reflection: AthleteReflection | null;
  createdAt: string; updatedAt: string;
};
export type LegacyAthleteSession = {
  id: string; finishedAt: string; questId: string; feeling: string; note: string;
};
export const JOURNAL_KEY = 'ace_athlete_journal_v2';
export const CHECKIN_KEY = 'ace_athlete_pending_checkin_v2';
export const LEGACY_KEY = 'ace_athlete_sessions_v1';
export const QUESTS: { id: AthleteQuest; title: string; subtitle: string; icon: string }[] = [
  { id: 'reset', title: 'RESET', subtitle: '呼吸と姿勢を整える', icon: '◌' },
  { id: 'one', title: 'ONE THING', subtitle: '今日の一点に集中', icon: '◎' },
  { id: 'sense', title: 'SENSE', subtitle: 'うまくいく感覚を探す', icon: '✧' },
];
const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const asString = (v: unknown, limit = 500) => typeof v === 'string' ? v.slice(0, limit) : '';
export const localDate = (date = new Date()) =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
export const formatDate = (value: string) => {
  const parts = value.split('-');
  return parts.length === 3 ? `${Number(parts[1])}月${Number(parts[2])}日` : value;
};
const loadArray = (key: string): unknown[] => {
  try {
    const result: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(result) ? result : [];
  } catch { return []; }
};
export function readJournal(): AthleteLog[] {
  return loadArray(JOURNAL_KEY).filter((value): value is AthleteLog => {
    if (!value || typeof value !== 'object') return false;
    const o = value as Record<string, unknown>;
    return typeof o.id === 'string' && asString(o.date, 20).length === 10 &&
      typeof o.title === 'string' && typeof o.createdAt === 'string';
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 150);
}
export function readLegacy(): LegacyAthleteSession[] {
  return loadArray(LEGACY_KEY).filter((value): value is LegacyAthleteSession => {
    if (!value || typeof value !== 'object') return false;
    const o = value as Record<string, unknown>;
    return typeof o.id === 'string' && typeof o.finishedAt === 'string' &&
      typeof o.questId === 'string' && typeof o.feeling === 'string';
  }).map(item => ({ ...item, note: asString(item.note, 240) })).slice(0, 40);
}
export function writeJournal(logs: AthleteLog[]): boolean {
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(logs.slice(0, 150))); return true; }
  catch { return false; }
}
export function readCheckin(): AthleteCheckin | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.at !== 'string' || !QUESTS.some(q => q.id === o.quest)) return null;
    return {
      at: o.at,
      energy: clamp(o.energy, 1, 5, 3), focus: clamp(o.focus, 1, 5, 3),
      body: clamp(o.body, 1, 5, 3), sleep: clamp(o.sleep, 1, 5, 3),
      mood: clamp(o.mood, 1, 5, 3), goal: asString(o.goal, 100),
      quest: o.quest as AthleteQuest,
    };
  } catch { return null; }
}
export function writeCheckin(item: AthleteCheckin): boolean {
  try { localStorage.setItem(CHECKIN_KEY, JSON.stringify(item)); return true; }
  catch { return false; }
}
export function clearCheckin() {
  try { localStorage.removeItem(CHECKIN_KEY); } catch { return; }
}
export function weeklyLoad(logs: AthleteLog[], reference = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - (6 - i));
    const date = localDate(d);
    const sessions = logs.filter(log => log.date === date);
    const minutes = sessions.reduce((sum, item) => sum + clamp(item.duration, 0, 1440, 0), 0);
    const load = sessions.reduce((sum, item) =>
      sum + clamp(item.duration, 0, 1440, 0) * clamp(item.rpe, 1, 10, 1), 0);
    return { date, day: '日月火水木金土'[d.getDay()], minutes, load, sessions: sessions.length };
  });
}
export function getStreak(logs: AthleteLog[], reference = new Date()) {
  const dates = new Set(logs.map(log => log.date));
  const anchor = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  if (!dates.has(localDate(anchor))) anchor.setDate(anchor.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 150; i++) {
    if (!dates.has(localDate(anchor))) break;
    streak += 1;
    anchor.setDate(anchor.getDate() - 1);
  }
  return streak;
}