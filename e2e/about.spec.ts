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

/* 탭 막대는 처음 칠할 때부터 자리를 잡는다(#923). isMobile 일 때만 그리면 그 값이 서버·하이드레이션에서는 false 라,
   모바일에서 하이드레이션 직후 53px 막대가 본문 위에 끼어들어 본문을 밀었다(CLS 0.056). 데스크톱에서는 CSS 가 숨긴다 */
test.describe("/about 탭 막대", () => {
  test.setTimeout(90_000);

  test("모바일은 처음 칠할 때부터 보이고, 데스크톱은 숨는다", async ({ page, isMobile }) => {
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const bar = document.querySelector('nav[class*="mobileTabBar"]');
        (window as unknown as { __tabBar?: string }).__tabBar = bar ? getComputedStyle(bar).display : "absent";
      });
    });
    await page.goto("/about", { waitUntil: "load" });
    const display = await page.evaluate(() => (window as unknown as { __tabBar?: string }).__tabBar);
    expect(display, "첫 칠의 탭 막대").toBe(isMobile ? "flex" : "none");
  });
});

/* 첫 배치(#942). 예전에는 서버·하이드레이션이 데스크톱 트리를 그렸다 — 무한 스크롤이면 패널 한 세트를 세 벌.
   모바일도 그것을 받아 하이드레이션한 뒤, 붙은 직후 모바일 탭 트리로 통째로 바꿨다(첫 탭 패널도 새로 마운트).
   지금은 서버가 한 세트를 모바일 탭 묶음 안에 그리고, 모바일이면 CSS 가 첫 탭 패널만 보인다. 앞뒤 세트는 데스크톱에서만 붙인다 */
const PANEL = '[class*="AboutPanel-module__"][class*="__panel"]:not([class*="__panelSlot"])';

test.describe("/about 첫 배치", () => {
  test.setTimeout(90_000);

  test("서버 HTML 에는 패널이 한 세트만 들어가고, 앞뒤 세트는 데스크톱에서만 붙는다", async ({ page, isMobile }) => {
    const html = await (await page.request.get("/about")).text();
    expect(html.match(/__heroPanelBg/g)?.length, "서버 HTML 의 히어로 패널").toBe(1);
    const infinite = /\\"infiniteScroll\\":true/.test(html);
    await page.goto("/about", { waitUntil: "load" });
    await page.locator('[class*="loadingScreen"]').first().waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
    await expect(page.locator('[class*="__heroPanelBg"]'), "붙은 뒤 히어로 패널").toHaveCount(!isMobile && infinite ? 3 : 1);
  });

  test("모바일은 하이드레이션 전부터 첫 탭 패널만 보이고, 붙은 뒤에도 서버 HTML 의 노드를 그대로 쓴다", async ({ page, isMobile }) => {
    test.skip(!isMobile, "모바일 배치");
    await page.addInitScript((selector) => {
      document.addEventListener("DOMContentLoaded", () => {
        const panels = [...document.querySelectorAll(selector)];
        const w = window as unknown as { __visible?: number; __first?: Element | null };
        w.__visible = panels.filter((el) => el.getClientRects().length > 0).length;
        w.__first = panels[0] ?? null;
      });
    }, PANEL);
    await page.goto("/about", { waitUntil: "load" });
    await page.locator('[class*="loadingScreen"]').first().waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
    const result = await page.evaluate((selector) => {
      const w = window as unknown as { __visible?: number; __first?: Element | null };
      const visible = [...document.querySelectorAll(selector)].filter((el) => el.getClientRects().length > 0).length;
      return { before: w.__visible, after: visible, kept: !!w.__first && document.contains(w.__first) };
    }, PANEL);
    expect(result.before, "하이드레이션 전에 보이는 패널 수").toBe(result.after);
    expect(result.kept, "첫 패널을 다시 마운트하지 않는다").toBe(true);
  });
});
