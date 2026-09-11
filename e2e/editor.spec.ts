import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * 에디터 e2e — Phase 4-5(컴포넌트 슬라이스) 의 안전망.
 *
 *   npx playwright test --project=admin editor.spec.ts
 *
 * 편집 화면은 오랫동안 스모크 대상이 아니었다(캡처가 불안정하다는 이유). 그래서 분해 전에
 * "글자가 제대로 들어가는가" 만이라도 고정해 둔다.
 *
 * IME 는 CDP 로 넣는다. Playwright 의 keyboard API 로는 조합(composition)을 만들 수 없고,
 * 한글 입력에서 가장 자주 깨지는 곳이 조합 중 재렌더라 이 경로를 반드시 봐야 한다.
 * Input.imeSetComposition 은 실제 compositionstart/update/end 를 발생시킨다.
 */

const NEW_POST = "/admin/posts/new";

async function openEditor(page: Page) {
  await page.goto(NEW_POST, { waitUntil: "load" });
  const editor = page.locator("[data-slate-editor]").first();
  await expect(editor, "편집 화면에 Plate 에디터가 있어야 한다").toBeVisible({ timeout: 30_000 });
  await editor.click();
  return editor;
}

/** 한 글자를 조합 단계대로 넣고 확정한다. steps 는 조합 중 보이는 중간 글자들. */
async function composeIME(page: Page, steps: string[], commit: string) {
  const cdp = await page.context().newCDPSession(page);
  for (const text of steps) {
    await cdp.send("Input.imeSetComposition", {
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    });
    await page.waitForTimeout(60);
  }
  await cdp.send("Input.insertText", { text: commit });
  await page.waitForTimeout(400);
}

test.describe("에디터 입력", () => {
  test.setTimeout(120_000);

  test("한글 IME 조합 — 첫 글자가 중복되지 않는다", async ({ page }) => {
    const editor = await openEditor(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    // "안녕" — ㅇ → 아 → 안 → 안ㄴ → 안녀 → 안녕
    await composeIME(page, ["ㅇ", "아", "안", "안ㄴ", "안녀", "안녕"], "안녕");

    const text = (await editor.innerText()).trim();
    expect(text, "조합 결과가 그대로 들어가야 한다 (중복되면 ㅇ안녕·안안녕 처럼 된다)").toBe("안녕");
    expect(errors, "입력 중 런타임 에러가 없어야 한다").toEqual([]);
  });

  test("한글 IME — 두 번 이어 조합해도 누락·중복이 없다", async ({ page }) => {
    const editor = await openEditor(page);
    await composeIME(page, ["ㅎ", "하", "한"], "한");
    await composeIME(page, ["ㄱ", "그", "글"], "글");

    expect((await editor.innerText()).trim()).toBe("한글");
  });

  test("영문 입력 — 조합 없이 그대로 들어간다", async ({ page }) => {
    const editor = await openEditor(page);
    await page.keyboard.type("hello");
    await page.waitForTimeout(300);

    expect((await editor.innerText()).trim()).toBe("hello");
  });
});

/**
 * 표 안전망.
 *
 * 표를 그리는 TableElements.tsx 는 1,322줄이고, 그 안에 세 가지가 함께 들어 있다.
 * 표·행·열을 고르는 처리, 행과 열을 더하는 손잡이, 칸 하나의 테두리와 폭 조절이다.
 * 이것을 나눌 예정인데 지금은 표를 확인하는 검사가 행 높이 저장 하나뿐이다.
 *
 * 저장하지 않는다. 새 글 화면에서 표를 넣고 만져 보기만 하고 그대로 떠난다.
 */

/**
 * 칸을 누르고, 커서가 그 칸 안에 실제로 들어갈 때까지 기다린다.
 *
 * 누른 직후 바로 입력하면 첫 글자만 남는다. 커서가 아직 자리를 잡지 않은 상태라
 * 뒷글자가 갈 곳을 잃기 때문이다. 기다리는 시간을 정해 두면 기계가 바쁠 때 모자라므로,
 * 커서 위치를 직접 확인한다.
 */
async function focusCell(page: Page, cell: Locator) {
  await cell.click();
  await expect
    .poll(async () => cell.evaluate((el) => {
      const sel = document.getSelection();
      return !!sel?.anchorNode && el.contains(sel.anchorNode);
    }), { message: "커서가 그 칸 안에 있다", timeout: 10_000 })
    .toBe(true);
}

/** 본문 도구 모음의 Table 단추로 3×3 표(머리글 포함)를 넣는다. */
async function insertTable(page: Page) {
  const editor = await openEditor(page);
  await page.getByRole("button", { name: "Table", exact: true }).click();
  const table = editor.locator("table").first();
  await expect(table, "표가 그려져야 한다").toBeVisible({ timeout: 10_000 });
  return { editor, table };
}

test.describe("에디터 표", () => {
  test.setTimeout(120_000);

  test("표를 넣으면 3행 3열에 머리글이 함께 그려진다", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const { table } = await insertTable(page);

    await expect(table.locator("tr"), "행").toHaveCount(3);
    await expect(table.locator("tr").first().locator("th, td"), "첫 행의 칸").toHaveCount(3);
    await expect(table.locator("th"), "머리글 칸").toHaveCount(3);
    expect(errors, "표를 그리다 난 오류").toEqual([]);
  });

  test("칸에 글자를 넣으면 그 칸에 남는다", async ({ page }) => {
    const { table } = await insertTable(page);
    const cell = table.locator("td").first();
    await focusCell(page, cell);
    await page.keyboard.type("hello", { delay: 120 });
    await expect(cell, "입력한 칸").toContainText("hello");
  });

  test("칸에 한글을 조합해 넣어도 그 칸에 남는다", async ({ page }) => {
    const { table } = await insertTable(page);
    const cell = table.locator("td").first();
    await focusCell(page, cell);
    // 조합은 커서가 놓인 곳에 들어간다. 칸 안이 비어 있으면 커서가 아직 글자 마디에
    // 붙지 않은 상태라 조합이 갈 곳을 잃는다. 한 글자를 먼저 넣어 마디를 만든다.
    await page.keyboard.type("x", { delay: 120 });
    await expect(cell, "먼저 넣은 글자").toContainText("x");
    await composeIME(page, ["ㄱ", "가"], "가");
    await composeIME(page, ["ㄴ", "나"], "나");
    await expect(cell, "입력한 칸").toContainText("x가나");
  });

  test("행·열을 더하는 손잡이가 표 옆에 붙는다", async ({ page }) => {
    const { editor } = await insertTable(page);
    // 손잡이는 표를 감싸는 상자 안에 그려진다. 표 밖으로 튀어나온 위치라 표 자체에는 없다.
    const wrap = editor.locator("[data-table-wrap]").first();
    await expect(wrap, "표를 감싸는 상자").toBeVisible();
    await expect(wrap.locator("[data-table-add-btn]"), "더하기 손잡이").not.toHaveCount(0);
  });

  test("열 손잡이를 누르면 그 열이 통째로 선택된다", async ({ page }) => {
    const { editor, table } = await insertTable(page);
    await focusCell(page, table.locator("td").first());

    const handle = editor.locator("[data-col-handle]").first();
    await expect(handle, "열 손잡이").toBeVisible({ timeout: 10_000 });
    await handle.click();

    // 한 열은 3칸(머리글 1 + 본문 2)이다. 선택되면 그 칸들에 표시가 붙는다.
    await expect(editor.locator("[data-cell-selected]"), "선택된 칸").toHaveCount(3);
  });
});

test.describe("코드 블록 하이라이트", () => {
  test.setTimeout(120_000);

  test("처음에 싣지 않은 언어도 고르면 문법을 받아 칠한다", async ({ page }) => {
    // 편집기는 흔한 언어만 먼저 싣고 나머지 문법은 그 언어를 쓰는 코드 블록이 생길 때 받는다.
    // 실제 데이터베이스라 자동저장 같은 쓰기 요청은 모두 막는다.
    await page.route("**/*", (route) =>
      ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
    const editor = await openEditor(page);
    await page.getByRole("button", { name: "Code", exact: true }).click();
    await page.keyboard.type("procedure Hello is begin null; end Hello;");
    const keywords = editor.locator('[class*="hljs-keyword"]');
    await expect(keywords, "언어를 고르기 전에는 글자만 있다").toHaveCount(0);

    await page.getByRole("button", { name: /^(언어 선택|Select language)$/ }).first().click();
    await page.getByPlaceholder(/^(언어 검색|Search) \(java/).fill("ada");
    await page.locator('[class*="codeMenuItem"]').filter({ has: page.locator('[class*="codeLangName"]', { hasText: /^Ada$/ }) }).first().click();
    await expect(keywords.first(), "Ada 문법을 받은 뒤 키워드가 칠해진다").toBeVisible({ timeout: 15_000 });
    await expect(keywords.filter({ hasText: /^procedure$/ })).toHaveCount(1);
  });
});
