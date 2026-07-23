import type { TroubleShootingItem, TroubleshootingDiagram, ComparisonTable, TroubleshootingDifficulty } from "./types";

// ── 통합 섹션 6개 ─────────────────────────────────────────────
// Architecture / Performance / Layout / Editor / Interaction / Component
const SECTION = {
  A: { ko: "아키텍처 / 백엔드", en: "Architecture & Backend" },
  P: { ko: "성능", en: "Performance" },
  L: { ko: "레이아웃 / CSS", en: "Layout & CSS" },
  E: { ko: "Plate 에디터", en: "Plate Editor" },
  I: { ko: "애니메이션 / 인터랙션", en: "Animation & Interaction" },
  C: { ko: "컴포넌트 시스템", en: "Component System" },
} as const;

const SECTION_ORDER: Array<keyof typeof SECTION> = ["A", "P", "L", "E", "I", "C"];

/** problem.ko → 새 섹션/난이도/추천 매핑. 항목별 직접 inline 보다 한 곳에서 관리 */
const itemMeta: Record<
  string,
  {
    section: keyof typeof SECTION;
    difficulty: TroubleshootingDifficulty;
    recommended?: boolean;
    /** 대표 항목 — 하나라도 지정되면 패널이 이것들만 보여준다.
     *  89개를 다 늘어놓으면 읽히지 않아, 원본은 남기고 표시할 것만 고른다. */
    featured?: boolean;
    /** 추천 이유 — 항목별 차별점. IDE 에디터 @recommended 라인에 표시 */
    recommendReason?: { ko: string; en: string };
  }
> = {
  "부모의 마운트 fitView 가 자식 effect 의 카메라 제어를 매번 덮어씀": {
    featured: true, section: "I", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "\"아무 일도 안 일어남\" 의 원인이 호출 누락이 아니라 실행 순서였던 사례라 골랐습니다.",
      en: "Picked this because the cause of \"nothing happens\" wasn't a missing call but effect ordering.",
    },
  },
  "SQL 가져오기에서 DROP 이 조용히 무시됨 — 파서가 \"남은 것\" 만 돌려줬기 때문": {
    featured: true, section: "A", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "부재로 의도를 표현하려던 자료 구조가 어디서 무너지는지 보여드리고 싶어 골랐습니다.",
      en: "Picked this to show where a data shape that encodes intent as absence falls apart.",
    },
  },
  "표 안의 아이콘 버튼을 늘렸더니 그 행만 높이가 달라짐": {
    featured: true, section: "L", difficulty: 2,
  },
  // Architecture & Backend
  "포스트 실수 삭제 시 복구 불가": { section: "A", difficulty: 3 },
  "AI 번역/요약이 provider 장애 시 완전 중단": { section: "A", difficulty: 3 },
  "API 키 변경마다 재배포가 필요": { section: "A", difficulty: 2 },
  "비회원 댓글에서 본인 확인이 번거로움": { section: "A", difficulty: 3 },
  "에디터 자동저장 주기가 너무 잦아 리비전이 의미 없이 누적됨": { section: "A", difficulty: 2 },
  "자동저장 — localStorage에서 DB 리비전으로의 진화": {
    section: "A", difficulty: 3, recommended: true,
    recommendReason: { ko: "임시방편(localStorage)을 정식 아키텍처(DB 리비전)로 발전시킨 과정을 보여드리고 싶어 골랐습니다.", en: "Picked this to show how I evolved a stopgap (localStorage) into a real architecture (DB revisions)." },
  },
  "카테고리 자동 보정으로 리비전 프롬프트가 무한 반복": { section: "A", difficulty: 2 },
  "멤버 역할을 어디에 저장해야 조작을 막을 수 있나": {
    section: "A", difficulty: 2, recommended: true,
    recommendReason: { ko: "이름이 비슷한 두 저장소의 신뢰 수준 차이가 곧 권한 시스템의 출발점이었던 사례라 골랐습니다.", en: "Picked this because the trust gap between two similarly-named stores was the very foundation of the permission system." },
  },
  "GitHub OAuth 는 계정만 있으면 누구나 로그인 시도가 성공한다": { featured: true, section: "A", difficulty: 2 },
  // Performance
  "reCAPTCHA v3 초기 로드 성능 저하 (LCP 17.1s, TTI 18.2s)": { featured: true, section: "P", difficulty: 3 },
  "mousemove마다 React 리렌더 (60fps 성능 저하)": { section: "P", difficulty: 2 },
  "커스텀 커서의 무거운 hit-test가 가벼운 위치 보간을 함께 느리게 만듦": {
    section: "P", difficulty: 3, recommended: true,
    recommendReason: { ko: "측정으로 병목을 찾고 RAF 주기를 분리해 60fps 를 회복한 성능 최적화 경험입니다.", en: "Profiled the bottleneck and split the RAF loop to restore 60fps — measurement-driven optimization." },
  },
  "Three.js LatheGeometry 컵에 Canvas 2D 라떼아트 텍스처 합성 — 두 개 평면이 만나는 부분의 자연스러운 블렌딩": { section: "P", difficulty: 3 },
  "GSAP ScrollTrigger 수평 무한 스크롤 — 양방향 무한 wrapping": { section: "P", difficulty: 3 },
  "LoadingScreen이 SSR에 포함되지 않아 콘텐츠 flash 발생": { section: "P", difficulty: 2 },
  "Menu drawer 폰트가 fallback 으로 굳음 — `display: optional` + `preload: false` 부작용": { section: "P", difficulty: 1 },
  // Layout & CSS
  "코드 블록 줄바꿈 토글 시 레이아웃이 갑자기 튐": { section: "L", difficulty: 2 },
  "글로벌 transition shorthand가 컴포넌트 전환 효과를 덮어씀": { featured: true,
    section: "L", difficulty: 2, recommended: true,
    recommendReason: { ko: "원인이 코드가 아닌 CSS 명세에 있던 케이스 — spec 단위까지 파고드는 디버깅 습관을 보여드리려 골랐습니다.", en: "Bug lived in the CSS spec, not in the code — picked this to show spec-level debugging." },
  },
  "CSS Module 해시 충돌로 데스크톱 레이아웃 붕괴": { section: "L", difficulty: 3 },
  "CSS 토큰 미정의 — 11개 파일에서 참조하지만 선언 없음": { section: "L", difficulty: 1 },
  "CTA 버튼 `backdrop-filter`가 Chrome에서 동작하지 않음": {
    section: "L", difficulty: 3, recommended: true,
    recommendReason: { ko: "GPU compositing layer 까지 추적해 원인을 짚은 사례 — 끝까지 원인을 좇는 태도를 보여드리고 싶었습니다.", en: "Traced it down to the GPU compositing layer — wanted to show I chase the root cause." },
  },
  "Admin 테이블 모바일 가로 스크롤 시 row border가 중간에서 끊김": { section: "L", difficulty: 3 },
  "Posts Bento — `grid-template-rows` 만으로는 카드별 높이 차이가 빈칸을 만듦": { section: "L", difficulty: 3 },
  "sticky filterBar IntersectionObserver — 인기글 사이드바와 1px 어긋남": { section: "L", difficulty: 2 },
  "Navigation 메뉴가 좁은 viewport 에서 우측 actions 와 겹침 + indicator 가 resize 중 메뉴 위치를 못 따라감": { section: "L", difficulty: 2 },
  "커버 이미지 팔레트 등 grid 자식이 viewport 밖으로 잘려 나감 — `.row { grid-template-columns: 1fr 1fr }` 의 함정": { section: "L", difficulty: 2 },
  "Tooltip 이 drawer 위로 튀어나옴 — inline zIndex 가 토큰을 무시": { section: "L", difficulty: 1 },
  "CSS `var()` 체인이 JS `getPropertyValue` 로 resolve 안 됨 — Canvas / Three.js 텍스처 배경색이 토큰과 어긋남": {
    section: "L", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "DevTools 의 친절한 표시를 그대로 JS API 라고 가정한 함정 — multi-tier 토큰 시스템에서 JS↔CSS 경계가 어디인지 보여주는 사례라 골랐습니다.",
      en: "I assumed DevTools' helpful display matched the JS API — picked this because it shows exactly where the JS↔CSS boundary lives in a multi-tier token system.",
    },
  },
  "코드블록 리사이즈 그립에서 커스텀 커서 위로 시스템 커서가 계속 새어나옴": {
    section: "L", difficulty: 2, recommended: true,
    recommendReason: { ko: "UA 가 그리는 요소의 페인트 순서(자식 위·형제 아래)까지 파고들어야 풀리던 CSS 함정이라 골랐습니다.", en: "Picked this CSS trap because it only resolved once I dug into the paint order of UA-drawn chrome (above children, below siblings)." },
  },
  "모바일에서 ERD 다이어그램이 높이 0 으로 접혀 아무것도 안 보임": { featured: true,
    section: "L", difficulty: 2, recommended: true,
    recommendReason: {
      ko: "`height:100%` 가 0 으로 죽는 원인을 CSS 명세의 definite height 규칙까지 거슬러 올라가 짚은 사례라 골랐습니다.",
      en: "Picked this because I traced why `height:100%` collapses to 0 all the way back to the CSS spec's definite-height rule.",
    },
  },
  "스크롤 시 상단 탭바에 frost(blur) 를 깔려는데 blur 가 안 보이거나 잘림": { featured: true,
    section: "L", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "`overflow-x:auto` 의 양축 클립과 Lenis transform 스크롤 위 `backdrop-filter` 라는 두 함정이 겹친 걸 분리해 푼 사례라 골랐습니다.",
      en: "Picked this because two traps stacked — `overflow-x:auto` clipping both axes and `backdrop-filter` under Lenis's transform scroll — and I separated them to solve it.",
    },
  },
  // Plate Editor
  "Richtext 게시물에서 코드 하이라이팅·줄바꿈 버튼이 사라짐": { section: "E", difficulty: 2 },
  "Plate 에디터에서 컨텍스트 툴바 표시 시 커서가 멋대로 튐": { section: "E", difficulty: 3 },
  "토글·콜아웃·열블록 콘텐츠가 저장 후 사라짐": {
    section: "E", difficulty: 3, recommended: true,
    recommendReason: { ko: "라이브러리 기본값을 의심하고 검증해 사용자 데이터 손실을 막은 경험입니다.", en: "Questioned and verified a library default to prevent user data loss." },
  },
  "코드블록 하이라이팅이 브라우저에서만 죽음 — 빌드·테스트는 전부 통과": { featured: true,
    section: "E", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "빌드도 테스트도 통과하는데 브라우저에서만 죽는 버그를, 증거가 나올 때까지 추적해 라이브러리 밖에서 해결한 사례라 골랐습니다.",
      en: "Picked this because build and tests both passed while only the browser broke — traced it to real evidence and fixed it from outside the library.",
    },
  },
  "코드블록 내용을 전체 선택해 지우면 이후 붙여넣기가 블록 밖으로 샘": { section: "E", difficulty: 3 },
  "제목(heading) 안 각주가 마크다운 변환 시 처리 안 됨": { section: "E", difficulty: 3 },
  "Plate inline void 노드에서 클릭 vs 키보드 구분 불가": { section: "E", difficulty: 3 },
  "인라인 이미지 양옆에 커서 배치·텍스트 입력 불가": { section: "E", difficulty: 3 },
  "float 이미지 옆 텍스트를 드래그·선택하면 이미지가 같이 묶이고, 화살표·클릭 시 빈 줄에 커서가 떨어짐": {
    section: "E", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "데이터(노드 분리)·레이아웃(CSS float)·입력(capture)을 한꺼번에 다뤄야 풀리는 다층 문제를 끝까지 추적한 사례라 골랐습니다.",
      en: "Picked this as a multi-layer bug — data (node split), layout (CSS float), and input (capture) all had to move together; shows end-to-end root-cause tracing.",
    },
  },
  "마크다운 각주 번호 꼬임 — heading renderer 충돌": { section: "E", difficulty: 3 },
  "열블록 스타일 round-trip 유실": { section: "E", difficulty: 3 },
  "YouTube embed URL — watch URL이 iframe에서 로드 실패": { section: "E", difficulty: 1 },
  "이미지 리사이즈 핸들 클릭 시 이미지가 삭제됨": { section: "E", difficulty: 2 },
  "에디터 툴바 active 상태 — wrapper 블록 감지 실패": { section: "E", difficulty: 2 },
  "각주 참조/내용 정합성 — 한쪽 삭제 시 고아 노드 잔존": { section: "E", difficulty: 2 },
  "링크 클릭 시 즉시 이동 — 에디터에서 링크 편집 불가": { section: "E", difficulty: 1 },
  "Plate 인라인 코드에서 방향키 커서 점프": { section: "E", difficulty: 2 },
  "다중 블록 선택 배경이 float 이미지를 덮음 — z-index·flow-root·clip-path 모두 부적합": {
    section: "E", difficulty: 3, recommended: true,
    recommendReason: { ko: "여러 정공법(z-index/BFC/clip-path)이 디자인 제약 때문에 차례로 막힌 끝에, 영역 자체를 둘로 쪼개고 layout 을 관찰해 CSS 변수로 주입한 과정을 보여드리고 싶어 골랐습니다.", en: "Picked this because each textbook fix (z-index / BFC / clip-path) was blocked by a design constraint in turn, ending with splitting the region in two and feeding measured layout into CSS variables." },
  },
  "float 이미지(인라인 void) 클릭이 엉뚱한 본문 단락을 선택": { section: "E", difficulty: 2 },
  // Animation & Interaction
  "커스텀 커서 리사이즈 모드에서 마우스 방향에 따라 커서 회전": { section: "I", difficulty: 1 },
  "Page transition 이 hold 단계에서 멈추고 morph 후 skeleton 이 노출": { section: "I", difficulty: 3 },
  "페이지 트랜지션 morph 가 끝나도 화면이 한참 비어 있어 \"skeleton 이 따로 도는\" 인상": {
    section: "I", difficulty: 3, recommended: true,
    recommendReason: { ko: "\"두 시스템 사이의 timing mismatch\" 로 가설을 다시 잡고 Next.js Suspense 동작까지 추적한 디버깅 흐름을 보여드리고 싶었습니다.", en: "Reframed the hypothesis from \"one bug\" to \"two systems with mismatched timing\" and traced down Next.js Suspense fallback behavior." },
  },
  "Series Deck — hover 펼침이 \"사라졌다 나타나는\" 느낌": { section: "I", difficulty: 3 },
  "Series Deck spread — `setPointerCapture` 가 자식 click 차단 + hit-area 공백으로 flicker": { section: "I", difficulty: 3 },
  "HTML5 drag 가 pointermove 를 막아 커스텀 커서가 멈추고 type 도 계속 바뀜": { section: "I", difficulty: 3 },
  "TagCloud3D 클릭이 안 먹힘 — `setPointerCapture` 가 자식 Link click 을 가로챔": { section: "I", difficulty: 2 },
  "HTML5 D&D 의 quirks 회피 — chip 드래그 정렬을 pointer 기반으로 전환": {
    section: "I", difficulty: 3, recommended: true,
    recommendReason: { ko: "\"표준 API 라서 옳다\" 는 가정을 깨고 도구를 다시 고른 경험을 보여드리고 싶었습니다.", en: "Questioned the \"standard API is best\" assumption and re-picked the tool." },
  },
  "이미지 깨짐 placeholder — `dangerouslySetInnerHTML` 로 렌더된 markdown img 에는 React onError 가 안 붙음": { section: "I", difficulty: 3 },
  // Component System
  "필수 이중언어 제목이 한쪽만 채워지면 반대 언어에서 빈칸으로 표시됨": {
    section: "C", difficulty: 1, recommended: true,
    recommendReason: { ko: "`??` 와 `||` 의 차이가 이중언어 fallback 을 가른 사례 — 작은 연산자 선택이 필수 필드를 빈칸으로 만든 걸 보여드리려 골랐습니다.", en: "Picked this because the difference between `??` and `||` decided the bilingual fallback — a tiny operator choice that blanked a required field." },
  },
  "Admin 리스트(시리즈/휴지통/게시물)의 UI 코드 중복과 스타일 불일치": { section: "C", difficulty: 2 },
  "커스텀 ColorPicker popover 가 trigger 위치에 안 붙음 — wrapper `<span>` 이 0×0 으로 collapse": { section: "C", difficulty: 2 },
  "Supabase auth subscription cleanup — `.then()` 안의 `return` 은 useEffect cleanup 이 아니다": {
    section: "C", difficulty: 2, recommended: true,
    recommendReason: { ko: "보이지 않는 leak — \"return 했으니 cleanup 이겠지\" 라는 시각적 착각을 짚고 같은 패턴을 4곳에서 useIsAuthenticated 헬퍼로 통합한 경험입니다.", en: "An invisible leak — the \"looks like cleanup, isn't\" trap. Picked this because I caught it across 4 files and extracted useIsAuthenticated to fix all at once." },
  },
  // Architecture & Backend — security
  "익명 댓글 수정·삭제 — 클라이언트는 비밀번호 강제, 서버는 우회 허용": {
    section: "A", difficulty: 3, recommended: true,
    recommendReason: { ko: "\"클라가 강제한다\" 와 \"서버가 강제한다\" 의 간극을 위협 모델 관점에서 다시 짚은 보안 사례입니다.", en: "Picked this for the threat-model gap between \"client enforces\" and \"server enforces\" — and how OR-ing auth paths collapses to the weakest." },
  },
  "공개 API 의 `?all=true` 쿼리로 비공개 글 / 휴지통이 인증 없이 전부 노출": { featured: true,
    section: "A", difficulty: 3,
  },
  "인기글 정의가 3 곳에 분산 — UI 의 HOT 배지와 admin 삭제 보호가 서로 다른 \"인기\"": { featured: true,
    section: "A", difficulty: 2, recommended: true,
    recommendReason: { ko: "같은 도메인 개념 (\"인기\") 의 정의가 silent 하게 분산된 상태를 single source of truth 로 통합한 경험 — reasoning 비용과 모순 위험을 동시에 줄인 사례입니다.", en: "Caught the same domain concept (\"popular\") silently fragmented across three call sites and unified it into a single source of truth — cut both reasoning cost and the risk of contradiction." },
  },
  // Component System
  "컴포넌트 이름이 \"첫 사용처\" 에 묶임 — SortGroup 이 sort 외 8 곳에서 쓰이게 되자 의미가 약해짐": {
    section: "C", difficulty: 1,
  },
  // Architecture — Lenis cleanup convention
  "Lenis 무한 스크롤이 페이지 전환 시 의도치 않게 켜지는 문제 — opt-out 가정 cleanup 의 함정": {
    section: "A", difficulty: 2, recommended: true,
    recommendReason: { ko: "convention 자체가 버그의 원인이었던 케이스 — \"cleanup 은 원복\" 이라는 무의식적 가정이 페이지 간 silent state leak 을 만든 경험입니다.", en: "The convention itself was the bug — the unconscious \"cleanup restores\" assumption created a silent cross-page state leak." },
  },
  // Layout & CSS — PostCard meta separator wrap
  "PostCard meta 가 wrap 될 때 separator 가 새 줄 시작에 어색하게 남는 문제": {
    section: "L", difficulty: 2,
  },

  // Architecture — autosave / draft / revision overhaul (v2)
  "자동저장 v2 — 글자 단위 draft + 리비전을 명시적 save point 로 재정의": { featured: true,
    section: "A", difficulty: 3, recommended: true,
    recommendReason: { ko: "한 번 리팩토링한 시스템이라도 사용해 보면 새 결함이 보인다는 걸 보여드리고 싶어 골랐습니다 — 같은 도메인을 두 번째로 다시 설계한 과정입니다.", en: "Picked this because even a 'refactored' system shows new flaws once it's lived in — a second pass at the same domain." },
  },

  // Architecture — Admin works sort_order normalize
  "Admin works sort_order 정렬 — 부분 shift 가 DB 의 0·중복 잔재를 못 정리": {
    section: "A", difficulty: 2, recommended: true,
    recommendReason: { ko: "\"내가 만진 부분만\" 부분 보정에서 \"전체를 한 번 정리\" 로 관점을 바꾼 사례입니다. 데이터 누적 결함을 부분 패치로 따라가지 않고 매 mutation 마다 dense 1..N 로 normalize 해 시간이 지나도 시작 상태가 같도록 만든 결정을 보여드리고 싶었습니다.", en: "Picked this for the shift from 'fix the parts I touched' to 'normalize the whole table on every mutation' — refusing to chase accumulated data damage with partial patches, and instead making the table's starting state identical no matter how it got there." },
  },

  // Cross-platform / UX — Touch device hover
  "터치 디바이스에 hover 가 없어 데스크탑 전용 인터랙션 (hover glow / tooltip) 이 모바일에서 사라짐": {
    section: "I", difficulty: 2,
  },

  // Custom cursor — draggable row child button
  "draggable row 안 button hover 시 grab 커서가 박혀 click 으로 돌아가지 않음": {
    section: "I", difficulty: 2,
  },

  // Layout & CSS — OKLCH color system migration
  "HSL 기반 색 토큰이 hue 별로 지각 밝기가 달라 같은 lightness 끼리도 톤이 들쭉날쭉": { featured: true,
    section: "L", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "\"수학적 평균\" 과 \"지각 밝기\" 가 다르다는 색 공간 차원의 문제를 색 시스템 전반에 OKLCH 로 옮기고, sRGB clipping 회피 위한 hue 별 safeChroma 까지 명시한 사례입니다.",
      en: "Moved an entire color system from HSL to OKLCH after recognizing the gap between math-average and perceived brightness, then added per-hue safeChroma tables to dodge sRGB clipping.",
    },
  },

  // Layout & CSS — CSS Module orphan classes (DetailLayout refactor)
  "페이지 보일러플레이트를 layout 으로 흡수 후, 일부 영역 (footer 링크) 의 스타일이 통째로 사라짐 — 오류는 없음": {
    section: "L", difficulty: 2, recommended: true,
    recommendReason: {
      ko: "CSS Module 의 dot 접근이 \"없으면 undefined\" 라는 사실 + React 가 undefined className 을 silent 하게 drop 한다는 두 가지가 만나 silent failure 가 되는 함정 — shared component 추출 리팩토링에서 가장 흔합니다.",
      en: "When CSS Module dot access returns undefined and React silently drops undefined className, you get a silent failure that's particularly common when extracting into shared components.",
    },
  },

  // Component System — TSX parser `!` misparse
  "TSX 안에서 `typeof obj!.field[index]` 처럼 non-null assertion 을 인덱스 표현 안에 쓰면 JSX parser 가 닫는 태그로 오해석": {
    section: "C", difficulty: 1,
  },

  // Component System — textarea inline highlight → contenteditable 전환
  "textarea 의 초과 글자만 background highlight 주려는데 어떤 방법으로도 정확히 안 맞음 — 결국 native textarea 포기하고 contenteditable 로 전환": {
    section: "C", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "native form element 의 근본 한계를 마주쳤을 때 \"overlay sync\" 가 아니라 \"element replace\" 로 결정한 사례 — 브라우저가 직접 그리는 visual artifact 는 어떤 JS 로도 sync 불가능하다는 원칙.",
      en: "Hit a fundamental textarea limitation and chose 'replace the element' over 'sync with overlay' — the principle that browser-rendered visual artifacts can't be synchronized from JS no matter what.",
    },
  },

  // Animation & Interaction — Native cursor 위 custom cursor (overlay 가로채기)
  "Textarea resize handle 위에서 시스템 cursor (`ns-resize`) 가 우리 custom cursor (CursorTrail) 를 덮어씀 — html.custom-cursor * { cursor: none !important } 로도 안 잡힘": {
    section: "I", difficulty: 2, recommended: true,
    recommendReason: {
      ko: "native UI element 의 cursor 가 일반 CSS 영역 밖이라 가릴 수 없을 때 \"native 인터랙션 자체를 가로채기\" 로 우회한 패턴 — visual 은 native 그대로 두고 pointer 만 가져오는 hybrid 접근.",
      en: "When a native element's cursor lives outside CSS reach, the fix is to take over the *interaction* (not the visual) — a hybrid pattern that keeps the native look but routes the pointer through your own code.",
    },
  },

  // Architecture & Backend — pg_cron + pg_net + Vault
  "예약 발행 / 휴지통 정리가 Vercel cron 에 묶여 호스팅 의존 + 알림 누락": {
    section: "A", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "\"호스팅 기본 기능으로 빠르게 시작\" 의 단계를 끝내고, 데이터 작업을 데이터가 있는 곳 (DB) 안으로 옮긴 결정입니다. fail-soft 알림 설계 + setup.sql 의 idempotency 까지 같이 보여드리려 골랐습니다.",
      en: "Picked this to show the step from \"start with the host's built-in feature\" to \"data work lives where the data is.\" Also includes the fail-soft notification design and the setup.sql idempotency detail.",
    },
  },

  // Component System / Animation / CSS — Tech Stack 칩 에디터 세션
  "칩을 다른 그룹으로 drag 하면 일부는 잘 옮겨지고 일부는 기존 항목과 위치가 바뀜(switch)": {
    section: "C", difficulty: 2, recommended: true,
    recommendReason: {
      ko: "좌표/collision 을 의심하기 쉬운 증상이었지만 진짜 원인은 '파생 순서'였던 케이스 — 표면 증상이 아닌 데이터 모델까지 파고든 디버깅을 보여드리려 골랐습니다.",
      en: "The symptom screamed coordinates/collision, but the real cause was derived ordering — picked it to show debugging that goes past the symptom into the data model.",
    },
  },
  "drag&drop 후 위치 이동 애니메이션이 안 먹거나 엉뚱한 칩이 튐": { section: "I", difficulty: 2 },
  "drag 핸들 위에서만 'Drag' 커서가 떠서 사용자가 끌 수 있다는 걸 못 알아챔": { section: "I", difficulty: 1 },
  "dashed 테두리를 줬는데 테두리가 아예 안 그려짐": { section: "L", difficulty: 1 },

  // Layout & CSS — 에디터 top bar fixed 전환
  "에디터 top bar 가 `position: sticky` 로 안 붙음 — 본문 내부 스크롤이라 페이지가 안 움직여 핀이 안 걸림": {
    section: "L", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "sticky 가 안 되는 이유를 \"스크롤되는 조상이 없다\" 까지 좁히고, fixed + ResizeObserver spacer + capture 단계 scroll 로 우회한 사례 — 증상이 아닌 스크롤 모델까지 파고든 디버깅을 보여드리려 골랐습니다.",
      en: "Narrowed why sticky failed down to \"no actually-scrolling ancestor,\" then worked around it with fixed + a ResizeObserver spacer + capture-phase scroll — picked it to show debugging that goes into the scroll model, not the symptom.",
    },
  },

  // Animation & Interaction — carousel child click vs drag
  "HorizontalCarousel 안의 카드 클릭이 안 먹음 — `setPointerCapture` 가 자식 click 을 가로챔": {
    section: "I", difficulty: 3,
  },

  // Architecture / Component — preview = detail 공용 컴포넌트화
  "에디터 미리보기가 게시 상세와 레이아웃이 어긋남 — 단순화 버전이라 계속 drift": {
    section: "A", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "\"미리보기를 본화면에 맞춘다\" 가 아니라 \"같은 컴포넌트·같은 처리 함수를 쓰게 만들어 drift 자체를 불가능하게\" 로 관점을 바꾼 사례입니다.",
      en: "Picked this for the shift from \"keep the preview matched to the real screen\" to \"make both use the same component and processing function so drift becomes impossible.\"",
    },
  },

  // Layout & CSS — float figure margin
  "float 이미지가 상세 페이지에서 텍스트와 딱 붙음 (간격 0)": {
    section: "L", difficulty: 2,
  },

  // Architecture — 번들러가 라이브러리 정규식을 깨뜨림
  "댓글에 코드 하이라이팅을 붙이자 게시물 페이지 전체가 크래시 — 빌드는 통과": { featured: true,
    section: "A", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "빌드가 통과했는데 런타임에만 터진 케이스 — \"내 코드\" 가 아니라 번들러 산출물을 의심해야 풀렸습니다. CI 가 잡아주지 못하는 층이 있다는 걸 보여드리고 싶어 골랐습니다.",
      en: "The build passed and only the runtime died — solving it meant suspecting the bundler's output rather than my own code. Picked this because it shows a layer CI simply cannot catch.",
    },
  },

  // Architecture — sanitizer 설정 키끼리의 충돌
  "댓글 마크다운 체크박스가 렌더 안 됨 — DOMPurify 가 허용 목록에 넣은 속성을 조용히 지움": {
    section: "A", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "허용 목록에 분명히 넣었는데 사라지는, 에러 한 줄 없는 조용한 실패 — 설정 키 하나가 다른 키의 허용을 덮고 있다는 걸 라이브러리 내부 규칙까지 읽어서 찾아낸 사례입니다.",
      en: "A silent failure with no error at all — the attribute was explicitly allowlisted yet vanished. Picked this because the fix required reading the library's internal rules to find one config key quietly overruling another.",
    },
  },

  // Plate Editor — normalizer 무한루프
  "열블록 너비를 %로 바꾸면 에디터가 멈춤 — normalize 무한루프": {
    section: "E", difficulty: 3,
  },

  // Plate Editor — decorate leaf + mark leaf hook 순서 충돌
  "코드블록 안 텍스트에 서식을 넣으면 에디터가 크래시 — \"change in the order of Hooks\"": { featured: true,
    section: "E", difficulty: 3,
  },
};

const rawTroubleShootingItems: TroubleShootingItem[] = [
  {
    problem: {
      ko: "부모의 마운트 fitView 가 자식 effect 의 카메라 제어를 매번 덮어씀",
      en: "The parent's mount-time fitView silently overwrote the child's camera control",
    },
    definition: {
      ko: "ERD 다이어그램에서 테이블을 누르면 연결된 것들이 한 화면에 담기게 하려고, React Flow 안에 작은 컴포넌트를 두고 `useEffect` 에서 `fitView()` 를 불렀습니다. 코드도 배선도 맞는데 화면은 늘 같은 배율·같은 자리에 착지했습니다. 두 번을 고쳐도 증상이 그대로였습니다.",
      en: "To frame a table with everything it connects to, a small component inside React Flow called `fitView()` from a `useEffect`. The code and the wiring were both correct, yet the camera always landed at the same zoom and position. Two rounds of fixes changed nothing.",
    },
    cause: {
      ko: "`<ReactFlow>` 에 `fitView` prop 이 걸려 있었고, 포커스가 바뀔 때마다 `key` 가 바뀌어 **리마운트**되므로 그 초기 fit 이 매번 실행됐습니다. 결정적인 건 순서입니다 — **React 는 자식의 effect 를 부모보다 먼저 실행합니다.** 자식(`fitView` 호출)이 먼저 돌고, 곧바로 부모 ReactFlow 의 마운트 fit 이 그 결과를 덮어썼습니다. 아무 에러도 나지 않으니 \"내 코드가 안 불린다\" 고 의심하게 됩니다.",
      en: "`<ReactFlow>` had the `fitView` prop, and since `key` changed on every focus change the component **remounted**, re-running that initial fit each time. The decisive part is ordering — **React runs child effects before parent effects.** The child's `fitView()` ran first and the parent's mount fit immediately overwrote it. Nothing errors, so you start suspecting your own handler never fires.",
    },
    solution: {
      ko: "카메라를 잡는 곳을 하나로 만들었습니다. 명령형 effect 를 걷어내고 `fitViewOptions` 를 상태에 따라 바꿔, React Flow 가 자기 타이밍에 알아서 맞추게 했습니다. 노드 측정이 끝났는지 기다릴 필요도 사라졌습니다.",
      en: "Give the camera a single owner. Drop the imperative effect and vary `fitViewOptions` by state so React Flow performs the fit on its own schedule. Waiting for nodes to be measured stopped being a concern too.",
    },
    keyInsight: {
      ko: "라이브러리가 선언형 prop 으로 이미 제어하는 것을 명령형 API 로 또 만지면, 둘 중 **나중에 실행되는 쪽이 이깁니다.** 그리고 자식 effect 는 부모보다 먼저 돌기 때문에, 라이브러리 컴포넌트 안에 넣은 내 제어는 구조적으로 항상 집니다. 증상이 \"아무 일도 안 일어남\" 이면 코드가 안 불리는 게 아니라 **불린 뒤 덮어써지는 것**을 먼저 의심하세요.",
      en: "When a library already controls something through a declarative prop and you also poke it imperatively, **whichever runs last wins.** And since child effects run before parent effects, control placed inside the library's own component structurally always loses. When the symptom is \"nothing happens\", suspect that your code ran and was overwritten — not that it never ran.",
    },
    tags: ["react", "useEffect", "react-flow", "declarative-vs-imperative", "effect-order"],
  },
  {
    problem: {
      ko: "SQL 가져오기에서 DROP 이 조용히 무시됨 — 파서가 \"남은 것\" 만 돌려줬기 때문",
      en: "DROP was silently ignored on SQL import — because the parser only returned what remained",
    },
    definition: {
      ko: "About ERD 의 SQL 가져오기에 병합 모드를 넣은 뒤, `DROP TABLE junk;` 를 넣어도 테이블이 그대로 남고 `ALTER TABLE posts DROP COLUMN legacy;` 를 넣으면 지운 컬럼이 **되살아났습니다.** 오류도 경고도 없었습니다.",
      en: "After adding merge mode to the About ERD's SQL import, `DROP TABLE junk;` left the table in place and `ALTER TABLE posts DROP COLUMN legacy;` made the dropped column **come back.** No error, no warning.",
    },
    cause: {
      ko: "파서가 처리 결과로 **남아 있는 테이블·컬럼만** 돌려주고 있었습니다. 그러면 병합하는 쪽에서는 \"SQL 에 없음\" 이 *언급하지 않았음(유지)* 인지 *지웠음(삭제)* 인지 구별할 수 없습니다. 병합 규칙은 잃지 않는 쪽이 기본이라 둘 다 \"유지\" 로 처리했고, 삭제가 전부 되돌려졌습니다. 같은 뿌리에서 `RENAME TO` 도 옛 이름과 새 이름이 **둘 다 남는** 버그가 나왔습니다.",
      en: "The parser returned only the tables and columns that **remained**. That leaves the merge step unable to tell whether \"absent from the SQL\" means *not mentioned (keep)* or *deleted (remove)*. Merge defaults to not losing data, so both became \"keep\" and every deletion was undone. The same root cause made `RENAME TO` leave **both** the old and the new name behind.",
    },
    solution: {
      ko: "삭제를 결과의 부재로 표현하지 않고 **명시적으로 보고**하도록 바꿨습니다(`removedTables` / `removedColumns`, `RENAME` 은 옛 이름을 삭제로 보고). 병합은 이 목록만 실제로 지웁니다. 최종 상태 기준이라 `DROP` 뒤에 다시 `CREATE` 하면 삭제로 치지 않고, 사라진 대상에 걸려 있던 관계선도 함께 끊습니다.",
      en: "Stop expressing deletion as absence and **report it explicitly** (`removedTables` / `removedColumns`; `RENAME` reports the old name as removed). Merge then removes exactly that list. It reflects the final state, so a `DROP` followed by a `CREATE` isn't a deletion, and relations attached to anything removed are cut with it.",
    },
    keyInsight: {
      ko: "결과에서 **빠져 있다는 사실만으로는 의도를 전달할 수 없습니다.** \"없음\" 이 \"관심 없음\" 과 \"지워라\" 를 동시에 뜻하는 자료 구조는, 그 둘을 구별해야 하는 순간 반드시 한쪽을 조용히 틀리게 처리합니다. 두 상태를 다르게 다뤄야 한다면 표현도 둘로 나눠야 합니다.",
      en: "**Absence alone cannot carry intent.** A data shape where \"missing\" means both \"didn't touch it\" and \"delete it\" will silently get one of them wrong the moment the two must be distinguished. If two states need different handling, they need different representations.",
    },
    tags: ["parser", "merge", "data-modeling", "sql", "semantics"],
  },
  {
    problem: {
      ko: "표 안의 아이콘 버튼을 늘렸더니 그 행만 높이가 달라짐",
      en: "Adding icon buttons to a table cell made only that row taller",
    },
    definition: {
      ko: "ERD 컬럼 편집 표의 제약 칸에 버튼을 하나에서 셋으로 늘리면서 간격을 주려고 `<td>` 에 `display: flex` 를 줬습니다. 그러자 그 행만 다른 행보다 높아지고 셀 정렬이 어긋났습니다.",
      en: "Going from one button to three in the constraints cell of the ERD column editor, I set `display: flex` on the `<td>` to get spacing. That row alone became taller than the rest and the cells stopped lining up.",
    },
    cause: {
      ko: "원인이 두 겹이었습니다. ① `<td>` 를 flex 컨테이너로 만들면 그 셀은 **표 레이아웃 알고리즘에서 빠져나와** 행 높이 계산에 정상적으로 참여하지 못합니다. ② 버튼이 `inline-flex` 라 기본이 baseline 정렬인데, baseline 아래로 descender 공간이 남아 셀 높이를 밀어 올립니다. 버튼이 하나일 때는 눈에 안 띄다가 셋이 되면서 드러났습니다.",
      en: "Two layers. ① Making a `<td>` a flex container **pulls it out of the table layout algorithm**, so it no longer participates properly in row-height calculation. ② The buttons are `inline-flex`, which aligns to the baseline by default, and the descender space below the baseline pushes the cell taller. With one button it was invisible; three made it obvious.",
    },
    solution: {
      ko: "셀은 `table-cell` 로 두고 버튼끼리만 `margin` 으로 간격을 줬습니다. 그리고 버튼에 `vertical-align: middle` 을 명시해 baseline 여백을 없앴습니다. 나중에 버튼이 툴팁 래퍼(`span`) 안으로 들어가면서 인접 선택자가 깨졌는데, 요소 종류를 가리지 않는 `.cell > * + *` 로 바꿔 같은 문제가 재발하지 않게 했습니다.",
      en: "Leave the cell as `table-cell` and space the buttons with `margin`, then set `vertical-align: middle` on them to kill the baseline gap. When the buttons were later wrapped in tooltip `span`s the adjacent-sibling selector broke, so it became `.cell > * + *` — element-agnostic, so the same problem can't return.",
    },
    keyInsight: {
      ko: "`<td>` 의 `display` 를 바꾸는 건 그 셀 하나의 문제가 아니라 **표 전체의 레이아웃 계약을 깨는 일**입니다. 표 안에서 배치가 필요하면 셀이 아니라 셀 **안쪽 요소**에 flex 를 걸어야 합니다. 그리고 inline 계열 요소는 기본이 baseline 정렬이라, 높이가 이상하면 `vertical-align` 을 먼저 의심하세요.",
      en: "Changing a `<td>`'s `display` isn't a local tweak — it **breaks the table's layout contract**. When you need layout inside a table, put flex on an element *inside* the cell, never on the cell. And inline-level elements align to the baseline by default, so when heights look wrong, suspect `vertical-align` first.",
    },
    tags: ["css", "table-layout", "flexbox", "vertical-align", "baseline"],
  },
  /* ── 멀티 저자 / OAuth (Phase 1b) + 코드블록 ── */
  {
    section: { ko: "Backend / Auth", en: "Backend / Auth" },
    problem: { ko: "멤버 역할을 어디에 저장해야 조작을 막을 수 있나", en: "Where to store member roles so they can't be tampered with" },
    definition: {
      ko: "GitHub OAuth 로 로그인한 멤버마다 소유자·편집자·저자 **역할**을 부여해야 하는데, 이 역할을 Supabase 사용자 객체의 어디에 저장하느냐가 곧 보안 경계였습니다.",
      en: "Each GitHub-OAuth member needs an owner/editor/author **role**, and where that role lives on the Supabase user object *is* the security boundary.",
    },
    cause: {
      ko: "Supabase 사용자에는 `user_metadata` 와 `app_metadata` 두 저장소가 있습니다. 이름이 비슷해 아무 데나 넣어도 될 것 같지만, **`user_metadata` 는 로그인한 본인이 클라이언트 SDK(`updateUser`)로 직접 수정할 수 있습니다.** 여기에 역할을 넣으면 저자 권한 사용자가 브라우저 콘솔에서 자기 역할을 `owner` 로 바꿔 권한을 탈취할 수 있습니다.\n\n반면 `app_metadata` 는 **service_role 키로만** 쓸 수 있어 클라이언트에서 변경이 불가능합니다.",
      en: "A Supabase user has two stores: `user_metadata` and `app_metadata`. The names look interchangeable, but **`user_metadata` is writable by the signed-in user via the client SDK (`updateUser`).** Put a role there and an author-level user can flip their own role to `owner` from the browser console and escalate. `app_metadata`, by contrast, is **writable only with the service_role key** — untouchable from the client.",
    },
    solution: {
      ko: "역할(`role`·`author_id`·`permission_level`)은 전부 **`app_metadata` 에만** 저장하고 서버 라우트에서 service_role 로만 갱신합니다. 소유자는 초대 테이블조차 거치지 않고 `OWNER_EMAIL` 환경변수로 부트스트랩해 재지정이 불가능하게 했습니다.\n\n권한 판정(`requireOwner`·`requireRole`)도 매 요청마다 서버에서 `app_metadata` 를 다시 읽어 수행합니다 — 클라이언트가 보낸 값은 신뢰하지 않습니다.",
      en: "Roles (`role`, `author_id`, `permission_level`) live **only in `app_metadata`**, updated exclusively by server routes with the service_role key. The owner is bootstrapped from an `OWNER_EMAIL` env var — not even the invite table — so it can't be reassigned. Authorization (`requireOwner`, `requireRole`) re-reads `app_metadata` server-side on every request; values sent by the client are never trusted.",
    },
    keyInsight: {
      ko: "**\"사용자가 수정할 수 있는 필드\" 와 \"서버만 수정할 수 있는 필드\" 를 물리적으로 다른 저장소에 두는 것** 이 권한 시스템의 출발점입니다. 이름이 비슷하다고 신뢰 수준이 같지 않습니다.",
      en: "Putting **user-writable fields and server-only fields in physically separate stores** is the starting point of any permission system. Similar names don't mean the same trust level.",
    },
    tags: ["Supabase", "Auth", "app_metadata", "권한"],
  },
  {
    section: { ko: "Backend / Auth", en: "Backend / Auth" },
    problem: { ko: "GitHub OAuth 는 계정만 있으면 누구나 로그인 시도가 성공한다", en: "GitHub OAuth lets anyone with an account complete sign-in" },
    definition: {
      ko: "비밀번호 로그인은 관리자가 만든 계정만 들어올 수 있지만, GitHub OAuth 를 붙이자 **GitHub 계정을 가진 누구든** 콜백까지 통과해 세션이 생겨버렸습니다.",
      en: "Password login only admits accounts the admin created, but once GitHub OAuth was wired in, **anyone with a GitHub account** could pass the callback and get a session.",
    },
    cause: {
      ko: "OAuth 는 \"이 사람이 진짜 이 GitHub 계정 주인인가\" 라는 **인증(authentication)** 만 보장합니다. \"이 사람이 우리 사이트에 들어와도 되는가\" 라는 **인가(authorization)** 는 전혀 별개인데, `signInWithOAuth` → 콜백 `exchangeCodeForSession` 흐름은 인증만 하고 세션을 만들어 줍니다. 초대받지 않은 사람도 로그인 자체는 성공해 버립니다.",
      en: "OAuth only guarantees **authentication** — \"is this really the owner of this GitHub account?\". **Authorization** — \"is this person allowed into our site?\" — is a separate question, but the `signInWithOAuth` → callback `exchangeCodeForSession` flow only authenticates and then mints a session. An un-invited person still succeeds at logging in.",
    },
    solution: {
      ko: "콜백 라우트에서 세션 교환 직후 그 이메일이 **허용 대상인지 서버에서 검사**합니다 — `OWNER_EMAIL` 이거나, 이미 역할이 있거나, `author_invites` 에 초대 레코드가 있어야 합니다. 셋 다 아니면 즉시 `signOut()` + service_role `deleteUser()` 로 계정을 지우고 실패 사유와 함께 로그인 페이지로 돌려보냅니다. 통과한 초대는 `app_metadata` 에 역할을 부여하고 초대를 소진 처리합니다.",
      en: "In the callback route, right after the session exchange, the server **checks whether that email is allowed** — it must be `OWNER_EMAIL`, already have a role, or have an invite row in `author_invites`. If none hold, it immediately `signOut()`s and `deleteUser()`s the account with the service_role key, then redirects back to login with the reason. A valid invite grants the role in `app_metadata` and marks the invite consumed.",
    },
    keyInsight: {
      ko: "**인증과 인가는 다른 문제입니다.** OAuth 를 붙였다는 건 \"신원 확인\" 을 위임한 것뿐, \"출입 허가\" 는 여전히 우리 서버가 콜백에서 직접 판정해야 합니다.",
      en: "**Authentication and authorization are different problems.** Wiring up OAuth only delegates identity verification; admission is still a call our own server has to make in the callback.",
    },
    tags: ["OAuth", "Auth", "GitHub", "인가"],
  },
  {
    section: { ko: "Frontend / CSS", en: "Frontend / CSS" },
    problem: { ko: "코드블록 리사이즈 그립에서 커스텀 커서 위로 시스템 커서가 계속 새어나옴", en: "The system resize cursor leaks over the custom cursor on the code-block grip" },
    definition: {
      ko: "사이트 전역이 커스텀 커서(`cursor: none` + 직접 그린 커서)라 `resize` 되는 코드블록 우하단 그립에서도 커스텀 커서만 보여야 하는데 **네이티브 리사이즈 커서(↘)가 계속 같이 떴습니다.** 똑같은 방식인 댓글창은 멀쩡한데 코드블록만 샜습니다.",
      en: "The whole site uses a custom cursor (`cursor: none` + a hand-drawn cursor), so the resizable code block's bottom-right grip should show only the custom cursor — but **the native resize cursor (↘) kept bleeding through.** The comment box, built the same way, was fine; only the code block leaked.",
    },
    cause: {
      ko: "`resize` 그립은 `::-webkit-resizer` 라는 UA 의사요소로 그려지는데, 이건 스크롤바처럼 **그 요소의 자식들보다 위에 페인트** 됩니다. 코드블록은 시스템 커서를 가리려 올려둔 투명 오버레이가 resize 요소의 **자식**이라, resizer 가 오버레이보다 위에 그려져 `cursor: none` 이 안 먹었습니다. 댓글창은 오버레이가 resize 되는 textarea 의 **형제**라 resizer 위에 얹혀 정상이었습니다.",
      en: "The grip is painted by the `::-webkit-resizer` UA pseudo-element, which — like a scrollbar — **paints above the element's own children.** In the code block, the transparent overlay meant to mask the cursor was a **child** of the resizable element, so the resizer painted on top of it and `cursor: none` never applied. In the comment box the overlay was a **sibling** of the resizable textarea, so it sat above the resizer and worked.",
    },
    solution: {
      ko: "오버레이를 resize 요소의 **형제**로 옮겼습니다 — 프레임을 바깥 컨테이너(`position: relative`)로 한 겹 감싸고 오버레이를 그 안에 형제로 두면, 오버레이가 resizer 위에 페인트되어 시스템 커서를 가립니다. `resize` 는 자기 border-radius 가 자기 그립을 자르지 않으므로 프레임(자식 아님)에 그대로 둬 네이티브 그립 모양은 유지했습니다.",
      en: "Moved the overlay to be a **sibling** of the resizable element — wrap the frame in an outer `position: relative` container and place the overlay as a sibling inside it, so it paints above the resizer and masks the system cursor. `resize` stays on the frame (whose own border-radius doesn't clip its own grip), keeping the native grip look.",
    },
    keyInsight: {
      ko: "UA 가 그리는 요소(스크롤바·resizer)는 **자식 위, 형제 아래** 라는 독특한 페인트 순서를 갖습니다. 그 위에 무언가를 얹어야 한다면 자식이 아니라 형제로 둬야 합니다.",
      en: "UA-drawn chrome (scrollbars, resizers) has a peculiar paint order: **above children, below siblings.** To cover one, place your element as a sibling — not a child.",
    },
    tags: ["CSS", "커서", "resize", "webkit"],
  },
  /* ── Backend / Admin ── */
  {
    section: { ko: "Backend / Admin", en: "Backend / Admin" },
    problem: { ko: "포스트 실수 삭제 시 복구 불가", en: "Accidental Post Deletion with No Recovery" },
    definition: {
      ko: "관리자가 글을 실수로 지우면 **DB 에서 그대로 사라져**, 되돌릴 방법이 전혀 없었습니다.",
      en: "When the admin accidentally deleted a post, it was **permanently removed from the DB** with no recovery mechanism available.",
    },
    cause: {
      ko: "처음 구현은 일반적인 CRUD 패턴 그대로 **\"삭제 버튼 = DB 에서 row 즉시 제거\"** 였습니다.\n\n이후 admin 화면에 체크박스로 여러 글을 한꺼번에 지우는 **일괄 삭제 UI** 를 추가했고, 일괄 삭제가 들어가자 그동안 단일 row 삭제에서는 크게 의식되지 않던 위험이 한눈에 들어왔습니다. **클릭 한 번에 여러 row 가 같이 사라질 수 있고**, 처음 구현된 \"즉시 제거\" 구조에서는 그 사라짐이 곧 영구 손실로 이어진다는 점이었습니다.\n\n관리자가 한 명뿐인 환경은 \"실수가 거의 없을 것\" 이라고 넘기기 쉬우나, 사실은 **실수를 사전에 걸러 줄 사람도, 검토 단계도 없는 환경** 입니다. 발생 빈도가 낮더라도 한 번 발생했을 때의 비용이 비대칭적으로 크기 때문에, 일괄 삭제 UI 와 함께 **\"되돌릴 수 있는 삭제\" 구조 (soft delete + 휴지통) 를 같이 도입** 하기로 결정했습니다.",
      en: "The initial implementation followed the textbook CRUD pattern: **\"delete button = remove the row from the DB immediately\"**.\n\nThen I added a **bulk-delete UI** to the admin page — checkboxes to remove multiple posts in one click. Once bulk delete was in place, a risk that hadn't really registered while only single-row deletes existed became impossible to ignore: **one click could remove multiple rows at once**, and under the original \"immediate removal\" structure each of those removals was permanent.\n\nA single-admin environment is easy to dismiss as \"mistakes will be rare\", but it's precisely **the environment with no second person and no review step to catch a mistake**. The frequency may be low, but the cost of a single occurrence is disproportionately high — so the bulk-delete UI was shipped alongside a **\"reversible delete\" structure (soft delete + trash) from the start**.",
    },
    solution: {
      ko: "삭제 버튼을 눌러도 row 를 실제로 지우지 않고, **`deleted_at` 이라는 \"삭제한 시각\" 만 기록** 하는 soft delete 방식으로 바꾸었습니다. 데이터는 테이블에 그대로 남아 있고, 목록 쿼리에 `WHERE deleted_at IS NULL` 한 줄만 추가하면 사용자 화면에선 보이지 않습니다.\n\n지운 글은 **휴지통 페이지 (`?trash=true`)** 에서 다시 확인할 수 있고, 복원할 때는 `published=false` 로 되돌립니다. 그래야 실수로 복원하다 **공개하지 않은 글이 갑자기 다시 발행되는 사고** 를 막을 수 있기 때문입니다.\n\n실제로 영구 삭제하는 동작 (purge) 은 별도 API 로 분리해, **사용자가 한 번 더 명시적으로 확인해야만** 실행되도록 했습니다.",
      en: "Switched to soft delete: a delete request **only sets a `deleted_at` timestamp** instead of removing the row. The data stays in the table, and list queries simply add `WHERE deleted_at IS NULL` to hide it from users.\n\nDeleted posts show up in a **trash page (`?trash=true`)**. Restoring resets `published=false`, **preventing accidental re-publish** during recovery.\n\nTrue permanent deletion (purge) is a separate API that requires **another explicit confirmation** before it runs.",
    },
    keyInsight: {
      ko: "삭제는 **\"없애기\" 가 아니라 \"숨기기\"** 로 시작해야 합니다.\n\n되돌릴 수 없는 동작은 별도 단계로 한 번 더 분리하고, **기본 삭제는 언제든 다시 살릴 수 있도록 두는 것이 안전한 기본값** 입니다.",
      en: "Deletion should start with **'hide' rather than 'remove'**.\n\nIrreversible operations belong in a separate, opt-in step; **the default delete should always be reversible**.",
    },
    comparisons: [
      {
        label: { ko: "삭제 방식 비교", en: "Deletion strategy comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "Hard Delete", en: "Hard Delete" },
          { ko: "Soft Delete (채택)", en: "Soft Delete (adopted)" },
          { ko: "Trash Table", en: "Trash Table" },
        ],
        rows: [
          { cells: [{ ko: "구현 복잡도", en: "Implementation" }, { ko: "매우 낮음", en: "Very low" }, { ko: "낮음", en: "Low" }, { ko: "높음", en: "High" }] },
          { cells: [{ ko: "복구 가능", en: "Recoverable" }, { ko: "✗", en: "✗" }, { ko: "✓", en: "✓" }, { ko: "✓", en: "✓" }] },
          { cells: [{ ko: "쿼리 영향", en: "Query impact" }, { ko: "없음", en: "None" }, { ko: "WHERE 조건 추가", en: "WHERE clause added" }, { ko: "조인 필요", en: "Join needed" }] },
          { cells: [{ ko: "FK 무결성", en: "FK integrity" }, { ko: "CASCADE 필요", en: "CASCADE needed" }, { ko: "유지", en: "Maintained" }, { ko: "깨질 수 있음", en: "Can break" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 복구 불가", en: "✗ No recovery" }, { ko: "✓ 단순 + 안전", en: "✓ Simple + safe" }, { ko: "✗ 과도한 복잡도", en: "✗ Over-complex" }], highlight: true },
        ],
        description: {
          ko: "Trash Table 방식은 삭제된 데이터를 별도 테이블로 이동시키는 방식이지만, **FK 관계가 끊어지고** 복원 시 원래 테이블로 다시 옮겨야 합니다. Soft delete는 같은 테이블에 남아 있으므로 FK가 유지되고, 목록 쿼리에 `WHERE deleted_at IS NULL` 조건만 추가하면 됩니다. **단일 관리자 규모에서는 soft delete가 가장 실용적**입니다.",
          en: "Trash Table moves deleted data to a separate table, but **FK relationships break** and restoration requires moving data back. Soft delete keeps records in the same table, preserving FK integrity — just add `WHERE deleted_at IS NULL` to list queries. **At single-admin scale, soft delete is the most practical choice**.",
        },
      } satisfies ComparisonTable,
    ],
    images: [
      {
        alt: { ko: "휴지통 페이지 — 삭제된 글 목록 + 복원 / 영구삭제 버튼", en: "Trash page — deleted posts list with restore / purge buttons" },
        placeholderKeyword: "Admin 휴지통 페이지 (?trash=true) 화면",
      },
    ],
  },
  {
    problem: { ko: "AI 번역/요약이 provider 장애 시 완전 중단", en: "AI Translation/Summary Completely Down on Provider Outage" },
    definition: {
      ko: "AI 번역과 요약 기능은 DeepL, Gemini 같은 외부 회사의 API 를 호출해 처리합니다.\n\n테스트 중 `.env` 의 API 키를 잠시 주석 처리해 봤더니, 번역이나 요약을 시도할 때마다 **\"인증 실패\" 같은 에러 메시지가 사용자 화면에 그대로 노출**되었습니다.\n\n이 사이트는 대부분의 API 를 무료 plan 으로 쓰는 환경이라, **시간당 호출 제한 (rate limit) 도달이나 일시적 장애는 운영 중에도 충분히 발생할 수 있는 시나리오** 였습니다. 테스트로 끝낼 문제가 아니라 실제로 대비가 필요했습니다.",
      en: "The AI translation and summary features call external APIs (DeepL, Gemini, etc.).\n\nWhile testing, I commented out an API key in `.env` — every translation or summary attempt **surfaced raw error messages like \"auth failed\" directly to users**.\n\nMost APIs were on free tiers, so **hitting rate limits or temporary outages was a realistic production concern** — not just a theoretical edge case.",
    },
    cause: {
      ko: "번역 API 는 DeepL · Google · Gemini · Claude 같은 외부 회사 API 중에서 골라 쓸 수 있도록 만들어 두었습니다 (이런 API 서비스 회사를 \"provider\" 라고 부릅니다). 사용자마다 결제 계정이나 선호 모델이 다를 수 있어, 어느 provider 든 자유롭게 설정해 쓸 수 있게 하려는 의도였습니다.\n\n수정 전에는 사용자가 골라 둔 한 provider 만 호출하는 단순한 구조였습니다. 그러다 다른 기능을 테스트하느라 `.env` 의 API 키 한 줄을 주석 처리해 둔 상태로 번역을 호출하니, 그 한 provider 의 인증 실패가 곧장 사용자 화면에 에러 메시지로 노출되었습니다.\n\n이 지점에서 두 가지가 함께 떠올랐습니다.\n\n**① fallback 의 필요성** — provider 를 여러 개 등록할 수 있게 만들어 둔 구조에, 한 provider 가 실패하면 자동으로 다음 provider 를 이어서 시도하는 동작만 얹으면, 첫 호출의 실패가 사용자 화면에 드러나지 않고 마지막 성공한 결과만 도달하게 됩니다. 그래서 **\"기본 + 백업 우선순위\" 로 여러 provider 를 차례로 시도하는 fallback 패턴** 으로 보완하기로 했습니다.\n\n**② 애초에 실패할 수밖에 없는 상태의 처리** — 한 기능은 여러 provider 를 묶어 두는 구조라, **그 기능에 연결된 provider 전부에 API 키가 등록되어 있지 않다면** 어떤 호출로도 성공할 수 없는 상태가 됩니다. 이런 경우엔 사용자 화면에서 해당 기능을 노출 자체를 하지 않고, 관리자 화면에서는 \"현재 사용 불가\" 안내와 함께 비활성화해 시도 자체를 막아 두기로 했습니다.",
      en: "Translation routes through external providers — DeepL, Google, Gemini, Claude (these external API services are called \"providers\"). The intent was to let each user freely pick whichever provider matched their billing setup or preferred model.\n\nOriginally the flow was simple: call the one provider the user had selected. While testing something else, I commented out an API key in `.env` and ran a translation — and the single-provider auth failure surfaced directly to the user as an error message.\n\nThat moment surfaced two things at once.\n\n**① The need for fallback** — multi-provider registration was already in place; on top of that, all that was missing was \"if one fails, try the next automatically\". With that single addition, a single-provider failure never has to reach the user — only the eventual successful result does. So I introduced a **\"primary + backup priority\" fallback pattern** that tries providers in order.\n\n**② Handling features that are doomed to fail** — each feature is backed by multiple providers, so it's only truly \"doomed\" **when none of its providers has an API key registered** — at that point no call could possibly succeed. In that state the feature should be **hidden from the user-facing UI entirely**, and disabled on the admin side with a \"currently unavailable\" notice so the action can't even be attempted.",
    },
    solution: {
      ko: "사이트 설정에서 **\"기본 provider + 백업 provider 순서\"** 를 직접 구성할 수 있게 변경했습니다.\n\n예를 들어 기본은 DeepL, 실패 시 백업 순서를 [Gemini → Google → Claude] 로 두는 식입니다. 기본이 실패하면 백업 리스트를 순서대로 시도하고, 하나라도 성공하면 그 결과를 즉시 반환합니다. 모두 실패해야만 그제서야 사용자 화면에 에러가 노출됩니다.\n\n한 기능에 묶인 provider 전부에 API 키가 등록되어 있지 않다면 — 어떤 호출로도 성공할 수 없는 상태이므로 — **사용자 화면에서는 해당 기능을 노출하지 않고, 관리자 화면에서는 비활성화 + \"현재 사용 불가\" 안내** 로 시도 자체를 막았습니다.\n\n또한 \"일괄 번역\" 케이스도 별도로 처리했습니다. 글 하나에는 제목 · 본문 · 요약 같은 필드가 여러 개 있는데, 이걸 매번 \"필드 하나당 API 호출 한 번\" 으로 보내면 호출 횟수가 그만큼 늘어 비용 · rate limit · 응답 속도 모두 불리합니다. 그래서 여러 필드를 한 번의 API 호출에 함께 묶어 보내는 방식을 쓰는데, 이를 보통 \"일괄 번역\" 이라고 합니다.\n\n다만 이 방식은 5개를 보냈는데 결과가 4개만 돌아오는 \"부분 실패\" 가 가끔 일어납니다. 그대로 받아서 저장하면 한 필드가 누락된 채로 저장되어 버리므로, **입력 개수와 결과 개수를 비교해서 일치하지 않으면 그 provider 를 실패로 판정** 하고 다음 백업 provider 로 넘기도록 했습니다.",
      en: "Site settings now expose a **\"primary provider + backup priority list\"** configuration.\n\nFor example: primary DeepL, backups in order [Gemini → Google → Claude]. If primary fails, the backups are tried in order; the first success is returned. Only if all fail does the error reach the user.\n\nIf none of a feature's providers has an API key — meaning no call could possibly succeed — the feature is **hidden from the user-facing UI entirely, and disabled on the admin side with a \"currently unavailable\" notice** so the action can't even be attempted.\n\nThere's also \"batch translation\". A single post has several fields — title, body, excerpt — and translating them with \"one API call per field\" multiplies the request count, hurting cost, rate limits, and response time. The standard workaround is to send multiple fields together in a single API call, commonly called \"batch translation\".\n\nThe catch: sometimes you send 5 strings and only 4 come back — a partial failure. If you naively accept the 4, the post gets saved with one field silently missing. So the pipeline **compares input count vs. output count and treats any mismatch as a provider failure**, falling through to the next backup provider.",
    },
    keyInsight: {
      ko: "외부 API 에 의존하는 기능은 설계 단계에서부터 **\"이 API 가 응답하지 않을 때 사용자에게 무엇이 보일까?\"** 라는 질문에 답해 두어야 합니다.\n\nAPI 가 완전히 중단되지 않더라도 rate limit 만으로도 충분히 실패할 수 있기 때문에, **에러를 그대로 노출할지 / 기능을 숨길지 / 다른 provider 로 우회할지** 셋 중 하나는 사전에 정해 두는 것이 안전합니다.",
      en: "Features that depend on external APIs need to answer **\"what will the user see when this API stops responding?\"** during design — not after.\n\nProviders don't have to be fully down to fail — rate limits alone are enough. Decide in advance whether to **surface the error, hide the feature, or fall back to an alternate path**.",
    },
    diagrams: [
      {
        title: { ko: "Fallback Provider Chain", en: "Fallback Provider Chain" },
        nodes: [
          { id: "start",    type: "start",    row: 0, col: 0, label: { ko: "번역 요청",         en: "Translation\nRequest" } },
          { id: "primary",  type: "action",   row: 1, col: 0, label: { ko: "Primary\nProvider 시도", en: "Try Primary\nProvider" } },
          { id: "ok1",      type: "decision", row: 2, col: 0, label: { ko: "성공?",             en: "Success?" } },
          { id: "fb",       type: "action",   row: 3, col: 0, label: { ko: "Fallback 리스트\n순차 시도", en: "Try Fallback\nList in Order" } },
          { id: "ok2",      type: "decision", row: 4, col: 0, y: 100, label: { ko: "성공?",       en: "Success?" } },
          { id: "done",     type: "end",      row: 2, col: 1, label: { ko: "결과 반환 ✓",       en: "Return ✓" } },
          { id: "err",      type: "end",      row: 4, col: 2, label: { ko: "502 에러",          en: "502 Error" } },
        ],
        edges: [
          { from: "start",   to: "primary" },
          { from: "primary", to: "ok1" },
          { from: "ok1",     to: "done",  label: "Yes" },
          { from: "ok1",     to: "fb",    label: "No" },
          { from: "fb",      to: "ok2" },
          { from: "ok2",     to: "done",  label: "Yes" },
          { from: "ok2",     to: "err",   label: "No" },
        ],
      } satisfies TroubleshootingDiagram,
    ],
    comparisons: [
      {
        label: { ko: "수정 전 / 수정 후", en: "Before / After" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "수정 전", en: "Before" },
          { ko: "수정 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "사용 provider 수", en: "Providers used per call" }, { ko: "한 곳만", en: "One only" }, { ko: "기본 + 백업 N개", en: "Primary + N backups" }] },
          { cells: [{ ko: "기본 provider 실패 시", en: "On primary failure" }, { ko: "에러 그대로 노출", en: "Error surfaces to user" }, { ko: "다음 백업 자동 시도", en: "Auto-fallback to next" }] },
          { cells: [{ ko: "API 키 없는 provider", en: "Provider without API key" }, { ko: "호출 후 401/403 에러", en: "Called → 401/403 error" }, { ko: "호출 자체 건너뜀", en: "Skipped pre-network" }] },
          { cells: [{ ko: "일괄 번역 부분 실패", en: "Partial batch failure" }, { ko: "결과 부족한 채로 저장", en: "Saved with missing rows" }, { ko: "개수 불일치 → 다음 백업", en: "Count mismatch → next backup" }] },
          { cells: [{ ko: "사용자 경험", en: "User experience" }, { ko: "기능이 가끔 멈춤", en: "Feature sometimes breaks" }, { ko: "provider 장애에도 결과 도달", en: "Works through provider outages" }], highlight: true },
        ],
      } satisfies ComparisonTable,
    ],
    images: [
      {
        // multi-provider fallback — 추상 컨셉 이미지
        src: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=750&fit=crop",
        alt: { ko: "여러 서버 / network — multi-provider fallback 컨셉", en: "Multiple servers / network — multi-provider fallback concept" },
        caption: { ko: "한 provider 가 죽어도 다음 provider 가 받아주는 구조", en: "Other providers pick up when one fails" },
      },
      {
        alt: { ko: "Admin Settings 페이지 — provider 별 API key 관리 화면", en: "Admin Settings page — per-provider API key management" },
        placeholderKeyword: "Admin Settings 페이지 — AI provider 별 API key 입력 폼 (DeepL, Gemini 등)",
      },
    ],
  },
  {
    problem: { ko: "API 키 변경마다 재배포가 필요", en: "Every API Key Change Requires Redeployment" },
    definition: {
      ko: "API 키를 하나 교체하려면 **Vercel 환경변수 수정 → 빌드 → 배포** 전체 과정을 거쳐야 했고, 10개 이상의 키를 이 방식으로 관리해야 했습니다.",
      en: "Changing a single API key required the **full Vercel env edit → build → deploy cycle**, and 10+ keys all had to be managed this way.",
    },
    cause: {
      ko: "모든 API 키를 **`.env` 환경변수에 하드코딩**해 두고 있었습니다. 키를 교체하려면 Vercel 대시보드에서 환경변수를 수정한 뒤 **빌드·배포를 다시 실행**해야 했습니다. AI provider를 여러 개 사용하면서 키가 10개 이상으로 늘어났고, 키 하나 바꾸는 데 **3~5분의 빌드 시간**이 소요되었습니다.",
      en: "All API keys were **hardcoded in `.env` environment variables**. Changing a key required editing Vercel dashboard env vars and **re-running build/deploy**. With multiple AI providers, keys grew to 10+, and changing one took **3-5 minutes of build time**.",
    },
    solution: {
      ko: "API 키를 `site_settings` 테이블의 JSONB에 저장하고, **어드민 UI에서 실시간으로 관리**할 수 있도록 변경했습니다. 서버에서는 **DB 값을 우선 사용하고, 없으면 env로 fallback**하는 2단계 조회를 적용합니다. 60초 TTL 캐시로 매 요청마다 DB를 조회하지 않으며, 키 저장/삭제 시 캐시를 즉시 무효화합니다. 키 조회(GET) 시에는 **앞 3자리 + 뒤 3자리만 노출**하고, 전체 값 확인(POST)에는 **비밀번호 재인증**을 요구합니다.",
      en: "Moved API keys to JSONB in the `site_settings` table, **manageable in real-time via admin UI**. Server uses a **two-tier lookup: DB first, env fallback**. A 60-second TTL cache avoids per-request DB queries, invalidated immediately on key save/delete. GET requests **expose only first 3 + last 3 characters**, and viewing full values (POST) **requires password re-authentication**.",
    },
    keyInsight: {
      ko: "자주 바뀌는 설정(API 키, 기능 토글)은 **DB에 저장하여 재배포 없이 변경**할 수 있어야 합니다. 거의 바뀌지 않는 인프라 설정(DB URL, Auth 시크릿)만 환경변수에 남기면 됩니다. **env는 fallback 역할**로 두면 DB 장애 시에도 기능이 유지됩니다.",
      en: "Frequently changing settings (API keys, feature toggles) should be **stored in DB for change without redeployment**. Only rarely-changed infrastructure settings (DB URL, Auth secrets) belong in env vars. **Env as fallback** ensures features survive DB outages.",
    },
    comparisons: [
      {
        label: { ko: "API 키 저장 방식 비교", en: "API key storage comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "env only", en: "env only" },
          { ko: "DB only", en: "DB only" },
          { ko: "DB + env fallback (채택)", en: "DB + env fallback (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "변경 속도", en: "Change speed" }, { ko: "재배포 필요 (3~5분)", en: "Redeploy (3-5min)" }, { ko: "즉시", en: "Instant" }, { ko: "즉시", en: "Instant" }] },
          { cells: [{ ko: "장애 내성", en: "Fault tolerance" }, { ko: "높음 (빌드에 포함)", en: "High (in build)" }, { ko: "DB 의존", en: "DB-dependent" }, { ko: "높음 (이중 경로)", en: "High (dual path)" }] },
          { cells: [{ ko: "비기술 관리자", en: "Non-tech admin" }, { ko: "✗ (Vercel 접근 필요)", en: "✗ (Vercel access)" }, { ko: "✓ (UI 관리)", en: "✓ (UI managed)" }, { ko: "✓ (UI 관리)", en: "✓ (UI managed)" }] },
          { cells: [{ ko: "초기 설정", en: "Initial setup" }, { ko: "간단", en: "Simple" }, { ko: "DB 마이그레이션", en: "DB migration" }, { ko: "DB + env 양쪽", en: "DB + env both" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 키 10개+ 관리 불편", en: "✗ 10+ keys unwieldy" }, { ko: "△ DB 장애 시 중단", en: "△ Down on DB failure" }, { ko: "✓ 유연 + 안전", en: "✓ Flexible + safe" }], highlight: true },
        ],
        description: {
          ko: "env only는 키가 적을 때는 충분하지만, **10개 이상의 키를 관리하면서 잦은 교체가 필요**해지자 한계가 드러났습니다. DB only는 변경은 편하지만 DB 장애 시 모든 외부 연동이 중단됩니다. **DB + env fallback 방식**은 평소에는 DB에서 즉시 변경하고, DB 장애 시에는 env 값으로 자동 전환되어 **가용성과 편의성을 동시에 확보**합니다.",
          en: "env only works fine with few keys, but **managing 10+ keys with frequent rotation** revealed its limits. DB only makes changes easy but stops all integrations on DB failure. **DB + env fallback** allows instant DB changes normally, with automatic env fallback on DB failure, **achieving both availability and convenience**.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: { ko: "비회원 댓글에서 본인 확인이 번거로움", en: "Tedious Identity Verification for Guest Comments" },
    definition: {
      ko: "비회원 댓글 수정/삭제 시 **매번 비밀번호를 입력**해야 했고, 다른 기기에서 작성한 댓글은 **본인 확인 자체가 불가능**했습니다.",
      en: "Editing/deleting guest comments required **re-entering the password every time**, and comments from other devices were **completely unidentifiable**.",
    },
    cause: {
      ko: "초기 댓글 시스템은 **비밀번호만으로 본인 확인**을 처리했습니다. 댓글을 수정하거나 삭제할 때마다 비밀번호를 입력해야 했고, 다른 기기에서 작성한 댓글은 비밀번호를 기억하지 못하면 **본인 글인지 확인조차 불가능**했습니다. 회원가입을 도입하면 해결되지만, 포트폴리오 사이트에서 **가입 허들은 댓글 참여율을 크게 떨어뜨립니다**.",
      en: "The initial comment system used **password-only verification**. Every edit/delete required re-entering the password, and comments from other devices were **impossible to identify** if the password was forgotten. Adding sign-up would solve this, but in a portfolio site, **registration hurdles dramatically reduce comment participation**.",
    },
    solution: {
      ko: "브라우저에 **고유 ID(UUID)를 localStorage에 저장**하고, 이 ID와 대상(포스트/작업물) ID를 조합하여 SHA-256 해싱한 `commenter_hash`를 댓글에 저장합니다. 같은 브라우저에서는 해시 비교로 **비밀번호 입력 없이 자동 인식**됩니다. 다른 기기에서는 기존 **bcrypt password_hash로 검증**합니다. 관리자는 Supabase Auth 세션으로 모든 댓글을 관리할 수 있습니다.",
      en: "A **unique UUID stored in localStorage** is combined with the target (post/work) ID and SHA-256 hashed as `commenter_hash`, saved with the comment. On the same browser, hash comparison enables **automatic recognition without password input**. On different devices, existing **bcrypt password_hash verification** applies. Admins manage all comments via Supabase Auth session.",
    },
    keyInsight: {
      ko: "인증 방식은 '보안 수준'이 아니라 **'사용 맥락'에 맞춰야** 합니다. 같은 브라우저에서는 편의성(자동 인식)을, 다른 기기에서는 보안(비밀번호)을 적용하여, **하나의 시스템에서 두 가지 인증 경로**를 제공합니다.",
      en: "Authentication should match the **'usage context'**, not just 'security level'. Same browser gets convenience (auto-recognition), different devices get security (password) — **two auth paths in one system**.",
    },
    comparisons: [
      {
        label: { ko: "비회원 인증 방식 비교", en: "Guest authentication comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "비밀번호만", en: "Password only" },
          { ko: "쿠키/세션", en: "Cookie/Session" },
          { ko: "Hash 이중 인증 (채택)", en: "Dual Hash Auth (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "같은 브라우저", en: "Same browser" }, { ko: "매번 입력", en: "Enter every time" }, { ko: "자동 인식", en: "Auto-recognized" }, { ko: "자동 인식", en: "Auto-recognized" }] },
          { cells: [{ ko: "다른 기기", en: "Different device" }, { ko: "비밀번호 입력", en: "Enter password" }, { ko: "✗ 인식 불가", en: "✗ Unrecognizable" }, { ko: "비밀번호 입력", en: "Enter password" }] },
          { cells: [{ ko: "개인정보 수집", en: "PII collected" }, { ko: "없음", en: "None" }, { ko: "세션 데이터", en: "Session data" }, { ko: "없음 (해시만)", en: "None (hash only)" }] },
          { cells: [{ ko: "서버 부담", en: "Server load" }, { ko: "bcrypt 비교", en: "bcrypt compare" }, { ko: "세션 저장소", en: "Session store" }, { ko: "SHA-256 비교", en: "SHA-256 compare" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "△ 불편함", en: "△ Inconvenient" }, { ko: "✗ 크로스 디바이스 불가", en: "✗ No cross-device" }, { ko: "✓ 편의 + 보안", en: "✓ Convenience + security" }], highlight: true },
        ],
        description: {
          ko: "쿠키/세션 방식은 같은 브라우저에서는 편리하지만, **다른 기기에서는 본인 확인이 불가능**합니다. 비밀번호만으로는 매번 입력하는 불편함이 있습니다. Hash 이중 인증은 **같은 브라우저에서는 자동(SHA-256), 다른 기기에서는 수동(bcrypt)**으로 동작하여, 두 시나리오를 모두 커버합니다. 해시만 저장하므로 **개인정보 이슈도 없습니다**.",
          en: "Cookie/session is convenient on the same browser but **can't verify identity on other devices**. Password-only requires re-entry every time. Dual hash auth works **automatically (SHA-256) on the same browser, manually (bcrypt) on other devices**, covering both scenarios. Only hashes are stored, so **no PII concerns**.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: { ko: "에디터 자동저장 주기가 너무 잦아 리비전이 의미 없이 누적됨", en: "Auto-save Interval Too Frequent — Revisions Accumulated Meaninglessly" },
    definition: {
      ko: "자동저장이 **5초마다 실행**되어 한 시간 작업 시 수십 개의 리비전이 쌓였고, 대부분 의미 없는 변경이라 **되돌아갈 시점을 찾기 어려웠습니다**.",
      en: "Auto-save fired **every 5 seconds**, generating dozens of revisions per hour — most were trivial changes, making it **hard to find meaningful restore points**.",
    },
    cause: {
      ko: "편집 중 변경사항을 보호하기 위해 **5초 debounce**로 자동저장을 구현했습니다. 그런데 5초는 지나치게 짧은 주기여서, **사소한 편집마다 저장이 트리거**되었습니다. 한 시간 작업하면 리비전이 수십 개 쌓였고 대부분 '단어 하나 추가', '오타 수정' 수준으로, 정작 **되돌아가고 싶은 시점을 찾기가 어려웠습니다**.",
      en: "Auto-save was implemented with a **5-second debounce** to protect edits. But 5 seconds was far too short — **every minor edit triggered a save**. After an hour of writing, dozens of revisions piled up, most just 'added a word' or 'fixed a typo', making it **hard to find the checkpoint you actually wanted**.",
    },
    solution: {
      ko: "다른 서비스들과 비교해 이 프로젝트에 맞는 방식을 정했습니다. diff 방식(변경분만 저장)은 구현이 복잡하고, 단일 사용자·리비전 50개 제한 규모에서는 이득이 없다고 판단해 제외했습니다. 저장 주기를 **30초로 늘리고**, 타이머가 울리기 전에 페이지를 이탈해도 마지막 내용이 날아가지 않도록 **페이지 이탈 시 강제 저장**도 추가했습니다. 페이지를 떠나는 방식이 두 가지이므로 각각 다른 API를 사용합니다.\n- **브라우저 닫기·새로고침**: 탭 자체가 사라지면 진행 중인 fetch도 함께 취소되므로, 브라우저에 전송을 위임하는 `navigator.sendBeacon`을 사용합니다.\n- **Next.js SPA 라우팅**: 브라우저 탭은 그대로이고 자바스크립트가 화면을 교체하는 것이라(예: 에디터에서 네비게이션 링크를 눌러 다른 페이지로 이동) `beforeunload`가 발생하지 않습니다. 대신 에디터 컴포넌트의 언마운트 시점에 `fetch({ keepalive: true })`로 전송하면, 컴포넌트가 사라져도 요청이 중단되지 않습니다.\n\n에디터에 다시 진입하면 자동 저장된 초안이 있는지 확인하고, **확인 팝업을 띄워 사용자가 불러올지 무시할지 선택**할 수 있도록 했습니다. 이전에는 자동으로 복원했지만, 의도하지 않은 복원이 오히려 혼란을 줄 수 있어 **명시적 확인 후 복원**으로 변경했습니다.",
      en: "Compared with other services to find the right approach. A diff-based approach (saving only changes) was rejected — too complex, no real benefit at single-user scale with a 50-revision cap. Changed to **30-second debounce** + **forced save on page leave**. Two different APIs handle leave-saves depending on how the user leaves:\n- **Browser close/refresh**: The tab itself is destroyed, canceling any in-flight fetch — `navigator.sendBeacon` delegates the send to the browser so it completes even after the tab is gone.\n- **Next.js SPA routing**: The browser tab stays open — JavaScript swaps the view (e.g., clicking a nav link from the editor to another page), so `beforeunload` never fires. Instead, `fetch({ keepalive: true })` is called during the editor component's unmount cleanup, keeping the request alive even after the component is gone.\n\nWhen re-entering the editor, a **confirmation popup asks whether to restore** the auto-saved draft or discard it. Previously drafts were restored automatically, but this could cause confusion — so it was changed to **explicit confirmation before restore**.",
    },
    keyInsight: {
      ko: "저장이 잦다고 좋은 게 아닙니다. **주기가 짧을수록 저장 기록에 잡음이 쌓여** 정작 필요한 시점을 찾기 어렵습니다. 주기적 저장에만 기대면 마지막 편집이 날아갈 수 있으므로, `beforeunload`와 언마운트 cleanup을 **반드시 함께** 구현해야 합니다.",
      en: "More saves aren't always better. **Shorter intervals increase noise in history**, making it hard to find meaningful checkpoints. Timer-based saves alone can **miss the final edit** on page leave — `beforeunload` and unmount cleanup must be implemented alongside.",
    },
    comparisons: [
      {
        label: { ko: "서비스별 자동저장 방식 비교", en: "Auto-save comparison by service" },
        headers: [
          { ko: "서비스", en: "Service" },
          { ko: "저장 주기", en: "Interval" },
          { ko: "저장 방식", en: "Method" },
          { ko: "비용", en: "Cost" },
        ],
        rows: [
          { cells: [{ ko: "Google Docs", en: "Google Docs" }, { ko: "~초 단위 (서버)", en: "~seconds (server)" }, { ko: "OT diff (변경분만)", en: "OT diff (delta only)" }, { ko: "매우 낮음", en: "Very low" }] },
          { cells: [{ ko: "Notion", en: "Notion" }, { ko: "즉시", en: "Immediate" }, { ko: "patch (변경분만)", en: "Patch (delta only)" }, { ko: "낮음", en: "Low" }] },
          { cells: [{ ko: "WordPress", en: "WordPress" }, { ko: "60초", en: "60s" }, { ko: "전체 스냅샷", en: "Full snapshot" }, { ko: "중간", en: "Medium" }] },
          { cells: [{ ko: "이 프로젝트 (이전)", en: "This project (before)" }, { ko: "5초", en: "5s" }, { ko: "전체 스냅샷", en: "Full snapshot" }, { ko: "⚠ 과다", en: "⚠ Excessive" }] },
          { cells: [{ ko: "이 프로젝트 (현재)", en: "This project (now)" }, { ko: "30초", en: "30s" }, { ko: "전체 스냅샷", en: "Full snapshot" }, { ko: "적절 ✓", en: "Appropriate ✓" }], highlight: true },
        ],
        description: {
          ko: "Google Docs와 Notion이 짧은 주기로도 비용이 낮은 건 **변경분(diff)만 저장**하기 때문입니다. 반면 WordPress처럼 전체 스냅샷을 저장하는 방식은 주기가 길어야 비용이 적절해집니다. 이 프로젝트는 전체 스냅샷 방식을 쓰면서 5초 주기를 유지하고 있었는데, 이는 '짧은 주기 + 큰 저장 단위'가 겹친 구조로 **가장 비효율적인 조합**이었습니다.",
          en: "Google Docs and Notion stay low-cost even at short intervals because they **only save the diff (changes)**. Full-snapshot approaches like WordPress need longer intervals to keep costs reasonable. This project was using full snapshots with a 5-second interval — **the worst of both worlds**: short interval combined with large save size.",
        },
      } satisfies ComparisonTable,
      {
        label: { ko: "Snapshot vs Diff — 전체를 저장할까, 바뀐 부분만 저장할까?", en: "Snapshot vs Diff — save everything, or just what changed?" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "Snapshot (채택)", en: "Snapshot (adopted)" },
          { ko: "Diff (미채택)", en: "Diff (rejected)" },
        ],
        rows: [
          { cells: [{ ko: "구현 복잡도", en: "Implementation" }, { ko: "낮음", en: "Low" }, { ko: "높음", en: "High" }] },
          { cells: [{ ko: "복원 방식", en: "Restore" }, { ko: "즉시 (해당 스냅샷으로)", en: "Instant (apply snapshot)" }, { ko: "전체 재계산 필요", en: "Full replay needed" }] },
          { cells: [{ ko: "저장 용량", en: "Storage" }, { ko: "~50KB × 50개 ≒ 2.5MB", en: "~50KB × 50 ≒ 2.5MB" }, { ko: "작음", en: "Small" }] },
          { cells: [{ ko: "다중 사용자 충돌", en: "Multi-user conflicts" }, { ko: "어려움", en: "Difficult" }, { ko: "적합", en: "Suitable" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✓ 단일 사용자, 소규모", en: "✓ Single-user, small scale" }, { ko: "✗ 복잡도 과다", en: "✗ Over-engineered" }], highlight: true },
        ],
        description: {
          ko: "Diff 방식은 Google Docs처럼 **여러 명이 동시에 편집**하거나 변경 이력이 매우 세밀해야 하는 경우에 빛을 발합니다. 하지만 이 프로젝트는 관리자 혼자 사용하는 단일 사용자 환경이고, 리비전은 최대 50개로 제한되어 있어 전체 저장 용량이 약 2.5MB 수준입니다. diff 방식을 구현하면 복원 시 전체 이력을 재계산해야 하고, 코드 복잡도도 크게 올라갑니다. **이 규모에서는 단순한 스냅샷 방식이 더 실용적**입니다.",
          en: "Diff works best when **multiple people edit simultaneously** or when very granular change tracking is needed — like Google Docs. But this project is single-user, with a 50-revision cap that keeps total storage around 2.5MB. Implementing diff would require replaying the full history on restore, and adds significant code complexity. **At this scale, a simple snapshot approach is more practical**.",
        },
      } satisfies ComparisonTable,
    ],
    diagrams: [
      {
        title: { ko: "주기적 자동저장 (30s debounce)", en: "Periodic Auto-save (30s debounce)" },
        nodes: [
          { id: "start",     type: "start",    row: 0, col: 0, label: { ko: "폼 변경",            en: "Form Change" } },
          { id: "init",      type: "decision", row: 1, col: 0, label: { ko: "초기\n스킵?",         en: "Init\nSkip?" } },
          { id: "initskip",  type: "action",   row: 1, col: 1, label: { ko: "스킵\n(플래그 해제)", en: "Skip\n(reset flag)" } },
          { id: "timer",     type: "action",   row: 2, col: 0, label: { ko: "30s 타이머\n리셋",    en: "Reset 30s\ntimer" } },
          { id: "busy",      type: "decision", row: 3, col: 0, label: { ko: "저장 중 /\n타이틀 없음?", en: "Busy /\nNo title?" } },
          { id: "busyskip",  type: "end",      row: 3, col: 1, label: { ko: "무시",               en: "skip" } },
          { id: "save",      type: "action",   row: 4, col: 0, label: { ko: "saveRevision()\n해시 갱신", en: "saveRevision()\nupdate hash" } },
          { id: "end",       type: "end",      row: 5, col: 0, label: { ko: "DB 저장 ✓",          en: "Saved to DB ✓" } },
        ],
        edges: [
          { from: "start",    to: "init" },
          { from: "init",     to: "initskip", label: "Yes" },
          { from: "init",     to: "timer",    label: "No" },
          { from: "timer",    to: "busy" },
          { from: "busy",     to: "busyskip", label: "Yes" },
          { from: "busy",     to: "save",     label: "No" },
          { from: "save",     to: "end" },
        ],
      } satisfies TroubleshootingDiagram,
      {
        title: { ko: "페이지 이탈 시 강제 저장", en: "Forced Save on Page Leave" },
        nodes: [
          { id: "start",   type: "start",    row: 0, col: 0, label: { ko: "페이지 이탈",              en: "Page Leave" } },
          { id: "changed", type: "decision", row: 1, col: 0, label: { ko: "마지막 저장\n이후 변경?",  en: "Changed\nsince save?" } },
          { id: "skip",    type: "end",      row: 1, col: 1, label: { ko: "무시",                    en: "skip" } },
          { id: "save",    type: "action",   row: 2, col: 0, label: { ko: "sendBeacon /\nfetch keepalive", en: "sendBeacon /\nfetch keepalive" } },
          { id: "end",     type: "end",      row: 3, col: 0, label: { ko: "DB 저장 ✓",               en: "Saved ✓" } },
        ],
        edges: [
          { from: "start",   to: "changed" },
          { from: "changed", to: "skip", label: "No" },
          { from: "changed", to: "save", label: "Yes" },
          { from: "save",    to: "end" },
        ],
      } satisfies TroubleshootingDiagram,
    ],
  },

  /* ── Frontend / Performance ── */
  {
    section: { ko: "Frontend / Performance", en: "Frontend / Performance" },
    problem: { ko: "reCAPTCHA v3 초기 로드 성능 저하 (LCP 17.1s, TTI 18.2s)", en: "reCAPTCHA v3 Initial Load Performance Degradation (LCP 17.1s, TTI 18.2s)" },
    definition: {
      ko: "스팸 방지에 사용하는 reCAPTCHA 스크립트 (784KB) 가 페이지 로드 직후 즉시 다운로드되면서 초기 렌더링이 매우 느려졌습니다.\n\n수치로 보면 **LCP 17.1초, TTI 18.2초**. LCP 는 \"페이지에서 가장 큰 콘텐츠가 화면에 그려지기까지 걸린 시간\", TTI 는 \"사용자가 실제로 클릭이나 스크롤 같은 인터랙션을 할 수 있게 되기까지 걸린 시간\" 으로, \"빠른 페이지\" 의 기준은 LCP 2.5초 이하입니다.\n\n17초는 사용자가 \"이 사이트는 동작하지 않는다\" 고 판단하고 떠나기에 충분한 시간입니다.",
      en: "The reCAPTCHA spam-prevention script (784KB) downloaded immediately on page load, pushing **LCP (the time until the largest content is painted) to 17.1s and TTI (the time until users can actually interact) to 18.2s**.\n\nFor context, the \"fast\" threshold is LCP ≤ 2.5s — 17s is more than enough for a visitor to bounce.",
    },
    cause: {
      ko: "Google 공식 문서를 그대로 따라, 앱이 시작하는 시점에 reCAPTCHA 스크립트를 즉시 불러오도록 해 두었습니다.\n\n그런데 reCAPTCHA 가 실제로 필요한 순간은 **컨택트 폼에서 메시지를 전송할 때 단 한 번** 입니다. 페이지를 둘러보기만 하는 대부분의 방문자는 끝까지 한 번도 사용하지 않는 기능입니다. 그런 스크립트를 모든 방문자에게, 매번 784KB 씩 다운로드시키고 있었던 셈입니다.\n\n해당 스크립트의 다운로드와 실행이 **브라우저 메인 스레드를 한참 점유** 하면서, 정작 사용자에게 보여 줘야 할 콘텐츠 렌더링이 뒤로 밀린 것이 원인입니다.",
      en: "I followed Google's official docs and loaded the reCAPTCHA script at app start.\n\nThe catch: reCAPTCHA is **only needed when someone submits the contact form**. Most visitors who just browse around never use it — but the 784KB script was downloaded for everyone, every time.\n\nDownloading, parsing, and executing 784KB **occupied the main thread**, pushing the actual content rendering to the back of the queue.",
    },
    solution: {
      ko: "스크립트 로드 시점을 **\"앱 시작\" 이 아니라 \"사용자가 페이지에 처음 인터랙션한 순간 (클릭, 스크롤, 터치)\"** 으로 늦췄습니다.\n\n실제로 컨택트 폼까지 도달하는 사용자는 거의 항상 그 전에 한 번 이상 인터랙션을 하기 때문에, 메시지 전송 버튼을 누를 즈음이면 스크립트는 이미 백그라운드에서 로드가 끝난 상태가 됩니다. \"늦게 로드해서 폼이 한 박자 늦게 동작하지 않을까\" 라는 우려는 사실상 발생하지 않습니다.\n\n추가로, Google 서버와의 TCP/TLS 연결만 미리 열어 두는 **`<link rel=\"preconnect\">`** 를 head 에 추가했습니다. 이렇게 하면 실제 다운로드가 시작될 때 connection 셋업 시간만큼 더 빨라집니다.",
      en: "Moved the load trigger from **\"app start\"** to **\"the user's first interaction (click / scroll / touch)\"**.\n\nAnyone who actually reaches the contact form has almost certainly interacted at least once before — so by the time they click submit, the script is already loaded in the background.\n\nAdditionally added **`<link rel=\"preconnect\">`** to Google's server in the head, opening the TCP/TLS connection in advance so the eventual download starts faster.",
    },
    keyInsight: {
      ko: "외부 스크립트를 추가하기 전에 **\"이 스크립트가 페이지가 그려지기 전부터 필요한가?\"** 를 먼저 따져 보는 습관이 필요합니다.\n\n당장 사용하지 않는 무거운 파일을 즉시 로드하면, 정작 사용자가 봐야 할 콘텐츠가 수 초씩 뒤로 밀립니다. \"인터랙션 직전까지는 일단 미뤄 두기 (on-demand)\" 가 거의 항상 더 안전한 기본값입니다.\n\n참고로 reCAPTCHA 는 **컨택트 폼에만** 적용했습니다. 댓글은 이미 비밀번호 + IP 해시 이중 인증으로 보호되고 있어서, captcha 를 추가하면 **참여 허들만 높아지고 보안 이득은 한정적** 이라고 판단했습니다.",
      en: "Before adding any external script, ask **\"does this need to be loaded before the page even renders?\"**.\n\nLoading heavy files upfront that aren't immediately required pushes the actual content several seconds out. Deferring until \"the user is about to interact\" is almost always the better default.\n\nNote: reCAPTCHA was applied **only to the contact form**. Comments already use password + IP-hash dual auth, so adding captcha there **just raises the participation barrier** without much marginal benefit.",
    },
    comparisons: [
      {
        label: { ko: "외부 스크립트 로딩 전략 비교", en: "External script loading strategy comparison" },
        headers: [
          { ko: "전략", en: "Strategy" },
          { ko: "Eager (즉시)", en: "Eager (immediate)" },
          { ko: "Lazy (뷰포트)", en: "Lazy (viewport)" },
          { ko: "Interaction (채택)", en: "Interaction (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "로드 시점", en: "Load timing" }, { ko: "페이지 로드 즉시", en: "On page load" }, { ko: "요소가 뷰포트 진입", en: "Element enters viewport" }, { ko: "첫 클릭/터치", en: "First click/touch" }] },
          { cells: [{ ko: "초기 성능 영향", en: "Initial perf impact" }, { ko: "⚠ 높음 (784KB 블로킹)", en: "⚠ High (784KB blocking)" }, { ko: "중간", en: "Medium" }, { ko: "없음", en: "None" }] },
          { cells: [{ ko: "사용자 대기", en: "User wait time" }, { ko: "없음 (이미 로드)", en: "None (preloaded)" }, { ko: "짧음", en: "Short" }, { ko: "첫 인터랙션 시 짧은 지연", en: "Brief delay on first interaction" }] },
          { cells: [{ ko: "적합한 경우", en: "Best for" }, { ko: "즉시 필요한 스크립트", en: "Immediately needed scripts" }, { ko: "스크롤 후 필요", en: "Needed after scroll" }, { ko: "사용자 행동 후 필요", en: "Needed after user action" }] },
          { cells: [{ ko: "reCAPTCHA에 적합?", en: "Right for reCAPTCHA?" }, { ko: "✗ LCP 17s 유발", en: "✗ Causes 17s LCP" }, { ko: "△ 컨택트 드로어 열기 전 불필요", en: "△ Unnecessary before contact drawer" }, { ko: "✓ 컨택트 폼 제출 시점에만 필요", en: "✓ Only needed on contact form submit" }], highlight: true },
        ],
        description: {
          ko: "reCAPTCHA는 **컨택트 폼 제출 시에만 필요**합니다. 페이지를 읽기만 하는 대다수 방문자에게는 불필요한 784KB입니다. Lazy 방식은 폼 영역이 뷰포트에 들어올 때 로드하지만, 스크롤만으로 트리거되어 폼을 사용할 의도 없는 사용자에게도 로드됩니다. **Interaction 방식**은 실제 클릭/터치가 발생한 시점에만 로드하므로, **불필요한 로드를 완전히 제거**합니다. preconnect로 DNS/TLS 핸드셰이크를 미리 완료해 두면 실제 로드 시 체감 지연도 최소화됩니다.",
          en: "reCAPTCHA is **only needed when submitting the contact form**. For the majority of visitors who just read, it's an unnecessary 784KB. Lazy loading triggers on viewport entry, loading even for users with no intent to submit a form. **Interaction-based loading** only fires on actual click/touch, **completely eliminating unnecessary loads**. Preconnect completes DNS/TLS handshake early, minimizing perceived delay when actually loaded.",
        },
      } satisfies ComparisonTable,
    ],
    images: [
      {
        // 홈 페이지 — reCAPTCHA 가 처음 로드되던 위치
        src: "/images/screenshots/pc/home-light.png",
        alt: { ko: "홈 페이지 — reCAPTCHA 가 영향을 주던 LCP 측정 대상 컨텐츠", en: "Home page — LCP-target content that reCAPTCHA was blocking" },
        caption: { ko: "이 컨텐츠가 그려지기 전에 784KB reCAPTCHA 가 먼저 로드되던 구조", en: "This content was blocked behind 784KB of reCAPTCHA loading first" },
      },
      {
        alt: { ko: "Lighthouse 결과 — 수정 전(LCP 17.1s) / 수정 후(LCP < 2.5s)", en: "Lighthouse — Before (LCP 17.1s) / After (LCP < 2.5s)" },
        placeholderKeyword: "Lighthouse Performance 측정 결과 비교 (수정 전 LCP 17.1s vs 수정 후)",
      },
    ],
  },
  {
    problem: { ko: "mousemove마다 React 리렌더 (60fps 성능 저하)", en: "React Re-render on Every mousemove (60fps Performance Degradation)" },
    definition: {
      ko: "홈 Works 섹션에서 마우스를 움직이면 원형 아이템들이 밀려나는 반발 효과가 있는데, 반발 오프셋을 `useState`로 관리하면서 mousemove마다 **25개 이상의 그리드 아이템이 통째로 리렌더**되어 마우스를 빠르게 움직일수록 **애니메이션이 버벅거리고 프레임이 끊겼습니다**.",
      en: "The Works section on the home page has a magnetic repulsion effect where circular items push away from the cursor. Repulsion offsets were managed with `useState`, triggering a **full re-render of 25+ grid items on every mousemove** — the faster the mouse moved, the **more visible the stuttering and frame drops** became.",
    },
    cause: {
      ko: "Works 섹션의 마우스 반발 효과가 **mousemove마다 React state를 업데이트**하고 있었습니다. 마우스를 움직일 때마다 **초당 60번의 setState 호출**이 발생하고, 매번 WorksSection 전체(25개 이상의 그리드 아이템)가 **다시 그려졌습니다**. 결과적으로 마우스를 움직이는 내내 **렌더링 작업이 끊임없이 쌓여** 프레임이 밀렸습니다.",
      en: "The mouse repulsion effect in the Works section was **updating React state on every mousemove**. This caused **~60 setState calls per second**, each triggering a full re-render of WorksSection with 25+ grid items. The main thread stayed busy the entire time the mouse was moving.",
    },
    solution: {
      ko: "React state 대신 **useRef로 오프셋 값을 저장**하고, 별도의 **requestAnimationFrame 루프에서 lerp 보간 후 DOM의 style.transform을 직접 수정**하는 방식으로 변경했습니다. React는 이 변화를 전혀 인지하지 못하므로 **리렌더가 발생하지 않습니다**.",
      en: "Replaced React state with **useRef for offset storage** and a separate **requestAnimationFrame loop that applies lerp-smoothed values directly via style.transform**. React is completely unaware of these changes, so **zero re-renders occur**.",
    },
    keyInsight: {
      ko: "초당 수십 번 변하는 값(마우스 위치, 스크롤 오프셋 등)은 **React state로 관리하면 안 됩니다**. 화면에 반영만 하면 되는 값은 **ref + 직접 DOM 조작**이 훨씬 효율적입니다.",
      en: "Values that change dozens of times per second (mouse position, scroll offsets) **should never be React state**. When you only need visual output, **ref + direct DOM manipulation** is far more efficient.",
    },
    comparisons: [
      {
        label: { ko: "고빈도 업데이트 처리 방식 비교", en: "High-frequency update approach comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "useState", en: "useState" },
          { ko: "useMemo + throttle", en: "useMemo + throttle" },
          { ko: "useRef + RAF (채택)", en: "useRef + RAF (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "리렌더 횟수", en: "Re-renders" }, { ko: "~60/s", en: "~60/s" }, { ko: "~15/s (throttle)", en: "~15/s (throttle)" }, { ko: "0", en: "0" }] },
          { cells: [{ ko: "부드러움", en: "Smoothness" }, { ko: "프레임 드롭", en: "Frame drops" }, { ko: "끊김 있음", en: "Stuttery" }, { ko: "60fps 유지", en: "Smooth 60fps" }] },
          { cells: [{ ko: "React 생태계", en: "React ecosystem" }, { ko: "✓ 일반적", en: "✓ Idiomatic" }, { ko: "✓ 일반적", en: "✓ Idiomatic" }, { ko: "△ 탈출구 패턴", en: "△ Escape hatch" }] },
          { cells: [{ ko: "구현 복잡도", en: "Complexity" }, { ko: "낮음", en: "Low" }, { ko: "중간", en: "Medium" }, { ko: "중간", en: "Medium" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 60fps 불가능", en: "✗ Can't hit 60fps" }, { ko: "△ 끊김 체감됨", en: "△ Stutter noticeable" }, { ko: "✓ 부드러운 시각 효과", en: "✓ Smooth visual effect" }], highlight: true },
        ],
        description: {
          ko: "useState는 React의 일반적인 패턴이지만, **초당 60번 리렌더는 25개 그리드 아이템 전체를 다시 그리게** 합니다. throttle로 빈도를 줄여도 마우스 추적 같은 연속적 시각 효과에서는 **끊김이 체감**됩니다. useRef + RAF 방식은 React의 렌더 사이클을 완전히 우회하여 **DOM을 직접 조작**하므로, 리렌더 비용 없이 60fps를 유지할 수 있습니다. 이 패턴은 React 공식 문서에서도 **\"탈출구(escape hatch)\"**로 안내하는 정당한 최적화 기법입니다.",
          en: "useState is idiomatic React, but **60 re-renders/second forces all 25+ grid items to re-render**. Throttling reduces frequency but **stutter is still noticeable** in continuous visual effects like mouse tracking. useRef + RAF completely bypasses React's render cycle, **manipulating DOM directly** for zero re-render cost at 60fps. This pattern is acknowledged in React docs as a legitimate **\"escape hatch\"** optimization.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: { ko: "코드 블록 줄바꿈 토글 시 레이아웃이 갑자기 튐", en: "Layout Jumps When Toggling Code Block Line Wrap" },
    definition: {
      ko: "코드 블록의 줄바꿈을 토글하면 높이가 순간적으로 변하면서, **아래쪽 콘텐츠가 갑자기 밀려나는 레이아웃 시프트**가 발생했습니다.",
      en: "Toggling line wrap on code blocks caused an instant height change, producing a **layout shift that jolted content below**.",
    },
    cause: {
      ko: "블로그 포스트의 코드 블록에 **줄바꿈 토글 버튼**을 추가했습니다. `white-space: pre` → `pre-wrap` 전환 시 코드 블록의 높이가 변하면서, **아래쪽 콘텐츠가 갑자기 밀려나는 레이아웃 시프트**가 발생했습니다. CSS `transition`으로 `max-height`를 애니메이션하려 했지만, **최대 높이를 미리 알 수 없어** 값을 크게 잡으면 타이밍이 어긋나고, 작게 잡으면 잘리는 문제가 있었습니다.",
      en: "Added a **line-wrap toggle button** to blog code blocks. Switching `white-space: pre` → `pre-wrap` changed block height, causing **layout shift that pushed content below**. Tried CSS `transition` on `max-height`, but **the actual max height isn't known in advance** — set too high, timing feels wrong; too low, content clips.",
    },
    solution: {
      ko: "**FLIP(First-Last-Invert-Play) 기법**을 적용했습니다. 스타일 변경 전 높이를 측정(First)하고, 스타일을 바꾼 뒤 새 높이를 측정(Last)한 다음, **Web Animations API로 이전 높이 → 새 높이를 250ms 동안 애니메이션**합니다. React 상태를 거치지 않으므로 리렌더가 없고, 정확한 높이를 기반으로 동작하여 **어떤 코드 블록 길이에서도 자연스럽게 전환**됩니다.",
      en: "Applied the **FLIP (First-Last-Invert-Play) technique**. Measure height before style change (First), apply style and measure new height (Last), then **animate from old to new height over 250ms using Web Animations API**. No React re-renders involved, and since it's based on exact measurements, **transitions feel natural at any code block length**.",
    },
    keyInsight: {
      ko: "높이가 **동적으로 변하는 요소의 애니메이션에는 `max-height` 트릭보다 FLIP이 적합**합니다. 실제 높이를 측정한 뒤 애니메이션하므로 **타이밍이 정확**하고, Web Animations API는 React와 독립적이라 **리렌더 비용이 없습니다**.",
      en: "For animating **dynamically-sized elements, FLIP beats the `max-height` trick**. It measures actual heights before animating, ensuring **precise timing**, and Web Animations API runs independently of React with **zero re-render cost**.",
    },
    comparisons: [
      {
        label: { ko: "동적 높이 애니메이션 기법 비교", en: "Dynamic height animation technique comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "max-height 트릭", en: "max-height trick" },
          { ko: "CSS grid rows", en: "CSS grid rows" },
          { ko: "FLIP + WAAPI (채택)", en: "FLIP + WAAPI (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "높이 추정", en: "Height estimation" }, { ko: "임의 큰 값 필요", en: "Arbitrary large value" }, { ko: "0fr → 1fr", en: "0fr → 1fr" }, { ko: "실제 측정값 사용", en: "Uses measured value" }] },
          { cells: [{ ko: "타이밍 정확도", en: "Timing accuracy" }, { ko: "✗ 실제 높이와 불일치", en: "✗ Mismatch with actual" }, { ko: "△ 제한적", en: "△ Limited" }, { ko: "✓ 정확", en: "✓ Exact" }] },
          { cells: [{ ko: "콘텐츠 클리핑", en: "Content clipping" }, { ko: "값 작으면 잘림", en: "Clips if too small" }, { ko: "없음", en: "None" }, { ko: "없음", en: "None" }] },
          { cells: [{ ko: "리렌더 필요", en: "Re-render needed" }, { ko: "✗ (CSS only)", en: "✗ (CSS only)" }, { ko: "✗ (CSS only)", en: "✗ (CSS only)" }, { ko: "✗ (WAAPI)", en: "✗ (WAAPI)" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 코드 블록 높이 예측 불가", en: "✗ Code block height unpredictable" }, { ko: "△ 래퍼 요소 필요", en: "△ Wrapper element needed" }, { ko: "✓ 모든 높이에서 정확", en: "✓ Exact at any height" }], highlight: true },
        ],
        description: {
          ko: "`max-height` 트릭은 높이를 미리 알 수 있는 경우에만 유효합니다. 코드 블록은 **내용 길이에 따라 높이가 크게 달라지므로** 임의 값을 설정하면 타이밍이 맞지 않습니다. CSS `grid-template-rows: 0fr → 1fr` 방식은 래퍼 요소가 필요하고, 기존 마크다운 렌더러의 DOM 구조를 변경해야 합니다. **FLIP은 변경 전후의 실제 높이를 측정**하므로 어떤 코드 블록에서도 정확하게 동작하며, Web Animations API(WAAPI)는 **메인 스레드와 별도로 실행**되어 성능 영향이 없습니다.",
          en: "`max-height` only works when the target height is known in advance. Code blocks **vary dramatically in height by content length**, making arbitrary values unreliable. CSS `grid-template-rows: 0fr → 1fr` requires wrapper elements and changing the existing markdown renderer's DOM structure. **FLIP measures actual before/after heights**, working accurately for any code block, and Web Animations API (WAAPI) runs **off the main thread** with zero performance impact.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: { ko: "커스텀 커서의 무거운 hit-test가 가벼운 위치 보간을 함께 느리게 만듦", en: "Heavy Cursor Hit-Test Dragging Down Lightweight Position Interpolation" },
    definition: {
      ko: "이 사이트는 OS 기본 커서 대신, 마우스를 부드럽게 따라다니는 작은 원 형태의 커스텀 커서를 직접 그립니다.\n\n이 커서는 1초에 60번 다시 그려지는 동안 (60fps) 두 가지 일을 동시에 처리합니다.\n\n**① 위치 부드럽게 따라가기** — 실제 마우스 위치를 향해 한 프레임마다 조금씩 이동. 마우스가 갑자기 멀리 움직여도 커서가 \"여유 있게 따라가는\" 듯한 효과를 만드는 부분입니다.\n\n**② 마우스 아래 요소 판별** — 현재 커서가 클릭 가능한 버튼 위인지, 텍스트 입력 영역인지, 비활성 영역인지, 끌 수 있는 영역인지를 확인하여 커서 모양을 그에 맞게 바꾸는 부분입니다.\n\n두 작업이 매 프레임 (16ms 마다) 같은 함수 안에서 함께 실행되다 보니, **상대적으로 무거운 ② 가 가벼운 ① 까지 함께 늦춰 커서가 끊기듯 움직이는 (stutter) 현상** 이 발생했습니다.",
      en: "Instead of the OS cursor, the site renders a custom cursor (a small circle that follows the mouse). 60 times per second (60fps), it handles two things together:\n\n**① Position interpolation** — moving the cursor a tiny step toward the actual mouse position each frame. This produces the \"the cursor eases to catch up\" feel even when the mouse moves abruptly.\n\n**② Detecting what's beneath the cursor** — checking whether the cursor is over a clickable button / a text input / a disabled area / a draggable area, and switching the cursor shape accordingly.\n\nBoth ran every frame (≈ 16ms each) inside the same function loop, so the **heavy ② dragged down the light ①, producing visible stutter** in the cursor's motion.",
    },
    cause: {
      ko: "② 의 \"마우스 아래 요소 판별\" 을 위해 매 프레임마다 **`elementsFromPoint(x, y)`** 라는 브라우저 API 를 호출했습니다. 이 함수는 주어진 좌표 위에 쌓여 있는 모든 HTML 요소를 z-index 역순으로 반환합니다.\n\n그런데 복잡한 레이아웃에서는 한 좌표 위에 수십~수백 개의 요소가 겹쳐 있을 수 있습니다 (배경, wrapper, 카드, 텍스트, 인터랙션 영역 등이 모두 쌓여 있기 때문입니다). 매 프레임 그 목록을 모두 훑다 보니, **한 프레임 16ms 예산 중 몇 ms 가 ② 에만 소비** 되었습니다.\n\n① 의 위치 계산은 코드 자체는 매우 가볍지만, 같은 루프에 묶여 있어 ② 가 끝날 때까지 대기하느라 함께 지연되었습니다. 결과적으로 둘 다 동시에 느려진 셈입니다.",
      en: "For ② (\"detect what's beneath the cursor\"), the loop called **`elementsFromPoint(x, y)`** every frame. This browser API returns every HTML element stacked at the given coordinate, ordered by z-index.\n\nIn a complex layout, dozens or even hundreds of elements can overlap at a single point (background, wrapper, card, text, interactive surface — they're all stacked). Walking that list every frame consumed **several ms out of each 16ms frame budget**.\n\n① itself is lightweight code, but coupled to the same loop, it had to wait for ② to finish — so both ended up slow at the same time.",
    },
    solution: {
      ko: "두 작업을 **서로 다른 주기로 분리** 했습니다.\n\n**① 위치 따라가기** 는 그대로 매 프레임 (60fps) 실행 — 부드러움 유지.\n\n**② 요소 판별** 은 60ms 간격으로 한 번만 실행하도록 제한 (이 패턴을 \"throttle\" 이라고 합니다 — 자주 호출되는 함수를 일정 시간에 한 번씩만 실행되게 제한하는 방식). 1초에 60번이 아니라 약 16번만 실행되므로 한 프레임당 비용이 거의 0 에 수렴합니다.\n\n② 가 60ms (4 프레임 정도) 늦게 반응하지만, 사람 눈에 4 프레임 정도의 지연은 거의 \"즉시\" 처럼 느껴집니다. 클릭 가능한 버튼에 마우스를 올렸을 때 모양이 \"바로\" 바뀌는 것처럼 보입니다. 반면 ① (위치) 은 한 프레임만 늦어도 stutter 가 즉시 눈에 띄기 때문에, **이쪽만 매 프레임을 사수한 것이 핵심** 입니다.\n\n참고로 터치 기기는 애초에 마우스가 없으므로, 커스텀 커서 자체를 비활성화합니다.",
      en: "**Decoupled the two tasks across different cadences**:\n\n**① Position interpolation** still runs every frame (60fps) — keeping the smoothness.\n\n**② Element detection** runs only once every 60ms (this pattern is called \"throttle\" — capping a frequently-called function to run at a fixed interval). About 16 calls/sec instead of 60, so its per-frame cost is effectively zero.\n\nDelaying ② means cursor-shape changes lag by 60ms (≈ 4 frames), but to humans that delay is essentially \"instant\" — when you hover a button, the shape still appears to update immediately. ①, on the other hand, shows visible stutter on a single late frame, so **only that one had to stay strict 60fps**.\n\nNote: touch devices don't have a mouse to begin with, so the entire custom cursor is disabled there.",
    },
    keyInsight: {
      ko: "타이트한 루프 하나에 비용이 다른 두 작업을 함께 묶어 두면, **무거운 쪽이 가벼운 쪽까지 같이 끌어내립니다.**\n\n해결의 출발점은 \"이 작업이 정말 매 프레임 필요한가?\" 라고 한 번 의심해 보는 것입니다.\n\n위치처럼 한 프레임만 늦어도 사람 눈에 즉시 보이는 작업은 **매 프레임 실행 (high-frequency)**, 요소 판별처럼 약간 늦어도 사람이 눈치채지 못하는 작업은 **빈도를 낮춰 분리 (throttle / debounce)** 하는 것이 좋습니다. 같은 함수 안의 작업이라도 비용과 \"체감 속도\" 에 맞춰 주기를 다르게 가져가야 끊기지 않습니다.",
      en: "When you couple two tasks of different costs in a single tight loop, **the heavy one drags the light one down with it**.\n\nStart by asking: \"does this really need to run every frame?\".\n\nWork like position updates — where a single late frame is immediately visible — needs **per-frame execution (high-frequency)**. Work like element detection — where a small delay is imperceptible — should be **separated to a lower frequency (throttle / debounce)**. Tasks even inside the same function should be cadenced by cost and perceptual sensitivity to stay smooth.",
    },
    comparisons: [
      {
        label: { ko: "커서 상태 감지 전략 비교", en: "Cursor state detection strategy comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "매 프레임 hit-test", en: "Per-frame hit-test" },
          { ko: "CSS :hover 위임", en: "CSS :hover delegation" },
          { ko: "디바운스 분리 (채택)", en: "Debounced separation (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "호출 빈도", en: "Call frequency" }, { ko: "~60/s", en: "~60/s" }, { ko: "이벤트 기반", en: "Event-driven" }, { ko: "~16/s (60ms)", en: "~16/s (60ms)" }] },
          { cells: [{ ko: "DOM 탐색 비용", en: "DOM traversal cost" }, { ko: "⚠ 매 프레임", en: "⚠ Every frame" }, { ko: "없음", en: "None" }, { ko: "프레임당 0~1회", en: "0-1 per frame" }] },
          { cells: [{ ko: "커서 위치 부드러움", en: "Cursor smoothness" }, { ko: "느려질 수 있음", en: "Can degrade" }, { ko: "영향 없음", en: "No impact" }, { ko: "항상 60fps", en: "Always 60fps" }] },
          { cells: [{ ko: "커스텀 커서 모양", en: "Custom cursor shapes" }, { ko: "✓ 다양", en: "✓ Multiple" }, { ko: "✗ 제한적", en: "✗ Limited" }, { ko: "✓ 다양", en: "✓ Multiple" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 복잡 레이아웃에서 병목", en: "✗ Bottleneck in complex layouts" }, { ko: "✗ 커서 모양 커스텀 불가", en: "✗ Can't customize cursor shapes" }, { ko: "✓ 성능 + 유연성", en: "✓ Performance + flexibility" }], highlight: true },
        ],
        description: {
          ko: "CSS `:hover`는 브라우저가 최적화하지만, **커서 모양을 data-attribute 기반으로 5종류(grab, pointer, text, disabled, default) 전환**하려면 JS가 필요합니다. 매 프레임 `elementsFromPoint()`는 정확하지만 **About 페이지처럼 중첩 요소가 많은 레이아웃에서 수백 개 요소를 탐색**합니다. 60ms 디바운스로 분리하면 호출 횟수를 **75% 줄이면서도** 커서 모양 변화의 지연(최대 60ms)은 **사람 눈에 감지되지 않습니다**.",
          en: "CSS `:hover` is browser-optimized, but **switching cursor shapes among 5 types (grab, pointer, text, disabled, default) based on data-attributes** requires JS. Per-frame `elementsFromPoint()` is accurate but **traverses hundreds of elements in nested layouts like the About page**. A 60ms debounce reduces calls by **75%** while the cursor shape delay (max 60ms) is **imperceptible to humans**.",
        },
      } satisfies ComparisonTable,
    ],
    images: [
      {
        // 모션/속도 abstract — 60fps stutter 컨셉
        src: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&h=750&fit=crop",
        alt: { ko: "모션 블러 — 매 프레임 부드러움이 깨지는 stutter 컨셉", en: "Motion blur — concept of frame stutter" },
        caption: { ko: "한 프레임 늦으면 사람 눈에 즉시 보임", en: "A single late frame is immediately visible" },
      },
    ],
  },
  {
    problem: {
      ko: "커스텀 RichTextEditor의 기능 확장 한계",
      en: "Custom RichTextEditor Hitting Feature Extension Limits",
    },
    definition: {
      ko: "직접 구현한 RichTextEditor(textarea + 마크다운 프리뷰)는 **인라인 서식 미리보기 불가, 구조화된 콘텐츠 모델 부재, 테이블·수식·임베드 등 기능 추가가 극도로 어려운** 상태였습니다.",
      en: "The custom-built RichTextEditor (textarea + markdown preview) had **no inline formatting preview, no structured content model, and adding features like tables, math, and embeds was extremely difficult**.",
    },
    cause: {
      ko: "에디터가 **단순 textarea에 마크다운 렌더링을 붙인 구조**였기 때문에, 새로운 기능(테이블, 수식, 코드 블록, 이미지 등)을 추가할 때마다 **커스텀 파싱/렌더링 로직을 직접 구현**해야 했습니다. 각 기능이 독립적인 파싱 규칙을 필요로 하면서 **코드가 취약해지고 유지보수 비용이 누적**되었습니다. 결국 WYSIWYG 프레임워크가 이미 해결한 문제의 **80%를 직접 재구현**하고 있는 상황이었습니다.",
      en: "The editor was built as a **simple textarea with markdown rendering on preview**. Every new feature (tables, math, code blocks, images) required **custom parsing and rendering logic from scratch**. Each feature needed independent parsing rules, making the **codebase fragile and accumulating maintenance costs**. Ultimately, we were **reimplementing 80% of what WYSIWYG frameworks already solve**.",
    },
    solution: {
      ko: "**Plate.js(Slate.js 기반)**로 마이그레이션했습니다. 구조화된 문서 모델, 플러그인 아키텍처, 인라인 WYSIWYG 편집을 제공합니다. 기존 RichTextEditor의 CSS Module은 **공유 스타일로 유지**하고, 수식(KaTeX), 코드 블록(highlight.js), 테이블, 이미지, 임베드용 **커스텀 플러그인**을 구현했습니다.",
      en: "Migrated to **Plate.js (built on Slate.js)** — providing a structured document model, plugin architecture, and inline WYSIWYG editing. Kept the old RichTextEditor CSS module as **shared styles**. Built **custom plugins** for math (KaTeX), code blocks (highlight.js), tables, images, and embeds.",
    },
    keyInsight: {
      ko: "전형적인 **\"Build vs Buy\" 의사결정** 문제입니다. 커스텀 솔루션이 성숙한 프레임워크가 제공하는 기능의 80%를 재구현하고 있다면, **마이그레이션 비용이 커스텀 접근법의 지속적 유지보수 비용보다 낮습니다**.",
      en: "A classic **\"Build vs Buy\" decision** — when the custom solution requires reimplementing 80% of what an established framework provides, the **migration cost is lower than the ongoing maintenance cost** of the custom approach.",
    },
    comparisons: [
      {
        label: { ko: "에디터 접근 방식 비교", en: "Editor approach comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "Custom textarea + MD", en: "Custom textarea + MD" },
          { ko: "Plate.js (채택)", en: "Plate.js (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "인라인 서식 미리보기", en: "Inline formatting preview" }, { ko: "✗ 프리뷰 탭 전환 필요", en: "✗ Requires preview tab switch" }, { ko: "✓ WYSIWYG", en: "✓ WYSIWYG" }] },
          { cells: [{ ko: "콘텐츠 모델", en: "Content model" }, { ko: "평문 문자열", en: "Plain text string" }, { ko: "구조화된 문서 트리", en: "Structured document tree" }] },
          { cells: [{ ko: "기능 추가 비용", en: "Feature addition cost" }, { ko: "⚠ 파싱/렌더링 직접 구현", en: "⚠ Custom parsing/rendering" }, { ko: "플러그인으로 확장", en: "Plugin-based extension" }] },
          { cells: [{ ko: "테이블·수식·임베드", en: "Tables, math, embeds" }, { ko: "✗ 각각 커스텀 파서 필요", en: "✗ Each needs custom parser" }, { ko: "✓ 플러그인 아키텍처", en: "✓ Plugin architecture" }] },
          { cells: [{ ko: "유지보수 비용", en: "Maintenance cost" }, { ko: "⚠ 기능 추가마다 누적", en: "⚠ Accumulates per feature" }, { ko: "프레임워크가 핵심 로직 관리", en: "Framework handles core logic" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 확장 한계 도달", en: "✗ Hit extension limits" }, { ko: "✓ 구조화된 편집 + 플러그인", en: "✓ Structured editing + plugins" }], highlight: true },
        ],
        description: {
          ko: "커스텀 textarea 에디터는 초기에는 빠르게 구현할 수 있지만, **기능이 늘어날수록 파싱 로직이 복잡해지고 버그가 늘어납니다**. Plate.js는 Slate.js의 구조화된 문서 모델 위에 플러그인 시스템을 제공하므로, 테이블·수식·코드 블록 같은 복잡한 기능도 **독립적인 플러그인으로 격리**하여 관리할 수 있습니다. 기존 RichTextEditor의 CSS Module을 공유 스타일로 유지하여 **마이그레이션 시 시각적 일관성을 보존**했습니다.",
          en: "A custom textarea editor is quick to build initially, but **parsing logic grows complex and bugs multiply as features increase**. Plate.js provides a plugin system on top of Slate.js's structured document model, allowing complex features like tables, math, and code blocks to be **isolated as independent plugins**. Keeping the existing RichTextEditor CSS module as shared styles **preserved visual consistency during migration**.",
        },
      } satisfies ComparisonTable,
    ],
  },
  {
    problem: {
      ko: "이미지 원본 무압축 업로드 — 10MB 초과 실패 + 네트워크 낭비",
      en: "Uncompressed Image Upload — 10MB Limit Failures + Network Waste",
    },
    definition: {
      ko: "사용자가 선택한 이미지 파일을 **압축 없이 원본 그대로** FormData에 담아 서버로 전송했습니다. 스마트폰 사진(5–15MB)이나 고해상도 스크린샷은 **용량 제한에 걸려 업로드가 거부**되고, 제한 이하인 파일도 **불필요하게 큰 원본이 그대로 전송**되어 네트워크와 스토리지를 낭비했습니다.",
      en: "Image files were sent to the server **as-is without compression** via FormData. Smartphone photos (5–15MB) and high-resolution screenshots **hit the size limit and failed**, while files under the limit **wasted network bandwidth and storage** by uploading unnecessarily large originals.",
    },
    cause: {
      ko: "업로드 함수에 **클라이언트 압축 로직이 없었고**, 서버에서 용량 초과를 거부하는 것이 유일한 방어선이었습니다. 사용자는 **왜 업로드가 실패하는지 모른 채** 다시 시도하거나 포기하는 상황이 발생했습니다.",
      en: "The upload function had **no client-side compression logic** — the server's size rejection was the only defense. Users would **retry or give up without understanding** why the upload failed.",
    },
    solution: {
      ko: "업로드 전에 **브라우저에서 단계적 압축 파이프라인**을 실행합니다:\n\n1. **SVG/GIF → 스킵** (벡터/애니메이션은 Canvas 변환 불가)\n2. **용량 이하 → 스킵** (이미 작은 파일은 건드리지 않음)\n3. **WebP 변환** (`canvas.toBlob`, quality 0.85)\n4. **해상도 축소** (긴 변 최대 2560px)\n5. **품질 단계적 하향** (0.05씩 감소, 최저 0.7)\n\n`compressImage()` 유틸리티를 **dynamic import**로 불러와 번들 크기에 영향을 주지 않습니다.",
      en: "A **step-by-step compression pipeline runs in the browser** before upload:\n\n1. **SVG/GIF → skip** (vector/animation can't be Canvas-converted)\n2. **Under limit → skip** (don't touch already-small files)\n3. **WebP conversion** (`canvas.toBlob`, quality 0.85)\n4. **Resolution reduction** (max 2560px on longest side)\n5. **Quality step-down** (decrease by 0.05, minimum 0.7)\n\nThe `compressImage()` utility is loaded via **dynamic import** to avoid affecting bundle size.",
    },
    keyInsight: {
      ko: "이미지 압축은 **서버보다 클라이언트에서 하는 것이 합리적**입니다. 서버 압축은 이미 **큰 원본이 네트워크를 타고 올라온 뒤** 처리하므로 대역폭 절감 효과가 없고, 서버 CPU도 소모합니다. 클라이언트 압축은 **전송 전에 크기를 줄여** 업로드 시간과 스토리지를 동시에 절약합니다. WebP는 AVIF보다 압축률은 낮지만 **브라우저 인코딩 속도가 3–10배 빠르고 지원률도 높아** 클라이언트 처리에 적합합니다.",
      en: "Image compression is **more effective on the client than the server**. Server compression processes files **after they've already traveled the network at full size**, offering no bandwidth savings while consuming server CPU. Client compression **reduces size before transmission**, saving both upload time and storage. WebP has lower compression ratios than AVIF but is **3–10× faster to encode in browsers with wider support**, making it ideal for client-side processing.",
    },
    comparisons: [
      {
        label: { ko: "이미지 업로드 전략 비교", en: "Image upload strategy comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "원본 전송", en: "Raw upload" },
          { ko: "서버 압축", en: "Server compression" },
          { ko: "클라이언트 압축 (채택)", en: "Client compression (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "네트워크 사용량", en: "Network usage" }, { ko: "⚠ 원본 크기 그대로", en: "⚠ Full original size" }, { ko: "⚠ 원본 크기 그대로", en: "⚠ Full original size" }, { ko: "✓ 압축 후 전송", en: "✓ Compressed before send" }] },
          { cells: [{ ko: "업로드 실패율", en: "Upload failure rate" }, { ko: "⚠ 10MB 초과 시 거부", en: "⚠ Rejected over 10MB" }, { ko: "수용 가능 (제한 완화)", en: "Acceptable (relaxed limit)" }, { ko: "✓ 거의 없음", en: "✓ Near zero" }] },
          { cells: [{ ko: "서버 부하", en: "Server load" }, { ko: "없음", en: "None" }, { ko: "⚠ CPU 사용", en: "⚠ CPU usage" }, { ko: "없음", en: "None" }] },
          { cells: [{ ko: "사용자 체감", en: "User experience" }, { ko: "큰 파일 = 긴 대기", en: "Large files = long wait" }, { ko: "업로드 느림 + 서버 처리 대기", en: "Slow upload + server processing" }, { ko: "✓ 빠른 업로드", en: "✓ Fast upload" }] },
          { cells: [{ ko: "구현 위치", en: "Implementation" }, { ko: "없음", en: "None" }, { ko: "API 라우트 (Sharp 등)", en: "API route (Sharp, etc.)" }, { ko: "Canvas API (브라우저)", en: "Canvas API (browser)" }] },
          { cells: [{ ko: "이 프로젝트에 적합?", en: "Right for this project?" }, { ko: "✗ 대용량 실패", en: "✗ Large files fail" }, { ko: "△ 대역폭 낭비", en: "△ Bandwidth waste" }, { ko: "✓ 전송 전 최적화", en: "✓ Optimized before transfer" }], highlight: true },
        ],
        description: {
          ko: "원본 전송은 용량 제한에 취약하고, 서버 압축은 이미 큰 파일이 네트워크를 거친 뒤 처리됩니다. **클라이언트 압축은 브라우저에서 WebP 변환 + 리사이즈 + 품질 조절을 수행한 뒤** 작아진 파일만 전송하므로, 업로드 실패를 방지하고 네트워크·스토리지를 동시에 절약합니다.",
          en: "Raw upload is vulnerable to size limits, and server compression only processes after the large file has already traversed the network. **Client compression performs WebP conversion + resize + quality adjustment in the browser**, sending only the reduced file — preventing upload failures while saving both network bandwidth and storage.",
        },
      } satisfies ComparisonTable,
    ],
    diagrams: [
      {
        title: { ko: "클라이언트 이미지 압축 파이프라인", en: "Client-side Image Compression Pipeline" },
        nodes: [
          { id: "start", type: "start", label: { ko: "이미지 선택", en: "Select image" }, row: 0, col: 0 },
          { id: "check_type", type: "decision", label: { ko: "SVG / GIF?", en: "SVG / GIF?" }, row: 1, col: 0 },
          { id: "skip", type: "end", label: { ko: "원본 그대로 업로드", en: "Upload original" }, row: 1, col: 1 },
          { id: "check_size", type: "decision", label: { ko: "용량 초과?", en: "Over limit?" }, row: 2, col: 0 },
          { id: "webp", type: "action", label: { ko: "WebP 변환 (q: 0.85)", en: "Convert WebP (q: 0.85)" }, row: 3, col: 0 },
          { id: "check_webp", type: "decision", label: { ko: "아직 큰가?", en: "Still over?" }, row: 4, col: 0 },
          { id: "resize", type: "action", label: { ko: "해상도 축소 (max 2560px)", en: "Resize (max 2560px)" }, row: 5, col: 0 },
          { id: "check_resize", type: "decision", label: { ko: "아직 큰가?", en: "Still over?" }, row: 6, col: 0 },
          { id: "quality", type: "action", label: { ko: "품질 하향 (0.05씩, 최저 0.7)", en: "Quality step-down (−0.05, min 0.7)" }, row: 7, col: 0 },
          { id: "done", type: "end", label: { ko: "압축 완료 → 업로드", en: "Compressed → Upload" }, row: 8, col: 0 },
        ],
        edges: [
          { from: "start", to: "check_type" },
          { from: "check_type", to: "skip", label: "Yes" },
          { from: "check_type", to: "check_size", label: "No" },
          { from: "check_size", to: "done", label: "No" },
          { from: "check_size", to: "webp", label: "Yes" },
          { from: "webp", to: "check_webp" },
          { from: "check_webp", to: "done", label: "No" },
          { from: "check_webp", to: "resize", label: "Yes" },
          { from: "resize", to: "check_resize" },
          { from: "check_resize", to: "done", label: "No" },
          { from: "check_resize", to: "quality", label: "Yes" },
          { from: "quality", to: "done" },
        ],
      } satisfies TroubleshootingDiagram,
    ],
  },

  /* ── CSS / Styling ── */
  {
    section: { ko: "CSS / Styling", en: "CSS / Styling" },
    problem: { ko: "글로벌 transition shorthand가 컴포넌트 전환 효과를 덮어씀", en: "Global Transition Shorthand Overriding Component Transitions" },
    definition: {
      ko: "다크 / 라이트 테마를 부드럽게 전환하려고 \"모든 요소의 배경색·글자색 변화에 transition\" 을 글로벌로 적용했더니, 의도치 않은 부작용이 따라왔습니다.\n\n컴포넌트마다 따로 만들어 둔 **\"토글 펼침 / 메뉴 슬라이드 / 모달 페이드인\" 같은 애니메이션이 전부 동작하지 않게** 되었습니다. 토글을 눌러도 부드럽게 펼쳐지지 않고 \"툭\" 한 번에 나타나며, 모달도 페이드인 없이 갑자기 표시되었습니다.",
      en: "To make dark ↔ light theme switching smooth, I applied a global transition (background/text color animation) to every element. The side effect: **every component-level animation — toggle expand, menu slide, fade-in — stopped working**.\n\nToggles popped open with no easing, modals appeared without their fade-in — everything was instant.",
    },
    cause: {
      ko: "글로벌 규칙은 `html[data-theme-ready] *` 에 걸려 있고, 이 선택자의 **specificity (CSS 우선순위 점수)** 는 `(0,1,1)` 입니다. 반면 컴포넌트의 단일 클래스 (예: `.modal`) 는 `(0,1,0)` 이라 항상 글로벌 규칙에 패배하는 구조였습니다.\n\n또한 `transition` 이 shorthand 속성이라는 점이 결정적이었습니다. 일반 속성처럼 \"내가 적은 것만 덮어쓰는\" 방식이 아니라, **해당 요소의 모든 transition 을 통째로 새로 쓰는 동작** 을 합니다. 즉, 글로벌에서 `transition: background-color 0.3s` 한 줄만 적어도 그 요소가 가진 `max-height transition`, `opacity transition`, `transform transition` 등 다른 transition 이 한꺼번에 모두 사라집니다.",
      en: "The global rule lives on `html[data-theme-ready] *`, whose **CSS specificity** is `(0,1,1)`. A component's single class (e.g., `.modal`) has `(0,1,0)` and always loses to it.\n\nWorse, `transition` is a shorthand — it doesn't \"add to\" existing transitions, it **fully replaces all transitions on that element**, including ones for properties not listed. The moment the global rule says `transition: background-color 0.3s`, the element's `max-height` transition, `opacity` transition, and `transform` transition all disappear.",
    },
    solution: {
      ko: "컴포넌트 쪽 transition 이 글로벌 규칙을 이길 수 있도록, **두 클래스를 묶은 복합 선택자 (specificity `(0,2,0)`)** 로 변경했습니다.\n\n예를 들어 `.modal { transition: opacity 0.3s }` 대신 **`.modalWrap .modal { transition: opacity 0.3s }`** 처럼 작성합니다. 이렇게 하면 specificity 가 `(0,2,0)` 이 되어 글로벌 `(0,1,1)` 보다 한 단계 높아지고, 글로벌 shorthand 를 안전하게 덮어씁니다.\n\n프로젝트의 CLAUDE.md 에도 이 패턴을 \"transition 이 동작하지 않을 때 가장 먼저 의심할 것\" 으로 명시하여, 동일한 함정을 반복하지 않도록 했습니다.",
      en: "Components now use a **two-class compound selector (specificity `(0,2,0)`)** to outweigh the global rule.\n\nFor example: `.modalWrap .modal { transition: opacity 0.3s }` instead of `.modal { transition: opacity 0.3s }`. `(0,2,0)` > `(0,1,1)`, so it safely overrides the global shorthand.\n\nThe project's CLAUDE.md documents this pattern as \"the first thing to suspect when a transition isn't running\", so the same trap doesn't get sprung again.",
    },
    keyInsight: {
      ko: "**CSS 의 `transition` 은 shorthand 속성이므로, 명시하지 않은 속성의 transition 까지 통째로 초기화** 됩니다. 일반 속성과 같은 \"덮어쓰기\" 가 아니라 \"교체\" 에 가깝습니다.\n\n전역에 `*` 선택자로 transition 을 적용할 때는 shorthand 대신 `transition-property` 와 `transition-duration` 을 개별 지정하거나, 영향받을 컴포넌트의 selector specificity 를 미리 한 단계 올려 두는 것이 안전합니다.",
      en: "**CSS `transition` is a shorthand — it doesn't \"override\", it \"replaces\"**, including transitions for properties you didn't list.\n\nWhen applying transitions globally with `*`, prefer `transition-property` + `transition-duration` written separately, or pre-emptively give affected components a higher-specificity selector so they can win.",
    },
    comparisons: [
      {
        label: { ko: "수정 전 / 수정 후", en: "Before / After" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "수정 전", en: "Before" },
          { ko: "수정 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "컴포넌트 선택자", en: "Component selector" }, { ko: ".modal (단일, 0,1,0)", en: ".modal (single, 0,1,0)" }, { ko: ".modalWrap .modal (복합, 0,2,0)", en: ".modalWrap .modal (compound, 0,2,0)" }] },
          { cells: [{ ko: "글로벌 vs 컴포넌트 우선순위", en: "Global vs component priority" }, { ko: "글로벌 (0,1,1) 이 이김", en: "Global (0,1,1) wins" }, { ko: "컴포넌트 (0,2,0) 이 이김", en: "Component (0,2,0) wins" }] },
          { cells: [{ ko: "토글/모달 펼침 효과", en: "Toggle / modal animation" }, { ko: "한 번에 \"툭\" 나타남", en: "Snaps in instantly" }, { ko: "부드럽게 펼쳐짐", en: "Smoothly expands" }] },
          { cells: [{ ko: "테마 전환 색상 transition", en: "Theme color transition" }, { ko: "정상 동작 (그쪽은 글로벌)", en: "OK (that's the global)" }, { ko: "정상 동작 (영향 없음)", en: "Still OK (untouched)" }] },
        ],
        description: {
          ko: "한 줄 요약: **컴포넌트 쪽에 \"부모 클래스 + 자식 클래스\" 두 단을 묶기만 해도** 글로벌 shorthand 를 안전하게 우회할 수 있습니다.",
          en: "TL;DR: **just chaining \"parent + child\" two classes on the component** safely bypasses the global shorthand.",
        },
      } satisfies ComparisonTable,
    ],
    images: [
      {
        // design-system 페이지에 컬러 토큰 + 모션 토큰이 보임 — transition 영향 받는 요소들
        src: "/images/screenshots/pc/design-system-light.png",
        alt: { ko: "Design system 페이지 — 컴포넌트 컬러 / 모션 토큰", en: "Design system page — component color / motion tokens" },
        caption: { ko: "테마 전환 transition 의 영향을 받는 디자인 토큰 시스템", en: "Design token system affected by theme transition" },
      },
    ],
  },
  {
    problem: { ko: "CSS Module 해시 충돌로 데스크톱 레이아웃 붕괴", en: "CSS Module Hash Collision Collapsing Desktop Layout" },
    definition: {
      ko: "데스크톱에서 `display: contents`가 적용되지 않아, About 페이지의 ProcessPanel **레이아웃이 완전히 무너졌습니다**.",
      en: "On desktop, `display: contents` failed to apply, **completely breaking** the ProcessPanel layout on the About page.",
    },
    cause: {
      ko: "About 페이지의 각 패널은 **공유 CSS Module과 로컬 CSS Module을 `{ ...shared, ...local }`로 병합**하여 사용합니다. ProcessPanel의 `.processBody`는 공유 CSS에서 `display: contents`로 정의되어 있었는데, 로컬 CSS에서 **모바일 미디어 쿼리 안에서만** 같은 이름의 클래스를 정의했습니다. 문제는 CSS Module이 **파일별로 다른 해시를 생성**하기 때문에, 스프레드 병합 시 **로컬 해시가 공유 해시를 덮어써** 데스크톱에서 `display: contents`가 적용되지 않은 것이었습니다.",
      en: "About page panels merge shared and local CSS Modules via `{ ...shared, ...local }`. ProcessPanel's `.processBody` was defined as `display: contents` in shared CSS, but local CSS only defined the **same class name inside a mobile media query**. Since CSS Modules generate **different hashes per file**, the spread merge caused the **local hash to override the shared hash**, losing `display: contents` on desktop.",
    },
    solution: {
      ko: "로컬 CSS 파일에 **미디어 쿼리 바깥에서도 `.processBody { display: contents }`를 명시적으로 선언**하여, 로컬 해시가 적용되더라도 데스크톱에서 올바른 스타일이 유지되도록 했습니다.",
      en: "Added an **explicit `.processBody { display: contents }` rule outside the media query** in the local CSS file, ensuring the correct style is maintained on desktop even when the local hash takes over.",
    },
    keyInsight: {
      ko: "`{ ...shared, ...local }` 패턴에서 **같은 클래스명이 양쪽에 존재하면 로컬이 무조건 이깁니다**. 로컬에서 미디어 쿼리 안에서만 정의해도 해시 자체가 달라지므로, **데스크톱 기본 스타일까지 로컬에 복제**해야 합니다.",
      en: "In the `{ ...shared, ...local }` pattern, **if the same class name exists in both, local always wins**. Even defining it only inside a media query changes the hash, so you must **replicate the desktop default style in local CSS** too.",
    },
  },
  {
    problem: { ko: "Richtext 게시물에서 코드 하이라이팅·줄바꿈 버튼이 사라짐", en: "Code Highlighting & Wrap Button Vanishing on Richtext Posts" },
    definition: {
      ko: "Plate 에디터로 작성한 richtext 게시물의 코드블록에서 **구문 하이라이팅과 줄바꿈/스크롤 토글 버튼이 표시되지 않았습니다**. Markdown 게시물에서는 정상 동작했습니다.",
      en: "Code blocks in richtext posts written with the Plate editor **lost syntax highlighting and the wrap/scroll toggle button**. Markdown posts worked correctly.",
    },
    cause: {
      ko: "코드 하이라이팅(highlight.js)과 버튼 라벨은 `useEffect`에서 **DOM을 직접 조작**하여 적용하고 있었습니다. 그러나 페이지 로드 후 API 호출(`좋아요 수`, `인접 게시물`, `추천 게시물` 등)이 완료되면 **state 변경 → React 리렌더 → `dangerouslySetInnerHTML`이 원본 HTML로 DOM을 덮어쓰기** → `useEffect`로 추가한 hljs 클래스와 버튼 라벨이 전부 사라졌습니다. `useEffect`의 의존성(`displayContent`, `t`)은 변하지 않아 **재실행되지 않았습니다**. Markdown 게시물은 `MarkdownRenderer`가 **서버에서 이미 하이라이팅을 적용한 HTML**을 생성하므로 영향이 없었습니다.",
      en: "Code highlighting (highlight.js) and button labels were applied by **directly manipulating the DOM in `useEffect`**. However, after page load, API calls (like count, adjacent posts, recommended posts) completed → **state changes → React re-render → `dangerouslySetInnerHTML` overwrites DOM with original HTML** → all hljs classes and button labels added by `useEffect` were wiped. The `useEffect` dependencies (`displayContent`, `t`) hadn't changed, so it **never re-ran**. Markdown posts were unaffected because `MarkdownRenderer` generates **pre-highlighted HTML on the server**.",
    },
    solution: {
      ko: "DOM 조작 대신 `useMemo` 단계에서 **HTML 문자열 자체에 하이라이팅과 버튼 라벨을 적용**했습니다. `<pre><code>` 블록을 정규식으로 찾아 `hljs.highlight()`로 구문 강조하고, 빈 `<button data-wrap-btn>` 에 라벨 span을 삽입한 완성된 HTML을 `dangerouslySetInnerHTML`에 전달합니다. `useEffect`는 **클릭 이벤트 위임만** 담당합니다.",
      en: "Instead of DOM manipulation, applied **highlighting and button labels to the HTML string itself in `useMemo`**. `<pre><code>` blocks are found via regex, highlighted with `hljs.highlight()`, and empty `<button data-wrap-btn>` elements are filled with label spans — all before passing the completed HTML to `dangerouslySetInnerHTML`. `useEffect` only handles **click event delegation**.",
    },
    keyInsight: {
      ko: "`dangerouslySetInnerHTML`로 렌더하는 콘텐츠는 **React의 리렌더 사이클에서 보호받지 못합니다**. DOM 조작으로 추가한 변경은 어떤 state 변경이든 리렌더가 발생하면 사라집니다. **서버/빌드 타임에 HTML을 완성**하거나, `useMemo`에서 **문자열 단계로 처리**해야 합니다.",
      en: "`dangerouslySetInnerHTML` content is **not protected across React's re-render cycle**. DOM changes added via `useEffect` vanish on any state-triggered re-render. The HTML must be **finalized at server/build time** or **processed at the string level in `useMemo`**.",
    },
    comparisons: [
      {
        label: { ko: "코드 하이라이팅 적용 방식 비교", en: "Code highlighting approach comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "useEffect DOM 조작", en: "useEffect DOM manipulation" },
          { ko: "useMemo 문자열 처리 (채택)", en: "useMemo string processing (adopted)" },
        ],
        rows: [
          {
            cells: [
              { ko: "리렌더 내성", en: "Re-render resilience" },
              { ko: "❌ state 변경 시 소실", en: "❌ Lost on state change" },
              { ko: "✅ HTML에 포함되어 유지", en: "✅ Embedded in HTML, persists" },
            ],
          },
          {
            cells: [
              { ko: "SSR 호환", en: "SSR compatible" },
              { ko: "❌ 클라이언트 전용", en: "❌ Client-only" },
              { ko: "✅ 서버 렌더 가능", en: "✅ Can run server-side" },
            ],
          },
          {
            cells: [
              { ko: "실행 시점", en: "Execution timing" },
              { ko: "렌더 후 (깜빡임 가능)", en: "Post-render (may flash)" },
              { ko: "렌더 전 (즉시 표시)", en: "Pre-render (instant display)" },
            ],
          },
        ],
      },
    ],
  },

  /* ── Editor ── */
  {
    section: { ko: "Editor", en: "Editor" },
    problem: { ko: "Plate 에디터에서 컨텍스트 툴바 표시 시 커서가 멋대로 튐", en: "Cursor Jumping Randomly When Contextual Toolbar Appears in Plate Editor" },
    definition: {
      ko: "에디터에서 테이블·열블록·수식 등 블록을 선택하면 상단에 컨텍스트 툴바가 나타나는데, **툴바가 나타나는 순간 커서가 다른 위치로 점프**하거나, 일반 텍스트를 입력하는 중에도 **커서가 갑자기 문서 앞쪽으로 이동**하는 현상이 발생했습니다.",
      en: "When selecting blocks like tables, columns, or equations, a contextual toolbar appears at the top. **The cursor jumped to random positions the moment the toolbar appeared**, and even during normal text input, **the cursor suddenly moved to the beginning of the document**.",
    },
    cause: {
      ko: "`MutationObserver`를 사용하여 에디터 DOM의 **모든 변경(childList, subtree, attributes)**을 감시하고, 변경이 감지되면 `scrollEl.style.overflow = 'hidden'` → `scrollEl.style.overflow = ''`를 토글하여 스크롤 위치를 보정하고 있었습니다. 문제는 **타이핑할 때마다** Slate가 DOM을 업데이트하면 이 observer가 실행되고, `overflow` 토글이 **브라우저의 `contentEditable` selection을 리셋**시킨다는 것이었습니다. 또한 `renderLeaf`에 **매 렌더마다 새로운 inline 함수**를 전달하여 PlateContent가 모든 leaf를 리렌더링하는 것도 원인이었습니다.",
      en: "A `MutationObserver` was watching **all DOM changes (childList, subtree, attributes)** in the editor, toggling `scrollEl.style.overflow = 'hidden'` → `scrollEl.style.overflow = ''` on each mutation to adjust scroll position. The problem was that **every keystroke** triggered Slate DOM updates → observer fired → `overflow` toggle **reset the browser's `contentEditable` selection**. Additionally, passing a **new inline function to `renderLeaf` on every render** caused PlateContent to re-render all leaves.",
    },
    solution: {
      ko: "`MutationObserver`를 **완전히 제거**하고, `overflow` 토글 없이 `scrollPaddingTop`만 설정하도록 변경했습니다. 툴바 visibility 상태를 문자열 key로 통합하여 **상태 변경 시에만 `requestAnimationFrame`으로 측정**합니다. `renderLeaf`는 **모듈 레벨의 안정적인 함수 참조**로 분리하고, `decorate`와 함께 **find가 열려있을 때만** PlateContent에 전달합니다.",
      en: "**Completely removed the `MutationObserver`** and switched to only setting `scrollPaddingTop` without any `overflow` toggling. Toolbar visibility states are combined into a string key and **measured only on state changes via `requestAnimationFrame`**. `renderLeaf` was extracted to a **stable module-level function reference**, and both `decorate` and `renderLeaf` are **only passed to PlateContent when find is open**.",
    },
    keyInsight: {
      ko: "`contentEditable` 요소에서 **`overflow` 속성을 동적으로 변경하면 브라우저가 selection을 리셋**할 수 있습니다. Slate/Plate 에디터의 DOM은 프레임워크가 관리하므로, `MutationObserver`로 감시하면 **모든 키 입력이 observer를 트리거**합니다. 성능에 민감한 영역에서는 DOM 감시 대신 **React state 기반으로 반응**해야 합니다.",
      en: "**Dynamically changing `overflow` on a `contentEditable` element can cause browsers to reset the selection.** Since Slate/Plate manages the DOM, a `MutationObserver` means **every keystroke triggers the observer**. In performance-sensitive areas, react to **React state changes instead of observing DOM mutations**.",
    },
    images: [
      {
        alt: { ko: "Plate 에디터에서 테이블 블록 선택 시 컨텍스트 툴바", en: "Plate editor — contextual toolbar when a table block is selected" },
        placeholderKeyword: "Admin 글 편집 화면 — 테이블 블록 선택 + 상단 컨텍스트 툴바",
      },
    ],
  },
  {
    problem: { ko: "토글·콜아웃·열블록 콘텐츠가 저장 후 사라짐", en: "Toggle, Callout, and Column Block Content Disappearing After Save" },
    definition: {
      ko: "Plate 에디터에서 토글, 콜아웃, 열블록을 작성하고 저장한 뒤 페이지를 다시 열어 보면, **블록 자체는 남아 있는데 내부 콘텐츠만 모두 비어 있는** 이상 현상이 발생했습니다.\n\n예를 들어 \"📝 메모\" 콜아웃 안에 본문 두 줄을 적고 저장했는데, 다시 열어 보면 \"📝 메모\" 박스만 남고 본문은 흔적도 없이 사라진 상태였습니다. 토글, 콜아웃, 열블록 4종 모두에서 동일하게 발생했습니다.",
      en: "When you wrote toggle, callout, or column blocks in the Plate editor and reopened the page after saving, **the blocks themselves were preserved but their inner content was wiped**.\n\nFor example, you'd write a \"📝 Note\" callout with two lines of body text, save, and reopen — only the \"📝 Note\" frame remained, the body text was gone. The same thing happened across all four block types: toggle, callout, column group, column item.",
    },
    cause: {
      ko: "Plate 는 저장된 HTML 을 에디터 트리 (Slate 노드) 로 복원할 때 \"deserializer\" 라는 함수를 호출합니다. 블록 종류마다 자기 deserializer 의 `parse` 함수를 따로 구현할 수 있는데, 거기에 **`children: []` (빈 자식 배열) 를 명시적으로 반환** 하는 코드가 들어가 있던 것이 원인이었습니다.\n\nPlate 의 deserializer 는 두 가지 모드로 동작합니다:\n\n- `parse` 가 `children` 을 **반환하지 않으면** → HTML 안쪽 자식 노드를 **자동으로 재귀 파싱** (기본 동작)\n- `parse` 가 `children` 을 **명시적으로 반환하면** → 그 값을 그대로 사용, 자동 파싱은 비활성화\n\n즉, `children: []` 를 반환하는 순간 Plate 는 \"개발자가 빈 배열을 직접 지정했으니 자동 파싱하지 않는다\" 로 해석합니다. 그 결과 **HTML 안에 본문이 그대로 들어 있었는데도 무시** 하고 빈 상태로 복원했던 것입니다.",
      en: "When Plate restores saved HTML back into editor nodes (a Slate tree), it calls a per-plugin \"deserializer\". Each block plugin can implement its own `parse` function, and the bug was that each one **explicitly returned `children: []` (an empty children array)**.\n\nPlate's deserializer has two modes:\n\n- If `parse` **doesn't return** `children` → it **automatically recurses** into the HTML's inner nodes (default)\n- If `parse` **explicitly returns** `children` → Plate uses that value verbatim and skips auto-parsing\n\nReturning `children: []` essentially tells Plate \"I'm explicitly setting an empty array, don't auto-parse\" — so the inner HTML body was **ignored even though it was right there in the saved markup**, restoring as empty.",
    },
    solution: {
      ko: "각 deserializer 의 `parse` 반환 객체에서 **`children: []` 한 줄을 제거** 하면 해결되었습니다.\n\n`children` 필드 자체가 없으면 Plate 의 기본 동작이 작동해, `<div>` 안의 HTML 을 자동으로 재귀 파싱하여 Slate 트리로 변환합니다. 4개 플러그인 (토글, 콜아웃, 열 그룹, 열 아이템) 모두에 동일한 한 줄 수정을 적용해 일괄 해결했습니다.",
      en: "**Removed the single `children: []` line** from each deserializer's `parse` return.\n\nWithout the `children` field, Plate's default kicks in — auto-parsing the `<div>`'s inner HTML into Slate nodes recursively. The same one-line fix in four plugins (toggle, callout, column group, column item) resolved all of them.",
    },
    keyInsight: {
      ko: "라이브러리의 **\"기본 동작 vs 직접 지정한 동작\"** 의 차이를 인지하지 못하면, 안전해 보이는 코드 한 줄이 자동화 기능을 통째로 꺼 버리는 상황이 발생할 수 있습니다.\n\nPlate 의 `parse` 에서 `children` 을 **생략** 하는 것은 \"자동 파싱 켜짐\", **명시적으로 지정** 하는 것은 \"수동 제어 — 자동 파싱 꺼짐\" 입니다. 빈 배열 `[]` 도 \"자식이 없다\" 라는 **의도적인 선언** 으로 해석됩니다.\n\n\"명시적이 항상 더 안전하다\" 는 직관이 늘 맞지는 않는다는 점, 그리고 라이브러리의 기본값이 어떤 가정 위에서 동작하는지 한 번은 들여다보아야 한다는 교훈을 얻었습니다.",
      en: "Without understanding the framework's distinction between **\"default behavior vs. explicit behavior\"**, what looks like a safe one-liner can silently turn off the framework's automation.\n\nIn Plate's `parse`, **omitting** `children` means \"auto-parsing on\"; **specifying** it means \"manual mode — auto-parsing off\". Even an empty array `[]` is interpreted as an **intentional declaration of 'no children'**.\n\nThe lesson: \"more explicit is always safer\" isn't always true — and it's worth peeking at what your library's defaults assume before writing over them.",
    },
    comparisons: [
      {
        label: { ko: "deserializer children 반환 방식 비교", en: "Deserializer children return comparison" },
        headers: [
          { ko: "반환 방식", en: "Return style" },
          { ko: "Plate 동작", en: "Plate behavior" },
          { ko: "결과", en: "Result" },
        ],
        rows: [
          {
            cells: [
              { ko: "children: []", en: "children: []" },
              { ko: "HTML 자식 파싱 건너뜀", en: "Skips HTML child parsing" },
              { ko: "❌ 내부 콘텐츠 유실", en: "❌ Inner content lost" },
            ],
          },
          {
            cells: [
              { ko: "children 생략 (채택)", en: "Omit children (adopted)" },
              { ko: "HTML 자식 자동 재귀 파싱", en: "Auto-recursive HTML child parsing" },
              { ko: "✅ 콘텐츠 보존", en: "✅ Content preserved" },
            ],
            highlight: true,
          },
        ],
      } satisfies ComparisonTable,
    ],
    images: [
      {
        alt: { ko: "Plate 에디터 — 토글 / 콜아웃 블록에 본문 작성 화면", en: "Plate editor — toggle / callout block with body content" },
        placeholderKeyword: "Admin 글 편집 화면 — 토글 또는 콜아웃 블록 안에 본문 작성한 상태",
      },
      {
        alt: { ko: "저장 후 재오픈 — 블록 frame 만 남고 본문이 사라진 상태", en: "After save + reopen — only block frame remains, body content lost" },
        placeholderKeyword: "수정 전 버그 재현 — 같은 글을 저장 후 다시 열어서 본문 사라진 상태 (수정 전 / 수정 후 비교)",
      },
    ],
  },
  /* ── Editor ── */
  {
    problem: { ko: "코드블록 하이라이팅이 브라우저에서만 죽음 — 빌드·테스트는 전부 통과", en: "Code Highlighting Dies Only in the Browser — Build and Tests All Pass" },
    definition: {
      ko: "에디터 코드블록에서 **HTML(xml) 만 색이 하나도 안 붙었습니다.** CSS 같은 다른 언어는 멀쩡했고, 언어 감지도 정상이라 라벨엔 \"HTML / XML\" 이 떴는데 코드는 무채색이었습니다.\n\n`npm run build`, `tsc`, 테스트 전부 통과했습니다. **오직 브라우저에서만** 재현됐습니다.",
      en: "In the editor's code block, **HTML (xml) got no colors at all.** Other languages like CSS were fine, and detection worked — the label read \"HTML / XML\" — yet the code stayed monochrome.\n\n`npm run build`, `tsc`, and the tests all passed. It reproduced **only in the browser**.",
    },
    cause: {
      ko: "브라우저 콘솔에만 이런 에러가 있었습니다:\n\n```\nSyntaxError: Invalid regular expression: /<(?=[\\u0041-\\u005A…\\u{10000}-\\u{1000B}…\n    at countMatchGroups (core.js:456)\n```\n\n세 가지가 겹쳐야 터지는 문제였습니다.\n\n**1. hljs 문법이 유니코드 속성 이스케이프를 씁니다.** `xml.js` 는 태그명을 `/[\\p{L}_]/u` (모든 유니코드 문자) 로 정의합니다.\n\n**2. 번들러가 그걸 전개합니다.** browserslist 가 최신(chrome 148)인데도 Next 는 node_modules 를 보수적 타깃으로 컴파일합니다. 그래서 `\\p{L}` 이 실제 코드포인트 범위로 풀리고, 거기엔 **아스트랄 영역(`\\u{10000}-…`)** 이 섞입니다. 이 중괄호 형태는 `u` flag 없이는 파싱 자체가 불가능합니다.\n\n**3. hljs 가 그 정규식을 flag 없이 재파싱합니다.** `countMatchGroups` 가 캡처 그룹 수를 세려고 `new RegExp(re.toString() + \"|\")` 를 합니다. 여기서 `u` flag 가 사라져 SyntaxError 가 나고, Plate 는 그걸 catch 해서 조용히 plaintext 로 떨굽니다.\n\n**node 에서 재현이 안 되는 게 핵심입니다.** node 는 트랜스파일되지 않은 원본(`\\p{L}` + `u` flag)을 쓰므로 멀쩡합니다. 전개된 형태는 **브라우저 번들에만 존재**합니다. 그래서 DOM·클래스·CSS·서빙되는 청크까지 전부 검증해도 원인이 안 나왔고, 브라우저 콘솔 스택트레이스를 보고서야 잡혔습니다.\n\nCSS 가 멀쩡했던 건 `css.js` 에 `\\p{}` 가 하나도 없어서였습니다.",
      en: "The error existed only in the browser console:\n\n```\nSyntaxError: Invalid regular expression: /<(?=[\\u0041-\\u005A…\\u{10000}-\\u{1000B}…\n    at countMatchGroups (core.js:456)\n```\n\nThree things had to line up.\n\n**1. hljs grammars use Unicode property escapes.** `xml.js` defines tag names as `/[\\p{L}_]/u` — any Unicode letter.\n\n**2. The bundler expands them.** Even with a modern browserslist (chrome 148), Next compiles node_modules against a conservative target, so `\\p{L}` becomes explicit code-point ranges — including **astral ranges (`\\u{10000}-…`)**, a braced form that cannot be parsed at all without the `u` flag.\n\n**3. hljs re-parses that regex without flags.** `countMatchGroups` counts capture groups via `new RegExp(re.toString() + \"|\")`. The `u` flag is gone, it throws a SyntaxError, and Plate catches it and silently falls back to plaintext.\n\n**Why node never reproduced it is the crux.** Node uses the untranspiled source (`\\p{L}` + `u` flag) and is fine. The expanded form **exists only in the browser bundle**. Verifying the DOM, the classes, the CSS, even the served chunks turned up nothing — only the browser console's stack trace pinned it.\n\nCSS was unaffected because `css.js` contains no `\\p{}` at all.",
    },
    solution: {
      ko: "근원은 번들러의 트랜스파일 타깃이지만 node_modules 컴파일은 우리가 못 막습니다. 리더뷰·댓글은 이미 Prism 으로 옮겼지만, 에디터는 Plate 의 code-block 플러그인이 lowlight 인스턴스를 API 로 받아서 교체가 불가능했습니다. 남은 선택지는 **문법 자체를 패치하는 것** 이었고, 실제로 Plate 도 python 에 대해 같은 우회(`ensureStablePythonGrammar`)를 갖고 있습니다.\n\n등록 시 문법 객체를 훑어 아스트랄 이스케이프를 걷어내고 `u` flag 를 뗍니다. 아스트랄 영역의 \"문자\" 는 태그명에 실질적으로 안 쓰이고, **BMP(한글·CJK·라틴 확장)는 그대로 남습니다.**\n\n여기서 한 번 헛수고를 했습니다. 처음엔 `RegExp` 인스턴스만 변환했는데 아무것도 안 고쳐졌습니다. hljs 의 `regex.concat()` 이 **RegExp 가 아니라 소스를 이어붙인 문자열** 을 반환하기 때문입니다(`core.js: return joined`). 아스트랄 이스케이프는 RegExp 객체가 아니라 **문자열 안**에 있었습니다.\n\n검증은 **번들된 형태를 합성**해서 했습니다. node 는 원본을 쓰니 실물 재현이 불가능해서, 번들러가 뱉는 모양을 직접 만들어 (1) 그 입력이 실제로 재파싱을 깨뜨리는지 (2) 변환 후엔 견디는지 (3) 한글이 안 깨지는지를 테스트로 못 박았습니다.",
      en: "The root cause is the bundler's transpile target, but we can't control how node_modules is compiled. The reader and comments had already moved to Prism; the editor couldn't, because Plate's code-block plugin takes a lowlight instance as its API. That left **patching the grammar itself** — and Plate does exactly this for python (`ensureStablePythonGrammar`).\n\nAt registration we walk the grammar object, strip astral escapes, and drop the `u` flag. Astral-plane \"letters\" are effectively never used in tag names, and **the BMP (Korean, CJK, Latin extended) survives untouched.**\n\nOne wasted attempt is worth recording: transforming only `RegExp` instances fixed nothing. hljs's `regex.concat()` returns **a concatenated source string, not a RegExp** (`core.js: return joined`), so the astral escapes lived **inside strings**.\n\nVerification had to **synthesize the bundled shape**: node uses the original source, so the real failure can't be reproduced. Building the bundler's output by hand let the tests assert that (1) the input really does break the re-parse, (2) the transformed output survives it, and (3) Korean text still highlights.",
    },
    keyInsight: {
      ko: "**\"테스트가 통과한다\" 가 \"동작한다\" 는 뜻이 아닙니다.** 테스트가 도는 환경(node)과 코드가 실행되는 환경(브라우저 번들)이 다르면, 그 차이 안에 사는 버그는 테스트가 구조적으로 못 잡습니다.\n\n라이브러리가 **삼켜버리는 예외** 도 위험을 키웁니다. Plate 는 하이라이팅 실패를 catch 해서 plaintext 로 떨궜기 때문에, 화면엔 \"색이 안 붙는다\" 로만 보였고 원인은 콘솔에만 있었습니다. 증상과 원인의 거리가 멀수록 **추측 대신 증거** 를 먼저 확보해야 합니다.",
      en: "**\"The tests pass\" is not \"it works\".** When the environment your tests run in (node) differs from where the code actually runs (the browser bundle), bugs living in that gap are invisible to tests by construction.\n\n**Swallowed exceptions** widen the gap. Plate caught the highlight failure and fell back to plaintext, so the UI only showed \"no colors\" while the cause sat in the console. The further apart the symptom and the cause, the earlier you must stop guessing and **go get evidence**.",
    },
    tags: ["highlight.js", "Bundler", "RegExp", "Plate"],
  },
  {
    problem: { ko: "코드블록 내용을 전체 선택해 지우면 이후 붙여넣기가 블록 밖으로 샘", en: "After Select-All-Delete in a Code Block, Pastes Leak Outside the Block" },
    definition: {
      ko: "코드블록에 붙여넣기는 잘 됩니다. 그런데 그 내용을 **Cmd+A 로 전체 선택해 지운 뒤 다시 붙여넣으면**, 첫 줄만 블록 안에 들어가고 **나머지 줄은 블록 아래에 별도 블록으로** 생겼습니다. 게다가 글자가 멀쩡히 있는데도 \"코드를 입력하세요\" placeholder 가 사라지지 않았습니다.\n\n한 번 이 상태가 되면 **계속** 그랬습니다.",
      en: "Pasting into a code block worked. But if you **selected everything with Cmd+A, deleted it, and pasted again**, only the first line landed inside — **the rest appeared as separate blocks below**. And the \"Enter code\" placeholder stayed visible even though text was clearly there.\n\nOnce a block entered this state, it stayed broken **every time**.",
    },
    cause: {
      ko: "브라우저에서 그 블록의 DOM 을 찍고서야 정체가 드러났습니다:\n\n```\n줄 수      : 0                     ← code_line 이 하나도 없음\nplaceholder: 코드를 입력하세요\nDOM 글자   : \"<main class=…>\"      ← 글자는 있음\ncode 자식  : SPAN                  ← DIV(code_line) 이 아니라 텍스트 노드\n```\n\nCmd+A 삭제가 `code_line` 들을 통째로 없애고 **raw 텍스트 노드만** 남긴 상태였습니다(`code_block[text]`). 정상 구조는 `code_block > code_line > text` 입니다.\n\n여기서 세 증상이 전부 파생됩니다.\n\n- **placeholder** — 빈 블록 판정이 `children.every(line => !line.children?.some(...))` 인데, 자식이 텍스트 노드면 `line.children` 이 `undefined` → `!undefined` = true → **글자가 있는데 \"비었다\"** 로 오판합니다.\n- **붙여넣기 유출** — 커서가 `code_line` 이 아니라 `code_block` 안에 놓입니다. Plate 의 붙여넣기는 첫 줄을 `insertText` 로, 나머지를 `insertNodes` 로 넣는데 `insertNodes` 는 \"가장 낮은 블록\" 의 형제로 삽입합니다. 그 블록이 `code_line` 이 아니라 `code_block` 이니 **나머지 줄이 블록 밖으로** 나갑니다.\n\n**이 상태를 아무도 못 고친다는 게 핵심입니다.** Plate 의 `withNormalizeCodeBlock` 은 `setNodes({ type: code_line })` 만 하는데, **텍스트 노드에 `type` 을 붙여도 element 가 되지 않습니다.** 그리고 Slate 는 `children[0]` 이 텍스트면 그 블록을 \"텍스트를 담는 블록\" 으로 보고 정상이라 판단합니다. 자기모순이 없어서 **영구히 깨진 채로 남습니다.**",
      en: "Only dumping that block's DOM in the browser revealed what it was:\n\n```\nlines      : 0                     ← not a single code_line\nplaceholder: \"Enter code\"\nDOM text   : \"<main class=…>\"      ← the text is right there\ncode child : SPAN                  ← a text node, not DIV(code_line)\n```\n\nSelect-all-delete had removed the `code_line` elements entirely, leaving **a bare text node** (`code_block[text]`). The valid structure is `code_block > code_line > text`.\n\nAll three symptoms fall out of that.\n\n- **Placeholder** — the empty check is `children.every(line => !line.children?.some(...))`. For a text child, `line.children` is `undefined` → `!undefined` = true → it reports **\"empty\" while text exists**.\n- **Paste leak** — the caret sits inside the `code_block`, not a `code_line`. Plate's paste inserts the first line with `insertText` and the rest with `insertNodes`, which places them as siblings of the **lowest block** — now the `code_block` itself, so **the rest lands outside**.\n\n**The crux is that nothing can repair this.** Plate's `withNormalizeCodeBlock` only does `setNodes({ type: code_line })`, and **giving a text node a `type` does not make it an element**. Meanwhile Slate sees `children[0]` is text, concludes the block legitimately holds text, and leaves it alone. With no contradiction to resolve, **the break is permanent.**",
    },
    solution: {
      ko: "`code_block` 의 자식이 텍스트 노드면 `code_line` 으로 **감싸는(wrapNodes)** 정규화를 추가했습니다. `setNodes` 로는 안 되고 `wrapNodes` 여야 합니다 — 텍스트를 element 로 바꾸는 게 아니라 element 안에 넣어야 하기 때문입니다.\n\n빈 블록 판정도 텍스트 노드를 같이 보도록 방어했습니다.\n\n**모델 API 로는 이 상태를 만들 수 없다는 점** 이 조사를 오래 끌었습니다. `editor.tf.selectAll()` + `deleteFragment()` 로 재현하면 정상적으로 `code_block[code_line:\"\"]` 가 나옵니다. 실제 브라우저의 Cmd+A(DOM selection 경유)만 이 구조를 만듭니다. 그래서 모델 테스트는 모든 순서에서 통과했고, 브라우저 DOM 을 찍고서야 잡혔습니다.",
      en: "Added a normalizer that **wraps** a text child of `code_block` in a `code_line` (`wrapNodes`). `setNodes` cannot do it — the text isn't becoming an element, it needs to be placed inside one.\n\nThe empty check was hardened to count text nodes too.\n\n**The model API cannot produce this state**, which is what dragged the investigation out. Reproducing with `editor.tf.selectAll()` + `deleteFragment()` yields a perfectly normal `code_block[code_line:\"\"]`. Only a real browser Cmd+A — which goes through the DOM selection — creates it. So the model-level tests passed in every ordering, and only a DOM dump exposed it.",
    },
    keyInsight: {
      ko: "**정규화는 \"고칠 수 있는 형태\" 를 전제합니다.** 라이브러리의 정규화가 `setNodes` 로 타입만 바꾸는 식이면, 타입을 바꿔서 도달할 수 없는 붕괴(텍스트 ↔ element)는 영원히 안 고쳐집니다.\n\n그리고 **\"한 번 깨지면 계속 깨진다\" 는 그 상태가 자기모순이 없다는 신호** 입니다. 검증 계층이 정상이라고 판단하니 스스로 복구될 리가 없습니다. 이런 건 증상이 아니라 **불변식** 을 코드로 못 박아야 합니다.",
      en: "**Normalization presupposes a repairable shape.** If a library normalizes via `setNodes` — changing a type — then corruption you can't reach by changing a type (text ↔ element) is never repaired.\n\nAnd **\"broken once, broken forever\" signals a self-consistent state**: the validation layer believes it's fine, so it will never self-heal. The fix isn't patching the symptom — it's writing the **invariant** down in code.",
    },
    tags: ["Plate", "Slate", "Normalization", "Paste"],
  },
  {
    section: { ko: "Editor", en: "Editor" },
    problem: { ko: "제목(heading) 안 각주가 마크다운 변환 시 처리 안 됨", en: "Footnotes Inside Headings Not Processed During Markdown Conversion" },
    definition: {
      ko: "리치텍스트 에디터에서 제목에 각주를 넣고 마크다운으로 전환하면, 각주가 `[^1]` 텍스트 그대로 남아 **미리보기에서 각주로 인식되지 않았습니다**.",
      en: "When converting headings with footnotes from richtext to markdown, the footnote remained as literal `[^1]` text and **was not recognized as a footnote in preview**.",
    },
    cause: {
      ko: "`marked-footnote` 플러그인이 인라인 각주를 처리하기 **전에** 커스텀 `heading` renderer가 먼저 실행되어, 제목 텍스트 안의 `[^N]`이 각주 HTML로 변환되지 않고 원본 그대로 출력되었습니다. 본문의 `[^N]`은 정상 변환되었지만, **heading renderer가 파싱 파이프라인을 우회**하는 구조적 문제였습니다.",
      en: "The custom `heading` renderer executed **before** `marked-footnote` could process inline footnotes, so `[^N]` inside heading text was output as-is without conversion to footnote HTML. Body `[^N]` worked fine, but **the heading renderer bypassed the parsing pipeline**.",
    },
    solution: {
      ko: "커스텀 heading renderer를 제거하고, `postprocess` hook으로 대체했습니다. `marked-footnote`가 heading 포함 모든 각주를 먼저 처리한 뒤, `postprocess`에서 `<h1>`~`<h6>` 태그에 id(slug)만 추가합니다. 추가로 `keepLabels: true` 옵션을 적용하여 사용자가 입력한 각주 번호를 그대로 유지합니다.",
      en: "Replaced the custom heading renderer with a `postprocess` hook. `marked-footnote` processes all footnotes (including headings) first, then `postprocess` adds id (slug) to `<h1>`-`<h6>` tags. Additionally applied `keepLabels: true` to preserve user-specified footnote numbers.",
    },
    keyInsight: {
      ko: "마크다운 플러그인과 커스텀 renderer가 **같은 토큰을 경합**하면 파싱이 꼬입니다. renderer 대신 `postprocess` hook을 사용하면 플러그인이 먼저 동작한 **결과 HTML을 안전하게 후처리**할 수 있습니다.",
      en: "When markdown plugins and custom renderers **compete for the same tokens**, parsing breaks. Using `postprocess` hooks instead of renderers allows **safe post-processing of the plugin-generated HTML**.",
    },
  },
  {
    problem: { ko: "Plate inline void 노드에서 클릭 vs 키보드 구분 불가", en: "Cannot Distinguish Click vs Keyboard for Plate Inline Void Nodes" },
    definition: {
      ko: "각주 참조(`[1]`)를 클릭하면 설명란으로 스크롤해야 하고, 방향키로 진입하면 편집 모드로 들어가야 하는데, `useSelected` 훅이 **두 경우를 구분하지 못해** 클릭해도 편집 모드로 진입하는 문제가 있었습니다.",
      en: "Clicking a footnote ref `[1]` should scroll to its definition, while arrow-key navigation should enter edit mode. But the `useSelected` hook **couldn't distinguish between the two**, causing edit mode to activate on click.",
    },
    cause: {
      ko: "Plate의 `useSelected()`는 노드가 **어떤 방식으로든 선택되면** true를 반환합니다. 클릭이든 방향키든 구분하지 않습니다. `<sup>` 요소에 `onMouseDown` 핸들러를 달아도, void 노드 **바깥** 클릭(오른쪽 빈 공간)은 해당 핸들러를 거치지 않아 구분이 불가능했습니다.",
      en: "Plate's `useSelected()` returns true when the node is **selected by any means** — click or arrow key. Adding `onMouseDown` to the `<sup>` element didn't help because clicks on the **outside** of the void node (right side empty space) bypassed the handler.",
    },
    solution: {
      ko: "`document.addEventListener('mousedown')` 레벨에서 마우스 사용 여부를 플래그(`wasMouseRef`)로 기록합니다. `useSelected`가 true가 될 때 이 플래그를 확인하여: **마우스 → 편집 안 함**, **키보드 → 편집 진입**. `mouseup` 후 `requestAnimationFrame`으로 플래그를 리셋합니다.",
      en: "Track mouse usage at the `document.addEventListener('mousedown')` level with a flag (`wasMouseRef`). When `useSelected` becomes true, check this flag: **mouse → no edit**, **keyboard → enter edit**. Reset the flag after `mouseup` via `requestAnimationFrame`.",
    },
    keyInsight: {
      ko: "**이벤트 소스 구분은 컴포넌트 레벨이 아닌 document 레벨에서** 해야 합니다. inline void 노드는 주변 클릭도 선택을 트리거하므로, 컴포넌트 내부 핸들러만으로는 모든 케이스를 커버할 수 없습니다.",
      en: "**Event source distinction must happen at the document level, not component level**. Inline void nodes can be selected by clicks on surrounding areas, so component-internal handlers alone cannot cover all cases.",
    },
  },
  /* ── Admin / Refactoring ── */
  {
    section: { ko: "Admin / Refactoring", en: "Admin / Refactoring" },
    problem: { ko: "Admin 리스트(시리즈/휴지통/게시물)의 UI 코드 중복과 스타일 불일치", en: "Admin List (Series/Trash/Posts) UI Code Duplication and Style Inconsistency" },
    definition: {
      ko: "시리즈·휴지통·게시물 세 영역이 각각 **별도의 ul/li 또는 grid 레이아웃**으로 구현되어, 헤더·행 높이·패딩·폰트·bulk bar 스타일이 제각각이었습니다. 검색 UI도 페이지마다 인라인으로 반복 구현되어 있었습니다.",
      en: "Series, trash, and post lists were each implemented with **separate ul/li or grid layouts**, resulting in inconsistent header, row height, padding, font, and bulk bar styles. Search UI was also inline-duplicated per page.",
    },
    cause: {
      ko: "메인 게시물 테이블(`AdminTable`)은 publish 토글·편집 링크·드래그 정렬 등 고유 기능이 있어 시리즈/휴지통에 그대로 재사용이 어려웠습니다. 이로 인해 각 영역이 **독자적으로 체크박스·드래그 선택·bulk bar·페이지네이션을 구현**하면서 CSS만 700줄 이상, 동일 패턴이 3곳에 중복되었습니다.",
      en: "The main post table (`AdminTable`) had unique features like publish toggle, edit links, and drag reorder, making it difficult to reuse for series/trash. Each area **independently implemented checkboxes, drag selection, bulk bar, and pagination**, resulting in 700+ lines of CSS and the same patterns duplicated in 3 places.",
    },
    solution: {
      ko: "공통 패턴을 3개 컴포넌트로 추출했습니다: **SubTable**(접기/펼치기 토글 + 그리드 행 + 체크박스/드래그 선택 + bulk bar + 페이지네이션), **SearchCapsule**(검색 타입 Select + input을 캡슐 형태로 묶음), **DraggableTag**(드래그 정렬 가능한 태그). 시리즈·휴지통을 SubTable로 전환하고, 모든 검색 UI를 SearchCapsule로 교체했습니다. CSS는 700줄 이상 → 약 220줄로 줄었습니다.",
      en: "Extracted common patterns into 3 components: **SubTable** (collapsible toggle + grid rows + checkbox/drag select + bulk bar + pagination), **SearchCapsule** (search type Select + input grouped in capsule), **DraggableTag** (drag-sortable tag). Converted series/trash to SubTable and replaced all search UI with SearchCapsule. CSS reduced from 700+ lines to ~220 lines.",
    },
    keyInsight: {
      ko: "기존 컴포넌트(AdminTable)를 무리하게 확장하는 대신, **공통 패턴만 추출하여 별도 컴포넌트로 분리**하면 기존 기능을 깨뜨리지 않으면서 중복을 제거할 수 있습니다. 100% 재사용보다 **80% 공통화 + 20% 커스텀**이 현실적입니다.",
      en: "Rather than force-extending the existing component (AdminTable), **extracting only common patterns into separate components** removes duplication without breaking existing features. **80% shared + 20% custom** is more practical than 100% reuse.",
    },
    images: [
      {
        alt: { ko: "Admin 게시물 리스트 — SubTable 컴포넌트로 통일된 행/체크박스/페이지네이션", en: "Admin posts list — unified SubTable with rows / checkbox / pagination" },
        placeholderKeyword: "Admin 게시물 리스트 페이지 (체크박스 선택된 상태 + bulk action bar)",
      },
      {
        alt: { ko: "Admin 시리즈/휴지통 리스트 — 동일 SubTable 패턴", en: "Admin series/trash lists — same SubTable pattern" },
        placeholderKeyword: "Admin 시리즈 또는 휴지통 페이지 (SubTable 펼친 상태)",
      },
    ],
    comparisons: [
      {
        label: { ko: "리팩토링 전후 비교", en: "Before/After refactoring comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "리팩토링 전", en: "Before" },
          { ko: "리팩토링 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "시리즈 리스트", en: "Series list" }, { ko: "수동 ul/li + flex", en: "Manual ul/li + flex" }, { ko: "SubTable 컴포넌트", en: "SubTable component" }] },
          { cells: [{ ko: "휴지통 리스트", en: "Trash list" }, { ko: "수동 ul/li + flex", en: "Manual ul/li + flex" }, { ko: "SubTable 컴포넌트", en: "SubTable component" }] },
          { cells: [{ ko: "검색 UI", en: "Search UI" }, { ko: "페이지별 인라인 3벌", en: "3 inline copies per page" }, { ko: "SearchCapsule 공통", en: "Shared SearchCapsule" }] },
          { cells: [{ ko: "카테고리 태그", en: "Category tags" }, { ko: "페이지별 개별 구현", en: "Per-page implementation" }, { ko: "DraggableTag 공통", en: "Shared DraggableTag" }] },
          { cells: [{ ko: "CSS 규모 (Posts)", en: "CSS size (Posts)" }, { ko: "~744줄", en: "~744 lines" }, { ko: "~220줄", en: "~220 lines" }] },
        ],
      } satisfies ComparisonTable,
    ],
  },
  /* ── Backend / Autosave ── */
  {
    section: { ko: "Backend / Autosave", en: "Backend / Autosave" },
    problem: { ko: "카테고리 자동 보정으로 리비전 프롬프트가 무한 반복", en: "Revision Prompt Loops Due to Category Auto-Correction" },
    definition: {
      ko: "게시물을 열 때마다 '자동저장된 버전을 불러올까요?' 프롬프트가 반복 표시되었습니다. 무시를 눌러도 새로고침하면 다시 물어봤습니다.",
      en: "Every time a post was opened, the 'Load autosaved version?' prompt appeared repeatedly. Even after dismissing, refreshing would ask again.",
    },
    cause: {
      ko: "등록되지 않은 카테고리(예: 'General')를 가진 게시물이 열리면 '기타'로 자동 보정됩니다. 이 변경이 30초 후 자동저장을 트리거하여 새 리비전이 생성되고, 무시(dismiss) 처리된 기존 리비전과 **내용은 동일하지만 새 row**가 DB에 추가되어 매번 프롬프트가 뜨는 루프가 발생했습니다.",
      en: "Posts with unregistered categories (e.g., 'General') get auto-corrected to a default. This change triggers autosave after 30s, creating a new revision row with **identical content** to the dismissed one, causing an infinite prompt loop.",
    },
    solution: {
      ko: "리비전 저장 API에서 **직전 리비전의 snapshot과 키 정렬 비교**를 수행하여, 내용이 동일하면 새 row를 생성하지 않고 기존 리비전의 ID를 반환합니다. 클라이언트는 `skipped` 플래그를 확인하여 목록에 추가하지 않고 '자동저장됨' 상태도 표시하지 않습니다.",
      en: "The revision save API performs **sorted-key comparison** with the previous revision's snapshot. If identical, it returns the existing revision ID without creating a new row. The client checks the `skipped` flag to avoid adding to the list or showing 'autosaved' status.",
    },
    keyInsight: {
      ko: "자동 보정(카테고리, 기본값 등)은 **사용자 의도와 무관한 변경**입니다. 이런 변경이 자동저장 → 리비전 생성 → 프롬프트 루프를 만들 수 있으므로, **서버 측에서 중복 snapshot을 거르는 것**이 클라이언트 로직을 복잡하게 만들지 않는 가장 확실한 해결책입니다.",
      en: "Auto-corrections (categories, defaults) are **changes unrelated to user intent**. They can create autosave → revision → prompt loops, so **server-side duplicate snapshot filtering** is the most robust solution without complicating client logic.",
    },
  },

  /* ── Editor ── */
  {
    section: { ko: "에디터", en: "Editor" },
    problem: { ko: "인라인 이미지 양옆에 커서 배치·텍스트 입력 불가", en: "Cannot Place Cursor or Type Next to Inline Images" },
    definition: {
      ko: "Plate(Slate) 에디터에서 이미지를 인라인 void로 설정했으나, 이미지 양옆에 **클릭이나 방향키로 커서를 놓을 수 없어** 텍스트를 삽입할 수 없었습니다.",
      en: "Images in the Plate (Slate) editor were set as inline void, but it was **impossible to place the cursor beside the image via click or arrow keys**, preventing text insertion.",
    },
    cause: {
      ko: "Slate의 정규화는 인라인 void 주변에 빈 텍스트 노드(zero-width space)를 자동 삽입하지만, ImageElement 내부에서 `<div>` (BlockDropZone + wrapper)가 인라인 `<span>` (PlateElement) 안에 중첩되어 있었습니다. **`<div>`는 블록 요소라 인라인 흐름을 깨뜨려**, 브라우저가 인접 텍스트 노드에 대한 커서 접근을 차단했습니다.",
      en: "Slate's normalization correctly inserts empty text nodes around inline voids, but the ImageElement nested `<div>` elements (BlockDropZone + wrapper) inside an inline `<span>` (PlateElement). **`<div>` is a block element that breaks inline flow**, causing the browser to block cursor access to adjacent text nodes.",
    },
    solution: {
      ko: "`imgLayout === \"inline\"`일 때 별도 렌더링 분기를 만들어 **모든 wrapper를 `<span>`으로 변경**하고 BlockDropZone을 제거했습니다. 또한 이미지 양쪽에 absolute 배치된 `InlineCursorTarget`을 추가하여, 클릭 시 `editor.api.before()`/`after()`로 커서를 정확히 배치합니다.",
      en: "Created a separate rendering branch for `imgLayout === \"inline\"` that **converts all wrappers to `<span>`** and removes BlockDropZone. Added absolute-positioned `InlineCursorTarget` components that use `editor.api.before()`/`after()` to precisely place the cursor on click.",
    },
    keyInsight: {
      ko: "인라인 void 요소 안에 `<div>`가 들어가면 **브라우저가 인라인 흐름을 파괴**하여, Slate가 자동 삽입한 빈 텍스트 노드에 커서를 배치할 수 없게 됩니다. 인라인 요소 내부에는 반드시 `<span>` 등 인라인 태그만 사용해야 합니다.",
      en: "Placing `<div>` inside an inline void element **destroys the browser's inline flow**, preventing cursor placement in Slate's auto-inserted empty text nodes. Only inline tags like `<span>` should be used inside inline elements.",
    },
  },
  {
    section: { ko: "에디터 / CSS", en: "Editor / CSS" },
    problem: { ko: "테마 전환 글로벌 transition이 컴포넌트 애니메이션 덮어쓰기", en: "Global Theme Transition Overriding Component Animations" },
    definition: {
      ko: "다크/라이트 테마 전환을 위한 글로벌 CSS transition 규칙이, 에디터 toolbar 접기·토글 열기 등 **`max-height`, `opacity`, `transform` transition을 모두 무시**하게 만들었습니다.",
      en: "A global CSS transition rule for dark/light theme switching caused **`max-height`, `opacity`, `transform` transitions to be silently ignored** in editor toolbar collapse, toggle open, etc.",
    },
    cause: {
      ko: "`transition`은 shorthand 속성이라, `transition: background-color 0.3s` 선언이 컴포넌트의 `transition: max-height 0.3s`를 **완전히 덮어씁니다**. 글로벌 `html[attr] *`의 specificity `(0,1,1)`이 CSS Module 단일 클래스 `(0,1,0)`보다 높아 항상 우선합니다.",
      en: "`transition` is a shorthand property, so `transition: background-color 0.3s` **completely overwrites** a component's `transition: max-height 0.3s`. The global `html[attr] *` specificity `(0,1,1)` always beats CSS Module single-class `(0,1,0)`.",
    },
    solution: {
      ko: "글로벌 transition을 `data-theme-transitioning` 속성으로 변경하여 **테마 전환 시 350ms 윈도우 동안만 적용**. 평상시에는 비활성이므로 컴포넌트 transition이 정상 동작합니다.",
      en: "Changed the global transition to a `data-theme-transitioning` attribute **active only during a 350ms window when the theme switches**. During normal operation, component transitions work as expected.",
    },
    keyInsight: {
      ko: "CSS `transition`은 shorthand이므로, 글로벌에서 특정 속성만 지정해도 **컴포넌트의 다른 속성 transition을 전부 제거**합니다. 상시 적용 대신 속성 토글로 필요한 순간에만 활성화해야 합니다.",
      en: "CSS `transition` is a shorthand — specifying just a few properties globally **removes all other property transitions** from components. Use an attribute toggle to activate only when needed.",
    },
  },
  {
    section: { ko: "에디터 / 마크다운", en: "Editor / Markdown" },
    problem: { ko: "마크다운 각주 번호 꼬임 — heading renderer 충돌", en: "Footnote Number Tangling — Heading Renderer Execution Order" },
    definition: {
      ko: "마크다운에서 heading(`# 제목`)과 footnote(`[^1]`)를 함께 사용하면 **각주 번호가 꼬이거나 heading 안의 각주가 변환되지 않았습니다**.",
      en: "Using headings and footnotes together in markdown caused **footnote numbers to tangle or footnotes inside headings to not convert at all**.",
    },
    cause: {
      ko: "커스텀 heading renderer가 `marked-footnote` 확장보다 **먼저 실행**되어, heading 내부의 `[^1]`이 각주로 변환되기 전에 원본 텍스트로 소비되었습니다.",
      en: "The custom heading renderer executed **before** the `marked-footnote` extension, consuming raw `[^1]` text before it could be converted to footnotes.",
    },
    solution: {
      ko: "heading renderer를 제거하고 `postprocess` hook으로 대체. marked-footnote가 **먼저 모든 각주를 처리한 뒤** heading에 `id` 속성만 후처리합니다. `keepLabels: true`로 사용자 입력 번호도 유지합니다.",
      en: "Removed the heading renderer, replaced with a `postprocess` hook. marked-footnote **processes all footnotes first**, then headings get `id` attributes afterward. `keepLabels: true` preserves user-specified numbers.",
    },
    keyInsight: {
      ko: "marked 확장과 커스텀 renderer가 같은 구문을 처리할 때 **실행 순서가 결과를 결정**합니다. renderer 대신 postprocess hook을 사용하면 모든 확장이 먼저 처리됩니다.",
      en: "When marked extensions and custom renderers target the same syntax, **execution order determines the result**. A postprocess hook guarantees all extensions process first.",
    },
  },
  {
    section: { ko: "에디터 / 자동저장", en: "Editor / Auto-save" },
    problem: { ko: "글 자동저장을 \"브라우저 임시 저장\" 에서 \"서버 저장 + 버전 기록\" 으로 옮겼습니다", en: "Moving auto-save from \"browser-local\" to \"server with version history\"" },
    definition: {
      ko: "에디터에서 글을 작성하는 동안 일정 주기로 자동저장이 동작해야, 갑작스러운 브라우저 종료나 실수로 페이지를 닫아도 작업물이 사라지지 않습니다.\n\n초기에는 이 자동저장을 `localStorage` (브라우저가 자체적으로 가진 로컬 저장 공간) 에 직접 기록하도록 했는데, 시간이 지날수록 다음과 같은 문제가 차례로 드러났습니다.\n\n**① 다른 기기에서는 임시 저장이 보이지 않음** — 집 PC 에서 작성하던 글을 노트북에서 이어 쓰려고 진입해도 아무것도 남아 있지 않습니다.\n\n**② 새로고침만 해도 \"저장됨\" 알림이 표시됨** — 글 내용은 전혀 변경하지 않았는데 시스템이 \"변경됨\" 으로 판단해 매번 새 임시본을 생성합니다.\n\n**③ \"불러올까요?\" 알림이 무한 반복** — 에디터를 다시 열면 \"이전에 저장된 임시본을 불러올까요?\" 가 표시되는데, \"무시\" 를 눌러도 새로고침하면 동일한 내용으로 다시 묻습니다.",
      en: "While writing in the editor, drafts need to be auto-saved at regular intervals so that a sudden browser crash or accidental navigation doesn't lose work.\n\nInitially these temp saves went to `localStorage` (the browser's built-in local storage area), but over time several issues compounded:\n\n**① Drafts didn't follow you across devices or browsers** — a draft started on your home PC was invisible on your laptop.\n\n**② A plain refresh triggered \"saved\" notifications** — the content hadn't changed at all, but the system marked it as \"changed\" and created another temp save anyway.\n\n**③ Infinite \"Restore draft?\" prompts** — reopening the editor showed \"Restore the previous draft?\". Clicking \"dismiss\" worked once, but a refresh re-prompted with the same content.",
    },
    cause: {
      ko: "원인이 세 가지 겹쳐 있었습니다.\n\n**① localStorage 자체의 한계** — 말 그대로 \"같은 브라우저, 같은 기기\" 안에서만 접근됩니다. 다른 PC 나 모바일에서는 보이지 않는 것이 정상 동작입니다. 임시 저장을 환경 사이로 공유하려면 결국 서버에 저장하는 수밖에 없습니다.\n\n**② \"변경 없음\" 비교 기준이 처음부터 어긋나 있음** — 코드 안에서 \"마지막으로 저장된 내용\" 을 기억하는 변수의 초기값이 빈 문자열 `\"\"` 이었습니다. 그러나 실제 폼 상태를 JSON 으로 변환하면 비어 있어도 `\"{}\"` 가 되므로, 두 값이 다릅니다. 따라서 mount 직후부터 시스템은 \"변경됨\" 으로 판단했고, 새로고침 = 폼 mount 마다 매번 새 임시본이 생성되었습니다.\n\n**③ 사용자가 무시한 임시본을 어디에도 기록하지 않음** — 사용자가 \"불러오기\" 알림을 무시해도 임시본 자체는 DB 에 그대로 남습니다. 다음 진입 시 시스템은 동일한 임시본을 다시 발견하지만, \"새로 알려 주어야 할 것\" 인지 \"이미 무시된 것\" 인지 알 방법이 없어 또 알림을 띄웠습니다.",
      en: "Three causes compounded:\n\n**① A fundamental limitation of localStorage** — it's only accessible from the same browser on the same device. Drafts can't follow the user across PCs or mobile. To share drafts across environments, the data has to live on the server.\n\n**② The \"unchanged\" comparison was wrong** — the variable tracking \"last saved content\" started as an empty string `\"\"`, but `JSON.stringify(form)` produces `\"{}\"` even for an empty form. The two values differ, so from mount onward the system always thought the form was \"changed\", and every page load (= remount) generated a fresh temp save.\n\n**③ \"Dismissed drafts\" weren't remembered** — when the user dismissed a \"Restore draft?\" prompt, the draft itself stayed in the DB. On next entry, the system found the same draft and prompted again. \"User has already dismissed this one\" was nowhere to be found.",
    },
    solution: {
      ko: "①②③ 을 각각 해결했습니다.\n\n**① 저장소를 서버 DB 로 이전** — `localStorage` 사용을 완전히 제거하고, Supabase 의 `revisions` 테이블 (이전에 저장된 모든 임시본을 row 단위로 보관하는 \"버전 기록\" 테이블) 을 유일한 저장소로 변경했습니다. 이제 다른 기기에서 로그인하면 작성 중이던 글이 그대로 따라옵니다.\n\n**② 비교 기준값을 mount 시점의 실제 값으로 초기화** — \"마지막 저장된 내용\" 변수의 초기값을 빈 문자열이 아니라, **폼이 mount 된 직후의 실제 JSON 값** 으로 설정하도록 수정했습니다. 이로써 \"실제로 변경된 경우\" 만 자동저장이 트리거됩니다.\n\n**③ 무시된 임시본 추적** — 사용자가 \"무시\" 한 임시본의 식별값을 메모리상 `Set` (중복 없는 컬렉션) 에 저장합니다. 시스템이 동일한 임시본을 다시 발견해도 Set 에 이미 들어 있으면 알림을 표시하지 않습니다.\n\n**브라우저 종료 시점의 마지막 저장 보장** — 사용자가 브라우저를 닫거나 다른 페이지로 이동하는 짧은 순간에도 마지막 변경분이 유실되지 않도록, **`navigator.sendBeacon`** (브라우저 종료 중에도 서버로 데이터 전송을 안전하게 완료시키는 표준 API) 과 **`fetch({ keepalive: true })`** (페이지가 사라져도 요청을 끝까지 유지) 를 함께 사용합니다.",
      en: "Each cause got its own fix:\n\n**① Storage moved to a server DB** — `localStorage` is gone entirely. The sole source of truth is now Supabase's `revisions` table (a \"version history\" table that stores every saved draft as a row). Drafts follow the user across devices the moment they log in.\n\n**② Fixed the \"unchanged\" baseline** — the \"last saved content\" variable now initializes to the **actual serialized form right after mount**, not an empty string. Only real changes trigger an auto-save now.\n\n**③ Track dismissed drafts** — the IDs of dismissed drafts are kept in an in-memory `Set` (a unique collection). When the system finds the same draft again, it checks the Set first and skips the prompt if already dismissed.\n\n**Guaranteed final save on page leave** — for the moment the user closes the browser or navigates away, **`navigator.sendBeacon`** (a standard API that reliably sends data even during browser shutdown) and **`fetch({ keepalive: true })`** (which keeps the request alive after the page is gone) work together to land the final state.",
    },
    keyInsight: {
      ko: "자동저장의 본질은 \"언제 저장할까\" 보다 **\"언제 저장하지 않을까\"** 에 더 가깝습니다.\n\n비교 기준값만 정확히 초기화해도 ② \"변경 없는데 저장하는\" 경우가 사라지고, ③ \"사용자가 무시한 임시본은 다시 묻지 않도록\" 추적까지 더하면 **의미 있는 변경 시점만** 기록에 남게 됩니다.\n\n그렇지 않으면 한 시간 작업했을 때 \"단어 하나 추가\" 짜리 임시본이 수십 개씩 쌓여, 정작 되돌리고 싶은 시점을 찾을 수 없게 됩니다. 직관적으로는 \"많이 저장 = 안전\" 같지만, 실제로는 **\"의미 있는 시점만 저장 = 안전\"** 입니다.",
      en: "Auto-save is fundamentally less about **\"when to save\"** and more about **\"when NOT to save\"**.\n\nGet the baseline right so ② **\"save with no real change\"** stops, and ③ **dismissed drafts stay dismissed** — that's how only \"meaningful changes\" make it into the history.\n\nOtherwise, an hour of writing leaves dozens of \"added one word\" drafts piled up, and you can't find the checkpoint you actually wanted. The intuition \"save more = safer\" is wrong — the real principle is **\"save only meaningful moments = safer\"**.",
    },
    comparisons: [
      {
        label: { ko: "수정 전 / 수정 후", en: "Before / After" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "수정 전", en: "Before" },
          { ko: "수정 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "저장 위치", en: "Storage" }, { ko: "브라우저 localStorage", en: "Browser localStorage" }, { ko: "Supabase DB (revisions 테이블)", en: "Supabase DB (revisions table)" }] },
          { cells: [{ ko: "다른 기기에서 보기", en: "Cross-device" }, { ko: "✗ 불가능", en: "✗ Impossible" }, { ko: "✓ 로그인하면 따라옴", en: "✓ Follows the user" }] },
          { cells: [{ ko: "새로고침 시 동작", en: "On refresh" }, { ko: "내용 안 바뀌어도 저장", en: "Saves with no real change" }, { ko: "진짜 변화만 저장", en: "Only real changes save" }] },
          { cells: [{ ko: "\"불러오기\" 알림 무시 후", en: "After dismissing \"Restore?\"" }, { ko: "새로고침마다 또 물어봄", en: "Re-prompts on every reload" }, { ko: "한 번 무시하면 끝", en: "Stays dismissed" }] },
          { cells: [{ ko: "브라우저 닫기 직전 변경", en: "Edit just before close" }, { ko: "타이머 못 도달해 유실", en: "Lost — timer didn't fire" }, { ko: "sendBeacon 으로 보장 전송", en: "Guaranteed via sendBeacon" }], highlight: true },
          { cells: [{ ko: "1시간 작업 후 버전 수", en: "Versions after 1h work" }, { ko: "수십 개 (대부분 사소)", en: "Dozens (mostly trivial)" }, { ko: "의미 있는 변화 시점만", en: "Only meaningful moments" }] },
        ],
      } satisfies ComparisonTable,
    ],
    images: [
      {
        alt: { ko: "Admin 글 편집 화면 — 자동저장 인디케이터 + 리비전 히스토리 사이드 패널", en: "Admin editor — autosave indicator + revision history side panel" },
        placeholderKeyword: "Admin 글 편집 페이지 — \"방금 저장됨\" 인디케이터 + 우측 리비전 히스토리 목록",
      },
      {
        alt: { ko: "리비전 복원 prompt — 다른 기기 / 새로고침 시 \"이전 임시본 불러올까요?\" 확인 모달", en: "Restore prompt — \"Resume previous draft?\" modal on cross-device / refresh" },
        placeholderKeyword: "글 편집 페이지 진입 시 \"미저장 임시본이 있습니다\" 복원 prompt 모달",
      },
    ],
  },
  {
    section: { ko: "에디터 / 자동저장 (v2)", en: "Editor / Auto-save (v2)" },
    problem: { ko: "자동저장 v2 — 글자 단위 draft + 리비전을 명시적 save point 로 재정의", en: "Auto-save v2 — character-level draft + revisions as explicit save points" },
    definition: {
      ko: "v1 (이전 항목) 에서 자동저장을 서버 DB 로 옮기고 \"불러오기 모달\" 까지 정리했지만, 실제 사용 중 다시 두 가지 결함이 드러났습니다.\n\n**① 한 글자만 입력해도 리비전이 폭증** — 한 글자 입력 → 30s 타이머 → 리비전 생성 → 또 한 글자 → 또 리비전. 여기에 페이지 이탈 시 강제 저장 + 마지막 debounce 까지 동시에 호출되어 **같은 변경이 1~3개의 동일 row 로 중복 저장**되는 race 가 있었습니다.\n\n**② \"불러올까요?\" 모달이 여전히 거슬림** — v1 에서 \"무시 추적\" 으로 반복 노출은 막았지만, 모달 자체가 작성 흐름을 끊었습니다. Notion / Linear 처럼 **모달 없이 마지막 작성 상태가 자연스럽게 따라오는 경험** 이 더 좋겠다는 결론에 도달했습니다.",
      en: "v1 (previous entry) moved auto-save to the server DB and tamed the \"restore?\" modal, but two more flaws surfaced once the editor was actually used.\n\n**① Revision explosion on every keystroke** — single character → 30s timer → revision created → another character → another revision. Add the page-leave forced save + the last debounce firing together, and the **same change got saved 1–3 times as duplicate rows** (race condition).\n\n**② The \"Restore draft?\" modal still got in the way** — v1's \"dismissed tracking\" stopped re-prompts, but the modal itself broke the writing flow. Notion / Linear deliver a smoother experience by **silently resuming the last state with no modal at all**.",
    },
    cause: {
      ko: "**①** 의 본질은 \"draft (실시간 작업 보호)\" 와 \"revision (되돌릴 수 있는 시점)\" 이 같은 저장소를 공유한 것입니다. draft 는 한 글자마다 보호되어야 하는데 revision 까지 한 글자마다 만들어졌습니다. 게다가 cleanup + beforeunload + 늦게 도착한 debounce 타이머가 모두 stale `lastSavedJson` 으로 동시에 POST 하는 race 가 있었습니다.\n\n**②** 는 v1 에서 \"draft 가 있으면 사용자가 결정\" 으로 풀었지만, **\"사용자에게 매번 묻지 않는 것\"** 자체가 더 나은 UX 였습니다. 자동 복원이 의도하지 않은 행동일까 걱정했지만, 실제로는 \"어제 작성하던 글 그대로 이어 쓰기\" 가 자연스러운 기대치였습니다.",
      en: "**①** boils down to \"draft (live work protection)\" and \"revision (restorable checkpoint)\" sharing the same storage. Draft must be guarded per character — but revisions were also being created per character. On top of that, cleanup + beforeunload + a late-arriving debounce timer all POSTed with stale `lastSavedJson` concurrently, a textbook race.\n\n**②** got reasoned away in v1 with \"let the user decide if a draft exists\", but **not prompting at all** turned out to be the better UX. The worry was that silent restore might surprise users, but in practice \"keep writing where I left off yesterday\" is the natural expectation.",
    },
    solution: {
      ko: "**draft 와 revision 을 두 개의 다른 저장소로 명확히 분리**했습니다.\n\n- **continuous draft (localStorage)** — 폼이 바뀔 때마다 매번 즉시 저장. 페이지에 다시 진입하면 모달 없이 silent 하게 마지막 상태로 setForm. 사용자는 \"이어서 작성\" 만 경험합니다.\n- **DB revision (save point)** — 30s debounce + **10자 이상 변경분** 일 때만 생성. 이제 revision 은 \"되돌릴 만한 시점\" 이라는 의도가 명확해졌습니다. 페이지 이탈 시점에는 임계값과 무관하게 마지막 1개를 강제 저장 (sendBeacon / keepalive fetch) 해서 마지막 작업도 안전합니다.\n- **race 방지** — `savingRef` mutex 로 in-flight 저장 단일화, leave 핸들러는 POST 전에 baseline 을 선갱신해 중복 진입 시 \"변경 없음\" 으로 즉시 종료. cleanup 시 pending debounce 타이머도 clear.\n\n실제 저장 (publish / draft 저장) 후에는 더 이상 \"dismissed\" 추적이 필요 없어 v1 의 Set 기반 코드도 함께 삭제했습니다.",
      en: "**Split draft and revision into two distinct stores.**\n\n- **Continuous draft (localStorage)** — saves on every form change. On re-entry, silent `setForm` with the last state — no modal. The user just experiences \"keep writing\".\n- **DB revision (save point)** — only created when 30s debounce passes **AND** the diff is ≥ 10 characters. \"Revision\" now means \"a checkpoint worth restoring\". On page leave, force one final save regardless of threshold (sendBeacon / keepalive fetch) — final edit is safe.\n- **Race prevention** — `savingRef` mutex serializes in-flight saves; leave handlers update the baseline BEFORE POSTing so re-entries short-circuit on \"no change\". Pending debounce timers are cleared on cleanup.\n\nAfter a real save (publish / draft), the v1 \"dismissed tracking\" Set is no longer needed — that code was removed too.",
    },
    keyInsight: {
      ko: "**한 번 리팩토링한 시스템이라도 정작 써 보면 다시 결함이 보입니다.**\n\nv1 의 핵심 교훈이 \"의미 있는 변경 시점만 저장하기\" 였다면, v2 는 **\"저장의 목적이 다르면 저장소도 다르게\"** 입니다. \"실시간 보호\" 와 \"되돌릴 시점\" 은 같은 도메인 같지만 요구하는 빈도 · 영속성 · 접근 방식이 다릅니다. 한 곳에 묶으면 둘 중 하나는 반드시 어색해집니다.\n\n그리고 \"사용자에게 선택을 주는 것 = 친절\" 이라는 기본 가정도 다시 점검할 필요가 있습니다. **자연스러운 기본 동작이 모달보다 친절할 때가 많습니다.**",
      en: "**Even a 'refactored' system shows new flaws once you actually live in it.**\n\nIf v1's lesson was \"save only meaningful moments\", v2's is **\"if the purpose differs, the store should differ\"**. \"Live protection\" and \"restorable checkpoint\" sound like the same domain, but their required frequency, durability, and access patterns differ. Bundle them, and one of the two ends up awkward.\n\nIt's also worth rechecking the default assumption that \"giving users a choice = kindness\". **A natural default is often kinder than a modal.**",
    },
    comparisons: [
      {
        label: { ko: "v1 (이전 항목) / v2 (현재)", en: "v1 (previous) / v2 (now)" },
        headers: [
          { ko: "관점", en: "Aspect" },
          { ko: "v1", en: "v1" },
          { ko: "v2", en: "v2" },
        ],
        rows: [
          { cells: [{ ko: "draft 저장소", en: "Draft storage" }, { ko: "Supabase revisions 테이블", en: "Supabase revisions" }, { ko: "localStorage (글자 단위)", en: "localStorage (per char)" }] },
          { cells: [{ ko: "revision 저장 빈도", en: "Revision frequency" }, { ko: "변경 감지 시마다", en: "On every detected change" }, { ko: "30s + 10자 이상", en: "30s + ≥10 char delta" }] },
          { cells: [{ ko: "revision 의 의미", en: "Revision semantics" }, { ko: "임시본", en: "Temp save" }, { ko: "되돌릴 수 있는 save point", en: "Restorable checkpoint" }] },
          { cells: [{ ko: "재진입 시 UX", en: "Re-entry UX" }, { ko: "\"불러올까요?\" 모달", en: "\"Restore?\" modal" }, { ko: "silent 자동 복원", en: "Silent auto-restore" }] },
          { cells: [{ ko: "한 글자 입력 시 row 수", en: "Rows per keystroke" }, { ko: "1~3 (race)", en: "1–3 (race)" }, { ko: "0 (글자별로는 만들지 않음)", en: "0 (not per char)" }], highlight: true },
          { cells: [{ ko: "마지막 편집 보장", en: "Final-edit guarantee" }, { ko: "sendBeacon", en: "sendBeacon" }, { ko: "sendBeacon + baseline 선갱신 mutex", en: "sendBeacon + pre-baselined mutex" }] },
        ],
      } satisfies ComparisonTable,
    ],
  },
  {
    section: { ko: "에디터 / 직렬화", en: "Editor / Serialization" },
    problem: { ko: "열블록 스타일 round-trip 유실", en: "Column Block Styles Lost on Round-Trip" },
    definition: {
      ko: "2열/3열 레이아웃 블록의 **배경색, 구분선, 열 비율** 등이 richtext→markdown→richtext 변환 시 모두 사라졌습니다.",
      en: "Column layout blocks lost **background color, dividers, and column ratios** when converting between richtext and markdown formats.",
    },
    cause: {
      ko: "Plate Column 노드의 `layout`, `columnBg`, `columnDivider` 같은 커스텀 속성은 표준 HTML에 대응하는 개념이 없어, 단순 `<div>` 변환 시 **커스텀 속성이 모두 탈락**했습니다.",
      en: "Plate Column node custom attributes like `layout`, `columnBg`, `columnDivider` have no standard HTML equivalent, so simple `<div>` conversion **dropped all custom attributes**.",
    },
    solution: {
      ko: "직렬화 시 HTML 주석 + `data-*` 속성으로 이중 인코딩하여 round-trip 보존. 주석이 제거되더라도 `data-*`에서 복원 가능하도록 설계했습니다.",
      en: "Dual encoding with HTML comments + `data-*` attributes during serialization. Even if comments are stripped, recovery is possible from `data-*` attributes.",
    },
    keyInsight: {
      ko: "표준 HTML에 없는 에디터 고유 속성은 직렬화 시 **명시적으로 인코딩**해야 round-trip이 보존됩니다. `data-*` + HTML 주석 이중 저장으로 강건성을 확보할 수 있습니다.",
      en: "Editor-specific attributes not in standard HTML must be **explicitly encoded** during serialization for round-trip preservation. Dual `data-*` + HTML comment storage provides robustness.",
    },
  },
  {
    section: { ko: "에디터 / 미디어", en: "Editor / Media" },
    problem: { ko: "YouTube embed URL — watch URL이 iframe에서 로드 실패", en: "YouTube Embed URL — Watch URL Fails to Load in iframe" },
    definition: {
      ko: "에디터에서 YouTube `watch?v=xxx` URL을 입력하면 에디터 안에서는 보이지만, **게시물 디테일 페이지에서 빈 화면**이 표시되었습니다.",
      en: "Entering a YouTube `watch?v=xxx` URL in the editor displayed correctly inside the editor, but showed **a blank screen on the published post detail page**.",
    },
    cause: {
      ko: "에디터 내부 `parseEmbed()`는 watch→embed 변환을 하지만, `plateSerializer`는 노드의 원본 URL을 그대로 `<iframe src>`에 직렬화합니다. **에디터와 DB 저장 URL이 달라** iframe이 로드에 실패했습니다.",
      en: "The editor's `parseEmbed()` converts watch→embed URLs, but `plateSerializer` serializes the node's original URL into `<iframe src>` as-is. **The editor and DB URLs diverged**, causing iframe load failures.",
    },
    solution: {
      ko: "`fixEmbedUrls()` 유틸리티로 HTML 렌더링 직전에 **iframe src의 watch/shorts URL을 embed URL로 일괄 변환**. 디테일 페이지와 미리보기 양쪽에 적용했습니다.",
      en: "Created `fixEmbedUrls()` utility to **bulk-convert iframe src watch/shorts URLs to embed URLs** just before HTML rendering. Applied to both detail and preview pages.",
    },
    keyInsight: {
      ko: "에디터 런타임 변환과 직렬화 사이의 **URL 불일치**는 '에디터에서는 보이는데 실제 페이지에서 안 보이는' 버그를 만듭니다. 렌더링 직전 URL 정규화 후처리로 해결할 수 있습니다.",
      en: "A URL mismatch between editor runtime conversion and serialization creates 'works in editor, broken on page' bugs. A URL normalization post-processing step before rendering resolves this.",
    },
  },
  {
    section: { ko: "에디터 / UI", en: "Editor / UI" },
    problem: { ko: "커스텀 커서 리사이즈 모드에서 마우스 방향에 따라 커서 회전", en: "Custom Cursor Rotates with Mouse Direction in Resize Mode" },
    definition: {
      ko: "이미지·열블록 리사이즈 핸들에 커스텀 커서(↔, ↕, ⤡)를 적용했더니, **마우스 이동 방향에 따라 커서가 회전·찌그러짐**이 발생했습니다.",
      en: "After applying custom cursors (↔, ↕, ⤡) to image/column resize handles, **the cursor rotated and distorted** based on mouse movement direction.",
    },
    cause: {
      ko: "CursorTrail 애니메이션 루프가 마우스 속도 기반 `angleRef`(회전)·`scaleRef`(스케일)를 계산하는데, 리사이즈 모드 진입 시 이전 값이 남아있었고, classList 기반 감지는 React 렌더 타이밍과 1~2프레임 어긋났습니다.",
      en: "The CursorTrail animation loop calculated `angleRef`/`scaleRef` from mouse velocity, but previous values persisted on resize entry. classList-based detection was also 1-2 frames behind React render timing.",
    },
    solution: {
      ko: "`cursorTypeRef`(동기 ref)를 추가하여 `setCursorType`과 동시에 갱신하고, 리사이즈 진입 시 즉시 리셋. 애니메이션 루프에서 ref로 리사이즈 여부를 판단하여 회전·스케일을 비활성화했습니다.",
      en: "Added `cursorTypeRef` (synchronous ref) updated with `setCursorType`, immediately resetting on resize entry. The animation loop checks the ref to disable rotation/scale in resize mode.",
    },
    keyInsight: {
      ko: "React state 기반 감지는 렌더 지연이 있으므로, **requestAnimationFrame 루프에서는 동기 ref**를 사용해야 프레임 정확도를 보장할 수 있습니다.",
      en: "React state detection has render delays, so **synchronous refs are needed in requestAnimationFrame loops** to guarantee frame-accurate detection.",
    },
  },
  {
    section: { ko: "에디터 / 이미지", en: "Editor / Image" },
    problem: { ko: "이미지 리사이즈 핸들 클릭 시 이미지가 삭제됨", en: "Image Resize Handle Click Deletes Image" },
    definition: {
      ko: "인라인 이미지의 리사이즈 핸들을 클릭하면 **리사이즈가 아닌 이미지 삭제**(DnD 드롭)가 발생했습니다.",
      en: "Clicking an inline image's resize handle triggered **image deletion (DnD drop)** instead of resize.",
    },
    cause: {
      ko: "인라인 이미지의 `onPointerDown`이 DnD 드래그를 시작하는데, 리사이즈 핸들 위의 클릭도 가로채서 드래그→드롭으로 처리했습니다.",
      en: "The inline image's `onPointerDown` initiates DnD drag, intercepting resize handle clicks and processing them as drag→drop.",
    },
    solution: {
      ko: "`closest(\"[data-cursor^='resize']\")` 체크로 리사이즈 핸들 클릭 시 DnD 비활성화. 히트박스와 시각적 핸들을 별개 sibling으로 분리하여 독립 조정이 가능하도록 했습니다.",
      en: "Added `closest(\"[data-cursor^='resize']\")` check to disable DnD on resize handle clicks. Separated hitboxes and visual handles into independent siblings for independent positioning.",
    },
    keyInsight: {
      ko: "인라인 void 요소에서 **DnD와 리사이즈는 동일한 포인터 이벤트를 공유**하므로, 이벤트 타겟 기반 분기가 필수적입니다.",
      en: "In inline void elements, **DnD and resize share the same pointer events**, making event-target-based branching essential.",
    },
  },
  {
    section: { ko: "에디터 / UI", en: "Editor / UI" },
    problem: { ko: "에디터 툴바 active 상태 — wrapper 블록 감지 실패", en: "Editor Toolbar Active State — Wrapper Block Detection Failure" },
    definition: {
      ko: "blockquote, code block, table 안에 커서를 놓아도 **메인 툴바의 해당 버튼이 active 스타일로 바뀌지 않았습니다**.",
      en: "Placing cursor inside blockquote, code block, or table **didn't activate the corresponding toolbar button**.",
    },
    cause: {
      ko: "`useBlockInfo` 훅이 `editor.api.block()`으로 가장 가까운 블록을 가져오는데, wrapper 블록 안의 자식 블록(`p`, `code_line`)이 먼저 반환되어 실제 블록 타입과 불일치했습니다.",
      en: "`useBlockInfo` uses `editor.api.block()` to get the nearest block, but child blocks (`p`, `code_line`) inside wrapper blocks are returned first, mismatching the actual block type.",
    },
    solution: {
      ko: "`blockType`이 `p`/`code_line`일 때 `editor.api.above()`로 `[\"blockquote\", \"code_block\", \"table\"]`을 순회하여 상위 wrapper 블록을 탐색하고 `blockType`을 갱신했습니다.",
      en: "When `blockType` is `p`/`code_line`, traverse `[\"blockquote\", \"code_block\", \"table\"]` via `editor.api.above()` to find parent wrapper blocks and update `blockType`.",
    },
    keyInsight: {
      ko: "Slate 에디터에서 **`api.block()`은 leaf-level 블록을 반환**하므로, nested 구조에서는 `api.above()`로 wrapper를 별도 탐색해야 합니다.",
      en: "In Slate editors, **`api.block()` returns leaf-level blocks**, so nested structures require separate `api.above()` traversal for wrapper detection.",
    },
  },
  {
    section: { ko: "에디터 / 각주", en: "Editor / Footnote" },
    problem: { ko: "각주 참조/내용 정합성 — 한쪽 삭제 시 고아 노드 잔존", en: "Footnote Ref/Content Integrity — Orphan Nodes After Partial Deletion" },
    definition: {
      ko: "각주 참조(`footnote_ref`)를 삭제해도 하단 각주 내용이 남아있고, 반대의 경우도 마찬가지였습니다.",
      en: "Deleting a footnote reference left the content block at the bottom, and vice versa.",
    },
    cause: {
      ko: "Plate의 `normalizeNode`는 `footnoteId` 기반 연결 관계를 인식하지 못하여 한쪽 삭제 시 다른 쪽이 유지되었습니다.",
      en: "Plate's `normalizeNode` doesn't recognize `footnoteId`-based relationships, so deleting one side left the other intact.",
    },
    solution: {
      ko: "별도 `useEffect` + 300ms debounce로 고아 노드를 역순 삭제. `normalizeNode` 내부에서 직접 삭제 시 path 에러가 발생하여 effect로 분리했습니다.",
      en: "Separate `useEffect` with 300ms debounce deletes orphan nodes in reverse order. Direct deletion inside `normalizeNode` caused path errors, requiring the effect-based approach.",
    },
    keyInsight: {
      ko: "`normalizeNode` 안에서 다른 노드를 삭제하면 **path shift로 인해 `Cannot find a descendant` 에러**가 발생합니다. 비동기 effect로 분리하면 안전합니다.",
      en: "Deleting other nodes inside `normalizeNode` causes **`Cannot find a descendant` errors due to path shifts**. Separating into an async effect is safer.",
    },
  },
  {
    section: { ko: "에디터 / 선택", en: "Editor / Selection" },
    problem: { ko: "다중 블록 선택 배경이 float 이미지를 덮음 — z-index·flow-root·clip-path 모두 부적합", en: "Multi-block Selection Background Covers Floated Image — z-index, flow-root, clip-path All Fall Short" },
    definition: {
      ko: "여러 블록을 드래그로 선택하면 블록마다 옅은 배경 하이라이트를 깔아주는데, 좌·우로 텍스트를 감싸는(float) 이미지가 들어간 블록에서는 그 배경이 **이미지 위까지 덮어** 이미지가 가려졌습니다.",
      en: "Dragging across multiple blocks paints a faint background highlight on each block, but in a block containing a text-wrapping (float) image, that background **painted over the image itself**, hiding it.",
    },
    cause: {
      ko: "CSS `float` 이미지는 본문 블록의 box 흐름 안에 포함됩니다. 블록 전체에 배경을 깔면 이미지가 차지하는 영역까지 함께 칠해집니다. `z-index`로 이미지를 위로 올리면 디자인상 배경이 텍스트와 같은 평면이어야 한다는 의도가 깨지고, `display: flow-root`로 BFC를 만들면 텍스트 wrap 자체가 사라지며, `clip-path`로 이미지 영역을 도려내면 배경의 `border-radius`를 유지할 수 없었습니다.",
      en: "A CSS `float` image lives inside the content block's box flow, so a background on the whole block also covers the image's area. Raising the image with `z-index` broke the design intent (background must sit on the same plane as text), `display: flow-root` (a BFC) killed the text wrap entirely, and `clip-path` carving out the image area couldn't preserve the background's `border-radius`.",
    },
    solution: {
      ko: "배경을 단일 box가 아니라 `::before`/`::after` **두 개의 사각형으로 분리**했습니다. `ResizeObserver` + `MutationObserver(childList)` + 이미지 `load`로 이미지 rect를 측정해 CSS 변수(`--a-*`=이미지 옆 영역, `--b-*`=이미지 아래 영역)로 주입 — 각 사각형이 자기 `border-radius`를 그대로 유지한 채 이미지를 피해서 칠합니다. 더불어 `[data-multiblock] ::selection`을 transparent로 덮어 드래그 중 텍스트가 accent 색으로 물드는 글로벌 `::selection` 규칙도 차단했습니다.",
      en: "Split the background from one box into **two rectangles via `::before`/`::after`**. `ResizeObserver` + `MutationObserver(childList)` + image `load` measure the image rect and feed it into CSS variables (`--a-*` = area beside the image, `--b-*` = area below it) — each rectangle keeps its own `border-radius` while painting around the image. Also overrode `[data-multiblock] ::selection` to transparent to block the global `::selection` rule that was tinting dragged text with the accent color.",
    },
    keyInsight: {
      ko: "`float`은 본문 박스 흐름에 묶여 있어 \"이미지를 피하는 배경\"을 단일 요소로는 만들 수 없습니다. **영역을 실제로 둘로 쪼개고 layout을 관찰해 변수로 주입**하는 방식이 radius까지 보존하는 유일한 해법이었습니다. 정공법(z-index/BFC/clip-path)이 모두 디자인 제약에 막힐 때는 '문제의 형태' 자체를 바꿔야 합니다.",
      en: "Because `float` is bound to the content box flow, you can't build a \"background that avoids the image\" as one element. **Physically splitting the region in two and feeding observed layout into variables** was the only approach that also preserved the radius. When every textbook fix (z-index / BFC / clip-path) hits a design constraint, you have to change the shape of the problem itself.",
    },
  },
  {
    section: { ko: "에디터 / 선택", en: "Editor / Selection" },
    problem: { ko: "float 이미지(인라인 void) 클릭이 엉뚱한 본문 단락을 선택", en: "Clicking a Floated Image (Inline Void) Selects the Wrong Paragraph" },
    definition: {
      ko: "float 레이아웃 이미지를 클릭하면 이미지가 아니라 그 아래에 깔린 본문 단락(p/li)이 선택되어, floating 툴바가 엉뚱한 위치에 떴습니다.",
      en: "Clicking a floated image selected the underlying paragraph (p/li) instead of the image, so the floating toolbar appeared in the wrong place.",
    },
    cause: {
      ko: "이미지는 inline void 노드라 float 되면 본문 텍스트와 같은 평면에 겹쳐 흐릅니다. 클릭 시 `event.target`이 시각적으로 위에 있는 이미지가 아니라 흐름상 그 자리를 차지한 `LI`/`p`로 잡혔습니다(진단 로그로 `[imgclick] {tag:'LI'} node{type:'p'}` 확인).",
      en: "An image is an inline void node, so when floated it overlaps the same plane as the body text. On click, `event.target` resolved to the `LI`/`p` that occupies that spot in the flow — not the visually-on-top image (confirmed via diagnostic log `[imgclick] {tag:'LI'} node{type:'p'}`).",
    },
    solution: {
      ko: "PlateEditor의 capture-phase mousedown 핸들러에서 `document.elementsFromPoint`로 클릭 지점의 요소 스택을 훑어 이미지 wrapper를 먼저 찾고, `ReactEditor.toSlateNode`로 그 노드를 직접 선택합니다(캡션 영역은 `[data-img-caption]`으로 제외). 스크롤 위치도 보존합니다.",
      en: "In PlateEditor's capture-phase mousedown handler, walk the element stack at the click point with `document.elementsFromPoint` to find the image wrapper first, then select that node directly via `ReactEditor.toSlateNode` (caption area excluded by `[data-img-caption]`), preserving scroll position.",
    },
    keyInsight: {
      ko: "`float`된 inline void는 **시각적 위치와 흐름상 위치가 어긋나** `event.target`이 직관과 다르게 잡힙니다. 좌표 기반 `elementsFromPoint`로 z-순서 스택을 직접 읽어야 \"보이는 것\"을 선택할 수 있습니다.",
      en: "A floated inline void has a **mismatch between its visual position and its flow position**, so `event.target` lands somewhere unintuitive. Reading the z-order stack directly with coordinate-based `elementsFromPoint` is what lets you select \"what's visible.\"",
    },
  },
  {
    section: { ko: "에디터 / 링크", en: "Editor / Link" },
    problem: { ko: "링크 클릭 시 즉시 이동 — 에디터에서 링크 편집 불가", en: "Link Click Immediately Navigates — Cannot Edit Links in Editor" },
    definition: {
      ko: "에디터 안의 링크를 클릭하면 즉시 새 탭으로 이동하여 **URL 수정이나 텍스트 편집이 불가능**했습니다.",
      en: "Clicking a link in the editor immediately opened a new tab, making **URL editing or text changes impossible**.",
    },
    cause: {
      ko: "`LinkElement`의 `onClick`이 `window.open()`을 바로 호출하여 에디터 내 커서 배치가 불가능했습니다.",
      en: "`LinkElement`'s `onClick` directly called `window.open()`, preventing cursor placement inside the link.",
    },
    solution: {
      ko: "클릭 → 링크 편집 툴바 자동 표시, 더블클릭 → 새 탭 이동. `currentLinkKey`(path 기반)로 링크→링크 이동 시 깜빡임 방지 + 에디터 본문 클릭을 무시하는 커스텀 outside-click 핸들러 적용.",
      en: "Single click shows link edit toolbar, double click navigates. `currentLinkKey` (path-based) prevents flickering on link-to-link navigation + custom outside-click handler ignores editor content clicks.",
    },
    keyInsight: {
      ko: "에디터 내 인터랙티브 요소는 **클릭=편집, 더블클릭=실행** 패턴이 자연스럽습니다. `useOutsideClick`은 에디터 본문 클릭도 '바깥'으로 감지하므로 커스텀 핸들러가 필요합니다.",
      en: "For interactive elements in editors, **click=edit, double-click=execute** is the natural pattern. `useOutsideClick` detects editor content clicks as 'outside', requiring a custom handler.",
    },
  },
  {
    section: { ko: "CSS / 디자인 토큰", en: "CSS / Design Tokens" },
    problem: { ko: "CSS 토큰 미정의 — 11개 파일에서 참조하지만 선언 없음", en: "Undefined CSS Token — Referenced in 11 Files but Never Declared" },
    definition: {
      ko: "`--box-3xs-xs` 토큰을 11개 CSS 파일에서 `padding: var(--box-3xs-xs)`로 사용하고 있었지만, `_spacing.css`에 실제 정의가 없어 **해당 padding이 모두 무시**되고 있었습니다.",
      en: "The `--box-3xs-xs` token was used as `padding: var(--box-3xs-xs)` across 11 CSS files, but was **never defined** in `_spacing.css` — causing all those paddings to silently fail.",
    },
    cause: {
      ko: "CSS 토큰 감사 과정에서 `padding: var(--spacing-3xs) var(--spacing-xs)` (2px 8px)를 box shorthand `var(--box-3xs-xs)`로 일괄 치환했으나, `_spacing.css`의 Compound 블록에 해당 토큰 정의를 추가하지 않았습니다. CSS `var()`는 미정의 시 오류 없이 해당 선언을 무효화하므로 **빌드·타입체크에서 감지되지 않았습니다**.",
      en: "During a CSS token audit, `padding: var(--spacing-3xs) var(--spacing-xs)` (2px 8px) was batch-replaced with the box shorthand `var(--box-3xs-xs)`, but the token definition was never added to the Compound block in `_spacing.css`. CSS `var()` silently invalidates declarations when undefined — **undetectable by build or typecheck**.",
    },
    solution: {
      ko: "`_spacing.css`에 `--box-3xs-xs: var(--spacing-3xs) var(--spacing-xs)` 정의를 추가했습니다. 향후 토큰 치환 시 **사용 파일 grep → 정의 파일 확인** 2단계 검증을 수행합니다.",
      en: "Added `--box-3xs-xs: var(--spacing-3xs) var(--spacing-xs)` to `_spacing.css`. Future token replacements follow a two-step verification: **grep for usage → confirm definition exists**.",
    },
    keyInsight: {
      ko: "CSS custom property는 **미정의 시 silent fail** — 해당 선언만 무효화되고 에러가 발생하지 않습니다. 토큰 일괄 치환 후 반드시 **정의 존재 여부를 역검증**해야 합니다. stylelint의 `custom-property-no-missing-var-declare` 규칙을 도입하면 CI에서 자동 감지할 수 있습니다.",
      en: "CSS custom properties **silently fail when undefined** — declarations are invalidated without errors. After batch token replacement, always **reverse-verify that definitions exist**. stylelint's `custom-property-no-missing-var-declare` rule can catch this in CI.",
    },
  },
  {
    section: { ko: "Frontend / Performance", en: "Frontend / Performance" },
    problem: { ko: "LoadingScreen이 SSR에 포함되지 않아 콘텐츠 flash 발생", en: "LoadingScreen Not Included in SSR — Content Flash Before Loading" },
    definition: {
      ko: "페이지 로드 시 콘텐츠가 잠깐 보인 후에 로딩 화면(검은 배경)이 나타났습니다. design-system 등 클라이언트 렌더링 비중이 큰 페이지에서 특히 눈에 띄었습니다.",
      en: "Page content briefly flashed before the loading screen (black backdrop) appeared. Especially noticeable on client-heavy pages like design-system.",
    },
    cause: {
      ko: "`LoadingScreen`이 `ClientOverlays` 안에서 `dynamic(() => import(...), { ssr: false })`로 불러와져 **서버 HTML에 포함되지 않았습니다**. 브라우저가 JS 번들을 로드하고 React 하이드레이션이 완료된 후에야 `LoadingScreen`이 마운트되어, 그 사이 콘텐츠가 노출되었습니다.",
      en: "`LoadingScreen` was loaded inside `ClientOverlays` using `dynamic(() => import(...), { ssr: false })`, **excluding it from server HTML**. The browser displayed page content immediately, and `LoadingScreen` only mounted after JS bundle load + React hydration.",
    },
    solution: {
      ko: "`LoadingScreen`만 일반 `import`로 변경하여 서버 HTML에 포함되도록 수정했습니다. `useLoadingScreen()` 훅의 초기값이 `isLoading: true`이므로 SSR 시점에 `opacity: 1` 검은 배경이 HTML에 포함됩니다. 나머지 오버레이(Modal, CursorTrail 등)는 서버 렌더가 불필요하므로 `ssr: false` 유지.",
      en: "Changed `LoadingScreen` to a regular `import` so it's included in server HTML. Since `useLoadingScreen()` initializes with `isLoading: true`, the black backdrop renders at `opacity: 1` in SSR output. Other overlays (Modal, CursorTrail) remain `ssr: false`.",
    },
    keyInsight: {
      ko: "`dynamic({ ssr: false })`는 서버 HTML에서 **완전히 제외**됩니다. 로딩 화면처럼 **초기 렌더 시 반드시 보여야 하는 컴포넌트**는 SSR에 포함시키고, 초기값으로 올바른 상태를 렌더해야 합니다. `useState` 초기값이 서버와 클라이언트에서 동일하면 하이드레이션 불일치 없이 안전합니다.",
      en: "`dynamic({ ssr: false })` **completely excludes** the component from server HTML. Components that **must be visible on initial render** (like loading screens) should be included in SSR, with correct initial state. If `useState` initializer returns the same value on server and client, there's no hydration mismatch.",
    },
  },
  {
    section: { ko: "Frontend / CSS", en: "Frontend / CSS" },
    problem: {
      ko: "CTA 버튼 `backdrop-filter`가 Chrome에서 동작하지 않음",
      en: "CTA Button `backdrop-filter` Not Working in Chrome",
    },
    definition: {
      ko: "홈 화면 CTA 섹션의 \"Contact / Resume\" 버튼은 호버 시 뒤쪽 3D 커피잔이 흐릿하게 비치는 \"유리창 너머\" 효과 (`backdrop-filter: blur()`) 를 사용합니다.\n\n그런데 Chrome 에서만 이 효과가 **전혀 표시되지 않았습니다.** 단순한 반투명 tint 만 약하게 깔리는 정도였습니다. DevTools \"Computed\" 탭에서 `backdrop-filter` 속성은 분명히 적용되어 있는데, 실제 blur 가 발생하는 단계 (\"sampling\") 가 동작하지 않은 것입니다.",
      en: "The home page CTA section's \"Contact / Resume\" buttons use a \"glass through which the 3D coffee cup behind blurs\" effect (`backdrop-filter: blur()`) on hover.\n\nIn Chrome only, **the blur was completely invisible** — just a faint translucent tint. DevTools Computed showed the `backdrop-filter` property applied, yet no actual sampling occurred.",
    },
    cause: {
      ko: "홈 진입 애니메이션이 `.home` 래퍼를 `y: '100vh' → 0` 으로 슬라이드 업 하는 **transform 기반** 이었습니다.\n\n애니메이션이 종료된 후에도 framer-motion 이 `transform: translate3d(0,0,0)` 와 `will-change` hint 를 그대로 유지합니다. 사소해 보이지만 이것이 결정적이었습니다. **`.home` 이 자체 compositing layer (브라우저가 내부적으로 별도 GPU 텍스처로 분리해 그리는 layer) 로 승격되는 트리거** 가 되기 때문입니다.\n\n일단 layer 가 분리되면, 내부 자식의 `backdrop-filter` 는 해당 layer **안의 픽셀만** 샘플링할 수 있습니다. layer 바깥에 있는 픽셀 (= 그 아래의 3D 커피 canvas) 은 \"뒤에 아무것도 없는 것\" 으로 처리되므로, blur 자체는 동작하지만 \"비빌 대상\" 이 없어 결과적으로 보이지 않게 됩니다.\n\n추가로 `-webkit-backdrop-filter` 접두사가 환경에 따라 Chrome 의 declaration 파싱을 꼬이게 만드는 경우도 있어 효과를 더 약화시켰습니다.",
      en: "The home entrance animation slid the `.home` wrapper up via a **transform-based** `y: '100vh' → 0`.\n\nAfter the animation finished, framer-motion kept the `transform: translate3d(0,0,0)` and `will-change` hint in place. That sounds harmless, but it's enough to **promote `.home` into its own compositing layer** (a separate GPU texture, internally).\n\nOnce that happens, a descendant's `backdrop-filter` can only sample **inside that layer's boundary** — pixels outside, like the 3D coffee canvas below, are treated as if there's nothing there.\n\nOn top of that, the `-webkit-backdrop-filter` prefix can confuse Chrome's declaration parser in some environments, weakening the effect further.",
    },
    solution: {
      ko: "진입 애니메이션을 **`y` (transform 기반) → `marginTop` (layout 기반)** 으로 교체했습니다.\n\nmargin / padding / width 같은 layout 속성은 GPU 가 아니라 CPU 에서 처리되며 compositing layer 를 생성하지 않습니다. 따라서 `.home` 이 다시 일반 layer 로 돌아오고, 하위 버튼의 `backdrop-filter` 가 layer 경계 너머의 커피 canvas 까지 정상적으로 샘플링하게 됩니다.\n\n또한 layer 를 분리하는 다른 트리거 (예: `.home` 의 `border-radius` + `overflow: clip` 조합) 도 함께 정리하고, `-webkit-backdrop-filter` 접두사는 제거했습니다. 최신 Chrome 은 표준 `backdrop-filter` 만으로 충분히 동작합니다.",
      en: "Swapped the entrance from **`y` (transform-based) → `marginTop` (layout-based)**.\n\nLayout properties — margin, padding, width — run on the CPU and don't promote a compositing layer. With that change, `.home` falls back to a normal layer, and descendants' `backdrop-filter` can sample the coffee canvas behind the layer boundary again.\n\nAdditionally removed other promotion triggers like `.home`'s `border-radius` + `overflow: clip` combo, and dropped `-webkit-backdrop-filter` (modern Chrome only needs the standard `backdrop-filter`).",
    },
    keyInsight: {
      ko: "`backdrop-filter` 는 요소와 **동일한 compositing layer 안에 있는 배경만** 샘플링할 수 있습니다.\n\n조상 중 어느 하나라도 `transform`, `will-change: transform`, `filter`, `mask`, `isolation: isolate` 등으로 layer 를 분리하면, 그 경계 너머의 배경은 \"존재하지 않는 것\" 으로 처리됩니다.\n\n버튼 호버처럼 국소적인 blur 가 동작하지 않을 때는, filter 자체를 의심하기 전에 **조상 경로 어디에도 layer 승격 속성이 끼어 있지 않은지** 먼저 확인하는 것이 효율적입니다.\n\n또한 transform 기반 애니메이션은 종료 후에도 compositing hint 를 남기는 경우가 많으므로, 한 번만 실행되는 진입 애니메이션이라면 **layout 속성 (margin / padding / width) 으로 대체 가능한지** 검토할 가치가 있습니다.",
      en: "`backdrop-filter` can only sample the backdrop **within the same compositing layer** as the element.\n\nIf any ancestor promotes itself via `transform`, `will-change: transform`, `filter`, `mask`, `isolation: isolate`, etc., the backdrop beyond that boundary is treated as nonexistent.\n\nFor localized blur effects (like hover), **verify nothing in the ancestor chain has a layer-promoting property** before debugging the filter itself.\n\nAnd transform-based animations often leave compositing hints behind even after they finish — for one-shot entrance animations, it's worth asking whether **layout properties (margin, padding, width) can replace them**.",
    },
    comparisons: [
      {
        label: { ko: "수정 전 / 수정 후", en: "Before / After" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "수정 전", en: "Before" },
          { ko: "수정 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "진입 애니메이션 속성", en: "Entrance animation property" }, { ko: "y (transform 기반)", en: "y (transform-based)" }, { ko: "marginTop (layout 기반)", en: "marginTop (layout-based)" }] },
          { cells: [{ ko: "별도 GPU layer 생성", en: "Promotes a GPU layer" }, { ko: "✓ 됨 (compositing layer)", en: "✓ Yes (compositing layer)" }, { ko: "✗ 안 됨", en: "✗ No" }] },
          { cells: [{ ko: "Chrome 호버 blur", en: "Chrome hover blur" }, { ko: "✗ 안 보임", en: "✗ Not visible" }, { ko: "✓ 정상 표시", en: "✓ Works" }] },
          { cells: [{ ko: "vendor prefix", en: "Vendor prefix" }, { ko: "-webkit-backdrop-filter 포함", en: "-webkit-backdrop-filter included" }, { ko: "표준 속성만 (제거)", en: "Standard only (removed)" }] },
          { cells: [{ ko: "유리창 너머 커피 canvas 효과", en: "\"Glass over coffee canvas\" effect" }, { ko: "단순 반투명 tint 만", en: "Just a faint tint" }, { ko: "실제 blur 동작", en: "Real blur behavior" }], highlight: true },
        ],
      } satisfies ComparisonTable,
    ],
    images: [
      {
        // 홈 페이지 — CTA 버튼이 위치한 영역. 뒤에 3D 커피 canvas 보임
        src: "/images/screenshots/pc/home-light.png",
        alt: { ko: "홈 페이지 — Contact / Resume 버튼이 있는 CTA 섹션과 뒤쪽 3D 커피잔", en: "Home page — CTA section with Contact/Resume buttons and the 3D coffee cup behind" },
        caption: { ko: "버튼 hover 시 뒤의 커피 canvas 가 blur 되는 \"유리창 너머\" 효과", en: "Hover reveals the \"glass over coffee canvas\" blur effect" },
      },
      {
        alt: { ko: "Chrome DevTools Layers 패널 — compositing layer 분리 / 통합 비교", en: "Chrome DevTools Layers panel — compositing layer separation / merge" },
        placeholderKeyword: "Chrome DevTools > Rendering > Layer borders 켠 화면 (수정 전: .home 이 자체 layer / 수정 후: 일반 layer)",
      },
    ],
  },
  {
    section: { ko: "Frontend / Editor", en: "Frontend / Editor" },
    problem: {
      ko: "Plate 인라인 코드에서 방향키 커서 점프",
      en: "Plate Inline Code Arrow Key Cursor Jump",
    },
    definition: {
      ko: "인라인 코드(`<code>` mark) 안에서 ArrowLeft로 두 번째 글자에서 첫 번째 글자로 이동할 때 커서가 이전 텍스트 노드로 점프함",
      en: "When pressing ArrowLeft to move from the second to the first character inside an inline code (`<code>` mark), the cursor jumped to the previous text node",
    },
    cause: {
      ko: "CodePlugin.configure({ rules: { selection: { affinity: \"directional\" } } })로 Plate 기본값 \"hard\"를 덮어씀. \"hard\" affinity는 mark 경계에서 커서를 mark 안쪽에 유지하는데, \"directional\"은 브라우저 기본 동작에 위임하여 `<code>` 요소의 padding/border 경계에서 커서가 요소 밖으로 점프",
      en: "CodePlugin was configured with { rules: { selection: { affinity: \"directional\" } } }, overriding Plate's default \"hard\". \"hard\" affinity keeps the cursor inside mark boundaries, while \"directional\" delegates to browser default behavior, causing the cursor to jump outside the `<code>` element at padding/border boundaries",
    },
    solution: {
      ko: "affinity 오버라이드를 제거하고 Plate 기본값(\"hard\")을 사용. 디버깅 과정에서 DOM selection API, normalizer merge, CSS padding 제거 등 여러 접근을 시도했으나 근본 원인은 affinity 설정",
      en: "Removed the affinity override, using Plate's default (\"hard\"). During debugging, tried DOM selection API, normalizer merge, CSS padding removal, but the root cause was the affinity configuration",
    },
    keyInsight: {
      ko: "Plate/Slate에서 inline mark의 커서 동작은 **affinity 설정**이 결정합니다. \"hard\"는 mark 경계에서 커서를 안쪽에 유지하고, \"directional\"은 브라우저에 위임하여 padding/border가 있는 요소에서 예기치 않은 점프가 발생할 수 있습니다. 플러그인 설정을 오버라이드할 때는 **기본값이 왜 그렇게 설정되었는지** 먼저 이해해야 합니다.",
      en: "In Plate/Slate, cursor behavior at inline mark boundaries is controlled by the **affinity setting**. \"hard\" keeps the cursor inside the mark, while \"directional\" delegates to the browser, which can cause unexpected jumps at elements with padding/border. Before overriding plugin defaults, **understand why the default was chosen**.",
    },
    tags: ["Plate", "Slate", "code mark", "cursor", "affinity"],
  },
  {
    section: { ko: "Frontend / Admin", en: "Frontend / Admin" },
    problem: {
      ko: "Admin 테이블 모바일 가로 스크롤 시 row border가 중간에서 끊김",
      en: "Admin Table Row Border Cuts Off Mid-Scroll on Mobile",
    },
    definition: {
      ko: "모바일에서 admin 테이블을 가로 스크롤할 때, 행과 행 사이 구분선(border-bottom)이 **스크롤 끝까지 그려지지 않고 중간에서 끊기는** 현상이 발생했습니다.",
      en: "When horizontally scrolling admin tables on mobile, the row separator lines (border-bottom) **stopped mid-scroll instead of extending across the full scroll area**.",
    },
    cause: {
      ko: "모바일 표시를 위해 `.colTitle { min-width: 280px }`으로 제목 열 너비를 확보했는데, 각 row(`.row`, `.tableHeader`, `.bulkBar`)는 **독립된 grid 컨테이너**이므로 trac 확장이 행마다 따로 계산됐습니다. 데이터 row에는 `col.className`이 적용되어 있어 title track이 280px로 확장되었지만, header의 title `<span>`에는 className이 없어 1fr만 계산됨 → **row는 868px로 늘어나고 header는 720px에서 끝나는 너비 불일치**. 스크롤 시 row의 border는 868px까지 그려지지만 header와 bulkBar의 border는 720px에서 끊겨 보였습니다.",
      en: "To guarantee a readable title column on mobile, `.colTitle { min-width: 280px }` was applied. But each row (`.row`, `.tableHeader`, `.bulkBar`) is an **independent grid container**, so track expansion is computed per-row. Data rows had `col.className` applied, so the title track expanded to 280px — but the header's title `<span>` had no className, leaving the 1fr track at its natural size. **Rows grew to 868px while the header stayed at 720px**. On scroll, row borders extended to 868px but the header/bulkBar borders stopped at 720px, making the separator lines look truncated.",
    },
    solution: {
      ko: "두 가지 동시 수정. ① 헤더 `<span>`에도 `col.className`을 적용해 `.colTitle`이 header title에도 적용되게 하여 **header title track도 280px로 확장**. ② 스크롤 컨테이너 내부에 `.tableInner` wrapper(`display: flex; flex-direction: column; min-width: 100%; width: max-content;`)를 추가. flex column에서 items는 cross-axis(가로)로 자동 stretch되고, `width: max-content`가 가장 넓은 자식의 max-content 너비(868px)로 wrapper를 사이징하므로 **모든 row/header/bulkBar가 동일한 868px로 정렬**됩니다. 결과적으로 border-bottom이 스크롤 전 영역에 걸쳐 연결되어 그려집니다.",
      en: "Two simultaneous fixes. ① Apply `col.className` to the header `<span>` too so `.colTitle` applies in the header, **expanding the header's title track to 280px**. ② Add a `.tableInner` wrapper (`display: flex; flex-direction: column; min-width: 100%; width: max-content;`) inside the scroll container. In a flex column, items auto-stretch on the cross-axis (horizontal), and `width: max-content` sizes the wrapper to the widest child's max-content (868px), **aligning all rows/header/bulkBar to the same 868px width**. Border-bottom now extends continuously across the full scroll area.",
    },
    keyInsight: {
      ko: "CSS Grid에서 각 row가 독립된 grid 컨테이너이면 **track 확장은 row별로 계산**되어 하나의 row에서 min-width가 걸려도 다른 row에는 반영되지 않습니다. 가로 스크롤 시 border 연속성을 유지하려면 모든 row가 **동일한 전체 너비**를 가져야 하고, 이를 위해 `width: max-content + min-width: 100%` 패턴의 wrapper로 가장 넓은 자식에 맞춰 통일된 너비를 강제해야 합니다. 또한 `col.className`처럼 **row에만 적용되고 header에는 빠진 className 불일치**가 너비 차이의 가장 흔한 원인이므로, header 렌더링 경로도 동일 className을 받도록 해야 합니다.",
      en: "When each row is an independent CSS Grid container, **track expansion is computed per-row** — a `min-width` on one row's cell doesn't propagate to siblings. For horizontal scroll with continuous borders, all rows must share the **same overall width**. The `width: max-content + min-width: 100%` wrapper pattern enforces this by sizing the wrapper to the widest child. Additionally, **className mismatches between row and header** (where `col.className` is applied in rows but omitted in headers) are a common source of width divergence — ensure the header render path receives the same className.",
    },
    tags: ["CSS Grid", "flex", "overflow-x", "max-content", "mobile", "admin"],
  },
  {
    section: { ko: "Frontend / Transition", en: "Frontend / Transition" },
    problem: {
      ko: "Page transition 이 hold 단계에서 멈추고 morph 후 skeleton 이 노출",
      en: "Page transition stuck at hold + skeleton exposed after morph",
    },
    definition: {
      ko: "글 카드 (PostCard) 를 클릭하면 카드의 이미지가 상세 페이지의 hero 영역으로 자연스럽게 \"모핑\" 되며 이동하는 전환 효과를 적용했습니다.\n\n그러나 해당 전환에서 두 가지 버그가 동시에 발생했습니다.\n\n**① hold 단계에서 무한 정지** — 이미지가 hero 크기로 축소된 후에도 오버레이가 사라지지 않고 화면 위에 무한히 남았습니다.\n\n**② 스켈레톤 노출** — 모핑이 끝난 직후 그 아래로 로딩 스켈레톤이 잠시 노출되는, \"이미지 축소 → 스켈레톤 깜빡임 → 실제 페이지 표시\" 의 어색한 시퀀스가 발생했습니다.",
      en: "Clicking a PostCard to navigate to the post detail page should smoothly \"morph\" the card's image down into the detail page's hero area. Two bugs compounded:\n\n**① Stuck forever in the hold phase** — after the image shrank to hero size, the overlay never dismissed and stayed pinned to the screen indefinitely.\n\n**② Skeleton flashed through** — right after the morph completed, the loading skeleton briefly showed up beneath, producing an awkward \"image shrinks → skeleton flash → real page\" sequence.",
    },
    cause: {
      ko: "두 원인이 독립적으로 존재했습니다.\n\n**① 무한 hold** — 원래 설계는 `expand → morph(hero 크기) → hold` 까지 자동 진행되다가, 새 페이지의 hero `<motion.div>` 에 걸린 `onAnimationStart` 콜백에서 `endTransition()` 을 호출하여 오버레이를 dismiss 하는 구조였습니다.\n\n그런데 hero 의 `initial` 과 `animate` 가 모두 `opacity: 1` 로 설정되어 있었습니다 (전환 중 hero 가 즉시 보이도록). framer-motion 은 \"시작 값 == 끝 값\" 인 경우 \"실제 애니메이션이 없는 no-op\" 으로 판정합니다. 그러면 **`onAnimationStart` 가 발화하지 않고**, 콜백 안의 `endTransition()` 도 호출되지 않아 phase 가 영원히 hold 에 갇히게 됩니다.\n\n**② 스켈레톤 노출** — morph 가 클릭 후 고정 타이밍 (약 1초) 으로 진행되다 보니, **새 페이지가 준비되기도 전에 오버레이가 먼저 축소되었습니다.** 그 빈 자리는 Next.js 의 `loading.tsx` (Suspense fallback) 인 스켈레톤이 차지하고 있어, 사용자에게 한 박자 노출되었습니다.",
      en: "Two independent root causes:\n\n**① Infinite hold** — The original design auto-progressed `expand → morph (hero size) → hold` and triggered dismissal via an `onAnimationStart` callback on the new page's hero `<motion.div>`.\n\nBut both `initial` and `animate` on the hero set `opacity: 1` (so it appears instantly during the transition). framer-motion treats \"start value equals end value\" as a no-op and **never fires `onAnimationStart`** — so `endTransition()` was never called, and the phase stayed locked at hold forever.\n\n**② Skeleton flash** — The morph ran on a fixed ~1s timer after click, so **the overlay shrank before the new page was actually ready**. In that gap, Next.js's `loading.tsx` (a Suspense fallback) — the skeleton — took over the now-empty space and flashed visibly.",
    },
    solution: {
      ko: "전환 상태 머신을 재설계하여 두 문제를 함께 해결했습니다.\n\n**① endTransition 트리거를 다른 신호로 변경** — `onAnimationStart` 의존을 제거하고, **새 페이지 컴포넌트의 `useEffect` 에서 mount 시점에 `endTransition()` 을 호출** 하도록 변경했습니다. 이는 \"애니메이션이 실제로 동작했는지\" 와 무관하게 \"새 페이지가 마운트되었다\" 는 명확한 신호입니다.\n\n또한 어떤 이유로든 호출이 누락될 경우에 대비해 **`SAFETY_MS=5000` 안전망 타이머** 를 PageTransitionProvider 에 추가했습니다. 5초 안에 신호가 도달하지 않으면 강제 dismiss 됩니다.\n\n**② hold 단계 동안 backdrop 을 fullscreen 으로 유지** — 기존에는 backdrop 도 hero 영역에 맞춰 축소되었으나, 이제는 hold 단계 동안 backdrop 이 화면 전체를 덮습니다. 따라서 morph 가 끝난 후에도 그 아래의 스켈레톤은 노출되지 않습니다.\n\n빠른 mount (데이터 캐시 hit) 케이스를 위해 `endRequestedRef` flag 도 추가했습니다. 새 페이지가 morph 보다 먼저 준비되면 hold 를 건너뛰고 즉시 done 으로 진입합니다.",
      en: "Restructured the transition state machine to fix both:\n\n**① Switched the endTransition trigger** — removed the dependency on `onAnimationStart`. Now **a `useEffect` in the new page component calls `endTransition()` on mount**, which is a reliable \"new page is ready\" signal regardless of whether any animation actually ran.\n\nAlso added a **`SAFETY_MS=5000` backstop timer** in PageTransitionProvider: if `endTransition` isn't called within 5 seconds for any reason, the overlay force-dismisses.\n\n**② Backdrop covers the full screen during hold** — previously the backdrop also matched the hero area, leaving everything else exposed. Now during hold the backdrop spans the whole viewport, so the skeleton beneath the morphed overlay can't surface.\n\nFor fast cached mounts, an `endRequestedRef` flag short-circuits the hold phase if the new page is ready before morph finishes — proceeding straight to done.",
    },
    keyInsight: {
      ko: "두 가지 교훈을 얻었습니다.\n\n**① 중요한 상태 전환을 애니메이션 라이프사이클 콜백 하나에만 의존하지 않을 것.**\n\n`onAnimationStart` / `onAnimationComplete` 같은 콜백은 \"실제로 값이 변하지 않을 때\" 호출이 통째로 누락될 수 있고, 라이브러리 버전이나 렌더링 타이밍에 따라 silently fail 하기도 합니다. 항상 `useEffect` 기반 fallback 이나 setTimeout 안전망과 함께 설계해야, 콜백이 누락되어도 시스템이 멈추지 않습니다.\n\n**② 모핑 전환에서는 \"오버레이가 축소되는 순간 그 아래가 노출된다\" 는 시각적 계약을 항상 인지할 것.**\n\nSuspense fallback (스켈레톤) 이 있는 환경에서 \"이미지가 hero 로 축소되는\" 식의 전환을 설계할 때, 새 페이지가 준비되기 전에 morph 가 먼저 종료되면 스켈레톤이 노출됩니다.\n\n해결책은 두 가지뿐입니다. (a) backdrop 으로 morph 종료 후에도 화면 전체를 덮어 두거나, (b) 새 페이지가 mount 될 때까지 morph 자체를 지연시키거나. 두 패턴 모두 본질은 **\"오버레이의 시각 상태가 실제 페이지 상태와 동기화되도록 보장\"** 하는 것입니다.",
      en: "Two lessons:\n\n**① Don't make animation lifecycle callbacks the sole trigger for critical state transitions.**\n\nCallbacks like `onAnimationStart` / `onAnimationComplete` can silently skip firing when \"start equals end\" (a no-op), and their behavior varies by library version and render timing. Always pair them with a `useEffect`-based fallback or a setTimeout safety net so the system survives even if the callback never fires.\n\n**② In morphing transitions, never forget the visual contract: shrinking the overlay exposes what's beneath.**\n\nIn a Suspense-aware environment with a skeleton fallback, if morph finishes before the new page is ready, the skeleton flashes through.\n\nThere are only two fixes — (a) keep a backdrop covering the full viewport even after the morph, or (b) defer morph until the new page actually mounts. Both come down to **\"keep the overlay's visual state synchronized with the actual page state\"**.",
    },
    tags: ["framer-motion", "transition", "suspense", "skeleton", "lifecycle"],
    comparisons: [
      {
        label: { ko: "수정 전 / 수정 후", en: "Before / After" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "수정 전", en: "Before" },
          { ko: "수정 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "오버레이 dismiss 트리거", en: "Dismiss trigger" }, { ko: "framer-motion onAnimationStart 콜백", en: "framer-motion onAnimationStart callback" }, { ko: "새 페이지 useEffect mount", en: "New page's useEffect mount" }] },
          { cells: [{ ko: "콜백이 안 불릴 때", en: "If the callback never fires" }, { ko: "오버레이 영원히 잠김", en: "Overlay stuck forever" }, { ko: "5초 안전망 타이머로 강제 해제", en: "5s backstop force-dismisses" }] },
          { cells: [{ ko: "morph 후 backdrop 범위", en: "Backdrop after morph" }, { ko: "hero 영역만큼만 덮음", en: "Only the hero area" }, { ko: "화면 전체 덮음", en: "Full viewport" }] },
          { cells: [{ ko: "스켈레톤 노출", en: "Skeleton flash" }, { ko: "✗ morph 직후 깜빡 보임", en: "✗ Brief flash after morph" }, { ko: "✓ 새 페이지 mount 까지 가림", en: "✓ Hidden until new page mounts" }] },
          { cells: [{ ko: "캐시 hit (빠른 mount)", en: "Cache hit (fast mount)" }, { ko: "고정 1초 morph 대기", en: "Always waits ~1s for morph" }, { ko: "endRequestedRef 로 즉시 done", en: "endRequestedRef short-circuits to done" }] },
        ],
      } satisfies ComparisonTable,
    ],
    images: [
      {
        src: "/images/screenshots/pc/posts-light.png",
        alt: { ko: "Posts 페이지 — PostCard 클릭이 morph transition 시작점", en: "Posts page — PostCard click triggers the morph transition" },
        caption: { ko: "카드 이미지가 상세 hero 로 \"모핑\"되며 이동", en: "Card image \"morphs\" into the detail hero" },
        position: "definition",
      },
      {
        src: "/images/screenshots/pc/work-detail-light.png",
        alt: { ko: "상세 페이지 hero — morph 종료 지점", en: "Detail page hero — morph destination" },
        caption: { ko: "오버레이 축소 후 자연스럽게 노출되는 hero 영역", en: "Hero area that's exposed as the overlay shrinks" },
        position: "solution",
      },
    ],
  },
  {
    section: { ko: "Frontend / Layout", en: "Frontend / Layout" },
    problem: {
      ko: "Posts Bento — `grid-template-rows` 만으로는 카드별 높이 차이가 빈칸을 만듦",
      en: "Posts Bento — `grid-template-rows` alone leaves gaps when card heights vary",
    },
    definition: {
      ko: "`/posts` 페이지의 bento 레이아웃은 비율이 다른 카드 5종을 하나의 grid 안에서 함께 사용합니다 — wide (가로형), 21:9 banner, 1:1 square, 3:4 portrait, 16:10 standard.\n\n그러나 일반 CSS Grid 만 사용하면 한 row 의 높이가 \"해당 row 안에서 가장 큰 카드\" 를 기준으로 늘어납니다. 따라서 작은 square 카드 옆에 큰 portrait 카드가 함께 배치되면, **square 아래쪽에 portrait 와의 높이 차이만큼 빈 공간** 이 그대로 남게 됩니다. Pinterest 와 같은 진정한 masonry 처럼 빈틈 없이 채워지지 않는 것입니다.\n\n`grid-auto-flow: dense` (작은 셀이 비어 있는 자리를 backfill 해 주는 옵션) 를 함께 사용하면 가로 빈자리는 어느 정도 채워지지만, **세로로 남는 공간** 은 여전히 처리되지 않습니다.",
      en: "The `/posts` bento mixes five card aspect ratios in a single grid — wide, 21:9 banner, 1:1 square, 3:4 portrait, and 16:10 standard.\n\nWith plain CSS Grid, every row's height stretches to fit its tallest card, so a **small square next to a tall portrait left empty space below the square** equal to the height difference. Not the gap-free packing of true masonry like Pinterest.\n\nAdding `grid-auto-flow: dense` (smaller cells backfill empty cells) helped horizontally, but **vertical leftover space** still wasn't addressed.",
    },
    cause: {
      ko: "CSS Grid 의 `grid-template-rows: auto` (또는 고정 비율 row) 는 한 row 의 높이를 \"해당 row 안의 자식 중 가장 큰 것\" 에 맞춰 정렬합니다.\n\n따라서 한 row 에 1:1 square 카드와 3:4 portrait 카드가 함께 배치되면, row 전체가 portrait 의 높이까지 늘어나면서 square 아래에 그만큼의 dead space 가 생깁니다. 결국 row 자체가 \"한 단위 = 카드 한 줄\" 로 묶여 있어, 다른 카드가 그 미세한 잔여 공간으로 진입할 수 없는 구조였습니다.",
      en: "CSS Grid's `grid-template-rows: auto` (or any fixed-ratio rows) ties each row to the height of its tallest child.\n\nIf a 1:1 square and a 3:4 portrait land in the same row, the row itself stretches to the portrait's height, leaving dead space below the square. Each row is treated as one indivisible \"card-height unit\", so other cards can't slip into the leftover slivers.",
    },
    solution: {
      ko: "결국 **진정한 masonry 를 CSS Grid + JS 하이브리드** 로 직접 구현했습니다.\n\n**CSS 쪽** — `grid-auto-rows: 1px` 으로 row 단위를 1px 까지 잘게 쪼개고, `grid-auto-flow: dense` 와 `gap` 정도만 지정합니다.\n\n**JS 쪽** (useEffect) — 모든 카드의 실제 높이를 `firstElementChild.scrollHeight` 로 측정한 후, `span = ceil((높이 + gap) / (rowUnit + gap))` 공식으로 각 카드가 차지할 row 수를 계산해 `style.gridRow = span N` 을 동적으로 부여합니다. row 단위가 1px 이라 카드 높이를 픽셀 단위까지 정밀하게 맞출 수 있습니다.\n\n폰트나 이미지가 늦게 로드되면 처음 측정한 높이가 어긋날 수 있으므로, **`ResizeObserver` (grid 크기 변화 감지) 와 이미지 `onLoad` 두 시점 모두** 에서 재측정·재계산합니다.\n\n모바일 (≤ 640px) 에서는 화면이 좁아 variant 조합 자체가 어색해지므로, 모든 카드를 16:10 단일 비율로 통일하고 JS 측정도 비활성화하여 비용을 줄였습니다.",
      en: "Implemented **true masonry as a CSS Grid + JS hybrid**.\n\nOn the CSS side: `grid-auto-rows: 1px` shreds row tracks to 1px increments, plus `grid-auto-flow: dense` and `gap` only.\n\nOn the JS side (useEffect): measure each card's actual height via `firstElementChild.scrollHeight`, compute `span = ceil((height + gap) / (rowUnit + gap))`, and apply `style.gridRow = span N`. With 1px row units, card heights pack very precisely.\n\nFont and image loads can change height after the initial measure, so **both `ResizeObserver` (grid resize) and image `onLoad` triggers recompute** the spans.\n\nOn mobile (≤ 640px) the multi-variant grid feels cramped, so all cards flatten to a uniform 16:10 ratio and the JS measurement is disabled — saving the runtime cost.",
    },
    keyInsight: {
      ko: "순수 CSS 만으로 masonry 를 구현하는 것은 아직 실험적인 단계입니다. `grid-template-rows: masonry` 는 Firefox 외에는 지원되지 않아 Chrome 에서 사용할 수 없습니다.\n\n따라서 빈틈 없이 packing 하는 \"사실상의 표준\" 은 **row track 을 1px 같은 작은 단위로 잘게 쪼갠 뒤, JS 가 측정한 카드 높이로 span 을 동적으로 부여하는 하이브리드** 입니다.\n\n측정값으로는 `firstElementChild.scrollHeight` 가 가장 정확합니다. wrapper 자체의 padding 이 합산되지 않아 픽셀 수치가 \"실제 콘텐츠 높이\" 와 정확히 일치하기 때문입니다. 또한 이미지 `onLoad` 와 `ResizeObserver` 두 시점 모두에서 재측정을 수행해야, 폰트나 이미지가 뒤늦게 로드되어도 잘못된 span 이 굳어지지 않습니다.",
      en: "CSS-only masonry is still experimental — `grid-template-rows: masonry` ships in Firefox only, not Chrome.\n\nThe de facto standard for gap-free packing is the hybrid: **shred row tracks to 1px, then have JS assign spans from measured heights**.\n\n`firstElementChild.scrollHeight` is the most accurate measurement source — wrapper padding doesn't get added in, so the pixel total matches the real content height. And recompute on both image `onLoad` and `ResizeObserver` so spans stay correct after late-loading fonts or images.",
    },
    tags: ["CSS Grid", "masonry", "ResizeObserver", "bento", "Posts"],
    images: [
      {
        // /posts 페이지의 bento 레이아웃 — 다양한 비율의 카드들이 빈틈 없이 packing 된 결과
        src: "/images/screenshots/pc/posts-light.png",
        alt: { ko: "Posts 페이지 — Bento 레이아웃 (wide / square / portrait / banner 카드 혼합)", en: "Posts page — Bento layout with mixed card aspects (wide / square / portrait / banner)" },
        caption: { ko: "JS hybrid masonry 로 packing 된 최종 결과", en: "Final result packed by JS hybrid masonry" },
      },
    ],
    comparisons: [
      {
        label: { ko: "수정 전 / 수정 후", en: "Before / After" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "수정 전", en: "Before" },
          { ko: "수정 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "row 단위", en: "Row unit" }, { ko: "auto (가장 큰 카드 기준)", en: "auto (matches tallest card)" }, { ko: "1px (잘게 쪼갬)", en: "1px (fine slicing)" }] },
          { cells: [{ ko: "카드별 row 차지", en: "Card row span" }, { ko: "1 row 고정", en: "Fixed 1 row" }, { ko: "JS 측정 높이로 span N", en: "span N from measured height" }] },
          { cells: [{ ko: "작은 카드 아래 여백", en: "Gap under smaller cards" }, { ko: "큰 카드 높이만큼 빈칸", en: "Empty space = height delta" }, { ko: "다른 카드가 backfill", en: "Other cards backfill" }] },
          { cells: [{ ko: "이미지 늦게 로드 시", en: "Late image loads" }, { ko: "처음 측정값으로 굳음", en: "Frozen at initial measurement" }, { ko: "onLoad 로 재측정 + ResizeObserver", en: "Recompute via onLoad + ResizeObserver" }] },
          { cells: [{ ko: "전체 빈 공간", en: "Total empty space" }, { ko: "변동 큼 (variant 비율 따라)", en: "Varies by variant ratios" }, { ko: "거의 0 (Pinterest 같은 packing)", en: "Near zero (Pinterest-like packing)" }], highlight: true },
        ],
      } satisfies ComparisonTable,
    ],
  },
  {
    section: { ko: "Frontend / Layout", en: "Frontend / Layout" },
    problem: {
      ko: "sticky filterBar IntersectionObserver — 인기글 사이드바와 1px 어긋남",
      en: "Sticky filterBar IntersectionObserver — 1px drift against sidebar widgets",
    },
    definition: {
      ko: "`/posts` 의 filterBar 가 `position: sticky; top: var(--nav-height)` 로 붙는데, sentinel 의 IntersectionObserver `rootMargin` 을 고정값으로 두면 PC ↔ 모바일에서 nav 높이가 바뀌거나 filterBar 가 1행 → 2행으로 늘어나는 순간 anchor 시점이 어긋나 인기글 위젯과 1px 정도 겹치거나 떨어져 보입니다.",
      en: "`/posts` filterBar uses `position: sticky; top: var(--nav-height)`, but the sentinel's `rootMargin` was hard-coded. When PC ↔ mobile nav heights differ or the filterBar grows from one row to two, the anchor moment falls out of sync — the bar visually overlaps Popular Posts by ~1px or leaves a hairline gap.",
    },
    cause: {
      ko: "sticky `top` 은 CSS variable 로 동적이지만 IntersectionObserver `rootMargin` 은 객체 생성 시점의 정적 값입니다. filterBar height 가 search row 추가로 44px → 80px 로 변하면 sentinel 이 가리는 영역도 같이 변해야 하는데 observer 가 stale 인 상태로 남습니다.",
      en: "`top` is dynamic (driven by a CSS variable), but `IntersectionObserver`'s `rootMargin` is set once at construction. When the filterBar height changed from 44px to 80px (added search row), the sentinel kept gating on the old offset.",
    },
    solution: {
      ko: "`rootMargin` 을 컴포넌트의 실제 sticky `top` 값으로 동기화합니다. `getComputedStyle(filterBar).top` 으로 실측한 값을 `rootMargin: -${stickyTop+1}px 0px 0px 0px` 로 계산해(1px 은 cross 시점 안전 마진), `resize` 이벤트마다 observer 를 disconnect → 재생성합니다. filterBar 의 sibling 인 사이드바 `top` 도 같은 식(`calc(var(--nav-height) + 80px + ...)`) 으로 통일해 두 컴포넌트가 항상 같은 anchor 라인을 공유하도록 합니다.",
      en: "Sync `rootMargin` with the component's actual sticky `top`. Read `getComputedStyle(filterBar).top`, then set `rootMargin: -${stickyTop + 1}px 0px 0px 0px` (the +1px is a cross-frame safety margin). On every `resize`, disconnect and rebuild the observer so nav-height changes are picked up. The sibling sidebar's `top` was updated to the same arithmetic (`calc(var(--nav-height) + 80px + ...)`) so both elements share one anchor line.",
    },
    keyInsight: {
      ko: "sticky element 의 anchor 시점을 알아내는 IntersectionObserver 는 **rootMargin 이 실제 sticky top 과 정확히 일치해야** 합니다. CSS variable / 미디어 쿼리로 sticky top 이 동적으로 변하는 환경에서는 observer 도 같이 재생성하는 게 유일한 정답이고, 정적 값으로 두면 한 viewport 에서는 맞는데 resize 직후 어긋나는 미묘한 버그가 됩니다.",
      en: "For a sticky element, the `IntersectionObserver` that detects \"now stuck\" must use a `rootMargin` that **matches the actual sticky top to the pixel**. When that top is dynamic (CSS variable / media query), the observer must rebuild alongside it — otherwise you get a viewport that looks correct but a 1px drift after `resize`.",
    },
    tags: ["IntersectionObserver", "sticky", "rootMargin", "Posts", "filterBar"],
  },
  {
    section: { ko: "Frontend / Animation", en: "Frontend / Animation" },
    problem: {
      ko: "Series Deck — hover 펼침이 \"사라졌다 나타나는\" 느낌",
      en: "Series Deck — hover unfold \"disappears then reappears\"",
    },
    definition: {
      ko: "`/posts` 의 Series row 카드를 hover 하면 deck 형태로 펼쳐지면서 소속 글 4개가 layer 로 등장해야 하는데, 초기 구현은 (1) 펼쳐지는 순간 deck 이 한 번 사라졌다 나타나는 듯한 깜빡임, (2) hover 직후 너무 빨리 펼쳐져 의도된 deck 멈춤이 안 보임, (3) 펼친 상태에서 layer 가 한 장씩 순차 등장하지 않고 동시에 등장하는 문제가 다발했습니다.",
      en: "Hovering a Series row card on `/posts` should fan it out into a deck of preview layers. The initial implementation suffered from (1) the deck appearing to \"vanish then reappear\" when unfolding, (2) cards spreading immediately on enter — the deliberate hold beat was invisible, (3) all four layers reaching their final position simultaneously instead of staggering.",
    },
    cause: {
      ko: "① layer 등장에 CSS `transition-delay` 로 stagger 를 줬는데, **hover-out 시 모든 delay 가 동시에 cancel** 되어 layer 들이 한꺼번에 사라짐 → \"사라졌다 나타나는\" 듯한 시각 효과. ② transform 의 ease 가 overshoot 계열 `cubic-bezier(0.34, 1.45, ...)` 이라 펼치기 시작 직전부터 미리 약간 벌어진 상태로 보임. ③ CSS `transition-delay: 0s` 라 마우스 진입 즉시 펼쳐짐 → \"deck 이 멈춰있다가 펼쳐지는\" 의도된 시퀀스 부재.",
      en: "① Layer entrance used CSS `transition-delay` for stagger, but **on hover-out every delay cancels at the same moment**, collapsing all layers in unison — the eye reads this as \"vanishing\" rather than \"folding back\". ② The transform easing was `cubic-bezier(0.34, 1.45, ...)` (overshoot), so the cards looked partially spread *before* animation start. ③ With `transition-delay: 0s`, hover entry started the spread immediately — no perceptible hold.",
    },
    solution: {
      ko: "stagger / delay / easing 셋을 모두 JS state 기반으로 재설계. ① 펼침 트리거를 `setTimeout(() => setOpen(true), 800)` 로 800ms 의도된 hold 후 `data-deck-open` flip — CSS `transition-delay` 가 아닌 state 변경 시점이 분명하므로 hover-out 시 timer 만 clear 하면 깔끔히 취소. ② `--deck-i` 를 layer index 로 부여하고 `transition-delay: calc(1s + (var(--deck-i, 1) - 1) * 0.4s)` 로 각 layer 가 직전 layer 펼침이 끝난 뒤 시작되도록 명시(총 4 layer × 0.4s = 1.6s). ③ easing 을 standard `cubic-bezier(0.4, 0, 0.2, 1)` 로 교체해 미리 펼친 듯한 overshoot 제거. ④ layer label / title 도 같은 stagger 로 fade-in 시켜 \"한 장씩 들춰지는\" 느낌 강화.",
      en: "Move stagger / delay / easing all into JS state. ① Trigger via `setTimeout(() => setOpen(true), 800)` with `clearTimeout` on leave — distinct, cancellable, no CSS-delay weirdness. ② Per-layer stagger via CSS variable: assign `--deck-i` per layer and use `transition-delay: calc(1s + (var(--deck-i, 1) - 1) * 0.4s)` (4 layers × 0.4s = 1.6s of clear progression). ③ Standard ease `cubic-bezier(0.4, 0, 0.2, 1)` removes the overshoot tell that made the deck look pre-spread. ④ Layer label/title fade in on the same stagger so each layer feels \"lifted\" one at a time.",
    },
    keyInsight: {
      ko: "① **CSS `transition-delay` 는 enter 만 stagger 하고 leave 도 같이 stagger 됨** — leave 도 staggered 면 OK 지만, \"동시 사라짐 + 순차 등장\" 같은 비대칭 시퀀스는 CSS 만으론 어렵습니다. JS state + 명시적 timer 로 enter/leave 타이밍을 분리해야 의도대로 동작합니다. ② Hover 펼침처럼 \"잠깐 hold 후 등장\" 시퀀스는 `transition-delay` 보다 `setTimeout + state flip` 이 의미가 명확하고 cancel 도 깔끔합니다. ③ Overshoot easing 은 마이크로 모션에서 \"이미 시작된 것처럼\" 보이게 만드므로, **stop → animate 가 분명해야 하는 시퀀스에는 standard ease 가 더 적합**합니다.",
      en: "① **CSS `transition-delay` staggers both enter AND leave.** Symmetric stagger is fine, but asymmetric \"all leave at once + sequential enter\" is hard to achieve in pure CSS — pair JS state with explicit timers when enter/leave timing must differ. ② \"Hold then unfold\" microinteractions read better when triggered by `setTimeout + state flip` than `transition-delay`, since cancellation is clean and the intent is explicit. ③ Overshoot easing makes microinteractions look \"already started\" — when the **stop → animate** moment must read clearly, standard ease is more appropriate.",
    },
    tags: ["CSS transitions", "stagger", "JS state", "hover", "easing", "Series"],
  },
  {
    section: { ko: "Frontend / Interaction", en: "Frontend / Interaction" },
    problem: {
      ko: "Series Deck spread — `setPointerCapture` 가 자식 click 차단 + hit-area 공백으로 flicker",
      en: "Series Deck spread — `setPointerCapture` blocks child clicks + hit-area gaps cause flicker",
    },
    definition: {
      ko: "deck 이 펼쳐진 상태에서 (1) layer 카드를 클릭하면 SeriesCard 의 click 이 전혀 발화되지 않고, (2) layer 와 layer 사이 마진을 마우스가 지나갈 때 hover 가 종료되어 deck 이 닫히고 다시 layer 위에 들어가면 펼침이 재시작되는 flicker 가 발생했습니다.",
      en: "With the deck unfolded, (1) clicking any layer card never dispatched its `onClick` — SeriesCard navigation was dead, and (2) when the cursor crossed the gap between layers (16px), hover ended and the deck collapsed; re-entering a layer triggered the unfold again, producing visible flicker.",
    },
    cause: {
      ko: "① 부모 row 가 가로 스크롤 + 드래그 지원 때문에 `setPointerCapture(e.pointerId)` 를 사용했는데, **pointer 가 캡처된 동안에는 자식의 click 이 부모로 흡수**되어 layer 의 onClick 이 발화되지 않습니다. ② 펼침 시 next 카드를 밀어내려고 `margin-right: 660px` 로 visual 만 확장했는데, `box-sizing: border-box` 와 무관하게 margin 은 element 의 hit-area 를 늘리지 않습니다. layer 와 layer 사이 gap(16px) 위에 마우스가 올라가면 카드 밖으로 인식되어 hover 가 종료됩니다.",
      en: "① The parent row uses `setPointerCapture(e.pointerId)` to support horizontal drag-scroll. While the parent has captured the pointer, **child clicks are absorbed by the parent** and `onClick` on layers never fires. ② To push the next sibling card aside while unfolding, `margin-right: 660px` was added — but margins move visual position only, they don't extend the element's hit area (regardless of `box-sizing`). When the cursor crossed a gap between layers, it landed outside the card's hit area, ending hover.",
    },
    solution: {
      ko: "① `setPointerCapture` 자체를 제거하고 **document-level `pointermove` / `pointerup` 리스너** 로 드래그 추적. click suppression 은 별도 flag(`draggedRef.current = movement > 5px`)로 구현. ② 펼침 상태일 때만 `::after { position: absolute; left: 0; top: 0; bottom: 0; width: calc(100% + 660px) }` pseudo 를 부여해 layer 끝까지 hit-area 확장. pseudo 는 layer 의 자손이 아니므로 click 을 가로채지 않으면서 hover 만 잡아둡니다.",
      en: "① Drop `setPointerCapture` entirely. Track drag with **document-level `pointermove` / `pointerup` listeners** and a click-suppression flag (`draggedRef.current = movement > 5px`). ② While unfolded, attach an `::after` pseudo: `position: absolute; left: 0; top: 0; bottom: 0; width: calc(100% + 660px);` — this extends the hit area to the last layer without intercepting clicks, since pseudo-elements aren't event targets for descendants.",
    },
    keyInsight: {
      ko: "① `setPointerCapture` 는 **드래그 추적 시 편리하지만 자식 click 을 모두 흡수**합니다. 자식 클릭이 필요한 컴포넌트라면 document-level pointer 리스너 + 거리 기반 click suppression 이 더 안전합니다. ② **margin 은 visual 위치만 바꾸고 hit-area 는 안 늘립니다.** Hover 영역을 확장하려면 `padding-right`(box-sizing: content-box) 또는 `::after` pseudo 가 표준 패턴이고, content-box 는 다른 layout 부수효과가 크므로 pseudo 가 더 깔끔합니다. ③ Hover 기반 멀티 스텝 인터랙션(deck 펼침 등)은 마우스가 layer 사이를 지나가는 micro-second 라도 hover 가 끊기면 즉시 flicker — **hover area 는 시각적 boundary 보다 한 단계 더 넓게** 잡아야 안정적입니다.",
      en: "① `setPointerCapture` **is convenient for drag tracking but absorbs all child clicks**. If your component needs child-level clicks, prefer document-level pointer listeners + a distance-based click-suppression flag. ② **Margin moves visual position only — it doesn't extend the hit area.** To enlarge a hover region, use `padding-right` (with `box-sizing: content-box`) or an `::after` pseudo. content-box has too many layout side effects; pseudo is cleaner. ③ Multi-step hover interactions (deck unfold) are exquisitely sensitive — even a microsecond of hover loss between two layers causes flicker, so **define the hover region one step wider than the visual boundary**.",
    },
    tags: ["pointer events", "setPointerCapture", "hit-area", "::after", "Series", "deck"],
  },
  {
    section: { ko: "Frontend / Interaction", en: "Frontend / Interaction" },
    problem: {
      ko: "HTML5 drag 가 pointermove 를 막아 커스텀 커서가 멈추고 type 도 계속 바뀜",
      en: "HTML5 drag suppresses `pointermove` — custom cursor freezes and its type keeps flickering mid-drag",
    },
    definition: {
      ko: "RelationPicker / SortOrderDragList / 시리즈 정렬 등에서 HTML5 드래그를 시작하면 (1) `CursorTrail` 이 마우스 위치를 따라가지 않고 그 자리에 멈추고, (2) drag 중 마우스가 다른 요소 위를 지나갈 때마다 cursor type 이 \"text\" / \"big\" / \"\" 등으로 바뀌어 시각적으로 산만해집니다.",
      en: "Once an HTML5 drag begins (RelationPicker / SortOrderDragList / series reorder), (1) `CursorTrail` stops following the cursor and freezes in place, and (2) as the mouse passes over other elements during the drag, cursor type flickers between \"text\" / \"big\" / \"\" etc., breaking the visual continuity of \"I'm holding something\".",
    },
    cause: {
      ko: "브라우저는 HTML5 drag 진행 중에는 **`pointermove` / `mousemove` 발화를 의도적으로 억제**하고 그 자리를 `dragover` 가 대신 채웁니다. CursorTrail 의 위치 추적은 `pointermove` 만 listen 했으므로 좌표가 업데이트되지 않습니다. 또 `runHitTest` 가 60ms throttle 로 elementFromPoint 결과를 기반으로 cursor type 을 갱신하는데, drag 중에도 그대로 동작하면 \"내가 지금 잡고 있는 것\" 의 cursor 가 hover 한 요소에 따라 매번 바뀌어 일관성이 깨집니다.",
      en: "Browsers **deliberately suppress `pointermove` / `mousemove` while an HTML5 drag is active**, surfacing `dragover` instead. `CursorTrail` only listens for `pointermove`, so its tracked position freezes the moment the drag starts. Separately, `runHitTest` recomputes cursor type on a 60ms throttle from `elementFromPoint` — keep that running during a drag, and the cursor type ping-pongs between every element the user passes over, instead of staying locked to \"grab\".",
    },
    solution: {
      ko: "두 가지 패치를 함께. ① `dragover` 를 동일 핸들러(`handleMouseMove`)로 forward — DragEvent 와 PointerEvent 가 `clientX/Y` 만 공유한다는 점만 활용해 캐스팅 후 호출. ② `dragstart` 시점에 `isHtml5Dragging = true` + `cursorTypeRef.current = \"grab\"` + `setCursorType(\"grab\")` 으로 type 을 lock 하고, `runHitTest` 진입부에서 dragging 중이면 즉시 return. `dragend` / `drop` 에서 flag 해제.",
      en: "Two patches together. ① Forward `dragover` into the same `handleMouseMove` handler — `DragEvent` and `PointerEvent` share `clientX/Y`, so a cast is enough. ② On `dragstart`, set `isHtml5Dragging = true`, lock `cursorTypeRef.current = \"grab\"` and `setCursorType(\"grab\")`. Have `runHitTest` early-return whenever dragging is active. Clear the flag on `dragend` / `drop`.",
    },
    keyInsight: {
      ko: "HTML5 native drag 가 활성이면 pointer 이벤트는 **시스템 차원에서 정지**합니다. `dragover` 로 좌표는 받을 수 있지만, drag 시작 자체와 끝을 따로 추적하지 않으면 hit-test 가 \"이 사람이 뭔가 잡고 있다\" 는 의미를 모릅니다. 커스텀 커서처럼 hover 마다 모드를 바꾸는 컴포넌트는 **drag 시작점에 modes 를 동결, drag 끝점에 해제** 하는 ref 기반 lock 이 필수.",
      en: "While native HTML5 drag is active, pointer events are **suspended at the system level**. `dragover` can keep coordinates flowing, but unless you separately track drag-start and drag-end, your hit-test has no idea the user is mid-drag. For any cursor-state component that flips modes per hover, **freeze the mode on drag-start and release on drag-end via a ref-based lock** — otherwise the cursor's identity collapses into whatever the mouse passes over.",
    },
    tags: ["HTML5 drag", "pointermove", "custom cursor", "dragover", "CursorTrail"],
  },
  {
    section: { ko: "Frontend / Interaction", en: "Frontend / Interaction" },
    problem: {
      ko: "HTML5 D&D 의 quirks 회피 — chip 드래그 정렬을 pointer 기반으로 전환",
      en: "Working around HTML5 D&D quirks — replacing chip-reorder drag with pointer events",
    },
    definition: {
      ko: "관련글 chip 순서 변경 (RelationPicker) 과 작품 페이지네이션 정렬 (SortOrderDragList) 두 곳에서 \"드래그하여 순서 변경\" 기능을 구현했습니다.\n\n초기에는 HTML5 표준 드래그 앤 드롭 (D&D) 으로 작성했는데, 다음 세 가지 문제가 동시에 발생했습니다.\n\n**① 드래그가 시작되지 않음** — \"현재 잡고 있는 chip 만 draggable 속성을 켜자\" 라는 패턴 (`draggable={dragId === id}`) 이 React 의 batching 으로 인해 DOM 반영이 한 박자 늦습니다. 사용자가 처음 잡는 순간 `draggable=false` 인 상태로 `dragstart` 이벤트가 발생하여 브라우저가 무시합니다.\n\n**② 동일 코드인데 비대칭 동작** — 같은 코드임에도 \"뒤의 chip 을 앞으로\" 는 정상 동작하지만, \"앞의 chip 을 뒤로\" 만 작동하지 않습니다.\n\n**③ 페이지 전환 시 드래그 취소** — 페이지네이션된 리스트에서 항목을 잡고 다음 페이지로 이동하는 순간, 페이지 전환으로 source DOM 이 unmount 됩니다. 브라우저는 \"드래그 대상이 사라졌다\" 고 판단해 드래그 자체를 취소합니다.",
      en: "Two reorder UIs — RelationPicker chips and SortOrderDragList paged items — were hit by three HTML5 D&D quirks simultaneously:\n\n**① Drag wouldn't start** — the \"only the dragged chip is draggable\" pattern (`draggable={dragId === id}`) lagged behind React's batching. The DOM hadn't updated to `draggable=true` by the time `dragstart` fired, so the browser ignored it.\n\n**② Asymmetric behavior** — with the exact same code, \"back chip → front\" worked, but \"front chip → back\" silently failed.\n\n**③ Cancellation on page switch** — in a paginated list, grabbing an item and dragging it to the next page unmounted the source DOM as soon as the page changed, and the browser cancelled the drag because \"the source disappeared\".",
    },
    cause: {
      ko: "HTML5 D&D 는 DOM 의 `draggable` 속성을 **드래그 시작 시점에 단 한 번만 읽고**, 이후 속성이 변경되어도 반응하지 않습니다. 따라서 ① 처럼 React state 로 토글하는 방식과는 호환되지 않습니다.\n\n또한 D&D 표준은 source 노드가 드래그 내내 \"마운트 상태로 유지될 것\" 을 가정합니다. source 가 도중에 unmount 되면 즉시 drag session 을 cancel 하는데, 이것이 ③ 의 원인입니다.\n\n② 비대칭 동작도 본질적으로는 ③ 과 동일한 메커니즘입니다. chip 순서가 \"앞 → 뒤\" 로 변경될 때 React 의 key 기반 reconciliation 이 source DOM 을 다른 슬롯으로 \"이동\" 시키는데, 브라우저 입장에서는 이것이 \"unmount 되었다가 다시 mount 된 것\" 과 유사하게 보여 드래그 추적이 끊깁니다.\n\n결국 작은 정렬 UI 에서는 이러한 quirks 가 빠르게 누적됩니다.",
      en: "HTML5 D&D **reads the DOM `draggable` attribute exactly once at drag-start** and ignores later changes. That's why ① doesn't mix well with React-state-driven toggling.\n\nThe spec also assumes the source node stays mounted for the entire drag. The moment the source unmounts, the session cancels — that's ③.\n\n② is fundamentally the same as ③. Reordering \"front → back\" makes React's key-based reconciliation move the source DOM into a different slot, which from the browser's perspective is similar to unmount-then-remount — breaking the drag tracker.\n\nFor small reorder UIs, the sum of these quirks outweighs the spec's convenience.",
    },
    solution: {
      ko: "두 컴포넌트 모두 **pointer event 기반 드래그** 로 교체했습니다. HTML5 D&D 와 달리 pointer event 는 직접 제어하므로 위의 quirks 가 모두 해당되지 않습니다.\n\n**기본 흐름**: grip handle 에서 `pointerdown` 이 발생하면 document 레벨에 `pointermove` / `pointerup` 리스너를 임시로 부착합니다. move 마다 `elementFromPoint(clientX, clientY)` 로 \"현재 커서가 어떤 chip 위에 있는지\" 를 좌표로 직접 감지하고 (`closest(\"[data-chip-id]\")`), `pointerup` 시점에 source 와 target id 를 비교하여 `selectedIds` 배열을 splice 한 뒤 onChange 를 호출합니다.\n\n**페이지네이션 리스트의 트릭**: 사용자가 list 의 위/아래 edge (60px 영역) 위에 머물면, 단순히 `setPage` 만 호출하지 않고 `apply()` 를 함께 호출하여 source 를 **\"인접 페이지의 첫/마지막 자리\" 로 실제로 reorder** 합니다. 그 결과 페이지가 전환되어도 source 가 unmount 되지 않고, 새 페이지의 첫 항목으로 그대로 유지됩니다.\n\n**주의**: `setPointerCapture` 는 사용하지 않습니다. 캡처하는 순간 부모가 자식의 click 까지 흡수하므로, chip 의 \"× 제거\" 버튼이 동작하지 않게 됩니다.",
      en: "Replaced both with **pointer-event-based drag** — since we control pointer events ourselves, none of the HTML5 quirks apply.\n\n**Core flow**: on grip-handle `pointerdown`, attach document-level `pointermove` / `pointerup` listeners. On each move, use `elementFromPoint(clientX, clientY)` (and `closest(\"[data-chip-id]\")`) to detect which chip is under the cursor by coordinates. On `pointerup`, compare source and target ids and splice `selectedIds` → onChange.\n\n**Paginated-list trick**: when the user dwells over the list's top/bottom edge (60px zone), don't just `setPage` — call `apply()` to **actually reorder the source into the first/last slot of the adjacent page**. The source survives the page change as the first item of the new page, mounted continuously.\n\n**Caveat**: don't use `setPointerCapture`. It absorbs child clicks at the parent level, killing the chip's \"× remove\" button.",
    },
    keyInsight: {
      ko: "HTML5 native D&D 는 원래 \"OS 수준에서 이미지나 파일을 다른 앱으로 끌어다 놓는\" 시나리오에 최적화되어 만들어진 표준입니다.\n\n반면 **같은 페이지 안에서 작은 항목 (chip, list item) 의 순서를 변경하는** 용도에는 표준 자체의 quirks 가 너무 빠르게 누적됩니다. state 토글이 호환되지 않는 `draggable`, source unmount 시 cancel, 자식 click 차단, 비대칭 reorder, custom 드래그 이미지 구현의 어려움 등이 그 예입니다.\n\n작은 정렬 UI 는 처음부터 **pointer event 로 직접 구현하는 것이** 결과적으로 코드량도 적고 동작도 더 일관됩니다. \"표준 API 가 존재한다\" 는 사실이 항상 \"이 상황에서도 그 표준 API 를 사용해야 한다\" 와 동의어는 아니라는 좋은 사례였습니다.",
      en: "Native HTML5 D&D is optimized for \"dragging an image or file from one OS app to another\".\n\nFor **in-page micro-reorder of chips or list items**, the spec's quirks pile up — state-driven `draggable` mismatch, source-unmount cancellation, child-click absorption, asymmetric reorder, awkward custom drag images, and more.\n\nFor small reorder UIs, **writing pointer-event drag from scratch ends up shorter and more consistent**. A useful reminder that \"a standard API exists\" doesn't always mean \"the standard API is the right tool\".",
    },
    tags: ["HTML5 drag", "pointer events", "drag-and-drop", "chip", "pagination", "elementFromPoint"],
    comparisons: [
      {
        label: { ko: "수정 전 / 수정 후", en: "Before / After" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "수정 전 (HTML5 D&D)", en: "Before (HTML5 D&D)" },
          { ko: "수정 후 (Pointer events)", en: "After (Pointer events)" },
        ],
        rows: [
          { cells: [{ ko: "드래그 시작", en: "Drag start" }, { ko: "draggable 속성 + dragstart", en: "draggable attr + dragstart" }, { ko: "pointerdown 직접 처리", en: "Direct pointerdown handler" }] },
          { cells: [{ ko: "state 토글로 draggable 변경", en: "State-toggled draggable" }, { ko: "✗ batching 으로 첫 시도 누락", en: "✗ Batching makes 1st try miss" }, { ko: "✓ 해당 없음 (속성 안 씀)", en: "✓ N/A (no attribute)" }] },
          { cells: [{ ko: "앞→뒤 vs 뒤→앞 정렬", en: "Front↔back reorder" }, { ko: "✗ 비대칭 동작", en: "✗ Asymmetric" }, { ko: "✓ 일관된 동작", en: "✓ Consistent" }] },
          { cells: [{ ko: "페이지 전환 시 source unmount", en: "Source unmount on page change" }, { ko: "✗ 즉시 cancel", en: "✗ Drag cancels" }, { ko: "✓ apply() 로 reorder, 살아남음", en: "✓ apply() reorders, stays mounted" }] },
          { cells: [{ ko: "자식 click (×) 동작", en: "Child click (×) works" }, { ko: "setPointerCapture 사용 시 흡수됨", en: "Absorbed if setPointerCapture used" }, { ko: "✓ 보존 (capture 미사용)", en: "✓ Preserved (no capture)" }] },
          { cells: [{ ko: "코드 양", en: "Lines of code" }, { ko: "quirks 우회 코드 누적", en: "Workaround code piles up" }, { ko: "더 짧고 명확", en: "Shorter, clearer" }], highlight: true },
        ],
      } satisfies ComparisonTable,
    ],
    images: [
      {
        alt: { ko: "Admin 글 편집 — 카테고리/태그 chip 드래그 정렬", en: "Admin editor — category/tag chip drag reorder" },
        placeholderKeyword: "Admin 글 편집 페이지 — chip 들을 드래그해서 순서 바꾸는 중간 상태",
        position: "definition",
      },
      {
        alt: { ko: "Admin 시리즈 — 페이지네이션된 리스트에서 chip 을 다음 페이지로 끌어오는 시점", en: "Admin series — dragging a chip onto the next page in a paginated list" },
        placeholderKeyword: "Admin 시리즈 페이지 — 페이지네이션된 리스트에서 항목 끌어 다음 페이지로",
        position: "solution",
      },
    ],
  },
  {
    section: { ko: "Frontend / Layout", en: "Frontend / Layout" },
    problem: {
      ko: "Navigation 메뉴가 좁은 viewport 에서 우측 actions 와 겹침 + indicator 가 resize 중 메뉴 위치를 못 따라감",
      en: "Navigation menu overlaps the right actions on narrow viewports + indicator drifts behind the menu while resizing",
    },
    definition: {
      ko: "PC 레이아웃에서 navigation 메뉴는 `position: absolute; left: 50%; transform: translateX(-50%)` 로 viewport 정중앙에 고정되어 있었는데, 우측 navActions(언어/사운드/테마/email/Bell/Logout) 가 길어지면 메뉴와 겹치는 너비 구간이 발생. flex 로 바꿔 좌·우 사이 가운데로 옮겼더니 이번엔 active link 를 가리키는 sliding indicator 가 창 너비 변경 중 ~300ms 의 transition lag 으로 메뉴 위치를 따라가지 못해 계속 어긋난 채로 끌려옴.",
      en: "On PC, the nav menu was pinned to viewport center with `position: absolute; left: 50%; transform: translateX(-50%)`. As `navActions` (lang / sound / theme / email / Bell / Logout) grew, there was a viewport range where the menu overlapped the right cluster. Switching to flex (\"center between logo and actions\") fixed the collision but introduced a new bug: the sliding indicator that highlights the active link lagged the menu by ~300ms during continuous resize because of its CSS transition, leaving a visible drift the whole time the user dragged the window edge.",
    },
    cause: {
      ko: "정중앙 고정 방식은 좌측 로고 폭과 우측 actions 폭이 서로 다르거나 `--page-px` 가 작아질 때 절대 위치가 고려되지 못해 자연스럽게 겹침. flex 전환 후 lag 은 `.navIndicator { transition: left var(--duration-moderate) ease, width ... }` 가 항상 활성이라, 매 resize event 가 새 left/width 를 전달해도 indicator 는 이전 값에서 새 값으로 천천히 이동 → 사용자에겐 \"메뉴는 즉시 옮겨가는데 indicator 만 뒤따라옴\".",
      en: "Viewport-center pinning ignores left/right cluster widths — when one side grows or `--page-px` shrinks, collision is inevitable. After moving to flex, the lag came from `.navIndicator { transition: left var(--duration-moderate) ease, width ... }` being always-on. Every resize event pushes new left/width values, but the indicator eases from the previous value toward the new one — to the user, \"the menu jumps to its new position, but the indicator drags ~300ms behind.\"",
    },
    solution: {
      ko: "두 단계. ① 레이아웃: `.navCenter` 를 `position: relative; flex: 1; justify-content: center` 로 전환 — 좌측 로고와 우측 actions 가 각자 자기 폭을 점유하고, 그 사이 남는 공간의 가운데에 메뉴가 자연스럽게 자리잡음. ② indicator 트랜지션: window `resize` + `ResizeObserver(navCenter + nav)` 양쪽 모두 listen. 발화 시 `setIndicatorInstant(true)` + `updateIndicator()` 호출 후 120ms 디바운스로 다시 false. resize 중엔 `style={{ ...indicatorStyle, transition: \"none\" }}` 가 inline 으로 들어가 즉시 snap, resize 끝나면 hover/네비게이션용 transition 복원.",
      en: "Two steps. ① Layout: `.navCenter` → `position: relative; flex: 1; justify-content: center` — logo and actions occupy their natural widths, and the menu sits in the middle of the remaining space, with no overlap risk. ② Indicator transition: listen on both `window resize` and `ResizeObserver(navCenter + nav)`. On every fire, `setIndicatorInstant(true)` + `updateIndicator()`, then a 120ms debounce sets it back to false. While instant, the indicator is rendered with `style={{ ...indicatorStyle, transition: \"none\" }}` so it snaps frame-by-frame to the new position; once resize ends, the normal hover/navigation transition is restored.",
    },
    keyInsight: {
      ko: "① **viewport 절대중앙은 양쪽 영역의 폭을 모름** — 좌·우가 비대칭이거나 동적이면 flex `flex: 1; justify-content: center` 가 \"가운데\" 의 의미를 정확히 표현. ② **CSS transition 은 \"한 번의 사용자 의도\" 에 적합하지, 연속 입력에는 부적합** — resize / scroll 같은 연속 stream 동안엔 transition 을 꺼서 매 frame snap 시키고, stream 종료 후 transition 을 복원해야 \"부드러운 이동\" 의 의미가 유지됨. 인라인 `transition: \"none\"` 으로 짧게 끄는 패턴이 가장 가벼운 해법.",
      en: "① **Absolute viewport-center has no idea what's to the left or right** — for asymmetric/dynamic clusters, `flex: 1; justify-content: center` expresses \"between\" precisely. ② **CSS transitions fit single user intents, not continuous input streams** — during resize / scroll, disable the transition so the element snaps every frame, then re-enable it after the stream ends. An inline `transition: \"none\"` toggled by a debounced state is the lightest pattern that preserves \"smooth\" semantics for hover-driven changes.",
    },
    tags: ["flex", "absolute positioning", "transition", "resize", "Navigation", "indicator"],
  },
  {
    section: { ko: "Frontend / Image", en: "Frontend / Image" },
    problem: {
      ko: "이미지 깨짐 placeholder — `dangerouslySetInnerHTML` 로 렌더된 markdown img 에는 React onError 가 안 붙음",
      en: "Image fallback — React `onError` doesn't bind to `<img>` rendered via `dangerouslySetInnerHTML`",
    },
    definition: {
      ko: "이 사이트의 모든 이미지 영역 — 에디터 커버, 포스트 본문, Works 갤러리, Plate 에디터 패널 등 — 에서 \"이미지가 깨졌을 때 (404 / CORS 등) `/images/placeholder.svg` 로 자동 교체\" 되는 통일된 fallback 규칙을 적용하고 싶었습니다.\n\nReact 컴포넌트로 직접 렌더링되는 `<img onError>` 는 정상 동작했지만, **마크다운으로 렌더링된 본문** (MarkdownRenderer) 과 **richtext 영역** 에서는 동일한 `onError` 가 발화하지 않았습니다. 그 결과 해당 영역에서는 깨진 이미지가 그대로 사용자에게 노출되었습니다.",
      en: "I wanted a single fallback rule across every image surface — editor cover, post body, Works gallery, Plate editor panels — so that broken images (404, CORS, etc.) auto-swap to `/images/placeholder.svg`.\n\nReact's `<img onError>` worked fine on JSX-rendered images, but it **never fired in markdown-rendered post bodies** (MarkdownRenderer) and **richtext regions** — broken images stayed visible to readers.",
    },
    cause: {
      ko: "원인은 세 가지가 겹쳐 있었습니다.\n\n**① React 합성 이벤트의 사각지대** — `dangerouslySetInnerHTML` 로 삽입된 DOM 은 React 의 reconciler 가 관리하지 않습니다. `onError` 같은 합성 이벤트 prop 은 해당 영역에 부착되지 않으므로, native `addEventListener(\"error\")` 를 직접 사용해야 합니다.\n\n**② 이미 종료된 이미지는 error 가 재발화하지 않음** — 이미지 listener 를 \"늦게\" 부착하면, 이미 로드 시도가 종료된 (성공이든 실패든) 이미지의 `error` 이벤트는 소급해 다시 발화하지 않습니다. 따라서 `addEventListener` 만 부착해서는 \"이미 깨져 있던 이미지\" 까지 처리할 수 없습니다.\n\n**③ 동적으로 추가되는 img** — richtext 영역은 사용자가 에디터 모드를 토글하거나 lazy 로딩 등으로 `<img>` 가 뒤늦게 추가되는 경우가 많습니다. 초기에 `querySelectorAll(\"img\")` 한 번만 실행하고 종료하면, 이후 추가된 img 는 listener 가 없어 깨진 상태로 남습니다.",
      en: "Three issues compounded:\n\n**① React's synthetic-event blind spot** — DOM injected via `dangerouslySetInnerHTML` lives outside React's reconciler. Synthetic event props like `onError` don't bind there, so you have to fall back to native `addEventListener(\"error\")`.\n\n**② Already-finished images don't refire error** — if you attach a listener \"late\", an image that already finished loading (whether success or failure) won't refire its `error` event retroactively. `addEventListener` alone misses every already-broken image.\n\n**③ Dynamically added images** — richtext regions often grow new `<img>` nodes later (editor mode toggle, lazy load). A one-shot `querySelectorAll(\"img\")` at mount time misses any image added afterward.",
    },
    solution: {
      ko: "위 세 가지를 한 번에 해결하는 `attachImageFallback(root)` 유틸을 작성하여 MarkdownRenderer 와 `useRichtextEnhance` 두 곳에 적용했습니다.\n\n**① 컨테이너 안의 모든 img 에 listener 부착** — `data-fallback-bound` 속성으로 중복 부착을 방지하면서 native `error` listener 를 부착합니다.\n\n**② 즉시 동기 체크** — 부착 직후 `img.complete && img.naturalWidth === 0` 을 검사합니다. 두 조건이 모두 true 이면 \"로드는 종료되었으나 width 가 0\" → 이미 실패한 이미지라는 의미입니다. 이 경우 retroactive 이벤트가 발생하지 않으므로 **즉시 placeholder 로 swap** 합니다.\n\n**③ MutationObserver 로 추가되는 img 도 추적** — `MutationObserver(root, { childList: true, subtree: true })` 를 등록하면, 이후 추가되는 img 도 자동으로 동일한 처리를 받습니다. richtext 가 동적으로 변경되어도 안전합니다.\n\n**보너스 트릭** — placeholder 로 swap 할 때 `removeAttribute(\"srcset\")` 도 함께 호출합니다. srcset 이 남아 있으면 브라우저가 swap 한 src 보다 srcset 의 후보를 우선 시도하여 다시 깨지는 경우가 있기 때문입니다.\n\n반대로 React 컴포넌트로 직접 렌더링되는 영역 (PostEditor cover, WorkEditor main/gallery, RelationPicker chip, Plate ImagePanel 등) 은 평범하게 `onError` + state swap 만으로도 동일한 효과를 얻을 수 있습니다. DOM 을 직접 조작할 필요가 없으므로 이쪽이 가장 간결합니다.",
      en: "Built `attachImageFallback(root)` to handle all three at once, applied to MarkdownRenderer and `useRichtextEnhance`:\n\n**① Attach a listener to every img** — gate with a `data-fallback-bound` attribute to prevent double-binding, then attach a native `error` listener.\n\n**② Synchronous immediate check** — right after attach, test `img.complete && img.naturalWidth === 0`. If both are true, the image has already finished loading with zero width = it's already broken. Since no retroactive event will arrive, **swap to placeholder synchronously**.\n\n**③ Incremental tracking with MutationObserver** — register `MutationObserver(root, { childList: true, subtree: true })` so images added later receive the same treatment. Richtext can mutate freely.\n\n**Bonus trick** — when swapping, also `removeAttribute(\"srcset\")`. Otherwise the browser may prefer srcset candidates over the swapped src and break again.\n\nReact-rendered surfaces (PostEditor cover, WorkEditor main/gallery, RelationPicker chip, Plate ImagePanel, etc.) just use plain `onError` + state swap — no DOM manipulation needed, the cleanest path.",
    },
    keyInsight: {
      ko: "이 사례 하나에서 React 와 native DOM 의 경계에 대한 사실 4가지를 정리할 수 있었습니다.\n\n**① `dangerouslySetInnerHTML` 영역은 React 합성 이벤트의 사각지대** — 이벤트 위임이 동작하지 않으므로, native `addEventListener` 가 유일한 선택지입니다.\n\n**② 이미 종료된 이미지는 `error` 가 재발화하지 않음** — listener 부착 직후 `complete && naturalWidth === 0` 같은 동기 체크가 필수입니다.\n\n**③ src 만 변경해도 srcset 이 이전 후보를 다시 시도함** — swap 시 `removeAttribute(\"srcset\")` 도 함께 호출해야 합니다.\n\n**④ 동적 콘텐츠는 `querySelectorAll` 단일 호출로는 처리 불가** — MutationObserver 로 점진적으로 추적해야 합니다.\n\n넷 모두 개별적으로 보면 사소하지만, 이 중 하나라도 누락되면 \"왜 유독 이 이미지만 fallback 이 동작하지 않는가?\" 라는 함정에 빠지게 됩니다.",
      en: "This one case packs four facts about the React / native-DOM boundary:\n\n**① `dangerouslySetInnerHTML` is React's synthetic-event blind spot** — no delegation, so `addEventListener` is the only path.\n\n**② Already-finished images don't refire `error` retroactively** — pair the listener with a synchronous `complete && naturalWidth === 0` check.\n\n**③ Swapping `src` alone lets `srcset` retry stale candidates** — always pair the swap with `removeAttribute(\"srcset\")`.\n\n**④ A one-shot `querySelectorAll` misses dynamic content** — track incrementally with MutationObserver.\n\nEach is minor on its own, but missing any one creates the \"why doesn't fallback work for *this* image?\" trap.",
    },
    tags: ["dangerouslySetInnerHTML", "MutationObserver", "image fallback", "onError", "richtext", "MarkdownRenderer"],
    comparisons: [
      {
        label: { ko: "수정 전 / 수정 후", en: "Before / After" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "수정 전", en: "Before" },
          { ko: "수정 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "이벤트 부착 방식", en: "Event binding" }, { ko: "JSX 만 onError prop", en: "Only JSX `onError` prop" }, { ko: "JSX + native addEventListener", en: "JSX + native addEventListener" }] },
          { cells: [{ ko: "마크다운/richtext 의 깨진 img", en: "Broken img in markdown/richtext" }, { ko: "✗ 그대로 노출", en: "✗ Stays visible" }, { ko: "✓ placeholder 로 swap", en: "✓ Swaps to placeholder" }] },
          { cells: [{ ko: "이미 실패 상태의 img", en: "Already-failed images" }, { ko: "✗ error 재발화 안 됨 → 못 잡음", en: "✗ Error doesn't refire" }, { ko: "✓ complete + naturalWidth 동기 체크", en: "✓ Sync `complete && naturalWidth===0`" }] },
          { cells: [{ ko: "동적으로 추가되는 img", en: "Dynamically added imgs" }, { ko: "✗ querySelectorAll 단발 → 누락", en: "✗ One-shot querySelectorAll misses" }, { ko: "✓ MutationObserver 추적", en: "✓ MutationObserver tracks" }] },
          { cells: [{ ko: "swap 후 srcset 재시도", en: "srcset retry after swap" }, { ko: "✗ 깨진 후보 다시 시도", en: "✗ Browser retries broken candidates" }, { ko: "✓ removeAttribute(srcset)", en: "✓ removeAttribute(srcset)" }] },
        ],
      } satisfies ComparisonTable,
    ],
    images: [
      {
        alt: { ko: "리치텍스트 글에서 이미지 src 가 404 인 경우 — 깨진 이미지 아이콘이 그대로 노출", en: "Richtext post with 404 image src — broken-image icon stays visible" },
        placeholderKeyword: "글 상세 페이지 — markdown 본문 안 깨진 이미지 (수정 전: 브라우저 기본 broken icon)",
        position: "cause",
      },
      {
        alt: { ko: "Custom placeholder 로 swap 된 후 — 깔끔한 \"이미지 로드 실패\" 카드", en: "After swap to custom placeholder — clean \"image failed\" card" },
        placeholderKeyword: "수정 후 placeholder — 카드 형태의 \"이미지 로드 실패\" UI",
        position: "solution",
      },
    ],
  },
  {
    section: { ko: "Frontend / Layout", en: "Frontend / Layout" },
    problem: {
      ko: "커버 이미지 팔레트 등 grid 자식이 viewport 밖으로 잘려 나감 — `.row { grid-template-columns: 1fr 1fr }` 의 함정",
      en: "Cover image palette and other grid children clipping outside the viewport — the `.row { grid-template-columns: 1fr 1fr }` trap",
    },
    definition: {
      ko: "Admin 에디터의 2-col row(`grid-template-columns: 1fr 1fr`) 안에 cover thumbnail + 추출 팔레트가 들어가는데, 좁은 화면이나 긴 키워드/URL 이 들어간 셀에서 **cell 자체가 1fr 비율을 무시하고 부풀어 올라** 형제 셀까지 가로로 밀어내고 결국 viewport 밖으로 잘렸습니다. 부모에 `overflow: hidden` 도 안 걸려 있어 가로 스크롤바가 생기는 경우도 있었습니다.",
      en: "Inside the admin editor's 2-column row (`grid-template-columns: 1fr 1fr`) we lay out the cover thumbnail + extracted palette. On narrow viewports — or when a cell holds a long keyword/URL — **the cell itself ignored the 1fr share and ballooned**, pushing siblings horizontally and eventually clipping past the viewport. The parent had no `overflow: hidden` either, so horizontal scrollbars sometimes appeared.",
    },
    cause: {
      ko: "CSS Grid 트랙의 `1fr` 은 사실 `minmax(auto, 1fr)` 의 단축형입니다. 즉 자식 컨텐츠가 트랙 share 보다 크면 **`min-width: auto` 가 자식 intrinsic content size 를 그대로 잡아 트랙이 부풀어 오릅니다**. 자식 노드(예: CoverImageField 의 palette swatch row, 긴 input value, GitHub URL 등) 어느 하나가 trim 되지 않으면 그 cell 의 트랙이 그만큼 grow 하고, 다른 트랙은 그대로라 **opt-in 한 50:50 비율이 의미 없어집니다**. 안쪽에 `min-width: 0` / `overflow: hidden` 을 일일이 거는 것도 실수하기 쉽습니다.",
      en: "A grid track of `1fr` is shorthand for `minmax(auto, 1fr)` — meaning if a child's content is wider than the track's share, **`min-width: auto` lets the intrinsic content size grow the track**. As soon as one child (palette swatch row, long input value, GitHub URL, etc.) refused to shrink, that track expanded while the others held still — turning the 50:50 ratio into a lie. Adding `min-width: 0` / `overflow: hidden` at every nested level is easy to forget.",
    },
    solution: {
      ko: "`.row` 의 트랙 정의를 `minmax(0, 1fr) minmax(0, 1fr)` 로 교체하고 `min-width: 0` 을 명시. minmax 의 min 을 `0` 으로 강제하면 **트랙은 컨텐츠 폭과 무관하게 share 안에서만 grow** 하고, 안쪽 자식은 자연스럽게 shrink 또는 wrap 합니다. 모바일 break 도 동일하게 `minmax(0, 1fr)` 단일 트랙으로 통일. 추가로 `.palette` 자체에도 `flex-wrap: wrap` + `max-width: 100%` 를 줘 swatch 가 줄바꿈으로 잘리지 않게 보강.",
      en: "Switched the `.row` track definition to `minmax(0, 1fr) minmax(0, 1fr)` and added `min-width: 0`. Forcing the min of `minmax` to `0` **lets the track grow only within its 1fr share, regardless of content width** — inner children shrink (or wrap) naturally. The mobile breakpoint uses the same `minmax(0, 1fr)` single-track form. Additionally, `.palette` got `flex-wrap: wrap` + `max-width: 100%` so swatches wrap instead of clipping.",
    },
    keyInsight: {
      ko: "① **CSS Grid 의 `1fr` 은 항상 `minmax(auto, 1fr)`** — 좁은 컨테이너에서 균등 비율을 보장하려면 `minmax(0, 1fr)` 으로 명시해야 합니다. ② 부모 grid/flex 에서 자식이 안 줄어드는 99% 의 경우는 **min-width: auto 가 컨텐츠 size 를 그대로 잡고 있는 것** — 자식 chain 어디든 `min-width: 0` 이 빠져있으면 전파됩니다. ③ 디버깅 팁: DevTools 의 \"Layout\" 패널에서 grid track 에 마우스를 올리면 **트랙 fr 단위와 실제 폭** 이 동시에 표시됩니다. fr 비율과 실제 px 폭이 안 맞으면 minmax(0, ...) 누락 신호.",
      en: "① **CSS Grid's `1fr` is really `minmax(auto, 1fr)`** — guarantee equal shares on narrow containers by spelling out `minmax(0, 1fr)`. ② 99% of \"flex/grid child won't shrink\" cases are **`min-width: auto` clamping to the content size** — somewhere down the chain, a missing `min-width: 0` is propagating. ③ Debugging tip: DevTools' \"Layout\" panel highlights grid tracks; hovering shows both the **fr declaration and the resolved px width**. If they disagree, you're missing a `minmax(0, …)`.",
    },
    tags: ["CSS Grid", "minmax", "min-width: auto", "overflow", "responsive", "1fr"],
  },
  {
    section: { ko: "Frontend / Component", en: "Frontend / Component" },
    problem: {
      ko: "커스텀 ColorPicker popover 가 trigger 위치에 안 붙음 — wrapper `<span>` 이 0×0 으로 collapse",
      en: "Custom ColorPicker popover anchors to the wrong spot — the wrapper `<span>` collapses to 0×0",
    },
    definition: {
      ko: "커버 이미지 그라데이션 에디터에서는 각 stop (색상 정지점) 마다 ColorPicker 를 띄울 수 있도록 구현했습니다. stop 핸들의 swatch 를 클릭하면 그 위치에 popover 가 표시되어 색을 변경할 수 있는 방식입니다.\n\n그러나 어느 stop 을 클릭해도 **popover 가 항상 같은 좌표 (화면 좌상단 근처) 에** 표시되었습니다. trigger 자체 (handle) 는 stop bar 위 정확한 위치에 표시되는데, popover 만 위치가 완전히 어긋난 상태였습니다.",
      en: "The cover-image gradient editor lets you click each stop (color-stop handle) to open a ColorPicker over it for editing.\n\nBut clicking any stop opened the popover **at the same coordinate (near the top-left)** — the trigger handle itself rendered in the right place, only the popover anchored wrong.",
    },
    cause: {
      ko: "ColorPicker 의 popover 위치는 trigger 노드의 `getBoundingClientRect()` 결과를 기준으로 계산합니다.\n\n이 컴포넌트는 render-prop 패턴 (사용자가 trigger 를 임의의 ReactNode 로 직접 전달하는 형태) 이라, 전달된 trigger 를 일관되게 측정하기 위해 `<span ref={triggerRef}>` 라는 wrapper 로 한 번 감쌌습니다.\n\n문제는 stop handle 들이 `position: absolute` 로 stop bar 위에 절대 좌표로 배치되어 있다는 점이었습니다. **CSS 에서 자식이 `position: absolute` 인 경우, 그 자식은 \"normal flow\" 에서 제외되어 부모의 박스 크기에 전혀 기여하지 않습니다.**\n\n따라서 wrapper `<span>` 이 자식 (handle) 의 크기를 잡지 못해 0×0 으로 collapse 되었고, 모든 stop 의 wrapper rect 가 동일하게 `(stopBar.left, stopBar.top, 0, 0)` 으로 측정되었습니다. 그 결과 popover 가 모두 같은 위치에 표시된 것입니다.",
      en: "The popover's coordinates came from the trigger node's `getBoundingClientRect()`.\n\nBecause it's a render-prop pattern, users can pass any ReactNode as trigger. To measure it consistently, the component wrapped it in `<span ref={triggerRef}>`.\n\nThe catch: the stop handles use `position: absolute` to sit on top of the stop bar at exact coordinates. **In CSS, an absolutely positioned child is removed from \"normal flow\" and contributes nothing to its parent's box dimensions.**\n\nSo the wrapper `<span>` collapsed to 0×0, and every stop's wrapper rect resolved to the same `(stopBar.left, stopBar.top, 0, 0)` — every popover anchored to the same point.",
    },
    solution: {
      ko: "popover 위치 계산을 **wrapper 의 rect 가 아니라 wrapper 의 첫 자식 (`firstElementChild`) rect 를 우선** 사용하도록 한 줄만 수정했습니다.\n\nwrapper 가 0×0 으로 collapse 되더라도, 실제 trigger 역할을 하는 자식 (stop handle 이든 일반 swatch button 이든) 은 자체 viewport 좌표를 정상적으로 반환합니다. 그 좌표를 기준으로 popover 를 띄우면 정확한 위치에 anchor 됩니다.\n\n자식이 없거나 hidden 인 경우 (rect 도 0×0) 를 대비해, 자식 rect 의 width/height 가 0 이면 wrapper rect 로 fallback 하도록 했습니다. 이 한 줄 변경으로 stop handle (absolute) / 일반 swatch (normal flow) 두 케이스 모두 정확하게 anchor 됩니다.",
      en: "Updated the popover positioning to **prefer the wrapper's first child (`firstElementChild`) rect over the wrapper's own rect**.\n\nEven when the wrapper collapses to 0×0, the actual trigger child (stop handle or regular swatch button) returns proper viewport coordinates. Using those puts the popover in the right place.\n\nFor cases where the child is missing or hidden (rect is also zero-sized), fall back to the wrapper's rect. One change covers both stop-handle (absolute) and normal swatch (in flow) trigger shapes correctly.",
    },
    keyInsight: {
      ko: "이 사례에서 일반화 가능한 교훈 3가지를 얻었습니다.\n\n**① `position: absolute` 인 자식은 부모의 box 에 기여하지 않습니다.** render-prop 으로 임의의 자식을 받는 컴포넌트가 wrapper 의 `getBoundingClientRect()` 를 그대로 신뢰하면, 자식이 absolute 인 순간 silently 깨집니다.\n\n**② 측정 대상은 wrapper 보다 자식 (또는 가장 가까운 visible descendant) 이 더 안전합니다.** 사용자가 어떤 CSS 로 자식을 배치하든 자식 자체는 viewport 좌표를 가지며, wrapper 의 크기는 자식의 layout 에 영향을 받기 때문입니다.\n\n**③ 디버깅 팁** — popover 가 엉뚱한 위치에 표시되면, DevTools console 에서 `el.getBoundingClientRect()` 를 wrapper 와 자식 양쪽에 찍어 보십시오. wrapper 가 0×0 으로 출력되면 그것이 답입니다.",
      en: "Three generalizable lessons from this case:\n\n**① An `position: absolute` child contributes nothing to its parent's box.** A component that accepts arbitrary render-prop children can't trust the wrapper's `getBoundingClientRect()` — it silently breaks the moment the child is absolute.\n\n**② Prefer the child (or nearest visible descendant) over the wrapper for measurement.** Whatever CSS the consumer applies, the child still has its own viewport coordinates; the wrapper inherits its size from the child.\n\n**③ Debug tip** — when a popover anchors to the wrong spot, log `el.getBoundingClientRect()` for both the wrapper and the child in DevTools. A 0×0 wrapper is the smoking gun.",
    },
    tags: ["ColorPicker", "render-prop", "getBoundingClientRect", "position: absolute", "popover", "portal"],
    comparisons: [
      {
        label: { ko: "수정 전 / 수정 후", en: "Before / After" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "수정 전", en: "Before" },
          { ko: "수정 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "popover 좌표 측정 대상", en: "Position measurement target" }, { ko: "wrapper `<span>`", en: "wrapper `<span>`" }, { ko: "wrapper.firstElementChild 우선", en: "wrapper.firstElementChild preferred" }] },
          { cells: [{ ko: "trigger 자식이 position:absolute", en: "Trigger child uses position:absolute" }, { ko: "wrapper 가 0×0 으로 collapse", en: "Wrapper collapses to 0×0" }, { ko: "자식 rect 로 정확히 측정", en: "Child rect measured correctly" }] },
          { cells: [{ ko: "stop 별 popover 위치", en: "Per-stop popover position" }, { ko: "모두 (0, stopBar.top) 동일", en: "All same `(0, stopBar.top)`" }, { ko: "stop handle 좌표대로 정렬", en: "Aligns with each handle" }] },
          { cells: [{ ko: "일반 swatch trigger", en: "Plain swatch trigger" }, { ko: "정상 (자식이 normal flow)", en: "OK (child in flow)" }, { ko: "정상 (변화 없음)", en: "OK (unchanged)" }] },
          { cells: [{ ko: "자식 없거나 hidden", en: "No child / hidden" }, { ko: "0×0 그대로", en: "Still 0×0" }, { ko: "wrapper rect 로 fallback", en: "Falls back to wrapper rect" }] },
        ],
      } satisfies ComparisonTable,
    ],
    images: [
      {
        alt: { ko: "ColorPicker 가 stop bar 의 stop handle 들 위에 떠 있어야 하는데 모두 같은 위치에 anchor 된 상태", en: "ColorPicker stops should anchor to each handle but all collapsed to one spot" },
        placeholderKeyword: "Admin 글 편집 — gradient stop bar 위 ColorPicker popover (수정 전: 모든 popover 가 같은 위치에)",
        position: "cause",
      },
      {
        alt: { ko: "수정 후 — 각 stop 위치에 정확히 popover anchor", en: "After — popover anchors to each stop position correctly" },
        placeholderKeyword: "Admin 글 편집 — gradient stop bar 위 ColorPicker popover (수정 후: 각 handle 위치에 정확히)",
        position: "solution",
      },
    ],
  },

  /* ── Backend / Security ── */
  {
    section: { ko: "Backend / Security", en: "Backend / Security" },
    problem: {
      ko: "익명 댓글 수정·삭제 — 클라이언트는 비밀번호 강제, 서버는 우회 허용",
      en: "Anonymous Comment Edit/Delete — Client Required Password, Server Allowed Bypass",
    },
    definition: {
      ko: "익명 사용자가 단 댓글을 수정·삭제하려면 **댓글 작성 시 입력한 비밀번호** 가 필요합니다. 클라이언트의 폼은 비번을 입력하지 않으면 제출 버튼 자체가 막혀 있어, UI 만 따라가는 사용자는 \"비번이 유일한 인증\" 이라고 자연스럽게 받아들이게 됩니다.\n\n그런데 보안 검토 중에 서버 라우트 코드를 다시 읽어 보니, **서버는 비번 검증을 강제하지 않고 있었습니다.** 폼을 거치지 않고 `curl` 로 직접 PATCH/DELETE 를 호출하면 비번 없이도 통과시키는 경로가 살아 있었고, 그 경로는 31-bit 짜리 약한 해시 비교에 의존하고 있어 brute-force 가 현실적으로 가능한 수준이었습니다.",
      en: "Editing or deleting an anonymous comment requires **the password the commenter set when posting**. The form blocks the submit button unless a password is entered, so UI users naturally assume \"password is the only auth\".\n\nBut while reviewing security I read the server route again — **the server did not actually enforce password verification**. Bypassing the form and hitting PATCH/DELETE with `curl` directly went through a second code path that didn't require the password and relied on comparing a weak 31-bit hash — brute-forceable on a single laptop.",
    },
    cause: {
      ko: "익명 댓글 시스템은 두 가지 식별 수단을 같이 가지고 있습니다.\n\n**① 비밀번호 (bcrypt 해시 저장)** — 사용자가 직접 입력한 값. 본인 확인의 \"의도된\" 수단.\n**② commenter_hash** — `commenter_id` (브라우저 localStorage) + `target_id` 를 31-bit 비암호 해시로 압축해 저장. 원래 의도는 \"내가 단 댓글에는 수정·삭제 버튼이 보인다\" 같은 UI 표시 용도.\n\n문제는 서버 PATCH/DELETE 의 인증 로직이 **OR 조건** 으로 짜여 있었다는 점입니다.\n\n```ts\nif (password && comment.password_hash) {\n  authorized = await bcrypt.compare(password, comment.password_hash);  // 비번 경로\n} else if (commenter_id && target_id && comment.commenter_hash) {\n  authorized = comment.commenter_hash === identity.hash;               // hash 경로 — 비번 없이도 통과\n}\n```\n\n폼을 통한 정상 요청은 항상 비밀번호를 넣어 보내므로 첫 분기에서 검증을 통과합니다. 그래서 UI 테스트만으로는 두 번째 분기의 위험이 드러나지 않았습니다.\n\n그러나 공격자가 폼을 거치지 않고 `password` 필드를 비운 채 직접 API 를 호출하면, 흐름은 그대로 두 번째 분기로 빠집니다. 그리고 두 번째 분기에서 비교하는 `commenter_hash` 는 **공개 GET 응답에 그대로 노출되어 있었습니다.** UI 표시 용도라 보호 가치가 낮다고 판단했던 값이 사실 인증 키로 동시에 쓰이고 있었던 셈입니다.\n\n해시 함수도 약점이었습니다. `((hash << 5) - hash + char) | 0` 형태의 단순 누적 해시는 31-bit 키스페이스(약 2 billion) 안에서만 분포하므로, 같은 `target_id` 아래 동일 해시를 만드는 `commenter_id` UUID 를 **단일 코어로 약 30분, 병렬화하면 분 단위** 에 찾아낼 수 있습니다.\n\n결과적으로 \"피해자의 댓글에서 commenter_hash 읽기 → brute-force → 위변조된 commenter_id 로 PATCH/DELETE 요청\" 이라는 공격 경로가 살아 있었고, 정상 사용자는 비번을 안 적으면 폼에서 막히는데 공격자는 비번 없이도 통과할 수 있는 상태였습니다.",
      en: "The anonymous comment system carries two identifiers side by side.\n\n**① Password (bcrypt-hashed)** — user-entered, the intended auth.\n**② commenter_hash** — `commenter_id` (browser localStorage) + `target_id` compressed into a 31-bit non-cryptographic hash. Originally meant for UI flagging (\"this is my comment\").\n\nThe issue: server PATCH/DELETE auth was **an OR**:\n\n```ts\nif (password && comment.password_hash) {\n  authorized = await bcrypt.compare(password, comment.password_hash);  // password path\n} else if (commenter_id && target_id && comment.commenter_hash) {\n  authorized = comment.commenter_hash === identity.hash;               // hash path — passes without password\n}\n```\n\nForm-driven requests always include the password, so the first branch handles them — the second branch never triggers in UI testing.\n\nBut an attacker who skips the form and sends the request directly with an empty `password` falls straight into the second branch. And the `commenter_hash` compared there was **returned in public GET responses**. A value treated as low-risk UI metadata was simultaneously being used as an auth key.\n\nThe hash itself was also weak. `((hash << 5) - hash + char) | 0` lives within a ~2-billion (31-bit) keyspace; finding a `commenter_id` UUID that hashes to the target value under a fixed `target_id` takes **~30 minutes on a single core, minutes if parallelized**.\n\nNet result: \"read victim's commenter_hash from public GET → brute-force a colliding commenter_id → PATCH/DELETE without a password\" was a viable attack path. Legitimate users were gated by the form, but attackers weren't.",
    },
    solution: {
      ko: "**서버 측 인증 경로를 비밀번호 단일 경로로 통일** 했습니다. `else if` 의 hash 경로 자체를 제거하고, 비번 미제출이거나 비번 해시가 비어 있으면 무조건 401/403 으로 거절합니다.\n\n```ts\nif (!comment.password_hash) {\n  return jsonError(\"Password required — contact admin to edit this comment\", 403);\n}\n if (!password) return jsonError(\"Password required\", 401);\nconst authorized = await bcrypt.compare(password, comment.password_hash);\n```\n\n동시에 POST 단계의 `validatePassword` 도 빈 값을 거절하도록 조였습니다. 이전에는 `optional for some flows` 라는 이유로 빈 값을 통과시켜, `curl` 로 비번 없이 댓글을 만들면 `password_hash` 가 빈 문자열로 저장되어 본인도 수정 못 하는 상태가 되어 있었습니다.\n\n해시 함수 자체를 HMAC-SHA256 으로 교체하는 옵션도 검토했지만, **서버 인증 경로에서 hash 비교를 제거한 시점에 hash 의 무게는 \"UI 식별자\" 수준으로 떨어졌기 때문에** 교체보다는 경로 통일이 더 비용 대비 이득이 컸습니다. 해시 값은 DB 에 그대로 남아 \"내 댓글\" UI 표시에만 쓰이고, 인증 가치는 0 이 됩니다.",
      en: "**Collapsed server-side auth into a single password path.** Removed the `else if` hash branch entirely; missing password or empty `password_hash` is now a flat 401/403:\n\n```ts\nif (!comment.password_hash) {\n  return jsonError(\"Password required — contact admin to edit this comment\", 403);\n}\nif (!password) return jsonError(\"Password required\", 401);\nconst authorized = await bcrypt.compare(password, comment.password_hash);\n```\n\nAlso tightened `validatePassword` on POST to reject empty values. Previously \"optional for some flows\" allowed `curl`-created comments with empty `password_hash` — and after this change those comments would be uneditable, so the loophole had to close at creation too.\n\nReplacing the hash with HMAC-SHA256 was on the table, but **once the server stopped using the hash for auth, the hash's threat weight dropped to \"UI identifier\"** — collapsing the path was a bigger win per unit of work than swapping the algorithm. The hash stays in the DB for \"this is my comment\" UI flagging; its auth value is now zero.",
    },
    keyInsight: {
      ko: "**클라이언트가 강제한다고 해서 서버가 강제하는 것은 아닙니다.**\n\n폼이 \"비번 없이는 제출 불가\" 라고 막아도, 그건 그 UI 한 곳에만 적용된 약속입니다. 동일한 API 가 서버 측에서도 똑같이 강제해야만 보장이 됩니다.\n\n또 하나, **인증 경로를 OR 로 늘리지 말 것.** 강한 경로 (비번 bcrypt) 와 약한 경로 (비암호 해시 비교) 를 OR 로 묶으면, 시스템의 보안 강도는 항상 가장 약한 경로 기준으로 떨어집니다. 가능하면 단일 경로로 통일하고, 부가 식별자는 인증 이외 용도로만 쓰는 게 안전한 기본값입니다.",
      en: "**Client-side enforcement is not server-side enforcement.**\n\nA form that blocks submission without a password only commits that one UI. The same guarantee has to be enforced server-side on the same API — otherwise it isn't a guarantee.\n\nAlso, **don't OR your auth paths.** A strong path (bcrypt password) and a weak path (non-crypto hash compare) ORed together collapses the system's security floor to the weaker one. Prefer a single path; keep auxiliary identifiers strictly out of the auth boundary.",
    },
    comparisons: [
      {
        label: { ko: "수정 전 / 수정 후 — 익명 댓글 PATCH·DELETE 인증", en: "Before / After — Anonymous Comment PATCH·DELETE Auth" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "수정 전", en: "Before" },
          { ko: "수정 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "인증 경로", en: "Auth paths" }, { ko: "비번 OR commenter_hash", en: "Password OR commenter_hash" }, { ko: "비번만", en: "Password only" }] },
          { cells: [{ ko: "비번 없이 폼 우회 호출", en: "curl without password" }, { ko: "hash 경로로 통과 가능", en: "Bypassed via hash path" }, { ko: "401/403 거절", en: "401/403 rejected" }] },
          { cells: [{ ko: "공개 GET 의 commenter_hash 노출", en: "commenter_hash in public GET" }, { ko: "인증 키 동시 노출", en: "Doubles as auth key" }, { ko: "UI 표시용 metadata 로만 기능", en: "UI marker only — no auth value" }] },
          { cells: [{ ko: "POST 시 빈 비밀번호", en: "Empty password on POST" }, { ko: "허용 (`password_hash=\"\"` 저장)", en: "Allowed (empty hash stored)" }, { ko: "`PASSWORD_REQUIRED` 거절", en: "Rejected (`PASSWORD_REQUIRED`)" }] },
          { cells: [{ ko: "brute-force 위협", en: "Brute-force exposure" }, { ko: "31-bit 해시 — 단일 코어 ~30분", en: "31-bit hash — ~30min single core" }, { ko: "bcrypt 만 — 실질적으로 불가", en: "bcrypt only — infeasible" }], highlight: true },
        ],
      } satisfies ComparisonTable,
    ],
  },

  {
    section: { ko: "Backend / Security", en: "Backend / Security" },
    problem: {
      ko: "공개 API 의 `?all=true` 쿼리로 비공개 글 / 휴지통이 인증 없이 전부 노출",
      en: "Public API `?all=true` Leaked All Drafts and Trash Without Auth",
    },
    definition: {
      ko: "`/api/posts` 와 `/api/works` 목록 API 는 사용자 페이지가 호출하는 공개 엔드포인트입니다. 다만 admin 화면도 같은 라우트를 재활용해 \"비공개 글까지 다 달라\" 라는 의미로 `?all=true`, \"휴지통 목록만 달라\" 의 의미로 `?trash=true` 라는 쿼리를 사용하고 있었습니다.\n\n그런데 보안 검토 중에 코드를 다시 보니, **이 두 쿼리가 들어왔을 때 라우트가 인증 없이 service-role 클라이언트로 곧장 DB 를 조회하고 있었습니다.** 즉 `curl https://your-site/api/posts?all=true` 한 줄이면 누구든 모든 draft 의 내용을 받아 갈 수 있는 상태였습니다.",
      en: "The `/api/posts` and `/api/works` list endpoints are public — they're what user-facing pages call. The admin UI reused them, passing `?all=true` for \"include unpublished\" and `?trash=true` for \"trashed only\".\n\nReviewing the code for security, I noticed that **with those query flags the route hit the DB through the service-role admin client without any auth check.** `curl https://your-site/api/posts?all=true` was enough for anyone to read every draft.",
    },
    cause: {
      ko: "원인은 두 가지가 겹쳤습니다.\n\n**① service-role 클라이언트의 의미 오인.** Supabase 에는 두 종류의 클라이언트가 있습니다. 사용자 쿠키 기반 (`createClient`) 은 RLS 정책의 통제를 받지만, service-role 키 기반 (`createAdminClient`) 은 **RLS 를 통째로 우회** 합니다. admin 화면에서 비공개 글까지 다루려면 RLS 를 우회할 수밖에 없어 service-role 을 쓴 건 맞지만, **\"누가 이 쿼리를 보낸 사람인지\" 를 확인하는 책임은 그대로 라우트 코드에 남아 있어야 했는데** 그 단계가 빠져 있었습니다.\n\n**② 라우트 분리 vs 쿼리 분기의 trade-off 를 잘못 잡음.** \"같은 데이터, 다른 필터\" 라는 이유로 admin·anonymous 가 같은 라우트를 공유하기로 했는데, 그게 곧 \"같은 인증 경로를 공유한다\" 는 의미는 아니었습니다. 쿼리 파라미터 하나 (`?all=true`) 가 service-role 진입을 토글하는 구조가 되어 있어, 결국 **인증 없는 호출이 admin 권한으로 처리되는 경로** 가 만들어진 셈이었습니다.\n\nworks 라우트는 더 나아가, **default 상태에서도 항상 service-role 클라이언트를 쓰고** 있었습니다. anonymous 호출의 경우 `published = true AND deleted_at IS NULL` 필터를 라우트 안에서 명시적으로 추가해 결과적으로는 공개 글만 반환했지만, 이 \"기본 필터\" 는 한 줄 빠지거나 잘못 작성되면 비공개 글이 줄줄 새 나갈 수 있는 구조였습니다. RLS 가 강제하는 default-deny 가 아닌 라우트 코드에 의존하는 default-allow 였던 셈입니다.",
      en: "Two failures stacked on top of each other.\n\n**① Misreading what the service-role client means.** Supabase has two clients. The cookie-bound one (`createClient`) is governed by RLS; the service-role one (`createAdminClient`) **bypasses RLS entirely**. The admin UI needs that bypass to read unpublished rows — fine. But **the responsibility for \"who is asking this?\" stayed with route code**, and that check was missing.\n\n**② Sharing the route without sharing the auth model.** Admin and anonymous used the same route under the banner of \"same data, different filters\". That conflated routing with authentication. A single query parameter (`?all=true`) toggled service-role entry, so anonymous callers could opt themselves into admin-level access just by adding a string.\n\nThe works route went a step further — it **always used the service-role client**, even for anonymous requests, and merely added `published = true AND deleted_at IS NULL` in the route body. That's a default-allow that depends on a route filter being correct. RLS would have been default-deny. One missing line and unpublished data leaks.",
    },
    solution: {
      ko: "**`?all` / `?trash` 가 들어온 경우에만 `requireAuth()` 를 호출** 하도록 라우트 앞단에 가드를 두었습니다. anonymous 경로 (필터 없이 / `published=true` 만) 는 그대로 유지해, 사용자 페이지의 트래픽은 영향을 받지 않습니다.\n\n```ts\nif (showAll || showTrash) {\n  const { error: authError } = await requireAuth();\n  if (authError) return authError;\n}\n```\n\n동시에 `/api/posts/[id]` 와 `/api/works/[id]` 의 단일 row GET 도 admin 만 사용하는 패턴이라는 걸 코드 흐름으로 확인한 뒤 (`fetch(\\`/api/posts/${id}\\`)` 호출처가 admin 전용 페이지였습니다) 일괄 `requireAuth()` 를 적용했습니다. 공개 글 상세 페이지는 slug 기반 (`getPostBySlug`) 으로 DB 에 직접 접근하므로, id 기반 단일 row 엔드포인트를 admin 전용으로 묶어도 사용자 경로에는 영향이 없습니다.\n\n별개의 layer 로, middleware 단에 **fail-closed admin 가드** 도 추가해 두었습니다. layout 의 `redirect` 와 route 의 `requireAuth()` 외에 1개 layer 가 더 생긴 셈입니다. 어떤 admin route 하나에서 `requireAuth()` 를 깜빡하더라도 middleware 가 1차로 막아 줍니다.",
      en: "**Gated `?all` / `?trash` with `requireAuth()` at the route entry.** Anonymous paths (no flag / `published=true`) stay exactly as before — user-page traffic is unaffected.\n\n```ts\nif (showAll || showTrash) {\n  const { error: authError } = await requireAuth();\n  if (authError) return authError;\n}\n```\n\nAlso traced the consumers of `/api/posts/[id]` and `/api/works/[id]` single-row GETs — every caller turned out to be admin-only (the public detail pages use slug-based reads via `getPostBySlug`). Made those `requireAuth()`-gated as well, since they previously exposed unpublished rows by ID to anyone who knew one.\n\nAs a separate layer added a **fail-closed admin gate in middleware** — so layout's `redirect`, route's `requireAuth()`, and middleware are now three independent layers. Any one of them missing `requireAuth()` in the future is still caught by the middleware first.",
    },
    keyInsight: {
      ko: "**RLS 를 우회하는 service-role 클라이언트를 쓰는 순간, 인증의 책임은 라우트 코드로 옮겨집니다.**\n\nadmin 만 쓰던 라우트를 anonymous 와 공유하기로 했다면, \"같은 URL 을 공유한다\" 와 \"같은 인증 모델을 공유한다\" 는 별개의 결정입니다. 후자는 매번 분기마다 다시 확인해야 합니다.\n\n그리고 **default 가 deny 가 되도록 설계할 것.** \"라우트 코드에서 published 필터를 안 빼먹기\" 같은 default-allow 는 한 번의 실수로 무너집니다. RLS 가 default-deny 를 강제할 수 있는 경로면 그쪽을 통과시키고, 어쩔 수 없이 service-role 을 써야 하는 경로면 그 라우트의 앞단을 가장 먼저 가드 하는 게 안전합니다.",
      en: "**The moment you reach for the service-role client, RLS no longer protects you — auth is now route-code's job.**\n\nSharing a URL between admin and anonymous is not the same decision as sharing an auth model. The latter has to be re-verified at every branch.\n\nAnd **design so the default is deny.** \"Don't forget the `published` filter\" is a default-allow that fails on one missed line. Where RLS can enforce default-deny, route through it; where you must bypass with service-role, gate the route entry first.",
    },
    comparisons: [
      {
        label: { ko: "수정 전 / 수정 후 — `?all` · `?trash` 가드", en: "Before / After — `?all` · `?trash` gate" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "수정 전", en: "Before" },
          { ko: "수정 후", en: "After" },
        ],
        rows: [
          { cells: [{ ko: "`curl /api/posts?all=true`", en: "`curl /api/posts?all=true`" }, { ko: "모든 draft 반환", en: "Returns every draft" }, { ko: "401 거절", en: "401 rejected" }] },
          { cells: [{ ko: "`curl /api/posts?trash=true`", en: "`curl /api/posts?trash=true`" }, { ko: "휴지통 노출", en: "Trash exposed" }, { ko: "401 거절", en: "401 rejected" }] },
          { cells: [{ ko: "anonymous 기본 호출", en: "Anonymous default call" }, { ko: "정상", en: "OK" }, { ko: "정상 (영향 없음)", en: "OK (unaffected)" }] },
          { cells: [{ ko: "단일 row GET `/api/posts/[id]`", en: "Single-row GET `/api/posts/[id]`" }, { ko: "비공개 row 도 ID 알면 노출", en: "Unpublished by ID also exposed" }, { ko: "admin only", en: "Admin only" }] },
          { cells: [{ ko: "default 보안 모델", en: "Default security posture" }, { ko: "default-allow (filter 누락 시 leak)", en: "default-allow (one missed filter = leak)" }, { ko: "default-deny (route 가드 + middleware)", en: "default-deny (route gate + middleware)" }], highlight: true },
        ],
      } satisfies ComparisonTable,
    ],
  },

  /* ── Frontend / Component ── */
  {
    section: { ko: "Frontend / Component", en: "Frontend / Component" },
    problem: {
      ko: "Supabase auth subscription cleanup — `.then()` 안의 `return` 은 useEffect cleanup 이 아니다",
      en: "Supabase Auth Subscription Cleanup — Returning from `.then()` Is Not a useEffect Cleanup",
    },
    definition: {
      ko: "Footer 와 Navigation 컴포넌트는 admin 로그인 상태를 표시하기 위해 Supabase 의 `onAuthStateChange` 를 구독합니다. 코드를 보면 \"구독했으니 unmount 때 정리한다\" 의 의도가 분명한데, 실제로는 **그 정리가 한 번도 실행되지 않고** subscription 이 영원히 살아 있었습니다. 컴포넌트가 remount 될 때마다 listener 가 한 개씩 쌓이는 leak 입니다.",
      en: "Footer and Navigation subscribe to Supabase's `onAuthStateChange` to reflect admin login state. The code's intent is obvious — \"we subscribed, so we clean up on unmount\". In reality **the cleanup never ran**, the subscription lived forever, and every remount stacked another listener.",
    },
    cause: {
      ko: "원본 코드는 이런 모양이었습니다.\n\n```ts\nuseEffect(() => {\n  let cancelled = false;\n  loadSupabaseClient().then(async (supabase) => {\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!cancelled) setIsAuthenticated(!!user);\n\n    const { data: { subscription } } = supabase.auth.onAuthStateChange(...);\n    return () => subscription.unsubscribe();   // ← 이게 cleanup 일 것 같지만 아님\n  });\n  return () => { cancelled = true; };          // ← 진짜 useEffect cleanup\n}, [isAdmin]);\n```\n\nReact 의 `useEffect` cleanup 은 **effect 콜백이 직접 return 한 함수** 만 인식합니다. 위 코드의 `() => subscription.unsubscribe()` 는 `.then()` 콜백이 return 하는 함수이고, 그 콜백의 return 값은 **Promise 체인의 다음 then 으로 흘러갈 뿐** React 와는 아무 관계가 없습니다. 실제로 React 가 cleanup 으로 받는 건 두 번째 줄의 `() => { cancelled = true; }` 하나뿐이고, 거기엔 unsubscribe 가 없습니다.\n\n비슷하게 생긴 모양 (\"return 만 하면 정리되겠지\") 때문에 시각적으로는 cleanup 처럼 보이지만, **return 의 \"방향\" 이 잘못된 케이스** 입니다. 게다가 `loadSupabaseClient()` 가 다이나믹 import 라 비동기인데, **promise 가 resolve 되기 전에 컴포넌트가 unmount 되면** `subscription` 변수는 effect 스코프 밖에서 뒤늦게 채워집니다. 그 시점에 cleanup 은 이미 끝나 있어 unsubscribe 가 호출될 기회가 영영 사라집니다.",
      en: "The original shape:\n\n```ts\nuseEffect(() => {\n  let cancelled = false;\n  loadSupabaseClient().then(async (supabase) => {\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!cancelled) setIsAuthenticated(!!user);\n\n    const { data: { subscription } } = supabase.auth.onAuthStateChange(...);\n    return () => subscription.unsubscribe();   // looks like cleanup, isn't\n  });\n  return () => { cancelled = true; };          // the real useEffect cleanup\n}, [isAdmin]);\n```\n\nReact's `useEffect` cleanup is **only the function the effect callback itself returns**. The `() => subscription.unsubscribe()` above is returned by the `.then()` callback, and that return value just flows into the next then in the promise chain — React never sees it. The cleanup React actually receives is the second one (`cancelled = true`), which doesn't unsubscribe anything.\n\nThe two cleanups look similar enough that the eye reads it as \"yeah, returning a cleanup function\" — but **the direction of the return is wrong**. And because `loadSupabaseClient()` is a dynamic import, the promise can resolve **after the component has already unmounted**: `subscription` gets assigned outside the effect's lifetime, and cleanup has long since fired without ever touching it.",
    },
    solution: {
      ko: "두 가지를 같이 고쳤습니다.\n\n**① `subscription` 변수를 effect 스코프 밖에 선언** 해, `.then()` 내부에서 assign 만 합니다. 그러면 effect 의 cleanup 이 그 변수에 접근해 unsubscribe 할 수 있습니다.\n\n**② `cancelled` flag 로 \"unmount 후 늦게 도착한 promise\" 처리** — `.then()` 안에서 subscription 이 만들어진 시점에 이미 cancelled 면 즉시 unsubscribe 해버립니다.\n\n```ts\nuseEffect(() => {\n  let cancelled = false;\n  let subscription: { unsubscribe: () => void } | undefined;\n  loadSupabaseClient().then(async (supabase) => {\n    const { data: { user } } = await supabase.auth.getUser();\n    if (cancelled) return;\n    setIsAuthenticated(!!user);\n\n    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(...);\n    if (cancelled) sub.unsubscribe();\n    else subscription = sub;\n  });\n  return () => {\n    cancelled = true;\n    subscription?.unsubscribe();\n  };\n}, [isAdmin]);\n```\n\n같은 패턴이 PostDetailClient / WorkDetailClient / CommentSection / CommentForm 등 4 곳에 또 있었길래, **`useIsAuthenticated({ subscribe?: boolean })` 헬퍼로 추출** 해 한 곳에서 정리 책임을 지게 했습니다. detail page 들은 진입 시점 admin 여부만 필요하니 `subscribe: false` (1회 체크), 댓글 영역은 다른 탭에서 로그인·로그아웃 시 실시간 반영이 필요하니 `subscribe: true` 로 호출합니다.",
      en: "Two fixes together.\n\n**① Lifted `subscription` to the effect's outer scope** so the cleanup can reach it. The `.then()` only assigns to it.\n\n**② Added a `cancelled` flag for late-arriving promises** — if cancelled has already flipped by the time the subscription is created, unsubscribe immediately.\n\n```ts\nuseEffect(() => {\n  let cancelled = false;\n  let subscription: { unsubscribe: () => void } | undefined;\n  loadSupabaseClient().then(async (supabase) => {\n    const { data: { user } } = await supabase.auth.getUser();\n    if (cancelled) return;\n    setIsAuthenticated(!!user);\n\n    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(...);\n    if (cancelled) sub.unsubscribe();\n    else subscription = sub;\n  });\n  return () => {\n    cancelled = true;\n    subscription?.unsubscribe();\n  };\n}, [isAdmin]);\n```\n\nFound the same pattern duplicated in PostDetailClient / WorkDetailClient / CommentSection / CommentForm. Extracted **`useIsAuthenticated({ subscribe?: boolean })`** so all four share the same cleanup responsibility. Detail clients use `subscribe: false` (one-shot check at mount); the comment surfaces use `subscribe: true` to reflect cross-tab login changes in real time.",
    },
    keyInsight: {
      ko: "**`useEffect` cleanup 은 effect 콜백이 \"직접\" return 한 함수만 인식합니다.** 그 안의 `.then()` / async / Promise 체인이 return 하는 함수는 React 가 보지 못합니다.\n\nasync effect 에서 cleanup 하려면 보통:\n- 외부 변수 + assign 패턴 (위 예시)\n- AbortController 로 fetch 자체를 취소\n- `cancelled` flag 로 setState 무력화\n\n셋 중 하나는 필요하다고 기억해 두는 게 좋습니다. \"return 만 하면 정리되겠지\" 가 보이지 않는 leak 의 가장 흔한 원인입니다.",
      en: "**`useEffect` cleanup only sees a function the effect callback returns directly.** Anything returned from a `.then()` / async chain inside doesn't reach React.\n\nFor cleanup in an async effect you typically need one of:\n- Outer-scope variable + assign pattern (above)\n- AbortController to cancel the fetch itself\n- A `cancelled` flag to no-op setState\n\nKeeping that triplet in mind avoids the most common invisible leak — the one where \"returning a function looked like cleanup\".",
    },
  },

  /* ── Frontend / Interaction — TagCloud3D pointer ── */
  {
    section: { ko: "인터랙션 / 포인터", en: "Interaction / Pointer" },
    problem: {
      ko: "TagCloud3D 클릭이 안 먹힘 — `setPointerCapture` 가 자식 Link click 을 가로챔",
      en: "TagCloud3D Clicks Don't Register — `setPointerCapture` Swallows Child Link Clicks",
    },
    definition: {
      ko: "Posts 사이드바의 3D 태그 구체(TagCloud3D)는 드래그로 빙글빙글 돌릴 수 있고, 각 태그는 클릭하면 해당 태그 페이지로 이동하는 `<Link>` 입니다.\n\n드래그 회전은 의도대로 잘 되는데, **마우스를 가만히 두고 태그를 클릭하면 아무 일도 일어나지 않았습니다.** 같은 태그를 사이드바의 다른 리스트에서 누르면 정상 이동하는데, 3D 구체 안에서만 navigation 이 막힌 상태였습니다.",
      en: "The 3D tag sphere (TagCloud3D) in the Posts sidebar can be dragged to rotate, and each tag is a `<Link>` that navigates to its tag page.\n\nDrag-to-rotate worked fine, but **clicking a tag while holding the mouse still did nothing** — the same tag clicked from another sidebar list navigated correctly, only the sphere swallowed clicks.",
    },
    cause: {
      ko: "원인은 두 겹으로 쌓여 있었습니다.\n\n**① `setPointerCapture` 가 자식 click 을 통째로 가로챔** — 드래그 시작 시 sphere container 의 `onPointerDown` 에서 `e.currentTarget.setPointerCapture(e.pointerId)` 를 호출해 두었습니다. capture API 는 이후 그 pointer 의 모든 이벤트를 capture 받은 요소로 라우팅하기 때문에, 마우스를 떼는 순간 발생하는 click 도 sphere container 가 받습니다. 그 click 은 자식 `<Link>` 의 onClick (= Next router push) 까지 내려가지 못하고 sphere 에서 끝납니다.\n\n**② drag 임계값이 너무 작음** — \"움직임이 4px (Manhattan 거리) 이상일 때만 drag 로 판정한다\" 는 가드를 두긴 했는데, 4px 은 마우스 자체의 미세한 jitter 만으로도 쉽게 넘는 값입니다. 사용자가 클릭하려고 정지 상태로 누른 순간에도 한두 픽셀씩 흔들리면서 drag flag 가 켜지고, 그게 click 차단 조건과 맞물려 모든 클릭이 \"이건 drag 였어\" 로 분류되었습니다.\n\n같은 함정은 Series Deck (`Series Deck spread`) 과 RelationPicker 의 chip 드래그에서 이미 한 번씩 밟은 적이 있습니다 — capture API + 작은 threshold 조합은 클릭을 죽이는 단골 조합입니다.",
      en: "Two layers stacked.\n\n**① `setPointerCapture` hijacks child clicks wholesale.** On drag start, the sphere container's `onPointerDown` called `e.currentTarget.setPointerCapture(e.pointerId)`. From that point on, the capture API routes every event for that pointer — including the upcoming `click` on mouse release — to the capturing element. That click never reaches the child `<Link>`'s `onClick` (Next's router push); it terminates on the sphere.\n\n**② The drag threshold was too small.** A \"≥4px Manhattan distance counts as a drag\" guard was in place, but 4px is well within the natural jitter of a held mouse. Even when the user clearly intended to click (mouse stationary), one or two pixels of jitter flipped the `dragging` flag, which in turn told the click handler \"this was a drag, suppress it\" — so every click was misclassified.\n\nThe same trap was hit before in Series Deck (`Series Deck spread`) and the RelationPicker chip drag — `setPointerCapture` + tiny threshold is a recurring click-killer.",
    },
    solution: {
      ko: "두 가지를 함께 고쳤습니다.\n\n**① `setPointerCapture` 제거 + document-level listener 패턴으로 전환** — `onPointerDown` 안에서 sphere 에 capture 를 걸지 않고, 대신 그 핸들러 안에서 `document.addEventListener(\"pointermove\", …)` / `pointerup` 을 등록합니다. pointer 가 sphere 밖으로 나가도 회전은 그대로 추적되고, 동시에 sphere container 는 자식 click 의 propagation 을 막지 않습니다. PostsClient 의 series row 드래그가 이미 같은 패턴을 쓰고 있어서 그 구현을 그대로 따라갔습니다.\n\n**② `DRAG_THRESHOLD` 를 4 → 10px 로 상향** — 일반적인 jitter 범위 (1~3px) 와 의도된 드래그 (보통 15px 이상) 사이의 여유 구간입니다. 마우스를 누른 채로 살짝 흔들려도 click 으로 인식되고, 진짜 회전 의도는 그대로 picked up 됩니다.\n\nclick 차단 조건은 `dragging` flag 단일 기준으로 정리해, \"실제로 drag 가 발동한 경우에만 다음 click 을 무시\" 하도록 단순화했습니다.",
      en: "Two changes together.\n\n**① Removed `setPointerCapture`, switched to document-level listeners.** Instead of capturing on the sphere, the `onPointerDown` handler registers `document.addEventListener(\"pointermove\", …)` and `pointerup` listeners. Rotation still tracks correctly even when the pointer leaves the sphere, and crucially the sphere no longer intercepts child clicks. PostsClient's series row drag already uses this pattern — I just followed it.\n\n**② Raised `DRAG_THRESHOLD` from 4px to 10px** — the comfortable gap between mouse jitter (~1-3px) and an intentional drag (usually 15px+). Slight tremor during a held click no longer flips the drag flag; intentional rotation still gets picked up immediately.\n\nThe click-suppression check was simplified to a single `dragging` flag — only suppress the next click when a drag actually fired.",
    },
    keyInsight: {
      ko: "**`setPointerCapture` 는 자식 click 을 통째로 가로채는 API 입니다.** 드래그 동작과 자식 click 을 둘 다 살려야 하는 컴포넌트에서는 capture 대신 **document-level `pointermove` / `pointerup` listener + 명확한 drag threshold** 조합이 표준 패턴입니다.\n\n그리고 drag threshold 는 **사용자의 \"가만히 클릭\" 의도를 보호할 수 있을 만큼** 커야 합니다. 4px 은 마우스 jitter 만으로도 넘기 쉬워서 \"클릭한 줄 알았는데 drag 로 분류\" 라는 사용자 보고의 단골 원인이 됩니다. 10px 정도가 jitter 면역과 반응성의 균형점입니다.\n\n같은 패턴이 이 프로젝트에서만 Series Deck → RelationPicker → TagCloud3D 로 세 번 반복되었습니다 — 한 번 발견하면 같은 모양의 코드를 grep 으로 한 번 더 훑는 게 시간을 아낍니다.",
      en: "**`setPointerCapture` swallows child clicks wholesale.** Components that need both a drag gesture and clickable children should use the standard pattern: **document-level `pointermove` / `pointerup` listeners + a meaningful drag threshold** — not pointer capture.\n\nAnd the threshold needs to be **big enough to protect the user's \"hold-still click\" intent**. 4px is well within mouse jitter, which is why \"I clicked but it was classified as a drag\" is such a common bug report. ~10px is the sweet spot between jitter immunity and responsiveness.\n\nThis project has hit the same pattern three times now — Series Deck → RelationPicker → TagCloud3D. Once you spot it, a quick grep for the same shape pays for itself.",
    },
    tags: ["pointer events", "setPointerCapture", "drag threshold", "TagCloud3D"],
  },

  /* ── Frontend / Performance — Font display ── */
  {
    section: { ko: "성능 / 폰트", en: "Performance / Fonts" },
    problem: {
      ko: "Menu drawer 폰트가 fallback 으로 굳음 — `display: optional` + `preload: false` 부작용",
      en: "Menu Drawer Font Stuck on Fallback — `display: optional` + `preload: false` Side Effect",
    },
    definition: {
      ko: "사이트가 로드된 뒤 햄버거 메뉴를 눌러 drawer 를 열면, 헤딩에 적용되어 있어야 할 Space Grotesk 가 아니라 **시스템 sans-serif 가 그대로 노출** 되었습니다.\n\n사용자가 \"메뉴 폰트 모양이 다른 페이지랑 다르다 / 장평이 다르게 보인다\" 고 알려와서 확인했고, 실제로 drawer 내부의 텍스트만 fallback 폰트로 굳어 있었습니다. 본문이나 다른 영역의 Space Grotesk 는 정상이었습니다.",
      en: "After the site loaded, opening the hamburger drawer showed **system sans-serif text** where Space Grotesk should have been applied to the menu headings.\n\nA user pointed out \"the menu font looks different from the rest of the site — the letter widths are off\". Only the drawer's text was stuck on the fallback; body text and other Space Grotesk surfaces rendered correctly.",
    },
    cause: {
      ko: "직전 perf 커밋에서 LCP (Largest Contentful Paint) 가 폰트 swap 으로 다시 트리거되는 걸 막으려고 Space Grotesk 의 next/font 설정을 **`display: \"optional\"` + `preload: false`** 로 바꿔 두었습니다.\n\n`display: optional` 의 동작 규칙은 \"브라우저가 페이지 로드 시작 후 약 **100ms 안에 폰트 파일을 받지 못하면, 그 페이지 lifetime 동안 영원히 fallback 폰트를 사용한다**\" 입니다. swap 처럼 \"늦게 도착하면 그제서야 교체\" 가 일어나지 않습니다. perf 관점에서는 좋은 동작입니다 — late font swap 으로 인한 layout shift / LCP 재계산이 없습니다.\n\n문제는 drawer 가 **유저 클릭 후에야 마운트되는 lazy 영역** 이라는 점이었습니다. 사용자가 햄버거를 누르는 시점에는 이미 \"100ms 윈도우\" 가 한참 지난 뒤이고, optional 룰에 따라 그 페이지에서는 끝까지 fallback 만 보입니다. 처음부터 DOM 에 있던 본문 등의 Space Grotesk 도 fallback 으로 그려졌지만, 그쪽은 본문이라 사용자가 \"원래 그런가\" 로 넘겼던 거고, drawer 만 평소 보이지 않다가 클릭으로 노출되면서 차이가 확 드러났습니다.",
      en: "A recent perf commit had switched Space Grotesk's `next/font` config to **`display: \"optional\"` + `preload: false`** to avoid retriggering LCP via late font swap.\n\n`display: optional` rules: \"if the browser hasn't received the font within roughly **100ms after page-load start, the fallback is used for the rest of that page's lifetime**\". There's no \"swap in when it eventually arrives\" — that's the whole point performance-wise (no late layout shift, no LCP recalculation).\n\nBut the drawer is **a lazy region that only mounts on user click**. By the time someone hits the hamburger, the 100ms window is long gone, and the optional rule means the page is locked to the fallback. The Space Grotesk visible on first paint was technically fallback-rendered too, but users read it as \"that's how the body looks\". The drawer only appeared on demand, so the contrast against the rest of the now-familiar fallback became immediately obvious as wrong.",
    },
    solution: {
      ko: "Space Grotesk 만 **`display: \"swap\"` + `preload: true`** 로 되돌렸습니다. 다른 폰트들은 그대로 `display: \"optional\"` 을 유지해 LCP 영향은 최소화한 상태입니다.\n\n`swap` 은 \"폰트 도착 즉시 자동 교체\" 라 100ms 윈도우와 무관하게 동작합니다. drawer 처럼 늦게 마운트되는 영역도 폰트가 적용된 채로 보이고, 초기 LCP 는 fallback 으로 측정되되 도착 시 한 번의 swap 이 발생합니다 — perf 비용은 약간 늘지만 UI 일관성이 회복됩니다.\n\n결정 기준은 \"이 폰트가 사용자 첫 화면에 노출되는가\" 였습니다. Space Grotesk 는 nav · drawer · 페이지 헤딩 등 사용자가 매번 보는 surface 에 쓰이므로 swap 의 안정성이 더 중요하고, 본문 전용 폰트는 첫 화면 비중이 낮아 optional 의 perf 이점을 더 살릴 수 있습니다.",
      en: "Reverted Space Grotesk only to **`display: \"swap\"` + `preload: true`**. Other fonts kept `display: \"optional\"`, so LCP impact stays minimal overall.\n\n`swap` means \"replace as soon as the font arrives\", independent of the 100ms window. Late-mounted regions like the drawer get the proper font, and initial LCP is measured against the fallback with one swap when the font lands — slightly higher perf cost, but UI consistency restored.\n\nThe decision rule was \"is this font visible on the user's first-impression surface?\". Space Grotesk is used on nav, drawer, page headings — surfaces the user sees every time — so swap's reliability matters more. Body-only fonts hit first paint less, so the optional perf win is worth keeping there.",
    },
    keyInsight: {
      ko: "**`font-display: optional` 은 \"100ms 안에 못 받으면 그 페이지에서는 영원히 fallback\"** 이라는 강한 규칙입니다. perf 측면에서는 \"늦은 swap 으로 LCP 재계산 / layout shift 없음\" 이라는 큰 장점이 있지만, 그 대가로 **UI 일관성을 한 페이지 lifetime 단위로 포기** 합니다.\n\n특히 drawer / modal / lazy 패널처럼 **사용자 첫 화면에 안 보이는 영역** 에서는 optional 의 perf 이점은 거의 없고 (어차피 첫 paint 대상이 아님), UI 손실 비용만 그대로 떠안게 됩니다. 이런 영역에 쓰이는 폰트는 **`swap` + `preload: true`** 가 안전한 기본값입니다.\n\n폰트 display 전략은 \"전역으로 한 값\" 보다 **\"이 폰트가 어디에 쓰이는가\" 단위로 폰트별로 결정** 하는 것이 합리적입니다.",
      en: "**`font-display: optional` enforces a hard rule — \"if the font isn't here in ~100ms, use fallback forever on this page\".** The perf upside is real (no late swap, no LCP recalculation, no layout shift), but you pay for it by **forfeiting UI consistency for the entire page lifetime**.\n\nFor surfaces that **don't appear on the user's first frame** — drawers, modals, lazy panels — `optional` buys almost nothing perf-wise (they're not on the critical path anyway) while keeping the full UI-degradation cost. Fonts used in those surfaces are safer with **`swap` + `preload: true`**.\n\nFont display strategy should be **per-font, decided by where the font appears**, not a global \"one setting fits all\".",
    },
    comparisons: [
      {
        label: { ko: "`display: optional` vs `display: swap`", en: "`display: optional` vs `display: swap`" },
        headers: [
          { ko: "비교 항목", en: "Aspect" },
          { ko: "optional", en: "optional" },
          { ko: "swap (적용)", en: "swap (adopted for Space Grotesk)" },
        ],
        rows: [
          { cells: [{ ko: "100ms 초과 시 동작", en: "After 100ms timeout" }, { ko: "fallback 영구 고정", en: "Locked to fallback" }, { ko: "도착 즉시 swap", en: "Swaps in on arrival" }] },
          { cells: [{ ko: "LCP 재계산", en: "LCP recalculation" }, { ko: "없음", en: "None" }, { ko: "swap 시 1회 가능", en: "Possible once on swap" }] },
          { cells: [{ ko: "Layout shift 위험", en: "Layout shift risk" }, { ko: "없음", en: "None" }, { ko: "fallback ↔ 본 폰트 metric 차이만큼", en: "Equal to fallback↔real metric delta" }] },
          { cells: [{ ko: "Lazy 영역 (drawer/modal)", en: "Lazy region (drawer/modal)" }, { ko: "거의 항상 fallback", en: "Almost always fallback" }, { ko: "정상 폰트 적용", en: "Proper font applied" }], highlight: true },
          { cells: [{ ko: "권장 용도", en: "Recommended for" }, { ko: "본문/secondary 폰트", en: "Body / secondary fonts" }, { ko: "nav/heading/lazy 영역 폰트", en: "Nav / heading / lazy-region fonts" }] },
        ],
      } satisfies ComparisonTable,
    ],
    tags: ["next/font", "font-display", "performance", "LCP"],
  },

  /* ── Frontend / Layout — Tooltip zIndex ── */
  {
    section: { ko: "레이아웃 / Z-Index", en: "Layout / Z-Index" },
    problem: {
      ko: "Tooltip 이 drawer 위로 튀어나옴 — inline zIndex 가 토큰을 무시",
      en: "Tooltip Punches Through Drawer — Inline `zIndex` Ignores Design Tokens",
    },
    definition: {
      ko: "모바일에서 메뉴 drawer 를 연 상태에서, 다른 위치에 떠 있던 alert tooltip 이 **drawer 위에 그대로 보이는 현상** 이 발생했습니다.\n\n원래 의도는 drawer 같은 overlay 가 떠 있을 때는 tooltip 이 그 아래에 가려져야 자연스럽습니다 (overlay 가 \"위에 떠 있다\" 는 시각적 약속). 그런데 drawer slide-in 애니메이션이 끝난 뒤에도 hover/closing race condition 으로 살아 있던 tooltip 이 drawer 영역을 뚫고 위로 올라와 보였습니다.",
      en: "On mobile, opening the menu drawer while an alert tooltip was visible elsewhere caused the tooltip to **render on top of the drawer**.\n\nThe expectation: when overlays like a drawer are open, tooltips should sit beneath them (the overlay is visually \"on top\" — that's its whole job). Instead, tooltips that lingered through a hover/close race condition punched through the drawer's z-stack and stayed visible above it.",
    },
    cause: {
      ko: "Tooltip 컴포넌트가 portal 로 렌더링하는 wrapper `<div>` 에 **`style={{ zIndex: 10001 }}` 라는 inline value** 를 박아 두고 있었습니다.\n\n반면 사이트 z-index 토큰은 `src/styles/tokens/_z-index.css` 에 \"layer 의 의도\" 까지 코멘트로 적어 두면서 정렬해 두었습니다 — `--z-tooltip: 700` (\"툴팁: 일반 콘텐츠보다 위, overlay 보다 아래\") / `--z-overlay: 9000` (drawer / sheet / 큰 modal layer). 의도는 \"tooltip 은 overlay 아래에 깔린다\" 입니다.\n\nInline `10001` 은 이 모든 토큰 위에 자리잡습니다. drawer 가 9000 이든 그보다 더 위든 상관없이 tooltip 이 항상 이깁니다. \"디자인 토큰을 만들어 둔 의도\" 가 inline value 하나로 wholesale 무효화되는 패턴 — 토큰 시스템이 도입된 코드베이스에서 silent regression 의 단골 케이스입니다.\n\nzIndex 만의 문제도 아닙니다. 한 번 inline value 가 코드에 박히면 토큰을 옮기거나 layer 를 재정렬하는 변경이 그 inline 만 정확히 비껴 가게 됩니다. 검색·grep 으로도 의도가 드러나지 않습니다.",
      en: "The Tooltip component's portal wrapper `<div>` had **`style={{ zIndex: 10001 }}` hardcoded inline**.\n\nMeanwhile, the site's z-index tokens in `src/styles/tokens/_z-index.css` are organized by layer intent, with comments — `--z-tooltip: 700` (\"tooltip: above normal content, below overlays\") and `--z-overlay: 9000` (drawer / sheet / large modal layer). The deliberate ordering: tooltips render *beneath* overlays.\n\nInline `10001` sits above all of them. Whether the drawer was at 9000 or higher, the tooltip always won. The whole point of the design token was wholesale ignored by one inline value — a classic silent-regression pattern in token-driven codebases.\n\nIt's not specific to z-index either. Once an inline value lands in code, future changes that move tokens or reshuffle layers cleanly miss that one inline. Even search and grep don't surface the intent.",
    },
    solution: {
      ko: "Tooltip portal `<div>` 의 inline zIndex 를 **`zIndex: \"var(--z-tooltip)\"`** 로 변경했습니다. 변경 후 drawer (`--z-overlay: 9000`) 가 열려 있는 동안에는 tooltip (700) 이 자연스럽게 가려지고, 일반 콘텐츠 위에서는 평소처럼 위에 뜹니다.\n\n\"modal 안에서 hover 했을 때만 modal 위에 tooltip 이 보여야 한다\" 같은 케이스는 별도 prop (예: `elevate?: boolean`) 으로 다음 단계에서 처리할 예정입니다 — 그 prop 이 들어와도 inline 숫자 대신 `--z-tooltip-elevated` 같은 토큰을 만들어 매핑하는 방향이 일관됩니다.\n\n같은 모양의 inline zIndex 가 다른 컴포넌트에도 남아 있을 가능성이 있어, 후속으로 `zIndex:\\s*\\d` grep 으로 일괄 점검 후 토큰 치환을 계획해 두었습니다.",
      en: "Changed the Tooltip portal `<div>` to **`zIndex: \"var(--z-tooltip)\"`**. With that, an open drawer (`--z-overlay: 9000`) properly hides tooltips (700), while tooltips still sit above normal content as before.\n\nCases like \"tooltip should appear above a modal when hovered from inside it\" will be handled later with a dedicated prop (e.g. `elevate?: boolean`) — and even that should map to a new token like `--z-tooltip-elevated`, not a raw inline number, to stay consistent.\n\nThere may be similar inline `zIndex` numbers in other components. A follow-up grep for `zIndex:\\s*\\d` is queued to audit and migrate them in one pass.",
    },
    keyInsight: {
      ko: "**디자인 토큰을 만들어 둔 의도(layer 순서, 색 계조, spacing scale) 는 inline value 하나로 wholesale 무효화됩니다.** 토큰 시스템이 존재하는 코드베이스에서 inline value 는 silent regression 의 시작입니다 — \"이건 빠르게 한 줄로 해결\" 이라는 판단이 한 번 통과되면, 토큰이 갱신되어도 그 inline 만 따로 살아남습니다.\n\n특히 z-index 처럼 **layer 관계가 의미를 가지는 값** 은 직접 숫자를 쓰는 순간 다른 layer 와의 관계가 깨집니다. \"이 값보다 더 위\" 같은 결정은 항상 토큰 이름 (`--z-tooltip`, `--z-overlay`, `--z-modal-elevated`) 으로 표현해, 의도가 코드에 그대로 남도록 강제하는 게 안전합니다.\n\n팀 / 솔로 무관하게, 토큰 도입의 진짜 이득은 \"한 번에 바꾸기 쉬워서\" 가 아니라 **\"의도가 코드에 남아 다음 변경이 그 의도를 자동으로 따르게\"** 강제하는 데 있습니다. inline value 는 그 메커니즘을 그 자리에서 끊습니다.",
      en: "**Design-token intent (layer ordering, color steps, spacing scale) is wholesale invalidated by a single inline value.** In token-driven codebases, inline numbers are where silent regressions start — once a \"quick one-liner\" lands, future token changes flow past it untouched.\n\nThis matters most for values like z-index where **layering relationships carry meaning**. The moment you hardcode a number, its relationship to other layers is broken. Decisions like \"this should sit above X\" should always be expressed in token names (`--z-tooltip`, `--z-overlay`, `--z-modal-elevated`) so the intent stays in the code.\n\nThe real payoff of a token system isn't \"easy to change in one place\" — it's that **intent stays embedded in the code so future changes follow it automatically**. Inline values sever that mechanism at the spot they appear.",
    },
    tags: ["z-index", "design tokens", "Tooltip", "portal"],
  },

  /* ── Architecture — 인기글 single source of truth ── */
  {
    section: { ko: "Architecture / Domain", en: "Architecture / Domain" },
    problem: {
      ko: "인기글 정의가 3 곳에 분산 — UI 의 HOT 배지와 admin 삭제 보호가 서로 다른 \"인기\"",
      en: "\"Popular post\" defined in three places — the UI HOT badge and the admin delete guard disagreed on what \"popular\" meant",
    },
    definition: {
      ko: "포스트 시스템에는 \"인기\" 라는 개념이 세 곳에서 쓰이고 있었습니다.\n\n**① PostsClient HOT 배지** — 카드 위의 \"HOT\" 라벨. view_count 상위 5 개에 표시.\n**② `/api/posts?sort=popular` 정렬** — 사용자가 정렬 옵션을 \"인기순\" 으로 바꿨을 때 적용되는 score. `view + like × 3 + comment × 5` 가중 합.\n**③ admin 삭제 보호** — 관리자가 인기 글을 실수로 삭제하지 못하게 confirm modal 을 띄우는 임계값. `view ≥ 100 OR like ≥ 10` 절대값.\n\n사용자 시점에서 보면 \"인기\" 는 하나의 개념인데, 코드 시점에서는 세 가지 다른 정의가 살아 있었습니다. 결과적으로 **UI 에 HOT 배지가 붙은 글을 admin 페이지에서 삭제했을 때 \"인기 글입니다\" 경고가 안 뜨는** 모순이 가능한 상태였습니다.",
      en: "The \"popular post\" concept lived in three places at once.\n\n**① PostsClient HOT badge** — the \"HOT\" label on cards. Applied to the top 5 by `view_count`.\n**② `/api/posts?sort=popular` ordering** — used when the user selects the \"Popular\" sort option. Score: `view + like × 3 + comment × 5`.\n**③ Admin delete guard** — the threshold that triggers a confirm modal when an admin tries to delete a popular post. Absolute: `view ≥ 100 OR like ≥ 10`.\n\nFrom a user's standpoint \"popular\" is a single concept, but in code three different definitions coexisted. The practical contradiction: **a post wearing the HOT badge in the UI could be deleted from admin without ever triggering the \"this is a popular post\" warning.**",
    },
    cause: {
      ko: "세 정의가 각각 다른 시점에 추가되었고, 그때마다 \"바로 이 자리에서 빠르게 결정할 수 있는 기준\" 으로 즉석에서 인기 정의를 박았습니다.\n\nHOT 배지를 처음 만들 때는 가장 단순한 신호인 `view_count` 만 보고 top 5 를 골랐습니다. 이후 정렬 옵션을 만들 때는 \"댓글이 활발한 글도 인기로 잡고 싶다\" 는 요구가 추가되어 `view + like × 3 + comment × 5` 라는 score 식이 생겼습니다. 마지막으로 admin 삭제 보호를 추가할 때는 \"신생 글 / 낮은 트래픽 글까지 보호하지 않도록\" 절대 임계값이 더 직관적이라 판단해 `view ≥ 100 OR like ≥ 10` 라는 hard threshold 를 박았습니다.\n\n각 결정 자체는 그 시점에서 합리적이었지만, **세 정의가 같은 \"인기\" 라는 단어 아래 분산된다는 사실은 어느 단계에서도 의식되지 않았습니다.** 도메인 개념이 silent 하게 fragment 되는 전형적인 패턴 — 한 기능을 만들 때마다 그 기능 안에서 가장 합리적인 기준이 즉석에서 자라나고, 다른 기능과의 정합성은 나중에 누군가 두 코드를 한 화면에 띄워 보기 전까지 드러나지 않습니다.\n\n이번 케이스에서는 댓글 신고 기능을 만들면서 \"신고 누적된 인기 글은 어떻게 처리하지\" 를 정하려고 세 코드를 같이 펼쳐 본 순간에야 모순이 보였습니다.",
      en: "The three definitions were each added at different times, and at each point a definition was picked on the spot — whichever criterion was easiest to commit to right there.\n\nThe HOT badge launched first with the simplest signal (`view_count` top 5). Later, when sort options were added, the requirement broadened (\"posts with active discussion should also count as popular\"), producing the `view + like × 3 + comment × 5` score. Finally, the admin delete guard preferred absolute thresholds — \"don't protect tiny posts\" — and landed on `view ≥ 100 OR like ≥ 10`.\n\nEach individual decision was reasonable in its own moment, but **the fact that all three were claiming the same word \"popular\" was never noticed at any of those moments.** This is the classic shape of silent domain fragmentation — every feature grows its own most-reasonable criterion locally, and the inconsistency only surfaces when two of those criteria end up on one screen.\n\nIn this case it took implementing the comment-reporting feature (\"how do we handle reports against popular posts?\") to put the three code paths side by side, and the contradiction was finally visible.",
    },
    solution: {
      ko: "`src/lib/popularity.ts` 라는 단일 모듈을 만들어 두 가지만 export 했습니다.\n\n```ts\n/** posts 인기 점수 — 모든 인기 관련 로직의 단일 소스. */\nexport function scoreOf(args: { view: number; like: number; comments: number }): number {\n  return (args.view ?? 0) + (args.like ?? 0) * 3 + (args.comments ?? 0) * 5;\n}\n\n/** score 내림차순 상위 N 개 post id Set. score === 0 인 post 는 제외. */\nexport async function getPopularPostIds(supabase, limit = 5): Promise<Set<string>> { ... }\n```\n\n그리고 세 호출처를 모두 이 함수 위로 옮겼습니다:\n\n- **PostsClient HOT 배지** → `getPopularPostIds(supabase, 5)` 결과 Set 으로 카드 id 일치 여부 판정.\n- **`/api/posts?sort=popular`** → 정렬 시 `scoreOf` 호출.\n- **admin 삭제 보호** → 절대 임계값 폐기, `getPopularPostIds` 가 반환하는 id Set 에 포함되면 confirm modal.\n\n이제 \"인기\" 는 한 곳에서만 정의되고, 세 기능은 **자동적으로 같은 답을 냅니다.** UI 의 HOT 배지가 붙은 글 = admin 삭제 시 보호되는 글 = 정렬 인기순 상단 글 = (후속으로 도입할) 90 일 캐시 TTL 대상 글.\n\n부가 효과로, score 가중치를 조정하고 싶을 때 (예: \"like 의 비중을 더 높여야겠다\") 한 줄만 수정하면 세 기능이 동시에 새 정의를 따릅니다. 정렬과 삭제 보호가 따로 노는 일이 다시 발생할 수 없습니다.",
      en: "Built a single module `src/lib/popularity.ts` that exports two things:\n\n```ts\n/** Single source for all \"popular\" logic. */\nexport function scoreOf(args: { view: number; like: number; comments: number }): number {\n  return (args.view ?? 0) + (args.like ?? 0) * 3 + (args.comments ?? 0) * 5;\n}\n\n/** Top-N post ids by score (desc). score === 0 excluded. */\nexport async function getPopularPostIds(supabase, limit = 5): Promise<Set<string>> { ... }\n```\n\nThen routed all three call sites through it:\n\n- **PostsClient HOT badge** → check membership in `getPopularPostIds(supabase, 5)`.\n- **`/api/posts?sort=popular`** → sort by `scoreOf`.\n- **Admin delete guard** → dropped the absolute threshold; if the id is in `getPopularPostIds`, the confirm modal fires.\n\n\"Popular\" is now defined in one place, and the three features **automatically agree.** HOT-badged in UI = guarded against admin delete = top of the popular sort = (planned next) eligible for the 90-day cache TTL.\n\nA bonus: tuning the weights (\"likes should count more\") is a one-line change that all three call sites pick up at once. Sort and delete guard can never drift apart again.",
    },
    keyInsight: {
      ko: "**같은 도메인 개념의 정의는 단일 함수/모듈로 강제하라.** 분산은 silent contradiction 의 시작입니다.\n\n\"인기\", \"인증된 사용자\", \"만료된 세션\", \"활성 회원\" 같은 도메인 개념은 코드 곳곳에서 호출됩니다. 그때마다 그 자리에서 가장 합리적인 정의가 자라나기 쉬운데, 이 자생적 정의들은 **각각의 자리에서는 옳고 합쳐서 보면 틀립니다.**\n\n이런 개념은 만들 때부터 \"한 함수만 import 해서 쓰는\" 구조로 고정하는 게 가장 안전합니다. 이미 분산되어 있다면 호출처 grep → 단일 모듈 추출 → 일괄 치환 순으로 정리합니다. 도메인 개념 하나당 reasoning 비용 (\"여기서 \"인기\" 가 어떤 정의지?\") 이 0 으로 떨어지고, 가중치 조정 같은 정책 변경도 한 줄짜리 작업이 됩니다.\n\n특히 \"단순 정의 (view top 5)\" 와 \"복합 정의 (가중 score)\" 가 같은 단어 아래 공존할 때 가장 위험합니다. 단순 정의 쪽은 \"이건 너무 단순해서 굳이 모듈로 뽑을 필요가 없다\" 는 인상을 주는데, 그 인상이 바로 fragmentation 의 입구입니다.",
      en: "**For domain concepts, force the definition into a single function or module.** Fragmentation is the start of silent contradiction.\n\nDomain concepts like \"popular\", \"authenticated user\", \"expired session\", \"active member\" get called from many places. It's easy for each call site to grow its own locally reasonable definition, but **those locally-correct definitions are collectively wrong** once you put them on the same screen.\n\nThe safest move is to lock concepts like this behind a single import from day one. If they've already fragmented, grep all call sites → extract a single module → migrate. The payoff is twofold: the reasoning cost (\"what does 'popular' mean *here*?\") drops to zero, and policy changes (\"raise the weight of likes\") become one-line edits.\n\nThe most dangerous case is when a simple definition (\"top 5 by views\") and a compound definition (\"weighted score\") coexist under the same word. The simple one feels \"too small to extract into a module\" — and that feeling is exactly the entrance to fragmentation.",
    },
    tags: ["single source of truth", "domain modeling", "popularity", "refactoring"],
  },

  /* ── Component System — SortGroup → SegmentedControl rename ── */
  {
    section: { ko: "Frontend / Component", en: "Frontend / Component" },
    problem: {
      ko: "컴포넌트 이름이 \"첫 사용처\" 에 묶임 — SortGroup 이 sort 외 8 곳에서 쓰이게 되자 의미가 약해짐",
      en: "Component name locked to its first use — `SortGroup` ended up in 8 non-sort places and the name started lying",
    },
    definition: {
      ko: "`SortGroup` 이라는 컴포넌트가 있었습니다. 캡슐 모양 pill 들이 가로로 붙어 있고 한 번에 하나만 선택되는, framer-motion 슬라이딩 인디케이터가 활성 pill 위로 이동하는 single-select 그룹입니다.\n\n처음에는 이름 그대로 **포스트 목록의 정렬 옵션** (최신순 / 인기순 / 조회순) 에만 썼습니다. 그런데 같은 모양이 admin 탭 전환, 설정 페이지 필터, 게시물 sub-sort 등 점점 다른 자리에 들어가게 되었고, 최종적으로는 **9 개 사용처** 중 \"실제 sort\" 는 한두 곳에 불과한 상태가 되었습니다.\n\n그 결과 코드를 읽을 때 `<SortGroup>` 이 보이면 \"여기 sort 가 들어가나?\" 라는 일순간의 오독이 매번 발생했고, 새 개발자가 컴포넌트 목록을 훑을 때도 \"이건 정렬 전용이구나\" 라는 잘못된 인상을 받기 쉬웠습니다.",
      en: "There was a component called `SortGroup`: a horizontal row of capsule pills with a framer-motion sliding indicator over the active one — single-select.\n\nIt started life as the **sort selector on the posts list** (latest / popular / most-viewed). But the same shape kept landing elsewhere: admin tab switching, settings filters, post sub-sort, etc. By the time I counted, **9 use sites** existed and only one or two were \"real sorting\".\n\nSo every time `<SortGroup>` appeared in code, there was a brief misread (\"is there a sort here?\"), and any new contributor scanning the component list would assume \"this is sort-only\".",
    },
    cause: {
      ko: "첫 사용처가 sort 였기 때문에 컴포넌트 이름을 그 사용처에서 따왔습니다. 만들 당시에는 \"이 컴포넌트가 다른 자리에도 들어갈 거다\" 라는 예측이 없었기 때문에, 가장 가까운 도메인 단어 (sort) 가 이름이 되는 것이 자연스러웠습니다.\n\n그런데 이후 admin 탭, 설정 필터 등에서 \"가로 pill single-select\" 패턴이 필요해질 때마다 같은 컴포넌트가 가장 잘 맞아 들어갔습니다. 본질이 \"sort\" 가 아니라 **\"가로 캡슐 pill single-select\"** 이었기 때문에 다른 자리에 그대로 끼워 넣을 수 있었던 것입니다. 즉 컴포넌트 자체는 처음부터 generic 했는데, **이름만 첫 사용처에 묶여 있었던 셈입니다.**\n\n이름과 실제 책임이 어긋난 상태가 계속되면 매번 작은 cognitive overhead 가 누적됩니다. \"여기 SortGroup 이 있는데 sort 가 아니네\" 라는 한 번의 갸웃거림은 한 곳에서는 사소하지만, 9 곳에 깔리면 코드베이스 전반의 신뢰도가 조금씩 떨어집니다.",
      en: "Because the first use was sort, the component got named after that use site. At the time there was no expectation of broader reuse, so taking the nearest domain word (`Sort`) was the natural choice.\n\nLater, whenever \"horizontal pill single-select\" was needed (admin tabs, settings filters, etc.), this component fit perfectly — because its actual essence was never \"sort\" but **\"horizontal capsule-pill single-select\"**. The component had been generic from day one, **the name alone was pinned to the first use case.**\n\nWhen a name and a responsibility drift apart, small cognitive overhead accumulates. \"There's a SortGroup here but it's not sorting\" is trivial in any single spot, but across 9 sites it slowly erodes trust in the codebase's vocabulary.",
    },
    solution: {
      ko: "iOS 의 표준 컨트롤 명칭인 **`SegmentedControl`** 로 rename 했습니다. iOS 의 `UISegmentedControl` 은 정확히 \"가로 캡슐 pill single-select\" 패턴을 가리키는 표준 용어라, 별도 설명 없이도 의미가 즉시 전달됩니다.\n\n구체적으로는 한 PR 안에서:\n\n1. `git mv` 로 `SortGroup.tsx` → `SegmentedControl.tsx`, `SortGroup.module.css` → `SegmentedControl.module.css` 이동\n2. 컴포넌트 내부 export / type 이름 (`SortGroupItem` → `SegmentedControlItem` 등) 일괄 치환\n3. 9 사용처의 `import SortGroup from ...` 과 `<SortGroup .../>` JSX 도 일괄 치환\n\nrename 자체는 단순 작업이지만, **이름이 본질을 가리키게 된 직후부터** 새 사용처가 들어오는 속도가 다시 자연스러워졌습니다. 이전까지는 \"sort 가 아닌 자리에 SortGroup 을 쓰는 게 맞나\" 를 잠시 고민하다 다른 컴포넌트를 새로 만들지 등을 따지는 silent friction 이 있었는데, 그 friction 이 사라졌기 때문입니다.",
      en: "Renamed to **`SegmentedControl`** — the standard iOS term (`UISegmentedControl`) for exactly this pattern. The name self-explains: anyone seeing it immediately understands \"horizontal capsule pills, single-select\".\n\nThe rename in one PR:\n\n1. `git mv` `SortGroup.tsx` → `SegmentedControl.tsx`, plus the CSS module\n2. Internal exports / types (`SortGroupItem` → `SegmentedControlItem`, etc.)\n3. The 9 call sites — `import` and `<SortGroup .../>` JSX, batch-replaced\n\nThe rename itself was mechanical, but **once the name pointed at the essence, new use cases came in more naturally.** Before, there was silent friction (\"is it weird to use SortGroup for non-sort?\") that occasionally pushed people toward writing a new component. After, that friction was gone.",
    },
    keyInsight: {
      ko: "**컴포넌트 이름은 \"무엇인지\" 를 가리켜야 하고, \"어디 처음 썼는지\" 가 아니어야 합니다.**\n\n첫 사용처는 시간이 지나면 사용처 N 분의 1 이 됩니다. 그 자리에 묶인 이름은 점점 거짓말이 됩니다. 반대로 \"무엇인지\" — 즉 컴포넌트의 본질적 형태 (single-select pill group, fixed-size grid, capsule chip 등) — 는 사용처가 늘어도 변하지 않습니다.\n\n새 컴포넌트를 만들 때 이름을 지을 때마다 한 번씩 자문해 보면 좋습니다: **\"이걸 다른 자리에서도 쓴다면 그 자리에서도 이 이름이 자연스러울까?\"** 자연스럽지 않으면 그 이름은 이미 첫 사용처에 묶여 있는 신호입니다.\n\n또 하나, **iOS / Material 같은 OS 표준 컨트롤 명칭은 좋은 후보** 입니다. SegmentedControl, Stepper, Switch, Slider, Picker — 모두 \"무엇인지\" 를 가리키는 이름이고, 업계 통용어라 별도 학습 비용도 없습니다. 자체 작명보다 표준 명칭이 잘 맞는 패턴이라면 그쪽을 택하는 것이 안전합니다.",
      en: "**A component name should point to *what it is*, not *where it was first used*.**\n\nThe first use site eventually becomes 1 of N. A name pinned to that site progressively turns into a lie. The intrinsic shape — \"single-select pill group\", \"fixed-size grid\", \"capsule chip\" — stays true no matter how many sites adopt it.\n\nA useful check when naming a new component: **\"if I use this somewhere else, will the name still feel natural there?\"** If not, the name is already pinned to its origin.\n\nAlso, **OS-standard control names (iOS / Material) are great candidates**: SegmentedControl, Stepper, Switch, Slider, Picker. All of them name *what it is*, and they're industry vocabulary — no extra learning cost. When a standard term fits better than something hand-rolled, take the standard term.",
    },
    tags: ["naming", "component design", "refactor", "rename", "iOS UIKit"],
  },

  /* ── Architecture — Lenis cleanup convention ── */
  {
    section: { ko: "Architecture / Convention", en: "Architecture / Convention" },
    problem: {
      ko: "Lenis 무한 스크롤이 페이지 전환 시 의도치 않게 켜지는 문제 — opt-out 가정 cleanup 의 함정",
      en: "Lenis Infinite Scroll Silently Sticks Across Page Transitions — the Opt-Out Cleanup Trap",
    },
    definition: {
      ko: "이 사이트는 Lenis 라이브러리로 부드러운 스크롤을 구현했고, Lenis 옵션 중 하나인 \"무한 스크롤\" (`infinite: true`) 은 끝까지 스크롤하면 처음으로 다시 이어지는 동작을 만듭니다. **Home / Webflow 같은 일부 페이지에서만 의도적으로** 켜고, 일반 게시물 페이지에서는 끄는 것이 의도였습니다.\n\n그런데 운영 중 **`/posts` → `/posts/tags` 로 이동했을 때 갑자기 페이지가 무한 스크롤로 동작** 하는 현상이 발생했습니다. tags 페이지는 그런 동작을 의도한 적이 없는데, 페이지 끝에 닿으면 콘텐츠가 다시 처음으로 점프해 사용자가 위치를 잃었습니다.\n\n페이지를 새로고침 (F5) 하면 정상으로 돌아왔다가, 다시 다른 경로로 navigate 해서 들어오면 다시 무한 스크롤이 켜지는 — **\"진입 경로에 따라 동작이 달라지는\"** 재현 패턴이었습니다.",
      en: "The site uses Lenis for smooth scrolling, and one of Lenis's options — \"infinite scroll\" (`infinite: true`) — wraps content back to the top when you reach the bottom. The intent: **enable it deliberately on certain pages** like Home / Webflow, and keep it off on regular post pages.\n\nIn production, **navigating `/posts` → `/posts/tags` would suddenly leave the tags page stuck in infinite-scroll mode**. The tags page had never been meant to behave that way; scrolling to the bottom looped back to the top, leaving users disoriented.\n\nA hard refresh (F5) restored normal behavior, but navigating in from another route again triggered the infinite scroll — a **\"behavior depends on entry route\"** repro pattern.",
    },
    cause: {
      ko: "각 페이지는 mount 될 때 Lenis 의 `setInfinite(false)` 를 호출하고, unmount 될 때 cleanup 에서 `setInfinite(true)` 로 \"원복\" 하는 패턴을 거의 모든 페이지가 따르고 있었습니다. 코드 한 곳만 보면 자연스러워 보입니다 — \"내가 끄고 들어왔으니 나갈 때 다시 켜 주는 게 매너\".\n\n문제는 이 convention 이 **\"기본값 = true (무한 켜짐), 페이지는 opt-out 한다\"** 라는 무의식적 가정 위에 서 있었다는 점입니다. 실제 LenisProvider 의 기본값은 `infinite: false` 였고, 어느 페이지도 명시적으로 \"기본을 true 로 둔다\" 고 선언한 적이 없었습니다. **convention 의 가정 ≠ provider 의 실제 default** — 두 층이 silent 하게 어긋나 있었습니다.\n\n결과: A 페이지가 unmount 될 때 cleanup 이 `setInfinite(true)` 를 호출 → B 페이지가 mount 될 때 자체 `setInfinite(false)` 가 없으면 그 true 가 그대로 남음. /posts (cleanup 으로 true 복원) → /posts/tags (자체 false 호출 없음) 순서가 정확히 그 case 였습니다.\n\n이 패턴은 페이지가 **15 개 파일에 동일하게 박혀 있었고**, 어느 한 페이지를 따로 보면 이상한 점이 없습니다. \"내 cleanup 은 내가 들어오기 전 상태로 되돌리는 거다\" 라는 한 사람의 자연스러운 직관이 페이지마다 반복되면서, 전체 시스템에서는 **\"마지막에 unmount 된 페이지의 cleanup 이 다음 페이지의 시작 상태를 결정\"** 하는 silent state leak 으로 굳었습니다.",
      en: "Almost every page followed the same pattern: call `setInfinite(false)` on mount, and \"restore\" with `setInfinite(true)` in cleanup on unmount. Looked at one page at a time, the pattern reads naturally — \"I turned it off coming in, so I should put it back on the way out.\"\n\nThe trap: the convention rested on an unconscious assumption — **\"default = true (infinite on), pages opt out\"**. But the actual LenisProvider default was `infinite: false`, and no page had ever declared \"the baseline is on\". **The convention's assumption ≠ the provider's actual default** — the two layers were silently disagreeing.\n\nThe result: A's unmount cleanup calls `setInfinite(true)` → if B doesn't call `setInfinite(false)` on mount, that `true` survives. The /posts → /posts/tags sequence was exactly that — /posts restored infinite to `true`, /posts/tags never claimed otherwise, so infinite stayed on.\n\nThis pattern lived **identically in 15 files**. Read one file alone and nothing looks wrong. Each developer's natural instinct (\"my cleanup restores whatever I changed\") repeated across pages compounded into a system-level rule: **\"the last-unmounted page's cleanup decides the next page's starting state\"** — a silent state leak.",
    },
    solution: {
      ko: "패턴을 반전시켰습니다.\n\n**Before (opt-out 모델)**\n```ts\n// 거의 모든 페이지\nuseEffect(() => {\n  lenis?.setInfinite(false);\n  return () => lenis?.setInfinite(true); // ← 이 한 줄이 silent leak 의 정체\n}, [lenis]);\n```\n\n**After (opt-in 모델)**\n```ts\n// LenisProvider — 기본값은 그대로 false 유지\n// 일반 페이지 — useEffect / cleanup 자체 제거\n// 의도적으로 무한 스크롤이 필요한 페이지만 명시적 opt-in\nuseEffect(() => {\n  // 진입 애니메이션 등이 끝난 뒤 활성화\n  lenis?.setInfinite(true);\n  return () => lenis?.setInfinite(false); // ← cleanup 은 진짜 default 로 복원\n}, [lenis]);\n```\n\n구체적으로는: 15 개 페이지 파일에서 `setInfinite(true)` cleanup 라인을 제거하고, 무한 스크롤이 실제로 필요한 곳 — 현재로서는 `HomeClient` 하나 — 만 명시적 `setInfinite(true)` 를 유지했습니다 (cleanup 에서는 `false` 로 진짜 default 복원).\n\n변경 후 \"진입 경로에 따라 동작이 달라지는\" 현상은 완전히 사라졌습니다. 가장 큰 이득은 **새 페이지를 만들 때 Lenis 를 의식할 필요가 없어졌다** 는 점입니다. 무한 스크롤이 필요하면 명시적으로 켜고, 아니면 아무것도 안 하면 됩니다. 다음 사람이 이 코드를 읽을 때 \"왜 여기서 lenis 를 만지지?\" 라고 생각할 일 자체가 없어졌습니다.",
      en: "Inverted the pattern.\n\n**Before (opt-out model)**\n```ts\n// nearly every page\nuseEffect(() => {\n  lenis?.setInfinite(false);\n  return () => lenis?.setInfinite(true); // ← this one line was the silent leak\n}, [lenis]);\n```\n\n**After (opt-in model)**\n```ts\n// LenisProvider — default stays false\n// Regular pages — drop the useEffect / cleanup entirely\n// Only pages that truly want infinite scroll opt in explicitly\nuseEffect(() => {\n  // enable after entry animation, etc.\n  lenis?.setInfinite(true);\n  return () => lenis?.setInfinite(false); // ← cleanup actually restores the real default\n}, [lenis]);\n```\n\nConcretely: removed the `setInfinite(true)` cleanup line from 15 page files, and kept the explicit `setInfinite(true)` only where infinite scroll is genuinely intended — currently just `HomeClient` (whose cleanup now restores `false`, the real default).\n\nThe \"entry-route-dependent\" symptom disappeared completely. The bigger win: **new pages no longer need to think about Lenis at all.** If you want infinite scroll, opt in explicitly. Otherwise, do nothing. The next person reading the code never has to wonder \"why is this page touching lenis?\".",
    },
    keyInsight: {
      ko: "**Cleanup 은 \"원복\" 이 아니라 \"라이브러리의 진짜 default 로 복원\" 이어야 합니다.**\n\n\"내가 들어와서 바꿨으니 나갈 때 원래대로 돌려놓자\" 는 직관은 한 페이지 단위에서는 옳지만, **그 \"원래\" 가 무엇인지 페이지마다 다르게 가정** 하기 시작하면 시스템 차원에서 silent state leak 이 됩니다. 특히 모든 페이지가 같은 패턴을 베껴 쓰면, 한 사람의 잘못된 가정이 N 개 페이지로 즉시 복제됩니다.\n\n공유 state (provider, context, global mutable) 를 다루는 cleanup 은 두 가지 중 하나로만 써야 합니다:\n\n1. **진짜 default 로 복원** — `LenisProvider` 의 default 가 `false` 면 cleanup 도 `false` 로. 한 곳 (provider) 에 정의된 default 만이 truth.\n2. **opt-in 모델** — 페이지가 명시적으로 켤 때만 useEffect 를 쓰고, 그 외에는 손대지 않는다. 아무것도 안 하는 페이지는 코드 자체가 없으므로 잘못된 가정이 끼어들 자리가 없다.\n\nopt-out 모델 (\"기본은 켜져 있고 페이지가 끈다\") 은 \"기본\" 의 정의가 코드 두 곳 (provider default + 페이지 cleanup) 에 분산되어, 두 곳이 어긋나면 어디가 진짜 default 인지 추적이 어려워집니다. **default 정의는 항상 한 곳에서만 살아야 합니다.**\n\n그리고 한 가지 더 — 같은 패턴이 **15 개 파일에 박혀 있을 때, 그게 \"문제 없으니 이대로 쓴다\" 의 증거가 아니라 \"한 사람의 잘못된 직관이 N 배로 복제된\" 패턴일 수 있다** 는 점을 의심해야 합니다. 페이지 단위로는 자연스러워 보이는 코드일수록, 시스템 차원에서 의도와 어긋날 때 발견이 늦습니다.",
      en: "**Cleanup means \"restore the library's real default\" — not \"restore whatever it was when I arrived\".**\n\n\"I changed it coming in, I should restore it going out\" reads naturally at one page's scope, but **the moment each page assumes a different \"original\"**, the system gets a silent state leak. Worse, if every page copy-pastes the same pattern, one person's wrong assumption replicates instantly to N pages.\n\nFor shared state (provider, context, global mutable), cleanup should only ever do one of two things:\n\n1. **Restore the real default** — if `LenisProvider`'s default is `false`, cleanup restores `false`. Truth lives in one place (the provider).\n2. **Opt-in model** — write the useEffect only on pages that explicitly turn the feature on; everywhere else, leave the state alone. Pages with no code can't carry wrong assumptions.\n\nThe opt-out model (\"default is on, each page turns it off\") splits the definition of \"default\" between provider config and per-page cleanup. When those two disagree, tracing the real default becomes painful. **A default should live in exactly one place.**\n\nAnd one more thing — when the same pattern is **copy-pasted across 15 files, that's not evidence \"it works fine\". It can be evidence that one person's wrong intuition replicated N times.** Code that looks natural per-page is exactly the kind that hides system-level mismatches the longest.",
    },
    tags: ["lenis", "convention", "cleanup pattern", "provider default", "silent state leak"],
  },

  /* ── Layout & CSS — PostCard meta separator on wrap ── */
  {
    section: { ko: "Frontend / Layout", en: "Frontend / Layout" },
    problem: {
      ko: "PostCard meta 가 wrap 될 때 separator 가 새 줄 시작에 어색하게 남는 문제",
      en: "PostCard Meta Separator Leaks to the Start of the Wrapped Line",
    },
    definition: {
      ko: "포스트 카드 아래쪽에는 작성자 · 작성일 · 조회수 같은 메타 정보가 한 줄에 표시되고, 그룹 사이는 짧은 세로 구분선 (`|`) 으로 시각적으로 분리됩니다. 가로 공간이 충분하면 한 줄에 깔끔하게 정렬됩니다.\n\n문제는 카드가 좁아져서 메타가 **두 줄로 wrap 될 때** 발생합니다. 두 번째 줄의 시작 부분에 **\"앞 그룹과의 구분선\" 이 그대로 남아** 있어, 마치 새 줄이 `|` 로 시작하는 것처럼 보입니다. 한 줄일 때는 자연스러운 separator 가, wrap 되는 순간 \"잘못된 자리에 떠 있는 문자\" 가 됩니다.\n\n좁은 모바일이나 카드가 grid 로 좁아지는 화면에서 매번 보였고, 사소하지만 카드 전반의 정돈된 느낌을 깎아내리는 종류의 시각적 잡음이었습니다.",
      en: "PostCard footers show meta (author · date · views) in a single row, with short vertical separators (`|`) between groups. With enough horizontal space, everything aligns cleanly on one line.\n\nThe issue: when the card narrows and meta **wraps onto a second line**, the **\"separator before the next group\" stays at the start of the wrapped line**, making the new line appear to begin with a stranded `|`. What reads as a clean delimiter on one line becomes a misplaced character the moment wrap kicks in.\n\nVisible on narrow mobile and any grid layout that compresses the card width — small, but the kind of visual noise that erodes the overall tidiness of the card grid.",
    },
    cause: {
      ko: "메타 영역은 `flex-wrap: wrap` 을 쓰는 `.meta` 컨테이너 안에 `.metaGroup` 들이 나란히 있는 구조였고, 구분선은 **`.metaGroup + .metaGroup::before`** 라는 인접 선택자 + pseudo-element 로 그렸습니다.\n\n```css\n.meta { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }\n.metaGroup + .metaGroup::before {\n  content: \"|\";\n  margin-right: var(--spacing-xs);\n  color: var(--text-tertiary);\n}\n```\n\n이 방식은 한 줄에서는 완벽합니다 — 두 번째 그룹부터 앞에 `|` 가 자동으로 붙고, 가운데 띄어쓰기까지 자연스럽습니다. 그런데 **`flex-wrap` 으로 그룹이 다음 줄로 떨어져도 `::before` 는 여전히 그 그룹 앞에 따라옵니다.** 그 결과 wrap 된 줄의 시작이 `| 다음그룹` 으로 보이게 됩니다.\n\n근본 원인은 \"CSS 만으로는 \"이 요소가 wrap 되었는지\" 를 알 수 없다\" 는 점입니다. `:nth-child` 도, sibling combinator 도, flex 도 wrap 여부에 대한 정보를 셀렉터에 제공하지 않습니다. 컨테이너 쿼리 (`@container`) 는 컨테이너 크기는 알 수 있지만, **개별 자식이 \"내가 새 줄로 떨어졌다\" 는 정보를 갖지는 않습니다.**\n\n즉 이 문제는 CSS 만으로는 해결이 불가능하고, JS 가 레이아웃을 측정해 element 에 마커를 달아 주어야 CSS 가 그 마커를 보고 분기할 수 있는 구조였습니다.",
      en: "The meta area was a `.meta` container with `flex-wrap: wrap`, containing `.metaGroup` siblings, and separators drawn via the **`.metaGroup + .metaGroup::before`** adjacent-sibling + pseudo-element trick.\n\n```css\n.meta { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }\n.metaGroup + .metaGroup::before {\n  content: \"|\";\n  margin-right: var(--spacing-xs);\n  color: var(--text-tertiary);\n}\n```\n\nFlawless on one line — every group after the first auto-gets a `|` prefix, with comfortable spacing. But **when `flex-wrap` drops a group to the next line, its `::before` tags along.** The wrapped line now starts with `| nextGroup`.\n\nThe root problem: **CSS alone can't tell whether an element has wrapped.** `:nth-child`, sibling combinators, flex — none of them feed wrap status into selectors. Container queries can sense container size, but **individual children don't know \"I got pushed to a new line\".**\n\nSo this can't be fixed in pure CSS. JS has to measure layout and stamp a marker the CSS can branch on.",
    },
    solution: {
      ko: "PostCard 안에서 `useLayoutEffect` + `ResizeObserver` 로 메타 그룹들의 `offsetTop` 을 측정하고, 첫 그룹과 다른 그룹의 top 이 다르면 **wrap 이 발생한 것** 으로 판정해 `.meta` 컨테이너에 `data-meta-wrapped` 속성을 붙이도록 했습니다.\n\n```tsx\nuseLayoutEffect(() => {\n  const meta = metaRef.current;\n  if (!meta) return;\n  const update = () => {\n    const groups = meta.querySelectorAll<HTMLElement>(\".metaGroup\");\n    if (groups.length < 2) return;\n    const firstTop = groups[0].offsetTop;\n    const wrapped = Array.from(groups).some((g) => g.offsetTop !== firstTop);\n    meta.toggleAttribute(\"data-meta-wrapped\", wrapped);\n  };\n  update();\n  const ro = new ResizeObserver(update);\n  ro.observe(meta);\n  return () => ro.disconnect();\n}, []);\n```\n\nCSS 쪽에서는 그 attribute 가 있을 때 separator 를 끕니다:\n\n```css\n.meta[data-meta-wrapped] .metaGroup + .metaGroup::before {\n  content: none;\n}\n```\n\n즉 한 줄에 들어맞을 때는 separator 가 보이고, wrap 되는 순간 자동으로 사라집니다. ResizeObserver 가 카드 크기 변화 (viewport resize, 그리드 컬럼 수 변경, 폰트 로드 등) 를 감지해 wrapped 상태가 실시간으로 토글됩니다.\n\n이 방식의 큰 장점은 **CSS 가 \"렌더링 결과\" 를 분기 조건으로 쓸 수 있게 된다** 는 점입니다. JS 는 layout 을 측정해 정보를 element 에 주입하는 역할만 하고, 디자인 결정 (separator 모양 · 색 · 사라지는 조건) 은 여전히 CSS 안에 머무릅니다.",
      en: "Inside PostCard, `useLayoutEffect` + `ResizeObserver` measures each `.metaGroup`'s `offsetTop`. If any group's top differs from the first group's, **wrap has happened** — flip a `data-meta-wrapped` attribute on the `.meta` container.\n\n```tsx\nuseLayoutEffect(() => {\n  const meta = metaRef.current;\n  if (!meta) return;\n  const update = () => {\n    const groups = meta.querySelectorAll<HTMLElement>(\".metaGroup\");\n    if (groups.length < 2) return;\n    const firstTop = groups[0].offsetTop;\n    const wrapped = Array.from(groups).some((g) => g.offsetTop !== firstTop);\n    meta.toggleAttribute(\"data-meta-wrapped\", wrapped);\n  };\n  update();\n  const ro = new ResizeObserver(update);\n  ro.observe(meta);\n  return () => ro.disconnect();\n}, []);\n```\n\nCSS branches off that attribute:\n\n```css\n.meta[data-meta-wrapped] .metaGroup + .metaGroup::before {\n  content: none;\n}\n```\n\nSeparators show when meta fits on one line; they disappear the moment wrap occurs. `ResizeObserver` catches every relevant change (viewport resize, grid column count, fonts loading in) so the wrapped state stays accurate in real time.\n\nThe key win: **CSS now branches on a rendering result**, not just on document structure. JS only measures layout and feeds the answer into the DOM as an attribute; the design decision (separator shape, color, when it disappears) still lives entirely in CSS.",
    },
    keyInsight: {
      ko: "**CSS 만으로는 표현할 수 없는 \"렌더링 결과 기반 조건\" 은 JS 가 마커를 달고 CSS 가 그 마커를 보는 분업으로 풀린다.**\n\nflex-wrap 이 일어났는지, 텍스트가 truncate 되었는지, 자식이 컨테이너 밖으로 overflow 했는지 — 이런 상태는 **CSS 셀렉터 시스템 자체가 알지 못하는 정보** 입니다. CSS 만으로 해결하려고 `@container`, `:has()`, `clamp()` 를 조합해 봐도 \"개별 자식이 새 줄로 떨어졌는가\" 라는 정보 자체가 셀렉터에 도달하지 않습니다.\n\n이런 케이스의 해결 공식은 항상 같습니다:\n\n1. **JS 는 layout 을 측정만** 한다 (`offsetTop`, `getBoundingClientRect`, `scrollWidth` vs `clientWidth` 등).\n2. **결과를 DOM attribute / data-\\* 로 element 에 주입** 한다 (`data-meta-wrapped`, `data-truncated`, `data-overflow=\"x\"` 등).\n3. **CSS 는 attribute 셀렉터로 분기** 한다.\n\n분업의 핵심은 **디자인 결정이 CSS 안에 머문다는 점** 입니다. JS 가 \"wrap 되면 separator 를 숨겨라\" 같은 디자인 명령을 직접 내리지 않습니다. JS 는 \"wrap 되었다\" 는 사실만 알리고, 그 사실에 대해 어떻게 반응할지 — separator 를 숨길지 / 색을 바꿀지 / 패딩을 조정할지 — 는 CSS 가 결정합니다. 디자인 변경이 일어나면 CSS 한 줄만 수정하면 됩니다.\n\n반대로 JS 안에서 직접 `style.borderLeft = \"none\"` 처럼 명령을 내리면 디자인 결정이 두 곳 (TSX + CSS) 에 분산되고, 다음에 \"separator 디자인을 바꾸자\" 가 들어왔을 때 두 파일을 동시에 봐야 합니다. **DOM attribute 는 두 영역의 가장 작은 인터페이스** 이고, 이 인터페이스를 좁게 유지하는 것이 장기 유지보수에 가장 큰 차이를 만듭니다.\n\n또한 ResizeObserver 는 \"브라우저가 layout 을 다시 계산한 시점\" 에 정확히 콜백이 호출되므로, window resize listener + manual recompute 보다 정확하고 비용도 적습니다. 이런 \"렌더링 결과 의존\" 분기에는 거의 항상 ResizeObserver 가 정답입니다.",
      en: "**Render-result-dependent conditions that CSS can't express belong to a JS-measures, CSS-branches split.**\n\nWhether flex-wrap happened, whether text got truncated, whether a child overflowed its container — **none of these reach the CSS selector system.** No amount of `@container` / `:has()` / `clamp()` will surface \"this individual child got pushed to a new line\" as a selectable state.\n\nThe pattern for cases like this is always the same:\n\n1. **JS only measures layout** (`offsetTop`, `getBoundingClientRect`, `scrollWidth` vs `clientWidth`, etc.).\n2. **The result is injected as a DOM attribute / `data-*`** (`data-meta-wrapped`, `data-truncated`, `data-overflow=\"x\"`).\n3. **CSS branches via attribute selectors.**\n\nThe split's real value: **design decisions stay in CSS.** JS never says \"hide the separator on wrap\" — it just reports \"wrapped\". Whether to hide a separator, change a color, adjust padding — that's CSS's call. Future design tweaks become one-line CSS edits.\n\nThe alternative — `style.borderLeft = \"none\"` inside JS — scatters design across TSX and CSS. Next time \"redesign the separator\" comes in, you have to touch both files. **A DOM attribute is the smallest possible interface between the two domains**, and keeping that interface narrow pays the biggest dividend in long-term maintenance.\n\nOne more note: `ResizeObserver` fires exactly when the browser has re-laid-out the element, making it more accurate and cheaper than `window.resize` listeners with manual recompute. For \"depends on rendering result\" branches, `ResizeObserver` is almost always the answer.",
    },
    tags: ["css", "layout", "ResizeObserver", "useLayoutEffect", "flex-wrap", "separator"],
  },

  /* ── Architecture — Admin works sort_order normalize ── */
  {
    section: { ko: "Architecture / Algorithm", en: "Architecture / Algorithm" },
    problem: {
      ko: "Admin works sort_order 정렬 — 부분 shift 가 DB 의 0·중복 잔재를 못 정리",
      en: "Admin Works `sort_order` — Partial Shift Can't Clean Up Pre-Existing 0s and Duplicates",
    },
    definition: {
      ko: "Admin works 페이지는 작품 목록을 사용자가 원하는 순서로 정렬할 수 있도록 **각 row 에 `sort_order` 정수 컬럼** 을 두고, 드래그·\"맨 앞/뒤로 이동\"·신규 추가한 행을 다른 위치로 옮기는 동작이 모두 이 컬럼을 갱신합니다. 원래는 \"맨 앞이 1, 다음이 2…\" 같은 dense 한 1..N 시퀀스가 유지되는 것이 이상적입니다.\n\n실제 운영하다 보니 DB 의 `sort_order` 가 자주 어긋났습니다. 마이그레이션 직후 일부 row 에 `0` 이 남아 있거나 (default = 0 으로 채워진 상태), 같은 숫자가 두 행에 동시에 들어 있거나, 1·3·4·7 처럼 중간이 비어 있는 식이었습니다.\n\n증상으로는 **방금 \"맨 앞으로 이동\" 한 작품이 실제 목록에서는 두 번째에 떠 있거나**, 같은 sort_order 의 두 행이 새로고침마다 순서를 바꾸는 — \"내가 결정한 순서가 안 지켜진다\" 는 느낌의 잡음이 반복됐습니다.",
      en: "The admin works page lets the user order entries manually by storing a **`sort_order` integer column on each row**, with drag-reorder / \"move to top/bottom\" / dropping a new row at a specific position all updating that column. Ideally the table keeps a dense `1..N` sequence — first row `1`, second row `2`, and so on.\n\nIn practice the column drifted often: post-migration rows kept `0` (the default), two rows ended up with the same number, or gaps like `1·3·4·7` appeared after a series of edits.\n\nThe visible symptom: **a work that had just been \"moved to top\" still showed up second** in the listing, or two rows with identical `sort_order` shuffled positions across refreshes — small but persistent \"the order I set isn't being respected\" noise.",
    },
    cause: {
      ko: "기존 PATCH 핸들러는 \"내가 만진 두 row 사이만 조정\" 하는 **부분 shift** 였습니다. 예를 들어 `position = 3` 으로 옮긴 row 가 있으면, 기존에 `>= 3` 이었던 row 들의 `sort_order` 를 +1 씩 밀어 자리를 비우는 방식입니다.\n\n한 행을 옮기는 동작 안에서만 보면 옳습니다 — 충돌하는 위치만 깔끔히 정리됩니다. 문제는 \"이미 깨져 있는 상태\" 를 만났을 때입니다. DB 에 `0`, `1`, `1`, `4` 가 있다면 (`1` 중복 + `2·3` 빠짐 + `0` 잔재), `position = 2` 로 새 행을 끼워 넣어도 부분 shift 는 **자기가 건드린 \"≥ 2\" 영역만 +1 시프트** 합니다. 결과는 `0`, `1`, `2`, `2`, `5` 처럼 새 중복 + 새 빈자리가 또 생긴 상태. 부분 보정은 \"이미 가지고 있던 오류\" 를 그대로 안고 갑니다.\n\n더 본질적인 문제: **\"내가 만진 부분만 책임진다\" 는 관점은 데이터가 시간이 지나면서 누적되는 결함을 영원히 못 따라잡습니다.** 이전 마이그레이션 잔재, 과거 버그가 남긴 0, 동시에 두 admin 이 편집해서 생긴 중복 — 이런 것들은 \"지금 동작\" 의 책임 범위 밖이라 영원히 그대로입니다. 어느 시점엔가 데이터가 cleanup 되어야 하는데, 그 cleanup 이 별도 스크립트나 한 번 돌리는 마이그레이션 형태로 분리되면 잊혀집니다.",
      en: "The existing PATCH handler did a **partial shift** — adjusting only the rows immediately around the change. When a row moved to `position = 3`, every row currently at `>= 3` got `+1`'d to make space.\n\nViewed in isolation, that's correct. The trap is meeting state that's *already* broken. If the table held `0, 1, 1, 4` (`1` duplicated, `2·3` missing, leftover `0`), inserting at `position = 2` shifted only the `>= 2` range by `+1` — yielding `0, 1, 2, 2, 5`, a fresh duplicate plus a fresh gap. Partial fixes inherit pre-existing damage and carry it forward.\n\nThe deeper issue: **\"only touch what I changed\" can never catch up with damage that accumulates over time.** Migration leftovers, `0`s from old bugs, duplicates from concurrent edits by different admins — none of those fall inside the current handler's responsibility, so they live forever. The cleanup has to happen somewhere, and if it's pushed to a separate script or one-shot migration it gets forgotten.",
    },
    solution: {
      ko: "관점을 \"부분 보정\" → **\"매 mutation 마다 전체 dense renumber\"** 로 바꿨습니다. PATCH 가 들어오면 (드래그·맨 앞/뒤·position input 어느 트리거든) 다음 한 가지만 합니다:\n\n1. **새 위치를 반영한 최종 순서를 메모리에서 결정** — id 배열 하나를 만든다.\n2. **그 배열 순서대로 `sort_order` 를 1, 2, 3, …, N 으로 다시 발급** — 0 / 중복 / 빈자리 모두 자동으로 사라진다.\n3. **하나의 transaction 안에서 일괄 update** — 중간 상태에서 다른 read 가 들어와도 일관된 sequence 만 본다.\n\n```ts\n// PATCH /api/admin/works/reorder — 핵심 부분\nconst nextOrder = computeNextOrder(currentRows, { movedId, toPosition });\n// 항상 1..N dense 로 발급, 무조건 전체 row 대상\nawait Promise.all(\n  nextOrder.map((id, i) =>\n    supabase.from(\"works\").update({ sort_order: i + 1 }).eq(\"id\", id),\n  ),\n);\n```\n\n변경 후의 가장 큰 차이는 **\"DB 가 어떤 상태로 들어와도 mutation 한 번이면 깨끗해진다\"** 는 점입니다. 새로 추가된 row 가 `sort_order: 0` (default) 으로 들어와도, 과거에 중복이 있어도, 다음 한 번의 드래그·이동 시점에 전체가 1..N 으로 normalize 됩니다. cleanup 을 별도 스크립트로 분리할 필요가 없고, \"이 mutation 의 책임 범위\" 가 자연스럽게 \"테이블 전체\" 로 정의됩니다.\n\n비용 측면에서도 작품 N 은 보통 수십 개 단위이므로 N 개 row 를 전부 update 해도 부담이 없습니다. \"성능 때문에 부분 shift 가 정답\" 이라는 통념이 데이터 크기 가정에 의존한다는 걸 다시 확인하는 계기였습니다.",
      en: "Shifted the model from \"partial adjustment\" to **\"renumber the entire table on every mutation\"**. Whatever the trigger — drag-reorder, move-to-top/bottom, or a typed position — the handler now does just one thing:\n\n1. **Compute the final order in memory** — produce a single id array reflecting the new position.\n2. **Re-issue `sort_order` as `1, 2, 3, …, N` in that array's order** — every `0`, duplicate, and gap dissolves automatically.\n3. **Apply all updates in a single transaction** — concurrent reads only see a consistent sequence.\n\n```ts\n// PATCH /api/admin/works/reorder — the core\nconst nextOrder = computeNextOrder(currentRows, { movedId, toPosition });\n// always 1..N dense, always every row\nawait Promise.all(\n  nextOrder.map((id, i) =>\n    supabase.from(\"works\").update({ sort_order: i + 1 }).eq(\"id\", id),\n  ),\n);\n```\n\nThe biggest payoff is that **whatever state the DB is in, one mutation cleans it**. A newly inserted row with `sort_order: 0` (the default), a legacy duplicate, a gap from a stale migration — all of them disappear at the next drag or move. The cleanup no longer needs to live as a separate script, and the mutation's responsibility naturally expands to \"the whole table\".\n\nOn cost: works are typically in the dozens, so updating every row is trivial. \"Partial shift is correct for performance\" turns out to be load-bearing on an assumption about row count that didn't apply here.",
    },
    keyInsight: {
      ko: "**\"내가 만진 부분만 책임진다\" 는 mutation 의 책임 범위를 좁히는 게 아니라, 데이터의 누적 결함을 영원히 따라잡지 못하게 만든다.**\n\n특히 sort_order 처럼 \"전체가 dense 1..N 이어야 의미가 있는 invariant\" 를 가진 컬럼은, 매번 그 invariant 를 mutation 책임 안에 포함시키는 것이 자연스럽습니다. \"invariant 는 별도 script 로 한 번 cleanup\" 은 항상 \"언젠가 실행한다\" 로 미뤄지고 결국 안 돌게 됩니다.\n\nN 이 작은 도메인 (작품 / 시리즈 / 카테고리 / 메뉴 항목 등 — 보통 100 단위 이하) 에선 **\"매 mutation 마다 전체 renumber\"** 가 거의 항상 옳습니다. 비용은 무시할 수 있고, 코드가 한 곳에서 끝나며, \"이 테이블의 sort_order 가 어떻게 발급되는가\" 질문에 답이 한 줄로 나옵니다. 부분 shift 는 코드 양은 비슷한데 \"이미 깨져 있던 row 는 어떻게 되나\" 라는 질문에 답이 없습니다.\n\nN 이 큰 경우엔 (사용자가 수만 명 단위로 직접 ordering 하는 시나리오 — 거의 없음) lexorank / fractional indexing 같은 다른 자료구조가 필요하지만, 그건 \"부분 shift\" 가 답이 아니라 \"문제 정의 자체를 바꾸는\" 케이스입니다. **순진한 부분 보정이 정답인 경우는 거의 없다** 는 점이 핵심입니다.",
      en: "**\"Only touch what I changed\" doesn't narrow a mutation's responsibility — it guarantees the data's accumulated damage will never get caught up with.**\n\nFor a column like `sort_order`, whose meaning rests on a global invariant (dense `1..N`), the natural move is to fold that invariant into every mutation's responsibility. \"We'll clean it up with a separate script later\" perpetually slides to \"someday\" and never runs.\n\nFor small-N domains (works, series, categories, menu items — usually under a few hundred), **\"renumber the whole table on every mutation\"** is almost always right. The cost is negligible, the code lives in one place, and the question \"how does `sort_order` get assigned here?\" has a one-line answer. Partial shifts have the same amount of code, but they have no answer to \"what happens to rows that were already broken?\".\n\nFor large-N (tens of thousands of items being manually re-ordered — very rare), you need a different data structure entirely — lexorank, fractional indexing — but that's reframing the problem, not patching partial shift. **The takeaway: naive partial fixes are almost never the right answer for ordering columns.**",
    },
    tags: ["algorithm", "sort_order", "invariant", "renumber", "admin"],
  },

  /* ── Cross-platform / UX — Touch device hover ── */
  {
    section: { ko: "Cross-platform / UX", en: "Cross-platform / UX" },
    problem: {
      ko: "터치 디바이스에 hover 가 없어 데스크탑 전용 인터랙션 (hover glow / tooltip) 이 모바일에서 사라짐",
      en: "Touch Devices Have No Hover — Desktop-only Interactions (Hover Glow, Tooltip) Vanish on Mobile",
    },
    definition: {
      ko: "`/posts/tags` 페이지를 개편하면서 **태그 pill 에 hover** 시 (a) 연관 태그 (co-occurrence top 5) 가 accent halo 로 강조되고 (b) tooltip 으로 태그 설명이 떠오르는 인터랙션을 넣었습니다. 데스크탑에서는 자연스러운 발견 (\"이 태그랑 같이 쓰이는 다른 태그가 뭘까?\") 동선이었지만, 모바일에서 실제로 써 보니 **이 정보가 화면에 나오는 길 자체가 없다** 는 걸 깨달았습니다.\n\n터치 디바이스는 \"hover\" 라는 상태가 없습니다. 사용자는 두 가지만 합니다 — \"탭\" (즉시 click) 과 \"탭 → 이동\". hover 인터랙션은 데스크탑에선 마우스가 정보 위를 지나가는 자연스러운 흐름이지만, 터치에선 그 흐름이 존재하지 않습니다. 그래서 hover 에 묶어 둔 모든 UX (연관 태그, 짧은 설명, 미리보기) 가 모바일 사용자에겐 **완전히 없는 기능** 이 됩니다.\n\n이건 \"모바일에서 작게 보이는 문제\" 가 아니라 \"입력 모달리티 자체가 다른 문제\" 였습니다.",
      en: "Reworking `/posts/tags` introduced two **hover-based** interactions on the tag pills: (a) related tags (co-occurrence top 5) highlight with an accent halo, and (b) a tooltip surfaces the tag's description. On desktop this felt like a natural discovery flow — \"what other tags get used with this one?\". On mobile, the moment I actually used it, it became clear **there's no path for that information to reach the screen at all**.\n\nTouch devices don't have a \"hover\" state. Users do two things: \"tap\" (which is just `click`) and \"tap → navigate\". On desktop, hover is a natural slipstream — the cursor passes information on its way somewhere — but on touch that slipstream doesn't exist. Every hover-bound piece of UX (related tags, short description, preview) becomes **a feature that simply isn't there** for mobile users.\n\nThis wasn't a \"things look smaller on mobile\" problem — it was an \"input modality is fundamentally different\" problem.",
    },
    cause: {
      ko: "처음에는 `@media (hover: none)` 같은 CSS 미디어 쿼리로 hover 자체를 disable 하면 충분하다고 생각했습니다. 그런데 그건 \"hover 가 안 발화되는 걸 막는다\" 일 뿐, **hover 안에 담겨 있던 정보를 어디서 보여줄지** 에는 답이 없습니다.\n\n구조적으로 문제는 두 층이었습니다.\n\n**① 정보 전달 채널의 불일치** — hover 는 \"커서가 잠깐 머무른다\" 는 시그널이고, 그 시그널이 있을 때만 UI 가 추가 정보를 띄웁니다. 터치엔 \"잠깐 머무름\" 이 없으니, 같은 정보를 보여 줄 다른 시그널 (long-press / 명시적 \"info\" 버튼 / 탭 → 펼침) 이 필요합니다. 데스크탑 코드를 그대로 두고 \"hover 만 disable\" 하면 정보가 사라집니다.\n\n**② \"같은 액션, 다른 UI\" 가 아니라 \"다른 액션, 다른 UI\"** — 데스크탑에서 hover 는 발견 (discovery) 에 가깝고, 탭은 결정 (commit) 에 가깝습니다. 두 단계가 자연스럽게 분리되어 있습니다. 터치에선 두 단계가 한 동작 (\"탭\") 에 묶입니다. 단순히 \"hover 의 UI 를 탭에 옮기면 된다\" 는 안 됩니다 — 탭은 이미 \"이 태그의 글 보기\" 동작에 묶여 있기 때문입니다. 한 동작에 두 개의 결과 (\"발견\" + \"결정\") 를 같이 욱여넣으면 사용자는 어느 쪽이 일어날지 예측할 수 없습니다.\n\n즉 이 문제는 \"CSS 로 hover 를 끄면 끝\" 이 아니라, **\"발견 단계를 터치 디바이스에서 어디에 둘 것인가\" 라는 디자인 결정** 이 먼저 필요했습니다.",
      en: "My first instinct was to disable hover via `@media (hover: none)` and call it done. That only prevents hover from firing — it doesn't answer the actual question: **where do you surface the information that hover was carrying?**\n\nThere were two structural layers underneath.\n\n**① Mismatched information channels** — hover signals \"the cursor is lingering here for a moment\", and the UI uses that signal as permission to reveal extra context. Touch has no \"lingering\"; you need a different signal (long-press / explicit info button / tap → expand) to carry the same information. Disabling hover on touch without offering a replacement just deletes the data.\n\n**② Not \"same action, different UI\" — \"different action, different UI\"** — on desktop, hover is closer to discovery and tap is closer to commit; the two phases are naturally separated. On touch, both phases collapse into a single tap. Moving the hover UI onto tap can't work, because tap is already bound to \"view posts for this tag\". Stuffing two outcomes (\"discover\" + \"commit\") into one gesture leaves users unable to predict which one they'll get.\n\nThe problem wasn't \"disable hover with CSS\" — it was **a design decision: where does the discovery phase live on touch devices?**",
    },
    solution: {
      ko: "디바이스 분기를 **CSS 가 아니라 동작 레벨** 에서 했습니다. `useIsMobile` 훅이 이미 viewport 분기를 갖고 있어서, 같은 훅에 **`isTouch`** (`window.matchMedia(\"(pointer: coarse)\")`) 를 추가하고 컴포넌트가 모드를 명시적으로 선택하도록 했습니다.\n\n**데스크탑 (`isTouch === false`)** — 기존 hover 인터랙션 그대로 유지. mouseenter 에 연관 태그 halo + tooltip, mouseleave 에 해제.\n\n**터치 (`isTouch === true`)** — hover 인터랙션 완전 제거. 대신 **탭 시 바텀 시트 (`BottomSheet`) 가 슬라이드 업** 되어 (a) 태그 설명 (b) 연관 태그 pill (탭하면 그 태그로 navigate) (c) **\"이 태그의 글 보기\" 명시적 CTA 버튼** 을 보여줍니다. ESC / backdrop tap / X 버튼 어느 쪽으로든 닫고, 열려 있는 동안엔 `body { overflow: hidden }` 으로 background scroll lock.\n\n핵심은 **터치에선 \"탭\" 의 의미를 재정의** 했다는 점입니다. 데스크탑은 \"탭 = 이 태그의 글 페이지로 이동\". 터치는 \"탭 = 발견 시트 열기\", 그 시트 안의 CTA 버튼이 데스크탑의 \"탭\" 과 같은 역할을 합니다. 한 동작 (탭) 에 두 결과를 욱여넣지 않고, **발견 단계를 한 칸 뒤로 명시화** 했습니다.\n\n```tsx\nconst { isTouch } = useIsMobile();\n\nreturn (\n  <Pill\n    onMouseEnter={isTouch ? undefined : () => showHalo(tag)}\n    onMouseLeave={isTouch ? undefined : clearHalo}\n    onClick={() => (isTouch ? openSheet(tag) : router.push(`/posts/tags/${tag}`))}\n  />\n);\n```\n\n부수적인 효과로, 터치 시트 안에는 **데스크탑 hover 에 담기엔 너무 많은 정보** (관련 태그 5개를 다 탭 가능한 pill 로) 도 자연스럽게 들어갈 수 있게 됐습니다. 데스크탑에선 \"마우스 떼면 사라진다\" 는 제약 때문에 짧게 보여줘야 했던 정보가, 터치에선 명시적으로 닫을 때까지 머물러 더 풍부한 UI 가 가능해졌습니다.",
      en: "Split the modes **at the behavior level, not in CSS**. `useIsMobile` already covered viewport branching; I added `isTouch` (`window.matchMedia(\"(pointer: coarse)\")`) to the same hook and let the component pick a mode explicitly.\n\n**Desktop (`isTouch === false`)** — keep the hover interactions exactly as before. `mouseenter` triggers the related-tag halo + tooltip; `mouseleave` clears them.\n\n**Touch (`isTouch === true`)** — remove hover entirely. Tapping a pill instead **slides up a bottom sheet** (`BottomSheet`) containing (a) the tag's description, (b) related-tag pills (tapping one navigates to that tag), and (c) an explicit **\"View posts for this tag\"** CTA button. ESC / backdrop tap / X button all close it, and `body { overflow: hidden }` locks the background scroll while it's open.\n\nThe key move was **redefining what \"tap\" means on touch**. On desktop, tap = navigate to the tag's posts page. On touch, tap = open the discovery sheet, and the sheet's CTA button is what plays desktop-tap's role. Instead of two outcomes per gesture, the discovery phase is made explicit one step earlier.\n\n```tsx\nconst { isTouch } = useIsMobile();\n\nreturn (\n  <Pill\n    onMouseEnter={isTouch ? undefined : () => showHalo(tag)}\n    onMouseLeave={isTouch ? undefined : clearHalo}\n    onClick={() => (isTouch ? openSheet(tag) : router.push(`/posts/tags/${tag}`))}\n  />\n);\n```\n\nA nice side effect: the touch sheet can carry **more information than hover ever could** — five tappable related-tag pills, full description, a primary CTA. On desktop, hover information has to be terse because it disappears the moment the mouse leaves; on touch, it sticks until the user explicitly closes it, which makes a richer UI possible.",
    },
    keyInsight: {
      ko: "**터치 디바이스에 \"hover 없음\" 은 viewport 가 작은 문제가 아니라 입력 모달리티가 다른 문제다.**\n\n반응형 디자인은 보통 \"viewport 가 작으면 레이아웃을 바꾼다\" 로 시작합니다. 하지만 그 안에서 종종 놓치는 건 **\"viewport 가 작다\" 와 \"hover 가 없다\" 는 서로 독립적인 차원** 이라는 사실입니다. 큰 viewport 의 터치 디바이스 (iPad, Surface) 도 있고, 작은 viewport 의 마우스 디바이스 (외부 모니터 mirrored phone) 도 있습니다. viewport 분기로 hover 인터랙션을 제어하면 양쪽 다 어긋납니다.\n\n실제 분기는 두 차원을 모두 봐야 합니다:\n\n1. **`(pointer: coarse)`** — 정밀한 포인팅이 없는 입력 (터치, 게임패드). \"hover\" 가 신뢰할 만한 신호가 아니다.\n2. **`(hover: hover)`** — hover 가 실제로 발생하는 입력. \"hover 인터랙션을 써도 안전한가\" 의 답.\n\n그리고 더 중요한 건, hover 인터랙션을 끄는 게 끝이 아니라 **그 정보가 어디서 나타날지를 새로 디자인** 해야 한다는 점입니다. hover 는 \"발견\" 과 \"결정\" 을 두 단계로 자연스럽게 분리해 주는데, 터치엔 그 분리가 기본 제공되지 않으니 **시트 / long-press / 명시적 info 버튼 / 두 단계 탭** 같은 명시적 발견 통로를 디자이너가 직접 만들어야 합니다.\n\n구현 측면에선 \"디바이스 분기를 CSS 에 두느냐 / JS 에 두느냐\" 도 중요합니다. CSS `@media (hover: none)` 은 hover 시각 효과를 끄는 정도까진 충분하지만, \"탭 했을 때 다른 컴포넌트를 열어야 한다\" 같은 동작 분기에는 부족합니다. 동작이 달라져야 하면 **JS 레벨에서 mode 분기** — 컴포넌트가 자기 모드를 명시적으로 알고, mouseenter / click handler 를 mode 별로 다르게 등록하는 — 쪽이 깔끔합니다.\n\n마지막으로 한 가지, **터치 디자인이 데스크탑보다 정보를 더 많이 담을 수 있는 경우가 종종 있다** 는 점도 새겨 둘 만합니다. hover 의 \"잠깐\" 제약이 사라지기 때문에, 시트나 펼침 UI 는 데스크탑에서는 부담스러울 정보 밀도까지 안고 갈 수 있습니다.",
      en: "**\"No hover on touch\" is not a small-viewport problem — it's a different-input-modality problem.**\n\nResponsive design usually starts with \"if the viewport is small, change the layout\". What that framing easily misses is that **\"small viewport\" and \"no hover\" are independent dimensions**. Large-viewport touch devices exist (iPad, Surface); small-viewport mouse devices exist (a phone mirrored to a monitor with a mouse). Branching hover interactions on viewport alone misfires for both.\n\nThe real branch needs both dimensions:\n\n1. **`(pointer: coarse)`** — inputs with no precise pointing (touch, gamepad). \"Hover\" isn't a trustworthy signal here.\n2. **`(hover: hover)`** — inputs that actually hover. Tells you whether hover-bound UX is safe to use.\n\nMore important than turning hover off: **redesigning where that information now appears**. Hover naturally separates discovery from commit into two phases, but touch doesn't ship that separation for free — you have to build an explicit discovery channel yourself (sheets, long-press, info buttons, two-step taps).\n\nImplementation-wise, the \"CSS vs JS for branching\" question matters. CSS `@media (hover: none)` is fine for visual side effects (\"no halo on touch\"), but it's the wrong tool for behavioral branching (\"on touch, tap opens a sheet instead of navigating\"). Anything that changes *behavior* belongs at the **JS mode-branch level** — the component knows its mode explicitly and registers different `mouseenter` / `click` handlers per mode.\n\nOne more thing worth keeping: **touch designs can sometimes carry more information than desktop ones.** Without hover's \"only while the cursor is over me\" constraint, sheets and expansions can hold a density of information that would feel oppressive on desktop hover.",
    },
    tags: ["responsive", "touch", "hover", "pointer:coarse", "useIsMobile", "BottomSheet"],
  },

  /* ── Custom cursor — draggable row child button ── */
  {
    section: { ko: "Custom cursor", en: "Custom cursor" },
    problem: {
      ko: "draggable row 안 button hover 시 grab 커서가 박혀 click 으로 돌아가지 않음",
      en: "Hovering a Button Inside a Draggable Row Stays on the `grab` Cursor — Won't Revert to `click`",
    },
    definition: {
      ko: "Admin 테이블 row 는 전체가 `draggable` 인 동시에, row 안에 \"미리보기 / 편집 / 삭제\" 같은 작은 액션 버튼들이 들어 있습니다. 데스크탑 커스텀 커서 (`CursorTrail`) 는 hover 한 요소 타입에 따라 cursor 를 다르게 그립니다 — 드래그 가능한 영역 위에선 `grab` (손바닥) 으로 커지고, 버튼 위에선 \"Click\" 라벨이 붙은 작은 원으로 줄어듭니다.\n\n그런데 실제로 행을 끌 수 있는 상태에서 행 안의 작은 버튼 위에 마우스를 올리면 — **커서가 여전히 `grab` 으로 박혀 있고 \"Click\" 라벨도 안 나타납니다**. 결과적으로 사용자는 \"이걸 클릭할 수 있는 건가?\" 를 시각적으로 확신할 수 없게 됩니다. 버튼은 분명히 동작하는데 커서가 그 사실을 부정하는 형태였습니다.",
      en: "Admin table rows are entirely `draggable`, and inside each row sit small action buttons (preview / edit / delete). The site's custom cursor (`CursorTrail`) renders different cursors based on the hovered element type — over a draggable surface it grows into a `grab` (open hand), over a button it shrinks into a small circle with a \"Click\" label.\n\nIn practice, when a row was drag-enabled and you hovered a child button, **the cursor stayed locked to `grab` and never showed the \"Click\" affordance**. Visually, users couldn't tell whether the button was clickable; the button worked, but the cursor actively contradicted that fact.",
    },
    cause: {
      ko: "`CursorTrail` 의 `runHitTest` 는 매 pointermove 마다 마우스 아래 element 를 가져와서 \"이 element 가 어떤 cursor type 에 해당하는가\" 를 결정합니다. 결정 순서가 있었습니다 — 대략 다음 우선순위였습니다:\n\n1. **`closest('[draggable]')`** 이 있으면 `grab`\n2. **`closest('button, a, [role=button]')`** 이 있으면 `click`\n3. 그 외 default cursor\n\nrow 가 통째로 draggable 인 상황에서 child button 에 마우스를 올리면, **button 도 \"draggable row\" 의 자손** 이라 `closest('[draggable]')` 이 먼저 매치되어 즉시 `grab` 으로 결정됩니다. 이후 단계의 \"버튼이면 click\" 검사는 도달조차 못 합니다.\n\n이게 옳을 때도 있습니다 — row 내부의 \"빈 공간\" 위에 있을 때는 row 가 draggable 이라는 사실을 알려 줘야 하니까요. 잘못된 건 \"button 안인데도 grab 으로 박힌다\" 는 case 만입니다. 즉 **draggable 의 우선순위가 button 보다 무조건 높은 것이 문제** 가 아니라, **두 매치가 동시에 발생할 때 \"가장 안쪽 (innermost)\" 의 의도를 따라야 한다** 는 규칙이 빠져 있던 것입니다.\n\nDOM 트리 관점에서 `<tr draggable>` 안의 `<button>` 은 button 이 더 안쪽 (descendant) 이므로, \"같은 element 가 두 자격을 다 가질 때는 더 좁은 컨텍스트 우선\" 이 자연스럽습니다. 사용자도 그렇게 인지합니다 — \"row 어디든 잡아끌 수 있지만, 이 버튼은 클릭한다\".",
      en: "`CursorTrail`'s `runHitTest` runs on every `pointermove`, picks up the element under the cursor, and decides which cursor type to render. The decision order was roughly:\n\n1. **`closest('[draggable]')`** present → `grab`\n2. **`closest('button, a, [role=button]')`** present → `click`\n3. Otherwise → default cursor\n\nWith a fully-draggable row, hovering a child button still satisfied **step 1** (the button is a descendant of a `[draggable]` ancestor), so the cursor short-circuited to `grab` and the \"button → click\" check never ran.\n\nStep 1 is correct over the row's blank space — users should know the row is draggable from anywhere. The bug is specifically the \"button-inside-a-draggable\" case. So the issue isn't that `draggable` outranks `button` globally — it's that **when both match, the innermost intent should win**. That rule was missing.\n\nFrom the DOM tree's perspective, the `<button>` is *inside* the `<tr draggable>` (deeper descendant). When the same element qualifies for two cursor types, deferring to the narrower context — \"the row is draggable, but this button is for clicking\" — matches how users mentally model the surface too.",
    },
    solution: {
      ko: "`runHitTest` 의 분기에서 **\"button / link 이면서 동시에 draggable 자손인 경우\" 를 명시적으로 잡아내는 한 줄** 을 추가했습니다.\n\n```ts\nconst hitButton = el.closest('button, a, [role=\"button\"]') as HTMLElement | null;\nconst hitDraggable = el.closest('[draggable=\"true\"]') as HTMLElement | null;\n\n// button 이 draggable 의 자손이면 button 의 click cursor 가 이긴다.\nif (hitButton && hitDraggable && hitDraggable.contains(hitButton)) {\n  return { type: \"click\", target: hitButton };\n}\nif (hitDraggable) return { type: \"grab\", target: hitDraggable };\nif (hitButton) return { type: \"click\", target: hitButton };\n```\n\n핵심은 `hitDraggable.contains(hitButton)` 한 줄입니다 — 두 매치가 같은 element 가 아니라 \"draggable 안에 button 이 있는\" 구조라면, **더 안쪽인 button 이 cursor 결정권을 가진다** 고 명시했습니다.\n\n변경 후 동작:\n\n- row 의 빈 공간 → `grab` (draggable 만 매치) ✓\n- row 안의 작은 액션 버튼 → `click` (button 도 매치, draggable 안에 들어 있음 → button 우선) ✓\n- row 밖의 일반 버튼 → `click` (draggable 매치 안 됨) ✓\n\n부수적으로, `hitDraggable.contains(hitButton)` 체크 자체는 비용이 거의 없고 (`Node.contains` 은 native, O(depth)) `runHitTest` 가 throttle 되고 있어 60fps 영향도 측정되지 않았습니다.",
      en: "Added a single line to `runHitTest`'s branching that explicitly handles **\"button-or-link that is also a descendant of a draggable\"**.\n\n```ts\nconst hitButton = el.closest('button, a, [role=\"button\"]') as HTMLElement | null;\nconst hitDraggable = el.closest('[draggable=\"true\"]') as HTMLElement | null;\n\n// If the button lives inside a draggable, the button's click cursor wins.\nif (hitButton && hitDraggable && hitDraggable.contains(hitButton)) {\n  return { type: \"click\", target: hitButton };\n}\nif (hitDraggable) return { type: \"grab\", target: hitDraggable };\nif (hitButton) return { type: \"click\", target: hitButton };\n```\n\nThe critical line is `hitDraggable.contains(hitButton)` — when the two matches aren't the same element but form a nested structure (button inside draggable), **the innermost element gets cursor authority**.\n\nAfter the change:\n\n- Blank area inside a row → `grab` (only draggable matches) ✓\n- A small action button inside a row → `click` (button also matches, sits inside the draggable, button wins) ✓\n- A regular button outside any draggable → `click` (no draggable match) ✓\n\n`Node.contains` is native (O(depth)), and `runHitTest` is already throttled, so the extra check is unmeasurable at 60fps.",
    },
    keyInsight: {
      ko: "**중첩된 인터랙션 컨텍스트가 두 개 이상 매치될 때는, 더 안쪽 (innermost) 의 의도가 이긴다.**\n\n커스텀 커서뿐 아니라 모든 \"포인터 의도 분류\" 문제에 일반적으로 적용되는 규칙입니다 — `<a>` 안의 `<button>`, draggable 안의 link, scrollable 안의 carousel — 같은 element 가 여러 컨텍스트의 자손이면, 사용자 입장에서 \"가장 가까운\" 컨텍스트가 의도와 일치합니다. UI 라이브러리들이 \"event delegation\" 을 할 때 보통 `closest()` 순서 (안에서 밖으로) 로 처리하는 것도 같은 논리입니다.\n\n구현 패턴으로는 두 가지 형태가 있습니다:\n\n1. **두 매치를 동시에 잡고 nesting 검사** — 위 예시처럼 `closest()` 를 두 번 부르고 `.contains()` 로 포함 관계 검사. 코드는 한 줄 더 늘지만, \"버튼이 draggable 자손이면 양보\" 라는 의도가 코드에 그대로 드러납니다.\n2. **자손 쪽이 부모의 행동을 \"opt out\"** — 자손에 `data-cursor-stop` 같은 attribute 를 두고 부모 매칭에서 제외. 자손 쪽이 책임을 가지므로 \"여기는 다르게 다뤄 달라\" 는 명시가 강하지만, 모든 자손에 attribute 를 박아야 해서 cost 가 큽니다.\n\n저는 1번 (부모 쪽 분기) 을 골랐습니다. 자손 (button) 은 자기가 \"draggable 안에 있다\" 는 사실을 몰라도 되고, 분기 로직이 한 곳 (`runHitTest`) 에 모여 있어 향후 \"또 다른 nesting case\" 가 생겨도 같은 자리에서 한 줄만 추가하면 됩니다.\n\n조금 더 일반화하자면 — **사용자는 항상 \"내가 지금 가장 가까이에서 만지고 있는 것\" 을 기준으로 행동을 예측합니다.** 외부 컨테이너의 자격 (draggable / scrollable / clickable) 이 자손의 자격을 가린다면, 그 자격은 사용자의 mental model 보다 우선시될 만큼 본질적이어야 합니다. 대부분의 경우 그렇지 않고, **자손의 의도가 외부 컨텍스트를 이기는 것이 자연스러운 default** 입니다.",
      en: "**When two nested interaction contexts both match, the innermost intent should win.**\n\nThis isn't specific to custom cursors — it generalizes to every \"pointer-intent classification\" problem. `<button>` inside `<a>`, link inside a draggable, carousel inside a scrollable — when a single element belongs to several interaction contexts, the user's mental model is always \"the closest one\". It's the same reason event delegation libraries walk `closest()` inside-out.\n\nThere are two common implementation shapes:\n\n1. **Match both ancestors and check nesting** — call `closest()` twice and use `.contains()` to detect the inner-vs-outer relationship (the pattern above). One extra line, but the intent reads cleanly: \"if the button is a descendant of a draggable, the button wins\".\n2. **Have descendants opt out of the parent's behavior** — sprinkle a `data-cursor-stop` attribute on inner elements. The exception lives at the descendant, which makes \"treat me differently\" explicit, but it costs an attribute on every relevant child.\n\nI chose (1) — branching at the parent. Descendants don't have to know they're inside a draggable, the branching logic stays in one place (`runHitTest`), and adding \"another nesting case\" later is one more line in the same file.\n\nThe broader principle: **users predict behavior from \"the thing I'm closest to right now\".** For an outer container's affordance (draggable / scrollable / clickable) to override an inner element's affordance, it has to be more essential than the user's mental model — which is rarely the case. **Letting inner intent win is the natural default.**",
    },
    tags: ["cursor", "custom-cursor", "draggable", "hit-test", "nested-interaction", "CursorTrail"],
  },

  /* ── Page transition: morph 와 skeleton 사이의 timing 불일치 ── */
  {
    section: { ko: "Animation & Interaction", en: "Animation & Interaction" },
    problem: { ko: "페이지 트랜지션 morph 가 끝나도 화면이 한참 비어 있어 \"skeleton 이 따로 도는\" 인상", en: "After the transition morph clears, the page sits empty for almost a second — feels like skeleton runs separately" },
    definition: {
      ko: "카드를 클릭하면 cover 이미지가 hero 위치로 morph 한 뒤 fade out — 까지는 의도대로 동작했지만, **morph 가 사라진 직후 destination 페이지의 hero 아래쪽이 한참 비어 있는 듯한 인상** 이 사용자에게 남았습니다. 사용자는 \"morph 따로, skeleton 따로 두 개가 시퀀스로 돌고 있는 것 같다\" 고 보고했고, 디버그 로그를 찍어보니 morph 가 사라지는 시점에 정작 destination 의 본문은 아직 보이지 않고 있었습니다.",
      en: "Clicking a card morphed the cover image to the hero slot and faded it out — the intended choreography. But users reported that **after morph cleared, the area below the hero stayed visibly empty for almost a second**, like \"morph and the skeleton are two separate sequences running back to back\". Debug logs confirmed: when morph faded, the destination's main content wasn't visible yet.",
    },
    cause: {
      ko: "원인은 두 군데 겹쳐 있었습니다.\n\n**(1) Next.js Suspense fallback 위치 오해** — `/posts → /posts/[slug]` 네비게이션 시, destination segment 코드가 아직 컴파일/캐시 되지 않은 상태이면 자식 loading.tsx (`/posts/[slug]/loading.tsx`) 가 정의 자체를 못 그리기 때문에 **부모 segment 의 fallback (`/posts/loading.tsx` — 9 카드 그리드 스켈레톤) 이 잠시 노출** 됩니다. 의도한 detail 페이지의 hero+header skeleton 이 아니라 \"리스트 페이지 skeleton\" 이 나와서 사용자가 \"skeleton 이 두 번 바뀐다\" 고 본 거였습니다.\n\n**(2) framer-motion `initial.opacity: 0` + delay** — destination 의 `PostDetailClient` 가 마운트 되면 articleHeader / seriesBox / prose / commentSection 4개의 `motion.div` 가 `initial={{ opacity: 0 }}` + `transition.delay: 0.15~0.5` 로 fade-in 합니다. 직접 URL 진입 시엔 의도된 모션이지만, 트랜지션으로 진입할 때는 **morph 가 fade out 되는 200ms 와 motion.div fade-in delay 가 겹쳐서, morph 사라진 자리에 opacity 0 상태의 빈 영역이 ~750ms 노출됩니다**. 사용자 눈에는 그게 \"skeleton 이 더 도는 것\" 으로 보였습니다.\n\n특히 dev 환경에서는 (1) 이 두드러집니다 — destination 코드 컴파일이 5~10초 걸리므로 부모 fallback 노출 시간이 길고, 그 사이 (2) 까지 더해져 총 체감 로딩이 8초 가까이 늘어났습니다.",
      en: "The cause was a stack of two issues.\n\n**(1) Misreading Next.js Suspense fallback location** — During `/posts → /posts/[slug]` navigation, if the destination segment's code isn't yet compiled/cached, the child `/posts/[slug]/loading.tsx` literally **can't render** (its definition isn't loaded), so Next.js falls back to the **parent segment's fallback (`/posts/loading.tsx` — a 9-card grid skeleton)**. The user saw \"a list-page skeleton, then a detail-page skeleton\" instead of the intended single detail skeleton.\n\n**(2) framer-motion `initial.opacity: 0` + delay** — When the destination `PostDetailClient` mounts, four `motion.div`s (articleHeader / seriesBox / prose / commentSection) animate in with `initial={{ opacity: 0 }}` + `transition.delay: 0.15~0.5`. That's the intended choreography for direct URL entry — but during a page transition, the **morph fade (200ms) overlaps with the motion.div fade-in delay, leaving an opacity-0 area visible for ~750ms after morph clears**. To the user, that empty area read as \"another skeleton phase\".\n\nIn dev, (1) dominates — destination compile takes 5–10s, so the parent fallback hangs around, and (2) piles on top of that, pushing total perceived loading toward 8 seconds.",
    },
    solution: {
      ko: "두 가지를 따로 잡았습니다.\n\n**(1) `/posts/loading.tsx` 제거 + `/posts/page.tsx` 에 인라인 Suspense** — `/posts/loading.tsx` 파일 자체를 삭제해 부모 fallback 이 부를 게 없게 만들었습니다. 그러면 destination 코드 컴파일 동안에는 fallback 이 더 위 (root) 로 bubble 되거나 — 이 프로젝트에는 root loading 도 없어 — **이전 페이지가 그대로 보존** 됩니다. backdrop 이 이미 화면을 덮고 있어 시각적으로는 깔끔합니다.\n\n다만 `/posts/page.tsx` 의 `PostsClient` 가 `useSearchParams()` 를 쓰기 때문에 SSR prerender 시 Suspense boundary 가 반드시 필요합니다. 인라인으로 `<Suspense fallback={null}>` 한 줄을 추가했습니다 — null fallback 이라 화면에는 아무 영향 없고, prerender 만 통과시킵니다.\n\n```tsx\nexport default async function PostsPage() {\n  const initialData = await getInitialPostsData();\n  return (\n    <Suspense fallback={null}>\n      <PostsClient initialData={initialData} />\n    </Suspense>\n  );\n}\n```\n\n**(2) isTransitioning gate** — `usePageTransition()` 의 `isTransitioning` flag 를 PostDetailClient 의 motion.div 4개에 동일하게 주입했습니다. 트랜지션으로 진입하면 (`isTransitioning === true`) `initial.opacity` 를 1 로 강제, 직접 URL 진입은 기존 fade-in 유지.\n\n```tsx\n<motion.div\n  initial={isTransitioning ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}\n  animate={{ opacity: 1, y: 0 }}\n  transition={{ duration: 0.6, delay: 0.15 }}\n>\n```\n\nDetailLayout 의 hero 가 이미 같은 패턴을 쓰고 있어 일관성이 자연스러웠습니다.\n\n부가적으로 — banner / card 컴포넌트들이 `<div onClick>` 패턴이라 Link 자동 prefetch 가 안 되던 것도 손봤습니다. `onMouseEnter` / `onFocus` 시점에 `router.prefetch(/posts/${slug})` 수동 호출 (Set 으로 dedup) 로 prod 첫 클릭 시점의 fetch 비용을 hover 단계로 미리 옮겼습니다. SplitBanner 같이 한 번에 1 슬라이드만 보이는 케이스는 useEffect 로 현재 슬라이드를 자동 prefetch.",
      en: "Two independent fixes.\n\n**(1) Delete `/posts/loading.tsx` + add inline Suspense in `/posts/page.tsx`** — Removing the file removed the parent fallback entirely. While the destination compiles, the fallback either bubbles further up (root has none in this project) or — and this is what happens here — **the previous page stays mounted underneath the morph overlay**. The backdrop is already covering the screen, so visually it's clean.\n\nBut `PostsClient` uses `useSearchParams()`, so SSR prerender requires a Suspense boundary. Added one inline with a `null` fallback — visually no-op, but prerender passes.\n\n```tsx\nexport default async function PostsPage() {\n  const initialData = await getInitialPostsData();\n  return (\n    <Suspense fallback={null}>\n      <PostsClient initialData={initialData} />\n    </Suspense>\n  );\n}\n```\n\n**(2) `isTransitioning` gate** — Wired the `isTransitioning` flag from `usePageTransition()` into the four `motion.div`s in PostDetailClient. When entering via transition, `initial.opacity` snaps to 1; direct URL entry keeps the original fade-in.\n\n```tsx\n<motion.div\n  initial={isTransitioning ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}\n  animate={{ opacity: 1, y: 0 }}\n  transition={{ duration: 0.6, delay: 0.15 }}\n>\n```\n\nDetailLayout's hero already used the same pattern, so consistency came for free.\n\nAs a follow-up, banner/card components using `<div onClick>` don't benefit from Link's automatic prefetch. Added manual `router.prefetch(/posts/${slug})` on `onMouseEnter` / `onFocus` (deduped via a `Set`) so the destination's RSC payload starts loading on hover instead of on click. SplitBanner — only one slide visible at a time — auto-prefetches the current slide in a `useEffect`.",
    },
    keyInsight: {
      ko: "**\"같은 보이는 부분에서 두 시스템이 동시에 책임지면, 둘 다 의도대로 동작해도 사용자에게는 잘못된 것처럼 보인다.\"**\n\n이 케이스에서 두 시스템은 (a) page-transition overlay 의 motion timing 과 (b) Next.js Suspense fallback + destination 의 entrance animation 였습니다. 각자 떨어져 보면 둘 다 \"맞게\" 동작합니다 — overlay 는 morph 끝나면 fade out 하고, motion.div 는 mount 시점에 fade in 합니다. 하지만 두 시점이 겹쳐서 그 사이의 200~750ms 동안 빈 영역이 사용자 눈에 직접 들어옵니다.\n\n**디버깅 가설을 \"하나의 버그\" 가 아니라 \"두 시스템의 시점 mismatch\" 로 다시 잡는 데 시간이 걸렸습니다.** 처음엔 morph fade timing 만 조정해 보거나, loading.tsx 모양만 바꿔 봤는데, 진짜 원인은 \"두 시점이 어떻게 만나야 사용자가 끊김을 못 느끼는가\" 라는 질문이었습니다. 답은 \"morph 가 사라지는 순간 destination 도 visible 상태여야 한다\" — 즉 destination 의 entrance animation 이 transition 으로 진입할 땐 skip 돼야 한다는 것.\n\n**Next.js App Router 의 loading.tsx 구조에 대한 오해도 같이 풀어야 했습니다.** \"자식 segment 의 loading.tsx 가 항상 자식의 fallback 이다\" 라고 생각하기 쉽지만, 자식 segment 의 코드가 로드되기 전엔 그 loading 도 정의가 없어 부모로 fall through 합니다. dev 환경에서 이 점이 두드러지는 이유는 prod 의 prerendered chunk 와 달리 dev 는 매번 컴파일하기 때문입니다.\n\n구체적인 코드보다도, \"두 시스템 사이의 timing 계약\" 을 명시화하는 패턴 — 위 예시의 `isTransitioning` flag 처럼 — 이 일반 원칙으로 더 가치 있습니다. \"내가 트랜지션의 일부로 마운트되고 있다\" 는 정보가 destination 컴포넌트에 도달하지 않으면, 두 시스템은 영원히 따로 돌 수밖에 없습니다.",
      en: "**\"When two systems share responsibility for the same visible area, both can behave correctly and still feel wrong to the user.\"**\n\nThe two systems here were (a) the page-transition overlay's morph timing and (b) Next.js's Suspense fallback + the destination's entrance animations. Each looked fine in isolation — the overlay faded out after morph, the `motion.div`s faded in on mount. But their windows overlapped, and the 200–750ms gap between them was directly visible.\n\n**Reframing the debugging hypothesis from \"one bug\" to \"two systems with mismatched timing\" took the longest.** Early attempts tuned morph fade timing or reshaped `loading.tsx` — neither addressed the actual question, which was \"what makes the morph clearing moment line up with the destination being visible?\" The answer: the destination's entrance animation should be **skipped when the entry is a page transition**.\n\n**Misreading Next.js App Router's `loading.tsx` semantics was the other half.** It's tempting to assume the child segment's `loading.tsx` is always the child's fallback, but until the child segment's code is loaded, that loading definition also doesn't exist yet — so it falls through to the parent. Dev makes this conspicuous because every segment recompiles on demand, where prod has prerendered chunks.\n\nMore than the specific code, the principle worth keeping is **making the timing contract between two systems explicit** — like the `isTransitioning` flag above. If the destination component never gets told \"I'm being mounted as part of a transition\", the two systems will always run in parallel rather than as one connected sequence.",
    },
    tags: ["page-transition", "framer-motion", "Next.js", "Suspense", "loading.tsx", "skeleton", "prefetch", "isTransitioning"],
  },

  /* ── 색 토큰 OKLCH 전환 — HSL 의 hue-별 밝기 불균형 정리 ── */
  {
    section: { ko: "Layout & CSS", en: "Layout & CSS" },
    problem: { ko: "HSL 기반 색 토큰이 hue 별로 지각 밝기가 달라 같은 lightness 끼리도 톤이 들쭉날쭉", en: "HSL color tokens look uneven across hues — same lightness reads as different brightness" },
    definition: {
      ko: "디자인 시스템의 모든 색 토큰을 `hsl()` 로 두고 lightness 를 같은 값으로 맞추면 \"이 두 색은 같은 톤이다\" 가 보장될 것 같지만, 실제로 보면 **노랑 (`hsl(50, 80%, 50%)`) 은 눈부시게 밝고 보라 (`hsl(270, 80%, 50%)`) 는 어둑한 보라색** 처럼 같은 50% 가 hue 마다 전혀 다른 밝기로 보입니다.\n\n포트폴리오 카드의 \"seededColor\" 처럼 hue 만 cycle 하면서 안정적인 톤을 유지하고 싶은 경우, HSL 에선 \"이 hue 는 lightness 를 더 낮춰야 같아 보이고, 저 hue 는 chroma 를 줄여야 한다\" 는 식의 hue-별 보정이 필요합니다. 보정 테이블이 늘어날수록 시스템이 깨지기 쉬워지고, 다크/라이트 테마에서는 보정 값이 또 달라지기 때문에 hue 갯수가 늘면 관리 비용이 비선형으로 늡니다.",
      en: "Pinning lightness across every HSL token suggests \"these colors share a tone\" — but in practice **yellow (`hsl(50, 80%, 50%)`) looks glaringly bright while purple (`hsl(270, 80%, 50%)`) looks muddy**. The same 50% reads as completely different brightness depending on hue.\n\nFor things like \"seededColor\" (cycle hue while holding the tone steady) HSL forces hue-by-hue compensation: \"this hue needs lightness dropped, that one needs chroma trimmed\". The patch table grows, dark/light modes need separate corrections, and the system becomes harder to evolve as more hues are added.",
    },
    cause: {
      ko: "HSL 의 lightness 는 **RGB 의 (max + min) / 2** 로 정의된 수학적 평균일 뿐, 사람 눈의 지각 밝기와 일치하지 않습니다. 인간 시각계는 녹/노랑 영역에 가장 민감하고 파랑/보라에 둔합니다 — 같은 \"50%\" 라도 노랑은 시신경이 강하게 받아서 더 밝게, 보라는 약하게 받아서 더 어둡게 느낍니다.\n\n이 문제는 1976년 CIE Lab 부터 인식되어 있던 거고, 2020년 표준화된 **OKLCH (Oklab Lightness Chroma Hue)** 는 그 후속입니다. OKLCH 의 L 은 **\"같은 L 값이면 hue 와 무관하게 동일한 지각 밝기\"** 가 되도록 설계되어 있습니다. 위 예시를 OKLCH 로 옮기면 — 노랑 `oklch(80% 0.2 90)` 과 보라 `oklch(80% 0.2 290)` 는 정말로 같은 톤으로 보입니다.\n\n다만 OKLCH 에는 다른 함정이 있습니다 — **sRGB 색 공간 밖** (gamut out) 의 색을 표현할 수 있다는 점입니다. `oklch(70% 0.4 30)` 같이 chroma 를 과하게 주면 sRGB 모니터가 표현할 수 없어 가장 가까운 sRGB 색으로 clipping 되고, 그 결과가 의도와 달라집니다. hue 마다 sRGB 안에 들어가는 chroma 한계가 다르므로, 단순히 \"모든 hue 에 chroma 0.2\" 같이 못 박으면 안전한 hue 에선 낭비, 위험한 hue 에선 clipping 됩니다.",
      en: "HSL's lightness is just a math average — **`(max + min) / 2` of the RGB components** — not the perceived brightness. The human visual system is most sensitive to green/yellow and least to blue/purple, so \"50%\" in yellow feels bright while the same 50% in purple looks dim.\n\nCIE Lab spotted this in 1976; **OKLCH (Oklab Lightness Chroma Hue)**, standardized in 2020, is the modern descendant. OKLCH's L is engineered so that **\"the same L means the same perceived brightness, regardless of hue\"**. Translated to OKLCH, yellow `oklch(80% 0.2 90)` and purple `oklch(80% 0.2 290)` actually look like the same tone.\n\nThe trap: OKLCH can describe colors **outside the sRGB gamut**. `oklch(70% 0.4 30)` with too much chroma can't be rendered on an sRGB monitor and gets clipped to the nearest sRGB neighbor — diverging from intent. Per-hue safe chroma differs, so pinning \"chroma 0.2 for every hue\" wastes safe headroom in some hues and clips others.",
    },
    solution: {
      ko: "두 단계로 정리했습니다.\n\n**(1) 모든 raw 색 토큰을 culori 로 OKLCH 변환** — `src/styles/tokens/_color.css` 의 hex / rgba 값을 [culori](https://culori.js.org) 라이브러리에 한 번 통과시켜 동일 정밀도 (L/C 5 dp, H 2 dp) 의 `oklch(L% C H)` 로 일괄 교체했습니다. component 단위 module CSS 의 산발 hex / rgba 도 같은 변환 거쳐 정리 — 시스템 전체가 단일 색 공간으로 통일됐습니다. alpha 가 필요한 곳은 `oklch(L C H / α)` 형태.\n\n```css\n/* Before */\n--color-accent: #d01046;\n--color-accent-12: rgba(208, 16, 70, 0.12);\n\n/* After */\n--color-accent: oklch(54.99% 0.215 18.50);\n--color-accent-12: oklch(54.99% 0.215 18.50 / 0.12);\n```\n\nfallback (`var(--color-accent, #d01046)`) 은 모두 제거 — fallback 있는 채로 두면 토큰 누락이 silent 하게 hidden 되어 \"어디서 어떤 fallback 이 동작 중인지\" 추적이 불가능해지기 때문입니다.\n\n**(2) seededColor 의 hue 앵커마다 `safeChroma` 명시** — `src/utils/seededColor.ts` 의 12 hue 앵커 (orange · amber · yellow · lime · green · teal · cyan · sky · blue · purple · magenta · pink) 각각에 \"이 hue 에서 sRGB clipping 없이 갈 수 있는 최대 chroma\" 를 hardcode 했습니다. 노랑은 0.16 까지, 파랑은 0.25 까지 같은 식. tone (vivid / pastel / muted / deep / soft) 마다 lightness 범위와 chroma-ratio 를 정의해 두고, hue 앵커의 safeChroma 와 곱해서 최종 chroma 산출 — 어떤 hue 든 sRGB 안에 들어가면서, 같은 tone 끼리 일관된 톤이 나옵니다.\n\n```ts\nconst HUE_ANCHORS = [\n  { hue: 90,  safeChroma: 0.16 },  // yellow — 가장 좁은 sRGB\n  { hue: 240, safeChroma: 0.25 },  // blue — 비교적 넓음\n  // ...12 개\n];\nconst TONES = {\n  vivid:  { lBase: 0.62, lRange: 0.08, cRatio: 1.00 },\n  pastel: { lBase: 0.82, lRange: 0.04, cRatio: 0.55 },\n  // ...5 개\n};\n```\n\n결과 — **12 anchor × 5 tone = 60 가지 결정적 OKLCH 조합**, 같은 seed 는 항상 같은 색, 인접 카드는 anchor 와 tone 둘 다 stride 로 cycle 되어 시각적 분리 보장. 이전 8 × 3 = 24 조합 대비 약 2.5배 늘어났는데도 \"이 카드만 톤이 튄다\" 같은 결함이 사라졌습니다.\n\nSeriesCard 처럼 한 페이지 안에서 \"hue 만 다르고 톤은 통일\" 이 더 자연스러운 경우엔 `tone` 옵션으로 명시 강제할 수 있게 했습니다 — `generateSeededColor(seed, isDark, idx, \"pastel\")` 처럼.",
      en: "Two phases.\n\n**(1) Convert every raw color token to OKLCH via culori** — passed every hex / rgba in `src/styles/tokens/_color.css` through [culori](https://culori.js.org) with consistent precision (L/C to 5 dp, H to 2 dp) and replaced them with `oklch(L% C H)`. Then did the same for scattered hex / rgba in component-level module CSS — the entire system now lives in one color space. Where alpha is needed, use `oklch(L C H / α)`.\n\n```css\n/* Before */\n--color-accent: #d01046;\n--color-accent-12: rgba(208, 16, 70, 0.12);\n\n/* After */\n--color-accent: oklch(54.99% 0.215 18.50);\n--color-accent-12: oklch(54.99% 0.215 18.50 / 0.12);\n```\n\nDropped every `var()` fallback (`var(--color-accent, #d01046)`). Fallbacks silently hide token gaps; you can't tell which fallback is actually rendering, so they were forbidden.\n\n**(2) Explicit `safeChroma` per hue anchor in seededColor** — Each of the 12 hue anchors in `src/utils/seededColor.ts` (orange · amber · yellow · lime · green · teal · cyan · sky · blue · purple · magenta · pink) now carries the **maximum chroma reachable in sRGB for that hue**. Yellow caps at 0.16, blue can go to 0.25, and so on. Each tone (vivid / pastel / muted / deep / soft) holds a lightness range and a chroma ratio; the final chroma is `anchor.safeChroma * tone.cRatio`. Every hue stays inside sRGB while same-tone outputs share a coherent feel.\n\n```ts\nconst HUE_ANCHORS = [\n  { hue: 90,  safeChroma: 0.16 },  // yellow — narrowest sRGB headroom\n  { hue: 240, safeChroma: 0.25 },  // blue — more room\n  // ...12 total\n];\nconst TONES = {\n  vivid:  { lBase: 0.62, lRange: 0.08, cRatio: 1.00 },\n  pastel: { lBase: 0.82, lRange: 0.04, cRatio: 0.55 },\n  // ...5 total\n};\n```\n\nNet effect — **12 anchors × 5 tones = 60 deterministic OKLCH combos**. Same seed always returns the same color; neighbors cycle both anchor and tone by stride so no two adjacent cards share both. Up from the old 8 × 3 = 24, yet \"this one card looks off\" defects disappeared.\n\nFor cases like SeriesCard where a page should hold a single tone but vary hue, an optional `tone` parameter forces it: `generateSeededColor(seed, isDark, idx, \"pastel\")`.",
    },
    keyInsight: {
      ko: "**\"수학적 평균\" 과 \"지각 밝기\" 는 다르다.** HSL 의 lightness 는 단순 RGB 평균이라 hue 가 바뀌면 같은 50% 도 다른 밝기로 보입니다. 색을 다루는 시스템은 \"수학적으로 같은 값\" 이 아니라 \"사람이 같다고 느끼는 값\" 을 기준 단위로 삼아야 토큰화의 약속이 깨지지 않습니다. OKLCH 는 그 약속을 색 공간 차원에서 보장합니다.\n\n그러나 OKLCH 도입은 \"hsl 을 oklch 로 바꿔서 끝\" 이 아닙니다. OKLCH 는 sRGB 보다 넓은 색 공간 (P3 등) 까지 표현 가능해서, **sRGB 안에 들어가는 chroma 가 hue 마다 다릅니다.** 안전 범위를 hue 마다 명시하지 않으면 \"왜 노랑만 칙칙해 보이지?\" 같은 신규 문제가 곧 생깁니다. seededColor 처럼 hue 를 동적으로 cycle 하는 시스템에선 hue 별 safeChroma 테이블이 사실상 필수입니다.\n\n또한 마이그레이션 과정에서 `var()` fallback 은 모두 제거했습니다. **\"안전 장치\" 처럼 보이는 fallback 은 실제로는 토큰 누락을 silent 하게 가리는 디버깅 방해 요소** 입니다. 토큰이 누락되면 명시적으로 부서져서 \"여기서 토큰을 정의해야 한다\" 가 한눈에 드러나야 시스템이 유지됩니다. 같은 이유로 component CSS 의 hex 직접 사용도 금지 — 색은 항상 토큰을 통해서.\n\n도구 측면에서는 culori 같은 라이브러리로 \"한 번에 동일 정밀도로 변환\" 한 것이 핵심이었습니다. 손으로 OKLCH 값을 적으면 5 자리수 / 2 자리수 정밀도가 들쭉날쭉해지고, 두 토큰이 \"수학적으로는 같지만 표기는 다른\" 케이스가 생겨 grep 으로 잡히지 않습니다. 변환 파이프라인을 한 줄로 고정하면 신규 색 추가 시에도 같은 라인을 통과시켜 정밀도 일관성을 유지할 수 있습니다.",
      en: "**\"Math-average\" and \"perceived brightness\" are different things.** HSL's lightness is just an RGB midpoint, so the same 50% reads as different brightness across hues. A color system that wants its tokens to mean something has to use the unit humans actually share — perceived brightness — not the math one. OKLCH builds that promise into the color space.\n\nBut adopting OKLCH isn't \"swap hsl for oklch and done\". OKLCH can describe colors beyond sRGB (P3 and friends), so **the chroma that fits inside sRGB varies by hue.** Without per-hue safe ranges, you trade the old problem for a new one (\"why does only yellow look washed out?\"). For dynamic systems like seededColor that cycle hue, a per-hue `safeChroma` table is effectively mandatory.\n\nThe migration also dropped every `var()` fallback. **A fallback that looks like a safety net actually hides token gaps and ruins debuggability.** Missing tokens should fail loudly so the gap is obvious; that's the only way the system stays maintained. Same reasoning forbids raw hex in component CSS — colors only via tokens.\n\nOn tooling: doing the conversion with culori in one pass mattered. Hand-edited OKLCH values drift in precision (some 5 dp, some 3 dp), and two tokens that are mathematically equal end up textually different — `grep` misses them. Pinning the conversion to a single pipeline means new colors go through the same line and keep precision uniform.",
    },
    comparisons: [
      {
        label: { ko: "HSL vs OKLCH — 색 공간 비교", en: "HSL vs OKLCH — color space comparison" },
        headers: [
          { ko: "비교 항목", en: "Criteria" },
          { ko: "HSL (이전)", en: "HSL (before)" },
          { ko: "OKLCH (채택)", en: "OKLCH (adopted)" },
        ],
        rows: [
          { cells: [{ ko: "동일 L = 동일 지각 밝기", en: "Same L = same perceived brightness" }, { ko: "✗ hue 별 다름", en: "✗ varies by hue" }, { ko: "✓ 보장", en: "✓ guaranteed" }] },
          { cells: [{ ko: "alpha 표기", en: "Alpha syntax" }, { ko: "`hsla(h, s, l, α)`", en: "`hsla(h, s, l, α)`" }, { ko: "`oklch(L C H / α)`", en: "`oklch(L C H / α)`" }] },
          { cells: [{ ko: "광색 공간 (P3, Rec2020)", en: "Wide gamut (P3, Rec2020)" }, { ko: "✗ sRGB 한정", en: "✗ sRGB only" }, { ko: "✓ 표현 가능 (sRGB clipping 주의)", en: "✓ representable (watch sRGB clipping)" }] },
          { cells: [{ ko: "안전 chroma 가 hue 마다 다름", en: "Safe chroma per hue varies" }, { ko: "해당 사항 없음", en: "N/A" }, { ko: "✓ safeChroma 테이블 필요", en: "✓ needs safeChroma table" }] },
          { cells: [{ ko: "브라우저 지원", en: "Browser support" }, { ko: "범용", en: "Universal" }, { ko: "✓ 모든 모던 브라우저 (2023~)", en: "✓ all modern browsers (since 2023)" }] },
          { cells: [{ ko: "동적 hue cycling 에 적합?", en: "Fit for dynamic hue cycling?" }, { ko: "✗ hue 별 보정 누적", en: "✗ per-hue compensation piles up" }, { ko: "✓ 동일 톤 유지", en: "✓ tone stays consistent" }], highlight: true },
        ],
        description: {
          ko: "HSL 은 표기가 직관적이고 모든 hue 에 일관된 lightness 값을 그대로 쓸 수 있어 보이지만, 사람이 보는 결과는 hue 마다 다릅니다. OKLCH 는 표기가 살짝 낯설지만 \"같은 L 이면 같은 톤\" 약속이 깨지지 않습니다 — 다만 sRGB clipping 회피를 위한 hue 별 safeChroma 가 추가 비용입니다.",
          en: "HSL looks intuitive — same L means same lightness — but the actual perception varies per hue. OKLCH is slightly less familiar but actually keeps the \"same L = same tone\" promise. The trade-off: you need a per-hue `safeChroma` table to dodge sRGB clipping.",
        },
      } satisfies ComparisonTable,
    ],
    tags: ["oklch", "hsl", "color-tokens", "design-system", "culori", "perceptual-brightness", "srgb-gamut", "seededColor"],
  },

  /* ── pg_cron + Vault + Resend — Vercel cron 의존 제거 ── */
  {
    section: { ko: "Architecture & Backend", en: "Architecture & Backend" },
    problem: { ko: "예약 발행 / 휴지통 정리가 Vercel cron 에 묶여 호스팅 의존 + 알림 누락", en: "Scheduled publish + trash purge bound to Vercel cron — host lock-in and silent failures" },
    definition: {
      ko: "예약 발행 (`scheduled_at` 도달 시 `published=true` 로 flip) 과 휴지통 자동 영구삭제 (`purge_after` 지난 row hard delete) 는 처음엔 Vercel cron 으로 구현됐습니다.\n\n`/api/cron/publish-scheduled` 5분 주기, `/api/cron/purge-trash` 매일 03:00 KST. 동작 자체는 됐지만 두 가지 약점이 누적되었습니다:\n\n**(1) 호스팅 의존** — Vercel 외 플랫폼 (Cloudflare Pages / Railway / self-hosted) 으로 옮기면 cron 부분만 따로 재구현 필요. \"Next.js 앱은 호스팅과 독립\" 이라는 원칙이 깨집니다.\n\n**(2) 알림 누락** — cron route 가 발행 / 삭제 후 결과를 `admin_notifications` 에 insert 까지는 했는데, 실패하든 성공하든 **그게 일어났다는 사실 자체가 관리자에게 도달하지 않았습니다**. 알림 페이지를 열어 봐야만 알 수 있고, 정작 \"오늘 새벽에 N개 영구삭제됐다\" 같은 중요한 변경은 놓치기 쉬웠습니다.",
      en: "Scheduled publish (flip `published=true` when `scheduled_at` arrives) and auto trash purge (hard-delete `purge_after`-past rows) were first implemented as Vercel cron routes.\n\n`/api/cron/publish-scheduled` every 5 minutes, `/api/cron/purge-trash` daily at KST 03:00. Functionally fine, but two weaknesses piled up:\n\n**(1) Host lock-in** — moving off Vercel (to Cloudflare Pages / Railway / self-hosted) means re-implementing the cron half separately. Breaks the \"app is independent of host\" principle.\n\n**(2) Silent notifications** — cron routes inserted rows into `admin_notifications` after each publish / purge, but **the fact that it happened never reached me**. I had to open the notifications page to discover anything; critical events like \"N items hard-deleted overnight\" were easy to miss.",
    },
    cause: {
      ko: "Vercel cron 으로 시작한 건 \"우선 호스팅 기본 기능으로 빠르게 동작시키자\" 였습니다. 그러나 도메인이 자라면서 (예약 발행 + 휴지통 + 향후 다른 정기 작업) **\"이 사이트의 정기 작업\" 이 점점 호스팅이 아닌 DB 와 결합** 되어 갔습니다 — 결국 cron route 가 하는 일은 \"Supabase 에 SQL UPDATE 한 줄 보내고 결과를 같은 Supabase 에 insert 하기\" 인데, 그 사이를 Vercel 의 cron + Next.js route 가 매개하고 있었던 셈입니다. 매개층이 늘면 실패 지점도 늘고 (network · auth · cold start · region) 호스팅 종속도 같이 늡니다.\n\n알림 누락은 별개 문제로 보였지만 같은 원인이었습니다 — cron route 가 `admin_notifications` insert 까지만 하고, 실제 이메일 발송은 별도 endpoint 로 분리되어 있었습니다. cron route 가 \"발행 결과 → DB insert → admin 페이지로\" 만 흘려보냈고, \"즉시 이메일\" 은 admin 페이지에서 trigger 해야 했습니다. 결과적으로 자동화의 \"끝 단\" 이 \"사람이 페이지를 열어야 보이는\" 비동기로 끊겨 있었습니다.",
      en: "Vercel cron was the original choice because it was the host's built-in feature — fastest way to ship. But as the domain grew (scheduled publish + trash purge + future periodic tasks), **\"this site's periodic work\" became increasingly coupled to the DB rather than the host**. The cron route's actual job was \"send one SQL UPDATE to Supabase and INSERT the result into the same Supabase\" — and Vercel cron + a Next.js route sat in the middle. Each mediating layer adds new failure points (network · auth · cold start · region) and tightens host coupling.\n\nThe missed-notification problem looked separate but shared the same root: cron routes only INSERTed into `admin_notifications`; the actual email send was its own endpoint. The chain was \"publish → INSERT → admin page\" — \"send the email right now\" was something the admin page had to trigger. So the automation's *final step* (the part that actually pushed information to a human) was an async break that required someone opening the page.",
    },
    solution: {
      ko: "**Supabase pg_cron + pg_net + Vault 로 전부 DB 안에서 처리** 하도록 옮겼습니다. 변경 후 구조:\n\n1. **`publish_scheduled()` SQL function** — 기존 RPC 를 확장해 발행 + `admin_notifications` insert + Resend 이메일 발송까지 한 트랜잭션에서 처리. 매분 `pg_cron` 이 호출. 이메일 본문은 발행된 게시물/작품 목록을 `<ul>` 로 묶어 보냄.\n\n2. **`purge_trash_scheduled()` SQL function** — `purge_after` 지난 posts/works hard delete + 알림 + 이메일. 매일 UTC 18:00 (= KST 03:00) `pg_cron` 호출.\n\n3. **`_get_vault_secret(name)` + `_send_admin_email(subject, html)` 유틸** — Vault 에 등록된 `resend_api_key` / `admin_email` / `notify_from` 을 읽어 `pg_net.http_post` 로 Resend API 호출. Vault 비어 있으면 NULL 반환 → email step 만 skip, DB 본 작업은 계속 진행. **fail-soft** — 이메일 발송 실패는 DB 트랜잭션을 망가뜨리지 않음.\n\n```sql\nCREATE OR REPLACE FUNCTION _send_admin_email(subject text, html text)\nRETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$\nDECLARE\n  api_key text := _get_vault_secret('resend_api_key');\n  to_email text := _get_vault_secret('admin_email');\n  from_email text := _get_vault_secret('notify_from');\nBEGIN\n  IF api_key IS NULL OR to_email IS NULL OR from_email IS NULL THEN RETURN; END IF;\n  PERFORM net.http_post(\n    url := 'https://api.resend.com/emails',\n    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),\n    body := jsonb_build_object('from', from_email, 'to', to_email, 'subject', subject, 'html', html)::text\n  );\nEXCEPTION WHEN OTHERS THEN NULL;\nEND;\n$$;\n```\n\n4. **`pg_cron` 등록** — `cron.schedule()` 로 두 job 등록, `cron.unschedule()` 재실행 안전 가드.\n\n```sql\nSELECT cron.schedule('publish-scheduled',     '* * * * *', $$SELECT publish_scheduled();$$);\nSELECT cron.schedule('purge-trash-scheduled', '0 18 * * *', $$SELECT purge_trash_scheduled();$$);\n```\n\n5. **Vercel cron route 제거** — `/api/cron/publish-scheduled` · `/api/cron/purge-trash` 삭제, `vercel.json` 의 cron 블록도 제거. Next.js 앱은 이제 cron 책임이 없음.\n\n결과 — 호스팅 의존 0, 알림이 \"발행/삭제와 동일 트랜잭션\" 안에서 이메일까지 도달. Vault 미설정 환경에서도 DB 작업은 동일하게 동작하므로 onboarding 마찰도 없음.",
      en: "**Moved everything inside the DB using Supabase pg_cron + pg_net + Vault.** The new shape:\n\n1. **`publish_scheduled()` SQL function** — Extends the previous RPC to do the flip + `admin_notifications` insert + Resend email in one transaction. Called every minute by `pg_cron`. The email lists each published post/work as a `<ul>`.\n\n2. **`purge_trash_scheduled()` SQL function** — Hard-deletes `purge_after`-past posts/works + notifications + email. Called by `pg_cron` daily at UTC 18:00 (= KST 03:00).\n\n3. **`_get_vault_secret(name)` + `_send_admin_email(subject, html)` helpers** — Read Vault-registered `resend_api_key` / `admin_email` / `notify_from` and call Resend through `pg_net.http_post`. Empty Vault returns NULL → only the email step is skipped; the DB work continues. **Fail-soft** — email delivery failures never tear down the DB transaction.\n\n```sql\nCREATE OR REPLACE FUNCTION _send_admin_email(subject text, html text)\nRETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$\nDECLARE\n  api_key text := _get_vault_secret('resend_api_key');\n  to_email text := _get_vault_secret('admin_email');\n  from_email text := _get_vault_secret('notify_from');\nBEGIN\n  IF api_key IS NULL OR to_email IS NULL OR from_email IS NULL THEN RETURN; END IF;\n  PERFORM net.http_post(\n    url := 'https://api.resend.com/emails',\n    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),\n    body := jsonb_build_object('from', from_email, 'to', to_email, 'subject', subject, 'html', html)::text\n  );\nEXCEPTION WHEN OTHERS THEN NULL;\nEND;\n$$;\n```\n\n4. **Register pg_cron jobs** — `cron.schedule()` for both, with `cron.unschedule()` as a re-run-safe guard.\n\n```sql\nSELECT cron.schedule('publish-scheduled',     '* * * * *', $$SELECT publish_scheduled();$$);\nSELECT cron.schedule('purge-trash-scheduled', '0 18 * * *', $$SELECT purge_trash_scheduled();$$);\n```\n\n5. **Removed Vercel cron routes** — Deleted `/api/cron/publish-scheduled` and `/api/cron/purge-trash`, dropped the cron block from `vercel.json`. The Next.js app no longer owns cron.\n\nResult — zero host dependency, and notifications now reach email in the same transaction as the publish/purge. Vault-less environments still run the DB work identically, so there's no onboarding friction.",
    },
    keyInsight: {
      ko: "**\"호스팅 기본 기능으로 빠르게 시작\" 은 시작 전략이지 최종 구조가 아니다.** Vercel cron 은 빠른 첫 구현으로는 옳았지만, 정기 작업이 점점 DB 와 결합되면서 \"중간에 호스팅 cron + Next.js route 가 매개하는 구조\" 자체가 부채가 됐습니다. **데이터 작업은 데이터가 있는 곳에서, 호스팅 의존을 최소화** — Supabase 의 pg_cron + pg_net + Vault 가 그 답이었습니다.\n\n같은 원칙이 알림 발송에도 적용됐습니다. \"DB 변경 → 같은 DB 의 트랜잭션 안에서 알림 발송\" 으로 묶으면, 변경 이벤트와 알림 사이에 \"사람이 페이지를 열어야 한다\" 같은 비동기 끊김이 사라집니다. `pg_net` 으로 PostgreSQL 자체에서 HTTP 호출이 가능해진 게 결정적이었고, Vault 가 secret 관리까지 같은 위치에 두는 걸 가능하게 했습니다.\n\n**fail-soft 설계도 명시적이어야 합니다.** Vault 미등록 → 이메일 skip + DB 작업은 계속, 이메일 발송 실패 → 예외 무시 + DB 작업은 정상 — 둘 다 \"부수 효과의 실패가 본 작업을 망치지 않는다\" 원칙입니다. cron job 이 새벽에 돌다 이메일 외부 API 가 일시 장애로 실패해서 휴지통 정리 트랜잭션 전체가 롤백된다면, 다음날 다시 \"왜 어제 정리가 안 됐지?\" 가 됩니다. 정기 작업의 본 작업은 \"한 번 더 시도하면 보정 가능\" 한 idempotent 한 무언가이고, 알림은 \"있으면 좋지만 없어도 본 작업의 무결성에는 영향 없음\" 으로 명시적으로 분리해야 시스템이 자가 회복합니다.\n\n구현 측면에선 — `pg_cron` 의 `cron.schedule()` 은 같은 jobname 으로 두 번 호출하면 에러를 던지므로 setup.sql 같이 재실행되는 파일에서는 반드시 `cron.unschedule()` 을 `DO $$ ... EXCEPTION WHEN OTHERS THEN NULL; END $$;` 로 감싸 idempotent 하게 만들어야 합니다. 작은 디테일이지만 이게 빠지면 setup.sql 두 번째 실행에서 멈춥니다.",
      en: "**\"Start with the host's built-in feature\" is a launch strategy, not a final architecture.** Vercel cron was the right first step, but as periodic work coupled tighter to the DB, the \"host cron + Next.js route in the middle\" structure became debt. **Data work belongs where the data lives, with as little host dependency as possible** — Supabase's pg_cron + pg_net + Vault made that achievable.\n\nThe same principle applies to notifications. Wrapping \"DB change → notification in the same transaction\" removes the async break (\"someone has to open the page\") between the event and the alert. The unlock was `pg_net` — Postgres can now make HTTP calls itself — paired with Vault so secrets live in the same place.\n\n**Fail-soft has to be explicit.** Vault not configured → email skipped, DB work continues; email API down → exception swallowed, DB work continues. Both reflect the same rule: a side-effect failure must not corrupt the main task. If an overnight cron job rolled back a whole trash-purge transaction because the email API blipped, the next day's \"why didn't yesterday clean up?\" investigation is on me. The main task should be idempotent (\"retrying it just works\"); notifications are \"nice to have, never load-bearing for correctness\" — and the split needs to be explicit so the system self-heals.\n\nImplementation gotcha — `pg_cron`'s `cron.schedule()` errors when the same `jobname` is re-registered. For a re-runnable `setup.sql`, wrap `cron.unschedule()` in `DO $$ ... EXCEPTION WHEN OTHERS THEN NULL; END $$;` to make the call idempotent. Small detail, but missing it makes the second run of `setup.sql` stop dead.",
    },
    tags: ["pg_cron", "pg_net", "supabase", "vault", "resend", "automation", "scheduled-publish", "purge", "cron", "vercel"],
  },

  /* ── CSS Module orphan classes — 렌더링을 layout 으로 옮길 때 ── */
  {
    section: { ko: "Layout & CSS", en: "Layout & CSS" },
    problem: {
      ko: "페이지 보일러플레이트를 layout 으로 흡수 후, 일부 영역 (footer 링크) 의 스타일이 통째로 사라짐 — 오류는 없음",
      en: "After absorbing page boilerplate into the shared layout, one area (the footer link) lost all styling — no error",
    },
    definition: {
      ko: "포스트 / 작품 detail 페이지마다 거의 동일하게 반복되던 LikeButton / AdjacentNav / CommentSection / 하단 back-to-list 링크 / 관련 콘텐츠를 `DetailLayout` 의 config props (`likeConfig`, `adjacentConfig`, `commentsConfig`, `backLink`, `relatedContent`) 로 흡수했습니다. 페이지는 데이터만 넘기면 layout 이 순서·렌더링을 책임지는 슬롯 구조입니다.\n\n그런데 push 후 사용자가 \"하단 '전체 작품 보기' 링크가 줄바꿈되고 hover 색도 안 바뀐다\" 고 보고했습니다. 화면을 보니 정말로 ArrowLeft 아이콘과 \"전체 작품 보기\" 텍스트가 줄바꿈된 채 무미건조한 default 스타일로 렌더되고 있었습니다. 콘솔에는 에러 없음, TypeScript 도 정상, 빌드 통과.\n\n```html\n<!-- 렌더된 결과 — class 가 통째로 빠짐 -->\n<div><a href=\"/works\">\n  <svg ...></svg>\n  <span><span>전체 작품 보기</span></span>\n</a></div>\n```",
      en: "The post / work detail pages repeated the same boilerplate (LikeButton / AdjacentNav / CommentSection / bottom \"back to list\" link / related content) almost identically. I absorbed them into `DetailLayout` as config props (`likeConfig`, `adjacentConfig`, `commentsConfig`, `backLink`, `relatedContent`) — pages pass data, layout owns the rendering and order.\n\nAfter pushing, a user reported \"the bottom 'View all works' link wraps onto two lines and the hover color doesn't change\". Sure enough, the ArrowLeft icon and the \"View all works\" text wrapped and rendered with default browser styling. No console error, no TypeScript complaint, build green.\n\n```html\n<!-- Rendered output — class attribute completely missing -->\n<div><a href=\"/works\">\n  <svg ...></svg>\n  <span><span>View all works</span></span>\n</a></div>\n```",
    },
    cause: {
      ko: "원인을 보는 데 한참 걸렸습니다. JSX 는 분명히 `<div className={styles.footerNav}>` 로 작성돼 있는데, 렌더된 HTML 엔 `class` 속성 자체가 없었습니다.\n\n`styles.footerNav` 가 **`undefined`** 였기 때문입니다.\n\n원래 `.footerNav` / `.footerLink` / `.footerArrow` CSS 클래스는 `WorkDetail.module.css` 와 `PostDetail.module.css` (각 페이지의 CSS Module) 에만 정의돼 있었습니다. 그 page 가 직접 footer link 를 렌더할 땐 page 의 `styles` 가 import 된 module 이라 해당 클래스가 존재했고, 정상 동작했습니다.\n\nRefactor 후 footer link 의 **렌더 책임을 `DetailLayout` 으로 옮긴 순간**, `DetailLayout` 안의 `styles` 는 `DetailLayout.module.css` 를 import 한 것이라 `.footerNav` 가 존재하지 않습니다. CSS Module 에서 정의되지 않은 클래스를 dot 접근하면 → `undefined`. React 는 `className={undefined}` 을 \"className 속성을 렌더하지 않는다\" 로 해석해서 **속성 자체를 빼 버립니다**. 에러는 안 납니다 — 단지 스타일이 안 먹을 뿐.\n\n이게 위험한 이유는 **silent failure** 라는 점입니다. JSX 와 CSS 가 다른 파일에 있고, CSS Module 은 \"정의돼 있어야 한다\" 는 컴파일 타임 검증이 없기 때문에 typo / 누락 / 잘못된 모듈 reference 가 다 똑같이 `undefined` 로 흘러갑니다. 페이지 보일러플레이트 추출 / shared component 분리 같은 큰 리팩토링에서 특히 흔한 함정입니다 — 옮긴 element 의 className 은 봤지만 그게 가리키는 CSS 가 어느 module 에 살고 있는지는 안 봤기 때문에.",
      en: "Took me a while to see it. The JSX clearly read `<div className={styles.footerNav}>`, yet the rendered HTML had no `class` attribute at all.\n\n`styles.footerNav` was **`undefined`**.\n\nThe `.footerNav` / `.footerLink` / `.footerArrow` CSS classes were defined only in `WorkDetail.module.css` and `PostDetail.module.css` (each page's own CSS Module). When the page rendered the footer link itself, its `styles` was the imported page module — the class existed and everything worked.\n\nThe moment I moved the footer link's **rendering responsibility into `DetailLayout`**, `styles` inside `DetailLayout` referred to `DetailLayout.module.css` — which never had `.footerNav`. Accessing an undefined class on a CSS Module gives you `undefined`. React treats `className={undefined}` as \"don't emit a className attribute\" and **drops it silently**. No error — just no styling.\n\nWhat makes this dangerous is the **silent failure**. JSX and CSS live in different files, CSS Modules have no compile-time check that a class exists, so typos / missing definitions / wrong-module references all collapse into the same `undefined`. It's an especially common trap when extracting page boilerplate into a shared component — you see the JSX that moved, but you don't think to check which module its `styles.foo` resolves against in the new home.",
    },
    solution: {
      ko: "두 가지를 같이 했습니다.\n\n**(1) CSS 클래스를 layout module 로 동행 이전** — `.footerNav` / `.footerLink` / `.footerArrow` / `.commentWrap` 정의를 page CSS module 에서 `DetailLayout.module.css` 로 옮겼습니다. 이제 `DetailLayout` 의 `styles.footerNav` 가 valid 클래스를 가리킵니다.\n\n또한 같은 김에 `<a>` 가 줄바꿈되지 않도록 `white-space: nowrap` 을 추가, ArrowLeft 아이콘이 안 줄어들도록 `.footerArrow { flex-shrink: 0 }` 도 같이.\n\n```css\n/* DetailLayout.module.css 에 신규 정의 */\n.footerLink {\n  display: inline-flex;\n  align-items: center;\n  gap: var(--spacing-xs);\n  ...\n  white-space: nowrap;  /* refactor 과정에서 발견한 줄바꿈 이슈도 같이 */\n}\n.footerArrow { flex-shrink: 0; }\n```\n\n**(2) Page module 의 orphan 정의 제거 예정 메모** — 같은 PR 에서 page CSS module 의 해당 클래스 정의는 더 이상 참조되지 않는 dead code 가 됐습니다. 다음 청소 PR 에서 제거.\n\n근본 방지책으로 짧게 검토한 옵션들:\n\n- **TypeScript Module Resolution for CSS Modules** (`typescript-plugin-css-modules` 등) — `styles.foo` 가 module 에 없으면 TS 에러로 잡힘. setup 비용은 약간 있지만 silent failure 를 컴파일 타임으로 격상 가능.\n- **css-modules-typescript-loader** 같은 빌드 단계 generation — `.d.ts` 자동 생성으로 IDE 자동완성 + 누락 시 빨간 줄.\n- **별다른 lint 없이 PR review 강화** — refactor 시 \"옮긴 element 의 className 이 새 module 에 존재하는가\" 를 명시적 체크리스트 항목으로.\n\n현재 프로젝트엔 첫 두 옵션을 도입하지 않았으므로 (작은 codebase + 단독 작업이라 ROI 가 약함), 대신 \"shared component 로 옮길 때 CSS 도 같이 옮긴다\" 를 PR 자체 checklist 로 두는 정도로 마감했습니다.",
      en: "Did two things together.\n\n**(1) Move the CSS classes into the layout module alongside the rendering** — Relocated `.footerNav` / `.footerLink` / `.footerArrow` / `.commentWrap` from the page CSS modules into `DetailLayout.module.css`. Now `DetailLayout`'s `styles.footerNav` resolves to a real class.\n\nWhile in there, added `white-space: nowrap` to keep the `<a>` from wrapping, and `flex-shrink: 0` on `.footerArrow` so the icon doesn't shrink:\n\n```css\n/* New definitions in DetailLayout.module.css */\n.footerLink {\n  display: inline-flex;\n  align-items: center;\n  gap: var(--spacing-xs);\n  ...\n  white-space: nowrap;  /* fix the wrapping issue found during refactor */\n}\n.footerArrow { flex-shrink: 0; }\n```\n\n**(2) Note the orphan definitions in the page modules** — Same PR: the `.footerNav` / `.footerLink` / `.footerArrow` / `.commentWrap` in `WorkDetail.module.css` / `PostDetail.module.css` are no longer referenced. Marked for a follow-up cleanup PR.\n\nOptions I considered for preventing the silent failure long-term:\n\n- **TypeScript Module Resolution for CSS Modules** (e.g. `typescript-plugin-css-modules`) — `styles.foo` becomes a TS error when the class isn't in the module. Some setup cost, but it promotes the silent failure to compile time.\n- **Build-step `.d.ts` generation** (e.g. `css-modules-typescript-loader`) — IDE autocomplete and red squiggles when a class is missing.\n- **No extra tooling, but explicit PR review item** — \"any element whose `className={styles.X}` moved must verify `styles.X` exists in the destination module\".\n\nFor this codebase (small, solo) the first two felt like overkill ROI-wise, so I left it at a PR checklist item: \"when extracting into a shared component, move the CSS with it\".",
    },
    keyInsight: {
      ko: "**CSS Module 의 dot 접근은 \"없으면 undefined\" — 그리고 React 는 undefined className 을 조용히 무시한다.** 두 사실이 합쳐지면 \"옮긴 element 가 새 위치에서 어떤 module 의 어떤 클래스를 가리키는지\" 를 안 보면 통째로 스타일 없이 렌더됩니다. 에러도, warning 도 없습니다.\n\n이 함정은 특히 **shared component / layout 으로의 추출 리팩토링** 에서 자주 등장합니다. 추출의 본질은 \"renders here, was rendered there\" 로 렌더 책임을 옮기는 것인데, **className 의 module reference 도 같이 옮겨가야 한다는 사실** 이 잘 잊혀집니다. JSX 위에 `import styles from \"...\"` 가 떨어진 위치에 있고, refactor 는 보통 JSX 만 보기 때문입니다.\n\n실용적 체크리스트로 정리하면:\n\n1. **shared component 로 element 를 옮길 때** — 옮긴 element 의 `className={styles.X}` 가 새 component 의 module 에 존재하는지 (`styles` 가 가리키는 그 module 에) grep 으로 확인. 없으면 같이 옮기거나, 새로 정의하거나, prop 으로 받아오게.\n2. **새 element 를 새 위치에 만들 때** — `className={styles.newClass}` 작성 시 동시에 CSS 도 정의. \"JSX 만 쓰고 CSS 는 나중에\" 라는 mid-refactor 상태는 silent broken 의 온상.\n3. **추출된 component 의 review 시** — 새 component 가 dropping in 하는 class 들이 자기 module 에 다 있는지 한 번 grep.\n\n근본 방지책은 **CSS Modules 의 TS plugin 도입** — `styles.X` 가 module 에 없으면 컴파일 에러로 잡혀 silent failure 가 사라집니다. 단독 작업 / 소규모 codebase 에서는 PR checklist 로 충분히 잡히지만, 팀 작업으로 가면 가급적 tooling 으로 격상하는 것이 안전합니다.\n\n더 일반화하면 — **\"silent failure 의 가능성을 컴파일 타임으로 격상하는 도구는 거의 항상 그만한 가치가 있다.\"** undefined className 외에도 \"존재하지 않는 i18n 키\", \"존재하지 않는 route\", \"존재하지 않는 env var\" 등 비슷한 silent failure 들이 modern app 에 도처에 있고, 이런 류 함정을 compile-time 으로 끌어올리는 코스트는 한 번 들이면 영구히 회수됩니다.",
      en: "**Dot access on a CSS Module is \"undefined if absent\" — and React silently drops `className={undefined}`.** Combine the two and \"which module does the moved element's `styles.X` resolve against now?\" silently determines whether the element gets any style at all. No error, no warning.\n\nThis trap is most common in **extract-into-shared-component refactors**. The whole point of extraction is moving render responsibility from \"there\" to \"here\" — but the fact that **the className's module reference has to move with it** is easy to forget. `import styles from \"...\"` sits at the top of the file; refactor usually focuses on the JSX only.\n\nA practical checklist:\n\n1. **When moving an element into a shared component** — grep the destination module for every `styles.X` the moved element references. If missing, move the CSS too, redefine it, or accept it as a prop.\n2. **When creating new elements in a new location** — write the `className={styles.newClass}` and the CSS definition together. \"JSX now, CSS later\" is a fertile mid-refactor state for silently broken styles.\n3. **When reviewing an extracted component** — grep that every `styles.X` it now uses exists in its module.\n\nThe long-term fix is **a TypeScript plugin for CSS Modules** — `styles.X` becomes a compile error when missing, and the silent failure disappears. For solo / small projects a PR checklist usually catches it, but team work benefits from promoting it to tooling.\n\nMore broadly — **\"any tooling that promotes a silent failure to a compile-time error is almost always worth it.\"** Beyond undefined className, modern apps have many similar silent failures (undefined i18n keys, missing routes, missing env vars). The cost of promoting them is paid once; the benefit accrues forever.",
    },
    tags: ["css-module", "react", "refactor", "shared-component", "silent-failure", "DetailLayout", "tooling"],
  },

  /* ── TSX parser — `!` non-null assertion 이 JSX close tag 로 오해석 ── */
  {
    section: { ko: "Component System", en: "Component System" },
    problem: {
      ko: "TSX 안에서 `typeof obj!.field[index]` 처럼 non-null assertion 을 인덱스 표현 안에 쓰면 JSX parser 가 닫는 태그로 오해석",
      en: "TSX parser misreads `typeof obj!.field[index]` — the `!` non-null assertion gets parsed as a JSX close tag",
    },
    definition: {
      ko: "팀원 카드 컴포넌트의 render helper 함수 시그니처에서 멤버 타입을 적기 위해 `typeof project.teamMembers![number]` 라고 작성했습니다 (project.teamMembers 가 optional 이라 `!` 로 non-null 단언, 거기서 `[number]` 인덱스로 element type 추출).\n\nTS 표현으로는 정상이고 .ts 파일에서는 컴파일 에러가 안 납니다. 그런데 **.tsx 파일에서 같은 표현을 쓰면 다음 에러가 떨어졌습니다:**\n\n```\nError: JSX element 'teamMembers' has no corresponding closing tag.\nError: Identifier expected.\n```\n\n분명히 type expression 이지 JSX 가 아닌데도 JSX parser 가 끼어들었습니다.",
      en: "In a render-helper function signature for a team member card, I wrote `typeof project.teamMembers![number]` (`project.teamMembers` is optional, the `!` asserts non-null, then `[number]` indexes the element type).\n\nThe expression is valid TypeScript and a `.ts` file accepts it without complaint. But in a **`.tsx` file the same expression failed with:**\n\n```\nError: JSX element 'teamMembers' has no corresponding closing tag.\nError: Identifier expected.\n```\n\nNo JSX in sight — it's clearly a type expression — but the JSX parser jumped in anyway.",
    },
    cause: {
      ko: "TSX parser 는 `<` 토큰을 만나면 \"generic type argument\" 와 \"JSX element\" 중 무엇인지를 lookahead 로 결정해야 합니다. `typeof project.teamMembers!` 까지 본 시점에서, 다음 토큰이 `[number]` 의 `[` 가 아니라 ... 잠깐. 이건 다른 문제입니다.\n\n실제 원인은 더 미묘했습니다. 표현 컨텍스트는 generic type instantiation 였고 (`renderCard<typeof project.teamMembers![number]>` 같은 호출), parser 가 generic args 닫는 `>` 를 찾아가는 동안 `!` 의 위치에서 \"이건 JSX 의 fragment closing 일지도 모른다 (`</>`)\" 라고 잠깐 의심하면서 lookahead 에 실패한 사례였습니다.\n\n더 명확하게 reproducing 한 후 발견한 패턴: **TSX 에서 `<` 가 등장한 위치 다음으로 `!` 가 같은 expression chain 안에 있으면 parser 가 종종 헷갈립니다**. 같은 expression 을 `.ts` 로 옮기면 100% 통과하고, `.tsx` 로 옮기면 80% 정도 실패. parser 의 휴리스틱 차이입니다.\n\nTypeScript 측에선 이미 known issue — `<T>` (generic) 와 `<Component>` (JSX) 모호성은 TSX 에서 영원한 함정이고, non-null `!` 가 그 lookahead 를 한 단계 더 꼬는 사례입니다.",
      en: "When TSX parser sees a `<`, it has to disambiguate between \"generic type argument\" and \"JSX element\" via lookahead. By the time it had parsed `typeof project.teamMembers!`, the next token was `[` of `[number]` — wait, that's not quite it.\n\nThe real cause was subtler. The expression sat in a generic-instantiation context (something like `renderCard<typeof project.teamMembers![number]>`), and while scanning forward for the closing `>` of the generic args, the parser briefly considered \"could this `!` be a JSX fragment close (`</>`)?\" and failed its lookahead.\n\nThe pattern, once I could reproduce cleanly: **in TSX, if `!` appears in the same expression chain after a `<`, the parser gets confused often**. The same expression moves to `.ts` and passes 100% of the time; in `.tsx` it fails ~80% of the time. Parser heuristic difference.\n\nFrom the TypeScript side this is a known disambiguation issue — `<T>` (generic) vs `<Component>` (JSX) is the perennial TSX trap, and non-null `!` is one more variable that perturbs the lookahead.",
    },
    solution: {
      ko: "**Type 표현을 local const 로 분리** 했습니다. 한 줄로 압축된 generic instantiation 안에 모든 게 들어가지 않게, 멤버 변수와 element type 을 미리 풀어 둡니다.\n\n```tsx\n// 변경 전 — TSX parser 가 헷갈림\nfunction renderCard(member: typeof project.teamMembers![number], i: number) { ... }\n\n// 변경 후 — local 변수로 expression 단계 분리\nconst members = project.teamMembers ?? [];\nfunction renderCard(member: typeof members[number], i: number) { ... }\n```\n\nElement type 의 `typeof members[number]` 는 `<` 가 없으므로 parser 가 의심할 여지가 없습니다. 동시에 `!` non-null 단언도 `?? []` fallback 으로 더 명시적인 처리로 바뀌어, runtime 안전성도 같이 올라갔습니다.\n\n검토했던 다른 해결책:\n\n- **`.tsx` → `.ts` 로 파일 분리** — 컴포넌트 코드를 `.tsx`, type-only helper 를 `.ts` 로 나누면 같은 표현이 통과. 단점은 한 컴포넌트의 helper 가 두 파일로 쪼개진다는 점.\n- **`as` 어서션 사용** — `(project.teamMembers as NonNullable<typeof project.teamMembers>)[number]` 처럼 `!` 대신 `as NonNullable<...>` 사용. 표현이 길어지고 TSX 안에서 또 다른 lookahead 함정이 있을 수 있어 별로.\n- **Generic context 회피** — 함수 시그니처에서 element type 을 inline 하지 말고 별도 type alias 로 추출 (`type Member = typeof project.teamMembers[number]`). 사실상 local const 분리와 본질은 같음.\n\nLocal const 분리가 가장 간결하고 runtime 안전성까지 동시 개선되어 채택했습니다.",
      en: "**Lifted the type expression into a local const.** Don't compress everything into one generic-instantiation line — extract the member array and let the element type be derived from a simple identifier.\n\n```tsx\n// Before — TSX parser confused\nfunction renderCard(member: typeof project.teamMembers![number], i: number) { ... }\n\n// After — local var breaks the expression into two stages\nconst members = project.teamMembers ?? [];\nfunction renderCard(member: typeof members[number], i: number) { ... }\n```\n\n`typeof members[number]` has no `<`, so the parser has nothing to second-guess. As a bonus the `!` non-null assertion turned into an explicit `?? []` fallback, improving runtime safety too.\n\nOther options I considered:\n\n- **Split `.tsx` and `.ts`** — keep components in `.tsx` and type-only helpers in `.ts`; the same expression passes there. Cost: a single component's helper gets split across two files.\n- **Use `as` instead of `!`** — `(project.teamMembers as NonNullable<typeof project.teamMembers>)[number]`. Verbose, and `as` inside TSX has its own lookahead pitfalls.\n- **Hoist the element type into a type alias** — `type Member = typeof project.teamMembers[number]`. Essentially the same idea as the local const split.\n\nThe local-const fix was the smallest one and improved runtime safety at the same time, so I went with it.",
    },
    keyInsight: {
      ko: "**TSX 의 parser 는 `<` 와 `!` / `as` 조합 lookahead 에서 종종 진다.** `<T>` (generic) 와 `<Component>` (JSX) 의 모호성은 TSX 의 영원한 함정이고, non-null `!` 나 `as` 어서션이 그 lookahead 를 한 단계 더 꼬는 경우가 많습니다. 에러 메시지는 \"JSX element X has no closing tag\" 처럼 엉뚱한 곳을 가리켜서 첫 진단이 빗나가기 쉽습니다.\n\n실용적인 회피 패턴:\n\n1. **복잡한 type 표현은 local const / type alias 로 한 단계 분리** — 한 줄 안에 generic + `!` + index + `<` 가 다 들어가지 않게. 진단도 쉽고 가독성도 좋아짐.\n2. **TS 표현 위주의 helper 는 `.ts` 로** — JSX 가 필요 없는 type utilities 는 `.ts` 가 parser 가 더 관대함. 컴포넌트 파일에서는 type-only 코드를 최소로.\n3. **`!` 대신 narrow 한 fallback** — `?? []` / `?? null` 같은 명시적 fallback 은 TSX parser 에도 안전하고 runtime safety 도 같이 가져옴.\n\n근본적으로는 **parser 휴리스틱에 의존하는 코드를 피하는 게 가장 안전** 합니다. \"이게 generic 인지 JSX 인지\" 를 사람이 봐도 살짝 헷갈리는 표현이라면 parser 도 헷갈릴 가능성이 높고, lookahead 가 깊어질수록 컴파일러 버전 / TSX 옵션 변화에 취약해집니다. 단순한 형태로 미리 풀어 두는 것이 결국 가장 cheap 한 안전망입니다.\n\n그리고 한 가지 더 — **에러 메시지가 \"JSX element X has no closing tag\" 처럼 JSX 를 가리키지만 실제 코드에 JSX 가 없을 때** 는 거의 항상 \"non-JSX 표현을 parser 가 JSX 로 오해석\" 입니다. 첫 가설을 \"내가 JSX 를 잘못 썼나?\" 가 아니라 \"parser 가 헷갈렸나?\" 로 두면 디버깅이 한참 빨라집니다.",
      en: "**TSX's parser sometimes loses the lookahead between `<` and `!` / `as`.** The `<T>` (generic) vs `<Component>` (JSX) ambiguity is a permanent TSX trap, and non-null `!` or `as` assertions perturb that lookahead in unhelpful ways. The error usually points somewhere irrelevant (\"JSX element X has no closing tag\"), which sends the first diagnosis sideways.\n\nPractical patterns to avoid it:\n\n1. **Lift complex type expressions into a local const / type alias** — don't stuff generic + `!` + index + `<` into a single line. Easier to read and easier to debug.\n2. **Put type-heavy helpers in `.ts`, not `.tsx`** — when there's no JSX, the `.ts` parser is more permissive. Keep type-only code out of component files when possible.\n3. **Prefer narrow fallbacks over `!`** — `?? []` / `?? null` are unambiguous for the TSX parser and improve runtime safety too.\n\nThe deeper principle: **avoid code that relies on parser heuristics**. If \"is this generic or JSX?\" is even slightly ambiguous to a human reader, the parser is likely to struggle too, and deeper lookaheads make you more fragile to compiler version / TSX option changes. Decomposing into simpler forms is the cheapest long-term safety net.\n\nOne more — **when an error reads \"JSX element X has no closing tag\" but your code has no JSX at all**, the cause is almost always \"parser mis-categorized a non-JSX expression as JSX\". Starting your hypothesis there (\"did the parser get confused?\") instead of \"did I write bad JSX?\" saves a lot of time.",
    },
    tags: ["typescript", "tsx", "parser", "jsx", "non-null-assertion", "type-expression", "refactor"],
  },

  /* ── textarea 글자별 inline highlight — mirror sync 한계 + contenteditable 전환 ── */
  {
    section: { ko: "Component System", en: "Component System" },
    problem: {
      ko: "textarea 의 초과 글자만 background highlight 주려는데 어떤 방법으로도 정확히 안 맞음 — 결국 native textarea 포기하고 contenteditable 로 전환",
      en: "Wanted per-character background highlight inside a textarea — no overlay technique aligned perfectly, ended up replacing the native textarea with contenteditable",
    },
    definition: {
      ko: "editor 의 excerpt / description 필드에 \"권장 글자수 초과 portion 만 빨갛게\" highlight 를 넣고 싶었습니다. 단순한 시각적 cue 인데, 막상 구현해보니 **native `<textarea>` 의 근본 한계 — 글자 일부분만 styling 불가능** 에 부딪쳤습니다. textarea 안의 텍스트는 단일 stream 으로 렌더되고 `::first-letter`, `::selection` 외엔 부분 styling 이 안 됩니다. \"201자부터 빨강\" 같은 건 native 로 표현 자체가 안 됩니다.",
      en: "Wanted to highlight the over-limit portion of an excerpt/description textarea (the chars past the recommended limit, in accent color). Simple cue conceptually — but it hit the **fundamental limitation of native `<textarea>`: you cannot style portions of the text**. Textarea content renders as one uniform stream; aside from `::first-letter` and `::selection`, no partial styling is possible. \"Chars 201+ should be red\" simply cannot be expressed natively.",
    },
    cause: {
      ko: "native 한계가 명확하니 우회로 — **invisible mirror `<div>` overlay 패턴** 을 시도했습니다. textarea 와 같은 폰트·padding·border 의 div 를 뒤에 깔고, div 안에선 `<mark>` 같은 inline element 로 자유롭게 styling. textarea text 는 `color: transparent` 로 가리고 mirror text 가 user 가 실제로 보는 텍스트. caret / selection 은 native textarea 가 처리.\n\n이론적으로 깔끔한 패턴 — 실제로 4가지 불일치가 누적적으로 발생했습니다:\n\n**(1) line-height 미세 차이** — textarea 는 user-agent stylesheet 가 자체 line-height 적용 (보통 `normal` ≈ 1.4–1.5), div 는 inherit 된 컨텍스트 따름. 같은 \"1.5\" 로 명시해도 sub-pixel 단위에서 어긋남.\n\n**(2) scrollbar gutter** — textarea overflow 시 scrollbar 가 차지하는 space (`8–14px`) 만큼 content area 가 좁아짐 → wrap 위치 다름. mirror 는 `scrollbar-width: none` 이라 더 넓은 content area. `scrollbar-gutter: stable` 로 양쪽 정렬 시도했지만 mirror 에 `scrollbar-width: none` 있으면 gutter reserve 안 됨 (spec).\n\n**(3) overscroll bounce (macOS rubber band)** — 가장 결정적. user 가 textarea 끝까지 스크롤한 뒤 더 끌면 텍스트가 visually 더 밀림 (rubber-band 효과). 이때 textarea 의 `scrollTop` 값은 안 변함 → `onScroll` 도 fire 안 함 → mirror 와 sync 깨짐. `overscroll-behavior: none` 으로 차단 시도했지만 Safari 의 OS-level bounce 는 완전 제어 불가.\n\n**(4) IME composition** — 한글 조합 중인 글자 (\"ㄱ\", \"가\", \"각\" 같이 변화하는 composing state) 는 textarea 에서만 보이고 mirror 에는 안 들어감. 조합 중 mismatch 발생.\n\n각 항목마다 fix 시도 — line-height 명시, scrollbar-gutter, overscroll-behavior, composition event suppress — 모두 일부만 효과 있고 완벽히 안 맞는 케이스가 남았습니다. 가장 결정적이었던 건 (3) — OS 레벨 rubber-band 는 CSS 로 어떤 방법으로도 100% 차단 안 됩니다.",
      en: "Native textarea couldn't do it directly, so I tried the standard workaround: an **invisible mirror `<div>` overlay**. A div sits behind the textarea with matching font / padding / border; the div uses `<mark>` (or spans) for per-character styling. The textarea's text is `color: transparent` so the user sees the mirror; caret / selection still come from the textarea.\n\nClean in theory — in practice four misalignments piled up:\n\n**(1) Sub-pixel line-height drift** — textareas pick up the UA stylesheet's line-height (often `normal`, ≈1.4–1.5); divs inherit from the surrounding context. Even with an explicit `1.5` on both, sub-pixel differences appear.\n\n**(2) Scrollbar gutter mismatch** — when the textarea overflows, the scrollbar steals `8–14px` of content width, so its wrap differs from the mirror's. I added `scrollbar-gutter: stable` to align them, but `scrollbar-width: none` on the mirror means the gutter isn't reserved (spec behavior).\n\n**(3) Overscroll bounce (macOS rubber band)** — the decisive one. Once the textarea is scrolled to the end and the user keeps dragging, the text visually shifts (rubber-band) while `scrollTop` stays at max, so `onScroll` doesn't fire and the mirror falls behind. `overscroll-behavior: none` helps but doesn't fully suppress Safari's OS-level bounce.\n\n**(4) IME composition** — Korean composing chars (the partial \"ㄱ\" / \"가\" / \"각\" states) live inside the textarea but never reach `textContent`, so the mirror is out of sync during composition.\n\nEach fix attempt — explicit line-height, scrollbar-gutter, overscroll-behavior, composition-event suppression — solved part of one symptom while leaving the others. The killer was (3): OS-level rubber band cannot be fully blocked from CSS.",
    },
    solution: {
      ko: "**`<textarea>` 자체를 포기하고 `<div contenteditable=\"plaintext-only\">` 로 교체** 했습니다. div 는 inline element (`<mark>`) 가 자유롭게 들어갈 수 있어 \"부분 styling 불가능\" 이라는 근본 한계 자체가 사라집니다 — mirror overlay 라는 우회 자체가 불필요.\n\n핵심 동작:\n\n```tsx\n<div\n  contentEditable=\"plaintext-only\"  // paste 자동 plain text + Enter 자연스러운 \\n\n  onInput={(e) => onChange(e.currentTarget.textContent ?? \"\")}\n  onCompositionStart={() => { isComposingRef.current = true; }}\n  onCompositionEnd={(e) => {\n    isComposingRef.current = false;\n    onChange(e.currentTarget.textContent ?? \"\");\n  }}\n/>\n```\n\n**caret 보존** — value prop 이 외부에서 바뀌면 (e.g. React state 동기화) `useLayoutEffect` 가 caret 의 텍스트 offset 을 `getCaretOffset` 으로 저장 → `innerHTML` 재구성 (`buildHtml(value, maxHint)` 로 `<mark>` 감싸기) → `setCaretOffset` 으로 복원. 둘 다 `document.createTreeWalker` + `Range` API 로 text node 를 순회해 offset 위치 계산.\n\n**IME composition 안전** — `isComposingRef` 가 true 인 동안에는 `innerHTML` 재구성을 skip — 조합 중인 글자가 사라지거나 깨지는 것 방지. composition 끝나면 (`onCompositionEnd`) 동기화 재개.\n\n**plaintext-only 의 중요성** — 일반 `contentEditable=\"true\"` 는 paste 시 HTML 그대로 들어오고 (rich text 오염), Enter 가 brower 마다 `<div>` 또는 `<br>` 만드는 등 quirks 많음. `plaintext-only` 는 input 단계에서 모든 마크업 차단 + Enter = `\\n` 보장 → textarea 와 동일한 UX 를 div 로 재현.\n\n결과 — sync 이슈가 \"이슈 자체로 존재하지 않음\". user 가 보는 텍스트와 highlight 는 같은 element 의 같은 child node 라 어떤 OS-level bounce / scroll / IME 동작으로도 분리 불가능.",
      en: "**Dropped `<textarea>` entirely and switched to `<div contenteditable=\"plaintext-only\">`.** A div can hold inline elements like `<mark>` natively, which means the fundamental \"no partial styling\" limitation simply doesn't exist anymore — and neither does the mirror overlay.\n\nThe key bits:\n\n```tsx\n<div\n  contentEditable=\"plaintext-only\"  // paste = plain text, Enter = \\n\n  onInput={(e) => onChange(e.currentTarget.textContent ?? \"\")}\n  onCompositionStart={() => { isComposingRef.current = true; }}\n  onCompositionEnd={(e) => {\n    isComposingRef.current = false;\n    onChange(e.currentTarget.textContent ?? \"\");\n  }}\n/>\n```\n\n**Caret preservation** — when `value` changes externally (e.g. React state sync), a `useLayoutEffect` saves the caret's text offset via `getCaretOffset`, rebuilds `innerHTML` (`buildHtml(value, maxHint)` wraps over-portion in `<mark>`), and restores caret via `setCaretOffset`. Both walk the tree with `document.createTreeWalker` + `Range` to compute the offset.\n\n**IME-safe** — while `isComposingRef.current` is true, the `innerHTML` rebuild is skipped, so composing chars aren't destroyed mid-input. Resyncs after `onCompositionEnd`.\n\n**Why `plaintext-only` matters** — regular `contentEditable=\"true\"` pastes formatted HTML (rich-text contamination) and Enter inserts `<div>` or `<br>` differently per browser. `plaintext-only` rejects all input markup and guarantees `Enter = \\n`, which reproduces textarea-equivalent UX on a div.\n\nResult: the sync problem stops existing. The user-visible text and the highlight share the same child node of the same element — no OS-level bounce, scroll, or IME can split them apart.",
    },
    keyInsight: {
      ko: "**Native form element 의 \"부분 styling 불가능\" 같은 근본 한계를 만났을 때, overlay sync 패턴은 거의 항상 짐.** 작아 보이는 시각적 차이 (line-height sub-pixel, scrollbar gutter, OS rubber-band, IME) 가 누적적으로 사용자 눈에 띄게 됩니다. 특히 OS / 브라우저가 직접 그리는 visual effect (rubber-band bounce, IME composition UI 등) 는 어떤 JS / CSS 로도 sync 못 함 — 측정 불가능한 상태가 sync 의 영원한 적입니다.\n\n실용적인 결론 — **\"native element 가 못 하는 일을 native element 위에서 강제하기 보다는, 그 일이 가능한 element 로 교체\"** 하는 게 보통 더 안정적입니다. textarea 가 부분 styling 못 하면 → contenteditable. select 가 dropdown 스타일링 제한적이면 → 커스텀 dropdown. input[type=date] 가 디자인 안 통제되면 → DatePicker 컴포넌트. 매번 \"overlay 로 가리고 mirror sync\" 하는 것보다 **\"필요한 능력을 가진 element\"** 로 이동하는 게 장기적으로 cheaper 합니다.\n\n물론 contenteditable 도 trade-off 가 있습니다 — caret 보존, IME 처리, paste 정규화, form submission 통합 (native form 이 자동으로 해주는 것들) 을 직접 구현해야 합니다. 그래서 **\"textarea 로 충분하면 textarea 를 쓰고, 부분 styling 같이 textarea 가 못 하는 게 필요할 때만 contenteditable\"** — 이 trade-off 를 의식적으로 선택해야 합니다. 모든 textarea 를 contenteditable 로 바꾸는 건 over-engineering.\n\n구체적인 구현 패턴으로는 **`plaintext-only`** 가 결정적입니다. 일반 `contentEditable=\"true\"` 의 quirks (rich paste, Enter behavior, formatting commands) 가 다 사라져서 textarea 와 거의 동일한 UX 를 얻으면서 부분 styling 만 추가로 가능. modern 브라우저 (Firefox 119+ 포함) 다 지원.\n\n그리고 디버깅 측면에서 — **\"OS / 브라우저가 직접 그리는 visual artifact 는 JS 로 sync 불가능\"** 이라는 원칙을 한 번 새기면, 비슷한 함정 (커스텀 scrollbar 가 native scroll 위치와 어긋남, 커스텀 cursor 가 native resize handle 위에서 안 바뀜 등) 도 같은 진단으로 빠르게 정리됩니다. \"이 visual 효과를 브라우저가 직접 그리는가? 그렇다면 sync 가 아니라 replace 가 답이다.\"",
      en: "**When you hit a `<native form element>`'s fundamental limitation (\"can't style portions\", \"can't restyle the dropdown\", etc.), overlay-and-sync patterns almost always lose.** The small visual discrepancies (sub-pixel line-height, scrollbar gutter, OS rubber-band, IME composition) compound into something users notice. The decisive failures come from browser-rendered effects (rubber-band bounce, IME composing UI) — those have no JS / CSS signal at all, so syncing is impossible by definition.\n\nThe practical rule of thumb: **when a native element can't do the thing you need on top of it, replace the element instead of forcing it.** Textarea can't do partial styling → contenteditable. `<select>` can't restyle its dropdown → custom dropdown. `<input type=\"date\">` won't theme cleanly → custom DatePicker. Moving to an element that *can* do the thing is almost always cheaper long-term than maintaining a mirror sync.\n\nContenteditable has its own price — you re-implement caret preservation, IME handling, paste normalization, and form submission glue (all of which textarea gives you free). So the rule shouldn't be \"always replace\". It should be: **textarea is the default; switch to contenteditable only when you need a thing textarea genuinely can't do** (per-character styling here). Replacing every textarea would be over-engineering.\n\nOn implementation, **`plaintext-only`** is the unlock. Plain `contentEditable=\"true\"` carries quirks (rich paste, inconsistent Enter behavior, formatting commands); `plaintext-only` strips them all, letting you keep textarea-grade UX while gaining per-character styling. Supported by all modern browsers including Firefox 119+.\n\nFor debugging — once you internalize **\"any visual effect rendered by the OS or browser itself cannot be synced from JS\"**, similar traps (custom scrollbars drifting from native scroll position, custom cursors not changing over native resize handles, etc.) get diagnosed faster: ask \"is this drawn by the browser?\" — if yes, the answer is replace, not sync.",
    },
    tags: ["textarea", "contenteditable", "html", "css", "overlay", "mirror", "native-form-element", "IME", "overscroll", "plaintext-only"],
  },

  /* ── Native form element 위 custom cursor — overlay 패턴 ── */
  {
    section: { ko: "Animation & Interaction", en: "Animation & Interaction" },
    problem: {
      ko: "Textarea resize handle 위에서 시스템 cursor (`ns-resize`) 가 우리 custom cursor (CursorTrail) 를 덮어씀 — html.custom-cursor * { cursor: none !important } 로도 안 잡힘",
      en: "On a textarea's resize handle, the system `ns-resize` cursor overrides our custom cursor (CursorTrail) — even `html.custom-cursor * { cursor: none !important }` doesn't catch it",
    },
    definition: {
      ko: "프로젝트는 데스크탑에서 자체 커스텀 커서 (CursorTrail) 를 운영하고, 모든 시스템 커서를 `html.custom-cursor * { cursor: none !important }` 로 숨깁니다. `data-cursor` attribute 가 붙은 element 위에 hover 하면 그 type 으로 cursor 가 morph 됩니다.\n\n그런데 contenteditable div 의 `resize: vertical` 로 만들어진 native resize handle (우측 하단 grip) 위에 cursor 를 올려도:\n\n- 시스템 ns-resize cursor 가 보임 (custom cursor 가 가려진 게 아니라 같이 보이거나, ns-resize 만 보임)\n- `data-cursor` 를 div 에 줘도 native handle 영역에 들어가면 무시됨\n\n근본 원인은 native resize handle 이 **\"DOM 요소가 아니라 브라우저가 직접 그리는 visual element\"** 라는 점입니다.",
      en: "The site runs its own custom cursor (CursorTrail) on desktop, hiding every system cursor via `html.custom-cursor * { cursor: none !important }`. Elements tagged with `data-cursor` morph the custom cursor to that type on hover.\n\nBut for a contenteditable `<div>` whose `resize: vertical` produced a native resize grip (bottom-right corner): hovering the grip showed the system `ns-resize` cursor either on top of or instead of the custom one. Setting `data-cursor` on the div was ignored once the pointer entered the native handle's hit area.\n\nThe root cause: the native resize handle isn't a DOM element — **it's a browser-rendered visual element drawn outside the normal CSS pipeline**.",
    },
    cause: {
      ko: "Native form / scroll affordances 의 cursor 는 일반 CSS 의 영역 밖입니다.\n\n- `<textarea>`, contenteditable div 의 **resize handle** — 브라우저 chrome 의 일부로 직접 그려짐. cursor 도 OS/브라우저가 직접 변경 (드래그 모드 활성화 시 OS 가 `ns-resize` 강제).\n- `<scrollbar>` (native) — 같은 이유로 스타일링 한계.\n- `<input type=\"file\">` 의 file picker 트리거.\n- `<select>` 의 dropdown chevron + dropdown 자체.\n\nWebKit 은 일부 pseudo-element (`::-webkit-resizer`, `::-webkit-scrollbar`) 로 제한적 styling 을 허용하지만, **cursor 속성은 적용 안 됨** 인 경우가 많고 Firefox 는 아예 지원 안 함. 결국:\n\n- `cursor: none` 을 element 에 줘도 → 일반 영역만 적용되고 resize handle 영역은 OS 가 `ns-resize` 로 덮어씀\n- `data-cursor` 는 우리 hit-test 가 `closest('[data-cursor]')` 로 찾는데, native handle 영역도 div 의 자식이라 매치는 됨. 하지만 system cursor 가 위에서 그려지면 보이지 않음.\n\n핵심은 \"같은 위치에 두 cursor (system + custom) 가 동시에 발생하는데 우리가 system 을 못 가린다\" 입니다.",
      en: "Cursors over native form / scroll affordances live outside normal CSS control:\n\n- `<textarea>` / contenteditable resize handles — drawn as part of the browser chrome; the cursor is set directly by the OS (especially `ns-resize` once a resize gesture engages).\n- Native scrollbars — same restriction.\n- `<input type=\"file\">` chooser triggers.\n- `<select>` dropdown chevron and the dropdown itself.\n\nWebKit exposes a few pseudo-elements (`::-webkit-resizer`, `::-webkit-scrollbar`) for limited styling, but the `cursor` property rarely takes effect on them and Firefox doesn't support them at all. So:\n\n- `cursor: none` applied to the element only covers \"normal\" space; over the resize handle, the OS overrides with `ns-resize`.\n- `data-cursor` does match (the native handle area is technically inside the div, so `closest('[data-cursor]')` finds it), but the system cursor still paints over the custom one.\n\nThe core problem: two cursors (system + custom) exist at the same location, and we can't suppress the system one.",
    },
    solution: {
      ko: "**Native handle 위에 투명 overlay div 를 깔아서 pointer 를 가로채는** 패턴.\n\n```tsx\n<div className={styles.editableWrap}>\n  <div ref={ref} contentEditable=\"plaintext-only\" className={styles.editable} />\n  {/* native handle 비주얼은 그대로 보임 (resize: vertical 가 그려줌)\n     overlay 가 pointer 이벤트를 먼저 잡아서 system cursor 가 발화되지 않게 +\n     data-cursor=\"resizeV\" 로 CursorTrail 이 resizeV 모양으로 표시 */}\n  <div\n    className={styles.resizeOverlay}\n    data-cursor=\"resizeV\"\n    onPointerDown={handleResizePointerDown}\n    aria-hidden\n  />\n</div>\n```\n\n```css\n.editableWrap { position: relative; }\n.editable { resize: vertical; /* native grip 그대로 보임 */ }\n.resizeOverlay {\n  position: absolute;\n  right: 0;\n  bottom: 0;\n  width: 18px;\n  height: 18px;\n  z-index: 2;\n  background: transparent;\n  touch-action: none;\n}\n```\n\n**왜 동작하는가**:\n\n1. **native grip 비주얼은 유지** — `resize: vertical` 가 grip 그려주는 건 그대로. 우리는 시각적으로 손 안 댐.\n2. **overlay 가 pointer 먼저 잡음** — DOM 순서상 overlay 가 textarea 의 resize 트리거 영역 위에 놓임. `pointerdown` 이 우리에게 먼저 와서 native resize 가 engage 안 됨 → OS 의 `ns-resize` cursor 변경 안 일어남.\n3. **drag 는 우리가 직접 처리** — overlay 의 `onPointerDown` → document-level `pointermove` / `pointerup` 추적 → `ref.current.style.height = ${next}px` 로 div height 직접 변경. native resize 와 동등한 동작.\n4. **CursorTrail 의 resizeV cursor 표시** — overlay 의 `data-cursor=\"resizeV\"` 가 closest 로 매치됨. system cursor 가 발화 안 하니 custom cursor 만 보임.\n\n같은 패턴이 **scrollbar / file input / dropdown 어떤 native 요소든 적용 가능** — \"native 가 그리는 visual 은 그대로 두고, pointer 만 우리가 가로채서 의도된 동작 + 커스텀 cursor 표시\".",
      en: "**Drop a transparent overlay div on top of the native handle and intercept the pointer there.**\n\n```tsx\n<div className={styles.editableWrap}>\n  <div ref={ref} contentEditable=\"plaintext-only\" className={styles.editable} />\n  {/* native grip stays visible (resize: vertical draws it);\n     overlay catches the pointer first, so the system cursor never engages,\n     and data-cursor=\"resizeV\" lets CursorTrail render its custom cursor */}\n  <div\n    className={styles.resizeOverlay}\n    data-cursor=\"resizeV\"\n    onPointerDown={handleResizePointerDown}\n    aria-hidden\n  />\n</div>\n```\n\n```css\n.editableWrap { position: relative; }\n.editable { resize: vertical; /* native grip remains visible */ }\n.resizeOverlay {\n  position: absolute;\n  right: 0;\n  bottom: 0;\n  width: 18px;\n  height: 18px;\n  z-index: 2;\n  background: transparent;\n  touch-action: none;\n}\n```\n\n**Why it works**:\n\n1. **Native grip remains visible** — `resize: vertical` still draws the grip. We don't touch the visual.\n2. **Overlay catches the pointer first** — DOM stacking places the overlay above the textarea's native resize hit area, so `pointerdown` reaches us before the browser engages its own resize. The OS never switches to `ns-resize`.\n3. **We drive the resize manually** — the overlay's `onPointerDown` attaches document-level `pointermove` / `pointerup` and writes `ref.current.style.height = \"${next}px\"` to the div directly. Equivalent behavior to native resize.\n4. **Custom cursor surfaces** — `data-cursor=\"resizeV\"` matches via `closest()`, and since no system cursor is engaged, only the custom one shows.\n\nThe same pattern applies to **any native element where the browser controls the cursor** — scrollbars, file inputs, dropdowns: leave the native visual alone, intercept the pointer with a transparent overlay, drive the behavior in JS, and let your custom cursor system take over.",
    },
    keyInsight: {
      ko: "**Native UI element 의 cursor 는 일반 CSS 영역 밖에 있다 — 가리려 하지 말고 \"pointer 흐름 자체를 우리가 가져온다\".**\n\nResize handle, scrollbar, file input, select dropdown 같은 native affordance 들은 브라우저 chrome 의 일부로 그려지고, cursor 도 OS 가 직접 변경합니다. `cursor: none` 이나 `::-webkit-*` 같은 우회로는 부분적으로만 효과 있고 브라우저별로 다릅니다. 100% 신뢰할 만한 방법은 **\"native 가 그 cursor 를 발화하지 않게 만드는 것\"** — 즉, native 의 인터랙션 자체가 engage 되지 않게.\n\n이건 \"native cursor 를 가리는\" 문제가 아니라 \"native 인터랙션 자체를 가로채는\" 문제입니다. native resize / scroll 이 발화하려면 user 의 `pointerdown` 이 그 영역에 도달해야 하는데, 그 위에 투명한 overlay 를 깔아 `pointerdown` 을 우리가 먼저 잡으면 native 의 cursor 변경 로직 자체가 trigger 되지 않습니다.\n\n그리고 **native 의 visual (grip / scrollbar thumb 등) 은 그대로 두는 것** 이 중요합니다. 시각적으로는 \"user 가 익숙한 native\" 가 그대로 보이고, 인터랙션만 우리가 가져옴 → user 에게는 부자연스러움 없음. \"native visual + custom interaction\" 의 조합은 \"custom visual + custom interaction\" 보다 거의 항상 cheaper (디자인 비용 X, 접근성 default 일부 유지) 합니다.\n\n주의할 trade-off:\n\n1. **drag 동작을 직접 구현** 해야 함 — pointermove 계산, min/max height, pointercancel cleanup. native 가 무료로 해주던 부분.\n2. **접근성** — native handle 은 키보드 (Tab + Enter 등) 에서도 접근 가능. overlay 가 pointer 만 가로채면 키보드는 native 그대로 동작 (보존). 단 키보드 drag 가 필요하면 추가 구현.\n3. **터치 디바이스** — touch event 도 동일하게 처리 (`touch-action: none` + pointer event 통합).\n\n비슷한 케이스에 같은 패턴 적용 가능:\n- **Native scrollbar 위 custom cursor** — scroll 영역에 overlay → custom scroll JS (scroll position 동기화)\n- **`<select>` dropdown 디자인 통제** — select 자체는 hidden, 위에 custom dropdown UI\n- **`<input type=\"file\">` 디자인** — 투명 file input + 시각적으로 custom button\n\n패턴 이름을 굳이 붙이자면 **\"native visual + custom pointer\"** — 시각은 native 의 인지된 행동성을 빌리고, 인터랙션만 통제해서 디자인 시스템 일관성 확보.",
      en: "**Native UI cursors live outside normal CSS — don't try to hide them; take the pointer flow itself.**\n\nResize handles, scrollbars, file inputs, `<select>` dropdowns are drawn as part of the browser chrome, and the OS sets their cursors directly. `cursor: none` and `::-webkit-*` workarounds are partial and inconsistent across browsers. The only fully reliable approach is **prevent the native interaction from engaging in the first place** — once it doesn't engage, neither does its cursor.\n\nIt's not \"hide the native cursor,\" it's \"intercept the native interaction\". The native resize / scroll only engages when the user's `pointerdown` reaches its hit area; place a transparent overlay above and catch the `pointerdown` yourself, and the cursor logic never fires.\n\nKeep **the native visual (grip / scrollbar thumb)** alone. The user keeps the familiar look and feel; you only swap the interaction underneath. \"Native visual + custom interaction\" is almost always cheaper than \"custom visual + custom interaction\" (no design cost, partial accessibility for free).\n\nTrade-offs to budget for:\n\n1. **You implement the drag yourself** — pointermove math, min/max bounds, `pointercancel` cleanup. The browser used to do this for free.\n2. **Accessibility** — native handles support keyboard interactions (Tab + arrow keys, etc.); a pointer-only overlay leaves those intact (good), but keyboard-driven resize needs explicit support if you want it.\n3. **Touch** — handle `pointercancel` and set `touch-action: none` so touch gestures map cleanly.\n\nSame pattern reaches further:\n- **Custom cursor over a native scrollbar** — overlay + JS scroll syncing.\n- **Theming a `<select>` dropdown** — hide the native and render a custom dropdown.\n- **Designing `<input type=\"file\">`** — transparent file input on top of a styled button.\n\nIf this pattern needs a name: **\"native visual + custom pointer\"** — borrow the native's perceived affordance, take over the interaction, and your design system stays consistent.",
    },
    tags: ["cursor", "custom-cursor", "CursorTrail", "textarea", "contenteditable", "resize", "native-form-element", "pointer-events", "overlay"],
  },

  /* ── CSS var() chain — JS 에서 resolve 안 됨, getComputedStyle.color 우회 ── */
  {
    section: { ko: "Layout & CSS", en: "Layout & CSS" },
    problem: {
      ko: "CSS `var()` 체인이 JS `getPropertyValue` 로 resolve 안 됨 — Canvas / Three.js 텍스처 배경색이 토큰과 어긋남",
      en: "CSS `var()` chains don't resolve through JS `getPropertyValue` — Canvas / Three.js texture backgrounds drift from the design token",
    },
    definition: {
      ko: "Works 페이지의 Cylinder 레이아웃 intro 텍스처를 Canvas 로 그릴 때, 페이지 배경색 (`--bg-primary`) 과 동일하게 맞추려고 했습니다.\n\n```ts\nconst bg = getComputedStyle(document.documentElement)\n  .getPropertyValue(\"--bg-primary\")\n  .trim();\nctx.fillStyle = bg;\nctx.fillRect(0, 0, w, h);\n```\n\n그런데 결과는 배경색 대신 **검은색 (`#000`)** 으로 칠해졌습니다. devtools 에서 `--bg-primary` 는 라이트 모드 `oklch(99% 0.005 90)`, 다크 모드 `oklch(8% 0.005 240)` 로 분명 정의되어 있는데도.",
      en: "When drawing the Cylinder layout's intro texture on Canvas, we wanted it to match the page background (`--bg-primary`):\n\n```ts\nconst bg = getComputedStyle(document.documentElement)\n  .getPropertyValue(\"--bg-primary\")\n  .trim();\nctx.fillStyle = bg;\nctx.fillRect(0, 0, w, h);\n```\n\nThe result painted **black (`#000`)** instead of the background color. DevTools clearly showed `--bg-primary` defined as `oklch(99% 0.005 90)` (light) / `oklch(8% 0.005 240)` (dark).",
    },
    cause: {
      ko: "`getPropertyValue(\"--bg-primary\")` 는 **선언된 값의 raw 문자열** 을 그대로 돌려줍니다. resolve 까지 해주지 않습니다.\n\n프로젝트는 4-tier 토큰 구조 (Raw → Semantic → Component → Context) 라 semantic 토큰이 raw 토큰을 참조합니다:\n\n```css\n:root {\n  --color-neutral-50: oklch(99% 0.005 90);\n  --bg-primary: var(--color-neutral-50);  /* 체인 */\n}\n```\n\n그래서 `getPropertyValue(\"--bg-primary\")` 는 `\"var(--color-neutral-50)\"` 라는 **문자열 그대로** 반환합니다. Canvas `fillStyle` 은 이걸 invalid color value 로 판단하고 spec 에 따라 default (검은색) 로 폴백.\n\n핵심 오해는 \"DevTools 의 Computed 탭이 resolve 된 값을 보여주니까 JS API 도 그럴 것\" 이라는 가정입니다. 실제로는 DevTools 가 친절히 보여주는 것이고, `getPropertyValue` 는 declared value 만 돌려줍니다.",
      en: "`getPropertyValue(\"--bg-primary\")` returns the **declared raw string** — it doesn't follow `var()` references.\n\nThe project uses a 4-tier token structure (Raw → Semantic → Component → Context), so semantic tokens reference raw ones:\n\n```css\n:root {\n  --color-neutral-50: oklch(99% 0.005 90);\n  --bg-primary: var(--color-neutral-50);  /* chain */\n}\n```\n\nSo `getPropertyValue(\"--bg-primary\")` returns the literal string `\"var(--color-neutral-50)\"`. Canvas `fillStyle` treats that as an invalid color and falls back to the default (black) per spec.\n\nThe core misconception: \"DevTools' Computed tab shows the resolved value, so the JS API must too.\" In reality DevTools is being helpful; `getPropertyValue` only returns the declared value.",
    },
    solution: {
      ko: "**임시 element 에 `color: var(--bg-primary)` 를 적용한 뒤, `getComputedStyle(el).color` 를 읽으면** 브라우저가 chain 을 끝까지 따라가 actual rgb 값을 돌려줍니다.\n\n```ts\nfunction resolveCssVar(varName: string): string {\n  if (typeof document === \"undefined\") return \"#000\";\n  const tmp = document.createElement(\"div\");\n  tmp.style.color = `var(${varName})`;\n  tmp.style.position = \"absolute\";\n  tmp.style.visibility = \"hidden\";\n  document.body.appendChild(tmp);\n  const color = getComputedStyle(tmp).color; // → \"rgb(252, 252, 250)\" 등\n  document.body.removeChild(tmp);\n  return color || \"#000\";\n}\n\n// 사용\nconst bg = resolveCssVar(\"--bg-primary\");\nctx.fillStyle = bg; // 정상 rendering\n```\n\n**왜 동작하는가**: `color` 같은 CSS 속성은 `var()` chain 을 resolve 한 뒤 실제 used value 로 저장됩니다. `getComputedStyle().color` 는 그 used value 를 읽기 때문에 `\"rgb(252, 252, 250)\"` 같은 actual 값을 받습니다. `--bg-primary` 자체 (`getPropertyValue`) 는 declared value 만 반환하지만, `color` 같은 standard 속성을 거치면 resolve 된 값이 나옵니다.\n\nWorks Cylinder intro 텍스처는 이 방식으로 페이지 `--bg-primary` 와 매칭됩니다 — 라이트/다크 모드 전환 시에도 텍스처 자체가 같은 색으로 다시 그려져 seam 없음.",
      en: "**Apply `color: var(--bg-primary)` to a temporary element, then read `getComputedStyle(el).color`** — the browser follows the chain end-to-end and returns an actual rgb value.\n\n```ts\nfunction resolveCssVar(varName: string): string {\n  if (typeof document === \"undefined\") return \"#000\";\n  const tmp = document.createElement(\"div\");\n  tmp.style.color = `var(${varName})`;\n  tmp.style.position = \"absolute\";\n  tmp.style.visibility = \"hidden\";\n  document.body.appendChild(tmp);\n  const color = getComputedStyle(tmp).color; // → \"rgb(252, 252, 250)\"\n  document.body.removeChild(tmp);\n  return color || \"#000\";\n}\n\n// usage\nconst bg = resolveCssVar(\"--bg-primary\");\nctx.fillStyle = bg; // renders correctly\n```\n\n**Why it works**: standard CSS properties like `color` store the *used value* — the result after `var()` chains are resolved. `getComputedStyle().color` reads that used value, so you get a concrete `\"rgb(252, 252, 250)\"`. `getPropertyValue` on the custom property itself only returns the declared value; piping through a standard property gives you the resolved one.\n\nThe Works Cylinder intro texture uses this to track `--bg-primary` — it also redraws on light/dark toggles, keeping the texture seamless with the page background.",
    },
    keyInsight: {
      ko: "**`getPropertyValue` 는 declared value 만 돌려준다. `var()` chain 의 final 값이 필요하면 standard CSS property 를 거쳐 `getComputedStyle` 로 읽어야 한다.**\n\nDevTools 의 Computed 탭은 친절하게 resolve 까지 해서 보여주지만, JS API 는 그렇지 않습니다. CSS Custom Properties spec 상 custom property 의 computed value 도 \"the result of substitutions\" 가 아니라 \"the specified value\" 입니다.\n\n이 사실은 CSS 토큰 시스템이 multi-tier 일수록 더 자주 발목 잡습니다. 1-tier (직접 hex) 면 안 보이는 함정이지만, semantic → raw chain 이 있으면 즉시 드러납니다.\n\n비슷한 케이스에 같은 패턴 적용 가능:\n- **Three.js material 색** — `new THREE.Color(bg)` 에 넘기기 전 resolve\n- **SVG `fill`/`stroke` 동적 set** — `element.setAttribute(\"fill\", bg)` 전 resolve (SVG attribute parser 는 `var()` 미지원)\n- **Animation library 의 from/to 색** — Framer / GSAP 등 일부 interpolator 는 raw string 을 못 해석\n\n반대로 CSS 안에서만 쓰는 경우 (`background: var(--bg-primary)`) 는 브라우저가 알아서 resolve 하므로 문제 없음. **\"JS 가 CSS 값을 읽어서 비-CSS 컨텍스트 (Canvas, SVG attribute, library prop) 에 넘기는 순간\"** 이 위험 지점.",
      en: "**`getPropertyValue` returns only the declared value. If you need the resolved end of a `var()` chain, pipe it through a standard CSS property and read with `getComputedStyle`.**\n\nDevTools' Computed tab helpfully resolves and shows the final value, but the JS API doesn't. Per the CSS Custom Properties spec, a custom property's *computed value* is the specified value, not \"the result of substitutions\".\n\nThis bites harder the more tiers your token system has. With direct hex (1-tier) it's invisible; once you have semantic → raw chains, it surfaces immediately.\n\nSame pattern reaches further:\n- **Three.js material colors** — resolve before `new THREE.Color(bg)`.\n- **SVG `fill`/`stroke` set dynamically** — resolve before `element.setAttribute(\"fill\", bg)` (the SVG attribute parser doesn't support `var()`).\n- **Animation library from/to colors** — some Framer/GSAP interpolators can't parse raw `var()` strings.\n\nWhen the value stays inside CSS (`background: var(--bg-primary)`), the browser resolves it for you — no issue. **The danger window opens the moment JS reads a CSS value and hands it to a non-CSS context** (Canvas, SVG attributes, library props).",
    },
    tags: ["css", "custom-properties", "var", "getComputedStyle", "canvas", "three.js", "design-tokens"],
  },
  {
    problem: {
      ko: "칩을 다른 그룹으로 drag 하면 일부는 잘 옮겨지고 일부는 기존 항목과 위치가 바뀜(switch)",
      en: "Dragging a chip to another group works for some, but others swap places with an existing item",
    },
    definition: {
      ko: "Tech Stack 칩 에디터에서 칩을 카테고리 그룹 간 이동할 때, 그룹의 '첫 번째' 칩을 옮기면 그룹 순서 전체가 뒤집혀 다른 칩과 자리가 바뀐 것처럼 보임.",
      en: "In the Tech Stack chip editor, moving the *first* chip of a group flips the entire group order, making it look like chips swapped places.",
    },
    cause: {
      ko: "그룹(카테고리) 표시 순서를 항목 배열의 '첫 등장' index 에서 파생하고 있었음. 어떤 카테고리의 첫 항목을 다른 그룹으로 옮기면 그 카테고리의 '앵커'가 사라져, 남은 항목의 첫 등장 위치 기준으로 그룹 순서가 재계산되며 통째로 뒤집힘. 중간·끝 항목을 옮길 땐 앵커가 유지돼 멀쩡 → '어떤 건 되고 어떤 건 안 되는' 증상.",
      en: "Group display order was *derived* from each category's first-appearance index in the items array. Moving a category's first item removed its anchor, so the order recomputed off the remaining items and flipped wholesale. Moving middle/last items kept the anchor — hence the intermittent symptom.",
    },
    solution: {
      ko: "그룹 순서를 항목 위치에서 파생하지 않고 **별도 state 로 소유**. drop 시 옮긴 항목은 타깃 그룹의 끝에 append 하고, 그룹 순서는 이동 전 순서를 유지(빈 그룹도 placeholder 로 유지해 다시 끌어올 수 있게). collision detection 이나 좌표 문제가 아니라 '파생 순서'가 원인이었던 게 핵심.",
      en: "Stop deriving group order from item positions — **own it in explicit state**. On drop, append the moved item to the end of the target group and keep the prior group order (empty groups stay as drop placeholders). The root cause was the derived order, not collision detection or coordinates.",
    },
    keyInsight: {
      ko: "파생 상태(derived order)가 입력 '순서'에 의존하면, 입력의 부분 변경이 전체 재배열을 유발한다. 순서가 의미를 가지면 파생하지 말고 명시적으로 소유하라.",
      en: "When derived state depends on input *ordering*, a partial change to the input can trigger a full reshuffle. If order carries meaning, own it explicitly instead of deriving it.",
    },
    tags: ["dnd-kit", "drag-and-drop", "react", "state", "derived-state"],
  },
  {
    problem: {
      ko: "drag&drop 후 위치 이동 애니메이션이 안 먹거나 엉뚱한 칩이 튐",
      en: "After drag & drop, the position animation doesn't play — or the wrong chip jumps",
    },
    definition: {
      ko: "framer-motion `layout`/`layoutId` 로 칩 재배치를 FLIP 애니메이션하려 했으나, 어떤 칩은 슬라이드 없이 즉시 점프하고 그룹 간 이동은 전혀 보간되지 않음.",
      en: "Tried to FLIP-animate chip reordering with framer-motion `layout`/`layoutId`, but some chips jumped instantly and cross-group moves weren't interpolated at all.",
    },
    cause: {
      ko: "motion 컴포넌트의 key/layoutId 를 배열 index 로 부여. 항목이 이동하면 index 가 바뀌어 React 가 다른 요소로 보고 unmount/remount → framer 가 '같은 요소'로 추적하지 못해 FLIP 실패. 그룹 간 이동은 부모(컨테이너)가 달라 더더욱 추적 불가.",
      en: "key/layoutId were derived from the array index. When an item moved, its index changed, so React treated it as a different element and unmounted/remounted it — framer couldn't track it as the same node, so FLIP broke. Cross-group moves change the parent container, breaking it further.",
    },
    solution: {
      ko: "layoutId/key 를 항목 고유값(이름)으로 부여해 이동해도 동일 instance 로 유지하고, 전체를 `<LayoutGroup>` 으로 감싸 그룹(부모)이 달라져도 공유 레이아웃 전환이 일어나게 함. drop 시 DragOverlay 의 dropAnimation 은 비활성해 실제 칩의 FLIP 과 충돌 방지.",
      en: "Give layoutId/key a stable per-item identity (the name) so the instance survives moves, and wrap everything in `<LayoutGroup>` so shared-layout transitions fire across parents. Disable the DragOverlay drop animation so it doesn't fight the real chip's FLIP.",
    },
    keyInsight: {
      ko: "FLIP·공유 레이아웃 애니메이션은 '이 요소가 그 요소와 같다'를 key 로 증명해야 동작한다. 배열 index 는 안정 키가 아니다.",
      en: "FLIP / shared-layout animation only works if you *prove* element identity via the key. An array index is not a stable key.",
    },
    tags: ["framer-motion", "layout", "layoutId", "flip", "react-key", "animation"],
  },
  {
    problem: {
      ko: "drag 핸들 위에서만 'Drag' 커서가 떠서 사용자가 끌 수 있다는 걸 못 알아챔",
      en: "The 'Drag' cursor only showed over the tiny handle, so users couldn't tell a chip was draggable",
    },
    definition: {
      ko: "커스텀 커서(CursorTrail) 환경에서 칩 핸들에만 drag 커서를 줬더니, 작은 grip 위에 정확히 올렸을 때만 잠깐 바뀌어 사실상 표시가 안 되는 것처럼 보임.",
      en: "With the custom cursor (CursorTrail), the drag affordance was scoped to the chip's handle only — it changed only when hovering the tiny grip, so it effectively read as 'not working'.",
    },
    cause: {
      ko: "① `html.custom-cursor` 가 native 커서를 숨겨 CSS `cursor: grab` 자체가 안 보임. ② 커스텀 커서는 `[data-draggable]`/`[draggable]` 또는 `[data-cursor]` 로 상태를 잡는데, dnd-kit 은 HTML5 `draggable` 속성을 달지 않음 → 자동 감지 안 됨. ③ 그 신호를 좁은 핸들에만 부여.",
      en: "① `html.custom-cursor` hides the native cursor, so CSS `cursor: grab` is invisible. ② The custom cursor reads `[data-draggable]`/`[draggable]` or `[data-cursor]`, but dnd-kit doesn't set the HTML5 `draggable` attribute, so auto-detection misses it. ③ The signal was attached only to the narrow handle.",
    },
    solution: {
      ko: "`data-cursor=\"grab\"` 를 핸들이 아닌 **칩 전체**에 부여. drag 감지(listeners)는 칩 전체에 그대로 두고, 커서 신호만 넓혀 어디에 올려도 'Drag' 가 보이게 함. (클릭=편집은 그대로 — data-cursor 는 시각 힌트일 뿐 클릭을 막지 않음.)",
      en: "Put `data-cursor=\"grab\"` on the **whole chip** instead of the handle. Keep drag listeners on the whole chip; just widen the cursor signal so 'Drag' shows anywhere. (Click-to-edit still works — data-cursor is a visual hint, it doesn't block clicks.)",
    },
    keyInsight: {
      ko: "커스텀 커서 환경에선 CSS `cursor` 가 무력하다. 발견성(affordance)은 `data-*` 신호로, 그것도 충분히 넓은 hit 영역에 줘야 한다.",
      en: "Under a custom cursor, CSS `cursor` is inert. Affordance must come from a `data-*` signal — and over a wide enough hit area to be discoverable.",
    },
    tags: ["custom-cursor", "data-attribute", "dnd-kit", "affordance", "ux"],
  },
  {
    problem: {
      ko: "dashed 테두리를 줬는데 테두리가 아예 안 그려짐",
      en: "Set a dashed border, but no border renders at all",
    },
    definition: {
      ko: "`border: 1px dashed var(--border-strong)` 처럼 디자인 토큰으로 dashed 테두리를 줬는데 화면에 아무 테두리도 안 나옴.",
      en: "Wrote `border: 1px dashed var(--border-strong)` with a design token, but no border appears.",
    },
    cause: {
      ko: "`--border-*` 토큰은 색이 아니라 `1px solid <color>` **shorthand**. 그래서 `1px dashed var(--border-strong)` 는 `1px dashed 1px solid <color>` 로 전개돼 invalid → 선언 전체가 무시됨. 침묵 실패라 더 헷갈림.",
      en: "`--border-*` tokens aren't colors — they're `1px solid <color>` **shorthands**. So `1px dashed var(--border-strong)` expands to `1px dashed 1px solid <color>`, which is invalid and silently dropped.",
    },
    solution: {
      ko: "base shorthand 를 먼저 적용한 뒤 **style 만 override**: `border: var(--border-strong); border-style: dashed;` (한 변이면 `border-top-style`, outline 이면 `outline-style`). width·color 가 base 토큰에 동기화되고 dash 전용 토큰을 새로 만들 필요도 없음. 색 토큰이 필요할 땐 `--border-*-color` 를 직접 쓴다.",
      en: "Apply the base shorthand, then **override only the style**: `border: var(--border-strong); border-style: dashed;` (per-side `border-top-style`, or `outline-style` for outlines). Width/color stay synced to the base token, and no dashed-specific tokens are needed. When a raw color is required, use `--border-*-color` directly.",
    },
    keyInsight: {
      ko: "shorthand 토큰을 다른 shorthand 속성 안에 끼우면 조용히 깨진다. 토큰이 '값'인지 'shorthand'인지 구분하고, 일부만 바꾸려면 longhand override 로 분리하라.",
      en: "Nesting a shorthand token inside another shorthand silently breaks. Know whether a token is a *value* or a *shorthand*, and split out partial changes via a longhand override.",
    },
    tags: ["css", "design-tokens", "border", "shorthand", "dashed"],
  },
  {
    problem: {
      ko: "float 이미지 옆 텍스트를 드래그·선택하면 이미지가 같이 묶이고, 화살표·클릭 시 빈 줄에 커서가 떨어짐",
      en: "Dragging/selecting the text next to a float image dragged the image with it, and arrows/clicks dropped the caret into an empty line",
    },
    definition: {
      ko: "float 이미지를 본문 옆에 흘리면서도 (1) 블록 드래그·선택은 이미지와 텍스트가 독립이고 (2) 이미지 위/아래에 빈 줄이 안 보이고 (3) 클릭·방향키가 보이지 않는 빈 자리에 안 떨어지게 하려 했음.",
      en: "Wanted a float image that wraps with the text while (1) block drag/selection stays independent from the surrounding text, (2) no empty line shows above/below it, and (3) clicks/arrows never land on an invisible blank.",
    },
    cause: {
      ko: "CSS `float` 은 이미지를 흐름 밖으로 빼는데, Plate(Slate)에선 이미지가 inline void 라 반드시 문단 안에 있고 양옆에 빈 텍스트(ZWSP)가 강제됨. ① 텍스트와 같은 문단이면 블록 드래그가 통째로 이동(통짜 선택). ② 독립 문단으로 분리하면 흐름엔 ZWSP 한 줄만 남아 빈 줄로 보임. ③ 그 빈 줄을 가리면(line-height:0 / 다음 블록으로 덮기) 그 자리가 안 보이는데도 클릭·방향키로 커서가 들어가 깜빡임.",
      en: "CSS `float` pulls the image out of flow, but in Plate (Slate) the image is an inline void — it must live inside a paragraph with mandatory empty text (ZWSP) on both sides. ① In the same paragraph, block drag moves image+text as one. ② Split into its own paragraph and the in-flow content is just a ZWSP line → shows as an empty line. ③ Hide that line (line-height:0 / cover with the next block) and the now-invisible spot still catches clicks/arrows, so the caret flickers there.",
    },
    solution: {
      ko: "세 층을 함께 처리: (데이터) 변경마다 mixed 문단을 `splitNodes` 로 분리해 이미지를 독립 블록화 → 드래그·선택 독립. (레이아웃) 빈 줄은 다음 블록을 한 줄 끌어올려(`margin-bottom: -1lh`) 가리고, float wrapper 에 `z-index` 를 줘 이동 핸들이 안 가리게. (입력) 클릭(mousedown)·방향키(keydown)를 capture 단계에서 가로채 — 빈 자리로 갈 상황이면 이미지를 선택하거나 인접 블록으로 보냄(Slate 기본 이동 전에 처리해 깜빡임 제거).",
      en: "Fixed across three layers: (data) on every change, split mixed paragraphs with `splitNodes` so the image becomes its own block → independent drag/selection. (layout) hide the empty line by pulling the next block up one line (`margin-bottom: -1lh`) and give the float wrapper a `z-index` so the move handle isn't covered. (input) intercept click (mousedown) and arrows (keydown) in the capture phase — when the caret would land on the blank, select the image or jump to the adjacent block instead (handled before Slate's default move, so no flicker).",
    },
    keyInsight: {
      ko: "float(흐름 밖)과 inline void(문단 내 강제 텍스트)는 근본적으로 충돌한다. '독립 블록 + 빈 줄 없음 + 자연스러운 네비게이션' 을 동시에 만족시키려면 한 군데를 고치는 게 아니라 데이터·레이아웃·입력을 함께 맞춰야 한다.",
      en: "A CSS float (out of flow) and an inline void (forced in-paragraph text) fundamentally conflict. Getting 'independent block + no empty line + natural navigation' at once isn't a one-spot fix — data, layout, and input handling all have to align.",
    },
    tags: ["plate", "slate", "float", "inline-void", "navigation", "editor"],
  },

  /* ── Editor shell / Layout ── */
  {
    section: { ko: "Admin / Layout", en: "Admin / Layout" },
    problem: {
      ko: "에디터 top bar 가 `position: sticky` 로 안 붙음 — 본문 내부 스크롤이라 페이지가 안 움직여 핀이 안 걸림",
      en: "Editor top bar won't pin with `position: sticky` — the body is an inner scroll region so the page never moves",
    },
    definition: {
      ko: "에디터 상단 바(BackLink·저장·리비전 등)를 `position: sticky` 로 화면 상단에 고정하려 했으나, 스크롤해도 핀이 걸리지 않고 본문과 함께 위로 사라짐.",
      en: "Tried to pin the editor's top bar (BackLink, save, revisions) at the top with `position: sticky`, but it never pinned — it scrolled away with the body.",
    },
    cause: {
      ko: "에디터 본문이 `height: 60vh` + `data-lenis-prevent` 로 감싼 **내부 스크롤 영역**이라, 정작 페이지(document) 자체는 거의 스크롤되지 않음. `position: sticky` 는 스크롤 컨테이너가 실제로 스크롤될 때 핀이 걸리는데, 본문 안에서 휠을 굴려도 페이지 스크롤 위치는 그대로라 sticky 발동 조건이 안 생김. 게다가 `scroll` 이벤트는 버블하지 않아 일반 listener 로는 중첩된 본문 스크롤을 잡지 못함.",
      en: "The editor body is an **inner scroll region** wrapped in `height: 60vh` + `data-lenis-prevent`, so the page (document) itself barely scrolls. `position: sticky` pins only when the scroll container actually scrolls, but wheeling inside the body leaves the page scroll position unchanged, so sticky never has a condition to fire. And `scroll` events don't bubble, so a plain listener can't catch the nested body scroll.",
    },
    solution: {
      ko: "sticky 를 버리고 `position: fixed` 로 직접 제어. ① `position: fixed; top: var(--header-height)` 로 전역 Navigation 바로 아래에 항상 고정하고 접힘/펼침은 `transform: translateY()`. ② fixed 라 flow 에서 빠진 만큼 본문이 가려지므로 `ResizeObserver` 로 top bar 높이를 측정해 같은 높이의 spacer 로 자리를 예약. ③ `window.addEventListener(\"scroll\", onScroll, true)` 로 capture 단계에서 듣고, target 이 document 면 페이지 스크롤·`HTMLElement` 면 중첩 본문 스크롤로 분기. 두 경우 모두 방향(delta)을 누적해 임계값(6px) 도달 시 접기/펼치기 토글.",
      en: "Dropped sticky and controlled it with `position: fixed`. ① `position: fixed; top: var(--header-height)` keeps it below the global Navigation; collapse/expand via `transform: translateY()`. ② fixed removes it from flow, so measure the top bar height with a `ResizeObserver` and reserve the space with a same-height spacer. ③ `window.addEventListener(\"scroll\", onScroll, true)` listens in the capture phase; when target is the document it's page scroll, when it's an `HTMLElement` it's nested body scroll. Both accumulate direction and toggle collapse/expand at a threshold (6px).",
    },
    keyInsight: {
      ko: "`position: sticky` 는 실제로 스크롤되는 조상이 있어야 동작 — 내부 스크롤 패턴(`60vh` + `lenis-prevent`)에선 페이지가 안 움직여 sticky 가 무의미하다. `scroll` 은 버블하지 않으므로 중첩 스크롤까지 잡으려면 capture 단계로 들어야 하고, fixed 는 flow 에서 빠지므로 spacer 로 높이를 명시적으로 예약해야 한다.",
      en: "`position: sticky` works only with an actually-scrolling ancestor — in an inner-scroll pattern (`60vh` + `lenis-prevent`) the page never moves, so sticky is meaningless. `scroll` doesn't bubble, so catching nested scroll needs the capture phase; and fixed removes the element from flow, so its height must be explicitly reserved with a spacer.",
    },
    tags: ["css", "position", "sticky", "fixed", "scroll", "capture", "ResizeObserver", "editor"],
  },

  /* ── Interaction ── */
  {
    section: { ko: "Interaction", en: "Interaction" },
    problem: {
      ko: "HorizontalCarousel 안의 카드 클릭이 안 먹음 — `setPointerCapture` 가 자식 click 을 가로챔",
      en: "Card clicks inside HorizontalCarousel don't register — `setPointerCapture` steals the child click",
    },
    definition: {
      ko: "가로 캐러셀 안에 든 팀원 폴라로이드(플립) 카드를 클릭해도 토글이 안 됨. 카드 자체엔 `onClick` 이 정상으로 붙어 있는데도 이벤트가 도달하지 않음.",
      en: "Clicking a team polaroid (flip) card inside the horizontal carousel didn't toggle it. The card had a working `onClick`, yet the event never reached it.",
    },
    cause: {
      ko: "캐러셀이 마우스 드래그 스크롤을 위해 `onPointerDown` 에서 즉시 `el.setPointerCapture()` 를 호출. 포인터가 캡처되면 이후 pointer 이벤트가 전부 캐러셀로 redirect 되고, 그 결과 자식 카드의 `click`(= pointerdown→up 한 쌍) 이 카드까지 전달되지 않음. \"드래그하려고 캡처\" 가 \"탭/클릭\" 까지 같이 삼켜 버린 것.",
      en: "For mouse drag-scroll, the carousel called `el.setPointerCapture()` immediately on `onPointerDown`. Once captured, all subsequent pointer events redirect to the carousel, so the child card's `click` (a pointerdown→up pair) never reaches the card. \"Capture to drag\" also swallowed the \"tap/click.\"",
    },
    solution: {
      ko: "캡처를 pointerdown 시점이 아니라 실제 드래그가 시작된 시점으로 미룸. ① `onPointerDown` 에선 시작 좌표만 기록(`active: true`) — 캡처 안 함. ② `onPointerMove` 에서 이동량이 4px 을 넘긴 순간 비로소 `setPointerCapture()` + `data-cursor=\"grab\"` → 진짜 드래그로 판정. ③ 4px 미만으로 떼면 캡처가 없어 `click` 이 자식에 정상 전달. `onClickCapture` 는 `moved` 플래그가 섰을 때만 click 을 막아 드래그 끝의 의도치 않은 클릭만 차단.",
      en: "Defer the capture from pointerdown to when a real drag begins. ① `onPointerDown` records only the start coords (`active: true`) — no capture. ② `onPointerMove` calls `setPointerCapture()` + sets `data-cursor=\"grab\"` only once the move exceeds 4px → judged a real drag. ③ Release under 4px and no capture happens, so `click` propagates to the child. `onClickCapture` swallows the click only when the `moved` flag is set, blocking just the unintended end-of-drag click.",
    },
    keyInsight: {
      ko: "`setPointerCapture` 를 pointerdown 에서 바로 부르면 클릭과 드래그를 구분할 기회 자체가 사라진다 — 캡처가 자식 이벤트를 통째로 가져감. \"이동 임계값(4px)을 넘기 전엔 캡처하지 않는다\" 가 클릭·드래그를 공존시키는 표준 패턴(TagCloud3D·Series Deck 와 동일).",
      en: "Calling `setPointerCapture` straight on pointerdown removes any chance to tell click from drag — the capture takes the child's events wholesale. \"Don't capture until the move exceeds a threshold (4px)\" is the standard pattern for letting click and drag coexist (same as TagCloud3D and Series Deck).",
    },
    tags: ["pointer-events", "setPointerCapture", "drag", "click", "carousel", "interaction"],
  },

  /* ── Architecture / Component ── */
  {
    section: { ko: "Admin / Architecture", en: "Admin / Architecture" },
    problem: {
      ko: "에디터 미리보기가 게시 상세와 레이아웃이 어긋남 — 단순화 버전이라 계속 drift",
      en: "Editor preview drifts from the published detail layout — it was a simplified version",
    },
    definition: {
      ko: "admin 에디터의 미리보기(preview) 화면이 실제 게시된 상세 페이지와 레이아웃·간격·코드블록 처리가 미묘하게 계속 어긋남.",
      en: "The admin editor's preview kept subtly diverging from the actual published detail page — in layout, spacing, and code-block handling.",
    },
    cause: {
      ko: "preview 가 detail 과 별개로 만든 단순화 버전이었음. detail 의 마크업/스타일이 바뀔 때마다 preview 를 따로 맞춰야 했고, 한쪽만 고치면 곧바로 어긋남(같은 화면을 두 번 구현). richtext(코드 하이라이팅·embed·heading id) 처리도 서로 다른 코드 경로라 출력이 달랐음.",
      en: "The preview was a separate, simplified version built apart from detail. Every time the detail markup/styles changed, the preview had to be matched separately, and fixing one side drifted (the same screen implemented twice). richtext handling (highlighting, embeds, heading ids) ran through different code paths too, so output differed.",
    },
    solution: {
      ko: "상세 페이지의 article 뷰를 공용 프레젠테이션 컴포넌트로 추출해 detail·preview 가 같은 컴포넌트를 렌더하게 함. ① `PostArticleView`/`WorkArticleView` 에서 `Header`/`Body`/`Team` 을 export → `PostDetailClient`·`WorkDetailClient`(상세)와 `posts/preview`·`works/preview`(미리보기)가 동일 컴포넌트 사용. 댓글·뒤로가기처럼 preview 에 없는 chrome 만 detail 쪽에서 추가. ② richtext HTML 처리를 `src/utils/processRichtextHtml.ts` 한 곳으로 공유(heading id → embed → hljs → wrap 라벨 → img cursor 순서 동일) → 코드블록까지 100% 일치.",
      en: "Extracted the detail page's article view into shared presentation components so detail and preview render the same component. ① `PostArticleView`/`WorkArticleView` export `Header`/`Body`/`Team` → `PostDetailClient`/`WorkDetailClient` (detail) and `posts/preview`/`works/preview` (preview) use the same components; only chrome absent from preview (comments, back link) is added on the detail side. ② richtext HTML processing is shared in `src/utils/processRichtextHtml.ts` (same order: heading id → embed → hljs → wrap label → img cursor) → identical down to the code blocks.",
    },
    keyInsight: {
      ko: "\"미리보기\" 가 본화면과 다르면 미리보기로서 가치가 없다 — 단순화 버전을 따로 두는 순간 두 화면이 silent 하게 drift 한다. 해법은 동기화가 아니라 단일 소스화: 같은 출력이 필요하면 같은 컴포넌트·같은 처리 함수를 쓰게 해 한쪽만 바뀌는 상태를 구조적으로 불가능하게 만든다.",
      en: "A preview that differs from the real screen has no value as a preview — keeping a simplified version separate makes the two screens silently drift. The fix isn't synchronization but a single source: if you need identical output, make both use the same component and processing function so a one-side-only change becomes structurally impossible.",
    },
    tags: ["preview", "detail", "shared-component", "richtext", "refactor", "single-source"],
  },

  /* ── Layout / CSS ── */
  {
    section: { ko: "Layout / CSS", en: "Layout / CSS" },
    problem: {
      ko: "float 이미지가 상세 페이지에서 텍스트와 딱 붙음 (간격 0)",
      en: "Float images stick to the text on the detail page (zero gap)",
    },
    definition: {
      ko: "본문 옆으로 흘린 float 이미지가 상세 페이지에서 인접 텍스트와 간격 없이 딱 붙어 렌더됨.",
      en: "A float image wrapped beside the body text rendered flush against the adjacent text with no gap on the detail page.",
    },
    cause: {
      ko: "plateSerializer 가 float figure 를 `style=\"float:left;margin:0\"` 처럼 인라인 style 로 margin:0 을 박아 저장 → 가로 여백이 0이라 텍스트가 이미지에 달라붙음. 게다가 인라인 style 은 우선순위가 높아 `.prose figure` 같은 일반 CSS 규칙으로 덮을 수 없었음.",
      en: "plateSerializer saved the float figure with inline-style `margin:0`, like `style=\"float:left;margin:0\"` → zero horizontal margin, so the text clung to the image. And inline styles win on specificity, so a generic rule like `.prose figure` couldn't override it.",
    },
    solution: {
      ko: "직렬화 값 자체를 고치고 CSS 로도 `!important` 강제. ① `plateSerializer.ts` 에서 float figure margin 을 `0 24px 24px 0`(left)/`0 0 24px 24px`(right) 로 변경해 직렬화 단계에서 옆·아래 여백 부여. ② `PostDetail.module.css`/`WorkDetail.module.css` 의 `.prose figure[style*=\"float:left\"]`/`.sectionProse figure[style*=\"float:right\"]` 에 `margin: ... !important` 로 옆·아래 간격(`--spacing-lg`)을 강제 — 과거에 `margin:0` 으로 저장된 콘텐츠도 일관되게 간격이 적용되도록(직렬화 값과 무관하게 커버).",
      en: "Fix the serialized value and also force it via CSS `!important`. ① In `plateSerializer.ts`, change the float figure margin to `0 24px 24px 0` (left) / `0 0 24px 24px` (right), applying side/bottom spacing at the serialization step. ② In `PostDetail.module.css`/`WorkDetail.module.css`, force side/bottom spacing (`--spacing-lg`) with `margin: ... !important` on `.prose figure[style*=\"float:left\"]`/`.sectionProse figure[style*=\"float:right\"]` — so the gap applies consistently even to old content saved with `margin:0` (regardless of the serialized value).",
    },
    keyInsight: {
      ko: "직렬화가 인라인 style 을 박으면 그 값은 외부 CSS 보다 우선순위가 높아 나중에 덮기 어렵다 — 직렬화 단계에서 올바른 값을 넣는 게 1차 방어. 이미 잘못 저장된 과거 데이터까지 책임지려면 attribute selector(`[style*=\"float\"]`) + `!important` 로 인라인 값을 무력화하는 2차 방어를 둔다.",
      en: "When serialization bakes in an inline style, that value outranks external CSS and is hard to override later — putting the right value in at serialization is the first line of defense. To cover already-broken legacy data, add a second line: an attribute selector (`[style*=\"float\"]`) + `!important` to neutralize the inline value.",
    },
    tags: ["css", "float", "inline-style", "specificity", "serializer", "important"],
  },

  /* ── 댓글 마크다운 — 번들러 / sanitizer ── */
  {
    section: { ko: "Architecture & Backend", en: "Architecture & Backend" },
    problem: {
      ko: "댓글에 코드 하이라이팅을 붙이자 게시물 페이지 전체가 크래시 — 빌드는 통과",
      en: "Adding code highlighting to comments crashed the entire post page — while the build passed",
    },
    definition: {
      ko: "댓글 마크다운의 코드블록에 하이라이팅을 붙이려고 `highlight.js` 를 import 했더니, 댓글이 아니라 **게시물 상세 페이지가 통째로** 죽었습니다. dev·prod 양쪽에서 재현됐고, `npm run build` 는 아무 경고 없이 통과했습니다.",
      en: "I imported `highlight.js` to highlight code blocks inside comment markdown, and **the entire post detail page** died — not just the comment. It reproduced in both dev and prod, and `npm run build` passed without a single warning.",
    },
    cause: {
      ko: "콘솔에 남은 건 코드 한 줄 실행되기도 전에 터진 이 에러였습니다:\n\n```\nSyntaxError: Invalid regular expression: /[A-...]/:\nRange out of order in character class\n```\n\n추적해 보니 highlight.js 의 `xml.js` 가 `/[\\p{L}_]/u` 라는 **유니코드 속성 이스케이프**를 씁니다. 번들러가 이 파일을 구형 브라우저 타겟에 맞춰 downlevel 하면서 `\\p{L}` 을 코드포인트 범위의 나열로 풀어쓰는데, 그 과정에서 **시작이 끝보다 큰(범위가 뒤집힌) 문자 클래스**가 만들어졌습니다.\n\n결정적인 건 터지는 **시점**이었습니다. 정규식 리터럴은 함수가 호출될 때가 아니라 **모듈이 평가되는 순간** 컴파일됩니다. 그래서 하이라이팅 함수를 한 번도 부르지 않아도, 그 모듈이 포함된 청크가 로드되는 순간 throw 가 나고, **그 청크에 함께 묶인 페이지 전체가 죽습니다**. 댓글 하나의 문제가 게시물 페이지 전체로 번진 이유입니다.\n\n원인이 번들 산출물이라는 건 아래로 확인했습니다.\n\n- **원본 파일은 멀쩡합니다** — Node 에서 `xml.js` 를 그대로 로드하면 정상입니다. 즉 라이브러리 소스가 아니라 **번들러가 변환한 결과물만** 깨져 있습니다.\n- `next.config` 의 `optimizePackageImports` 에서 highlight.js 를 빼도 그대로 재현됩니다 — 최적화 옵션이 원인이 아닙니다.\n- `xml` 언어만 등록에서 빼면 정규식 에러는 사라집니다. 하지만 **필요한 언어만 골라 등록한 자체 인스턴스로도** highlight.js 청크가 로드되는 순간 같은 크래시가 납니다.",
      en: "The console showed an error that fired before a single line of my code ran:\n\n```\nSyntaxError: Invalid regular expression: /[A-...]/:\nRange out of order in character class\n```\n\nTracing it: highlight.js's `xml.js` uses `/[\\p{L}_]/u`, a **Unicode property escape**. When the bundler downlevels that file for older browser targets, it expands `\\p{L}` into a list of codepoint ranges — and in doing so produced a **character class whose range start was greater than its end**.\n\nThe decisive part was *when* it threw. A regex literal is compiled **when its module is evaluated**, not when a function is called. So even without ever invoking the highlighter, the moment the chunk containing that module loaded, it threw — and **every page bundled into that chunk died with it**. That's how one comment feature took down the whole post page.\n\nI confirmed the bundle output was the culprit:\n\n- **The original file is fine** — loading `xml.js` directly in Node works. Only the **bundler's transformed output** is broken, not the library source.\n- Removing highlight.js from `optimizePackageImports` in `next.config` reproduces it identically — the optimization flag isn't the cause.\n- Dropping just the `xml` language makes the regex error go away, but **even a hand-rolled instance registering only the languages I need** crashes the same way the instant the highlight.js chunk loads.",
    },
    solution: {
      ko: "**두 단계로 해결했습니다.**\n\n**1단계 — 우회(Prism).** 우선 리더뷰·댓글의 하이라이터를 Prism 으로 갈아끼웠습니다. Prism 은 유니코드 속성 이스케이프를 안 쓰므로 이 함정이 없고, 이미 의존성에 있어 추가 비용도 없었습니다. `utils/prismHighlight.ts` 를 단일 진입점으로 두고 `highlightCodeBlocks.ts` 의 hljs import 를 전부 걷어냈습니다 (Prism 번들에 없는 bash 는 직접 정의).\n\n**2단계 — 근본(문법 패치).** 에디터는 Prism 으로 못 옮깁니다 — Plate 의 code-block 플러그인이 **lowlight 인스턴스를 API 로 받기** 때문입니다. 그래서 hljs 문법 자체를 고쳤습니다. 등록 시 문법 객체를 훑어 아스트랄 이스케이프를 걷어내고 `u` flag 를 뗍니다. 아스트랄 영역의 \"문자\" 는 태그명에 실질적으로 안 쓰이고 BMP(한글·CJK·라틴 확장)는 그대로 남습니다. Plate 도 python 에 대해 같은 우회(`ensureStablePythonGrammar`)를 갖고 있어, 라이브러리 밖에서 문법을 패치하는 건 이 함정의 표준 대응입니다.\n\n한 번 헛돌았습니다. 처음엔 `RegExp` 인스턴스만 변환했는데 아무것도 안 고쳐졌습니다 — hljs 의 `regex.concat()` 이 **RegExp 가 아니라 소스를 이어붙인 문자열**을 반환해서(`core.js: return joined`), 아스트랄이 문자열 안에 있었기 때문입니다.\n\n**남아 있던 지뢰도 해제됐습니다.** `highlightCodeBlocks.ts` 는 이제 hljs 를 import 하지 않습니다.",
      en: "**Solved in two stages.**\n\n**Stage 1 — sidestep (Prism).** First I swapped the reader and comment highlighters to Prism. Prism uses no Unicode property escapes, so the trap does not exist there, and it was already a dependency — no added cost. `utils/prismHighlight.ts` became the single entry point and every hljs import was stripped from `highlightCodeBlocks.ts` (bash, missing from the Prism bundle, is defined by hand).\n\n**Stage 2 — root fix (patch the grammar).** The editor could not move to Prism: Plate's code-block plugin **takes a lowlight instance as its API**. So I fixed the hljs grammar itself — at registration we walk the grammar object, strip astral escapes, and drop the `u` flag. Astral-plane \"letters\" are effectively never used in tag names, and the BMP (Korean, CJK, Latin extended) survives untouched. Plate ships the same workaround for python (`ensureStablePythonGrammar`), so patching a grammar from outside the library is the standard answer to this trap.\n\nOne attempt was wasted: transforming only `RegExp` instances fixed nothing. hljs's `regex.concat()` returns **a concatenated source string, not a RegExp** (`core.js: return joined`) — the astral escapes lived inside strings.\n\n**The remaining landmine is defused too.** `highlightCodeBlocks.ts` no longer imports hljs."
    },
    keyInsight: {
      ko: "**빌드 통과는 안전을 보장하지 않습니다.** 번들러는 소스를 타겟 환경에 맞춰 \"고쳐 쓰는\" 단계이고, 그 산출물은 소스와 다르게 동작할 수 있습니다. 타입 체크도 빌드도 원본을 보기 때문에, 이 층의 결함은 **오직 런타임에서만** 드러납니다.\n\n그리고 실패 시점이 곧 폭발 반경입니다. **모듈 평가 시점에 컴파일되는 코드**(정규식 리터럴, 최상위 실행문)는 함수 호출 지점이 아니라 **import 지점에서** 터지므로, 한 컴포넌트의 문제가 그 청크를 공유하는 페이지 전체로 번집니다. 기능 하나를 넣을 때 그 실패가 **어디까지 번지는지**를 같이 봐야 하는 이유입니다.",
      en: "**A green build doesn't mean it's safe.** The bundler is a step that *rewrites* your source for a target environment, and its output can behave differently from what you wrote. Type-checking and building both inspect the original — so defects at this layer surface **only at runtime**.\n\nAnd the moment of failure defines the blast radius. Code compiled **at module-evaluation time** — regex literals, top-level statements — throws at the **import** site, not the call site, so one component's problem takes down every page sharing that chunk. That's why adding a feature means also asking **how far its failure spreads**.",
    },
    tags: ["highlight.js", "bundler", "regex", "unicode-property-escape", "runtime-crash", "chunk"],
  },
  {
    section: { ko: "Architecture & Backend", en: "Architecture & Backend" },
    problem: {
      ko: "댓글 마크다운 체크박스가 렌더 안 됨 — DOMPurify 가 허용 목록에 넣은 속성을 조용히 지움",
      en: "Comment markdown checkboxes never rendered — DOMPurify silently stripped an explicitly allowlisted attribute",
    },
    definition: {
      ko: "댓글에 `- [ ] 할 일` 을 쓰면 체크박스가 아니라 **그냥 불릿**으로 렌더됐습니다. `ALLOWED_TAGS` 에 `input` 도, `ALLOWED_ATTR` 에 `type` 도 분명히 넣어둔 상태였고, 에러는 한 줄도 없었습니다.",
      en: "Writing `- [ ] todo` in a comment rendered a **plain bullet** instead of a checkbox. `input` was in `ALLOWED_TAGS` and `type` was in `ALLOWED_ATTR` — and there wasn't a single error anywhere.",
    },
    cause: {
      ko: "marked 는 정상이었습니다. `<input type=\"checkbox\">` 를 제대로 만들어 냈고, 그게 사라지는 건 **DOMPurify 를 통과한 뒤**였습니다.\n\n원인은 DOMPurify 의 규칙 하나였습니다. DOMPurify 는 **\"URI-safe 로 알려진 속성\"이 아니면 그 속성의 *값*을 `ALLOWED_URI_REGEXP` 로 검사**합니다. 값이 URL 일 수 있다고 보고 프로토콜을 확인하는 것입니다. 그런데 기본 URI-safe 목록(`alt`·`class`·`title`·`value` 등)에는 `type` 이 없습니다.\n\n그래서 이런 일이 벌어졌습니다:\n\n```ts\nconst ALLOWED_URI_REGEXP = /^(?:https?:|mailto:)/i;\n// type=\"checkbox\" → 값 \"checkbox\" 를 위 정규식으로 검사 → 불일치 → 속성 제거\n```\n\n`ALLOWED_ATTR` 에 `type` 을 넣은 건 **\"이 속성을 남겨라\"** 라는 뜻이지 **\"이 속성의 값을 URL 로 검사하지 말라\"** 는 뜻이 아니었습니다. 두 설정은 서로 다른 축이고, **URI 검사가 조용히 이깁니다**.\n\n속성이 지워지자 그다음은 제 코드가 마무리했습니다. `afterSanitizeAttributes` 훅이 \"task-list 체크박스만 남기고 나머지 input 은 제거\" 하려고 `type` 을 확인하는데, 그 `type` 이 이미 사라진 뒤라 **훅이 체크박스를 \"체크박스 아님\"으로 판정하고 `<input>` 을 지웠습니다** → 불릿만 남음.\n\n같은 이유로 **표의 `align` 도 죽어 있었습니다.** 마크다운 표 정렬(`|:---|---:|`)이 통째로 무시되고 있었는데, 이것도 에러 없이 조용히 사라지던 터라 체크박스를 파기 전까지 아무도 몰랐습니다.",
      en: "marked was fine. It produced `<input type=\"checkbox\">` correctly — the attribute disappeared **after DOMPurify**.\n\nThe cause was one DOMPurify rule: unless an attribute is **known to be URI-safe, DOMPurify tests its *value* against `ALLOWED_URI_REGEXP`**, on the assumption the value might be a URL whose protocol needs checking. And `type` is not in the default URI-safe list (`alt`, `class`, `title`, `value`, …).\n\nSo:\n\n```ts\nconst ALLOWED_URI_REGEXP = /^(?:https?:|mailto:)/i;\n// type=\"checkbox\" → value \"checkbox\" tested against the regex → no match → attribute dropped\n```\n\nPutting `type` in `ALLOWED_ATTR` means **\"keep this attribute\"** — not **\"don't URL-check its value\"**. They're different axes, and **the URI check wins, silently**.\n\nOnce the attribute was gone, my own code finished the job. The `afterSanitizeAttributes` hook checks `type` to keep only task-list checkboxes and remove any other input — but `type` was already stripped, so **the hook judged the checkbox to be \"not a checkbox\" and removed the `<input>`** → bullet only.\n\nThe same rule had quietly killed **table `align`** too. Markdown table alignment (`|:---|---:|`) had been ignored the whole time — also with no error, so nobody noticed until I dug into the checkbox.",
    },
    solution: {
      ko: "URL 이 아닌 inert 속성들을 URI 검사에서 빼주면 끝이었습니다.\n\n```ts\n// type/checked/disabled/align — 전부 URL 이 아닌 inert 속성\nconst URI_SAFE_ATTR = [\"type\", \"checked\", \"disabled\", \"align\"];\n\nDOMPurify.sanitize(raw, {\n  ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP,\n  ADD_URI_SAFE_ATTR: URI_SAFE_ATTR,\n});\n```\n\n중요한 건 **이게 보안을 낮추지 않는다는 점**입니다. `ADD_URI_SAFE_ATTR` 는 \"이 속성 값은 URL 이 아니니 프로토콜 검사를 건너뛰라\" 는 선언일 뿐, 속성 자체의 허용 여부는 여전히 `ALLOWED_ATTR` 이 결정합니다. `href`·`src` 는 목록에 없으므로 **URL 을 실을 수 있는 속성의 프로토콜 검사는 그대로 유지**됩니다.",
      en: "The fix was to exempt the non-URL, inert attributes from the URI check:\n\n```ts\n// type/checked/disabled/align — all inert, none are URLs\nconst URI_SAFE_ATTR = [\"type\", \"checked\", \"disabled\", \"align\"];\n\nDOMPurify.sanitize(raw, {\n  ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP,\n  ADD_URI_SAFE_ATTR: URI_SAFE_ATTR,\n});\n```\n\nWhat matters is that **this doesn't weaken sanitization**. `ADD_URI_SAFE_ATTR` only declares \"this attribute's value isn't a URL, skip the protocol check\" — whether the attribute is allowed at all is still `ALLOWED_ATTR`'s call. `href` and `src` aren't on the list, so **protocol checking stays fully intact for the attributes that can actually carry a URL**.",
    },
    keyInsight: {
      ko: "**허용 목록에 넣었는데도 사라진다면, 다른 설정 키가 그 허용을 덮고 있는지 봐야 합니다.** `ALLOWED_ATTR` 와 `ALLOWED_URI_REGEXP` 는 각각 \"무엇을 남길지\" 와 \"값이 안전한지\" 라는 별개의 축인데, 이름만 보면 둘 다 \"허용\" 이라 같은 축처럼 읽힙니다. 라이브러리 설정은 **키 하나만 보고 판단하면 안 되고, 키들 사이의 상호작용까지** 읽어야 합니다.\n\n그리고 이 버그가 오래 산 진짜 이유는 **조용해서**입니다. sanitizer 는 위험한 걸 지우는 게 일이라 \"지웠다\" 고 알리지 않고, 그래서 정상 동작과 조용한 제거가 겉보기에 똑같습니다. 표의 `align` 은 아무도 신고하지 않은 채로 계속 죽어 있었습니다 — **로그를 남기지 않는 계층에서는 \"에러가 없다\" 가 \"동작한다\" 의 근거가 되지 못합니다.**",
      en: "**When something is allowlisted but still disappears, look for a different config key overruling the allowance.** `ALLOWED_ATTR` and `ALLOWED_URI_REGEXP` are separate axes — \"what to keep\" versus \"is this value safe\" — but both read as \"allow\" by name, which makes them look like one axis. Library config can't be reasoned about one key at a time; **you have to read how the keys interact**.\n\nAnd the reason this bug lived so long is that it was **quiet**. A sanitizer's whole job is removing things, so it doesn't announce removals — which makes correct behavior and silent stripping look identical from the outside. Table `align` had been dead the entire time with nobody reporting it. **In a layer that doesn't log, \"no errors\" is not evidence of \"it works\".**",
    },
    tags: ["dompurify", "sanitize", "allowlist", "silent-failure", "markdown", "gfm"],
  },

  /* ── Plate 에디터 — normalizer / hook 순서 ── */
  {
    section: { ko: "Plate Editor", en: "Plate Editor" },
    problem: {
      ko: "열블록 너비를 %로 바꾸면 에디터가 멈춤 — normalize 무한루프",
      en: "Switching column widths to % froze the editor — an infinite normalize loop",
    },
    definition: {
      ko: "열블록(column_group)을 3열로 만들거나 열 너비를 %로 조정하면 에디터가 그대로 굳었습니다. 탭이 응답을 멈추고 결국 크래시했습니다.",
      en: "Creating a 3-column block or adjusting column widths in % froze the editor solid — the tab stopped responding and eventually crashed.",
    },
    cause: {
      ko: "`@platejs/layout` 의 기본 normalizer 는 열 너비의 합이 100 이 아니면 `(100 - 합) / 열수` 로 차이를 재분배합니다. 열이 추가되거나 빈 열이 자동 제거될 때마다 이 보정이 돕니다.\n\n문제는 **100/3 처럼 딱 떨어지지 않는 값**입니다. `33.333...` 을 세 번 더해도 부동소수점상 합이 정확히 100 이 되지 않습니다. normalizer 는 \"합이 100 이 아니네\" 하고 다시 보정하고, 그 결과가 또 100 이 아니고, 다시 보정하고 — **종료 조건에 영영 도달하지 못합니다.**\n\nnormalize 는 동기 루프라 이 사이에 브라우저가 프레임을 그릴 틈이 없습니다. 그래서 \"느려짐\" 이 아니라 **완전한 정지**로 나타났습니다.",
      en: "`@platejs/layout`'s default normalizer redistributes the difference as `(100 - sum) / n` whenever column widths don't sum to 100. That correction runs every time a column is added or an empty one is auto-removed.\n\nThe problem is **values that don't divide evenly, like 100/3**. Adding `33.333...` three times never lands exactly on 100 in floating point. So the normalizer sees \"sum isn't 100\", corrects, gets a result that still isn't 100, corrects again — and **never reaches its exit condition**.\n\nNormalization is a synchronous loop, so the browser never gets a frame in between. That's why it presented as a **hard freeze** rather than \"slow\".",
    },
    solution: {
      ko: "부동소수점으로는 \"합이 정확히 100\" 을 보장할 수 없으니, **너비를 정수로만 다루기로** 했습니다. `ColumnKit` 뒤에 등록한 `ColumnWidthFixKit` 이 원래 `normalizeNode` 를 감싸서, 너비가 \"정수 & 합 100\" 이 아니면 비율을 유지한 채 정수로 재분배하고 **그 pass 를 즉시 종료**합니다.\n\n```ts\n// 비율 유지 정수 재분배 (각 열 최소 1)\nconst ints = widths.map((w) =>\n  Math.max(1, Math.round((sum > 0 ? w / sum : 1 / n) * 100)),\n);\n// 반올림 오차는 가장 큰 열이 흡수 → 합이 정확히 100\nconst s = ints.reduce((a, b) => a + b, 0);\nif (s !== 100) {\n  let maxIdx = 0;\n  for (let i = 1; i < ints.length; i++) if (ints[i] > ints[maxIdx]) maxIdx = i;\n  ints[maxIdx] = Math.max(1, ints[maxIdx] + (100 - s));\n}\n```\n\n반올림하면 합이 99 나 101 이 될 수 있는데, 그 오차를 **가장 큰 열 하나가 흡수**합니다. 가장 큰 열에 몰아주면 1~2% 오차가 시각적으로 가장 덜 드러나고, 무엇보다 합이 **정확히** 100 인 정수 배분이 나옵니다.\n\n루프가 끝나는 근거는 여기 있습니다. 우리 보정은 항상 정확한 정수-100 을 만들기 때문에 **다음 pass 에서는 조건이 풀려** 원래 normalize(빈 열 제거·unwrap 등)가 그대로 통과합니다. 이미 정수-100 이면 아예 개입하지 않습니다.",
      en: "Since floating point can't guarantee \"sums to exactly 100\", I made widths **integers only**. `ColumnWidthFixKit`, registered after `ColumnKit`, wraps the original `normalizeNode`: if widths aren't \"all integers and summing to 100\", it redistributes them as ratio-preserving integers and **ends that pass immediately**.\n\n```ts\n// ratio-preserving integer redistribution (min 1 per column)\nconst ints = widths.map((w) =>\n  Math.max(1, Math.round((sum > 0 ? w / sum : 1 / n) * 100)),\n);\n// the largest column absorbs the rounding error → sum is exactly 100\nconst s = ints.reduce((a, b) => a + b, 0);\nif (s !== 100) {\n  let maxIdx = 0;\n  for (let i = 1; i < ints.length; i++) if (ints[i] > ints[maxIdx]) maxIdx = i;\n  ints[maxIdx] = Math.max(1, ints[maxIdx] + (100 - s));\n}\n```\n\nRounding can leave the sum at 99 or 101, and **the single largest column absorbs that error** — dumping a 1–2% discrepancy into the widest column is the least visually detectable place for it, and it yields an integer split summing to **exactly** 100.\n\nThat's also why the loop terminates: our correction always produces an exact integer-100, so **the condition is false on the next pass** and the original normalize (empty-column removal, unwrap, etc.) proceeds untouched. If widths are already integer-100, we never intervene at all.",
    },
    keyInsight: {
      ko: "**수렴하지 않는 종료 조건은 무한루프와 같은 말입니다.** `합 === 100` 은 정수에서는 도달 가능하지만 부동소수점에서는 도달하지 못할 수 있고, 라이브러리는 그 차이를 검사해 주지 않습니다.\n\n해법은 조건을 느슨하게(`Math.abs(sum - 100) < 0.01`) 만드는 쪽이 아니라 **애초에 도달 가능한 값의 공간으로 옮기는 것**이었습니다. 정수로 좁히면 \"정확히 100\" 이 표현 가능한 값이 되고, 그때부터 종료 조건은 신뢰할 수 있는 명제가 됩니다. **오차를 허용하는 대신 오차가 생길 수 없는 표현을 고르는 편이 더 단단합니다.**",
      en: "**An exit condition that can't converge is just an infinite loop.** `sum === 100` is reachable in integers and possibly unreachable in floating point — and the library won't check which one you're in.\n\nThe fix wasn't to loosen the condition (`Math.abs(sum - 100) < 0.01`) but to **move into a value space where the target is reachable at all**. Constrain to integers and \"exactly 100\" becomes representable, at which point the exit condition is a proposition you can trust. **Choosing a representation where the error can't exist is sturdier than tolerating the error.**",
    },
    tags: ["plate", "normalizer", "infinite-loop", "floating-point", "column-group"],
  },
  {
    section: { ko: "Plate Editor", en: "Plate Editor" },
    problem: {
      ko: "코드블록 안 텍스트에 서식을 넣으면 에디터가 크래시 — \"change in the order of Hooks\"",
      en: "Formatting text inside a code block crashed the editor — \"change in the order of Hooks\"",
    },
    definition: {
      ko: "코드블록 안의 텍스트를 선택하고 굵게·색상·형광펜 같은 mark 를 적용하면 에디터가 React 에러로 크래시했습니다.\n\n```\nRendered more hooks than during the previous render.\n(change in the order of Hooks)\n```",
      en: "Selecting text inside a code block and applying a mark — bold, color, highlight — crashed the editor with a React error:\n\n```\nRendered more hooks than during the previous render.\n(change in the order of Hooks)\n```",
    },
    cause: {
      ko: "코드블록은 syntax highlighting 을 위해 **leaf 를 decorate** 합니다. lowlight 가 토큰 단위로 leaf 를 쪼개 각각에 하이라이팅 정보를 붙이는 구조입니다.\n\n여기에 mark(bold·color 등) leaf 가 섞이면 leaf 의 구성이 렌더마다 달라집니다. Plate 내부 `Leaf` 컴포넌트는 leaf 종류에 따라 hook 을 다르게 부르는데, **decorate leaf 와 mark leaf 가 겹치면 렌더 간 hook 호출 순서가 바뀝니다**. React 의 규칙 위반이라 크래시로 이어집니다.\n\n즉 원인은 제 렌더링 코드가 아니라 **두 leaf 시스템(decoration 과 mark)이 같은 노드를 두고 겹친 것**이었습니다.",
      en: "Code blocks **decorate leaves** for syntax highlighting — lowlight splits leaves per token and attaches highlight info to each.\n\nMix mark leaves (bold, color, …) into that and the leaf composition changes between renders. Plate's internal `Leaf` component calls different hooks depending on leaf type, so **when decoration leaves and mark leaves overlap, the hook call order shifts between renders** — a React rules violation, hence the crash.\n\nSo the cause wasn't my rendering code but **two leaf systems (decoration and marks) colliding on the same node**.",
    },
    solution: {
      ko: "겹침 자체를 없앴습니다. `NoCodeMarksKit` 이 `addMark` 를 감싸서, 선택 영역이 코드블록 안이면 **mark 적용을 그냥 무시**합니다.\n\n```ts\naddMark(key: string, value: unknown) {\n  try {\n    if (editor.api.some({ match: { type: [KEYS.codeBlock, KEYS.codeLine] } })) return;\n  } catch { /* ignore */ }\n  addMark(key, value);\n}\n```\n\n렌더 단계에서 겹친 leaf 를 수습하려 하지 않고 **입력 단계에서 애초에 안 들어가게** 막는 쪽을 골랐습니다. 코드에 굵게·형광펜을 넣는 건 의미도 없고 — 코드블록의 서식은 syntax highlighting 이 담당합니다 — 사용자가 잃는 기능이 없습니다. 막는 게 곧 올바른 동작입니다.",
      en: "I removed the overlap itself. `NoCodeMarksKit` wraps `addMark` and **simply ignores mark application** when the selection sits inside a code block:\n\n```ts\naddMark(key: string, value: unknown) {\n  try {\n    if (editor.api.some({ match: { type: [KEYS.codeBlock, KEYS.codeLine] } })) return;\n  } catch { /* ignore */ }\n  addMark(key, value);\n}\n```\n\nRather than reconciling overlapping leaves at render time, I blocked them **at the input step so they never exist**. Bolding or highlighting code is meaningless anyway — syntax highlighting owns formatting inside a code block — so no user-facing capability is lost. Blocking it *is* the correct behavior.",
    },
    keyInsight: {
      ko: "**\"두 시스템이 같은 자원을 두고 겹칠 수 있다\" 면, 겹친 뒤에 수습하는 것보다 겹치지 못하게 막는 게 쌉니다.** 여기서 decoration 과 mark 는 각각은 멀쩡하고 둘이 만났을 때만 깨지는데, 이런 결함은 두 기능을 따로 테스트하면 절대 안 보입니다.\n\n그리고 이 경우 **막는 것이 곧 올바른 동작**이었다는 점이 결정을 쉽게 만들었습니다. 제약을 걸면 보통 기능을 잃지만, 애초에 의미 없는 조합이라면 제약이 손해가 아니라 **의도를 명시하는 일**이 됩니다. 크래시를 고치는 방법을 고를 때 \"어느 쪽이 더 정직한 모델인가\" 를 같이 물어볼 만합니다.",
      en: "**When two systems can collide over the same resource, preventing the collision is cheaper than reconciling it afterward.** Decoration and marks are each fine alone and break only when they meet — a class of defect that testing the two features separately will never surface.\n\nWhat made the call easy here is that **blocking it was also the correct behavior**. Adding a constraint usually costs you a capability, but when the combination is meaningless to begin with, the constraint isn't a loss — it's **making the intent explicit**. Worth asking, when picking how to fix a crash, which option is the more honest model.",
    },
    tags: ["plate", "react-hooks", "decorate", "marks", "code-block", "crash"],
  },
  {
    section: { ko: "i18n", en: "i18n" },
    problem: { ko: "필수 이중언어 제목이 한쪽만 채워지면 반대 언어에서 빈칸으로 표시됨", en: "A required bilingual title renders blank in the other language when only one side is filled" },
    definition: {
      ko: "작품 제목을 ko/en 이중언어로 바꾼 뒤, **국문 제목만 채운 작품을 영어로 보니 제목이 빈칸**으로 떴습니다. 부제목·설명은 비어도 티가 안 났지만 제목은 항상 보여야 하는 필수 필드라 바로 드러났습니다.",
      en: "After making the work title bilingual (ko/en), **a work with only the Korean title rendered a blank title in English**. Empty subtitle/description went unnoticed, but the title — a required, always-visible field — exposed it immediately.",
    },
    cause: {
      ko: "표시에 쓰는 `<T ko en>` 컴포넌트가 `en ?? ko` **nullish 병합(`??`)** 으로 fallback 합니다. `??` 는 `null`·`undefined` 만 fallback 하고 **빈 문자열 `\"\"` 은 \"값\" 으로 취급**해 그대로 렌더합니다. 번역 안 된 `title_en` 은 `null` 이 아니라 `\"\"`(DEFAULT '') 이므로, 영어에서 `\"\" ?? 국문` → `\"\"` → 빈칸이 됩니다.",
      en: "The display component `<T ko en>` falls back with `en ?? ko` — **nullish coalescing (`??`)**. `??` only falls back on `null`/`undefined` and treats an **empty string `\"\"` as a real value**, rendering it as-is. An untranslated `title_en` is not `null` but `\"\"` (DEFAULT ''), so in English `\"\" ?? ko` → `\"\"` → blank.",
    },
    solution: {
      ko: "이중언어를 조립하는 mapper(`workToProject`)에서 **한쪽이 비면 반대 언어로 채우도록** `||` 로 fallback 했습니다: `title: loc(w.title || w.title_en, w.title_en || w.title)`. `||` 는 빈 문자열도 falsy 로 보고 넘어가므로 양쪽이 항상 채워집니다. 문자열 컨텍스트(alt/title 속성)용 `pickLocalized` 도 같은 `||` 기반입니다.",
      en: "In the mapper that assembles the bilingual value (`workToProject`), I fell back with `||` so **an empty side is filled from the other**: `title: loc(w.title || w.title_en, w.title_en || w.title)`. `||` treats the empty string as falsy, so both sides are always populated. The string-context helper `pickLocalized` (for `alt`/`title` attributes) uses the same `||` fallback.",
    },
    keyInsight: {
      ko: "**`??` 와 `||` 의 차이가 이중언어 fallback 을 가릅니다.** \"번역 안 된 필드는 비어있다(`\"\"`)\" 가 유효한 상태라면 fallback 은 `??` 가 아니라 `||` 여야 합니다 — 특히 항상 표시돼야 하는 필수 필드는. 선택 필드(부제목)에서 안 보이던 버그가 필수 필드(제목)로 옮기자 드러난 것도 같은 이유입니다.",
      en: "**The choice between `??` and `||` decides bilingual fallback.** If \"an untranslated field is empty (`\"\"`)\" is a valid state, the fallback must be `||`, not `??` — especially for a required, always-shown field. The same bug hiding in an optional field (subtitle) surfaced the moment it moved to a required one (title).",
    },
    tags: ["i18n", "LocalizedText", "fallback", "nullish", "번역"],
  },
  {
    problem: {
      ko: "모바일에서 ERD 다이어그램이 높이 0 으로 접혀 아무것도 안 보임",
      en: "On mobile the ERD diagram collapses to height 0 — nothing renders",
    },
    definition: {
      ko: "React Flow 캔버스가 담긴 컨테이너는 미디어쿼리에서 `min-height` 로만 높이를 받는데, 그 안의 캔버스는 `height: 100%` 라서 0 으로 계산돼 다이어그램(노드 23개는 DOM 에 다 있음)이 통째로 안 보였습니다. 데스크탑에선 멀쩡했습니다.",
      en: "The container holding the React Flow canvas only gets its height from a `min-height` in a media query, while the canvas inside uses `height: 100%` — which resolved to 0, so the whole diagram (all 23 nodes present in the DOM) was invisible. Desktop was fine.",
    },
    cause: {
      ko: "CSS 에서 `height: 100%` 는 부모의 **definite height (확정된 높이)** 를 기준으로 계산됩니다. 그런데 `min-height` 로만 만들어진 높이는 definite 가 아니라 `auto` 로 취급되어, 자식의 `100%` 가 `auto` 기준 → 0 이 됩니다. 데스크탑에서 우연히 살아있던 건 그쪽은 flex 부모가 실제 높이를 갖고 있었기 때문이고, 문제를 가렸습니다.",
      en: "In CSS, `height: 100%` resolves against the parent's **definite height**. A height made only from `min-height` is not definite — it's treated as `auto`, so the child's `100%` resolves against `auto` and becomes 0. It happened to work on desktop only because there a flex parent carried a real height, which masked the bug.",
    },
    solution: {
      ko: "컨테이너를 flex 컨테이너(`display: flex; flex-direction: column`)로 만들어 자식이 flex stretch 로 늘어나게 했습니다. flex 의 stretch 는 부모 높이가 definite 인지와 무관하게 동작하므로, `min-height` 만으로도 자식이 그 높이를 꽉 채웁니다.",
      en: "Make the container a flex container (`display: flex; flex-direction: column`) so the child stretches to fill it. Flex stretch works regardless of whether the parent's height is definite, so the child fills the `min-height`-derived box.",
    },
    keyInsight: {
      ko: "`height: 100%` 가 0 으로 죽으면 **부모가 `min-height` 로만 높이를 갖는지** 부터 의심하세요. percentage height 는 definite height 를 요구하고, `min-height` 는 그 조건을 만족시키지 못합니다. definite 높이를 만들 수 없는 상황이라면 percentage 대신 **flex/grid 의 stretch** 로 우회하는 게 안전합니다.",
      en: "When `height: 100%` dies to 0, first suspect that **the parent's height comes only from `min-height`**. Percentage heights require a definite height, and `min-height` doesn't satisfy that. When you can't give a definite height, route around it with **flex/grid stretch** instead of percentages.",
    },
    tags: ["css", "height", "min-height", "flexbox", "react-flow", "responsive"],
  },
  {
    problem: {
      ko: "스크롤 시 상단 탭바에 frost(blur) 를 깔려는데 blur 가 안 보이거나 잘림",
      en: "A frosted blur on the sticky top bar won't show — or gets clipped",
    },
    definition: {
      ko: "가로 스크롤 탭바(sticky)에 `::before` 로 frost 를 붙였더니 위쪽 nav 영역까지 안 뻗고 잘렸고, 이를 피하려 `position: fixed` 오버레이로 바꿨더니 이번엔 Lenis 스무스 스크롤 위에서 `backdrop-filter` 가 밑을 지나가는 콘텐츠를 전혀 안 흐렸습니다.",
      en: "Adding a frost via `::before` on the horizontally-scrolling sticky tab bar got clipped and never reached the nav area above; switching to a `position: fixed` overlay to avoid that made `backdrop-filter` stop blurring the content passing underneath, because the page uses Lenis smooth scroll.",
    },
    cause: {
      ko: "두 가지가 겹쳤습니다. (1) 탭바에 가로 스크롤용 `overflow-x: auto` 가 걸려 있으면 명세상 `overflow-y` 도 `auto` 로 승격되어 **양축 모두 클립** 됩니다 — 그래서 박스 밖으로 뻗어야 하는 `::before` 가 잘립니다. (2) `position: fixed` 요소의 `backdrop-filter` 는 뷰포트 기준으로 backdrop 을 샘플링하는데, Lenis 는 콘텐츠를 `transform` 으로 밀어 스크롤하므로 fixed 오버레이가 그 transform 된 콘텐츠를 제대로 못 샘플링합니다.",
      en: "Two things stacked. (1) `overflow-x: auto` on the tab bar (for horizontal tab scroll) promotes `overflow-y` to `auto` too per spec, so it **clips on both axes** — clipping a `::before` that needs to extend outside the box. (2) `backdrop-filter` on a `position: fixed` element samples the backdrop relative to the viewport, but Lenis scrolls by `transform`-ing the content, so the fixed overlay can't sample that transformed content.",
    },
    solution: {
      ko: "에디터(topBar) 페이지와 같은 패턴으로 재구성했습니다 — **sticky + frost 는 overflow 가 없는 래퍼**가 맡고, 가로 스크롤은 안쪽 요소가 맡습니다(그러면 `::before` 가 안 잘림). frost 는 `fixed` 가 아니라 **sticky 요소의 `::before`** 로 두고, `top: calc(-1 * var(--header-height))` 로 nav 영역까지 위로 확장 + 마스크로 아래를 페이드했습니다. 배경색 없이 `backdrop-filter` 만으로 blur 를 냅니다.",
      en: "Rebuilt it with the same pattern as the editor's topBar — a **wrapper with no overflow owns the sticky + frost**, while an inner element owns the horizontal scroll (so the `::before` isn't clipped). The frost is the **sticky element's `::before`** (not `fixed`), extended up over the nav with `top: calc(-1 * var(--header-height))` and faded at the bottom with a mask. Pure `backdrop-filter`, no background fill.",
    },
    keyInsight: {
      ko: "**`overflow-x: auto` 는 y 축까지 클립합니다** — 밖으로 나가는 `::before`/그림자를 쓰려면 스크롤과 오버레이의 책임을 다른 요소로 분리하세요. 그리고 **transform 기반 스무스 스크롤(Lenis 등) 위에서는 `backdrop-filter` 를 `fixed` 가 아니라 `sticky` 요소에 걸어야** backdrop 을 제대로 샘플링합니다.",
      en: "**`overflow-x: auto` clips the y-axis too** — if you need a `::before`/shadow that bleeds outside, split the scroll and the overlay onto different elements. And **on transform-based smooth scroll (Lenis et al.), attach `backdrop-filter` to a `sticky` element, not a `fixed` one**, so it samples the backdrop correctly.",
    },
    tags: ["css", "sticky", "overflow", "backdrop-filter", "lenis", "frost"],
  },
];

// ── 후처리 — 메타 적용 + 섹션 정렬 + 난이도 정렬 + 중복/숨김 필터 ─────────

/** 동일 이슈를 다른 각도에서 한 번 더 다룬 항목 — 영구 제거 */
const DUPLICATE_PROBLEMS = new Set<string>([
  "테마 전환 글로벌 transition이 컴포넌트 애니메이션 덮어쓰기", // = "글로벌 transition shorthand"
]);

/**
 * 현재 노출 항목을 핵심 13개로 추리기 위해 임시로 숨긴 항목들.
 * 데이터(rawTroubleShootingItems) 는 그대로 유지 — 다시 노출하려면 이 Set 에서 항목만 제거.
 *
 * 선정 기준 (상위에 남긴 항목):
 *   - 난이도 3 + recommended ★ 우선
 *   - 섹션 다양성 (각 섹션 1~3개)
 *   - 인사이트의 일반화 가능성 (특정 라이브러리/엣지케이스 보다 패턴 학습)
 *
 * 결과: 46 → 13 (Architecture 3, Performance 2, Layout 3, Editor 1, Interaction 3, Component 1)
 */
const HIDDEN_PROBLEMS = new Set<string>([
  // Architecture & Backend (4 hidden)
  "API 키 변경마다 재배포가 필요",
  "비회원 댓글에서 본인 확인이 번거로움",
  "에디터 자동저장 주기가 너무 잦아 리비전이 의미 없이 누적됨", // ↪ "localStorage → DB" 항목에 사실상 통합
  "카테고리 자동 보정으로 리비전 프롬프트가 무한 반복",

  // Performance (4 hidden)
  "mousemove마다 React 리렌더 (60fps 성능 저하)", // 기초적
  "Three.js LatheGeometry 컵에 Canvas 2D 라떼아트 텍스처 합성 — 두 개 평면이 만나는 부분의 자연스러운 블렌딩",
  "GSAP ScrollTrigger 수평 무한 스크롤 — 양방향 무한 wrapping",
  "LoadingScreen이 SSR에 포함되지 않아 콘텐츠 flash 발생",

  // Layout & CSS (7 hidden)
  "코드 블록 줄바꿈 토글 시 레이아웃이 갑자기 튐",
  "CSS Module 해시 충돌로 데스크톱 레이아웃 붕괴",
  "CSS 토큰 미정의 — 11개 파일에서 참조하지만 선언 없음",
  "Admin 테이블 모바일 가로 스크롤 시 row border가 중간에서 끊김",
  "sticky filterBar IntersectionObserver — 인기글 사이드바와 1px 어긋남",
  "Navigation 메뉴가 좁은 viewport 에서 우측 actions 와 겹침 + indicator 가 resize 중 메뉴 위치를 못 따라감",
  "커버 이미지 팔레트 등 grid 자식이 viewport 밖으로 잘려 나감 — `.row { grid-template-columns: 1fr 1fr }` 의 함정",

  // Plate Editor (13 hidden — 토글/콜아웃 한 항목만 노출)
  "Richtext 게시물에서 코드 하이라이팅·줄바꿈 버튼이 사라짐",
  "Plate 에디터에서 컨텍스트 툴바 표시 시 커서가 멋대로 튐",
  "제목(heading) 안 각주가 마크다운 변환 시 처리 안 됨",
  "Plate inline void 노드에서 클릭 vs 키보드 구분 불가",
  "인라인 이미지 양옆에 커서 배치·텍스트 입력 불가",
  "마크다운 각주 번호 꼬임 — heading renderer 충돌",
  "열블록 스타일 round-trip 유실", // ↪ "토글/콜아웃/열블록 콘텐츠 사라짐" 과 주제 겹침
  "YouTube embed URL — watch URL이 iframe에서 로드 실패",
  "이미지 리사이즈 핸들 클릭 시 이미지가 삭제됨",
  "에디터 툴바 active 상태 — wrapper 블록 감지 실패",
  "각주 참조/내용 정합성 — 한쪽 삭제 시 고아 노드 잔존",
  "링크 클릭 시 즉시 이동 — 에디터에서 링크 편집 불가",
  "Plate 인라인 코드에서 방향키 커서 점프",

  // Animation & Interaction (4 hidden)
  "커스텀 커서 리사이즈 모드에서 마우스 방향에 따라 커서 회전",
  "Series Deck — hover 펼침이 \"사라졌다 나타나는\" 느낌",
  "Series Deck spread — `setPointerCapture` 가 자식 click 차단 + hit-area 공백으로 flicker", // ↪ HTML5 D&D 항목과 패턴 겹침
  "HTML5 drag 가 pointermove 를 막아 커스텀 커서가 멈추고 type 도 계속 바뀜", // ↪ HTML5 D&D quirks 항목에 통합

  // Component System (1 hidden)
  "Admin 리스트(시리즈/휴지통/게시물)의 UI 코드 중복과 스타일 불일치",

  // 메타에 등록되지 않은 기존 항목 — 컨텍스트가 오래되어 현재는 숨김
  "커스텀 RichTextEditor의 기능 확장 한계",
  "이미지 원본 무압축 업로드 — 10MB 초과 실패 + 네트워크 낭비",
]);

export const troubleShootingItems: TroubleShootingItem[] = (() => {
  const enriched = rawTroubleShootingItems
    .filter((item) => !DUPLICATE_PROBLEMS.has(item.problem.ko) && !HIDDEN_PROBLEMS.has(item.problem.ko))
    .map((item) => {
      const meta = itemMeta[item.problem.ko];
      if (!meta) return item;
      return {
        ...item,
        section: SECTION[meta.section],
        difficulty: meta.difficulty,
        ...(meta.recommended ? { recommended: true } : {}),
        ...(meta.featured ? { featured: true } : {}),
        ...(meta.recommendReason ? { recommendReason: meta.recommendReason } : {}),
      };
    });

  /* 대표 항목이 지정돼 있으면 그것만 보여준다.
     89개를 다 늘어놓으면 읽히지 않는다. 원본은 그대로 두고 여기서 골라낸다. */
  const featured = enriched.filter((i) => i.featured);
  const shown = featured.length > 0 ? featured : enriched;

  const sectionIndex = (sec?: { ko: string; en: string }) => {
    if (!sec) return 99;
    const found = SECTION_ORDER.findIndex((k) => SECTION[k].ko === sec.ko);
    return found < 0 ? 99 : found;
  };

  return shown.sort((a, b) => {
    const dSec = sectionIndex(a.section) - sectionIndex(b.section);
    if (dSec !== 0) return dSec;
    return (a.difficulty ?? 2) - (b.difficulty ?? 2);
  });
})();
