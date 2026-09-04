import { test, expect, type Page } from "@playwright/test";

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
