import { test, expect } from "@playwright/test";

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

    const cards = page.locator('[class*="PostCard-module__"][class*="__card"][role="link"]');
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
    const firstOfPage1 = await page.locator('[class*="PostCard-module__"][class*="__card"][role="link"] h2').first().textContent();

    await page.goto("/posts?page=2", { waitUntil: "load" });
    await expect(page.locator('[class*="__pageBtnActive"]')).toHaveText("2", { timeout: 30_000 });
    await expect(page.locator('[class*="PostCard-module__"][class*="__card"][role="link"] h2').first()).not.toHaveText(firstOfPage1 ?? "");
    expect(new URL(page.url()).searchParams.get("page")).toBe("2");
  });
});
