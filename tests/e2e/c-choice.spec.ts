import { expect, test } from '@playwright/test';

const cChoiceKey = 'flow:ace:c-choice:v1';

test.beforeEach(async ({ context, baseURL }) => {
  const appOrigin = new URL(baseURL!).origin;
  await context.route('**/*', (route) => new URL(route.request().url()).origin === appOrigin
    ? route.continue()
    : route.abort());
});

test('C-Choice runs from discovery to First Quest on mobile without horizontal overflow', async ({ page }) => {
  await page.goto('/c-choice?source=e2e');

  await expect(page.getByText('人生に、')).toBeVisible();
  await page.getByRole('button', { name: '今のCを選ぶ', exact: true }).click();

  await page.getByRole('button', { name: /Challenge/ }).click();
  await page.getByRole('button', { name: /Creation/ }).click();
  await page.getByRole('button', { name: '2つから、今の1つを選ぶ', exact: true }).click();

  await page.getByRole('button', { name: /Challenge/ }).click();
  await page.getByRole('button', { name: 'このCで進む', exact: true }).click();

  await page.getByPlaceholder('例：ずっと止まっていたことに、そろそろ挑みたいと思ったから')
    .fill('止まっていたことに、もう一度挑みたいから');
  await page.getByRole('button', { name: '停滞を破りたい', exact: true }).click();
  await page.getByRole('button', { name: '次へ', exact: true }).click();

  await page.getByPlaceholder('例：仕事でもう一度、自分から動ける感じが戻りそう')
    .fill('自分から動く感覚が戻りそう');
  await page.getByRole('button', { name: '今のCを決める', exact: true }).click();

  await expect(page.getByText('今のあなたが選んだCは、')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Challenge', exact: true })).toBeVisible();
  await expect(page.getByText('あなたはChallengeタイプ', { exact: false })).toBeVisible();

  await page.getByRole('button', { name: '3分だけ、やってみる', exact: true }).click();
  await page.getByPlaceholder('気づいたこと・感じたことを一言').fill('少し動くだけで気持ちが変わった');
  await page.getByRole('button', { name: 'Quest完了', exact: true }).click();

  await expect(page.getByText('Cが、体験になった。')).toBeVisible();
  await expect(page.getByRole('link', { name: '次のQuestを見る →', exact: true }))
    .toHaveAttribute('href', '/quest-router?source=c-choice&c=challenge');

  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), cChoiceKey);
  expect(stored.currentC).toBe('challenge');
  expect(stored.candidates).toEqual(['challenge', 'creation']);
  expect(stored.reasonCluster).toBe('breakthrough');
  expect(stored.reasonText).toContain('もう一度挑みたい');
  expect(stored.firstQuestStartedAt).toBeTruthy();
  expect(stored.firstQuestCompletedAt).toBeTruthy();

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
});
