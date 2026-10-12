import { test, expect, type Page } from "@playwright/test";

/**
 * About 설정 화면 안전망.
 *
 * 개편된 /about 은 글 · 장면을 코드에 두고, 구조 장의 기술 그래프 · 사용자 흐름 · DB 설계 세 장면만
 * 관리자 설정(about.archDiagram · userFlows · erdTables/erdRelations)을 먼저 쓴다. 편집기도 그 셋만 둔다.
 *
 * 이 검사는 화면을 열고 눌러 보기만 한다. 저장 단추(Save Tab·Reset to Defaults)는
 * 누르지 않는다. 실제 사이트 설정을 상대로 돌기 때문에 누르면 설정이 바뀐다.
 */

const ABOUT_TAB = "/admin/settings?tab=content&sub=about";

/* 패널 이름은 공개 페이지의 장면 라벨이고 관리자 화면 언어를 따른다 */
const section = (page: Page, ko: string, en: string) =>
  page.locator(`[data-section-label="${ko}"], [data-section-label="${en}"]`);

async function openAbout(page: Page) {
  await page.goto(ABOUT_TAB, { waitUntil: "load" });
  await expect(section(page, "기술 그래프", "Tech graph"), "첫 패널이 떠야 한다").toBeVisible({ timeout: 60_000 });
}

test.describe("About 설정 화면", () => {
  test.setTimeout(180_000);

  test("공개 페이지가 읽는 세 패널만 그려진다", async ({ page }) => {
    await openAbout(page);
    await expect(section(page, "사용자 흐름", "User flows"), "사용자 흐름").toBeVisible();
    await expect(section(page, "DB 설계", "Database design"), "DB 설계").toBeVisible();
    await expect(page.locator("[data-section-label]"), "패널은 셋").toHaveCount(3);
  });

  test("한국어·영어 전환 탭이 있다", async ({ page }) => {
    await openAbout(page);
    await expect(page.getByRole("tab", { name: "KO" }).first(), "KO 탭").toBeVisible();
    await expect(page.getByRole("tab", { name: "EN" }).first(), "EN 탭").toBeVisible();
  });

  test("저장 단추가 있다", async ({ page }) => {
    await openAbout(page);
    // 실제로 누르지는 않는다. 설정이 바뀐다.
    await expect(page.getByRole("button", { name: /^(Save Tab|탭 저장)/ }), "저장 단추").toBeVisible();
  });

  test("ERD 표 모달: 컬럼을 추가하면 새 이름 칸에 포커스가 가고 오류가 나지 않는다", async ({ page }) => {
    // 칸 이름을 화면 언어로 바꾸면서 이 칸을 찾던 선택자가 깨져 추가할 때마다 페이지 오류가 났다(#818).
    // 모달의 "저장"은 누르지 않고 Esc 로 닫는다.
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openAbout(page);
    const erd = section(page, "DB 설계", "Database design");
    await erd.getByRole("tab", { name: /^(목록|List)$/ }).click();
    await erd.locator('[class*="cardMain"]').first().click();
    const add = page.getByRole("button", { name: /^(컬럼 추가|Add column)$/ });
    await expect(add, "모달이 열린다").toBeVisible();
    const names = page.locator("input[data-col-name]");
    const before = await names.count();
    await add.click();
    await expect(names, "행이 하나 는다").toHaveCount(before + 1);
    await expect(names.last(), "새 행의 이름 칸에 포커스").toBeFocused();
    expect(errors, "페이지 오류가 없다").toEqual([]);
    await page.keyboard.press("Escape");
  });

  test("ERD 표 모달: 손잡이를 키보드로 옮기면 컬럼 순서가 바뀌고 선택 표시가 그 컬럼을 따라간다", async ({ page }) => {
    // 예전에는 HTML5 끌기라 키보드·터치로 옮길 수 없었고, 선택 표시는 몇 번째인지로만 들고 있어
    // 순서를 바꾸면 다른 컬럼이 선택된 채로 남았다. 모달의 "저장"은 누르지 않고 Esc 로 닫는다.
    await openAbout(page);
    const erd = section(page, "DB 설계", "Database design");
    await erd.getByRole("tab", { name: /^(목록|List)$/ }).click();
    await erd.locator('[class*="cardMain"]').first().click();
    const groups = page.locator("table tbody");
    await expect(groups.first(), "모달이 열린다").toBeVisible();
    const names = () => page.locator("input[data-col-name]").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    const before = await names();
    // 1번 컬럼을 고른다(체크 상자는 모양 요소가 입력을 덮고 있어 그것을 누른다)
    await groups.nth(0).locator('[class*="Checkbox-module"][class*="box"]').first().click();
    const handle = groups.nth(0).getByRole("button", { name: /^(끌어서 순서 변경|Drag to reorder)$/ });
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(handle, "스페이스로 집는다").toHaveAttribute("aria-pressed", "true");
    // 행은 transition 으로 서서히 옮겨지고 표 영역이 따라 스크롤되기도 해서, 위치로 "옮겨졌나"를 보면
    // 방향키를 한 번 더 눌러 두 칸을 옮기기도 한다. 방향키는 한 번만 누르고, 놓을 대상이 다음 컬럼으로
    // 바뀌었다는 dnd-kit 의 화면 읽기 안내를 기다린 뒤 놓는다.
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('[id^="DndLiveRegion"]').filter({ hasText: "was moved over droppable area 1." }),
      "놓을 대상이 2번 컬럼으로 바뀐다").toHaveCount(1);
    await page.keyboard.press("Space");
    await expect.poll(names, { message: "1번과 2번이 자리를 바꾼다" }).toEqual([before[1], before[0], ...before.slice(2)]);
    const checked = await groups.evaluateAll((bs) => bs.map((b, i) => (b.querySelector('input[type="checkbox"]:checked') ? i : -1)).filter((i) => i >= 0));
    expect(checked, "선택 표시가 옮긴 컬럼(이제 2번)을 따라간다").toEqual([1]);
    await page.keyboard.press("Escape");
  });

  test("About 을 열기만 해서는 저장할 것이 생기지 않는다", async ({ page }) => {
    await openAbout(page);
    const save = page.getByRole("button", { name: /^(Save Tab|탭 저장)$/ });
    await expect(save).toBeDisabled();
    await page.waitForTimeout(1_000);
    await expect(save, "고친 것이 없으면 저장 단추는 꺼져 있다").toBeDisabled();
  });

  test("고친 패널은 사이드바 목록에 표시되고, 되돌리면 빠진다", async ({ page }) => {
    await openAbout(page);
    const outline = page.getByRole("list", { name: /^(이 화면의 섹션|Sections on this page)$/ });
    const marked = outline.getByRole("button", { name: /, (저장 안 됨|unsaved)$/ });
    await expect(marked, "처음에는 표시가 없다").toHaveCount(0);
    const flows = section(page, "사용자 흐름", "User flows");
    const desc = flows.getByRole("textbox", { name: /^(설명|Description)$/ }).first();
    await desc.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" z");
    await expect(marked, "고친 패널에 표시").toHaveCount(1);
    await desc.scrollIntoViewIfNeeded();
    await flows.getByRole("button", { name: /^(Revert|되돌리기)$/ }).first().click();
    await expect(marked, "되돌린 패널은 표시가 빠진다").toHaveCount(0);
  });
});
