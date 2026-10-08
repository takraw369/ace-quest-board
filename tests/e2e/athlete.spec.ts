import { expect, test } from '@playwright/test';

test('ACE Athlete journal: mobile check-in → practice note → reflection → reload', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/athlete');
  await expect(page.getByText('TRAINING JOURNAL · FIND YOUR FLOW')).toBeVisible();
  await expect(page.getByRole('heading', { name: /今日の練習が/ })).toBeVisible();

  await page.getByRole('button', { name: '◉ 練習前チェック' }).click();
  await expect(page.getByRole('heading', { name: '今の自分を、感じる。' })).toBeVisible();
  await page.getByRole('group', { name: 'エネルギー' }).getByRole('button', { name: '4' }).click();
  await page.getByRole('group', { name: '集中力' }).getByRole('button', { name: '5' }).click();
  await page.getByRole('button', { name: /SENSE/ }).click();
  await page.getByLabel('今日の目標').fill('力を抜いてプレー');
  await page.getByRole('button', { name: /チェックインを保存して練習へ/ }).click();

  await expect(page.getByRole('heading', { name: '練習を、未来の力に。' })).toBeVisible();
  await expect(page.getByLabel('意識したことをひとつ')).toHaveValue('力を抜いてプレー');
  await page.getByLabel('練習タイトル').fill('チーム練習');
  await page.getByLabel('練習時間（分）').fill('90');
  await page.getByLabel('練習メニューを追加').fill('ウォーミングアップ');
  await page.getByRole('button', { name: '＋追加' }).click();
  await page.getByRole('button', { name: 'ウォーミングアップを完了にする' }).click();
  await page.getByRole('group', { name: '主観的運動強度' }).getByRole('button', { name: '7' }).click();
  await page.getByLabel('メモ・気づき').fill('肩の力を抜けた');
  await page.getByRole('button', { name: /ノートを保存して振り返る/ }).click();

  await expect(page.getByRole('heading', { name: '今日の振り返り' })).toBeVisible();
  await page.getByLabel('良かったこと').fill('体が軽く感じた');
  await page.getByLabel('次に試したいこと').fill('姿勢を意識する');
  await page.getByRole('group', { name: '今日の自信度' }).getByRole('button', { name: '4' }).click();
  await page.getByRole('button', { name: /振り返りを保存する/ }).click();
  await expect(page.getByText('体が軽く感じた')).toBeVisible();

  await page.reload();
  await page.getByRole('navigation', { name: 'ACE Athleteメニュー' }).getByRole('button', { name: /成長/ }).click();
  await expect(page.getByText('体が軽く感じた')).toBeVisible();
  await expect(page.getByRole('button', { name: /チーム練習/ })).toBeVisible();
  await expect(page.getByText('90', { exact: false }).first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('ACE Athlete journal: legacy evidence preserved, existing ACE router available', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ace_athlete_sessions_v1', JSON.stringify([{
      id: 'old-1', userId: null, startedAt: '2026-09-10T09:00:00.000Z',
      finishedAt: '2026-09-10T10:00:00.000Z', energy: 3,
      focus: 'steady', questId: 'one', feeling: '発見した', note: '軸が安定した',
    }]));
  });
  await page.goto('/athlete');
  await page.getByRole('navigation', { name: 'ACE Athleteメニュー' }).getByRole('button', { name: /成長/ }).click();
  await expect(page.getByRole('heading', { name: '以前のQuest記録' })).toBeVisible();
  await expect(page.getByText(/軸が安定した/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'ACEのQuest Routerへ戻る' })).toHaveAttribute('href', '/quest-router');
});

test('ACE Athlete journal: note can be edited and removed with confirmation', async ({ page }) => {
  await page.goto('/athlete');
  await page.getByRole('button', { name: /練習ノートを書く/ }).click();
  await page.getByLabel('練習タイトル').fill('自主練');
  await page.getByRole('button', { name: /ノートを保存して振り返る/ }).click();
  await page.getByRole('button', { name: /ノートを編集する/ }).click();
  await page.getByLabel('練習タイトル').fill('自主練・改');
  await page.getByRole('button', { name: /ノートを保存して振り返る/ }).click();
  await expect(page.getByText('自主練・改', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'この記録を削除' }).click();
  await expect(page.getByRole('button', { name: '削除を確定する' })).toBeVisible();
  await page.getByRole('button', { name: '削除を確定する' }).click();
  await expect(page.getByText('記録すると、ここにあなたの成長が現れます。')).toBeVisible();
});