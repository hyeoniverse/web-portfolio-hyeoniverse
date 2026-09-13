import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// admin 로그인 credential(E2E_ADMIN_*)을 읽는다. Next 와 달리 Playwright 는 자동 로드하지 않는다.
dotenv.config({ path: ".env.local" });

/**
 * 스모크 e2e 설정 — "페이지가 깨지지 않았는지"만 검증한다(픽셀 비교 아님).
 *
 * 실행 전 `npm run build` 가 끝나 있어야 한다 (webServer 가 next start 로 기존 산출물을 씀).
 * dev 서버는 HMR 오버레이 등으로 불안정해 쓰지 않는다.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 마퀴·GSAP·three.js 상시 구동으로 로드 타이밍이 흔들릴 수 있어 재시도로 흡수한다.
  retries: 2,
  workers: process.env.CI ? 2 : 4,
  reporter: [["html", { outputFolder: "e2e/.report", open: "never" }], ["list"]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    // 애니메이션·패럴랙스 억제. 사이트 전역에 framer-motion·GSAP·Lenis 가 깔려 있어 필수.
    contextOptions: { reducedMotion: "reduce" },
    colorScheme: "dark",
  },

  projects: [
    {
      name: "desktop",
      testMatch: /(smoke|nav|designsystem|about|postsindex|profile|dates|detail|home)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      // works/webflow 가 1024px 에서 가로스크롤 → 세로스택으로 분기해서 모바일도 잡는다.
      name: "mobile",
      // nav.spec 은 넣지 않는다. 데스크톱 배치(가로 메뉴·hover 하위 메뉴)를 전제로 쓴 검사라
      // 모바일 폭에서는 메뉴가 햄버거 안으로 들어가 세 건이 실패한다. 모바일 메뉴는 따로 볼 일이다.
      testMatch: /(smoke|about)\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },

    // admin 은 로그인 세션이 필요하다. setup 이 한 번 로그인해 storageState 를 남기고
    // admin 프로젝트가 그걸 재사용한다. 최초 1회 기기 승인 절차는 e2e/auth.setup.ts 참고.
    // 재시도 안 함 — 여기서 나는 실패는 credential 누락이나 기기 승인 대기라 사람이 손봐야 한다
    { name: "setup", testMatch: /auth\.setup\.ts/, retries: 0 },
    // API 라우트 안전망. 브라우저 없이 request 픽스처로 라우트를 직접 부른다.
    // 비로그인(api)과 로그인(api-auth)을 나눈 이유는 apiRoutes.ts 주석 참고.
    { name: "api", testMatch: /api\.spec\.ts/ },
    {
      name: "api-auth",
      testMatch: /api-auth\.spec\.ts/,
      dependencies: ["setup"],
      use: { storageState: "e2e/.auth/admin.json" },
    },
    {
      name: "admin",
      testMatch: /(admin|dashboard|editor|workeditor|aboutstudio|settings|adminposts)\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "e2e/.auth/admin.json",
      },
    },
  ],

  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
