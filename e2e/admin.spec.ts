import { test } from "@playwright/test";
import { ADMIN_ROUTES } from "./routes";
import { smokeRoute } from "./capture";

/**
 * admin 스모크 e2e — Phase 4-1(admin 슬라이스) 의 안전망.
 *
 *    npm run test:smoke:admin          # 비교
 *   npm run test:visual:admin -- -u     # baseline 갱신
 *
 * 로그인 세션이 필요하다. 최초 1회 셋업 절차는 e2e/auth.setup.ts 참고.
 */
for (const route of ADMIN_ROUTES) {
  test(`smoke: ${route.name}`, async ({ page }) => {
    test.setTimeout(90_000);
    await smokeRoute(page, route);
  });
}
