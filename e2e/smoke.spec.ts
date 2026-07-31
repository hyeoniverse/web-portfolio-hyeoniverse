import { test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";
import { smokeRoute } from "./capture";

/**
 * 공개 라우트 스모크 e2e — "깨지지 않았는지"만 감시한다(픽셀 비교 아님).
 * 페이지 로드·런타임 에러·에러 바운더리·빈 화면만 잡고, UI 변경 자체는 허용한다.
 * 로그인이 필요한 admin 라우트는 admin.spec.ts.
 *
 *   npm run test:smoke
 */
for (const route of PUBLIC_ROUTES) {
  test(`smoke: ${route.name}`, async ({ page }) => {
    test.setTimeout(90_000);
    await smokeRoute(page, route);
  });
}
