import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * 글·작업물 상세에서 다른 글로 가는 링크(#933 ②). 이전·다음 글, 추천 글 목록, 추천 알림은 예전에 div 에 클릭 처리만 있어
 * 새 탭으로 열 수 없고 키보드로 닿지 않았다. 지금은 주소를 가진 링크이고, 그냥 누르면 커버가 커지는 연출로 넘어간다.
 * 글 상세를 열면 조회수 POST 가 나가므로 막는다.
 */

const ADJACENT = 'a[class*="AdjacentNav-module__"][class*="__card"]';
const RECOMMENDED = 'a[class*="RecommendedSection-module__"][class*="__recommendedItem"]';

test.describe("상세의 글 링크", () => {
  test.setTimeout(90_000);
  test.beforeEach(async ({ page }) => {
    await page.route(/\/view$/, (route) => route.abort());
  });

  async function openDetail(page: Page, path: string) {
    await page.goto(path, { waitUntil: "load" });
  }

  async function clickAndLand(page: Page, link: Locator) {
    await link.scrollIntoViewIfNeeded();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/(posts|works)\/.+/);
    await link.click({ position: { x: 10, y: 10 } });
    await page.waitForURL((url) => url.pathname === href);
  }

  test("작업물 상세의 이전·다음은 미리 그린 HTML 에 주소 링크로 있다", async ({ request }) => {
    const { works } = (await (await request.get("/api/works")).json()) as { works: { slug?: string; id: string }[] };
    const slug = works[0]?.slug || works[0]?.id;
    test.skip(!slug, "공개 작업물이 없다");
    const html = await (await request.get(`/works/${slug}`)).text();
    expect(html.match(/<a class="AdjacentNav-module__\w+__card[^"]*"[^>]*href="\/works\/[^"]+"/g) ?? [], "이전·다음 링크").not.toHaveLength(0);
  });

  test("글 상세의 이전·다음 글은 그냥 누르면 넘어간다", async ({ page }) => {
    await openDetail(page, "/posts/bdm-2");
    const link = page.locator(ADJACENT).first();
    await expect(link).toBeVisible({ timeout: 30_000 });
    await clickAndLand(page, link);
  });

  test("추천 글은 그냥 누르면 넘어간다", async ({ page }) => {
    await openDetail(page, "/posts/bdm-2");
    const link = page.locator(RECOMMENDED).first();
    const shown = await link.waitFor({ state: "attached", timeout: 30_000 }).then(() => true, () => false);
    test.skip(!shown, "추천 글이 없다");
    await clickAndLand(page, link);
  });
});

/* 새 탭은 전체 Chromium 으로 본다 — 기본 headless shell 은 ⌘·가운데 클릭으로 탭을 만들지 않는다(postsindex 의 새 탭 검사 참고) */
test.describe("상세의 글 링크 — 새 탭", () => {
  test.setTimeout(120_000);

  test("이전·다음 글과 추천 글은 ⌘·Ctrl·가운데 클릭으로 새 탭에 열린다", async ({ playwright, baseURL }) => {
    const browser = await playwright.chromium.launch({ channel: "chromium" });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.route(/\/view$/, (route) => route.abort());
      const page = await context.newPage();
      await page.goto(`${baseURL}/posts/bdm-2`, { waitUntil: "load" });
      for (const [name, selector] of [["이전·다음 글", ADJACENT], ["추천 글", RECOMMENDED]] as const) {
        const link = page.locator(selector).first();
        await expect(link, name).toBeVisible({ timeout: 30_000 });
        await link.scrollIntoViewIfNeeded();
        const href = await link.getAttribute("href");
        for (const how of [{ modifiers: [process.platform === "darwin" ? "Meta" : "Control"] as ("Meta" | "Control")[] }, { button: "middle" as const }]) {
          const opened = context.waitForEvent("page");
          await link.click({ position: { x: 10, y: 10 }, ...how });
          const tab = await opened;
          await tab.waitForLoadState("domcontentloaded");
          expect(new URL(tab.url()).pathname, `${name} — 새 탭의 주소`).toBe(href);
          expect(new URL(page.url()).pathname, `${name} — 지금 탭은 그대로`).toBe("/posts/bdm-2");
          await tab.close();
        }
      }
    } finally {
      await browser.close();
    }
  });
});
