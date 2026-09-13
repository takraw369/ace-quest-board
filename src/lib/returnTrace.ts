import { loadBootstrap, sessionIsUsable, SUPABASE_URL, type PwaBootstrap } from '@/lib/pwa';

export type ReturnMetrics = {
  return_count: number;
  last_latency_seconds: number | null;
  median_latency_seconds: number | null;
  last_completed_at: string | null;
};

export type ActiveReturn = {
  return_id: string;
  started_at: string;
};

export type ReturnState = {
  ok: boolean;
  active: ActiveReturn | null;
  metrics: ReturnMetrics;
};

type PendingCompletion = {
  return_id: string;
  completed_at: string;
};

const ACTIVE_KEY = 'flow:ace:return-active:v1';
const PENDING_KEY = 'flow:ace:return-pending:v1';
let flushPromise: Promise<ReturnState | null> | null = null;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function remove(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function loadActiveReturn() {
  return readJson<ActiveReturn | null>(ACTIVE_KEY, null);
}

function saveActiveReturn(active: ActiveReturn | null) {
  if (active) writeJson(ACTIVE_KEY, active);
  else remove(ACTIVE_KEY);
}

async function request(
  data: PwaBootstrap,
  action: 'status' | 'start' | 'complete',
  extra: Record<string, unknown> = {},
): Promise<ReturnState> {
  if (!sessionIsUsable(data) || !data.session_token) throw new Error('session_expired');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ace-return-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: data.session_token, action, ...extra }),
    keepalive: action === 'complete',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok !== true) throw new Error(result?.error ?? `http_${response.status}`);
  const state = result as ReturnState;
  saveActiveReturn(state.active ?? null);
  return state;
}

export async function fetchReturnState(data?: PwaBootstrap | null) {
  const bootstrap = data ?? loadBootstrap();
  if (!bootstrap || !sessionIsUsable(bootstrap)) return null;
  await flushPendingReturnCompletion(bootstrap);
  return request(bootstrap, 'status');
}

export async function startReturn(data?: PwaBootstrap | null) {
  const bootstrap = data ?? loadBootstrap();
  if (!bootstrap || !sessionIsUsable(bootstrap)) throw new Error('session_expired');
  const state = await request(bootstrap, 'start');
  if (state.active && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(12);
  return state;
}

export function completeReturnAfterQuest(data?: PwaBootstrap | null) {
  const bootstrap = data ?? loadBootstrap();
  const active = loadActiveReturn();
  if (!bootstrap || !sessionIsUsable(bootstrap) || !active) return Promise.resolve(null);

  const pending: PendingCompletion = {
    return_id: active.return_id,
    completed_at: new Date().toISOString(),
  };
  writeJson(PENDING_KEY, pending);
  return flushPendingReturnCompletion(bootstrap);
}

export function flushPendingReturnCompletion(data?: PwaBootstrap | null): Promise<ReturnState | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const bootstrap = data ?? loadBootstrap();
  const pending = readJson<PendingCompletion | null>(PENDING_KEY, null);
  if (!bootstrap || !sessionIsUsable(bootstrap) || !pending) return Promise.resolve(null);
  if (flushPromise) return flushPromise;

  flushPromise = request(bootstrap, 'complete', pending)
    .then((state) => {
      remove(PENDING_KEY);
      saveActiveReturn(state.active ?? null);
      return state;
    })
    .catch(() => null)
    .finally(() => {
      flushPromise = null;
    });
  return flushPromise;
}
