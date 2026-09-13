import { expect, test } from '@playwright/test';

const storageKey = 'flow:pwa:bootstrap:v1';

const quest = {
  id: 'quest-1',
  recommendation_type: 'quest',
  recommendation_ref: 'quest:self_regulation:test',
  reason: '今できる小さな実験',
  status: 'proposed',
  metadata: { node_title: '呼吸を観察する' },
  alternative: {
    duration: '3分Quest',
    experiment: { action: '呼吸を3回観察する' },
  },
};

const bootstrap = {
  ok: true,
  session_token: 'synthetic-session-never-sent-to-production',
  session_expires_at: '2099-01-01T00:00:00.000Z',
  profile: { display_name: 'テスト利用者' },
  progress: {
    xp_total: 0,
    growth_level: 1,
    growth_rank: 'seed',
    streak_current: 0,
    actions_completed: 0,
    quests_completed: 0,
    education_completed: 0,
  },
  daily_quest: { status: 'available' },
  recommendations: [quest],
};

test.beforeEach(async ({ context, page, baseURL }) => {
  const appOrigin = new URL(baseURL!).origin;
  await context.route('**/*', (route) => new URL(route.request().url()).origin === appOrigin
    ? route.continue()
    : route.abort());
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), {
    key: storageKey,
    data: bootstrap,
  });
});

test('Quest completion adds a visible trace to Quest Ridge', async ({ page }) => {
  await page.route('**/functions/v1/pwa-growth-action', (route) => route.fulfill({
    json: {
      ok: true,
      xp: { xp_amount: 20 },
      progress: {
        xp_total: 20,
        growth_level: 1,
        growth_rank: 'seed',
        streak_current: 1,
        actions_completed: 1,
        quests_completed: 1,
        education_completed: 0,
      },
      daily_quest: { status: 'completed', next_unlock_at: '2026-09-14T05:00:00+09:00' },
    },
  }));
  await page.route('**/functions/v1/pwa-refresh-recommendations', (route) => route.fulfill({
    json: {
      ok: true,
      daily_quest: { status: 'completed', next_unlock_at: '2026-09-14T05:00:00+09:00' },
      recommendations: [
        { id: 'learn-1', recommendation_type: 'education', recommendation_ref: 'node-1', reason: '体験を学びに変える' },
        { id: 'people-1', recommendation_type: 'connection', recommendation_ref: 'people-1', reason: '別の視点に会う' },
      ],
    },
  }));
  await page.route('**/functions/v1/pwa-deepening-content', (route) => route.fulfill({
    json: { ok: true, unlocked: true, items: [] },
  }));

  await page.goto('/quest');
  await page.getByPlaceholder('実際の結果を書く').fill('少し肩の力が抜けた');
  await page.getByPlaceholder('気づきを書く').fill('一呼吸でも状態は変わる');
  await page.getByRole('button', { name: 'Quest完了・記録する' }).click();

  await expect(page.getByText('WORLD UPDATED', { exact: true })).toBeVisible();
  await expect(page.getByText('Questが、世界に残った。', { exact: true })).toBeVisible();
  await expect(page.getByTestId('world-new-trace')).toContainText('NEW TRACE · QUEST RIDGE');
  await expect(page.getByTestId('world-new-trace')).toContainText('挑戦の丘に、今日のQuestの軌跡が刻まれた。');
  await expect(page.locator('[data-world-node="quest"]')).toHaveAttribute('data-new-trace', 'true');
  await expect(page.locator('[data-world-node="quest"]')).toHaveAttribute('data-lit', 'true');
  await expect(page.getByRole('link', { name: '体験のEvidenceを見る →', exact: true })).toHaveAttribute('href', '/my-ace/evidence');
  await expect(page.getByRole('link', { name: 'FLOW WORLDへ戻る', exact: true })).toHaveAttribute('href', '/today');
});
