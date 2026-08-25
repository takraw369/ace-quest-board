import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from './__fixtures__/wantToFeed.json';
import {
  WANT_TO_CACHE_TTL_MS,
  clearWantToDataCache,
  getWantToData,
  normalizeWantToFeed,
} from './wantToData';
import { WANT_TO_SEED } from './wantToSeed';

afterEach(() => {
  clearWantToDataCache();
});

describe('normalizeWantToFeed', () => {
  it('normalizes Japanese and snake_case headers with visual fields', () => {
    const result = normalizeWantToFeed(fixture);

    expect(result).toMatchObject({
      updatedAt: '2026-08-25T12:34:56+09:00',
      sheet: 'Want to Master',
    });
    expect(result.items[0]).toEqual({
      id: 'W901',
      category: '旅・温泉',
      title: '雪の季節に乳頭温泉へ行く',
      source: '明示',
      tier: '上位',
      pin: 5,
      action: '冬の宿泊可能日を3日出す',
      prereq: ['W038', 'W092'],
      related: ['W039', 'W114'],
      imageUrl: 'https://images.example.com/nyuto-onsen.jpg',
      imageSource: 'example photographer',
      emoji: '♨️',
      icon: 'hot-spring',
      area: '東北',
      prefecture: '秋田県',
      lat: 39.8012,
      lng: 140.7995,
      budget: '50,000円',
      bestSeason: '12月〜3月',
      priority: 'S',
      status: 'NEXT',
      nextAction: '候補宿を3軒比較する',
      companion: '家族',
    });
  });

  it('uses safe defaults and drops invalid optional values', () => {
    const item = normalizeWantToFeed(fixture).items[1];

    expect(item).toMatchObject({
      id: 'W902',
      source: '探索候補',
      tier: '中間',
      pin: 5,
      prereq: ['W113', 'W115'],
      related: ['W037', 'W114'],
    });
    expect(item.priority).toBeUndefined();
    expect(item.lat).toBeUndefined();
  });

  it('rejects a payload without the feed rows contract', () => {
    expect(() => normalizeWantToFeed({ rows: 'not-an-array' })).toThrow(
      'rows array',
    );
  });
});

describe('getWantToData', () => {
  it('fetches the main sheet and reuses the result for ten minutes', async () => {
    let now = 1_000;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      expect(input).toBeDefined();
      return new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const options = {
      feedUrl: 'https://example.com/feed?token=public',
      fetcher,
      now: () => now,
    };

    const first = await getWantToData(options);
    now += WANT_TO_CACHE_TTL_MS - 1;
    const cached = await getWantToData(options);

    expect(first.source).toBe('feed');
    expect(cached).toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const requestedUrl = new URL(String(fetcher.mock.calls[0][0]));
    expect(requestedUrl.searchParams.get('sheet')).toBe('Want to Master');
    expect(requestedUrl.searchParams.get('token')).toBe('public');

    now += 2;
    await getWantToData(options);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('falls back to WANT_TO_SEED when the feed fails', async () => {
    const result = await getWantToData({
      feedUrl: 'https://example.com/feed',
      fetcher: async () => new Response(null, { status: 503 }),
    });

    expect(result.source).toBe('seed');
    expect(result.items).toEqual(WANT_TO_SEED);
    expect(result.error).toContain('503');
  });

  it('uses the seed without fetching when no URL is configured', async () => {
    const fetcher = vi.fn();
    const result = await getWantToData({ feedUrl: '', fetcher });

    expect(result.source).toBe('seed');
    expect(result.items).toHaveLength(WANT_TO_SEED.length);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
