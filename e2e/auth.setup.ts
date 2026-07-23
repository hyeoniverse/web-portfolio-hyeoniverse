import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * admin 시각 회귀용 로그인 세션 확보.
 *
 * 로그인에는 보안 게이트가 두 겹 있다:
 *   1) Supabase 이메일/비밀번호
 *   2) 새 기기(UA fingerprint) 승인 — 처음 보는 기기면 즉시 signOut 하고 승인 메일을 보낸다
 *      (src/app/api/admin/auth/route.ts)
 *
 * 2번은 최초 1회만 통과시키면 되고, 이후에는 여기서 저장한 storageState 를 재사용한다.
 * fingerprint 는 UA 기반이라 같은 Playwright 브라우저를 쓰는 한 재승인이 필요 없다.
 *
 * 절차:
 *   1. .env.local 에 E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD 추가
 *      → 소유자(OWNER_EMAIL) 계정을 쓰는 것을 권한다. 새로 만든 계정은 app_metadata 가
 *        비어 있어 role 이 없고(getUserRole → level 0) admin 접근이 거부된다.
 *   2. npm run test:visual:admin  → 첫 실행은 "승인 대기" 로 실패한다
 *   3. 기기 승인 — 둘 중 아무거나
 *      a. Supabase Table Editor → admin_known_devices → 방금 생긴 row 의 approved 를 true 로
 *         (승인 링크가 하는 일이 정확히 이것이다. 메일 수신은 필요 없다)
 *      b. 메일함의 승인 링크 클릭
 *   4. npm run test:visual:admin  → 통과, 세션이 저장된다
 *
 * 저장 파일에는 인증 토큰이 들어 있다. .gitignore 에 있으며 절대 커밋하지 않는다.
 */

export const ADMIN_STATE = path.join(__dirname, ".auth/admin.json");

setup("authenticate admin", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD 가 없습니다. .env.local 에 추가한 뒤 다시 실행해 주세요.\n" +
        "소유자(OWNER_EMAIL) 계정을 쓰는 것을 권합니다 — 새로 만든 계정은 role 이 없어 admin 접근이 거부됩니다.",
    );
  }

  // 로그인 API 응답을 가로채 device_pending(202) 을 사람이 읽을 수 있는 안내로 바꾼다
  let devicePending = false;
  page.on("response", (res) => {
    if (res.url().includes("/api/admin/auth") && res.status() === 202) devicePending = true;
  });

  await page.goto("/admin/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // 성공하면 admin 영역으로 리다이렉트된다
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 20_000 }).catch(() => {
    /* 아래에서 원인별로 안내 */
  });

  if (devicePending) {
    throw new Error(
      "새 기기 승인 대기 중입니다. 둘 중 아무거나 하면 됩니다.\n" +
        "  a. Supabase Table Editor → admin_known_devices → 방금 생긴 row 의 approved 를 true 로\n" +
        "     (승인 링크가 하는 일이 정확히 이것입니다. 메일 수신은 필요 없습니다)\n" +
        `  b. ${email} 메일함의 승인 링크 클릭\n` +
        "그 다음 이 명령을 다시 실행하면 세션이 저장됩니다.\n" +
        "승인은 이 브라우저 fingerprint 에 대해 최초 1회만 필요합니다.",
    );
  }

  expect(page.url(), "로그인 후 admin 으로 이동해야 합니다").not.toContain("/admin/login");

  fs.mkdirSync(path.dirname(ADMIN_STATE), { recursive: true });
  await page.context().storageState({ path: ADMIN_STATE });
});
