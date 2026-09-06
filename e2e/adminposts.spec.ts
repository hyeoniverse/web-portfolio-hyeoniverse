import { test, expect, type Page } from "@playwright/test";

/**
 * 글 목록 화면 안전망.
 *
 * 이 화면을 그리는 posts/page.tsx 는 1,021줄이고, 그 안에 글 목록·시리즈 패널·휴지통이
 * 함께 들어 있다. 시리즈 패널만 413줄이다. 이것을 나눌 예정인데 지금 검사는 주소가
 * 열리는지만 본다. 시리즈 패널이 통째로 사라져도 통과한다.
 *
 * 지우거나 저장하는 단추는 누르지 않는다. 실제 데이터베이스를 상대로 돌기 때문이다.
 *
 * 시리즈 패널을 접었다 펴는 동작은 검사에 넣지 못했다. 제목 단추를 눌러도 패널 안에서
 * 보이는 내용이 달라지지 않아, 무엇을 기준으로 판정해야 하는지 확인하지 못했다.
 * 확인하지 못한 것을 단정하는 검사는 없느니만 못하므로 넣지 않았다.
 */

async function openPosts(page: Page) {
  await page.goto("/admin/posts", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: "Posts" }), "글 목록 화면").toBeVisible({ timeout: 60_000 });
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
});
