import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * 글·작업물 상세에서 다른 글로 가는 링크(#933 ②). 이전·다음 글, 추천 글 목록, 추천 알림은 예전에 div 에 클릭 처리만 있어
 * 새 탭으로 열 수 없고 키보드로 닿지 않았다. 지금은 주소를 가진 링크이고, 그냥 누르면 커버가 커지는 연출로 넘어간다.
 * 글 상세를 열면 조회수 POST 가 나가므로 막는다.
 */

const ADJACENT = 'a[class*="AdjacentNav-module__"][class*="__card"]';
const RECOMMENDED = 'a[class*="RecommendedSection-module__"][class*="__recommendedItem"]';
const RELATED_WORK = 'a[class*="RelatedWorksCarousel-module__"][class*="__relatedCard"]';

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

  test("관련 작업물은 작업물 slug 주소 링크이고, 끌어 넘기면 이동하지 않고 그냥 누르면 넘어간다", async ({ page }) => {
    await openDetail(page, "/posts/bdm-2");
    const link = page.locator(RELATED_WORK).first();
    const shown = await link.waitFor({ state: "visible", timeout: 30_000 }).then(() => true, () => false);
    test.skip(!shown, "관련 작업물이 없다");
    await link.scrollIntoViewIfNeeded();
    // 캐러셀은 마우스로 끌어 넘긴다 — 링크 위에서 끌어도 링크 끌기나 이동이 일어나지 않아야 한다
    const box = await link.boundingBox();
    if (!box) throw new Error("관련 작업물 카드가 없다");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    expect(new URL(page.url()).pathname, "끌어 넘긴 뒤").toBe("/posts/bdm-2");
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

  test("이전·다음 글·추천 글·관련 작업물은 ⌘·Ctrl·가운데 클릭으로 새 탭에 열린다", async ({ playwright, baseURL }) => {
    const browser = await playwright.chromium.launch({ channel: "chromium" });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.route(/\/view$/, (route) => route.abort());
      const page = await context.newPage();
      await page.goto(`${baseURL}/posts/bdm-2`, { waitUntil: "load" });
      for (const [name, selector] of [["이전·다음 글", ADJACENT], ["추천 글", RECOMMENDED], ["관련 작업물", RELATED_WORK]] as const) {
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

/* 작업물 배치(#933 ③) — 지금 사이트 설정의 배치가 원통이면, 판을 누르면 옛 id 주소를 거치지 않고 slug 주소로 바로 간다.
   예전에는 /works/<id> 로 넘어간 뒤 proxy 가 slug 로 돌려보냈다. 원통은 3D 캔버스라 판 자체는 링크가 아니다 */
test.describe("작업물 원통 배치", () => {
  test.setTimeout(90_000);

  test("판을 누르면 slug 주소로 바로 넘어간다", async ({ page }) => {
    await page.goto("/works", { waitUntil: "load" });
    test.skip((await page.locator('[class*="CylinderLayout-module__"]').count()) === 0, "원통 배치가 아니다");
    // 캔버스는 브라우저에서만 붙는다
    await page.locator('[class*="CylinderLayout-module__"] canvas').first().waitFor({ state: "attached", timeout: 30_000 });
    const requested: string[] = [];
    page.on("request", (req) => { const path = new URL(req.url()).pathname; if (path.startsWith("/works/")) requested.push(path); });
    // 처음 앞면은 인트로 판이라, 휠로 돌려 작업물 판을 가운데로 가져온다
    await page.waitForTimeout(2_000);
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(720, 450);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(1_500);
    await page.mouse.click(720, 450);
    await page.waitForURL((url) => url.pathname.startsWith("/works/"), { timeout: 15_000 });
    const uuid = /^\/works\/[0-9a-f]{8}-[0-9a-f]{4}-/;
    expect(uuid.test(new URL(page.url()).pathname), "slug 주소").toBe(false);
    expect(requested.filter((path) => uuid.test(path)), "id 주소 요청").toEqual([]);
  });
});
