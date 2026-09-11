import { test, expect, type Page } from "@playwright/test";

/**
 * 공개 /about 의 코드 데모 미리보기(Sandpack).
 *
 * 미리보기는 띄울 때마다 CodeSandbox 에서 번들러와 패키지를 3 MB 가까이 받는다. 데스크톱 /about 은
 * 끝없는 가로 스크롤을 위해 패널 묶음을 세 벌 그리는데, 세 벌의 Code Highlights 가 페이지를 열자마자
 * 화면 밖에서 각자 미리보기를 띄웠다. 모바일은 숨겨 둔 데스크톱 보기가 Code 탭을 누르는 순간 띄웠다.
 */

const SANDPACK = 'iframe[title="Sandpack Preview"]';

function watchSandbox(page: Page) {
  const urls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("codesandbox.io")) urls.push(r.url());
  });
  return urls;
}

test.describe("데스크톱 /about 코드 데모", () => {
  test.skip(({ isMobile }) => isMobile, "데스크톱 가로 스크롤 배치");
  test.setTimeout(120_000);

  test("열 때는 띄우지 않고, Code Highlights 로 가면 한 벌만 띄운다", async ({ page }) => {
    const sandbox = watchSandbox(page);
    await page.goto("/about", { waitUntil: "load" });
    const toCode = page.getByRole("button", { name: "Go to Code", exact: true });
    await expect(toCode, "섹션 이동 막대가 뜬다").toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(3_000);
    expect(sandbox, "열 때는 CodeSandbox 로 요청하지 않는다").toEqual([]);
    await expect(page.locator(SANDPACK)).toHaveCount(0);

    await toCode.click();
    await expect(page.locator(SANDPACK), "화면에 온 벌만 미리보기를 띄운다").toHaveCount(1, { timeout: 30_000 });
  });
});

test.describe("모바일 /about 코드 데모", () => {
  test.skip(({ isMobile }) => !isMobile, "모바일 탭 배치");
  test.setTimeout(120_000);

  test("Code 탭을 눌러도 항목을 펼치기 전에는 띄우지 않는다", async ({ page }) => {
    const sandbox = watchSandbox(page);
    await page.goto("/about", { waitUntil: "load" });
    await page.getByRole("button", { name: "Code", exact: true }).first().click();
    const items = page.locator('[class*="codeMobileHeader"]');
    await expect(items.first(), "Code Highlights 목록이 뜬다").toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(3_000);
    expect(sandbox, "펼치기 전에는 CodeSandbox 로 요청하지 않는다").toEqual([]);
    await expect(page.locator(SANDPACK)).toHaveCount(0);

    await items.first().click();
    await expect(page.locator(SANDPACK), "펼친 항목의 미리보기를 띄운다").toHaveCount(1, { timeout: 30_000 });
  });
});
