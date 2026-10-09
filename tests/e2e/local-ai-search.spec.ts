import { expect, test } from "@playwright/test";

test("ACE local search: keyword search is usable without model download", async ({ page }) => {
  const modelRequests: string[] = [];
  page.on("request", (request) => {
    if (/huggingface\.co|cdn\.jsdelivr\.net/.test(request.url())) modelRequests.push(request.url());
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/knowledge/local-search");
  await expect(page.getByRole("heading", { name: "自分の端末で、知識を探す。" })).toBeVisible();
  await expect(page.getByText("現在は通常検索モードです。")).toBeVisible();
  await expect(page.getByRole("button", { name: "端末内AIを起動" })).toBeVisible();

  await page.getByRole("searchbox", { name: "探したいこと" }).fill("身体活動");
  await page.getByRole("button", { name: "検索する" }).click();
  await expect(page.getByText("検索結果")).toBeVisible();
  await expect(page.getByRole("link", { name: /健康づくりのため、運動不足の人が最初に取る行動/ })).toBeVisible();
  expect(modelRequests).toHaveLength(0);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("ACE local search: suggestions lead to actual ACE routes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/knowledge");
  await page.getByRole("link", { name: "端末内AI検索（実験版）" }).click();
  await expect(page).toHaveURL(/\/knowledge\/local-search/);
  await page.getByRole("button", { name: "練習を振り返って成長したい" }).click();
  await expect(page.getByRole("heading", { name: "検索結果" })).toBeVisible();
  await expect(page.getByRole("link", { name: /ACE Athlete 練習日誌/ })).toHaveAttribute("href", "/athlete");
});
