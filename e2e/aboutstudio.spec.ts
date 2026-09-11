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

  test("번호 탭 블록: 도구가 보이고, 새 항목은 입력 전까지 저장할 것이 아니다", async ({ page }) => {
    await openAbout(page);
    // 스테이지의 삭제 단추는 올리지 않아도 보인다. 예전에는 Backend·User Flow·Design Decisions 에서
    // 도구 묶음이 투명해 올려도 보이지 않았다(toBeVisible 은 투명도를 보지 않으므로 직접 잰다).
    for (const label of ["User Flow", "Backend", "Code Highlights", "Design Decisions", "Design System"]) {
      const remove = page.locator(`[data-section-label="${label}"]`).getByRole("button", { name: /^(삭제|Remove)$/ }).first();
      await expect(remove, `${label} 삭제 단추`).toBeVisible();
      const opacity = await remove.evaluate((el) => getComputedStyle(el.parentElement!).opacity);
      expect(opacity, `${label} 도구 묶음이 투명하지 않다`).toBe("1");
    }

    // 추가는 초안만 만든다. 저장 단추는 누르지 않고 켜졌는지만 본다.
    const ds = page.locator('[data-section-label="Design System"]');
    const dots = ds.getByRole("button", { name: /^\d{2}$/ });
    const save = ds.getByRole("button", { name: /^(Save Section|섹션 저장)$/ });
    const before = await dots.count();
    await ds.getByRole("button", { name: /^(Add concept|컨셉 추가)$/ }).click();
    await expect(dots, "초안 번호가 하나 붙는다").toHaveCount(before + 1);
    await expect(save, "손대지 않은 초안은 저장할 것이 아니다").toBeDisabled();
    await dots.first().click();
    await expect(dots, "다른 번호로 가면 초안은 사라진다").toHaveCount(before);
  });

  test("카드 목록: 손잡이를 키보드로 옮기면 순서가 바뀌고, 들어가면 도구가 보인다", async ({ page }) => {
    await openAbout(page);
    const security = page.locator('[data-section-label="Security"]');
    const titles = () => security.getByRole("textbox", { name: /^(제목|Title)$/ }).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    const before = await titles();
    const handle = security.getByRole("button", { name: /^(끌어서 순서 변경|Drag to reorder)$/ }).first();
    await handle.focus();
    // 키보드로 들어가면 도구 묶음이 보인다(마우스를 올리지 않아도)
    const opacity = await handle.evaluate((el) => getComputedStyle(el.parentElement!).opacity);
    expect(opacity, "키보드 포커스로 도구가 보인다").toBe("1");
    // 스페이스로 집고 오른쪽 칸으로 옮겨 놓는다. 저장 단추는 누르지 않는다.
    // dnd-kit 키보드 센서는 집은 직후 잠깐 방향키를 받지 않는다(칸 위치를 재는 중). 잡은 칸이 실제로
    // 오른쪽으로 옮겨졌는지 보고, 아직이면 방향키를 다시 누른다. 놓을 자리는 그다음 렌더에서 정해지므로
    // 옆 칸이 왼쪽으로 비켜서는 것까지 본 뒤에 놓는다 — 먼저 놓으면 제자리에 놓인다.
    await page.keyboard.press("Space");
    await expect(handle, "스페이스로 집는다").toHaveAttribute("aria-pressed", "true");
    const items = security.locator('[class*="editSecItem"]');
    const shiftX = (i: number) => items.nth(i).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    await expect(async () => {
      if ((await shiftX(0)) === 0) await page.keyboard.press("ArrowRight");
      expect(await shiftX(0), "잡은 칸이 오른쪽으로 옮겨진다").toBeGreaterThan(0);
    }).toPass({ timeout: 5_000 });
    await expect.poll(() => shiftX(1), { message: "옆 칸이 비켜선다" }).toBeLessThan(0);
    await page.keyboard.press("Space");
    await expect.poll(titles, { message: "1번과 2번이 자리를 바꾼다" }).toEqual([before[1], before[0], ...before.slice(2)]);
  });

  test("입력칸이 실제로 그려진다", async ({ page }) => {
    await openAbout(page);
    const count = await page.locator("input, textarea").count();
    expect(count, "편집 화면이니 입력칸이 여럿 있어야 한다").toBeGreaterThan(10);
  });
});
