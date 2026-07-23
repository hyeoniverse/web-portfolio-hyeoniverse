import { defineConfig, devices } from "@playwright/test";

/**
 * 리팩토링 시각 회귀 전용 설정. docs/refactoring-guide.md 의 원칙 P1(픽셀 보존) 검증용.
 *
 * 실행 전 `npm run build` 가 끝나 있어야 한다 (webServer 가 next start 로 기존 산출물을 씀).
 * dev 서버는 HMR 오버레이·비압축 CSS 때문에 baseline 이 흔들려 쓰지 않는다.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /**
   * 로컬에서도 재시도한다. 이 사이트는 마퀴·GSAP·three.js 가 상시 도는 페이지가 많아
   * 픽셀 완전 일치가 원리적으로 불안정하다. maxDiffPixelRatio 를 올려 흡수하면
   * 작은 컴포넌트 회귀까지 같이 놓치므로, 임계치는 조이고 재시도로 흔들림만 걸러낸다.
   * 재시도 후에도 실패하면 진짜 diff 로 본다.
   */
  retries: 2,
  workers: process.env.CI ? 2 : 4,
  reporter: [["html", { outputFolder: "e2e/.report", open: "never" }], ["list"]],

  expect: {
    toHaveScreenshot: {
      // 폰트 힌팅·GPU 래스터라이즈 편차 흡수. 레이아웃이 바뀌면 이 정도로는 안 묻힌다.
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },

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
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      // works/webflow 가 1024px 에서 가로스크롤 → 세로스택으로 분기해서 모바일도 잡는다.
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],

  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
