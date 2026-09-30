import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // postcss: { plugins: [] } 로 root postcss.config.mjs 의 @tailwindcss/postcss 로딩 차단.
  // Tailwind v4 plugin 이 vite 환경에서 invalid plugin 으로 감지돼 CSS module import 가 깨지던 이슈.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    /* CI 러너는 코어가 적은데 파일마다 jsdom 을 새로 띄워(실행 시간의 절반 이상) 워커가 한참 멈출 때가 있다.
       그 사이 몇 ms 짜리 테스트도 기본 5초 제한을 넘겨 가끔 실패했다(postsListSsr '한국 시간 날짜').
       CI 에서만 넉넉히 둔다 — 로컬에서는 느려진 테스트가 바로 드러나도록 기본값 그대로 */
    testTimeout: process.env.CI ? 20_000 : 5_000,
    hookTimeout: process.env.CI ? 20_000 : 10_000,
    globals: true,
    css: { modules: { classNameStrategy: "non-scoped" } },
    // @platejs/* 를 vite 가 변환하게 한다 (externalize 되면 위 alias 가 안 먹는다)
    server: { deps: { inline: [/@platejs\//] } },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      /* @platejs/math 가 **자기 하위 node_modules** 의 katex CSS 를 import 하는데, 그 모듈이
         externalize 돼서 node 로더가 "Unknown file extension .css" 로 죽는다
         → 전체 EditorKit 을 테스트에서 못 불러온다. 스타일은 테스트 대상이 아니라 빈 파일로 대체. */
      "@platejs/math/node_modules/katex/dist/katex.min.css": path.resolve(__dirname, "./src/__tests__/empty.css"),
      "katex/dist/katex.min.css": path.resolve(__dirname, "./src/__tests__/empty.css"),
    },
  },
});
