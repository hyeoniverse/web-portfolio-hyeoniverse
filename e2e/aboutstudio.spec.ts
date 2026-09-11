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

  test("칩 목록: 추가하면 입력 칸이 열려 적은 글자로 칩이 생기고, 칩을 누르면 고친다", async ({ page }) => {
    await openAbout(page);
    // 예전에는 Design Decisions 태그 추가가 "tag-3" 같은 칩을 만들고 글자를 고칠 방법이 없었다.
    // 저장 단추는 누르지 않는다.
    const dd = page.locator('[data-section-label="Design Decisions"]');
    const chips = dd.locator('[class*="chipSlot"]');
    const before = await chips.count();
    await dd.getByRole("button", { name: /^(태그 추가|Add tag)$/ }).click();
    await page.keyboard.type("rls");
    await page.keyboard.press("Enter");
    await expect(chips, "적은 글자로 칩이 하나 생긴다").toHaveCount(before + 1);
    await expect(chips.last()).toContainText("rls");
    await chips.last().getByRole("button", { name: "rls" }).click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("row-level");
    await page.keyboard.press("Enter");
    await expect(chips.last(), "누르면 그 자리에서 고친다").toContainText("row-level");
  });

  test("Tech Stack: 손잡이를 키보드로 옮기면 같은 카테고리 안에서 순서가 바뀐다", async ({ page }) => {
    await openAbout(page);
    // 예전에는 카테고리 사이 이동만 되고 같은 카테고리 안의 순서는 바꿀 수 없었다. 저장 단추는 누르지 않는다.
    const groups = page.locator('[data-section-label="Tech Stack"] [class*="techChips"]');
    const names = (g: typeof groups) => g.locator('[class*="techDragWrap"]').evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? ""));
    const count = await groups.count();
    let group = groups.first();
    for (let i = 0; i < count; i++) {
      if ((await groups.nth(i).locator('[class*="techDragWrap"]').count()) >= 2) { group = groups.nth(i); break; }
    }
    const before = await names(group);
    test.skip(before.length < 2, "칩이 2개 이상인 카테고리가 없다");
    const handle = group.locator('[class*="techDragWrap"]').last().getByRole("button", { name: /^(끌어서 순서·카테고리 바꾸기|Drag to reorder or change category)$/ });
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(handle, "스페이스로 집는다").toHaveAttribute("aria-pressed", "true");
    // 집은 직후에는 방향키를 받지 않을 수 있다 — 놓일 자리 막대가 보일 때까지 누른다
    const bar = group.locator('[class*="dropBefore"]');
    await expect(async () => {
      if ((await bar.count()) === 0) await page.keyboard.press("ArrowLeft");
      await expect(bar).toHaveCount(1, { timeout: 500 });
    }).toPass({ timeout: 5_000 });
    await page.keyboard.press("Space");
    await expect.poll(() => names(group), { message: "마지막 칩이 한 칸 앞으로" })
      .toEqual([...before.slice(0, -2), before[before.length - 1], before[before.length - 2]]);
  });

  test("ERD 표 모달: 컬럼을 추가하면 새 이름 칸에 포커스가 가고 오류가 나지 않는다", async ({ page }) => {
    // 칸 이름을 화면 언어로 바꾸면서 이 칸을 찾던 선택자가 깨져 추가할 때마다 페이지 오류가 났다(#818).
    // 모달의 "저장"은 누르지 않고 Esc 로 닫는다.
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openAbout(page);
    const erd = page.locator('[data-section-label="Database Design"]');
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
    const erd = page.locator('[data-section-label="Database Design"]');
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
    // 예전에는 Code Highlights 코드 편집기가 마운트되며 코드를 한 번 올려, 저장값이 비어 기본 데이터를
    // 보여 주던 목록이 통째로 설정값에 들어갔다. 열기만 해도 저장 단추가 켜지고 떠날 때마다 확인을 물었다.
    await openAbout(page);
    await expect(page.locator('[data-section-label="Code Highlights"] .cm-content').first(), "코드 편집기가 떴다").toBeAttached({ timeout: 60_000 });
    const save = page.getByRole("button", { name: /^(Save Tab|탭 저장)$/ });
    await expect(save).toBeDisabled();
    // 편집기가 마운트된 직후 한 박자 뒤에 켜지던 버그라, 잠시 뒤에도 꺼져 있는지 본다
    await page.waitForTimeout(1_000);
    await expect(save, "고친 것이 없으면 저장 단추는 꺼져 있다").toBeDisabled();
  });

  test("저장하지 않은 변경이 있으면 탭을 옮기기 전에 묻고, 취소하면 그대로 둔다", async ({ page }) => {
    await openAbout(page);
    const desc = page.getByRole("textbox", { name: /^(개요 설명|Overview description)$/ });
    await desc.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" z");
    const typed = await desc.inputValue();
    await page.locator('nav[class*="sideNav"]').getByText(/^General$/).click();
    await expect(page.getByText(/^(저장하지 않은 변경이 있습니다\. 이동하면 변경이 사라집니다\.|You have unsaved changes\. They will be lost if you leave\.)$/), "옮기기 전에 묻는다").toBeVisible();
    await page.getByRole("button", { name: /^(취소|Cancel)$/ }).last().click();
    await expect(page, "취소하면 About 에 남는다").toHaveURL(/sub=about/);
    await expect(desc, "고친 글도 그대로").toHaveValue(typed);
  });

  test("입력칸이 실제로 그려진다", async ({ page }) => {
    await openAbout(page);
    const count = await page.locator("input, textarea").count();
    expect(count, "편집 화면이니 입력칸이 여럿 있어야 한다").toBeGreaterThan(10);
  });
});
