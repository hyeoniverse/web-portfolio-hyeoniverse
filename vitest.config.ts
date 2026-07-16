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
