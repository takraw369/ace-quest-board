import { loadBootstrap, sessionIsUsable, SUPABASE_URL, type PwaBootstrap } from '@/lib/pwa';

export const C_CHOICE_STORAGE_KEY = 'flow:ace:c-choice:v1';

export const C_KEYS = [
  'curiosity',
  'challenge',
  'creation',
  'connection',
  'contribution',
  'change',
  'care',
  'choice',
  'courage',
  'competition',
  'confidence',
  'community',
  'communication',
  'craft',
  'culture',
] as const;

export type CKey = (typeof C_KEYS)[number];

export type COption = {
  key: CKey;
  label: string;
  jp: string;
  prompt: string;
};

export const PRIMARY_C_OPTIONS: COption[] = [
  { key: 'curiosity', label: 'Curiosity', jp: '知りたい・確かめたい', prompt: 'いま答えを知りたい問いを、1つだけ書く。' },
  { key: 'challenge', label: 'Challenge', jp: '挑みたい・越えたい', prompt: '少し怖いけど、やってみたいことを1つ書く。' },
  { key: 'creation', label: 'Creation', jp: '創りたい・表現したい', prompt: '頭の中にあるものを、3分だけ形にする。' },
  { key: 'connection', label: 'Connection', jp: 'つながりたい・分かち合いたい', prompt: 'いま話したい / 会いたい人を1人思い出す。' },
  { key: 'contribution', label: 'Contribution', jp: '役に立ちたい・力を渡したい', prompt: '今日、誰かの選択肢を1つ増やせるとしたら何をする？' },
  { key: 'change', label: 'Change', jp: '変わりたい・変えたい', prompt: '今のまま残したくないものを1つ書く。' },
  { key: 'care', label: 'Care', jp: '大切にしたい・育てたい', prompt: '今、守りたい / 育てたいものを1つ書く。' },
  { key: 'choice', label: 'Choice', jp: '自分で選びたい', prompt: '誰の期待もなかったら、本当は何を選びたい？' },
];

export const MORE_C_OPTIONS: COption[] = [
  { key: 'courage', label: 'Courage', jp: '怖くても一歩踏み出したい', prompt: '怖さが10%小さかったら、何をする？' },
  { key: 'competition', label: 'Competition', jp: '競いたい・勝ちたい', prompt: 'いま本気で勝ちたい相手 / 基準 / 昨日の自分は何？' },
  { key: 'confidence', label: 'Confidence', jp: '自信を育てたい', prompt: 'すでに出来ている証拠を1つ思い出す。' },
  { key: 'community', label: 'Community', jp: '仲間・居場所をつくりたい', prompt: 'どんな仲間となら、次の一歩を続けられそう？' },
  { key: 'communication', label: 'Communication', jp: '伝えたい・分かり合いたい', prompt: '本当は誰に、何を伝えたい？' },
  { key: 'craft', label: 'Craft', jp: '磨きたい・極めたい', prompt: 'もっと上手くなりたい1つを選ぶ。' },
  { key: 'culture', label: 'Culture', jp: '文化・世界観を育てたい', prompt: '自分の周りに増やしたい「当たり前」は何？' },
];

export const ALL_C_OPTIONS = [...PRIMARY_C_OPTIONS, ...MORE_C_OPTIONS];

export const REASON_CLUSTERS = [
  { key: 'recover', label: '取り戻したい' },
  { key: 'breakthrough', label: '停滞を破りたい' },
  { key: 'expand', label: 'もっと伸びたい' },
  { key: 'explore', label: 'まだ知らない世界へ行きたい' },
  { key: 'express', label: '自分を出したい' },
  { key: 'relate', label: '誰かとつながりたい' },
  { key: 'contribute', label: '誰か・何かに力を使いたい' },
  { key: 'rechoose', label: '選び直したい' },
  { key: 'unknown', label: 'まだ言葉にならない' },
] as const;

export type ReasonCluster = (typeof REASON_CLUSTERS)[number]['key'];

export type CChoiceState = {
  version: 1;
  candidates: CKey[];
  currentC: CKey | null;
  reasonText: string;
  reasonCluster: ReasonCluster | null;
  desiredChangeText: string;
  reflectionText: string;
  selectedAt: string | null;
  firstQuestStartedAt: string | null;
  firstQuestCompletedAt: string | null;
  updatedAt: string;
};

export const DEFAULT_C_CHOICE_STATE: CChoiceState = {
  version: 1,
  candidates: [],
  currentC: null,
  reasonText: '',
  reasonCluster: null,
  desiredChangeText: '',
  reflectionText: '',
  selectedAt: null,
  firstQuestStartedAt: null,
  firstQuestCompletedAt: null,
  updatedAt: '',
};

export function isCKey(value: unknown): value is CKey {
  return typeof value === 'string' && (C_KEYS as readonly string[]).includes(value);
}

export function findCOption(key: CKey | null) {
  return key ? ALL_C_OPTIONS.find((option) => option.key === key) ?? null : null;
}

export function loadCChoiceState(): CChoiceState {
  if (typeof window === 'undefined') return DEFAULT_C_CHOICE_STATE;
  try {
    const raw = localStorage.getItem(C_CHOICE_STORAGE_KEY);
    if (!raw) return DEFAULT_C_CHOICE_STATE;
    const parsed = JSON.parse(raw) as Partial<CChoiceState>;
    const candidates = Array.isArray(parsed.candidates)
      ? parsed.candidates.filter(isCKey).slice(0, 3)
      : [];
    const currentC = isCKey(parsed.currentC) ? parsed.currentC : null;
    return {
      ...DEFAULT_C_CHOICE_STATE,
      ...parsed,
      version: 1,
      candidates,
      currentC,
      reasonText: typeof parsed.reasonText === 'string' ? parsed.reasonText : '',
      desiredChangeText: typeof parsed.desiredChangeText === 'string' ? parsed.desiredChangeText : '',
      reflectionText: typeof parsed.reflectionText === 'string' ? parsed.reflectionText : '',
      reasonCluster: REASON_CLUSTERS.some((cluster) => cluster.key === parsed.reasonCluster)
        ? parsed.reasonCluster as ReasonCluster
        : null,
    };
  } catch {
    localStorage.removeItem(C_CHOICE_STORAGE_KEY);
    return DEFAULT_C_CHOICE_STATE;
  }
}

export function saveCChoiceState(state: CChoiceState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(C_CHOICE_STORAGE_KEY, JSON.stringify({
    ...state,
    version: 1,
    updatedAt: new Date().toISOString(),
  }));
}

function clientEventId(action: CChoiceAction, state: CChoiceState) {
  if (action === 'choice_started') return 'choice_started:v1';
  if (action === 'choice_completed') {
    return ['choice_completed', state.currentC ?? 'none', state.selectedAt ?? state.updatedAt ?? 'pending'].join(':');
  }
  if (action === 'first_quest_started') {
    return ['first_quest_started', state.currentC ?? 'none', state.firstQuestStartedAt ?? 'pending'].join(':');
  }
  if (action === 'first_quest_completed') {
    return ['first_quest_completed', state.currentC ?? 'none', state.firstQuestCompletedAt ?? 'pending'].join(':');
  }
  return 'get_state';
}

export type CChoiceAction =
  | 'get_state'
  | 'choice_started'
  | 'choice_completed'
  | 'first_quest_started'
  | 'first_quest_completed';

export async function sendCChoiceAction(
  action: CChoiceAction,
  state: CChoiceState,
  options: {
    bootstrap?: PwaBootstrap | null;
    source?: string;
  } = {},
) {
  const bootstrap = options.bootstrap ?? loadBootstrap();
  if (!sessionIsUsable(bootstrap) || !bootstrap?.session_token) {
    throw new Error('session_required');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/ace-c-choice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: bootstrap.session_token,
      action,
      client_event_id: action === 'get_state' ? null : clientEventId(action, state),
      source: options.source ?? 'ace',
      data: {
        candidates: state.candidates,
        current_c: state.currentC,
        reason_text: state.reasonText,
        reason_cluster: state.reasonCluster ?? 'unknown',
        desired_change_text: state.desiredChangeText,
        reflection_text: state.reflectionText,
        selected_at: state.selectedAt,
        first_quest_started_at: state.firstQuestStartedAt,
        first_quest_completed_at: state.firstQuestCompletedAt,
      },
    }),
    keepalive: action !== 'get_state',
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok !== true) {
    throw new Error(result?.error ?? `http_${response.status}`);
  }
  return result;
}
