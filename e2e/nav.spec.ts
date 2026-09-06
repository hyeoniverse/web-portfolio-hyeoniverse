import { test, expect } from "@playwright/test";

/**
 * 전역 네비게이션 안전망.
 *
 * 모든 페이지 위에 있는 막대다. 이것을 그리는 Navigation.tsx 는 1,246줄이고, 그 안에
 * 알림·모바일 메뉴·하위 메뉴·로고 크기 측정·소리 켜기·테마 바꾸기가 한 컴포넌트에 들어 있다.
 * 이것을 기능별로 나눌 예정인데, 지금은 페이지가 열리는지만 확인하고 있어서 메뉴가 안 열리거나
 * 표시가 안 따라와도 검사가 통과한다.
 */

test.describe("전역 네비게이션", () => {
  test.setTimeout(120_000);

  test("메뉴 항목과 단추가 그려진다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible({ timeout: 30_000 });

    for (const name of ["Works", "Posts", "Profile", "About"]) {
      await expect(nav.getByRole("link", { name, exact: true }), `${name} 링크`).toBeVisible();
    }
    await expect(nav.getByRole("button", { name: /Switch to (light|dark) mode/ }), "테마 전환").toBeVisible();
    await expect(nav.getByRole("button", { name: /(Unmute|Mute) sounds/ }), "소리 전환").toBeVisible();
    await expect(nav.getByRole("button", { name: /Switch to (Korea|English)/ }), "언어 전환").toBeVisible();
  });

  test("Posts 에 올리면 하위 메뉴가 열린다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const posts = page.locator("nav").first().getByRole("link", { name: "Posts", exact: true });
    await expect(posts).toBeVisible({ timeout: 30_000 });

    const before = await page.locator('[class*="subMenu" i], [class*="dropdown" i]').count();
    await posts.hover();
    await page.waitForTimeout(700);
    const after = await page.locator('[class*="subMenu" i], [class*="dropdown" i]').count();
    expect(after, "하위 메뉴가 나타나야 한다").toBeGreaterThan(before);
  });

  test("현재 위치 표시가 페이지에 따라 움직인다", async ({ page }) => {
    await page.goto("/works", { waitUntil: "load" });
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1200);

    // 표시는 navIndicator 하나이고, 자리를 style.left 로 옮긴다.
    const indicator = page.locator("nav").first().locator('[class*="navIndicator"]');
    // 높이가 2px 인 얇은 막대라 toBeVisible 로는 잡히지 않는다. 존재와 자리만 본다.
    await expect(indicator, "위치 표시").toHaveCount(1);
    const onWorks = await indicator.evaluate((e) => (e as HTMLElement).style.left);

    await page.goto("/posts", { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const onPosts = await page.locator("nav").first().locator('[class*="navIndicator"]')
      .evaluate((e) => (e as HTMLElement).style.left);

    expect(onPosts, "다른 페이지에서는 다른 자리에 있어야 한다").not.toBe(onWorks);
  });

  test("테마 단추를 누르면 테마가 바뀐다", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const btn = page.locator("nav").first().getByRole("button", { name: /Switch to (light|dark) mode/ });
    await expect(btn).toBeVisible({ timeout: 30_000 });

    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    await btn.click();
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(after, "테마 값이 달라져야 한다").not.toBe(before);
  });
});
