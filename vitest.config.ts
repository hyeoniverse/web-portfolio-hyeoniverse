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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
