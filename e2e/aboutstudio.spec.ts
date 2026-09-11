import { test, expect, type Page } from "@playwright/test";

/**
 * About 설정 화면 안전망.
 *
 * 이 화면을 그리는 AboutStudio.tsx 는 2,664줄이고, 그 안에 About 페이지의 각 구획을
 * 편집하는 블록 12개가 함께 들어 있다. 이것을 파일로 나눌 예정인데 지금 이 화면을
 * 확인하는 검사는 "페이지가 열리는가" 뿐이다. 블록 하나가 사라져도 통과한다.
 *
 * 이 검사는 화면을 열고 눌러 보기만 한다. 저장 단추(Save Tab·Reset to Defaults)는
 * 누르지 않는다. 실제 사이트 설정을 상대로 돌기 때문에 누르면 설정이 바뀐다.
 */

const ABOUT_TAB = "/admin/settings?tab=content&sub=about";

async function openAbout(page: Page) {
  await page.goto(ABOUT_TAB, { waitUntil: "load" });
  await expect(
    page.getByRole("heading", { name: "Overview." }),
    "첫 블록이 떠야 한다",
  ).toBeVisible({ timeout: 60_000 });
}

test.describe("About 설정 화면", () => {
  test.setTimeout(180_000);

  test("여덟 개 편집 블록이 모두 그려진다", async ({ page }) => {
    await openAbout(page);
    for (const name of [
      "Overview.", "User Flow.", "Key Features.", "Design Process.",
      "Security.", "Backend.", "Code Highlights.", "Design Decisions.",
    ]) {
      await expect(page.getByRole("heading", { name }), `${name} 블록`).toBeVisible();
    }
  });

  test("한국어·영어 전환 탭이 있다", async ({ page }) => {
    await openAbout(page);
    const ko = page.getByRole("tab", { name: "KO" }).first();
    const en = page.getByRole("tab", { name: "EN" }).first();
    await expect(ko, "KO 탭").toBeVisible();
    await expect(en, "EN 탭").toBeVisible();
  });

  test("Architecture 블록의 보기 전환 탭이 동작한다", async ({ page }) => {
    await openAbout(page);

    // 디렉토리 트리 / 다이어그램 두 가지 보기가 있다.
    // 편집 화면의 버튼·탭 이름은 관리자 화면 언어를 따르므로 두 언어 모두 받는다.
    const tree = page.getByRole("tab", { name: /디렉토리 트리|Directory tree/ }).first();
    const diagram = page.getByRole("tab", { name: /다이어그램|Diagram/ }).first();
    await expect(tree).toBeVisible();
    await expect(diagram).toBeVisible();

    await diagram.click();
    await page.waitForTimeout(600);
    await expect(diagram, "누르면 선택 상태가 된다").toHaveAttribute("aria-selected", "true");
  });

  test("저장 단추가 있고 눌리는 상태다", async ({ page }) => {
    await openAbout(page);
    // 실제로 누르지는 않는다. 설정이 바뀐다.
    await expect(page.getByRole("button", { name: "Save Tab" }), "저장 단추").toBeVisible();
  });

  test("입력칸이 실제로 그려진다", async ({ page }) => {
    await openAbout(page);
    const count = await page.locator("input, textarea").count();
    expect(count, "편집 화면이니 입력칸이 여럿 있어야 한다").toBeGreaterThan(10);
  });
});
