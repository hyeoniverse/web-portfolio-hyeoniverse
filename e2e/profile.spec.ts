import { test, expect } from "@playwright/test";

/**
 * 프로필 화면(데스크톱).
 *
 * 창 속으로 비치는 사진(엿보기 층, 원본 252KB)은 첫 로드에 받지 않는다(#915). CSS 배경이라 화면 밖이어도 받아서,
 * 가로 스크롤 몇 화면 뒤에 있는 사진이 하이드레이션에 필요한 JS 와 대역을 나눠 썼다. 사용자가 스크롤을 시작하면 받는다.
 * 창 구역은 두 화면 넘게 뒤라 닿기 전에 준비된다.
 */
test.describe("프로필 창 엿보기 사진", () => {
  test.setTimeout(90_000);

  test("첫 로드에는 받지 않고, 휠을 굴리면 받는다", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "GET" && new URL(r.url()).pathname === "/images/profile_pic.webp") requested.push(r.url());
    });
    await page.goto("/profile", { waitUntil: "load" });
    await page.waitForTimeout(3000);
    expect(requested, "첫 로드에 받은 사진").toEqual([]);

    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => requested.length, { message: "휠을 굴리면 받는다" }).toBeGreaterThan(0);
  });
});
