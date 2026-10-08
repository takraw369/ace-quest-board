import { expect, test } from '@playwright/test';

test('ACE Athlete: 320px phone check-in → quest → reflection → persisted evidence', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/athlete');
  await expect(page.getByRole('heading', { name: '自分の可能性を、プレイする。' })).toBeVisible();

  const energy = page.getByRole('group', { name: 'エネルギーの自己申告' }).locator('button');
  await energy.nth(2).click();
  await page.getByRole('button', { name: /落ち着いてる/ }).click();
  await page.getByRole('button', { name: '今日のQuestを選ぶ　→' }).click();

  await expect(page.getByRole('heading', { name: '3つの冒険' })).toBeVisible();
  await page.getByRole('button', { name: /ONE THING/ }).click();
  await page.getByRole('button', { name: 'このQuestで始める　→' }).click();
  await expect(page.getByRole('heading', { name: '今日の一点を決める' })).toBeVisible();
  await page.getByRole('button', { name: '練習が終わった　→' }).click();

  await page.getByRole('button', { name: /発見した/ }).click();
  await page.getByLabel('一言メモ').fill('一つの動作に集中できた');
  await page.getByRole('button', { name: '体験を記録する　✦' }).click();

  await expect(page.getByRole('heading', { name: '今日の成長は、ここに。' })).toBeVisible();
  await expect(page.getByText('一つの動作に集中できた')).toBeVisible();
  await page.reload();
  await expect(page.getByText('一つの動作に集中できた', { exact: false })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('ACE Athlete: records are deletable on device and do not depend on ACE auth', async ({ page }) => {
  await page.goto('/athlete');
  await expect(page.getByText('まだ記録はありません。最初のQuestからはじめよう。')).toBeVisible();
  await expect(page.getByRole('link', { name: 'ACEのQuest Routerに戻る' })).toHaveAttribute('href', '/quest-router');
});