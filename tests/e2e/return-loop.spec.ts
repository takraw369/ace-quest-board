import { expect, test } from '@playwright/test';

const bootstrapKey = 'flow:pwa:bootstrap:v1';
const onboardingKey = 'flow:ace:onboarding:v1';
const activeReturnKey = 'flow:ace:return-active:v1';
const pendingReturnKey = 'flow:ace:return-pending:v1';

const connectedBootstrap = {
  ok: true,
  session_token: 'synthetic-session-never-sent-to-production',
  session_expires_at: '2099-01-01T00:00:00.000Z',
  profile: { display_name: 'テスト利用者', lifecycle_stage: 'registered' },
  progress: {
    xp_total: 20,
    growth_level: 1,
    growth_rank: 'seed',
    streak_current: 0,
    actions_completed: 1,
    quests_completed: 0,
    education_completed: 0,
  },
  daily_quest: { status: 'available' },
  recommendations: [],
};

const consentedOnboarding = {
  version: 1,
  ageBand: '成人期',
  direction: '',
  timeBudgetMinutes: 10,
  attentionLevel: 'light',
  dataUseAccepted: true,
  updatedAt: '2026-09-13T05:00:00.000Z',
  completedAt: null,
};

test.beforeEach(async ({ context, baseURL }) => {
  const appOrigin = new URL(baseURL!).origin;
  await context.route('**/*', (route) => new URL(route.request().url()).origin === appOrigin
    ? route.continue()
    : route.abort());
});

test('Return Path starts only by explicit choice and opens a 3-minute return route', async ({ page }) => {
  await page.addInitScript(({ bKey, oKey, bootstrap, onboarding }) => {
    localStorage.setItem(bKey, JSON.stringify(bootstrap));
    localStorage.setItem(oKey, JSON.stringify(onboarding));
  }, { bKey: bootstrapKey, oKey: onboardingKey, bootstrap: connectedBootstrap, onboarding: consentedOnboarding });

  await page.route('**/functions/v1/ace-return-event', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    if (body.action === 'start') {
      await route.fulfill({ json: {
        ok: true,
        active: { return_id: 'return-1', started_at: '2026-09-13T05:30:00.000Z' },
        metrics: { return_count: 2, last_latency_seconds: 5400, median_latency_seconds: 3600, last_completed_at: '2026-09-12T05:00:00.000Z' },
      } });
      return;
    }
    await route.fulfill({ json: {
      ok: true,
      active: null,
      metrics: { return_count: 2, last_latency_seconds: 5400, median_latency_seconds: 3600, last_completed_at: '2026-09-12T05:00:00.000Z' },
    } });
  });

  await page.goto('/today');
  await expect(page.getByTestId('return-path-idle')).toBeVisible();
  await expect(page.getByText('ちょっと、流れ止まってる？')).toBeVisible();
  await expect(page.getByText('2', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '戻るモードを始める →', exact: true }).click();

  await expect(page.getByTestId('return-path-active')).toBeVisible();
  await expect(page.getByText('戻る1mmを、ひとつ。')).toBeVisible();
  await expect(page.getByRole('link', { name: '3分の戻るQuestを選ぶ →', exact: true }))
    .toHaveAttribute('href', '/quest-router?source=return&minutes=3&attention=light');
});

test('completing a Quest closes an active Return and records the same return id', async ({ page }) => {
  const questBootstrap = {
    ...connectedBootstrap,
    recommendations: [{
      id: 'quest-1',
      recommendation_type: 'quest',
      recommendation_ref: 'quest:return:test',
      reason: '戻るための最小Quest',
      status: 'proposed',
      metadata: { node_title: '戻る1mm' },
      alternative: { duration: '3分Quest', experiment: { action: '深呼吸を3回する' } },
    }],
  };
  await page.addInitScript(({ bKey, aKey, bootstrap, active }) => {
    localStorage.setItem(bKey, JSON.stringify(bootstrap));
    localStorage.setItem(aKey, JSON.stringify(active));
  }, {
    bKey: bootstrapKey,
    aKey: activeReturnKey,
    bootstrap: questBootstrap,
    active: { return_id: 'return-77', started_at: '2026-09-13T05:30:00.000Z' },
  });

  await page.route('**/functions/v1/pwa-growth-action', (route) => route.fulfill({ json: {
    ok: true,
    xp: { xp_amount: 20 },
    progress: { xp_total: 40, growth_level: 1, growth_rank: 'seed', streak_current: 1, actions_completed: 2, quests_completed: 1, education_completed: 0 },
    daily_quest: { status: 'completed', next_unlock_at: '2026-09-14T05:00:00+09:00' },
  } }));
  await page.route('**/functions/v1/pwa-refresh-recommendations', (route) => route.fulfill({ json: {
    ok: true,
    daily_quest: { status: 'completed', next_unlock_at: '2026-09-14T05:00:00+09:00' },
    recommendations: [],
  } }));
  await page.route('**/functions/v1/pwa-deepening-content', (route) => route.fulfill({ json: { ok: true, unlocked: true, items: [] } }));

  let returnRequest: Record<string, unknown> | null = null;
  await page.route('**/functions/v1/ace-return-event', async (route) => {
    returnRequest = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({ json: {
      ok: true,
      active: null,
      metrics: { return_count: 3, last_latency_seconds: 1800, median_latency_seconds: 3600, last_completed_at: '2026-09-13T06:00:00.000Z' },
    } });
  });

  await page.goto('/quest');
  await page.getByPlaceholder('実際の結果を書く').fill('呼吸できた');
  await page.getByPlaceholder('気づきを書く').fill('小さくなら戻れた');
  await page.getByRole('button', { name: 'Quest完了・記録する' }).click();

  await expect(page.getByText('WORLD UPDATED', { exact: true })).toBeVisible();
  await expect.poll(() => returnRequest).not.toBeNull();
  expect(returnRequest).toMatchObject({ action: 'complete', return_id: 'return-77' });

  await expect.poll(async () => page.evaluate((key) => localStorage.getItem(key), activeReturnKey)).toBeNull();
  await expect.poll(async () => page.evaluate((key) => localStorage.getItem(key), pendingReturnKey)).toBeNull();
});
