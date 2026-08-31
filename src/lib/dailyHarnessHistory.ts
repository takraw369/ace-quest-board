import type { HarnessDeck, HarnessSelection } from '@/types/dailyHarness';

const STORAGE_KEY = 'ace.dailyHarness.draws.v1';
const HISTORY_LIMIT = 30;

export type HarnessRedrawRecord = {
  deck: HarnessDeck;
  fromCardId: string;
  toCardId: string;
  reason: string;
  redrawnAt: string;
};

export type HarnessDrawRecord = {
  id: string;
  drawnAt: string;
  selectionMode: 'random';
  visionId: string;
  themeId: string;
  mediumId: string;
  redrawCount: number;
  redraws: HarnessRedrawRecord[];
  intention: string;
  completed: boolean;
  updatedAt: string;
};

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `dh_${crypto.randomUUID()}`;
  return `dh_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function selectionIds(selection: HarnessSelection) {
  return {
    visionId: selection.vision.id,
    themeId: selection.theme.id,
    mediumId: selection.medium.id,
  };
}

export function createHarnessDrawRecord(selection: HarnessSelection): HarnessDrawRecord {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    drawnAt: now,
    selectionMode: 'random',
    ...selectionIds(selection),
    redrawCount: 0,
    redraws: [],
    intention: '',
    completed: false,
    updatedAt: now,
  };
}

export function loadHarnessHistory(): HarnessDrawRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistHarnessDraw(record: HarnessDrawRecord) {
  if (typeof window === 'undefined') return;
  const history = loadHarnessHistory();
  const next = [record, ...history.filter((item) => item.id !== record.id)].slice(0, HISTORY_LIMIT);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function addHarnessRedraw(
  record: HarnessDrawRecord,
  selection: HarnessSelection,
  redraw: HarnessRedrawRecord,
): HarnessDrawRecord {
  return {
    ...record,
    ...selectionIds(selection),
    redrawCount: record.redrawCount + 1,
    redraws: [...record.redraws, redraw],
    updatedAt: new Date().toISOString(),
  };
}

export function updateHarnessExecution(
  record: HarnessDrawRecord,
  patch: Partial<Pick<HarnessDrawRecord, 'intention' | 'completed'>>,
): HarnessDrawRecord {
  return {
    ...record,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}
