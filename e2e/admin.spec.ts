import { test, expect } from "@playwright/test";
import { ADMIN_ROUTES } from "./routes";
import { smokeRoute, NOT_FOUND_TITLE } from "./capture";

/**
 * admin 스모크 e2e — Phase 4-1(admin 슬라이스) 의 안전망.
 *
 *   npm run test:smoke:admin
 *
 * 로그인 세션이 필요하다. 최초 1회 셋업 절차는 e2e/auth.setup.ts 참고.
 */
for (const route of ADMIN_ROUTES) {
  test(`smoke: ${route.name}`, async ({ page }) => {
    test.setTimeout(90_000);
    await smokeRoute(page, route);
  });
}

/* 관리자 영역의 없는 주소(#889). 예전에는 빌드 때 공개 네비게이션으로 미리 그린 404 HTML 을 받아,
   브라우저가 관리자 네비게이션을 그리면서 하이드레이션 오류(#418)가 났다. */
test("관리자 영역의 없는 주소는 오류 없이 404 화면을 보인다", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/admin/does-not-exist", { waitUntil: "load" });
  const heading = page.getByRole("heading", { name: NOT_FOUND_TITLE });
  await expect(heading, "404 제목").toBeVisible({ timeout: 30_000 });
  // 서버 HTML 의 제목은 opacity 0 으로 시작해 하이드레이션 뒤 등장 애니메이션으로 1 이 된다. 그 뒤에 오류를 본다
  await expect(heading, "하이드레이션 뒤 등장").toHaveCSS("opacity", "1", { timeout: 15_000 });
  expect(errors, "화면을 그리다 난 오류").toEqual([]);
});
