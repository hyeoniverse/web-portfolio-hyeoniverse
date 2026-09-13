import { test, expect, devices, type Locator, type Page, type Route } from "@playwright/test";

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
   예전에는 /works/<id> 로 넘어간 뒤 proxy 가 slug 로 돌려보냈다. 원통은 3D 캔버스라 판 자체는 링크가 아니다.
   그래서 판의 보조 키·가운데 클릭은 캔버스가 새 탭으로 열고, 키보드는 초점이 오면 보이는 작업물 목록으로 닿는다(#938).
   /works 는 방문 기록을 POST 하므로 읽기가 아닌 요청은 막는다. */
const CYLINDER = '[class*="CylinderLayout-module__"]';
const WORK_LIST = 'nav[class*="CylinderLayout-module__"][class*="__workList"]';
const META_TITLE = '[class*="CylinderLayout-module__"][class*="__metaTitle"]';
const FRONT_DOT = '[class*="CylinderLayout-module__"][class*="__indicatorDotActive"]';
const DESC_LINK = 'a[class*="CylinderLayout-module__"][class*="__metaDescLink"]';
const TOOLTIP = '[class*="Tooltip-module__"][class*="__bubble"]';

const readOnly = (route: Route) => (["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());

async function openCylinder(page: Page, url = "/works") {
  await page.goto(url, { waitUntil: "load" });
  test.skip((await page.locator(CYLINDER).count()) === 0, "원통 배치가 아니다");
  // 캔버스는 브라우저에서만 붙는다
  await page.locator(`${CYLINDER} canvas`).first().waitFor({ state: "attached", timeout: 30_000 });
  // 로딩 화면이 걷히기 전에는 누름·끌기가 로딩 화면에 닿는다
  await page.locator('[class*="loadingScreen"]').first().waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
}

/** 앞면 슬롯 번호(0 = 인트로) — 오른쪽 인디케이터의 켜진 점 */
const frontSlot = (page: Page) => page.locator(FRONT_DOT).evaluate((dot) => [...(dot.parentElement?.children ?? [])].indexOf(dot));

/** 화면 가운데 왼쪽(인트로 판 제목을 비껴간 자리)의 평균 밝기. 캔버스는 스크린샷으로만 읽을 수 있어 페이지 안에서 풀어 잰다 */
async function introBrightness(page: Page) {
  const { width, height } = page.viewportSize() ?? { width: 0, height: 0 };
  const clip = { x: Math.round(width * 0.15), y: Math.round(height * 0.4), width: Math.round(width * 0.2), height: Math.round(height * 0.1) };
  const png = (await page.screenshot({ clip })).toString("base64");
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 255;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    return sum / (data.length / 4);
  }, png);
}

test.describe("작업물 원통 배치", () => {
  test.setTimeout(90_000);
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", readOnly);
  });

  test("판을 누르면 slug 주소로 바로 넘어간다", async ({ page }) => {
    await openCylinder(page);
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

  test("키보드로 작업물 목록에 닿고, 초점이 간 작업물로 원통이 돌며, Enter 로 넘어간다", async ({ page }) => {
    await openCylinder(page);
    const list = page.locator(WORK_LIST);
    const second = list.locator("a").nth(1);
    const href = await second.getAttribute("href");
    expect(href).toMatch(/^\/works\/[^/]+$/);
    expect(await (await page.request.get("/works")).text(), "서버 HTML 의 작업물 주소").toContain(`href="${href}"`);
    expect((await list.boundingBox())?.width, "초점 전에는 감춘다").toBeLessThanOrEqual(1);
    await second.focus();
    expect((await list.boundingBox())?.width ?? 0, "초점이 오면 보인다").toBeGreaterThan(50);
    await expect.poll(() => frontSlot(page), { message: "두 번째 작업물이 앞면으로", timeout: 10_000 }).toBe(2);
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.pathname === href, { timeout: 15_000 });
  });

  /* 새 탭은 전체 Chromium 으로 본다 — 기본 headless shell 은 새 탭을 만들지 않는다 */
  test("판을 ⌘·Ctrl·가운데 클릭하면 새 탭으로 열고, 제목을 눌러도 넘어간다", async ({ playwright, baseURL }) => {
    test.setTimeout(120_000);
    const browser = await playwright.chromium.launch({ channel: "chromium" });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.route("**/*", readOnly);
      const page = await context.newPage();
      await openCylinder(page, `${baseURL}/works`);
      // 목록 링크에 초점을 주면 원통이 그 작업물로 돈다. 초점을 거두면 목록은 다시 감춘다
      const link = page.locator(`${WORK_LIST} a`).first();
      const href = await link.getAttribute("href");
      await link.focus();
      await expect.poll(() => frontSlot(page), { timeout: 10_000 }).toBe(1);
      await link.blur();
      await page.waitForTimeout(2_000);
      // 앞면 작업물 제목의 한가운데 — 제목은 누름을 뒤의 판으로 넘긴다
      const box = await page.locator(META_TITLE).first().boundingBox();
      if (!box) throw new Error("앞면 작업물 제목이 없다");
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const modifier = process.platform === "darwin" ? "Meta" : "Control";
      for (const how of ["modifier", "middle"] as const) {
        const opened = context.waitForEvent("page");
        if (how === "modifier") await page.keyboard.down(modifier);
        await page.mouse.click(x, y, { button: how === "middle" ? "middle" : "left" });
        if (how === "modifier") await page.keyboard.up(modifier);
        const tab = await opened;
        await tab.waitForLoadState("domcontentloaded");
        expect(new URL(tab.url()).pathname, `${how} — 새 탭의 주소`).toBe(href);
        expect(new URL(page.url()).pathname, `${how} — 지금 탭은 그대로`).toBe("/works");
        await tab.close();
      }
      await page.mouse.click(x, y);
      await page.waitForURL((url) => url.pathname === href, { timeout: 15_000 });
    } finally {
      await browser.close();
    }
  });

  /* #940 — 폭 358px 이하에서는 카메라가 원통 벽 밖으로 물러나, 카메라 바로 앞의 판이 화면을 통째로 덮었다.
     처음 앞면은 검은 인트로 판이므로, 밝은 테마(바탕 크림색)에서 가운데가 어두워지면 판이 제대로 보이는 것이다 */
  test("좁은 화면(358px)에서도 인트로 판이 보인다", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("theme", "light"); } catch { /* 저장소를 못 쓰면 기본 테마 */ } });
    await page.setViewportSize({ width: 358, height: 740 });
    await openCylinder(page);
    await expect.poll(() => introBrightness(page), { message: "인트로 판 자리의 밝기", timeout: 30_000 }).toBeLessThan(100);
  });

  test("터치 화면에서 위로 끌면 다음 작업물로 돌고, 누르면 그 작업물로 간다", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ ...devices["iPhone 13"], baseURL });
    try {
      await context.route("**/*", readOnly);
      const page = await context.newPage();
      await openCylinder(page);
      const href = await page.locator(`${WORK_LIST} a`).first().getAttribute("href");
      const { width, height } = page.viewportSize() ?? { width: 390, height: 664 };
      const x = width / 2;
      // 한 손가락으로 판 한 칸 조금 못 되게 위로 끌고, 멈췄다가 뗀다 — 놓으면 가까운 다음 판에 멈춰야 한다
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: height * 0.75 }] });
      for (let i = 1; i <= 12; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: height * 0.75 - (height * 0.45 * i) / 12 }] });
      }
      await page.waitForTimeout(200);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => frontSlot(page), { message: "첫 작업물이 앞면으로", timeout: 10_000 }).toBe(1);
      expect(await page.evaluate(() => window.scrollY), "페이지는 스크롤되지 않는다").toBe(0);
      await page.waitForTimeout(1_500);
      await page.touchscreen.tap(x, height * 0.4);
      await page.waitForURL((url) => url.pathname === href, { timeout: 15_000 });
    } finally {
      await context.close();
    }
  });

  test("설명 알약에 올리면 다른 언어 설명이 뜨고, 누르면 작업물로 간다", async ({ page }) => {
    await openCylinder(page);
    const link = page.locator(`${WORK_LIST} a`).first();
    const href = await link.getAttribute("href");
    await link.focus();
    await expect.poll(() => frontSlot(page), { timeout: 10_000 }).toBe(1);
    await link.blur();
    await page.waitForTimeout(2_000);
    // 판에 올려 설명을 드러낸 뒤 알약으로 옮긴다
    const title = await page.locator(META_TITLE).first().boundingBox();
    if (!title) throw new Error("앞면 작업물 제목이 없다");
    await page.mouse.move(title.x + title.width / 2, title.y + title.height / 2);
    const pill = page.locator(DESC_LINK).first();
    await pill.hover();
    await expect(page.locator(TOOLTIP), "툴팁").toBeVisible({ timeout: 5_000 });
    await pill.click();
    await page.waitForURL((url) => url.pathname === href, { timeout: 15_000 });
  });
});
