import { loadBootstrap, sessionIsUsable, SUPABASE_URL, type PwaBootstrap } from '@/lib/pwa';

export type EntranceMilestone =
  | 'character_saved'
  | 'connected'
  | 'calibrated'
  | 'first_quest_selected';

type EntranceEvent = {
  id: string;
  milestone: EntranceMilestone;
  occurredAt: string;
};

type EntranceProfileContext = {
  dataUseAccepted: boolean;
  updatedAt: string;
};

const QUEUE_KEY = 'flow:ace:entrance-events:v2';
const SENT_KEY = 'flow:ace:entrance-sent:v2';

let flushPromise: Promise<void> | null = null;

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

function eventId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `entrance-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sentMilestones() {
  return readJson<EntranceMilestone[]>(SENT_KEY, []);
}

function queuedEvents() {
  return readJson<EntranceEvent[]>(QUEUE_KEY, []);
}

export function entranceMilestoneSeen(milestone: EntranceMilestone) {
  return sentMilestones().includes(milestone)
    || queuedEvents().some((event) => event.milestone === milestone);
}

export function queueEntranceMilestone(milestone: EntranceMilestone) {
  if (typeof window === 'undefined' || entranceMilestoneSeen(milestone)) return;

  const queue = queuedEvents();
  queue.push({
    id: eventId(),
    milestone,
    occurredAt: new Date().toISOString(),
  });
  writeJson(QUEUE_KEY, queue);

  const bootstrap = loadBootstrap();
  if (sessionIsUsable(bootstrap)) void flushEntranceMilestones(bootstrap);
}

export function captureConnectedEntranceState(
  profile: EntranceProfileContext,
  data?: PwaBootstrap | null,
) {
  if (!profile.dataUseAccepted || !profile.updatedAt) return;

  const bootstrap = data ?? loadBootstrap();
  if (!sessionIsUsable(bootstrap)) return;

  queueEntranceMilestone('connected');
  if (bootstrap?.ace?.scores && bootstrap?.ace?.result_axis) {
    queueEntranceMilestone('calibrated');
  }

  void flushEntranceMilestones(bootstrap);
}

async function flushEntranceMilestonesInternal(bootstrap: PwaBootstrap) {
  if (!bootstrap.session_token) return;

  while (true) {
    const queue = queuedEvents();
    const event = queue[0];
    if (!event) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ace-entrance-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: bootstrap.session_token,
          milestone: event.milestone,
          client_event_id: event.id,
          occurred_at: event.occurredAt,
        }),
        keepalive: true,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok !== true) return;

      const sent = new Set(sentMilestones());
      sent.add(event.milestone);
      writeJson(SENT_KEY, [...sent]);

      const latestQueue = queuedEvents();
      writeJson(QUEUE_KEY, latestQueue.filter((queued) => queued.id !== event.id));
    } catch {
      return;
    }
  }
}

export function flushEntranceMilestones(data?: PwaBootstrap | null) {
  if (typeof window === 'undefined') return Promise.resolve();
  const bootstrap = data ?? loadBootstrap();
  if (!sessionIsUsable(bootstrap) || !bootstrap?.session_token) return Promise.resolve();

  if (flushPromise) return flushPromise;
  flushPromise = flushEntranceMilestonesInternal(bootstrap).finally(() => {
    flushPromise = null;
  });
  return flushPromise;
}
