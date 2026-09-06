import { test, expect, type Page } from "@playwright/test";

/**
 * 글 목록 화면 안전망.
 *
 * 이 화면을 그리는 posts/page.tsx 한 파일에 글 목록·시리즈 패널·휴지통이 함께 들어 있다.
 * 이것을 세 파일로 나눌 예정인데, 기본 검사는 주소가 열리는지만 본다.
 * 시리즈 패널이 통째로 사라져도 통과한다.
 *
 * 지우거나 저장하는 단추는 누르지 않는다. 실제 데이터베이스를 상대로 돌기 때문이다.
 *
 * 접힘 여부는 글자가 아니라 높이로 판정한다. 패널을 접어도 안의 행은 문서에 그대로
 * 남아 있고, 바깥 상자의 높이만 0 이 되어 잘려 보이지 않게 된다. 그래서 화면 글자를
 * 세는 방식으로는 접힘과 펼침이 구분되지 않는다.
 */

const SERIES = '[class*="seriesSection"]';
const TRASH = '[class*="trashSection"]';

async function openPosts(page: Page) {
  await page.goto("/admin/posts", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: "Posts" }), "글 목록 화면").toBeVisible({ timeout: 60_000 });
}

/** 시리즈 패널을 펼치고, 펼쳐질 때까지 기다린다. */
async function openSeries(page: Page) {
  const panel = page.locator(SERIES);
  await panel.getByRole("button", { name: /^Series \(\d+\)$/ }).click();
  const body = panel.locator('[class*="body"]').first();
  await expect
    .poll(async () => (await body.boundingBox())?.height ?? 0, { message: "펼친 뒤 패널 높이" })
    .toBeGreaterThan(100);
  return panel;
}

test.describe("글 목록 화면", () => {
  test.setTimeout(180_000);

  test("글 목록과 시리즈 패널이 함께 그려진다", async ({ page }) => {
    await openPosts(page);
    // 시리즈 패널 제목에는 개수가 함께 나온다 — "Series (9)" 처럼.
    await expect(page.getByRole("button", { name: /^Series \(\d+\)$/ }), "시리즈 패널").toBeVisible();
    expect(await page.locator("tbody tr, [class*='row']").count(), "목록 행").toBeGreaterThan(5);
  });

  test("마크다운 올리기와 내보내기 단추가 있다", async ({ page }) => {
    await openPosts(page);
    await expect(page.getByRole("button", { name: "Upload .md" }), "올리기").toBeVisible();
    await expect(page.getByRole("button", { name: "Export .md" }).first(), "내보내기").toBeVisible();
  });

  test("시리즈 패널은 접힌 채로 시작하고, 제목을 누르면 펼쳐진다", async ({ page }) => {
    await openPosts(page);
    const body = page.locator(SERIES).locator('[class*="body"]').first();
    expect((await body.boundingBox())?.height, "처음 높이").toBe(0);
    await openSeries(page);
  });

  test("시리즈를 이름순으로 정렬하면 가나다순으로 다시 늘어선다", async ({ page }) => {
    await openPosts(page);
    const panel = await openSeries(page);

    const titles = async () =>
      (await panel.locator('[class*="seriesRowLink"]').allInnerTexts()).map((s) => s.split("\n")[0].trim());

    // 정렬 단추는 글 목록 쪽에도 같은 이름으로 있다. 시리즈 패널 안으로 범위를 좁혀야 한다.
    const sortButtons = panel.locator('[class*="SegmentedControl"] button');
    await expect(sortButtons, "정렬 단추 세 개 (Order · Latest · Name)").toHaveCount(3);

    const byOrder = await titles();
    expect(byOrder.length, "시리즈 행").toBeGreaterThan(2);

    await sortButtons.filter({ hasText: "Name" }).click();
    await expect
      .poll(async () => (await titles()).join("|"), { message: "이름순 정렬" })
      .not.toBe(byOrder.join("|"));

    const byName = await titles();
    expect(byName, "가나다순").toEqual([...byName].sort((a, b) => a.localeCompare(b)));
  });

  test("휴지통은 펼칠 때 지운 글을 불러온다", async ({ page }) => {
    await openPosts(page);
    const panel = page.locator(TRASH);
    const body = panel.locator('[class*="body"]').first();
    expect((await body.boundingBox())?.height, "처음 높이").toBe(0);

    // 휴지통 목록은 접혀 있는 동안에는 불러오지 않는다. 펼칠 때 요청이 나간다.
    const loaded = page.waitForResponse((r) => r.url().includes("trash=true"));
    await panel.getByRole("button", { name: /^Trash/ }).click();
    await loaded;
    await expect
      .poll(async () => (await body.boundingBox())?.height ?? 0, { message: "펼친 뒤 패널 높이" })
      .toBeGreaterThan(100);
  });
});
