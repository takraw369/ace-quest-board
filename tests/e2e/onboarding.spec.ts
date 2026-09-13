import { expect, test } from '@playwright/test';

const bootstrapKey = 'flow:pwa:bootstrap:v1';
const onboardingKey = 'flow:ace:onboarding:v1';

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

test('Character Create saves current chapter and keeps Quest locked before connection', async ({ page }) => {
  await page.goto('/onboarding');

  await page.locator('select').first().selectOption('成人期');
  await page.getByPlaceholder('例：心と身体を整えながら、止まっている仕事を少し進めたい').fill('身体を整えながら仕事を一歩進めたい');
  await page.getByRole('button', { name: '5分', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'この現在地から始める', exact: true }).click();

  await expect(page.getByRole('status')).toContainText('現在地を保存しました');
  await expect(page.getByRole('link', { name: 'LINEと接続する', exact: true })).toHaveAttribute('href', '/connect/line?next=/onboarding');
  await expect(page.getByText('「現在地を保存」＋「LINE接続」で解放されます。')).toBeVisible();

  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), onboardingKey);
  expect(stored.ageBand).toBe('成人期');
  expect(stored.timeBudgetMinutes).toBe(5);
  expect(stored.direction).toContain('仕事を一歩');
  expect(stored.dataUseAccepted).toBe(true);
});

test('connected and calibrated player carries Character Create into Quest Router', async ({ page }) => {
  await page.addInitScript(({ bKey, oKey, bootstrap, onboarding }) => {
    localStorage.setItem(bKey, JSON.stringify(bootstrap));
    localStorage.setItem(oKey, JSON.stringify(onboarding));
  }, {
    bKey: bootstrapKey,
    oKey: onboardingKey,
    bootstrap: connectedBootstrap,
    onboarding: {
      version: 1,
      ageBand: '成人期',
      direction: '整えてから挑戦する',
      timeBudgetMinutes: 10,
      attentionLevel: 'focused',
      dataUseAccepted: true,
      updatedAt: '2026-09-13T00:00:00.000Z',
    },
  });

  await page.goto('/onboarding');

  await expect(page.getByText('本人データとつながった')).toBeVisible();
  await expect(page.getByText('今の身体・認知・感情・行動を観察済み')).toBeVisible();
  const firstQuest = page.getByRole('link', { name: '最初のQuestを選ぶ →', exact: true });
  await expect(firstQuest).toBeVisible();
  await expect(firstQuest).toHaveAttribute('href', /\/quest-router\?source=onboarding.*age=/);

  await firstQuest.click();
  await expect(page).toHaveURL(/\/quest-router\?source=onboarding/);
  await expect(page.getByText('CHARACTER CREATEから引き継ぎ済み')).toBeVisible();
  await expect(page.locator('select').first()).toHaveValue('成人期');
  await expect(page.getByPlaceholder('例：心と身体を整えながら、やるべき一歩を進めたい')).toHaveValue('整えてから挑戦する');
  await expect(page.getByRole('button', { name: '10分', exact: true })).toHaveClass(/bg-\[#d9c18d\]/);
  await expect(page.getByRole('button', { name: /向き合える/ })).toHaveClass(/bg-\[#789581\]\/10/);
});

test('Calibration opened from onboarding keeps a visible return path', async ({ page }) => {
  await page.goto('/calibration?next=/onboarding');
  await expect(page.getByRole('link', { name: '← Character Createへ戻る', exact: true })).toHaveAttribute('href', '/onboarding');
});
