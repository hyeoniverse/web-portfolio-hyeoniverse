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
      /* 컴포넌트를 다른 컴포넌트의 렌더 안에서 정의하지 않는다.
         렌더할 때마다 다른 컴포넌트가 되어 React 가 매번 새로 마운트하고,
         그 안의 상태·포커스·애니메이션이 조용히 초기화된다. */
      "react-hooks/static-components": "error",
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

      /* ── 아직 warn 인 규칙 (#687) ──
         전부 eslint-plugin-react-hooks v7 (Next 16 와 함께) 에서 새로 들어온 것들이다.
         위반이 많아 한 번에 0 으로 만들 수 없어 총량 락으로만 묶어 둔다.
         아래 셋은 Compiler 를 안 써도 지금 코드에서 실제로 문제가 되는 것들이다. */

      // 이펙트 안에서 setState 하면 렌더가 한 번 더 돈다. 조건이 맞으면 무한 루프가 된다.
      "react-hooks/set-state-in-effect": "warn",
      // 렌더 중에 ref 를 읽거나 쓰면 React 가 렌더를 중단·재시도할 때 값이 어긋난다.
      "react-hooks/refs": "warn",
      // props 나 state 를 직접 고치면 React 가 변경을 감지하지 못한다.
      "react-hooks/immutability": "warn",

      /* 이건 성격이 다르다 — error 로 올리지 않기로 했다 (#687 5-5).
         "React Compiler 가 이 컴포넌트 최적화를 건너뛴다" 는 안내이고, 이 프로젝트는
         Compiler 를 쓰지 않는다(next.config 에 reactCompiler 없음). 35건을 다 들여다보니
         고쳐야 할 버그가 하나도 없었다. 컴파일러가 추론한 의존이 전부 useState 세터
         (React 가 안정성을 보장하는 값) 이거나, 우리 deps 가 컴파일러 추론보다 오히려
         더 정확한 경우였다. 예: 콜백이 process.length 만 읽어 deps 도 [process.length] 인데
         컴파일러는 객체 단위로만 추론해 [process] 를 기대한다.
         맞추려면 deps 를 덜 정확하게 만들어야 하고, 그건 메모를 더 자주 무효화한다.
         Compiler 를 도입하기로 하면 그때 이 목록이 할 일이 된다. */
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
];

export default eslintConfig;
