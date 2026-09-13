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
  payload: Record<string, unknown>;
};

const QUEUE_KEY = 'flow:ace:entrance-events:v1';
const SENT_KEY = 'flow:ace:entrance-sent:v1';

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

export function entranceMilestoneSeen(milestone: EntranceMilestone) {
  const sent = readJson<EntranceMilestone[]>(SENT_KEY, []);
  const queue = readJson<EntranceEvent[]>(QUEUE_KEY, []);
  return sent.includes(milestone) || queue.some((event) => event.milestone === milestone);
}

export function queueEntranceMilestone(
  milestone: EntranceMilestone,
  payload: Record<string, unknown> = {},
) {
  if (typeof window === 'undefined' || entranceMilestoneSeen(milestone)) return;

  const queue = readJson<EntranceEvent[]>(QUEUE_KEY, []);
  queue.push({
    id: eventId(),
    milestone,
    occurredAt: new Date().toISOString(),
    payload,
  });
  writeJson(QUEUE_KEY, queue);

  const bootstrap = loadBootstrap();
  if (sessionIsUsable(bootstrap)) void flushEntranceMilestones(bootstrap);
}

export async function flushEntranceMilestones(data?: PwaBootstrap | null) {
  if (typeof window === 'undefined') return;
  const bootstrap = data ?? loadBootstrap();
  if (!sessionIsUsable(bootstrap) || !bootstrap?.session_token) return;

  let queue = readJson<EntranceEvent[]>(QUEUE_KEY, []);
  if (queue.length === 0) return;

  const sent = new Set(readJson<EntranceMilestone[]>(SENT_KEY, []));

  for (const event of [...queue]) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/pwa-growth-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: bootstrap.session_token,
          action: 'entrance_event',
          recommendation_id: null,
          data: {
            client_event_id: event.id,
            milestone: event.milestone,
            occurred_at: event.occurredAt,
            ...event.payload,
          },
        }),
        keepalive: true,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok !== true) break;

      sent.add(event.milestone);
      queue = queue.filter((queued) => queued.id !== event.id);
      writeJson(SENT_KEY, [...sent]);
      writeJson(QUEUE_KEY, queue);
    } catch {
      break;
    }
  }
}
