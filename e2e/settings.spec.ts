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
});
