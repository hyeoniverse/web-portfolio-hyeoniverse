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
      // 모서리는 capsule / circle / 2xl 셋만 (docs/design-system.md R6).
      // stylelint 가 .css 를 막지만 인라인 style·직렬화 문자열은 못 본다 — 여기서 같은 규칙을 건다.
      /* <button> 은 type 을 반드시 적는다. HTML 기본값이 submit 이라, 폼 안에서
         type 을 빠뜨린 버튼은 클릭 시 폼을 제출한다. */
      "react/button-has-type": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: String.raw`Literal[value=/var\(--font-size-(3xs|2xs|xs|sm)\)/]`,
          message:
            "글자 크기는 눈금이 아니라 역할로 고릅니다 — --font-size-body(14) / -label(13) / -hint(12) / -micro(11).",
        },
        {
          selector: String.raw`TemplateElement[value.raw=/var\(--font-size-(3xs|2xs|xs|sm)\)/]`,
          message:
            "글자 크기는 눈금이 아니라 역할로 고릅니다 — --font-size-body(14) / -label(13) / -hint(12) / -micro(11).",
        },
        {
          selector: String.raw`Literal[value=/var\(--radius-(2xs|xs|sm|md|lg|xl|3xl|4xl|5xl|6xl)\)/]`,
          message:
            "모서리는 --radius-capsule / --radius-circle / --radius-2xl 셋만 씁니다 (알약·칩·행 하이라이트=capsule, 정원=circle, 면 있는 것=2xl).",
        },
        {
          selector: String.raw`TemplateElement[value.raw=/var\(--radius-(2xs|xs|sm|md|lg|xl|3xl|4xl|5xl|6xl)\)/]`,
          message:
            "모서리는 --radius-capsule / --radius-circle / --radius-2xl 셋만 씁니다 (알약·칩·행 하이라이트=capsule, 정원=circle, 면 있는 것=2xl).",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      /* ── 승격된 게이트 (#687) ──
         warn 은 총량(--max-warnings)만 잠근다. 한 건을 고치고 그 자리에 새 위반을 넣으면
         총량은 그대로라 통과한다. 위반을 0 으로 만든 규칙은 error 로 올려 아예 못 들어오게 한다. */
      // <img> 는 도메인을 미리 등록할 수 없는 임의 URL 에만 허용한다.
      // 이유를 적은 eslint-disable 로 그때그때 뚫되, 무심코 쓰는 건 막는다.
      "@next/next/no-img-element": "error",
      // role 이 받지 않는 aria-* 는 스크린리더에 그냥 무시된다 — 붙였는데 안 먹는 게 제일 나쁘다.
      "jsx-a11y/role-supports-aria-props": "error",
      // 삼항을 문장으로 쓰면 반환값이 버려진다. if/else 로 의도를 드러낸다.
      "@typescript-eslint/no-unused-expressions": "error",
      /* effect·useCallback 이 실제로 읽는 값은 deps 에 다 들어가야 한다.
         이 규칙을 정말 꺼야 하는 자리가 있어서 코드베이스에 disable 이 69곳 있다.
         error 로 올리는 목적은 그 판단을 없애는 게 아니라, 경고 더미에 조용히
         쌓이지 않고 그 자리에서 disable 을 적게 만드는 것이다. */
      "react-hooks/exhaustive-deps": "error",
      // 렌더 중 Date.now·Math.random 은 같은 입력에 다른 화면을 만든다.
      // 현재 시각은 useNow(), 난수는 시드(mulberry32) 나 useState 지연 초기화로.
      "react-hooks/purity": "error",
      // useCallback/useMemo 의 첫 인자는 인라인 함수여야 메모와 deps 검사가 둘 다 산다.
      "react-hooks/use-memo": "error",
      // 모듈 스코프 변수를 렌더 중에 고치면 서버에서 요청 사이에 값이 샌다.
      "react-hooks/globals": "error",
      "react-hooks/component-hook-factories": "error",

      // React Compiler 친화 규칙들 — eslint-plugin-react-hooks v7 (Next 16 와 함께) 에서 새로 추가됨.
      // 우리는 Compiler 미사용이라 즉시 강제하지 않고 점진적으로 처리 — 일단 warn.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
    },
  },
];

export default eslintConfig;
