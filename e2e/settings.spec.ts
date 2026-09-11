import { test, expect, type Page } from "@playwright/test";

/**
 * 설정 화면 안전망.
 *
 * 이 화면을 그리는 settings/page.tsx 는 1,110줄이고, 그중 로직이 700줄쯤 된다. 탭 전환,
 * 저장, 되돌리기, 기본값 복원, 탭 사이의 충돌 감지가 한 컴포넌트에 들어 있다.
 * 이것을 나눌 예정인데 지금 검사는 각 탭 주소가 열리는지만 본다.
 *
 * **저장 단추는 누르지 않는다.** 실제 사이트 설정을 상대로 돌기 때문에 누르면 설정이 바뀐다.
 * 눌러도 되는 것은 탭 전환뿐이다.
 */

async function openSettings(page: Page, query = "tab=general") {
  await page.goto(`/admin/settings?${query}`, { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: "Settings" }), "설정 화면").toBeVisible({ timeout: 60_000 });
}

test.describe("설정 화면", () => {
  test.setTimeout(180_000);

  test("탭 목록이 모두 그려진다", async ({ page }) => {
    await openSettings(page);
    for (const name of ["General", "Content", "Appearance", "Services", "Account"]) {
      await expect(page.getByRole("button", { name, exact: true }), `${name} 탭`).toBeVisible();
    }
  });

  test("Content 탭에는 하위 탭이 있다", async ({ page }) => {
    await openSettings(page, "tab=content&sub=home");
    for (const name of ["HOME", "PROFILE", "ABOUT", "WORKS", "POSTS", "CALENDAR"]) {
      await expect(page.getByRole("button", { name, exact: true }), `${name} 하위 탭`).toBeVisible();
    }
  });

  test("탭을 바꾸면 주소와 내용이 함께 바뀐다", async ({ page }) => {
    await openSettings(page);
    const before = await page.locator("main, [class*='content']").first().innerText();

    await page.getByRole("button", { name: "Services", exact: true }).click();
    await page.waitForTimeout(1200);

    expect(page.url(), "주소에 탭이 반영된다").toContain("tab=services");
    const after = await page.locator("main, [class*='content']").first().innerText();
    expect(after, "내용이 달라진다").not.toBe(before);
  });

  test("저장·되돌리기·기본값 단추가 있다", async ({ page }) => {
    await openSettings(page);
    // 있는지만 본다. 누르면 실제 설정이 바뀐다.
    await expect(page.getByRole("button", { name: "Save Tab" }), "탭 저장").toBeVisible();
    await expect(page.getByRole("button", { name: "Revert" }).first(), "되돌리기").toBeVisible();
    await expect(page.getByRole("button", { name: "Reset to Defaults" }), "기본값").toBeVisible();
  });

  test("섹션마다 저장 단추가 따로 있다", async ({ page }) => {
    await openSettings(page);
    const sectionSaves = page.getByRole("button", { name: "Save Section" });
    expect(await sectionSaves.count(), "섹션별 저장 단추").toBeGreaterThan(1);
  });

  test("Posts 하위탭의 시리즈 카드는 순서 번호 뒤에 제목이 보인다", async ({ page }) => {
    // 순서 번호가 표의 # 칸처럼 줄을 채우면 번호가 제목 줄 전체 폭이 되고, 넘친 제목 줄의 말줄임표가
    // 제목을 통째로 가려 "#…"만 남는다
    await openSettings(page, "tab=content&sub=posts");
    const name = page.locator('p[class*="seriesCardName"]').first();
    await expect(name, "시리즈 카드").toBeVisible({ timeout: 60_000 });
    const { line, number, titleStart } = await name.evaluate((p) => {
      const box = p.getBoundingClientRect();
      const range = document.createRange();
      range.selectNode(p.lastChild!);
      return { line: box.width, number: p.firstElementChild!.getBoundingClientRect().width, titleStart: range.getBoundingClientRect().left - box.left };
    });
    expect(number, "번호는 번호만큼만 차지한다").toBeLessThan(line / 4);
    expect(titleStart, "제목이 줄 안에서 시작한다").toBeLessThan(line);
  });
  test("탭을 주소로 바로 열 때 불러오는 동안 사이트 푸터가 밀리지 않는다", async ({ page }) => {
    // 설정값과 탭 편집기를 받는 동안 보이는 뼈대가 실제 내용보다 짧아, 긴 화면에서 푸터가 화면 안에 그려졌다가
    // 내용이 들어오며 밀려 내려갔다(1440×1400 에서 레이아웃 밀림 0.21, #838). 탭 편집기를 연 뒤에 받게 되면서
    // 보통 높이(900)에서도 같은 일이 생길 수 있어, 뼈대가 있는 동안 푸터를 감춘다.
    await page.setViewportSize({ width: 1440, height: 1400 });
    await page.addInitScript(() => {
      const w = window as unknown as { __footerShift: number };
      w.__footerShift = 0;
      new PerformanceObserver((list) => {
        type Shift = { value: number; hadRecentInput: boolean; sources?: { node?: Node | null }[] };
        for (const e of list.getEntries() as unknown as Shift[]) {
          if (e.hadRecentInput) continue;
          if ((e.sources ?? []).some((s) => s.node instanceof Element && s.node.tagName === "FOOTER")) w.__footerShift += e.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await openSettings(page, "tab=appearance");
    await expect(page.locator("[data-settings-section]").first(), "Appearance 탭 내용").toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const shift = await page.evaluate(() => (window as unknown as { __footerShift: number }).__footerShift);
    expect(shift, "푸터가 일으킨 레이아웃 밀림").toBeLessThan(0.01);
  });
});
