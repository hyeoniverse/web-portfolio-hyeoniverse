import { test, expect, type Page } from "@playwright/test";

/**
 * 작업물 편집 화면 안전망.
 *
 * 이 화면을 그리는 WorkEditor.tsx 는 2,714줄이고, 그 안에 팀원 카드·카테고리 선택기 같은
 * 조각이 함께 들어 있다. 이것을 파일로 나눌 예정인데 지금 이 화면을 확인하는 검사가 없다.
 * 스모크 목록에는 작업물 목록(/admin/works)만 있고 편집 화면은 빠져 있다.
 *
 * 이 검사는 화면을 열고 눌러 보기만 한다. 저장 단추(임시저장·등록)는 누르지 않는다.
 * 실제 데이터베이스를 상대로 돌기 때문에 누르면 진짜 작업물이 만들어진다.
 *
 * 입력칸은 placeholder 로 찾는다. 이 화면의 label 은 input 과 연결돼 있지 않아서
 * (for 속성도 없고 input 을 감싸지도 않는다) 이름으로는 찾을 수 없다.
 */

async function openEditor(page: Page) {
  await page.goto("/admin/works/new", { waitUntil: "load" });
  await expect(
    page.getByRole("heading", { name: "기본 정보" }),
    "편집 화면의 첫 섹션이 떠야 한다",
  ).toBeVisible({ timeout: 30_000 });
}

test.describe("작업물 편집 화면", () => {
  test.setTimeout(120_000);

  test("여덟 개 섹션이 모두 그려진다", async ({ page }) => {
    await openEditor(page);
    for (const name of ["기본 정보", "본문", "이미지", "기술 스택", "팀원", "링크", "관련 글", "관련 시리즈"]) {
      await expect(page.getByRole("heading", { name }), `${name} 섹션`).toBeVisible();
    }
  });

  test("기본 정보 입력칸에 값이 들어간다", async ({ page }) => {
    await openEditor(page);

    const title = page.getByPlaceholder("작업 제목");
    await title.fill("안전망 확인용 제목");
    await expect(title).toHaveValue("안전망 확인용 제목");

    const subtitle = page.getByPlaceholder("부제목");
    await subtitle.fill("부제목 확인");
    await expect(subtitle).toHaveValue("부제목 확인");

    await expect(page.getByPlaceholder("work-url-slug"), "Slug 입력칸").toBeVisible();
    // 연도는 표기 방식(Year / Y.M / Y.M.D)을 고르는 단추로 확인한다.
    // 입력칸 자체는 그 선택에 따라 나타나고 사라진다.
    await expect(page.getByRole("button", { name: "Year", exact: true }), "연도 표기 선택").toBeVisible();
  });

  test("본문 편집기가 뜨고 글자가 들어간다", async ({ page }) => {
    await openEditor(page);

    const editor = page.locator("[data-slate-editor]").first();
    await expect(editor, "본문 편집기").toBeVisible();
    await editor.click();
    await page.keyboard.type("safety net");
    await expect(editor, "친 글자가 남는다").toContainText("safety net");
  });

  test("팀원 추가 단추는 이름을 넣어야 눌린다", async ({ page }) => {
    await openEditor(page);

    const addBtn = page.getByRole("button", { name: "Add member" });
    await expect(addBtn, "팀원 추가 단추").toBeVisible();
    await expect(addBtn, "이름이 비어 있으면 눌리지 않는다").toBeDisabled();

    await page.getByPlaceholder("이름").first().fill("확인용 이름");
    await expect(addBtn, "이름을 넣으면 눌린다").toBeEnabled();
  });

  test("이미지 섹션에 URL 입력칸과 파일 선택이 있다", async ({ page }) => {
    await openEditor(page);
    await expect(page.getByPlaceholder("또는 이미지 URL 붙여넣기"), "이미지 URL 입력칸").toBeVisible();
    expect(await page.locator('input[type="file"]').count(), "파일 선택 입력칸").toBeGreaterThan(0);
  });
});
