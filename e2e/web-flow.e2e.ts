import { expect, test } from "@playwright/test";

test.describe("Web UI flow", () => {
  test("search -> load selected -> saves recent", async ({ page }) => {
    await page.goto("/");

    await page.fill("#courseQuery", "simple");
    await page.click("#searchCourseBtn");

    await expect(page.locator("#courseStatus")).toContainText("Found 1 course(s)");
    await expect(page.locator("#courseResults option")).toContainText("Simple Par 72");

    await page.click("#loadCourseBtn");
    await expect(page.locator("#recentCourses option")).toContainText("Simple Par 72");
    await expect(page.locator("#summary")).toContainText("Simple Par 72");

    await page.fill("#seed", "99");
    await page.fill("#handicap", "8");
    await page.click("#simulateBtn");
    await expect(page.locator("#settlement")).toContainText("By Team");
    await expect(page.locator("#holeRows tr")).toHaveCount(18);
  });

  test("recent courses persist across reload", async ({ page }) => {
    await page.goto("/");

    await page.fill("#courseQuery", "simple");
    await page.click("#searchCourseBtn");
    await page.click("#loadCourseBtn");
    await expect(page.locator("#recentCourses option")).toContainText("Simple Par 72");

    await page.reload();
    await expect(page.locator("#recentCourses option")).toContainText("Simple Par 72");
  });

  test("no-results search shows clear error state", async ({ page }) => {
    await page.goto("/");

    await page.fill("#courseQuery", "this-course-does-not-exist");
    await page.click("#searchCourseBtn");

    await expect(page.locator("#courseStatus")).toContainText("No courses found");
    await expect(page.locator("#courseStatus")).toHaveClass(/error/);
    await expect(page.locator("#courseResults option")).toContainText("No results");
  });

  test("load more appends additional search results", async ({ page }) => {
    await page.goto("/");

    await page.fill("#courseQuery", "demo");
    await page.click("#searchCourseBtn");

    await expect(page.locator("#courseStatus")).toContainText("Tap Load More");
    await expect(page.locator("#courseResults option")).toHaveCount(8);
    await expect(page.locator("#loadMoreBtn")).toBeEnabled();

    await page.click("#loadMoreBtn");
    await expect(page.locator("#courseResults option")).toHaveCount(15);
    await expect(page.locator("#loadMoreBtn")).toBeDisabled();
  });

  test("simulation controls persist across reload", async ({ page }) => {
    await page.goto("/");

    await page.fill("#seed", "123");
    await page.fill("#handicap", "7");
    await page.selectOption("#teeBox", "gold");
    await page.click("#simulateBtn");

    await page.reload();

    await expect(page.locator("#seed")).toHaveValue("123");
    await expect(page.locator("#handicap")).toHaveValue("7");
    await expect(page.locator("#teeBox")).toHaveValue("gold");
  });

  test("manual junk entry updates running ledger", async ({ page }) => {
    await page.goto("/");

    await page.selectOption("#junkHole", "1");
    await page.selectOption("#junkPlayer", "p1");
    await page.selectOption("#junkType", "net_birdie");
    await page.click("#addJunkBtn");

    await expect(page.locator("#junkRows")).toContainText("net_birdie");
    await expect(page.locator("#ledgerRows")).toContainText("junk");
    await expect(page.locator("#ledgerRows")).toContainText("net_birdie on hole 1");
  });

  test("manual closest-to-pin entries update par3 and par5 tracks independently", async ({ page }) => {
    await page.goto("/");

    await page.selectOption("#closestTrack", "par3");
    await page.selectOption("#closestHole", "3");
    await page.selectOption("#closestWinner", "teamA");
    await page.click("#addClosestBtn");

    await page.selectOption("#closestTrack", "par5");
    await page.selectOption("#closestHole", "5");
    await page.selectOption("#closestWinner", "teamB");
    await page.click("#addClosestBtn");

    await expect(page.locator("#closestRows")).toContainText("PAR3");
    await expect(page.locator("#closestRows")).toContainText("PAR5");
    await expect(page.locator("#ledgerRows")).toContainText("closest_par3");
    await expect(page.locator("#ledgerRows")).toContainText("par5_carryover");
  });
});
