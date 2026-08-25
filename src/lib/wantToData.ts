import {
  WANT_TO_SEED,
  type WantSource,
  type WantTier,
  type WantToSeed,
} from './wantToSeed';

export const WANT_TO_CACHE_TTL_MS = 10 * 60 * 1000;
export const WANT_TO_MASTER_SHEET = 'Want to Master';

export type WantToPriority = 'S' | 'A' | 'B' | 'C';

export type WantTo = WantToSeed & {
  imageUrl?: string;
  imageSource?: string;
  emoji?: string;
  icon?: string;
  area?: string;
  prefecture?: string;
  lat?: number;
  lng?: number;
  budget?: string;
  bestSeason?: string;
  priority?: WantToPriority;
  status?: string;
  nextAction?: string;
  companion?: string;
};

export type NormalizedWantToFeed = {
  updatedAt: string | null;
  sheet: string;
  items: WantTo[];
};

export type WantToData = NormalizedWantToFeed & {
  source: 'feed' | 'seed';
  error?: string;
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type WantToDataOptions = {
  feedUrl?: string | null;
  fetcher?: FetchLike;
  cacheTtlMs?: number;
  now?: () => number;
};

type CachedFeed = {
  expiresAt: number;
  data: WantToData;
};

const feedCache = new Map<string, CachedFeed>();
const inFlightRequests = new Map<string, Promise<WantToData>>();

const FIELD_ALIASES = {
  id: ['id', 'want id', 'want_id', '親want id'],
  category: ['category', 'カテゴリ', 'ジャンル'],
  title: ['title', 'want to', 'want_to', 'want', 'やりたいこと'],
  source: ['source', '確度', '由来'],
  tier: ['tier', '階層'],
  pin: ['pin', '中心ピン', 'センターピン'],
  action: ['action', 'clear / action', 'clear_action', '次の一歩'],
  prereq: ['prereq', 'prerequisite', '前提'],
  related: ['related', '関連', '関連want'],
  imageUrl: ['image_url', 'image url', '画像url'],
  imageSource: ['image_source', 'image source', '画像出典'],
  emoji: ['emoji', '絵文字'],
  icon: ['icon', 'アイコン'],
  area: ['area', 'エリア', '地域'],
  prefecture: ['prefecture', '都道府県'],
  lat: ['lat', 'latitude', '緯度'],
  lng: ['lng', 'lon', 'longitude', '経度'],
  budget: ['budget', '予算'],
  bestSeason: ['best_season', 'best season', 'ベストシーズン', '時期'],
  priority: ['priority', '優先度'],
  status: ['status', 'ステータス', '状態'],
  nextAction: ['next_action', 'next action', '次のアクション'],
  companion: ['companion', '同伴候補', '誰と'],
} as const;

const WANT_SOURCES: WantSource[] = ['明示', 'AI推定', '探索候補'];
const WANT_TIERS: WantTier[] = ['前提', '中間', '上位'];
const WANT_PRIORITIES: WantToPriority[] = ['S', 'A', 'B', 'C'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\/・:：()（）]+/g, '');
}

function indexRow(row: Record<string, unknown>): Map<string, unknown> {
  return new Map(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
  );
}

function readField(
  row: Map<string, unknown>,
  aliases: readonly string[],
): unknown {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (row.has(key)) return row.get(key);
  }
  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(toStringList);
  }
  const text = toStringValue(value);
  return text
    ? text.split(/[\s,、;；|]+/).map((item) => item.trim()).filter(Boolean)
    : [];
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPin(value: unknown): number {
  if (typeof value === 'string' && value.includes('★')) {
    return Math.min(5, value.match(/★/g)?.length ?? 0);
  }
  const parsed = toOptionalNumber(value);
  return parsed === undefined ? 0 : Math.min(5, Math.max(0, Math.round(parsed)));
}

function toEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const normalized = toStringValue(value);
  return normalized && allowed.includes(normalized as T)
    ? (normalized as T)
    : fallback;
}

function toPriority(value: unknown): WantToPriority | undefined {
  const normalized = toStringValue(value)?.toUpperCase();
  return normalized && WANT_PRIORITIES.includes(normalized as WantToPriority)
    ? (normalized as WantToPriority)
    : undefined;
}

export function normalizeWantToRow(
  value: unknown,
  defaultCategory = '未分類',
): WantTo | null {
  if (!isRecord(value)) return null;

  const row = indexRow(value);
  const id = toStringValue(readField(row, FIELD_ALIASES.id));
  const title = toStringValue(readField(row, FIELD_ALIASES.title));
  if (!id || !title) return null;

  return {
    id,
    category:
      toStringValue(readField(row, FIELD_ALIASES.category)) ?? defaultCategory,
    title,
    source: toEnum(
      readField(row, FIELD_ALIASES.source),
      WANT_SOURCES,
      '探索候補',
    ),
    tier: toEnum(readField(row, FIELD_ALIASES.tier), WANT_TIERS, '中間'),
    pin: toPin(readField(row, FIELD_ALIASES.pin)),
    action: toStringValue(readField(row, FIELD_ALIASES.action)) ?? '',
    prereq: toStringList(readField(row, FIELD_ALIASES.prereq)),
    related: toStringList(readField(row, FIELD_ALIASES.related)),
    imageUrl: toStringValue(readField(row, FIELD_ALIASES.imageUrl)),
    imageSource: toStringValue(readField(row, FIELD_ALIASES.imageSource)),
    emoji: toStringValue(readField(row, FIELD_ALIASES.emoji)),
    icon: toStringValue(readField(row, FIELD_ALIASES.icon)),
    area: toStringValue(readField(row, FIELD_ALIASES.area)),
    prefecture: toStringValue(readField(row, FIELD_ALIASES.prefecture)),
    lat: toOptionalNumber(readField(row, FIELD_ALIASES.lat)),
    lng: toOptionalNumber(readField(row, FIELD_ALIASES.lng)),
    budget: toStringValue(readField(row, FIELD_ALIASES.budget)),
    bestSeason: toStringValue(readField(row, FIELD_ALIASES.bestSeason)),
    priority: toPriority(readField(row, FIELD_ALIASES.priority)),
    status: toStringValue(readField(row, FIELD_ALIASES.status)),
    nextAction: toStringValue(readField(row, FIELD_ALIASES.nextAction)),
    companion: toStringValue(readField(row, FIELD_ALIASES.companion)),
  };
}

export function normalizeWantToFeed(value: unknown): NormalizedWantToFeed {
  if (!isRecord(value) || !Array.isArray(value.rows)) {
    throw new TypeError('Want to feed must contain a rows array.');
  }

  const sheet = toStringValue(value.sheet) ?? WANT_TO_MASTER_SHEET;
  const items = value.rows
    .map((row) => normalizeWantToRow(row, sheet))
    .filter((row): row is WantTo => row !== null);

  if (value.rows.length > 0 && items.length === 0) {
    throw new TypeError('Want to feed contains no valid rows.');
  }

  return {
    updatedAt: toStringValue(value.updatedAt) ?? null,
    sheet,
    items,
  };
}

function seedFallback(error?: unknown): WantToData {
  return {
    source: 'seed',
    updatedAt: null,
    sheet: WANT_TO_MASTER_SHEET,
    items: WANT_TO_SEED.map((item) => ({
      ...item,
      prereq: [...item.prereq],
      related: [...item.related],
    })),
    ...(error === undefined ? {} : { error: errorMessage(error) }),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Want to feed request failed.';
}

function buildFeedUrl(feedUrl: string): string {
  const url = new URL(feedUrl);
  if (!url.searchParams.has('sheet') && !url.searchParams.has('all')) {
    url.searchParams.set('sheet', WANT_TO_MASTER_SHEET);
  }
  return url.toString();
}

async function requestFeed(
  requestUrl: string,
  fetcher: FetchLike,
): Promise<WantToData> {
  try {
    const response = await fetcher(requestUrl, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Want to feed request failed (${response.status}).`);
    }
    const normalized = normalizeWantToFeed(await response.json());
    return { ...normalized, source: 'feed' };
  } catch (error) {
    return seedFallback(error);
  }
}

export async function getWantToData(
  options: WantToDataOptions = {},
): Promise<WantToData> {
  const feedUrl =
    options.feedUrl === undefined
      ? process.env.NEXT_PUBLIC_WANT_TO_FEED_URL
      : options.feedUrl;
  const normalizedFeedUrl = feedUrl?.trim();
  if (!normalizedFeedUrl) return seedFallback();

  let requestUrl: string;
  try {
    requestUrl = buildFeedUrl(normalizedFeedUrl);
  } catch (error) {
    return seedFallback(error);
  }

  const now = options.now?.() ?? Date.now();
  const cached = feedCache.get(requestUrl);
  if (cached && cached.expiresAt > now) return cached.data;

  const inFlight = inFlightRequests.get(requestUrl);
  if (inFlight) return inFlight;

  const cacheTtlMs = options.cacheTtlMs ?? WANT_TO_CACHE_TTL_MS;
  const request = requestFeed(requestUrl, options.fetcher ?? fetch)
    .then((data) => {
      if (data.source === 'feed') {
        feedCache.set(requestUrl, {
          expiresAt: (options.now?.() ?? Date.now()) + cacheTtlMs,
          data,
        });
      }
      return data;
    })
    .finally(() => {
      inFlightRequests.delete(requestUrl);
    });

  inFlightRequests.set(requestUrl, request);
  return request;
}

export function clearWantToDataCache(): void {
  feedCache.clear();
  inFlightRequests.clear();
}
