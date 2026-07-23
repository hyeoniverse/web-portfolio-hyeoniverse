import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    // Playwright 실행 산출물 — 리포트에 번들된 서드파티 JS 라 린트 대상이 아니다.
    // 검사하면 audit:full 이 수천 건의 가짜 에러로 오염된다.
    ignores: ["e2e/.report/**", "e2e/.results/**", "e2e/.auth/**"],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // React Compiler 친화 규칙들 — eslint-plugin-react-hooks v7 (Next 16 와 함께) 에서 새로 추가됨.
      // 우리는 Compiler 미사용이라 즉시 강제하지 않고 점진적으로 처리 — 일단 warn.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/component-hook-factories": "warn",
    },
  },
];

export default eslintConfig;
