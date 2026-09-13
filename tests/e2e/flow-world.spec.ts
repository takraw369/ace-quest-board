import { expect, test } from '@playwright/test';

const bootstrapKey = 'flow:pwa:bootstrap:v1';

function bootstrap(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    session_token: 'synthetic-session',
    session_expires_at: '2099-01-01T00:00:00.000Z',
    profile: { display_name: 'テスト利用者', lifecycle_stage: 'registered' },
    progress: {
      xp_total: 0,
      growth_level: 1,
      growth_rank: 'seed',
      streak_current: 0,
      actions_completed: 0,
      quests_completed: 0,
      education_completed: 0,
    },
    recommendations: [],
    ...overrides,
  };
}

test.beforeEach(async ({ context, baseURL }) => {
  const appOrigin = new URL(baseURL!).origin;
  await context.route('**/*', (route) => new URL(route.request().url()).origin === appOrigin
    ? route.continue()
    : route.abort());
});

test('new player sees a dormant WORLD 00 without invented progress', async ({ page }) => {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: bootstrapKey,
    value: bootstrap(),
  });

  await page.goto('/today');

  const world = page.getByTestId('flow-world-map');
  await expect(world).toHaveAttribute('data-world', 'WORLD 00');
  await expect(page.getByText('世界は、まだ静かに眠っている。')).toBeVisible();
  await expect(page.getByTestId('flow-world-lit-count')).toHaveText('0/5 PATHS LIT');

  for (const node of ['action', 'quest', 'learn', 'people', 'next']) {
    await expect(page.locator(`[data-world-node="${node}"]`)).toHaveAttribute('data-lit', 'false');
  }
});

test('real actions, quests, learning and routes light the FLOW WORLD', async ({ page }) => {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: bootstrapKey,
    value: bootstrap({
      progress: {
        xp_total: 180,
        growth_level: 3,
        growth_rank: 'leaf',
        streak_current: 2,
        actions_completed: 4,
        quests_completed: 2,
        education_completed: 1,
      },
      daily_quest: { status: 'completed' },
      recommendations: [
        { id: 'q1', recommendation_type: 'quest', destination: '/quest', reason: '次の実験', alternative: { duration: '5分Quest' } },
        { id: 'p1', recommendation_type: 'connection', destination: '/people', reason: '違う視点に会う' },
      ],
    }),
  });

  await page.goto('/today');

  const world = page.getByTestId('flow-world-map');
  await expect(world).toHaveAttribute('data-world', 'WORLD 03');
  await expect(page.getByText('世界が、少しずつ広がっている。')).toBeVisible();
  await expect(page.getByTestId('flow-world-lit-count')).toHaveText('5/5 PATHS LIT');

  for (const node of ['action', 'quest', 'learn', 'people', 'next']) {
    await expect(page.locator(`[data-world-node="${node}"]`)).toHaveAttribute('data-lit', 'true');
  }

  await expect(page.getByRole('link', { name: '次の光へ →', exact: true })).toHaveAttribute('href', '/quest');
});
