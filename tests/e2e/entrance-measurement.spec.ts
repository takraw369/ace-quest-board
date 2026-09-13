import { expect, test } from '@playwright/test';

const bootstrapKey = 'flow:pwa:bootstrap:v1';
const queueKey = 'flow:ace:entrance-events:v2';

const connectedBootstrap = {
  ok: true,
  session_token: 'synthetic-session-never-sent-to-production',
  session_expires_at: '2099-01-01T00:00:00.000Z',
  profile: { display_name: 'テスト利用者' },
  ace: {
    scores: { BODY: 2.5, COGNITION: 3, EMOTION: 2, ACTION: 3.5 },
    result_axis: 'EMOTION',
  },
};

test.beforeEach(async ({ context, baseURL }) => {
  const appOrigin = new URL(baseURL!).origin;
  await context.route('**/*', (route) => new URL(route.request().url()).origin === appOrigin
    ? route.continue()
    : route.abort());
});

test('does not measure before data-use confirmation', async ({ page }) => {
  await page.goto('/onboarding');
  await page.locator('select').first().selectOption('成人期');

  await expect(page.getByRole('button', { name: '✦ WORLD SEEDを起動する', exact: true })).toBeDisabled();
  expect(await page.evaluate((key) => localStorage.getItem(key), queueKey)).toBeNull();
});

test('WORLD SEED activation queues only the gate milestone, not profile attributes', async ({ page }) => {
  await page.goto('/onboarding');
  await page.locator('select').first().selectOption('成人期');
  await page.getByPlaceholder('例：心と身体を整えながら、止まっている仕事を少し進めたい').fill('この本文は計測送信しない');
  await page.getByRole('button', { name: '5分', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '✦ WORLD SEEDを起動する', exact: true }).click();

  const queued = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), queueKey);
  expect(queued).toHaveLength(1);
  expect(queued[0].milestone).toBe('character_saved');
  expect(Object.keys(queued[0]).sort()).toEqual(['id', 'milestone', 'occurredAt']);
});

test('already-connected player queues gate progress without calibration details', async ({ page }) => {
  await page.addInitScript(({ key, bootstrap }) => {
    localStorage.setItem(key, JSON.stringify(bootstrap));
  }, { key: bootstrapKey, bootstrap: connectedBootstrap });

  await page.goto('/onboarding');
  await page.locator('select').first().selectOption('成人期');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '✦ WORLD SEEDを起動する', exact: true }).click();

  await expect.poll(async () => page.evaluate((key) => {
    const queue = JSON.parse(localStorage.getItem(key) ?? '[]');
    return queue.map((event: { milestone: string }) => event.milestone).sort();
  }, queueKey)).toEqual(['calibrated', 'character_saved', 'connected']);

  const queued = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), queueKey);
  for (const event of queued) {
    expect(Object.keys(event).sort()).toEqual(['id', 'milestone', 'occurredAt']);
  }
});
