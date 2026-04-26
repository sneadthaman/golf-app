import { expect, test } from "@playwright/test";

test.describe("Web UI flow", () => {
  test("search -> load selected -> saves recent", async ({ page }) => {
    await page.goto("/");

    await page.fill("#courseQuery", "simple");
    await page.click("#searchCourseBtn");

    await expect(page.locator("#courseStatus")).toContainText("Found 1 course(s)");
    await expect(page.locator("#courseResults option")).toContainText("Simple Par 72");

    await page.click("#loadCourseBtn");
    await expect(page.locator("#courseStatus")).toContainText("Loaded Simple Par 72");
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
    await expect(page.locator("#courseStatus")).toContainText("Showing all 15 courses");
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
});
