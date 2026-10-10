import { expect, test } from "@playwright/test";

test.describe("ACE Knowledge Graph Explorer", () => {
  test("finds connected public ACE materials without loading an AI model", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.goto("/knowledge/graph-search");

    await expect(page.getByRole("heading", { name: "知識の「つながり」から探す。" })).toBeVisible();
    await page.getByRole("button", { name: "Questと成長記録" }).click();
    await expect(page.getByRole("heading", { name: "探索結果" })).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test("reads only same-browser Knowledge Canvas and exposes the manually connected path", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("ace-knowledge-canvas-v1", JSON.stringify({
        version: 1,
        title: "Test canvas",
        nodes: [
          { id: "a", title: "星空の復習ノート", body: "学びの確認", tags: ["復習"], x: 0, y: 0, type: "idea" },
          { id: "b", title: "深呼吸の体験", body: "呼吸を練習する", tags: [], x: 1, y: 0, type: "action" },
        ],
        edges: [{ id: "test-edge", source: "a", target: "b", label: "試して確かめる" }],
        viewport: { x: 0, y: 0, zoom: 1 },
        updatedAt: new Date().toISOString(),
      }));
    });
    await page.goto("/knowledge/graph-search");
    await expect(page.getByText("公開ACE教材 + Canvas 2件")).toBeVisible();
    await page.getByRole("searchbox", { name: "関係から探したいこと" }).fill("星空の復習ノート");
    await page.getByRole("button", { name: "関係を探索" }).click();
    await expect(page.getByRole("heading", { name: "星空の復習ノート" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "深呼吸の体験" })).toBeVisible();
    await expect(page.getByText("↓ 試して確かめる →", { exact: false })).toBeVisible();
  });
});
