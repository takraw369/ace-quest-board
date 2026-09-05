import { expect, test } from '@playwright/test';

const storageKey = 'flow:pwa:bootstrap:v1';
const endpoint = '**/functions/v1/pwa-my-ace-evidence';
const bootstrap = {
  ok: true,
  session_token: 'synthetic-session-never-sent-to-production',
  session_expires_at: '2099-01-01T00:00:00.000Z',
  profile: { display_name: 'テスト利用者' },
};
const evidence = {
  id: 'synthetic-quest-1',
  recommendation_ref: 'quest:self_regulation:synthetic',
  metadata: { node_title: '呼吸を観察する', router_context: { want_context: { title: '落ち着いて一歩進む' } } },
  alternative: { duration: '3分Quest' },
  acted_at: '2026-09-05T00:00:00Z',
  outcome: { prediction: '落ち着けそう', actual: '肩の力が抜けた', reflection: '一呼吸から始める' },
};
const success = {
  ok: true,
  profile: bootstrap.profile,
  progress: { xp_total: 20, quests_completed: 1, streak_current: 1 },
  evidence: [evidence],
};

test.beforeEach(async ({ context, page, baseURL }) => {
  // No request from these synthetic sessions may reach a real API.
  // Allow only the app's assets, including when checking a deployed build.
  const appOrigin = new URL(baseURL!).origin;
  await context.route('**/*', (route) => new URL(route.request().url()).origin === appOrigin
    ? route.continue()
    : route.abort());
  await page.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
  }, { key: storageKey, data: bootstrap });
});

test('network failure is recoverable and never looks like empty history', async ({ page }) => {
  const unhandled: string[] = [];
  page.on('pageerror', (error) => unhandled.push(error.message));
  let recovered = false;
  await page.route(endpoint, async (route) => {
    // Strict Mode can mount the effect twice. Keep the outage active until retry.
    if (!recovered) return route.abort('failed');
    await route.fulfill({ json: success });
  });
  await page.goto('/my-ace/evidence');
  await expect(page.getByRole('button', { name: 'もう一度読み込む' })).toBeVisible();
  await expect(page.getByText('最初のEvidenceを作ろう。')).toHaveCount(0);
  recovered = true;
  await page.getByRole('button', { name: 'もう一度読み込む' }).click();
  await expect(page.getByText(evidence.outcome.reflection, { exact: true })).toBeVisible();
  expect(unhandled).toEqual([]);
});

for (const response of [
  { name: 'HTTP 500', status: 500, body: JSON.stringify({ ok: false }) },
  { name: 'non-JSON', status: 200, body: '<html>proxy error</html>' },
  { name: 'missing evidence', status: 200, body: JSON.stringify({ ok: true }) },
  { name: 'application error', status: 200, body: JSON.stringify({ ok: false, evidence: [] }) },
  { name: 'invalid evidence row', status: 200, body: JSON.stringify({ ok: true, evidence: [null] }) },
]) {
  test(`${response.name} shows an error without fabricated zero metrics`, async ({ page }) => {
    await page.route(endpoint, (route) => route.fulfill({ status: response.status, body: response.body }));
    await page.goto('/my-ace/evidence');
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'もう一度読み込む' })).toBeVisible();
    await expect(page.getByText('最初のEvidenceを作ろう。')).toHaveCount(0);
    await expect(page.getByText('STREAK', { exact: true })).toHaveCount(0);
  });
}

test('a stalled request times out and can be retried', async ({ page }) => {
  await page.clock.install();
  let requested = false;
  let recovered = false;
  await page.route(endpoint, async (route) => {
    requested = true;
    if (recovered) await route.fulfill({ json: success });
    // Leave the initial request pending until the application's timeout aborts it.
  });
  await page.goto('/my-ace/evidence');
  await expect.poll(() => requested).toBe(true);
  await page.clock.fastForward(16_000);
  await expect(page.getByRole('button', { name: 'もう一度読み込む' })).toBeVisible();
  await expect(page.getByText('最初のEvidenceを作ろう。')).toHaveCount(0);
  recovered = true;
  await page.getByRole('button', { name: 'もう一度読み込む' }).click();
  await expect(page.getByText(evidence.outcome.reflection, { exact: true })).toBeVisible();
});

test('server-rejected session offers reconnection and preserves local state', async ({ page }) => {
  await page.route(endpoint, (route) => route.fulfill({ status: 401, json: { ok: false, error: 'invalid_or_expired_session' } }));
  await page.goto('/my-ace/evidence');
  await expect(page.getByRole('link', { name: 'LINEと接続する' })).toBeVisible();
  await expect(page.getByText('最初のEvidenceを作ろう。')).toHaveCount(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey)).toEqual(bootstrap);
});

test('expired local session never requests evidence', async ({ page }) => {
  let requests = 0;
  await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify({ ok: true, session_token: 'expired', session_expires_at: '2020-01-01' })), storageKey);
  await page.route(endpoint, (route) => { requests += 1; return route.abort(); });
  await page.goto('/my-ace/evidence');
  await expect(page.getByRole('link', { name: 'LINEと接続する' })).toBeVisible();
  expect(requests).toBe(0);
});

test('verified empty history alone shows the first-Quest invitation', async ({ page }) => {
  await page.route(endpoint, (route) => route.fulfill({ json: { ...success, evidence: [], progress: { quests_completed: 0, xp_total: 0, streak_current: 0 } } }));
  await page.goto('/my-ace/evidence');
  await expect(page.getByText('最初のEvidenceを作ろう。')).toBeVisible();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
});

test('Quest completion reaches saved Evidence and next Quest on mobile', async ({ page }) => {
  let outcome: Record<string, string> | null = null;
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), {
    key: storageKey,
    data: { ...bootstrap, daily_quest: { status: 'available' }, recommendations: [{ ...evidence, recommendation_type: 'quest', status: 'proposed' }] },
  });
  await page.route('**/functions/v1/pwa-growth-action', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.action).toBe('quest_complete');
    expect(body.recommendation_id).toBe(evidence.id);
    outcome = body.data;
    await route.fulfill({ json: { ok: true, xp: { xp_amount: 20 }, progress: success.progress, daily_quest: { status: 'completed', next_unlock_at: '2026-09-06T05:00:00+09:00' } } });
  });
  await page.route('**/functions/v1/pwa-refresh-recommendations', (route) => route.fulfill({ json: { ok: true, daily_quest: { status: 'completed' }, recommendations: [] } }));
  await page.route('**/functions/v1/pwa-deepening-content', (route) => route.fulfill({ json: { ok: true, unlocked: true, items: [] } }));
  await page.route(endpoint, (route) => route.fulfill({ json: { ...success, evidence: [{ ...evidence, outcome }] } }));
  await page.goto('/quest');
  await page.getByPlaceholder('予想を書く').fill(evidence.outcome.prediction);
  await page.getByPlaceholder('実際の結果を書く').fill(evidence.outcome.actual);
  await page.getByPlaceholder('気づきを書く').fill(evidence.outcome.reflection);
  await page.getByRole('button', { name: 'Quest完了・記録する' }).click();
  await expect(page.getByText('+20 XP', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '体験のEvidenceを見る →' }).click();
  for (const value of Object.values(evidence.outcome)) await expect(page.getByText(value, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '次のQuestへ →' })).toHaveAttribute('href', '/quest-router?source=evidence');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
