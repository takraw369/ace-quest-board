import { expect, test } from '@playwright/test';

async function reachEnding(page: import('@playwright/test').Page, route: 'race' | 'care' = 'race') {
  await page.goto('/quest/stories/last-bell');
  await page.getByRole('button', { name: '今は考えず、続きを読んでみる' }).click();
  await page.getByRole('button', { name: route === 'race' ? 'RACE — 競走を手がかりに' : 'CARE — 気づかいを手がかりに' }).click();
  await page.getByRole('button', { name: 'ナギ本人に話を聞く' }).click();
  await expect(page.getByRole('heading', { name: 'あなたには、どう見えた？' })).toBeVisible();
}

test('自由な解釈を端末に保存・再読取・編集・削除できる', async ({ page }) => {
  await reachEnding(page);
  await expect(page.getByText('他の参加者には見えず')).toBeVisible();
  await page.getByLabel('コメントを書く').fill('止まった時間にも、別の意味があるかもしれない。');
  await page.getByRole('button', { name: 'この端末にコメントを残す' }).click();
  await expect(page.getByText('止まった時間にも、別の意味があるかもしれない。')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: '今は考えず、続きを読んでみる' }).click();
  await page.getByRole('button', { name: 'RACE — 競走を手がかりに' }).click();
  await page.getByRole('button', { name: 'ナギ本人に話を聞く' }).click();
  await expect(page.getByText('止まった時間にも、別の意味があるかもしれない。')).toBeVisible();

  await page.getByRole('button', { name: '編集', exact: true }).click();
  await page.getByLabel('コメントを編集').fill('あの4秒は、何を守った時間だったのだろう。');
  await page.getByRole('button', { name: '編集を保存' }).click();
  await expect(page.getByText('あの4秒は、何を守った時間だったのだろう。')).toBeVisible();
  await page.getByRole('button', { name: '削除', exact: true }).click();
  await page.getByRole('button', { name: '削除を確定' }).click();
  await expect(page.getByText('まだ記録はありません。')).toBeVisible();
});

test('物語の別ルートと320pxのコメント画面が動く', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await reachEnding(page, 'care');
  await expect(page.getByText('鈴と同じ青い糸', { exact: false })).toBeVisible();
  await page.getByLabel('コメントを書く').fill('別の読みを残してみる。');
  await page.getByRole('button', { name: 'この端末にコメントを残す' }).click();
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.viewport);
});
