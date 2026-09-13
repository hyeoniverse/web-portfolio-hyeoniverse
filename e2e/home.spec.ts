import { test, expect } from "@playwright/test";

/**
 * 홈의 작업물 원(#933 ④). 예전에는 motion.div 에 클릭 처리만 있어 새 탭으로 열 수 없고 키보드로 닿지 않았다. 지금은 원을 덮는
 * 작업물 링크가 있고, 누르기·길게 누르기·오래 올려 두기로 넘어가는 동작은 원(바깥)이 그대로 받는다.
 * 작업물 상세로 넘어가면 조회수 POST 가 나가므로 막는다.
 */

const CIRCLE_LINK = 'a[class*="WorksSection-module__"][class*="__circleLink"]';

test.describe("홈 작업물 링크", () => {
  test.setTimeout(90_000);
  test.beforeEach(async ({ page }) => {
    await page.route(/\/view$/, (route) => route.abort());
  });

  test("미리 그린 HTML 에 작업물 링크가 있다", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const links = html.match(/WorksSection-module__\w+__circleLink"[^>]*href="\/works\/[^"]+"/g) ?? [];
    expect(links.length, "작업물 링크").toBeGreaterThan(0);
  });

  test("그냥 누르면 작업물로 넘어간다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const link = page.locator(CIRCLE_LINK).first();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await page.waitForURL((url) => url.pathname.startsWith("/works/"));
  });

  test("키보드로 링크에 닿고 Enter 로 넘어간다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const link = page.locator(CIRCLE_LINK).first();
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    await expect(link, "초점 링").toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.pathname.startsWith("/works/"));
  });
});

/* 새 탭은 전체 Chromium 으로 본다 — 기본 headless shell 은 ⌘·가운데 클릭으로 탭을 만들지 않는다(postsindex 의 새 탭 검사 참고).
   누른 뒤 원 위에 오래 머물면 오래 올려 두기로 지금 탭이 넘어가므로, 누를 때마다 마우스를 치운다 */
test.describe("홈 작업물 링크 — 새 탭", () => {
  test.setTimeout(120_000);

  test("⌘·Ctrl·가운데 클릭은 새 탭에서 작업물을 열고 지금 탭은 그대로다", async ({ playwright, baseURL }) => {
    const browser = await playwright.chromium.launch({ channel: "chromium" });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.route(/\/view$/, (route) => route.abort());
      const page = await context.newPage();
      await page.goto(`${baseURL}/`, { waitUntil: "load" });
      const link = page.locator(CIRCLE_LINK).first();
      await link.scrollIntoViewIfNeeded();
      for (const how of [{ modifiers: [process.platform === "darwin" ? "Meta" : "Control"] as ("Meta" | "Control")[] }, { button: "middle" as const }]) {
        const opened = context.waitForEvent("page");
        await link.click(how);
        await page.mouse.move(5, 5);
        const tab = await opened;
        await tab.waitForLoadState("domcontentloaded");
        expect(new URL(tab.url()).pathname, "새 탭은 작업물").toMatch(/^\/works\/.+/);
        expect(new URL(page.url()).pathname, "지금 탭은 그대로").toBe("/");
        await tab.close();
      }
    } finally {
      await browser.close();
    }
  });
});
