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
