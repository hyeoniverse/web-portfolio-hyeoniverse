import { test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";
import { captureRoute } from "./capture";

/**
 * 공개 라우트 시각 회귀. docs/refactoring-guide.md P1 — refactor 커밋은 픽셀이 같아야 한다.
 *
 *   baseline 갱신:  npm run test:visual:update
 *   비교 실행:      npm run test:visual
 *
 * baseline 은 리팩토링 착수 "전" 커밋에서 찍는다. 이후 diff 가 나면 P1 위반이거나 의도된 design 변경이다.
 * 로그인이 필요한 admin 라우트는 admin.spec.ts 에 있다.
 */
for (const route of PUBLIC_ROUTES) {
  test(`visual: ${route.name}`, async ({ page }) => {
    test.setTimeout(90_000);
    await captureRoute(page, route);
  });
}
