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
      /* 지금 주소는 usePathname 대신 @/hooks/useRoutePathname 으로 읽는다. Vercel 이 다시 그린(ISR) 홈은
         주소가 "/" 가 아니라 "/index" 로 읽혀, 주소로 홈을 가르는 곳이 홈을 못 알아봤다(홈에 푸터가 두 개, #1100).
         배포에서만 드러나 로컬에서는 알아챌 수 없으므로 아예 막는다. 훅 파일만 직접 쓴다(아래 files 예외) */
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/navigation",
              importNames: ["usePathname"],
              message: "usePathname 대신 @/hooks/useRoutePathname 을 씁니다 — 배포가 다시 그린 홈은 주소가 \"/index\" 로 읽힙니다(#1100).",
            },
          ],
        },
      ],
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
         아래 셋은 Compiler 를 안 써도 지금 코드에서 문제가 될 수 있는 것들이다.
         위반을 부류별로 나눠 고칠 부류는 고쳤고, 남긴 것의 이유를 규칙마다 적었다. */

      /* 이펙트 안에서 setState 하면 렌더가 한 번 더 돈다. 조건이 맞으면 무한 루프가 된다.
         error 로 올리지 않는다 (#695). 151건을 부류별로 나눠 이펙트가 필요 없던 72건을 고쳤다.
         - 마운트 표시(setMounted(true)) → useHasMounted (#797)
         - props 를 따라가는 상태 → useStateFromProp (#798)
         - 값이 바뀌면 되돌리기(검색어가 바뀌면 1쪽으로 등) → useDepsChanged 로 렌더 중에 맞춘다 (#798·#801)
         남은 79건은 이펙트가 맞는 자리다.
         - 데이터 불러오기 34. 요청을 보내기 전에 로딩 표시를 켜거나 이전 결과를 비운다.
         - 브라우저에서만 아는 값 읽기 12. localStorage·matchMedia·navigator·주소. 서버 HTML 과 첫
           렌더를 같게 그린 뒤에 바꿔야 해서 마운트 뒤 이펙트에서 읽는다.
         - DOM 측정 11. 크기·위치는 그려진 뒤에야 잴 수 있다.
         - 애니메이션·타이머 단계와 현재 시각 16. requestAnimationFrame·setTimeout 으로 단계를 넘기거나
           시계를 돌린다. TypeWriter·로딩 로고는 상태와 함께 ref 도 되돌려 렌더 중으로 옮길 수 없다.
         - 기타 6. 편집기의 슬러그·카테고리 자동 채우기(PostEditor·WorkEditor), 플레이그라운드 파일 순서,
           타임라인 달 이동, 날짜 멘션 첫 열기. 편집기 저장 흐름과 엮인 것은 편집기를 손볼 때 같이 본다.
         올리려면 이 79곳에 disable 을 달아야 한다. 새 코드는 위의 세 훅을 쓴다. */
      "react-hooks/set-state-in-effect": "warn",
      /* 렌더 중에 ref 를 읽거나 쓰면 React 가 렌더를 중단·재시도할 때 값이 어긋난다.
         error 로 올리지 않는다 (#695). 123건 가운데 62건을 고쳤다.
         - 렌더 중 최신 값 쓰기(xRef.current = x) → useSyncRef(ref, value) 로 확정 뒤에 쓴다 (#802)
         - 화면에 쓰는 값을 ref 에 두고 억지로 다시 그리던 것 → 상태 (#803)
         남은 61건은 옮기지 않기로 했다.
         - 저장 기준값 19. 설정 페이지의 savedConfigRef·savedProfileRef, 글·작품 편집기의
           initialFormRef·savedIdRef. 저장 흐름이 동기적으로 읽고 쓰는 값이라 상태로 바꾸려면 저장
           코드를 함께 고쳐야 하고, 저장은 실제 데이터베이스를 상대로 해서 확인할 방법이 없다.
         - PlateEditor 32. 툴바 닫힘 애니메이션용으로 마지막 노드를 기억하는 캐시와, 본문에서 떨어져
           나간 미디어 목록 계산이다. Slate 의 선택·문서와 엮여 있다.
         - PostArticleView 5. 본문 HTML 에 코드 블록 라벨을 구울 때, 번역 함수가 바뀌어도 innerHTML 을
           다시 세팅하지 않도록 일부러 ref 로 읽는다(파일 안 주석).
         - 규칙이 구분하지 못하는 5. ref 를 읽는 함수를 렌더 중에 넘기지만 실제로는 나중에 부르는 곳
           (SqlEditor 2, 게시물 목록 열 정의 1), 모달마다 ref 콜백을 한 번만 만드는 캐시(Modal 1, 매번
           새로 만들면 무한 갱신), 마운트 때만 쓰는 ERD 카메라 초기값(ErdExplorer 1).
         새 코드는 렌더 중에 ref 를 쓰지 않는다. 최신 값은 useSyncRef, 화면에 쓰는 값은 상태로 둔다. */
      "react-hooks/refs": "warn",
      /* props 나 state 를 직접 고치면 React 가 변경을 감지하지 못한다.
         error 로 올리지 않는다 (#687 5-6) — 47건을 전수 확인해 보니 대부분 이 규칙이
         잡을 수 없는 정상 코드였다. 콜백 안에서 ref.current 에 쓰기(정상), ref 콜백에서
         노드 저장(정상), 핸들러에서 document.body.style 조작(정상), 그리고 PlateEditor 의
         17건은 Slate editor 인스턴스를 고치는 것인데 그게 Slate API 의 동작 방식이다.
         진짜였던 것은 props 를 그대로 덮어쓰던 두 곳뿐이고 그건 고쳤다.
         올리려면 정상 코드에 disable 을 40개 넘게 달아야 해서 얻는 것보다 잃는 게 크다. */
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
  {
    /* 주소 정리 훅 자신과, next/navigation 을 흉내 내는 테스트만 usePathname 을 직접 쓴다 */
    files: ["src/hooks/useRoutePathname.ts", "src/__tests__/**"],
    rules: { "no-restricted-imports": "off" },
  },
];

export default eslintConfig;
