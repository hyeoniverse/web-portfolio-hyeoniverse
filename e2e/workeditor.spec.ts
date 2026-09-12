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

/* 화면 언어를 정해 둔다. e2e 저장 상태에는 헤드리스 브라우저 언어(en-US)로 고른 "en" 이 들어 있다.
   서버는 한국어로 그리고 마운트 뒤에 저장된 언어로 바꾸므로, 정해 두지 않으면 한국어 제목을 찾은 직후 영어로 바뀐다.
   편집 문구가 화면 언어를 따르기 전에는(#855) 새 작업물의 한국어 탭을 따라서 이 차이가 드러나지 않았다. */
function pinLanguage(page: Page, lang: "ko" | "en") {
  return page.addInitScript((l) => { try { localStorage.setItem("language", l); } catch { /* 저장소를 못 쓰면 기본 언어 */ } }, lang);
}

async function openEditor(page: Page, lang: "ko" | "en" = "ko") {
  await pinLanguage(page, lang);
  await page.goto("/admin/works/new", { waitUntil: "load" });
  await expect(
    page.getByRole("heading", { name: lang === "ko" ? "기본 정보" : "Basic Info" }),
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

  /* 새로 만들 때는 초안 확인이 끝나면 제목 칸에 포커스를 준다(#897). 기존 작업물 편집은 주지 않는다 */
  test("새 작업물을 열면 제목 칸에 포커스가 있다", async ({ page }) => {
    await openEditor(page);
    await expect(page.getByPlaceholder("작업 제목")).toBeFocused({ timeout: 15_000 });
  });

  test("기존 작업물 편집 화면은 제목 칸에 포커스를 주지 않는다", async ({ page }) => {
    const body = await (await page.request.get("/api/works?limit=1")).json();
    const id = (body.works ?? body.data ?? body)[0]?.id as string;
    expect(id, "작업물 하나").toBeTruthy();
    await pinLanguage(page, "ko");
    await page.goto(`/admin/works/${id}/edit`, { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: "기본 정보" }), "편집 화면").toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(3_000);
    await expect(page.getByPlaceholder("작업 제목")).not.toBeFocused();
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
    // 연도는 표기 방식(연도 / 연.월 / 연.월.일)을 고르는 단추로 확인한다.
    // 입력칸 자체는 그 선택에 따라 나타나고 사라진다.
    await expect(page.getByRole("button", { name: "연도", exact: true }), "연도 표기 선택").toBeVisible();
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

    const addBtn = page.getByRole("button", { name: "팀원 추가", exact: true });
    await expect(addBtn, "팀원 추가 단추").toBeVisible();
    await expect(addBtn, "이름이 비어 있으면 눌리지 않는다").toBeDisabled();

    await page.getByPlaceholder("이름").first().fill("확인용 이름");
    await expect(addBtn, "이름을 넣으면 눌린다").toBeEnabled();
  });

  test("영어 화면이면 새 작업물(한국어 탭)이어도 편집 문구가 영어로 나온다", async ({ page }) => {
    // 예전에는 문구가 편집 중인 언어 탭을 따라, 영어 화면에서 한국어 작업물을 열면 한국어로 나왔다(#855)
    await openEditor(page, "en");
    await expect(page.getByRole("switch").filter({ hasText: "KO" }), "편집 중인 언어 탭은 한국어").toHaveAttribute("aria-checked", "false");
    for (const name of ["Basic Info", "Content", "Images", "Tech Stack", "Team Members", "Links", "Related Posts", "Related Series"]) {
      await expect(page.getByRole("heading", { name, exact: true }), `${name} 섹션`).toBeVisible();
    }
    await expect(page.getByPlaceholder("Work Title"), "제목 칸").toBeVisible();
    await expect(page.getByRole("button", { name: "Add member", exact: true }), "팀원 추가 단추").toBeVisible();
  });

  test("이미지 섹션에 URL 입력칸과 파일 선택이 있다", async ({ page }) => {
    await openEditor(page);
    await expect(page.getByPlaceholder("또는 이미지 URL 붙여넣기"), "이미지 URL 입력칸").toBeVisible();
    expect(await page.locator('input[type="file"]').count(), "파일 선택 입력칸").toBeGreaterThan(0);
  });
  test("기존 작업물 편집 화면을 열기만 해서는 자동저장 리비전을 보내지 않는다", async ({ page }) => {
    // 본문 편집기가 불러온 HTML 을 다듬어 올리는 변경을 편집으로 여겨, 열기만 해도 3초 뒤 리비전을 보냈다(#837).
    // 실제 데이터베이스라 저장 요청은 여기서 막고, 보내려 했는지만 센다.
    const attempts: string[] = [];
    await page.route("**/api/revisions**", (route) => {
      if (route.request().method() === "GET") return route.continue();
      attempts.push(route.request().method());
      return route.abort();
    });
    const res = await page.request.get("/api/works?limit=1");
    const body = await res.json();
    const id = (body.works ?? body.data ?? body)[0]?.id as string;
    expect(id, "작업물 하나").toBeTruthy();
    await pinLanguage(page, "ko");
    await page.goto(`/admin/works/${id}/edit`, { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: "기본 정보" }), "편집 화면").toBeVisible({ timeout: 30_000 });
    // 자동저장은 변경 뒤 3초에 보낸다 — 편집기가 뜨고 다듬는 시간까지 넉넉히 기다린다
    await page.waitForTimeout(7_000);
    expect(attempts, "열기만 했을 때 리비전 저장 요청").toEqual([]);

    // 실제로 고치면 예전처럼 자동저장한다(요청은 막혀서 저장되지는 않는다)
    const title = page.getByPlaceholder("작업 제목");
    await title.click();
    await page.keyboard.press("End");
    // 자동저장은 10자 이상 바뀌어야 보낸다
    await page.keyboard.type(" autosave check text");
    await expect.poll(() => attempts.length, { message: "고친 뒤 리비전 저장 요청", timeout: 10_000 }).toBeGreaterThan(0);
  });
});
