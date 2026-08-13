import type {
  CompassPoint,
  FlowCompassDayOneState,
  FlowCompassQuestDefinition,
} from '@/types/flow-compass';

export const FLOW_COMPASS_STORAGE_KEY = 'ace-flow-compass-day-1-v1';

export const DAY_ONE_QUEST: FlowCompassQuestDefinition = {
  schemaVersion: 'prototype-0.1',
  slug: 'flow-compass-day-1',
  title: '中心は、ひとつの場所ではない',
  intent: '中心の位置と変化を、身体・空間・操作の往復から観察する。',
  stages: [
    {
      id: 'arrive',
      label: 'ARRIVE',
      prompt: '視点を一点から周辺へひらき、今いる場所に到着する。',
      estimatedSeconds: 45,
    },
    {
      id: 'locate',
      label: 'LOCATE',
      prompt: '身体のどこに中心を感じるか、自分で仮置きする。',
      estimatedSeconds: 60,
    },
    {
      id: 'compress-release',
      label: 'COMPRESS / RELEASE',
      prompt: '凝縮と解放を往復し、中心の質がどう変わるか比べる。',
      estimatedSeconds: 75,
    },
    {
      id: 'reorient',
      label: 'REORIENT',
      prompt: '固定された上下をほどき、自分の向きを選び直す。',
      estimatedSeconds: 60,
    },
    {
      id: 'record',
      label: 'RECORD',
      prompt: '起きた変化を一行だけ残し、次の観察へつなぐ。',
      estimatedSeconds: 60,
    },
  ],
  scientificStatus: {
    measurable: ['画面上で選んだ座標', '圧縮スライダー値', '軸の角度', '入力した言葉'],
    metaphor: ['中心', '花托', '循環', '凝縮と解放'],
  },
};

export const INITIAL_DAY_ONE_STATE: FlowCompassDayOneState = {
  schemaVersion: 1,
  stepIndex: 0,
  center: { x: 50, y: 48 },
  compression: 50,
  compressionRange: { min: 50, max: 50 },
  orientation: 0,
  arrived: false,
  located: false,
  reoriented: false,
  insight: '',
  anchor: '同じ場所にもう一度触れて、差をみる',
  completedAt: null,
};

export type DayOneAction =
  | { type: 'HYDRATE'; value: unknown }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'ARRIVE' }
  | { type: 'LOCATE'; point: CompassPoint }
  | { type: 'SET_COMPRESSION'; value: number }
  | { type: 'SET_ORIENTATION'; value: number }
  | { type: 'SET_INSIGHT'; value: string }
  | { type: 'SET_ANCHOR'; value: string }
  | { type: 'COMPLETE'; timestamp: string }
  | { type: 'RESET' };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export function sanitizeDayOneState(value: unknown): FlowCompassDayOneState {
  if (!value || typeof value !== 'object') return INITIAL_DAY_ONE_STATE;

  const candidate = value as Partial<FlowCompassDayOneState>;
  const center = candidate.center;
  const compression = clamp(Number(candidate.compression), 0, 100);
  const storedRange = candidate.compressionRange;

  return {
    ...INITIAL_DAY_ONE_STATE,
    stepIndex: Math.round(clamp(Number(candidate.stepIndex), 0, DAY_ONE_QUEST.stages.length - 1)),
    center: {
      x: clamp(Number(center?.x), 8, 92),
      y: clamp(Number(center?.y), 8, 92),
    },
    compression,
    compressionRange: {
      min: clamp(Number(storedRange?.min), 0, compression),
      max: clamp(Number(storedRange?.max), compression, 100),
    },
    orientation: clamp(Number(candidate.orientation), -135, 135),
    arrived: Boolean(candidate.arrived),
    located: Boolean(candidate.located),
    reoriented: Boolean(candidate.reoriented),
    insight: typeof candidate.insight === 'string' ? candidate.insight.slice(0, 160) : '',
    anchor: typeof candidate.anchor === 'string' && candidate.anchor
      ? candidate.anchor.slice(0, 120)
      : INITIAL_DAY_ONE_STATE.anchor,
    completedAt: typeof candidate.completedAt === 'string' ? candidate.completedAt : null,
  };
}

export function dayOneReducer(
  state: FlowCompassDayOneState,
  action: DayOneAction,
): FlowCompassDayOneState {
  switch (action.type) {
    case 'HYDRATE':
      return sanitizeDayOneState(action.value);
    case 'NEXT':
      return {
        ...state,
        stepIndex: Math.min(DAY_ONE_QUEST.stages.length - 1, state.stepIndex + 1),
      };
    case 'BACK':
      return { ...state, stepIndex: Math.max(0, state.stepIndex - 1) };
    case 'ARRIVE':
      return { ...state, arrived: true };
    case 'LOCATE':
      return {
        ...state,
        center: {
          x: clamp(action.point.x, 8, 92),
          y: clamp(action.point.y, 8, 92),
        },
        located: true,
      };
    case 'SET_COMPRESSION': {
      const compression = clamp(action.value, 0, 100);
      return {
        ...state,
        compression,
        compressionRange: {
          min: Math.min(state.compressionRange.min, compression),
          max: Math.max(state.compressionRange.max, compression),
        },
      };
    }
    case 'SET_ORIENTATION': {
      const orientation = clamp(action.value, -135, 135);
      return {
        ...state,
        orientation,
        reoriented: state.reoriented || Math.abs(orientation) >= 20,
      };
    }
    case 'SET_INSIGHT':
      return { ...state, insight: action.value.slice(0, 160) };
    case 'SET_ANCHOR':
      return { ...state, anchor: action.value.slice(0, 120) };
    case 'COMPLETE':
      return state.insight.trim()
        ? { ...state, insight: state.insight.trim(), completedAt: action.timestamp }
        : state;
    case 'RESET':
      return INITIAL_DAY_ONE_STATE;
    default:
      return state;
  }
}

export function canAdvanceDayOne(state: FlowCompassDayOneState): boolean {
  switch (state.stepIndex) {
    case 0:
      return state.arrived;
    case 1:
      return state.located;
    case 2:
      return state.compressionRange.max - state.compressionRange.min >= 20;
    case 3:
      return state.reoriented;
    case 4:
      return state.insight.trim().length > 0;
    default:
      return false;
  }
}
