import { test, expect } from "@playwright/test";

/** 글 카드의 루트(카드 전체를 덮는 글 링크를 품는다, #931) */
const POST_CARD = '[class*="PostCard-module__"][class*="__card"][data-clickable]';

/**
 * 글 모음 화면(카테고리·시리즈 등)의 언어.
 *
 * 글에는 카테고리를 저장값(한국어 leaf 이름)으로 두는데, 카테고리 모음이 그 값을 그대로 보여 줘서
 * 영어 화면에 "프론트엔드" 같은 한국어 이름이 나왔다(#853). 글 카드와 /posts 의 카테고리 탭은 이미
 * 설정의 영어 이름을 쓴다.
 */

test.describe("글 모음 화면(영어)", () => {
  test.setTimeout(90_000);
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("language", "en"); } catch { /* 저장소를 못 쓰면 기본 언어 */ } });
  });

  test("카테고리 모음은 이름을 화면 언어로 보여 주고, 저장값(한국어)으로 찾아도 나온다", async ({ page }) => {
    await page.goto("/posts/categories", { waitUntil: "load" });
    const titles = page.locator('[class*="cardTitle"]');
    await expect(titles.first(), "카테고리 카드").toBeVisible({ timeout: 30_000 });
    const names = await titles.allInnerTexts();
    expect(names.filter((n) => /[가-힣]/.test(n)), "영어 화면의 카테고리 이름에 한국어가 없다").toEqual([]);

    // 링크에는 저장값을 그대로 쓴다 — 그 값으로 찾으면 영어 이름의 카드가 나온다
    const href = (await page.locator('a[href*="/posts?category="]').first().getAttribute("href")) ?? "";
    const stored = decodeURIComponent(href.split("category=")[1] ?? "");
    expect(stored, "저장값").not.toBe("");
    await page.locator("input[type=search], input[placeholder]").first().fill(stored);
    await expect(titles.first()).toHaveText(names[0]);
  });
});

/* 검색 캡슐은 URL 쿼리를 effect 에서 window.location 으로 읽는다(#913). useSearchParams 를 쓰면 정적 렌더에서 페이지 본문이
   빠져서 바꿨다. 주소의 ?q= 를 받고, 입력하면 주소를 따라 바꾸는 동작은 그대로여야 한다 */
test.describe("태그 페이지 검색칸", () => {
  test.setTimeout(90_000);

  test("주소의 ?q= 를 입력칸에 받고, 입력하면 주소를 따라 바꾼다", async ({ page }) => {
    await page.goto("/posts/tags", { waitUntil: "load" });
    const href = await page.locator('a[href^="/posts/tags/"]').first().getAttribute("href");
    expect(href, "태그 링크").toBeTruthy();

    await page.goto(`${href}?q=e2e-probe`, { waitUntil: "load" });
    const input = page.locator('[class*="heroSearch"] input').first();
    await expect(input, "주소의 검색어").toHaveValue("e2e-probe", { timeout: 30_000 });

    await input.fill("gallery");
    await expect.poll(() => new URL(page.url()).searchParams.get("q"), { message: "입력하면 주소가 따라 바뀐다" }).toBe("gallery");
    await input.fill("");
    await expect.poll(() => new URL(page.url()).searchParams.has("q"), { message: "비우면 쿼리가 빠진다" }).toBe(false);
  });
});

/* 글 목록 배너의 첫 이미지는 이 화면의 LCP 다. 감싼 상자가 opacity 0 에서 페이드하면 브라우저가 첫 칠을 LCP 로 세지 않아,
   절반 넘게 5초 뒤에야 잡혔다(#919). 처음 칠할 때부터 가려져 있지 않은지 본다. 동작 줄이기가 애니메이션을 꺼 버리면 이 검사가
   헛돌므로 끄지 않은 환경으로 연다 */
test.describe("글 목록 배너", () => {
  test.setTimeout(90_000);

  test("첫 이미지는 처음 칠할 때부터 가려져 있지 않다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        requestAnimationFrame(() => {
          const img = document.querySelector('img[class*="slideImg"]');
          let opacity = 1;
          for (let el: Element | null = img; el && el !== document.documentElement; el = el.parentElement) opacity *= Number(getComputedStyle(el).opacity);
          (window as unknown as { __bannerOpacity?: number | null }).__bannerOpacity = img ? opacity : null;
        });
      });
    });
    await page.goto("/posts", { waitUntil: "load" });
    const opacity = await page.evaluate(() => (window as unknown as { __bannerOpacity?: number | null }).__bannerOpacity);
    test.skip(opacity == null, "배너가 없다");
    expect(opacity, "첫 칠의 배너 이미지 opacity(조상 포함)").toBeGreaterThan(0.5);
  });
});

/* 글 목록은 필터 없는 1쪽을 미리 그린다(#925). 예전에는 주소를 useSearchParams() 로 읽어 목록 전체가 브라우저 렌더로 빠졌고,
   열 때마다 서버가 넘긴 첫 쪽을 한 번 더 받았다. 주소가 필터·쪽 번호를 가리키면 거른 목록이 올 때까지 미리 그린 기본 목록을
   가린다. magazine 배치는 하이드레이션 전에도 스크립트가 줄 수를 넣어 카드가 겹치지 않아야 한다 */
test.describe("글 목록 미리 그리기", () => {
  test.setTimeout(90_000);
  type Probe = { __list?: { visibility: string; overlaps: number; cards: number } | null };
  const LIST_REQUEST = /\/api\/posts\?(?!.*limit=5&)/; // 사이드바의 인기·무작위 글(limit=5)은 뺀다

  /** DOMContentLoaded 직후 첫 칠에서 목록 그리드의 보임 여부와 카드끼리 겹친 쌍 수를 적어 둔다 */
  async function probeFirstPaint(page: import("@playwright/test").Page) {
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        requestAnimationFrame(() => {
          const grid = Array.from(document.querySelectorAll('[class*="PostsGrid-module__"]'))
            .find((el) => el.className.split(" ").some((c) => c.endsWith("__grid")));
          const rects = grid ? Array.from(grid.children, (el) => el.getBoundingClientRect()) : [];
          let overlaps = 0;
          rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => {
            if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps++;
          }));
          (window as unknown as Probe).__list = grid ? { visibility: getComputedStyle(grid).visibility, overlaps, cards: rects.length } : null;
        });
      });
    });
  }

  test("미리 그린 HTML 에 글 카드가 있다", async ({ request }) => {
    for (const path of ["/posts", "/posts/history"]) {
      const html = await (await request.get(path)).text();
      expect((html.match(/PostCard-module__\w+__card\b/g) ?? []).length, `${path} 의 글 카드`).toBeGreaterThan(0);
    }
  });

  test("기본 주소는 첫 쪽을 다시 받지 않고, 하이드레이션 전에도 카드가 겹치지 않는다", async ({ page }) => {
    const listRequests: string[] = [];
    page.on("request", (req) => { if (LIST_REQUEST.test(req.url())) listRequests.push(req.url()); });
    await probeFirstPaint(page);
    await page.goto("/posts", { waitUntil: "load" });
    const first = await page.evaluate(() => (window as unknown as Probe).__list);
    expect(first?.cards, "첫 칠의 카드").toBeGreaterThan(0);
    expect(first?.visibility).toBe("visible");
    expect(first?.overlaps, "첫 칠에서 겹친 카드 쌍").toBe(0);
    await page.waitForTimeout(1500);
    expect(listRequests, "목록 요청").toEqual([]);
  });

  test("필터 주소는 기본 목록을 가렸다가 거른 목록을 보여 준다", async ({ page }) => {
    await page.goto("/posts", { waitUntil: "load" });
    const pill = page.locator('[class*="tagPill"]').first();
    const tag = decodeURIComponent(((await pill.getAttribute("href")) ?? "").split("/posts/tags/")[1] ?? "");
    test.skip(!tag, "태그가 달린 글이 없다");

    await probeFirstPaint(page);
    await page.goto(`/posts?tag=${encodeURIComponent(tag)}`, { waitUntil: "load" });
    expect((await page.evaluate(() => (window as unknown as Probe).__list))?.visibility, "첫 칠의 기본 목록").toBe("hidden");

    const cards = page.locator(POST_CARD);
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
    for (const card of await cards.all()) {
      expect(await card.locator('[class*="tagPill"]').allTextContents(), "거른 목록의 카드에는 그 태그가 있다").toContain(`#${tag}`);
    }
    expect(new URL(page.url()).searchParams.get("tag")).toBe(tag);
  });

  test("?page=2 는 두 번째 쪽을 받고 주소의 쪽 번호를 지킨다", async ({ page }) => {
    await page.goto("/posts", { waitUntil: "load" });
    const pageButtons = page.locator('[class*="PostsPagination-module__"][class*="__pageBtn"]');
    test.skip((await pageButtons.count()) < 2, "목록이 한 쪽뿐이다");
    const firstOfPage1 = await page.locator(`${POST_CARD} h2`).first().textContent();

    await page.goto("/posts?page=2", { waitUntil: "load" });
    await expect(page.locator('[class*="__pageBtnActive"]')).toHaveText("2", { timeout: 30_000 });
    await expect(page.locator(`${POST_CARD} h2`).first()).not.toHaveText(firstOfPage1 ?? "");
    expect(new URL(page.url()).searchParams.get("page")).toBe("2");
  });
});

/* 글 카드는 카드 전체를 덮는 글 링크를 가진다(#931). 예전에는 div role="link" 에 클릭 처리만 있어 새 탭으로 열 수 없고
   키보드로 닿지 않았으며, 목록 HTML 에 글 주소 링크가 없었다. 그냥 누르면 커버가 커지는 연출로 넘어가고, ⌘·가운데 클릭은
   브라우저가 새 탭으로 연다. 글 상세의 조회수 요청은 막는다 */
test.describe("글 카드 링크", () => {
  test.setTimeout(90_000);
  const LINK = 'a[class*="__cardLink"]';

  test.beforeEach(async ({ page }) => {
    await page.route(/\/view$/, (route) => route.abort());
  });

  /** 첫 카드의 글 링크를 누른다. 링크가 카드를 덮으므로 카드 왼쪽 위(커버) 지점을 누르면 사용자가 카드를 누른 것과 같다 */
  async function clickCard(page: import("@playwright/test").Page, options: { modifiers?: ("Meta" | "Control")[]; button?: "left" | "middle" } = {}) {
    await page.locator(POST_CARD).first().locator(LINK).click({ position: { x: 24, y: 24 }, ...options });
  }

  test("미리 그린 목록의 카드마다 글 주소 링크가 있다", async ({ request }) => {
    for (const path of ["/posts", "/posts/history"]) {
      const html = await (await request.get(path)).text();
      const cards = (html.match(/PostCard-module__\w+__card\b/g) ?? []).length;
      const links = (html.match(/__cardLink"[^>]*href="\/posts\/[^"]+"/g) ?? []).length;
      expect(cards, `${path} 의 카드`).toBeGreaterThan(0);
      expect(links, `${path} 의 글 링크`).toBe(cards);
    }
  });

  test("그냥 누르면 지금 탭에서 글로 넘어간다", async ({ page }) => {
    await page.goto("/posts", { waitUntil: "load" });
    const href = await page.locator(POST_CARD).first().locator(LINK).getAttribute("href");
    expect(href).toMatch(/^\/posts\/.+/);
    await clickCard(page);
    await page.waitForURL((url) => url.pathname === href);
  });

  test("키보드로 카드 링크에 닿고 Enter 로 넘어간다", async ({ page }) => {
    await page.goto("/posts", { waitUntil: "load" });
    const link = page.locator(POST_CARD).first().locator(LINK);
    const href = await link.getAttribute("href");
    await link.focus();
    await expect(link, "초점 링").toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.pathname === href);
  });

  test("카드 안의 태그 칩은 글 대신 태그 페이지로 간다", async ({ page }) => {
    await page.goto("/posts", { waitUntil: "load" });
    const pill = page.locator(POST_CARD).locator('[class*="tagPill"]').first();
    test.skip((await pill.count()) === 0, "태그가 달린 글이 없다");
    const href = (await pill.getAttribute("href")) ?? "";
    await pill.click();
    await page.waitForURL((url) => url.pathname === new URL(href, "http://local").pathname);
  });
});

/* 새 탭 열기는 브라우저 몫이다. 기본 headless shell 은 ⌘·가운데 클릭으로 탭을 만들지 않고 지금 탭에서 넘어가서, 이 검사만
   전체 Chromium(channel "chromium")을 직접 띄워 본다. 글 카드(#931)와 배너·사이드바 인기 글(#933)을 함께 본다 */
test.describe("글 링크 — 새 탭", () => {
  test.setTimeout(120_000);

  test("⌘·Ctrl·가운데 클릭은 새 탭에서 글을 열고 지금 탭은 그대로다", async ({ playwright, baseURL }) => {
    const browser = await playwright.chromium.launch({ channel: "chromium" });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.route(/\/view$/, (route) => route.abort());
      const page = await context.newPage();
      await page.goto(`${baseURL}/posts`, { waitUntil: "load" });
      const surfaces = {
        "글 카드": page.locator(POST_CARD).first().locator('a[class*="__cardLink"]'),
        "배너 가운데 슬라이드": page.locator('[class*="Banner-module__"] :not([inert]) > a[href^="/posts/"]').first(),
        "사이드바 인기 글": page.locator('[class*="PopularPosts-module__"] a[href^="/posts/"]').first(),
      };
      for (const [name, link] of Object.entries(surfaces)) {
        await expect(link, name).toBeVisible({ timeout: 30_000 });
        const href = await link.getAttribute("href");
        for (const how of [{ modifiers: [process.platform === "darwin" ? "Meta" : "Control"] as ("Meta" | "Control")[] }, { button: "middle" as const }]) {
          const opened = context.waitForEvent("page");
          await link.click({ position: { x: 12, y: 12 }, ...how });
          const tab = await opened;
          await tab.waitForLoadState("domcontentloaded");
          expect(new URL(tab.url()).pathname, `${name} — 새 탭의 주소`).toBe(href);
          expect(new URL(page.url()).pathname, `${name} — 지금 탭은 그대로`).toBe("/posts");
          await tab.close();
        }
      }
    } finally {
      await browser.close();
    }
  });
});

/* 글 목록 주변의 글 링크(#933) — 배너 슬라이드·사이드바 인기 글·시리즈 덱은 주소를 가진 링크이고, 그냥 누르면 지금처럼
   연출로 넘어간다. 보이지 않는 배너 슬라이드는 inert 라 안의 링크가 초점을 받지 않는다 */
test.describe("글 목록 주변 링크", () => {
  test.setTimeout(90_000);
  test.beforeEach(async ({ page }) => {
    await page.route(/\/view$/, (route) => route.abort());
  });

  test("배너 슬라이드는 글 링크이고, 보이지 않는 슬라이드의 링크는 초점을 받지 않는다", async ({ page, request }) => {
    const html = await (await request.get("/posts")).text();
    const slides = html.match(/BannerSlide-module__\w+__slideLink" href="\/posts\/[^"]+"/g) ?? [];
    test.skip(slides.length === 0, "배너가 없다");

    await page.goto("/posts", { waitUntil: "load" });
    const hidden = page.locator('[class*="Banner-module__"] [inert] a[href^="/posts/"]');
    for (const link of await hidden.all()) {
      await link.evaluate((el) => (el as HTMLElement).focus());
      expect(await link.evaluate((el) => document.activeElement === el), "보이지 않는 슬라이드의 링크").toBe(false);
    }
    const center = page.locator('[class*="Banner-module__"] :not([inert]) > a[href^="/posts/"]').first();
    const href = await center.getAttribute("href");
    await center.click({ position: { x: 12, y: 12 } });
    await page.waitForURL((url) => url.pathname === href);
  });

  test("사이드바 인기 글은 글 링크이고 그냥 누르면 넘어간다", async ({ page }) => {
    await page.goto("/posts", { waitUntil: "load" });
    const link = page.locator('[class*="PopularPosts-module__"] a[href^="/posts/"]').first();
    await expect(link).toBeVisible({ timeout: 30_000 });
    const href = await link.getAttribute("href");
    await link.click();
    await page.waitForURL((url) => url.pathname === href);
  });

  test("시리즈 덱의 글은 펼쳤을 때 글 링크이고 그냥 누르면 넘어간다", async ({ page }) => {
    await page.goto("/posts", { waitUntil: "load" });
    const card = page.locator('[class*="SeriesCard-module__"][class*="__card"]').first();
    test.skip((await card.count()) === 0, "시리즈가 없다");
    await card.hover();
    const layer = page.locator("a[data-deck-layer]").first();
    const opened = await layer.waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false);
    test.skip(!opened, "펼칠 글이 없다");
    const href = await layer.getAttribute("href");
    await layer.click({ position: { x: 8, y: 8 } });
    await page.waitForURL((url) => url.pathname === href);
  });
});

/* 모바일 /posts LCP(#944). 배너 첫 이미지가 LCP 요소인데, Next 16 의 priority 는 preload 만 넣고 fetchpriority 는 붙이지 않아
   Low 로 받혔다. 또 루트 레이아웃이 사이트 설정 전체를 모든 페이지의 RSC 페이로드에 실었는데, 그 가운데 /about 패널 내용과
   태그 설명이 3분의 2 남짓이었다. 이제 모든 페이지에는 필요한 설정만 싣고, /about 은 패널 내용을 따로 받는다 */
test.describe("글 목록 첫 화면의 무게", () => {
  test("배너 첫 이미지는 높은 우선순위로 받는다", async ({ request }) => {
    const html = await (await request.get("/posts")).text();
    const img = html.match(/<img[^>]*slideImg[^>]*>/)?.[0] ?? "";
    expect(img, "배너 첫 이미지").toContain('fetchPriority="high"');
  });

  test("모든 페이지에 싣는 설정에서 /about 패널 내용과 태그 설명이 빠지고, /about 에는 온다", async ({ request }) => {
    // RSC 페이로드 안의 키 — 실패해도 HTML 전체를 찍지 않게 있는지만 본다
    const has = (html: string, key: string) => html.includes(`\\"${key}\\"`);
    const posts = await (await request.get("/posts")).text();
    expect(has(posts, "tagDescriptions"), "태그 설명").toBe(false);
    expect(has(posts, "architectureItems"), "/about 패널 내용").toBe(false);
    const about = await (await request.get("/about")).text();
    expect(has(about, "architectureItems"), "/about 은 패널 내용을 받는다").toBe(true);
  });
});
