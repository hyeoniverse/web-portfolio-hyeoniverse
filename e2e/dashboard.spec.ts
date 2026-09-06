import { test, expect, type Page } from "@playwright/test";

/**
 * 관리자 대시보드 안전망 — #704 6-1 의 분해 전에 지금 화면을 고정한다.
 *
 * `page.tsx` 가 3,064줄이고 그 안에 차트·히트맵·도넛 같은 서브 컴포넌트 12개가 들어 있다.
 * 이걸 파일로 쪼갤 참인데, 스모크는 페이지가 뜨는지만 보고 각 조각이 실제로 그려지는지는
 * 보지 않는다. 특히 달력 히트맵과 날짜 상세 패널은 클릭해야 나와서 페이지 로드만으로는 닿지 않는다.
 *
 * CSS Modules 는 클래스 이름을 해시로 바꾸므로 `[class*="..."]` 로 조각 이름만 맞춘다.
 */

async function openDashboard(page: Page) {
  await page.goto("/admin", { waitUntil: "load" });
  // 데이터를 받아 그릴 때까지 기다린다 — 스켈레톤이 먼저 뜬다.
  await expect(page.locator('[class*="dailyChart"]').first()).toBeVisible({ timeout: 30_000 });
}

test.describe("관리자 대시보드", () => {
  test.setTimeout(120_000);

  test("첫 화면에 통계 조각들이 그려진다", async ({ page }) => {
    await openDashboard(page);

    await expect(page.locator('[class*="heroSparkWrap"]').first(), "요약 스파크라인").toBeVisible();
    await expect(page.locator('[class*="chartArea"]').first(), "일별 조회수 차트").toBeVisible();
    await expect(page.locator('[class*="donutLegendItem"]').first(), "카테고리 도넛 범례").toBeVisible();
    await expect(page.locator('[class*="devicesWrap"]').first(), "기기 분포").toBeVisible();
    await expect(page.locator('[class*="deviceTab"]').first(), "기기 탭").toBeVisible();
  });

  test("기기 탭을 바꾸면 분류가 바뀐다", async ({ page }) => {
    await openDashboard(page);

    // 컨테이너가 role="tablist" 라 항목은 role="tab" 으로 잡는다 — 해시 클래스보다 안정적이다.
    const tabs = page.locator('[class*="deviceTabs"] [role="tab"]');
    // count() 는 기다리지 않는다. 기기 패널은 차트와 따로 그려져서 먼저 나타날 때까지 기다린다.
    await expect(tabs.first()).toBeVisible({ timeout: 15_000 });
    const count = await tabs.count();
    expect(count, "기기 종류·OS·브라우저 세 탭").toBeGreaterThanOrEqual(3);

    const before = await page.locator('[class*="deviceLegend"]').first().innerText();
    await tabs.nth(1).click();
    await page.waitForTimeout(500);
    const after = await page.locator('[class*="deviceLegend"]').first().innerText();
    expect(after, "탭을 바꾸면 범례 내용이 달라진다").not.toBe(before);
  });

  test("달력 보기로 바꾸면 히트맵이 나온다", async ({ page }) => {
    await openDashboard(page);

    // 일별 조회수 헤더의 보기 전환(선/달력) — 아이콘 버튼이라 두 번째 것을 누른다.
    const header = page.locator('[class*="dailyChart"]').first();
    const segments = header.locator('button[role="radio"], [role="radiogroup"] button, button').filter({ hasText: /^$/ });
    await segments.last().click();
    await page.waitForTimeout(800);

    const heat = page.locator('[class*="heat"], [class*="calendarCell"], [class*="calGrid"]').first();
    await expect(heat, "달력 히트맵이 그려져야 한다").toBeVisible({ timeout: 10_000 });
  });

  test("날짜를 누르면 그날 상세 패널이 열린다", async ({ page }) => {
    await openDashboard(page);

    // 선 그래프의 날짜 열(dotColumn)을 누르면 아래에 그날 상세가 펼쳐진다.
    const days = page.locator('[class*="dotColumn"], [class*="areaDay"]:not([class*="areaDayDow"])');
    await expect(days.first()).toBeVisible({ timeout: 15_000 });
    await days.nth(2).click();
    await page.waitForTimeout(600);

    const panel = page.locator('[class*="dayDetail"], [class*="dayPanel"]').first();
    await expect(panel, "그날 상세 패널이 열려야 한다").toBeVisible({ timeout: 10_000 });
  });
});
