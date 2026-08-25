import type { TroubleShootingItem, TroubleshootingDiagram, ComparisonTable, TroubleshootingDifficulty } from "./types";
import type { LocalizedText } from "@/types/common";

// ── 통합 섹션 6개 ─────────────────────────────────────────────
// Architecture / Performance / Layout / Editor / Interaction / Component
const SECTION = {
  A: { ko: "인증 / 인가", en: "Authentication & Authorization" },
  D: { ko: "데이터 / 정합성", en: "Data & Integrity" },
  N: { ko: "인프라 / 자동화", en: "Infrastructure & Automation" },
  P: { ko: "성능", en: "Performance" },
  L: { ko: "레이아웃 / CSS", en: "Layout & CSS" },
  E: { ko: "Plate 에디터", en: "Plate Editor" },
  I: { ko: "애니메이션 / 인터랙션", en: "Animation & Interaction" },
  C: { ko: "컴포넌트 시스템", en: "Component System" },
} as const;

const SECTION_ORDER: Array<keyof typeof SECTION> = ["A", "D", "N", "P", "L", "E", "I", "C"];

/** 항목 id → 섹션/난이도/추천 매핑. 항목마다 inline 하지 않고 한 곳에서 관리한다.
 *  키는 반드시 `id` — 예전엔 problem.ko 문자열로 조인했는데, 한글 원문이 조금만
 *  달라져도(이스케이프 한 겹) 항목이 조용히 빠졌다. 아래 export 의 orphan 가드가 이를 막는다. */
const itemMeta: Record<
  string,
  {
    section: keyof typeof SECTION;
    difficulty: TroubleshootingDifficulty;
    recommended?: boolean;
    /** 추천 이유 — 항목별 차별점. IDE 에디터 @recommended 라인에 표시 */
    recommendReason?: LocalizedText;
  }
> = {
  // ── 설계 결정 (현재 노출 중) ──
  "role-stored-in-app-metadata": { section: "A", difficulty: 2 },
  "authorization-moves-to-code-when-rls-is-bypassed": { section: "A", difficulty: 3 },
  "single-auth-path-for-anonymous-comments": { section: "A", difficulty: 3 },
  "delete-is-a-reversible-state-change": { section: "D", difficulty: 1 },
  "optimistic-concurrency-with-a-version-counter": { section: "D", difficulty: 3 },
  "duplicate-prevention-belongs-in-the-database": { section: "D", difficulty: 2 },
  "revision-history-is-capped-per-entity": { section: "D", difficulty: 1 },
  "scheduled-jobs-run-inside-the-database": { section: "N", difficulty: 2 },
  "notification-failure-must-not-fail-the-job": { section: "N", difficulty: 2 },

  // ── 최근 추가 (에디터 색상 칩 — 인라인 코드로 리더·에디터 공통 렌더) ──
  "one-inline-code-token-for-color": {
    section: "E", difficulty: 2, recommended: true,
    recommendReason: {
      ko: "표시할 화면마다 색 렌더를 새로 짜는 대신, 색을 인라인 코드라는 이동 가능한 토큰으로 표현해 렌더러 하나를 공유한 사례라 골랐습니다.",
      en: "Picked this because, instead of writing color rendering per surface, it encodes the color as one portable inline-code token so every surface shares a single renderer.",
    },
  },
  // ── 최근 추가 (자동저장 롤백·sticky 유리 헤더) ──
  "editing-an-existing-post-made-auto": {
    section: "A", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "자동복원이 사용자의 최신 작업을 덮어쓴 데이터 안전 사고 — 낙관적 복원의 전제(신뢰 가능한 최신성 비교)를 짚으려 골랐습니다.",
      en: "A data-safety incident where auto-restore overwrote the user's latest work — picked to pin down the premise `optimistic restore` rests on: a trustworthy freshness comparison.",
    },
  },
  "restoring-a-deleted-comment-but-its": {
    section: "A", difficulty: 2, recommended: true,
    recommendReason: {
      ko: "\"복구\" 기능의 성패가 삭제 구현에 달렸다는 걸 보여주는, 데이터 보존 vs 노출 차단의 전형이라 골랐습니다.",
      en: "Picked because a restore feature's success hinges on how delete was built — the archetype of data-retention vs exposure-masking.",
    },
  },
  "in-a-two-column-settings-layout": {
    section: "L", difficulty: 2, recommended: true,
    recommendReason: {
      ko: "어긋난 요소가 아니라 \"부모가 왜 콘텐츠보다 큰가\" 를 봐야 했던, 정렬 문제의 전형이라 골랐습니다.",
      en: "Picked as the archetypal alignment bug where the answer is \"why is the parent taller than its content\", not the shifted element.",
    },
  },
  "the-parent-s-mount-time-fitview": {
    section: "I", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "\"아무 일도 안 일어남\" 의 원인이 호출 누락이 아니라 실행 순서였던 사례라 골랐습니다.",
      en: "Picked this because the cause of \"nothing happens\" wasn't a missing call but effect ordering.",
    },
  },
  "drop-was-silently-ignored-on-sql": {
    section: "A", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "부재로 의도를 표현하려던 자료 구조가 어디서 무너지는지 보여드리고 싶어 골랐습니다.",
      en: "Picked this to show where a data shape that encodes intent as absence falls apart.",
    },
  },
  "adding-icon-buttons-to-a-table": {
    section: "L", difficulty: 2,
  },
  // Architecture & Backend
  "accidental-post-deletion-with-no-recovery": { section: "A", difficulty: 3 },
  "ai-translation-summary-completely-down-on": { section: "A", difficulty: 3 },
  "every-api-key-change-requires-redeployment": { section: "A", difficulty: 2 },
  "tedious-identity-verification-for-guest-comments": { section: "A", difficulty: 3 },
  "revision-prompt-loops-due-to-category": { section: "A", difficulty: 2 },
  "where-to-store-member-roles-so": {
    section: "A", difficulty: 2, recommended: true,
    recommendReason: { ko: "이름이 비슷한 두 저장소의 신뢰 수준 차이가 곧 권한 시스템의 출발점이었던 사례라 골랐습니다.", en: "Picked this because the trust gap between two similarly-named stores was the very foundation of the permission system." },
  },
  "github-oauth-lets-anyone-with-an": { section: "A", difficulty: 2 },
  "forgetting-owner-email-deletes-the-owner": { section: "A", difficulty: 2, recommended: true,
    recommendReason: { ko: "설정 실수 하나가 계정 삭제로 이어지던 함정 — 부트스트랩을 fail-safe 하게 설계하는 관점을 보여드리려 골랐습니다.", en: "A single config slip deleted the account — picked to show designing bootstrap to fail safe, not fail destructive." },
  },
  "logged-in-as-owner-yet-other": { section: "A", difficulty: 2 },
  // Performance
  "recaptcha-v3-initial-load-performance-degradation": { section: "P", difficulty: 3 },
  "react-re-render-on-every-mousemove": { section: "P", difficulty: 2 },
  "heavy-cursor-hit-test-dragging-down": {
    section: "P", difficulty: 3, recommended: true,
    recommendReason: { ko: "측정으로 병목을 찾고 RAF 주기를 분리해 60fps 를 회복한 성능 최적화 경험입니다.", en: "Profiled the bottleneck and split the RAF loop to restore 60fps — measurement-driven optimization." },
  },
  "loadingscreen-not-included-in-ssr-content": { section: "P", difficulty: 2 },
  "menu-drawer-font-stuck-on-fallback": { section: "P", difficulty: 1 },
  // Layout & CSS
  "layout-jumps-when-toggling-code-block": { section: "L", difficulty: 2 },
  "global-transition-shorthand-overriding-component-transitions": { section: "L", difficulty: 2, recommended: true,
    recommendReason: { ko: "원인이 코드가 아닌 CSS 명세에 있던 케이스 — spec 단위까지 파고드는 디버깅 습관을 보여드리려 골랐습니다.", en: "Bug lived in the CSS spec, not in the code — picked this to show spec-level debugging." },
  },
  "only-some-section-dividers-look-darker": { section: "L", difficulty: 2 },
  "cta-button-backdrop-filter-blurs-nothing": {
    section: "L", difficulty: 3, recommended: true,
    recommendReason: { ko: "GPU compositing layer 까지 추적해 원인을 짚은 사례 — 끝까지 원인을 좇는 태도를 보여드리고 싶었습니다.", en: "Traced it down to the GPU compositing layer — wanted to show I chase the root cause." },
  },
  "admin-table-row-border-cuts-off": { section: "L", difficulty: 3 },
  "posts-bento-grid-template-rows-alone": { section: "L", difficulty: 3 },
  "sticky-filterbar-intersectionobserver-1px-drift-against": { section: "L", difficulty: 2 },
  "navigation-menu-overlaps-the-right-actions": { section: "L", difficulty: 2 },
  "cover-image-palette-and-other-grid": { section: "L", difficulty: 2 },
  "css-var-chains-don-t-resolve": {
    section: "L", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "DevTools 의 친절한 표시를 그대로 JS API 라고 가정한 함정 — multi-tier 토큰 시스템에서 JS↔CSS 경계가 어디인지 보여주는 사례라 골랐습니다.",
      en: "I assumed DevTools' helpful display matched the JS API — picked this because it shows exactly where the JS↔CSS boundary lives in a multi-tier token system.",
    },
  },
  "the-system-resize-cursor-leaks-over": {
    section: "L", difficulty: 2, recommended: true,
    recommendReason: { ko: "UA 가 그리는 요소의 페인트 순서(자식 위·형제 아래)까지 파고들어야 풀리던 CSS 함정이라 골랐습니다.", en: "Picked this CSS trap because it only resolved once I dug into the paint order of UA-drawn chrome (above children, below siblings)." },
  },
  "on-mobile-the-erd-diagram-collapses": { section: "L", difficulty: 2, recommended: true,
    recommendReason: {
      ko: "`height:100%` 가 0 으로 죽는 원인을 CSS 명세의 definite height 규칙까지 거슬러 올라가 짚은 사례라 골랐습니다.",
      en: "Picked this because I traced why `height:100%` collapses to 0 all the way back to the CSS spec's definite-height rule.",
    },
  },
  "a-frosted-blur-on-the-sticky": { section: "L", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "`overflow-x:auto` 의 양축 클립과 Lenis transform 스크롤 위 `backdrop-filter` 라는 두 함정이 겹친 걸 분리해 푼 사례라 골랐습니다.",
      en: "Picked this because two traps stacked — `overflow-x:auto` clipping both axes and `backdrop-filter` under Lenis's transform scroll — and I separated them to solve it.",
    },
  },
  // Plate Editor
  "code-highlighting-wrap-button-vanishing-on": { section: "E", difficulty: 2 },
  "cursor-jumping-randomly-when-contextual-toolbar": { section: "E", difficulty: 3 },
  "toggle-callout-and-column-block-content": {
    section: "E", difficulty: 3, recommended: true,
    recommendReason: { ko: "라이브러리 기본값을 의심하고 검증해 사용자 데이터 손실을 막은 경험입니다.", en: "Questioned and verified a library default to prevent user data loss." },
  },
  "code-highlighting-dies-only-in-the": { section: "E", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "빌드도 테스트도 통과하는데 브라우저에서만 죽는 버그를, 증거가 나올 때까지 추적해 라이브러리 밖에서 해결한 사례라 골랐습니다.",
      en: "Picked this because build and tests both passed while only the browser broke — traced it to real evidence and fixed it from outside the library.",
    },
  },
  "after-select-all-delete-in-a": { section: "E", difficulty: 3 },
  "footnotes-inside-headings-not-processed-during": { section: "E", difficulty: 3 },
  "cannot-distinguish-click-vs-keyboard-for": { section: "E", difficulty: 3 },
  "cannot-place-cursor-or-type-next": { section: "E", difficulty: 3 },
  "dragging-selecting-the-text-next-to": {
    section: "E", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "데이터(노드 분리)·레이아웃(CSS float)·입력(capture)을 한꺼번에 다뤄야 풀리는 다층 문제를 끝까지 추적한 사례라 골랐습니다.",
      en: "Picked this as a multi-layer bug — data (node split), layout (CSS float), and input (capture) all had to move together; shows end-to-end root-cause tracing.",
    },
  },
  "youtube-embed-url-watch-url-fails": { section: "E", difficulty: 1 },
  "image-resize-handle-click-deletes-image": { section: "E", difficulty: 2 },
  "editor-toolbar-active-state-wrapper-block": { section: "E", difficulty: 2 },
  "footnote-ref-content-integrity-orphan-nodes": { section: "E", difficulty: 2 },
  "link-click-immediately-navigates-cannot-edit": { section: "E", difficulty: 1 },
  "plate-inline-code-arrow-key-cursor": { section: "E", difficulty: 2 },
  "multi-block-selection-background-covers-floated": {
    section: "E", difficulty: 3, recommended: true,
    recommendReason: { ko: "여러 정공법(z-index/BFC/clip-path)이 디자인 제약 때문에 차례로 막힌 끝에, 영역 자체를 둘로 쪼개고 layout 을 관찰해 CSS 변수로 주입한 과정을 보여드리고 싶어 골랐습니다.", en: "Picked this because each textbook fix (z-index / BFC / clip-path) was blocked by a design constraint in turn, ending with splitting the region in two and feeding measured layout into CSS variables." },
  },
  "clicking-a-floated-image-inline-void": { section: "E", difficulty: 2 },
  // Animation & Interaction
  "page-transition-stuck-at-hold-skeleton": { section: "I", difficulty: 3 },
  "after-the-transition-morph-clears-the": {
    section: "I", difficulty: 3, recommended: true,
    recommendReason: { ko: "\"두 시스템 사이의 timing mismatch\" 로 가설을 다시 잡고 Next.js Suspense 동작까지 추적한 디버깅 흐름을 보여드리고 싶었습니다.", en: "Reframed the hypothesis from \"one bug\" to \"two systems with mismatched timing\" and traced down Next.js Suspense fallback behavior." },
  },
  "series-deck-hover-unfold-disappears-then": { section: "I", difficulty: 3 },
  "working-around-html5-d-d-quirks": {
    section: "I", difficulty: 3, recommended: true,
    recommendReason: { ko: "\"표준 API 라서 옳다\" 는 가정을 깨고 도구를 다시 고른 경험을 보여드리고 싶었습니다.", en: "Questioned the \"standard API is best\" assumption and re-picked the tool." },
  },
  "image-fallback-react-onerror-doesn-t": { section: "I", difficulty: 3 },
  // Component System
  "admin-list-series-trash-posts-ui": { section: "C", difficulty: 2 },
  "custom-colorpicker-popover-anchors-to-the": { section: "C", difficulty: 2 },
  "anonymous-comment-edit-delete-client-required": {
    section: "A", difficulty: 3, recommended: true,
    recommendReason: { ko: "\"클라가 강제한다\" 와 \"서버가 강제한다\" 의 간극을 위협 모델 관점에서 다시 짚은 보안 사례입니다.", en: "Picked this for the threat-model gap between \"client enforces\" and \"server enforces\" — and how OR-ing auth paths collapses to the weakest." },
  },
  "public-api-all-true-leaked-all": { section: "A", difficulty: 3,
  },
  "popular-post-defined-in-three-places": { section: "A", difficulty: 2, recommended: true,
    recommendReason: { ko: "같은 도메인 개념 (\"인기\") 의 정의가 silent 하게 분산된 상태를 single source of truth 로 통합한 경험 — reasoning 비용과 모순 위험을 동시에 줄인 사례입니다.", en: "Caught the same domain concept (\"popular\") silently fragmented across three call sites and unified it into a single source of truth — cut both reasoning cost and the risk of contradiction." },
  },
  // Component System
  "lenis-infinite-scroll-silently-sticks-across": {
    section: "A", difficulty: 2, recommended: true,
    recommendReason: { ko: "convention 자체가 버그의 원인이었던 케이스 — \"cleanup 은 원복\" 이라는 무의식적 가정이 페이지 간 silent state leak 을 만든 경험입니다.", en: "The convention itself was the bug — the unconscious \"cleanup restores\" assumption created a silent cross-page state leak." },
  },
  // Layout & CSS — PostCard meta separator wrap
  "postcard-meta-separator-leaks-to-the": {
    section: "L", difficulty: 2,
  },

  // Architecture — autosave / draft / revision overhaul (v2)
  "auto-save-v2-character-level-draft": { section: "A", difficulty: 3, recommended: true,
    recommendReason: { ko: "한 번 리팩토링한 시스템이라도 사용해 보면 새 결함이 보인다는 걸 보여드리고 싶어 골랐습니다 — 같은 도메인을 두 번째로 다시 설계한 과정입니다.", en: "Picked this because even a 'refactored' system shows new flaws once it's lived in — a second pass at the same domain." },
  },

  // Architecture — Admin works sort_order normalize
  "admin-works-sort-order-partial-shift": {
    section: "A", difficulty: 2, recommended: true,
    recommendReason: { ko: "\"내가 만진 부분만\" 부분 보정에서 \"전체를 한 번 정리\" 로 관점을 바꾼 사례입니다. 데이터 누적 결함을 부분 패치로 따라가지 않고 매 mutation 마다 dense 1..N 로 normalize 해 시간이 지나도 시작 상태가 같도록 만든 결정을 보여드리고 싶었습니다.", en: "Picked this for the shift from 'fix the parts I touched' to 'normalize the whole table on every mutation' — refusing to chase accumulated data damage with partial patches, and instead making the table's starting state identical no matter how it got there." },
  },

  // Cross-platform / UX — Touch device hover
  "touch-devices-have-no-hover-desktop": {
    section: "I", difficulty: 2,
  },

  // Custom cursor — draggable row child button
  "hovering-a-button-inside-a-draggable": {
    section: "I", difficulty: 2,
  },

  // Layout & CSS — OKLCH color system migration
  "hsl-color-tokens-look-uneven-across": { section: "L", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "\"수학적 평균\" 과 \"지각 밝기\" 가 다르다는 색 공간 차원의 문제를 색 시스템 전반에 OKLCH 로 옮기고, sRGB clipping 회피 위한 hue 별 safeChroma 까지 명시한 사례입니다.",
      en: "Moved an entire color system from HSL to OKLCH after recognizing the gap between math-average and perceived brightness, then added per-hue safeChroma tables to dodge sRGB clipping.",
    },
  },

  // Layout & CSS — CSS Module orphan classes (DetailLayout refactor)
  "after-absorbing-page-boilerplate-into-the": {
    section: "L", difficulty: 2, recommended: true,
    recommendReason: {
      ko: "CSS Module 의 dot 접근이 \"없으면 undefined\" 라는 사실 + React 가 undefined className 을 silent 하게 drop 한다는 두 가지가 만나 silent failure 가 되는 함정 — shared component 추출 리팩토링에서 가장 흔합니다.",
      en: "When CSS Module dot access returns undefined and React silently drops undefined className, you get a silent failure that's particularly common when extracting into shared components.",
    },
  },

  // Component System — TSX parser `!` misparse
  "wanted-per-character-background-highlight-inside": {
    section: "C", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "native form element 의 근본 한계를 마주쳤을 때 \"overlay sync\" 가 아니라 \"element replace\" 로 결정한 사례 — 브라우저가 직접 그리는 visual artifact 는 어떤 JS 로도 sync 불가능하다는 원칙.",
      en: "Hit a fundamental textarea limitation and chose 'replace the element' over 'sync with overlay' — the principle that browser-rendered visual artifacts can't be synchronized from JS no matter what.",
    },
  },

  // Animation & Interaction — Native cursor 위 custom cursor (overlay 가로채기)
  "on-a-textarea-s-resize-handle": {
    section: "I", difficulty: 2, recommended: true,
    recommendReason: {
      ko: "native UI element 의 cursor 가 일반 CSS 영역 밖이라 가릴 수 없을 때 \"native 인터랙션 자체를 가로채기\" 로 우회한 패턴 — visual 은 native 그대로 두고 pointer 만 가져오는 hybrid 접근.",
      en: "When a native element's cursor lives outside CSS reach, the fix is to take over the *interaction* (not the visual) — a hybrid pattern that keeps the native look but routes the pointer through your own code.",
    },
  },

  // Architecture & Backend — pg_cron + pg_net + Vault
  "scheduled-publish-trash-purge-bound-to": {
    section: "A", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "\"호스팅 기본 기능으로 빠르게 시작\" 의 단계를 끝내고, 데이터 작업을 데이터가 있는 곳 (DB) 안으로 옮긴 결정입니다. fail-soft 알림 설계 + setup.sql 의 idempotency 까지 같이 보여드리려 골랐습니다.",
      en: "Picked this to show the step from \"start with the host's built-in feature\" to \"data work lives where the data is.\" Also includes the fail-soft notification design and the setup.sql idempotency detail.",
    },
  },

  // Component System / Animation / CSS — Tech Stack 칩 에디터 세션
  "editor-top-bar-won-t-pin": {
    section: "L", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "sticky 가 안 되는 이유를 \"스크롤되는 조상이 없다\" 까지 좁히고, fixed + ResizeObserver spacer + capture 단계 scroll 로 우회한 사례 — 증상이 아닌 스크롤 모델까지 파고든 디버깅을 보여드리려 골랐습니다.",
      en: "Narrowed why sticky failed down to \"no actually-scrolling ancestor,\" then worked around it with fixed + a ResizeObserver spacer + capture-phase scroll — picked it to show debugging that goes into the scroll model, not the symptom.",
    },
  },

  // Animation & Interaction — carousel child click vs drag
  "editor-preview-drifts-from-the-published": {
    section: "A", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "\"미리보기를 본화면에 맞춘다\" 가 아니라 \"같은 컴포넌트·같은 처리 함수를 쓰게 만들어 drift 자체를 불가능하게\" 로 관점을 바꾼 사례입니다.",
      en: "Picked this for the shift from \"keep the preview matched to the real screen\" to \"make both use the same component and processing function so drift becomes impossible.\"",
    },
  },

  // Layout & CSS — float figure margin
  "comment-markdown-checkboxes-never-rendered-dompurify": {
    section: "A", difficulty: 3, recommended: true,
    recommendReason: {
      ko: "허용 목록에 분명히 넣었는데 사라지는, 에러 한 줄 없는 조용한 실패 — 설정 키 하나가 다른 키의 허용을 덮고 있다는 걸 라이브러리 내부 규칙까지 읽어서 찾아낸 사례입니다.",
      en: "A silent failure with no error at all — the attribute was explicitly allowlisted yet vanished. Picked this because the fix required reading the library's internal rules to find one config key quietly overruling another.",
    },
  },

  // Plate Editor — normalizer 무한루프
  "switching-column-widths-to-froze-the": {
    section: "E", difficulty: 3,
  },

  // Plate Editor — decorate leaf + mark leaf hook 순서 충돌
  "formatting-text-inside-a-code-block": { section: "E", difficulty: 3,
  },
};

const rawTroubleShootingItems: TroubleShootingItem[] = [
  {
    id: "role-stored-in-app-metadata",
    section: { ko: "Backend / Auth", en: "Backend / Auth" },
    vizKey: "perm-store",
    problem: {
      ko: "역할·권한을 사용자 metadata 중 어디에 저장할 것인가",
      en: "Where to store roles and permissions in user metadata",
    },
    title: { ko: "권한 데이터의 신뢰 경계 설계", en: "Designing the trust boundary for permission data" },
    definition: {
      ko: "처음에는 관리자 계정 하나만 존재했기 때문에 별도의 권한 체계가 필요하지 않았다. 하지만 여러 명의 저자를 초대할 수 있도록 기능을 확장하면서, 계정마다 어디까지 관리할 수 있는지 권한을 설정할 필요가 있었다.\n\n권한은 세 단계로 나눴다.\n\n1. 사이트 설정과 저자 관리까지 할 수 있는 소유자\n2. 모든 글을 수정할 수 있는 저자\n3. 자신이 작성한 글만 수정할 수 있는 저자\n\n그러면 서버는 관리자 화면에서 요청을 받을 때마다 최소한 두 가지를 확인해야 한다.\n\n1. 요청을 보낸 계정의 역할이 무엇인가\n2. 그 역할로 요청한 작업을 수행할 수 있는가\n\n여기서 한 가지 결정할 것이 생긴다. **서버가 신뢰해야 하는 역할 정보를 어디에 저장하고, 어떻게 가져올 것인가.**\n\n이 프로젝트는 로그인과 인증에 `Supabase Auth` 를 사용한다. Supabase Auth 는 사용자마다 `user_metadata` 와 `app_metadata` 라는 두 개의 메타데이터 영역을 제공한다. 둘 다 사용자 정보에 포함되고 서비스에서 필요한 데이터를 저장할 수 있다. 따라서 Supabase 가 제공하는 사용자 메타데이터에 저장하는 방법을 우선 생각할 수 있고, 별도의 데이터베이스 테이블에 저장하는 방법도 고려할 수 있다.",
      en: "With a single admin account there was no need for a permission model. Opening the site up to multiple authors changed that: each account needed a defined reach.\n\nPermissions were split into three tiers.\n\n1. An owner, who also manages site settings and authors\n2. An author who can edit every post\n3. An author who can edit only their own posts\n\nThe server then has to establish at least two things on every admin request.\n\n1. What role does the calling account hold\n2. Does that role allow the requested operation\n\nWhich raises a decision. **Where should the role the server must trust be stored, and how should it be read?**\n\nThis project uses `Supabase Auth` for sign-in. Supabase Auth gives every user two metadata areas, `user_metadata` and `app_metadata`. Both travel with the user record and both can hold whatever a service needs. So the metadata Supabase already provides is the first candidate, and a dedicated database table is the other.",
    },
    cause: {
      ko: "### 1. user_metadata\n\n우선 `user_metadata` 에 저장하는 경우를 가정해 보자. 이미 사용자 정보에 포함되어 있고 별도의 테이블을 만들 필요도 없다. 예를 들어 이런 식으로 저장할 수 있다.\n\n```json\n{ \"role\": \"author\", \"permission_level\": 1 }\n```\n\n그런데 Supabase Auth 는 로그인한 사용자가 자신의 정보를 수정할 수 있도록 `updateUser()` API 를 제공한다.\n\n```ts\nawait supabase.auth.updateUser({\n  data: { displayName: \"새 이름\" },\n});\n```\n\n문제는 이 요청이 **사이트의 API 를 거치지 않고 클라이언트에서 Supabase Auth 로 직접 전달된다**는 것이다. 인증된 세션만 있으면, 사이트가 그 정보를 수정하는 화면을 제공하지 않아도 사용자가 자기 정보를 바꿀 수 있다.\n\n[[viz]]\n\n예를 들어 사용자는 브라우저 콘솔에서 직접 `updateUser()` 를 호출할 수 있다.\n\n```ts\nawait supabase.auth.updateUser({\n  data: { role: \"owner\" },\n});\n```\n\n서버가 `user_metadata.role` 을 기준으로 권한을 판단한다면, 저자가 자신의 역할을 `owner` 로 바꾼 뒤 소유자 권한을 얻을 수 있다. 결국 서버는 그 데이터를 권한 판단의 근거로 신뢰할 수 없다. Supabase 공식 문서도 `user_metadata` 를 **보안에 민감한 정보나 인가 로직에 쓰지 말라**고 명시한다.\n\n**권한 정보를 저장할 때는 사용자가 자신의 권한을 변경할 수 없어야 한다.** 표시 이름이나 알림 설정처럼 사용자가 자유롭게 바꿔도 되는 값과 달리, 권한은 서버가 인가 여부를 판단하기 위해 신뢰해야 하는 값이기 때문이다.\n\n### 2. app_metadata\n\n`app_metadata` 도 사용자 정보에 포함되지만 수정 방식이 다르다. 일반적인 클라이언트 요청으로는 수정할 수 없고, 변경하려면 서버에서 관리자 권한을 사용해야 한다.\n\n[[viz]]\n\n`service-role` 키는 데이터베이스의 접근 제한을 모두 통과하기 때문에 클라이언트에 노출하지 않고 서버에서만 사용한다. 즉 이 구조에서는 **권한을 변경할 수 있는 주체를 서버로 제한할 수 있다**. 따라서 `role` 이나 `permission_level` 처럼 사용자가 임의로 바꿔서는 안 되는 값은 `app_metadata` 에 저장하는 것이 적합하다.\n\nSupabase 공식 문서에서도 `raw_app_meta_data` 는 사용자가 업데이트할 수 없어 인가 데이터를 저장하기에 적합하다고 설명한다. 반대로 `raw_user_meta_data` 는 인증된 사용자가 수정할 수 있어 적합하지 않다고 명시한다.\n\n### 3. 별도의 권한 테이블\n\n역할 정보를 Supabase Auth 의 사용자 정보에 넣지 않고, 애플리케이션 데이터베이스에서 따로 관리하는 방법도 있다.\n\n```sql\nuser_permissions\n  user_id\n  role\n  permission_level\n  author_id\n```\n\n저장과 변경을 모두 서버에서 관리하므로, 이 방법 역시 사용자가 자기 권한을 임의로 바꾸는 문제를 막을 수 있다. 두 방식의 보안 조건이 비슷하다면, 다음은 실제로 권한을 사용하는 과정을 비교할 차례다.\n\n서버가 관리자 요청을 처리할 때는 요청자가 실제로 인증된 사용자인지 먼저 확인해야 한다. 이 프로젝트에서는 `supabase.auth.getUser()` 가 그 역할을 한다. 그리고 `getUser()` 가 돌려주는 사용자 정보에는 `app_metadata` 가 포함되어 있다.\n\n[[viz]]\n\n따라서 `app_metadata` 에 역할을 저장하면 역할을 확인하려고 **조회를 추가할 필요가 없다**. 인증 확인으로 이미 받아 온 사용자 정보 안에 역할이 함께 들어 있기 때문이다. 반면 별도의 권한 테이블을 쓰면 `getUser()` 의 결과만으로는 역할을 알 수 없어, 권한을 확인할 때마다 그 테이블을 한 번씩 더 조회해야 한다.\n\n### 권한이 변경된다면\n\n역할에는 한 가지 특성이 더 있다. **고정된 값이 아니다.** 소유자는 기존 멤버의 권한을 나중에 바꿀 수 있다. 모든 글을 수정할 수 있던 저자를 자기 글만 수정할 수 있는 저자로 내리는 것도 가능하다. 그래서 서버가 오래된 권한으로 요청을 처리하지 않는지도 확인해야 한다.\n\n서버는 브라우저가 들고 있는 세션의 사용자 정보를 그대로 믿는 대신 `supabase.auth.getUser()` 를 호출한다. `getUser()` 는 Auth 서버에 네트워크 요청을 보내 access token 을 검증하고 현재 사용자 정보를 다시 확인한다. 따라서 서버의 권한 판단은 클라이언트가 들고 있는 사용자 객체가 아니라 **Auth 서버에서 확인한 값**을 기준으로 한다.\n\n반면 관리자 화면은 바뀐 권한에 맞춰 메뉴를 다시 그려야 한다. 권한을 바꾸는 쪽(소유자)과 영향을 받는 쪽(대상 계정)이 서로 다른 사용자라 응답으로는 전달할 수 없어서, 권한을 변경한 서버가 대상 계정 채널로 Realtime broadcast 를 보내고 받은 쪽이 세션을 새로 고친다. 다만 이것은 어디까지나 **화면을 최신 권한에 맞추기 위한 처리**다. 실제로 요청을 허용할지는 언제나 서버가 판단한다.",
      en: "### 1. user_metadata\n\nStart with `user_metadata`. It already travels with the user record and needs no table of its own. It could hold something like this.\n\n```json\n{ \"role\": \"author\", \"permission_level\": 1 }\n```\n\nBut Supabase Auth exposes `updateUser()` so that a signed-in user can edit their own record.\n\n```ts\nawait supabase.auth.updateUser({\n  data: { displayName: \"New name\" },\n});\n```\n\nThe catch is that this request **goes straight from the client to Supabase Auth without passing through the site's API**. An authenticated session is enough; the site does not have to offer an edit screen for the user to change their own record.\n\n[[viz]]\n\nA user can call `updateUser()` from the browser console.\n\n```ts\nawait supabase.auth.updateUser({\n  data: { role: \"owner\" },\n});\n```\n\nIf the server decided permissions from `user_metadata.role`, an author could rewrite their role as `owner` and take owner access. The server cannot treat that value as evidence. Supabase's own documentation says not to use `user_metadata` for security-sensitive information or authorization logic.\n\n**Permission data has to be something the user cannot change about themselves.** Unlike a display name or a notification preference, which the user is free to set, a permission is a value the server must trust in order to authorize.\n\n### 2. app_metadata\n\n`app_metadata` also travels with the user record, but it is written differently. An ordinary client request cannot modify it; changing it requires admin credentials on the server.\n\n[[viz]]\n\nThe `service-role` key clears every access restriction in the database, so it is never exposed to the client and lives only on the server. That structure **confines permission changes to the server**. Values a user must not set for themselves — `role`, `permission_level` — therefore belong in `app_metadata`.\n\nSupabase's documentation says the same: `raw_app_meta_data` cannot be updated by the user and is suitable for authorization data, while `raw_user_meta_data` can be updated by an authenticated user and is not.\n\n### 3. A dedicated permissions table\n\nThe role could also live outside Supabase Auth, in the application's own database.\n\n```sql\nuser_permissions\n  user_id\n  role\n  permission_level\n  author_id\n```\n\nStorage and updates both stay on the server, so this option also prevents a user from rewriting their own permission. With the security properties comparable, the next question is what each costs at read time.\n\nHandling an admin request starts by confirming the caller is authenticated, which in this project is `supabase.auth.getUser()`. The user record it returns already contains `app_metadata`.\n\n[[viz]]\n\nStoring the role in `app_metadata` therefore **adds no query** — the role arrives inside the record the auth check already fetched. With a dedicated table, `getUser()` alone cannot tell you the role, so every permission check costs one more query against that table.\n\n### When permissions change\n\nRoles have one more property: **they are not fixed.** An owner can change an existing member's permission later, demoting an editor to an author who may only touch their own posts. So the server also has to avoid deciding on a stale permission.\n\nRather than trusting the user record held in the browser's session, the server calls `supabase.auth.getUser()`. That call sends a network request to the Auth server, validates the access token, and re-reads the current user record. The server's decision therefore rests on **what the Auth server confirms**, not on the client's copy.\n\nThe admin screen, on the other hand, has to redraw its menus for the new permission. The account making the change (the owner) and the account affected are different users, so the answer cannot carry it. Instead the server broadcasts on the target account's Realtime channel and the receiving client refreshes its session. That is purely **about keeping the screen current**. Whether a request is allowed is always decided by the server.",
    },
    solution: {
      ko: "현재 프로젝트에서 관리할 권한 정보는 `role`, `permission_level`, `author_id` 정도로 복잡하지 않다. 이 정도를 사용자 정보에 함께 저장해도 구조적으로 문제가 없으므로, 권한 확인을 위해 조회를 하나 더 붙이는 것보다 `app_metadata` 에 함께 저장하는 쪽이 이 구조에 더 맞다고 판단했다.\n\n```json\n{\n  \"role\": \"author\",\n  \"permission_level\": 1,\n  \"author_id\": \"...\"\n}\n```\n\n서버는 `getUser()` 로 가져온 사용자 정보에서 `app_metadata` 를 읽어 역할을 판단한다.\n\n```ts\nexport function getUserRole(user: User | null | undefined): UserRole {\n  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;\n  const isOwner = meta.role === \"owner\"\n    || (!!ownerEmail && user.email?.toLowerCase() === ownerEmail);\n  if (isOwner) return { role: \"owner\", level: Infinity, authorId, isOwner: true };\n  ...\n}\n```\n\n결과적으로 요청 처리는 이렇게 정리된다.\n\n[[viz]]\n\n마지막 단계인 대상 글 확인은 `canEditPost` 가 맡는다. 소유자와 모든 글을 수정할 수 있는 저자는 그대로 통과하고, 자기 글만 수정할 수 있는 저자는 글의 `author_ids` 에 자신이 포함된 경우에만 통과한다.",
      en: "The permission data this project has to manage is not complex — `role`, `permission_level`, `author_id`. Carrying that much inside the user record poses no structural problem, so storing it in `app_metadata` fits this design better than adding a query for every permission check.\n\n```json\n{\n  \"role\": \"author\",\n  \"permission_level\": 1,\n  \"author_id\": \"...\"\n}\n```\n\nThe server reads `app_metadata` off the user record returned by `getUser()` and resolves the role from it.\n\n```ts\nexport function getUserRole(user: User | null | undefined): UserRole {\n  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;\n  const isOwner = meta.role === \"owner\"\n    || (!!ownerEmail && user.email?.toLowerCase() === ownerEmail);\n  if (isOwner) return { role: \"owner\", level: Infinity, authorId, isOwner: true };\n  ...\n}\n```\n\nRequest handling then reduces to this.\n\n[[viz]]\n\nThe final step, the per-post check, is handled by `canEditPost`. An owner and an editor pass straight through; an author passes only when their id appears in the post's `author_ids`.",
    },
    keyInsight: {
      ko: "**서버가 신뢰해야 하는 값은, 신뢰할 수 있는 경계 안에서만 변경되고 확인되도록 설계해야 한다.**\n\n권한 정보는 일반적인 사용자 설정과 다르게 다뤄야 한다. 표시 이름이나 알림 설정은 사용자가 직접 바꿔도 서비스의 권한 판단에 영향을 주지 않는다. 반면 `role` 이나 `permission_level` 은 서버가 요청을 허용할지 결정하는 기준이다.\n\n따라서 두 종류의 데이터를 같은 방식으로 다루면 안 된다. 사용자가 자신의 권한을 바꿀 수 없어야 하고, 권한을 바꾸는 작업 역시 서버가 통제할 수 있어야 한다. 또 권한이 바뀔 수 있는 값이라면 서버가 오래된 정보로 판단하지 않도록 요청 시점의 값을 확인해야 한다.\n\n결국 권한 데이터에서 중요한 것은 단순히 **어디에 저장하는가**가 아니다. **누가 바꿀 수 있고, 서버는 어떤 경로로 그 값을 신뢰할 것인가**를 함께 설계하는 일이다.",
      en: "**A value the server must trust should only be changed and verified inside a boundary the server can trust.**\n\nPermission data cannot be handled like ordinary user settings. A display name or a notification preference can be changed by the user without affecting any authorization decision. `role` and `permission_level` are what the server decides requests on.\n\nThe two kinds of data therefore cannot share a mechanism. The user must not be able to change their own permission, and changing a permission has to stay under the server's control. And because a permission can change later, the server has to read the value as of the request rather than an older copy.\n\nWhat matters about permission data is not simply **where it is stored**. It is designing **who can change it, and through which path the server comes to trust it**.",
    }
  },
  {
    id: "authorization-moves-to-code-when-rls-is-bypassed",
    section: { ko: "Backend / Security", en: "Backend / Security" },
    vizKey: "all-param-leak",
    problem: {
      ko: "공개 API 가 관리자 화면의 초안·휴지통 조회까지 겸할 때 인가를 어디서 할 것인가",
      en: "Where to authorize when one public API also serves the admin screen's drafts and trash",
    },
    title: { ko: "인가 판정을 코드에서 데이터베이스 규칙으로 옮긴다", en: "Moving the authorization decision from code into database rules" },
    definition: {
      ko: "글 목록을 내려주는 API 가 하나 있다. 방문자가 목록 화면을 열면 이 API 가 발행된 글을 돌려준다.\n\n관리자 화면도 같은 목록이 필요한데, 여기서는 아직 발행하지 않은 초안과 휴지통에 있는 글까지 보여야 한다. API 를 새로 만드는 대신 같은 API 에 조건을 붙여 쓰기로 했다. 주소 뒤에 `?all=true` 를 붙이면 초안까지, `?trash=true` 를 붙이면 휴지통까지 돌려주는 방식이다.\n\n문제는 이 조건이 붙은 요청에도 **서버가 로그인 여부를 확인하지 않았다**는 점이다. 주소만 알면 누구나 초안을 읽을 수 있었다.",
      en: "One API returns the list of posts. When a visitor opens the list screen, it returns published posts.\n\nThe admin screen needs the same list, except it also has to show unpublished drafts and everything sitting in the trash. Rather than build a second API, the same one was reused with query parameters: `?all=true` includes drafts, `?trash=true` includes the trash.\n\nThe problem was that the server never checked whether the caller was signed in when those parameters were present. Knowing the URL was enough to read the drafts.",
    },
    cause: {
      ko: "데이터베이스에 접근하는 방법이 두 가지다.\n\n하나는 요청자의 로그인 세션을 그대로 넘기는 방식이다. 이 경우 Row Level Security 가 작동한다. 테이블마다 누가 어떤 행을 볼 수 있는지 규칙을 미리 걸어 두면, 데이터베이스가 요청자를 보고 알아서 걸러 준다. 코드가 조건을 빠뜨려도 데이터베이스가 막는다.\n\n다른 하나는 service-role 키를 쓰는 방식이다. 이 키는 그 규칙을 전부 통과한다.\n\n당시 이 테이블에 걸려 있던 규칙은 하나뿐이었다. **발행된 글만 보인다.** 초안은 그 규칙에 걸리므로, 관리자 화면이 초안을 보려면 규칙을 통과하는 키를 쓸 수밖에 없다고 판단했다.\n\n두 번째를 쓰는 순간 요청자가 관리자인지 확인할 책임이 **데이터베이스에서 API 코드로 넘어온다**. 그 확인이 빠져 있었다.\n\n그런데 이 판단에는 확인하지 않은 전제가 하나 있다. 규칙이 볼 수 있는 것을 **행의 값뿐이라고 여긴 것**이다. 규칙은 그 행이 발행됐는지만이 아니라 요청자가 누구인지도 볼 수 있다. \"발행된 글이거나, 요청자가 관리자이면 보인다\" 를 규칙으로 쓸 수 있다면 우회할 이유 자체가 사라진다.",
      en: "There are two ways to reach the database.\n\nThe first forwards the caller's session. That keeps Row Level Security in play: each table carries rules about who may see which rows, and the database filters by caller on its own. Even if the code forgets a condition, the database still refuses.\n\nThe second uses the service-role key, which clears all of those rules.\n\nAt the time this table carried exactly one rule: **only published posts are visible.** Drafts fall outside it, so the conclusion was that an admin screen needing drafts had no choice but the key that clears the rule.\n\nThe moment you take that second path, confirming that the caller is an administrator moves from the database into the API code. That confirmation was missing.\n\nBut that conclusion rests on an assumption nobody checked: that a rule can only look at **the values in the row**. A rule can also look at who is asking. If \"visible when the post is published, or when the caller is an administrator\" can be written as a rule, the reason to bypass disappears.",
    },
    solution: {
      ko: "규칙이 요청자를 보려면 요청 안에 역할이 실려 있어야 한다. 이 프로젝트는 역할을 `app_metadata` 에 저장하고, 그 값은 로그인할 때 발급되는 access token 안에 함께 들어간다. 데이터베이스는 그 토큰을 `auth.jwt()` 로 읽을 수 있다. 조회를 따로 붙이지 않아도 규칙이 역할을 알 수 있다는 뜻이다.\n\n그래서 토큰에서 역할을 꺼내는 함수를 만들고, 규칙이 그 함수를 쓰도록 했다.\n\n```sql\nCREATE FUNCTION is_admin() RETURNS boolean AS $$\n  SELECT app_role() = 'owner' OR app_level() >= 2;\n$$;\n\nCREATE FUNCTION can_edit_post(target_author_ids text[]) RETURNS boolean AS $$\n  SELECT is_owner()\n      OR app_level() >= 2\n      OR (app_role() = 'author'\n          AND app_author_id() = ANY (coalesce(target_author_ids, '{}')));\n$$;\n```\n\n글 테이블에는 이 함수를 쓰는 규칙을 걸었다. 조회·수정·삭제가 `can_edit_post` 하나로 묶인다. 소유자와 관리자는 전부, 저자는 자기 글만이다. 기존 공개 규칙은 그대로 남아 있어 발행된 글은 누구에게나 보인다.\n\n```sql\nCREATE POLICY posts_admin_select ON posts\n  FOR SELECT TO authenticated\n  USING (can_edit_post(author_ids));\n```\n\n이제 API 는 요청자의 세션을 그대로 넘긴다. `?all=true` 가 붙어도 클라이언트를 바꾸지 않는다. 무엇이 보이는지는 코드가 아니라 규칙이 정한다.\n\n```ts\nlet supabase = await createClient();\nif (showAll || showTrash) {\n  const auth = await requireAuth();\n  if (auth.error) return auth.error;\n  supabase = auth.supabase;\n}\n```\n\n우회가 여전히 필요한 곳은 남는다. **사이트 전체를 훑는 집계**가 그렇다. 인기글 판정을 요청자의 시야로 좁히면 자기 글만 집계돼 결과가 달라진다. **사이트 설정**도 그렇다. 설정은 한 행짜리 문서인데 저자에게 허용되는 범위가 그 문서 안의 일부라서, 행 단위로 판정하는 규칙으로는 표현할 수 없다. 이런 곳은 우회를 유지하고 왜 유지하는지를 코드에 적어 두었다.",
      en: "For a rule to see the caller, the request has to carry the role. This project stores the role in `app_metadata`, and that value is embedded in the access token issued at sign-in. The database can read that token with `auth.jwt()`, so a rule can know the role without a query of its own.\n\nSo the role is pulled out of the token by functions, and the rules call those functions.\n\n```sql\nCREATE FUNCTION is_admin() RETURNS boolean AS $$\n  SELECT app_role() = 'owner' OR app_level() >= 2;\n$$;\n\nCREATE FUNCTION can_edit_post(target_author_ids text[]) RETURNS boolean AS $$\n  SELECT is_owner()\n      OR app_level() >= 2\n      OR (app_role() = 'author'\n          AND app_author_id() = ANY (coalesce(target_author_ids, '{}')));\n$$;\n```\n\nThe posts table carries rules built on those functions. Read, update, and delete all resolve through the single `can_edit_post` predicate: owners and administrators reach everything, an author reaches only their own posts. The existing public rule stays in place, so published posts remain visible to everyone.\n\n```sql\nCREATE POLICY posts_admin_select ON posts\n  FOR SELECT TO authenticated\n  USING (can_edit_post(author_ids));\n```\n\nThe API now forwards the caller's session. `?all=true` no longer switches clients; it only changes the filter. What comes back is decided by the rules, not by the code.\n\n```ts\nlet supabase = await createClient();\nif (showAll || showTrash) {\n  const auth = await requireAuth();\n  if (auth.error) return auth.error;\n  supabase = auth.supabase;\n}\n```\n\nSome places still bypass. **Aggregates that span the whole site** are one: narrowing the popularity ranking to the caller's view would count only their own posts and change the result. **Site settings** are another: the settings live in a single-row document, and what an author may change is a slice inside that document, which a row-level rule cannot express. Those places keep the bypass, with the reason written next to it.",
    },
    keyInsight: {
      ko: "우회는 결정이 아니라 출발점이었다. 관리자 화면을 만들 때부터 service-role 로 붙어 있었고, \"이 경로가 왜 규칙을 통과할 수 없는가\" 라는 질문은 데이터가 새고 나서야 나왔다. 규칙이 행의 값만 볼 수 있다고 여긴 전제를 한 번도 확인하지 않은 것이다.\n\n**기본값은 차단이어야 한다.** 전부 열어 둔 채로 코드가 매번 공개 조건을 빠뜨리지 않기를 기대하는 구조는 한 번의 실수로 무너진다. 규칙으로 옮기면 코드가 조건을 빠뜨려도 데이터베이스가 남은 한 겹을 맡는다.\n\n옮긴 대가도 있다. 규칙은 요청에 실린 토큰을 보므로, 권한을 낮춰도 그 계정의 토큰이 갱신될 때까지는 이전 권한이 유효하다. 서버가 매 요청 `getUser()` 로 확인하던 방식은 즉시 반영됐다. 어느 쪽도 무료가 아니고, 무엇을 포기하는지 알고 고르는 것이 다르다.\n\n응답의 모양도 달라진다. 규칙에 걸린 요청은 거부가 아니라 **빈 결과**로 돌아온다. 권한이 없으면 403 이 아니라 404 가 된다. 대상이 있는지조차 알려주지 않는다는 점에서는 나은 동작이지만, 코드가 0행을 \"없음\" 으로 해석하고 있는지는 확인해야 한다.",
      en: "The bypass was never a decision; it was the starting shape. The admin screens connected with the service-role key from the day they were built, and the question \"why can't this path satisfy the rules?\" only came up after data leaked. The assumption that a rule can only look at values in the row went unexamined the whole time.\n\n**The default has to be blocked.** Leaving everything open and trusting the code never to drop the public-only condition collapses on a single mistake. With the decision in the rules, a forgotten condition still meets one more layer in the database.\n\nMoving it has a cost. A rule reads the token attached to the request, so lowering someone's permission takes effect only once that account's token is refreshed, while the server's per-request `getUser()` check applied immediately. Neither side is free; what differs is knowing what you give up.\n\nThe shape of the response changes too. A request the rules exclude comes back as an **empty result**, not a refusal, so missing permission reads as 404 rather than 403. Not revealing whether the target exists is the better behavior, but the code has to be checked for whether it reads zero rows as \"not found\".",
    },
  },
  {
    id: "single-auth-path-for-anonymous-comments",
    section: { ko: "Backend / Security", en: "Backend / Security" },
    vizKey: "anon-comment-auth",
    problem: {
      ko: "로그인 세션이 없는 익명 댓글의 작성자를 무엇으로 확인할 것인가",
      en: "How to verify the author of an anonymous comment with no session",
    },
    title: { ko: "인증 경로를 하나로 둔다", en: "Keep a single authentication path" },
    definition: {
      ko: "이 사이트의 댓글은 로그인 없이 쓸 수 있다. 대신 댓글을 쓸 때 비밀번호를 함께 받아 두고, 나중에 고치거나 지울 때 그 비밀번호를 묻는다.\n\n로그인한 사용자라면 서버가 세션을 보고 누구인지 바로 안다. 익명 댓글에는 그 세션이 없다. 수정이나 삭제 요청이 들어오면 서버는 요청자가 그 댓글을 쓴 사람인지 다른 근거로 판정해야 한다.",
      en: "Comments on this site can be written without signing in. Instead, a password is collected when the comment is written and asked for again when it is edited or deleted.\n\nFor a signed-in user the server reads the session and knows who it is. An anonymous comment has no session. When an edit or delete request arrives, the server has to decide whether the caller wrote that comment using some other evidence.",
    },
    cause: {
      ko: "쓸 수 있는 근거가 둘이었다.\n\n첫 번째는 비밀번호다. 댓글을 쓸 때 받은 비밀번호를 bcrypt 로 해싱해 저장해 둔다. 해싱은 원래 값을 되돌릴 수 없는 형태로 바꾸는 것이라, 저장된 값이 새어 나가도 비밀번호 자체는 드러나지 않는다. 수정 요청이 오면 요청에 담겨 온 비밀번호를 같은 방식으로 처리해 저장된 값과 대조한다.\n\n두 번째는 브라우저 식별자다. 브라우저가 이 사이트에 처음 들어오면 임의의 UUID 를 하나 만들어 `localStorage` 에 넣어 둔다. 이 값과 글 id 를 합쳐 해시를 계산한 결과를 댓글에 함께 저장해 두면, 같은 브라우저에서 온 요청은 비밀번호를 묻지 않고 통과시킬 수 있다. 이 해시는 원래 인증용으로 만든 값이 아니다. 익명 댓글마다 아바타 이모지와 닉네임을 정하려고 계산해 둔 값이라 이미 저장되어 있었다.\n\n초기 구현은 둘을 함께 받아 **어느 한쪽이라도 맞으면 통과**시켰다. 폼은 항상 비밀번호를 함께 보내므로 화면에서는 늘 첫 번째 근거로 인증된다. 폼을 거치지 않고 요청을 직접 만들면 비밀번호를 빼고 해시만 담아 보낼 수 있다.",
      en: "There were two candidates.\n\nThe first is the password. It is hashed with bcrypt and stored. Hashing turns the value into a form that cannot be reversed, so even if the stored value leaks, the password itself does not. An edit request runs the submitted password through the same process and compares.\n\nThe second is a browser identifier. On its first visit the browser generates a random UUID and keeps it in `localStorage`. Hashing that UUID together with the post id and storing the result on the comment lets requests from the same browser through without a password. That hash was never built for authentication: it exists to pick each anonymous comment's avatar emoji and nickname, so it was already stored.\n\nThe original implementation accepted both and let a request through if either matched. The form always sends a password, so anything done through the UI authenticates on the first one. A request built by hand can leave the password out and send only the hash.",
    },
    solution: {
      ko: "해시 경로가 주는 이득은 **같은 브라우저에서 비밀번호를 한 번 덜 묻는 것**이다. 그 대가로 공개 응답에 실려 나가는 31비트 값 하나로 남의 댓글을 고칠 수 있게 된다. 편의는 작고 손해는 되돌릴 수 없어서, 경로를 남길 이유가 없었다.\n\n해시 경로를 없애고 비밀번호만 남겼다.\n\n```ts\n// commenter_hash 기반 인증 경로는 제거됨 — simpleHash 가 31-bit 비암호 해시라\n// commenter_id 를 brute force 로 위변조 가능했음. 익명 사용자는 비번이 유일한 인증.\nif (!comment.password_hash) return jsonError(\"Password required\", 403);\nif (!password) return jsonError(\"Password required\", 401);\nconst authorized = await bcrypt.compare(password, comment.password_hash);\nif (!authorized) return jsonError(\"Not authorized\", 403);\n```\n\n해시를 만드는 `simpleHash` 는 문자를 하나씩 곱하고 더하는 31비트 함수다. 나올 수 있는 값의 가짓수가 21억 개 남짓이라, 같은 결과가 나오는 UUID 를 임의로 찾아내는 데 오래 걸리지 않는다. bcrypt 는 반대로 한 번 대조하는 데 일부러 시간이 걸리도록 설계되어 있어 같은 시도가 통하지 않는다.\n\n게다가 이 해시는 아바타를 그려야 해서 공개 조회 응답에 그대로 담겨 나간다. 맞춰야 할 값을 공격자가 먼저 받아 볼 수 있다는 뜻이다. 비밀번호 쪽은 반대로 저장된 해시가 응답에 나가지 않는다.",
      en: "What the hash path buys is **one fewer password prompt in the same browser**. What it costs is that a 31-bit value shipped in the public response can edit somebody else's comment. The convenience is small and the damage is permanent, so there was no case for keeping it.\n\nThe hash path was removed, leaving the password alone.\n\n```ts\n// commenter_hash 기반 인증 경로는 제거됨 — simpleHash 가 31-bit 비암호 해시라\n// commenter_id 를 brute force 로 위변조 가능했음. 익명 사용자는 비번이 유일한 인증.\nif (!comment.password_hash) return jsonError(\"Password required\", 403);\nif (!password) return jsonError(\"Password required\", 401);\nconst authorized = await bcrypt.compare(password, comment.password_hash);\nif (!authorized) return jsonError(\"Not authorized\", 403);\n```\n\n`simpleHash`, which produces that value, is a 31-bit function that multiplies and adds one character at a time. Only about 2.1 billion results are possible, so searching for a UUID that lands on the same one does not take long. bcrypt is built the opposite way: a single comparison is deliberately slow, which makes the same search impractical.\n\nThe hash is also returned in the public read response, since the avatar has to be drawn from it. The value an attacker needs to match is handed to them up front. The stored password hash, by contrast, never leaves the server.",
    },
    keyInsight: {
      ko: "두 인증 수단을 어느 쪽이든 맞으면 통과로 묶으면 **전체 강도는 약한 쪽으로 정해진다**. 강한 쪽을 아무리 잘 만들어도 공격자는 약한 쪽만 상대하면 되기 때문이다.\n\n편의를 위해 경로를 하나 더 여는 판단은 그 경로의 강도까지 함께 정하는 판단이다. 경로를 늘리는 대신 하나로 두고 그 하나를 제대로 만드는 편이 낫다.",
      en: "Joining two authentication methods with \"either one passes\" fixes the overall strength at the weaker one. However well the strong path is built, an attacker only ever has to face the weak one.\n\nOpening an extra path for convenience is also a decision about how strong that path is. One path, built properly, beats two.",
    },
  },
  {
    id: "delete-is-a-reversible-state-change",
    section: { ko: "Backend / Data", en: "Backend / Data" },
    vizKey: "reversible-delete",
    problem: {
      ko: "삭제를 행 제거로 처리할 것인가, 되돌릴 수 있는 상태 변경으로 처리할 것인가",
      en: "Should deletion remove the row, or become a reversible state change?",
    },
    title: { ko: "삭제의 기본값은 복구 가능", en: "Deletion defaults to recoverable" },
    definition: {
      ko: "관리자 화면에는 글과 작품을 지우는 버튼이 있다. 본문에 넣는 달력 블록도 지울 수 있다.\n\n이 사이트는 운영자가 한 명이다. 삭제를 실행하기 전에 검토해 주는 절차가 없고, 잘못 지웠을 때 대신 되살려 줄 사람도 없다. **지우는 순간이 곧 마지막 판단**이다.",
      en: "The admin screens have buttons that delete posts and works. Calendar blocks embedded in a post can be deleted too.\n\nThe site has one operator. Nothing reviews a deletion before it happens, and no one else can restore something removed by mistake. The moment of deleting is the last judgement anyone makes.",
    },
    cause: {
      ko: "두 가지 방식이 있다.\n\n하나는 데이터베이스에서 그 행을 실제로 지우는 것이다. 이후 코드가 단순해진다. 목록을 읽는 쿼리에 조건이 붙지 않고 저장 공간도 늘지 않는다. 대신 되돌릴 방법이 데이터베이스 백업을 통째로 복원하는 것밖에 없다.\n\n다른 하나는 행을 남겨 두고 지워진 시각만 기록하는 것이다. 흔히 soft delete 라고 부른다. 목록에서는 감추되 데이터는 남아 있으므로 되돌릴 수 있다. 대신 데이터를 읽는 모든 쿼리가 지워지지 않은 것만 골라내는 조건을 빠뜨리지 않아야 하고, 지운 행이 계속 쌓인다.",
      en: "There are two ways to do it.\n\nOne is to actually remove the row. Everything downstream gets simpler: list queries carry no extra condition and storage does not grow. The only way back is restoring an entire database backup.\n\nThe other is to keep the row and record only the time it was deleted, commonly called a soft delete. The row is hidden from lists but the data survives, so it can be restored. In exchange, every read has to remember to select only the rows that are not deleted, and deleted rows keep accumulating.",
    },
    solution: {
      ko: "행을 지우는 쪽이 코드는 단순하지만, 실수했을 때 **백업 복원 말고는 방법이 없다**. 운영자가 한 명이라 그 복원을 대신 해 줄 사람도 없다. 반대로 `deleted_at` 방식의 비용은 조회에 조건이 하나 붙는 것뿐이고, 그건 **코드가 한 번 감당하면 끝난다**.\n\n삭제는 `deleted_at` 에 시각을 기록하는 것으로 처리한다. 휴지통 화면이 그 행들을 모아 보여 주고, 거기서 복구한다. 지울 때 `purge_after` 에 보관 기한도 함께 적어 두고, 그 시각이 지나면 예약 작업이 하루에 한 번 실제로 지운다.\n\n```ts\n// 복구 — 기록해 둔 시각을 지우면 목록에 다시 나타난다\n.update({ deleted_at: null }).eq(\"id\", id)\n\n// 영구 삭제 — 전용 라우트에서만 호출된다\nexport async function purgeForever(table: TableName, id: string) { ... }\n```\n\n영구 삭제는 일반 삭제와 다른 API 로 분리했다. 주소가 `/api/posts/[id]/purge` 로 따로 있고, 휴지통 화면을 거치지 않으면 도달하지 않는다. 행이 쌓이는 문제는 보관 기한이 정리하므로 사람이 따로 챙기지 않는다.",
      en: "Removing the row keeps the code simpler, but a mistake then has **no remedy short of restoring a backup** — and with a single operator there is nobody else to do that restoring. The cost of the `deleted_at` approach is one extra condition on reads, and **code pays that once**.\n\nDeleting writes a timestamp into `deleted_at`. The trash screen collects those rows and restores from there. The delete also records a retention deadline in `purge_after`; once that time passes, a scheduled job removes the row for real, once a day.\n\n```ts\n// 복구 — 기록해 둔 시각을 지우면 목록에 다시 나타난다\n.update({ deleted_at: null }).eq(\"id\", id)\n\n// 영구 삭제 — 전용 라우트에서만 호출된다\nexport async function purgeForever(table: TableName, id: string) { ... }\n```\n\nPermanent deletion lives behind a different API. It has its own address, `/api/posts/[id]/purge`, and is unreachable without going through the trash screen. The accumulation problem is handled by the retention deadline rather than by remembering to clean up.",
    },
    keyInsight: {
      ko: "**되돌릴 수 없는 동작을 되돌릴 수 있는 동작과 같은 버튼에 두지 않는다.** 두 동작은 실수했을 때의 비용이 다르다.\n\n기본값은 복구 가능한 쪽이어야 한다. 영구 삭제는 기한이 지나 자동으로 일어나거나, 사용자가 따로 한 번 더 지정해야 일어난다.",
      en: "An irreversible action does not belong on the same button as a reversible one. The cost of a mistake is not the same for both.\n\nThe default has to be the recoverable one. Permanent removal happens either because a retention deadline passed or because the user asked for it a second time, explicitly.",
    },
  },
  {
    id: "optimistic-concurrency-with-a-version-counter",
    section: { ko: "Backend / Data", en: "Backend / Data" },
    vizKey: "optimistic-lock",
    problem: {
      ko: "같은 글을 두 곳에서 편집할 때 나중 저장이 앞선 저장을 덮어쓰는 것을 어떻게 막을 것인가",
      en: "Preventing a later save from silently overwriting an earlier one on the same post",
    },
    title: { ko: "충돌은 막지 말고 감지한다", en: "Detect conflicts instead of preventing them" },
    definition: {
      ko: "글 편집기는 작성 중인 내용을 주기적으로 자동 저장한다. 그런데 같은 글을 두 곳에서 동시에 열 수 있다. 노트북에서 열어 둔 채 휴대폰에서 다시 여는 경우가 대표적이다.\n\n두 화면이 각자 편집하고 각자 저장하면 나중에 저장한 쪽이 앞선 쪽의 수정을 덮어쓴다. **덮어쓴 쪽도 덮어쓰인 쪽도 그 사실을 모른다.** 두 화면 모두에 저장됐다는 표시만 뜬다.",
      en: "The editor autosaves while you write. The same post can also be open in two places at once, most often a laptop left open while the post is reopened on a phone.\n\nIf both screens edit and both save, the later save overwrites the earlier one. Neither side learns this happened. Both screens simply show that the post was saved.",
    },
    cause: {
      ko: "막는 방법과 감지하는 방법이 있다.\n\n막는 방법은 잠금이다. 누군가 글을 열면 그 글을 잠가 다른 화면이 열지 못하게 한다. 확실하지만 잠금을 푸는 시점을 정해야 한다. 브라우저를 그냥 닫으면 잠금이 남고, 그 글은 한동안 아무도 고치지 못하게 된다.\n\n감지하는 방법은 버전 번호다. 글마다 수정될 때마다 1씩 오르는 숫자를 둔다. 편집기는 글을 열 때 그 숫자를 함께 받아 두었다가 저장할 때 되돌려 보낸다. 서버는 보내온 숫자가 지금 저장된 숫자와 같을 때만 저장한다. 다르면 그 사이에 누군가 저장했다는 뜻이다.\n\n이쪽은 잠금이 없으므로 열어 두기만 한 화면이 다른 화면을 막지 않는다. 대신 충돌이 났을 때 사용자에게 알리고 어떻게 할지 물어야 한다.",
      en: "You can either prevent the collision or detect it.\n\nPreventing means locking. Opening a post locks it so no other screen can open it. That is airtight, but it needs a rule for releasing the lock. Closing the browser leaves the lock behind, and the post becomes uneditable for a while.\n\nDetecting means a version number. Each post carries a counter that increases by one on every save. The editor receives that number when it opens the post and sends it back when it saves. The server writes only if the number still matches what is stored. A mismatch means somebody saved in between.\n\nThis way nothing is locked, so a screen left open never blocks another. In exchange, a conflict has to be surfaced to the user with a choice about what to do.",
    },
    solution: {
      ko: "잠금은 확실하지만 **드문 일을 막으려고 상시 비용을 내는 구조**다. 동시 수정은 자주 일어나지 않는데, 잠금을 언제 풀지는 항상 관리해야 하고 브라우저를 그냥 닫으면 남는다. 버전 번호는 평소에 아무것도 하지 않다가 어긋난 순간에만 걸린다.\n\n버전 번호를 쓴다. 저장 조건에 버전 일치를 넣고, 어긋나면 409 를 돌려준다.\n\n```ts\n// baseVersion 이 있으면 조건부 갱신(버전 일치할 때만) + version 증가.\nconst { data, error } = await admin\n  .from(\"posts\")\n  .update({ ...body, version: baseVersion + 1, updated_at: new Date().toISOString() })\n  .eq(\"id\", id)\n  .eq(\"version\", baseVersion)\n```\n\n마지막 줄이 핵심이다. 편집기가 글을 열 때 받아 간 숫자와 지금 저장된 숫자가 같은 행만 갱신된다. 그 사이 다른 화면이 저장했다면 숫자가 이미 올라가 있어 일치하는 행이 없고, 갱신된 행은 0개가 된다. 확인과 저장이 한 문장 안에서 일어나므로 그 사이에 다른 요청이 끼어들 틈이 없다.\n\n갱신이 0행이면 두 가지가 가능하다. 글이 지워졌거나, 버전이 어긋났거나다. 그래서 현재 버전을 한 번 더 읽어 둘을 구분하고, 충돌이면 409 와 현재 버전 번호를 함께 돌려준다.",
      en: "Locking is airtight but **pays a standing cost to prevent a rare event**. Simultaneous edits are uncommon, yet lock release has to be managed at all times and a closed browser leaves one behind. A version counter does nothing until the moment values diverge.\n\nA version counter. Version equality goes into the save condition, and a mismatch returns 409.\n\n```ts\n// baseVersion 이 있으면 조건부 갱신(버전 일치할 때만) + version 증가.\nconst { data, error } = await admin\n  .from(\"posts\")\n  .update({ ...body, version: baseVersion + 1, updated_at: new Date().toISOString() })\n  .eq(\"id\", id)\n  .eq(\"version\", baseVersion)\n```\n\nThe last line is what does the work. Only a row whose stored version still equals the one the editor took when it opened the post gets updated. If another screen saved in between, the number has already moved on, nothing matches, and zero rows are updated. The check and the write happen in one statement, so no other request can slip between them.\n\nZero updated rows has two possible causes: the post was deleted, or the version diverged. So the current version is read once more to tell them apart, and a conflict returns 409 along with the current version number.",
    },
    keyInsight: {
      ko: "동시 수정은 드물게 일어난다. 드문 일을 막기 위해 항상 잠그면 잠금을 관리하는 비용이 상시로 발생한다.\n\n충돌을 미리 막는 대신 일어났을 때 확실히 감지하는 편이 낫다. 감지에 필요한 것은 숫자 하나이고 저장 조건 한 줄로 끝난다. 중요한 것은 충돌을 없애는 것이 아니라 **조용히 덮어쓰이지 않는 것**이다.",
      en: "Simultaneous edits are rare. Locking all the time to prevent a rare event means paying the cost of managing locks all the time.\n\nDetecting a conflict when it happens beats preventing it in advance. Detection needs one number and one line in the save condition. The goal was never to eliminate conflicts, only to make sure nothing is overwritten in silence.",
    },
  },
  {
    id: "duplicate-prevention-belongs-in-the-database",
    section: { ko: "Backend / Data", en: "Backend / Data" },
    vizKey: "unique-constraint",
    problem: {
      ko: "좋아요와 투표의 중복을 API 코드에서 검사할 것인가, 데이터베이스 제약으로 막을 것인가",
      en: "Check for duplicate likes and votes in API code, or block them with a database constraint?",
    },
    title: { ko: "중복 방지는 데이터베이스에서", en: "Duplicate prevention belongs in the database" },
    definition: {
      ko: "글에는 좋아요 버튼이 있고, 본문에는 투표 블록을 넣을 수 있다. 둘 다 로그인 없이 누를 수 있어서 같은 사람이 여러 번 누르는 것을 막아야 한다.\n\n로그인이 없으므로 사람을 구분할 근거는 IP 주소뿐이다. 그래서 규칙은 같은 대상에 같은 IP 는 한 번만이 된다.",
      en: "Posts have a like button, and a post body can embed a poll block. Both work without signing in, so the same person pressing repeatedly has to be blocked.\n\nWith no sign-in, the only thing distinguishing one person from another is the IP address. The rule becomes: one press per IP per target.",
    },
    cause: {
      ko: "확인을 어디서 하느냐가 갈린다.\n\nAPI 코드에서 할 수 있다. 요청이 오면 먼저 그 IP 의 기록이 있는지 조회하고, 없으면 새로 넣는다. 읽기와 쓰기가 두 단계로 나뉜다.\n\n두 요청이 거의 같은 순간에 도착하면 둘 다 조회 단계에서 기록이 없다고 판단하게 된다. 그러면 **둘 다 넣기로 진행해 중복이 생긴다**. 버튼을 빠르게 두 번 누르거나 네트워크가 요청을 중복 전송하면 실제로 일어난다.\n\n데이터베이스 제약으로 할 수도 있다. 테이블에 이 조합은 중복될 수 없다는 규칙을 걸어 두면 두 번째 삽입은 데이터베이스가 거절한다. 조회와 삽입 사이의 틈이 사라진다.",
      en: "It comes down to where the check lives.\n\nIt can live in the API code: on each request, look up whether that IP already has a record, and insert if it does not. Reading and writing are two separate steps.\n\nWhen two requests arrive at nearly the same moment, both see no record at the lookup step. Both then proceed to insert, and a duplicate appears. A fast double-press or a network retry is enough to trigger it.\n\nIt can also live in the database as a constraint. Declaring that a combination cannot repeat makes the database itself reject the second insert. The gap between lookup and insert disappears.",
    },
    solution: {
      ko: "API 코드에서 확인해도 대부분은 막힌다. 문제는 **대부분**이라는 점이다. 조회와 삽입 사이의 틈은 요청이 겹칠 때만 열리는데, 겹치는 순간은 고를 수 없다. 제약은 그 틈 자체를 없애고 비용은 **인덱스 하나**뿐이다.\n\n제약을 데이터베이스에 건다.\n\n```sql\n-- 동일 대상에 같은 IP 중복 방지\nCREATE UNIQUE INDEX IF NOT EXISTS idx_likes_unique\n  ON likes (target_type, target_id, ip);\n```\n\n세 값의 조합이 이미 있으면 삽입 자체가 실패한다. 두 요청의 순서가 어떻게 얽히든 살아남는 행은 하나다. 투표 블록에도 같은 방식으로 `(poll_id, option_id, ip)` 조합에 제약을 걸었다.\n\n`target_type` 이 함께 들어간 이유는 좋아요가 글과 작품 양쪽에 붙기 때문이다. 두 테이블의 id 가 우연히 같아도 서로 다른 대상으로 구분된다.",
      en: "Checking in API code blocks **most** of them — and *most* is the problem. The gap between lookup and insert only opens when requests overlap, and you don't get to choose when that happens. A constraint removes the gap itself, and it costs **one index**.\n\nThe constraint goes into the database.\n\n```sql\n-- 동일 대상에 같은 IP 중복 방지\nCREATE UNIQUE INDEX IF NOT EXISTS idx_likes_unique\n  ON likes (target_type, target_id, ip);\n```\n\nIf that combination of three values already exists, the insert itself fails. However the two requests interleave, exactly one row survives. The poll block got the same treatment on `(poll_id, option_id, ip)`.\n\n`target_type` is part of the key because likes attach to both posts and works. Even if an id happens to coincide across the two tables, they stay distinct targets.",
    },
    keyInsight: {
      ko: "**먼저 확인하고 나서 쓴다**는 방식은 두 요청이 겹치는 순간 깨진다. 확인과 쓰기 사이에 다른 요청이 끼어들 수 있기 때문이다.\n\n같은 규칙을 제약으로 표현하면 그 틈이 없어진다. 데이터가 지켜야 할 규칙은 그 데이터를 다루는 코드마다 반복해 적는 것보다, 데이터가 저장되는 곳에 한 번 적어 두는 편이 낫다.",
      en: "\"Check first, then write\" breaks the moment two requests overlap, because another request can land between the check and the write.\n\nExpressing the same rule as a constraint removes that gap. A rule the data must satisfy is better written once where the data lives than repeated in every piece of code that touches it.",
    },
  },
  {
    id: "revision-history-is-capped-per-entity",
    section: { ko: "Backend / Data", en: "Backend / Data" },
    vizKey: "revision-cap",
    problem: {
      ko: "자동저장 스냅샷이 무한히 쌓이는 것을 어떤 기준으로 정리할 것인가",
      en: "On what basis should autosave snapshots be pruned instead of growing forever?",
    },
    title: { ko: "쌓이기만 하는 데이터에는 상한을 정한다", en: "Data that only accumulates needs a ceiling" },
    definition: {
      ko: "편집기는 작성 중인 내용을 서버에도 주기적으로 저장한다. 이 스냅샷을 리비전이라고 부른다. 편집 도중 브라우저가 닫히거나 실수로 문단을 지웠을 때 되돌리는 데 쓴다.\n\n리비전은 저장할 때마다 새로 쌓인다. 긴 글을 오래 편집하면 글 하나에만 수백 개가 생긴다. 아무 제한이 없으면 **늘어나기만 한다**.",
      en: "The editor also saves snapshots to the server as you write. Each snapshot is called a revision, and they exist for recovering from a closed browser or an accidentally deleted paragraph.\n\nA new revision is stored on every save. Editing a long post over time produces hundreds for that post alone. With no limit, the number only goes up.",
    },
    cause: {
      ko: "보관 정책을 정해야 한다.\n\n시간을 기준으로 자를 수 있다. 30일이 지난 리비전을 지우는 식이다. 이 경우 오래된 글은 리비전이 하나도 남지 않는다. 오래 두었다 다시 손대는 글일수록 되돌릴 근거가 필요한데 그때 아무것도 없다.\n\n개수를 기준으로 자를 수도 있다. 글마다 최근 몇 개만 남긴다. 글이 얼마나 오래됐는지와 무관하게 항상 되돌릴 거리가 남는다. 대신 짧은 시간에 많이 저장하면 그만큼 과거가 빨리 밀려난다.\n\n지우지 않는 선택지도 있다. 저장 공간이 계속 늘고, 리비전 목록을 읽는 조회도 함께 느려진다.",
      en: "A retention policy has to be chosen.\n\nYou can cut by time, deleting revisions older than thirty days. Then an old post keeps none at all, and a post you return to after a long gap is exactly the case where something to roll back to is most useful.\n\nYou can cut by count, keeping the most recent few per post. Something to roll back to always exists regardless of the post's age. In exchange, a burst of saves pushes older states out faster.\n\nYou can also keep everything. Storage grows without bound, and reading the revision list slows down with it.",
    },
    solution: {
      ko: "기간으로 자르면 오래된 글의 리비전이 **하나도 남지 않는다**. 그런데 오래 두었다 다시 손대는 글이야말로 되돌릴 근거가 필요한 경우다. 가장 필요한 순간에 비어 있는 정책이라 택하지 않았다. 개수 기준은 글의 나이와 무관하게 **최근 것을 항상 남긴다**.\n\n글 하나당 최근 50개만 남긴다. 새 리비전을 넣은 직후에 초과분을 정리한다.\n\n```ts\nconst MAX_REVISIONS = 50;\n\n// 엔티티당 MAX_REVISIONS 초과분 정리\nconst { data: overflow } = await admin\n  .from(\"revisions\")\n  .select(\"id\")\n  .eq(\"entity_type\", entity_type)\n  .eq(\"entity_id\", entity_id)\n  .order(\"created_at\", { ascending: false })\n  .range(MAX_REVISIONS, MAX_REVISIONS + 1000);\n```\n\n최신순으로 정렬한 뒤 51번째부터 골라 지운다. 정리를 별도 예약 작업으로 미루지 않고 저장할 때 함께 처리하므로, 상한을 넘긴 상태로 오래 머무르지 않는다.\n\n리비전은 글과 작품이 한 테이블을 같이 쓴다. `entity_type` 이 어느 쪽인지 구분하고, 본문은 통째로 JSON 스냅샷으로 넣는다. 편집 폼에 항목이 늘어도 테이블 구조를 바꾸지 않아도 된다.",
      en: "Cutting by time leaves an old post with **nothing at all** — yet a post you return to after a long gap is exactly when something to roll back to matters. A policy that is empty when it is most needed was not worth taking. A count keeps **the recent ones regardless of age**.\n\nFifty per post, and the excess is trimmed right after a new revision is inserted.\n\n```ts\nconst MAX_REVISIONS = 50;\n\n// 엔티티당 MAX_REVISIONS 초과분 정리\nconst { data: overflow } = await admin\n  .from(\"revisions\")\n  .select(\"id\")\n  .eq(\"entity_type\", entity_type)\n  .eq(\"entity_id\", entity_id)\n  .order(\"created_at\", { ascending: false })\n  .range(MAX_REVISIONS, MAX_REVISIONS + 1000);\n```\n\nSorted newest first, everything from the fifty-first onward is selected and deleted. Trimming happens as part of the save rather than in a separate scheduled job, so the table never sits over the limit for long.\n\nPosts and works share one revisions table. `entity_type` says which side a row belongs to, and the body goes in whole as a JSON snapshot. Adding a field to the edit form does not require changing the table.",
    },
    keyInsight: {
      ko: "**자동으로 쌓이는 데이터에는 상한이 필요하다.** 상한이 없으면 문제는 나중에, 데이터가 이미 많아진 뒤에 드러난다.\n\n상한을 개수로 둘지 기간으로 둘지는 그 데이터를 언제 꺼내 쓰는지에 달렸다. 리비전은 방금 편집한 것을 되돌리는 용도라서 최근 몇 개가 남아 있는지가 중요하고, 얼마나 오래 보관했는지는 덜 중요하다.",
      en: "Data that accumulates on its own needs a ceiling. Without one, the problem surfaces later, once there is already too much of it.\n\nWhether the ceiling is a count or a duration depends on when the data gets used. Revisions exist to undo something you just edited, so what matters is how many recent ones survive, not how long any of them have been kept.",
    },
  },
  {
    id: "scheduled-jobs-run-inside-the-database",
    section: { ko: "Backend / Infra", en: "Backend / Infra" },
    vizKey: "db-cron",
    problem: {
      ko: "예약 발행과 휴지통 정리를 호스팅 cron 으로 돌릴 것인가, 데이터베이스 안에서 돌릴 것인가",
      en: "Run scheduled publishing and trash cleanup on hosting cron, or inside the database?",
    },
    title: { ko: "정기 작업은 데이터가 있는 곳에서 돌린다", en: "Run scheduled work where the data lives" },
    definition: {
      ko: "사람이 조작하지 않아도 정해진 시각에 돌아야 하는 작업이 둘 있다.\n\n하나는 예약 발행이다. 글을 쓸 때 공개 시각을 미리 지정해 두면, 그 시각이 지났을 때 누군가 글을 공개 상태로 바꿔 줘야 한다.\n\n다른 하나는 휴지통 정리다. 지운 글은 보관 기한이 지나면 실제로 삭제되는데, 기한을 넘긴 행이 있는지 주기적으로 확인할 무언가가 필요하다.\n\n둘 다 **관리자가 화면을 열고 있지 않을 때도** 돌아야 한다.",
      en: "Two jobs have to run at fixed times without anyone operating them.\n\nThe first is scheduled publishing. A post can be given a future publish time, and once that time passes something has to flip it to public.\n\nThe second is trash cleanup. Deleted rows are removed for real once their retention deadline passes, which means something has to check periodically whether any row is past it.\n\nBoth have to run when no admin has a screen open.",
    },
    cause: {
      ko: "두 가지를 검토했다.\n\n호스팅 서비스가 제공하는 cron 이 있다. 설정 파일에 주기를 적어 두면 플랫폼이 그 시각에 정해진 주소를 호출한다. 이 방식은 작업을 실행하기 위한 주소를 인터넷에 열어 둬야 한다. 그 주소를 아는 사람이 아무 때나 호출할 수 있으므로 **비밀키로 따로 막아야 한다**. 처음에는 이 방식으로 만들었고 주기는 5분이었다.\n\n`pg_cron` 은 데이터베이스 안에서 함수를 직접 실행한다. 주소를 열 필요가 없고, 작업이 다루는 데이터와 실행 주체가 같은 곳에 있다. 대신 확장 기능을 켜야 하고, 실행 주기가 저장소의 코드가 아니라 데이터베이스에 등록된다. 어떤 주기로 도는지 확인하려면 데이터베이스를 봐야 한다.",
      en: "Two options were on the table.\n\nHosting platforms provide cron. A schedule in a config file makes the platform call a fixed URL at that time. This requires exposing a URL on the internet whose only job is to run the task, which then has to be guarded by a secret since anyone who learns the address can call it. The first version worked this way, on a five-minute schedule.\n\n`pg_cron` runs the function inside the database. No URL is exposed, and the job runs where the data it touches already is. In exchange, an extension has to be enabled, and the schedule lives in the database rather than in the repository, so checking how often something runs means looking at the database.",
    },
    solution: {
      ko: "이 두 작업이 건드리는 대상은 **전부 데이터베이스 안에** 있다. HTTP cron 은 그 안의 일을 시키려고 밖에 입구를 하나 열고, 그 입구를 비밀키로 지키는 코드까지 함께 관리해야 한다. 실행 주체를 데이터가 있는 곳으로 옮기면 **입구도 그 코드도 필요 없어진다**.\n\n두 작업을 `pg_cron` 으로 옮기고 설정 파일의 주기는 비웠다.\n\n```sql\nSELECT cron.schedule(\n  'publish-scheduled',\n  '* * * * *',\n  $cron$ SELECT safe_publish_scheduled(); $cron$\n);\n```\n\n가운데 줄이 실행 주기다. 별표 다섯 개는 매분을 뜻한다. 5분에서 1분으로 줄인 이유는 발행 시각을 분 단위로 지정하기 때문이다. 5분 간격으로 확인하면 지정한 시각보다 최대 5분 늦게 공개된다.\n\n실행 대상은 작업 함수 자체가 아니라 `safe_` 로 감싼 함수다. 안쪽에서 예외가 나면 잡아서 `admin_notifications` 에 오류 내용을 기록한다.\n\n등록 구문도 먼저 `unschedule` 한 뒤 다시 `schedule` 하는 형태로 적어 두었다. 설정 파일 전체를 다시 실행해도 같은 작업이 두 번 등록되지 않는다.",
      en: "Everything these two jobs touch **already lives inside the database**. HTTP cron opens a door on the outside just to trigger work on the inside, and then adds guarding code to maintain alongside it. Moving the runner to where the data is **removes both the door and that code**.\n\nBoth jobs moved to `pg_cron`, and the schedule list in the config file was emptied.\n\n```sql\nSELECT cron.schedule(\n  'publish-scheduled',\n  '* * * * *',\n  $cron$ SELECT safe_publish_scheduled(); $cron$\n);\n```\n\nThe middle line is the schedule; five asterisks mean every minute. It went from five minutes to one because publish times are chosen to the minute, and checking every five could leave a post up to five minutes late.\n\nWhat the schedule runs is not the job function but a `safe_` wrapper around it. If the inner call raises, the wrapper catches it and records the error in `admin_notifications`.\n\nThe registration statements `unschedule` before they `schedule`, so re-running the whole setup file never registers the same job twice.",
    },
    keyInsight: {
      ko: "정기 작업을 HTTP 로 호출하는 구조는 작업을 실행하기 위한 입구를 인터넷에 하나 더 여는 일이다. 그 입구는 지켜야 하고, 지키는 코드도 관리 대상이 된다.\n\n작업이 다루는 대상이 전부 데이터베이스 안에 있다면 실행도 그 안에서 하는 편이 단순하다. 입구가 없으면 지킬 것도 없다.",
      en: "Driving a scheduled job over HTTP means opening one more door on the internet whose only purpose is to run that job. The door has to be guarded, and the guarding code becomes something else to maintain.\n\nIf everything the job touches is already inside the database, running it there is simpler. A door that does not exist needs no guard.",
    },
  },
  {
    id: "notification-failure-must-not-fail-the-job",
    section: { ko: "Backend / Infra", en: "Backend / Infra" },
    vizKey: "fail-soft-notify",
    problem: {
      ko: "알림 발송이 실패했을 때 본 작업까지 되돌릴 것인가",
      en: "When sending a notification fails, should the underlying job roll back too?",
    },
    title: { ko: "실패할 때 어느 쪽으로 넘어질지 정해 둔다", en: "Decide which way each failure falls" },
    definition: {
      ko: "예약 작업이 글을 공개하거나 휴지통을 비우면 무슨 일이 있었는지 관리자에게 이메일로 알린다. 발송은 Resend 라는 외부 서비스를 쓰고, 발송에 필요한 API 키는 Vault 라는 데이터베이스 안의 비밀 저장소에 넣어 둔다.\n\n알림이 실패할 수 있는 상황이 두 가지다. 새 환경에 처음 설치했을 때처럼 키가 아직 등록되지 않은 경우가 하나다. 키는 있는데 외부 서비스가 응답하지 않는 경우가 다른 하나다.\n\n중요한 것은 두 작업이 하나의 데이터베이스 트랜잭션 안에서 돈다는 점이다. 트랜잭션은 그 안에서 한 일을 **전부 성공시키거나 전부 취소**하는 단위다. 이메일 발송도 같은 트랜잭션 안에 있다.",
      en: "When a scheduled job publishes posts or empties the trash, it emails the admin about what happened. Delivery goes through an external service called Resend, and the API key it needs is kept in Vault, a secret store inside the database.\n\nNotification can fail in two ways. The key may not be registered yet, as on a fresh install. Or the key exists but the external service does not respond.\n\nWhat matters is that both jobs run inside a single database transaction. A transaction is a unit that either commits everything done inside it or cancels all of it. The email send sits inside that same transaction.",
    },
    cause: {
      ko: "알림이 실패했을 때 어떻게 할지 정해야 한다.\n\n오류를 그대로 올리면 트랜잭션이 취소된다. 글은 공개되지 않고 휴지통도 정리되지 않는다. 이메일을 못 보냈다는 이유로 본 작업까지 되돌아가는 셈이다.\n\n무시하면 본 작업은 완료된다. 대신 알림이 오지 않았다는 사실을 아무도 모른다.\n\n두 실패는 성격이 다르다. 이메일은 결과를 전달하는 수단이고, 글을 공개하는 것이 본래 하려던 일이다. 수단이 실패했다고 목적까지 되돌릴 이유는 없다.",
      en: "A policy has to be chosen for a failed notification.\n\nLetting the error propagate cancels the transaction. Posts do not get published and the trash is not emptied. The real work is undone because an email could not be sent.\n\nSwallowing it lets the real work finish, but then nobody learns the notification never arrived.\n\nThe two failures are not the same kind of thing. Email is the means of reporting a result; publishing the post is the thing you actually set out to do. A failed means is no reason to undo the end.",
    },
    solution: {
      ko: "두 실패의 무게가 다르다. 이메일이 안 가면 관리자가 나중에 화면에서 확인하면 되지만, 발행이 취소되면 **독자가 볼 예정이던 글이 안 올라간다**. 가벼운 쪽의 실패로 무거운 쪽을 되돌릴 이유가 없어서 알림만 삼키기로 했다.\n\n키를 읽는 함수와 이메일을 보내는 함수 모두 실패를 삼키고 넘어간다.\n\n```sql\n-- 유틸: Vault secret 안전 조회 (없으면 NULL)\nCREATE OR REPLACE FUNCTION _get_vault_secret(secret_name text)\n...\nEXCEPTION WHEN OTHERS THEN\n  RETURN NULL;\n\n-- 유틸: Resend 이메일 발송 (Vault 비어있으면 skip, 실패는 무시 — DB 본 작업은 성공해야)\nBEGIN\n  IF api_key IS NULL OR to_email IS NULL OR from_email IS NULL THEN\n    RETURN;\n  END IF;\n```\n\n키가 없으면 조회 함수가 NULL 을 돌려주고, 발송 함수는 그 NULL 을 보고 아무것도 하지 않은 채 끝난다. 오류가 발생하지 않으므로 트랜잭션은 그대로 진행되고 글은 예정대로 공개된다.\n\n이 판단은 알림에만 적용한다. 예약 작업 자체가 실패했을 때는 반대로 반드시 기록을 남긴다. 작업 함수를 감싼 `safe_` 래퍼가 예외를 잡아 `admin_notifications` 에 넣는 것이 그 역할이다.",
      en: "The two failures do not weigh the same. A missing email means the admin checks the screen later; a rolled-back publish means **a post readers were meant to see never went up**. There was no reason to let the lighter failure undo the heavier one, so only the notification is swallowed.\n\nBoth the function that reads the key and the function that sends the mail swallow their failures.\n\n```sql\n-- 유틸: Vault secret 안전 조회 (없으면 NULL)\nCREATE OR REPLACE FUNCTION _get_vault_secret(secret_name text)\n...\nEXCEPTION WHEN OTHERS THEN\n  RETURN NULL;\n\n-- 유틸: Resend 이메일 발송 (Vault 비어있으면 skip, 실패는 무시 — DB 본 작업은 성공해야)\nBEGIN\n  IF api_key IS NULL OR to_email IS NULL OR from_email IS NULL THEN\n    RETURN;\n  END IF;\n```\n\nWith no key, the lookup returns NULL, and the sender sees that NULL and returns without doing anything. No error is raised, so the transaction proceeds and the post publishes as planned.\n\nThis applies to notifications only. A failure in the scheduled job itself must be recorded instead, which is what the `safe_` wrapper does when it catches an exception and writes it to `admin_notifications`.",
    },
    keyInsight: {
      ko: "실패했을 때 어느 쪽으로 넘어질지는 **그 동작이 목적인지 수단인지**에 따라 다르다.\n\n알림은 수단이므로 실패해도 본 작업을 건드리지 않는다. 본 작업의 실패는 반대로 반드시 드러나야 한다. 둘을 같은 규칙으로 다루면 알림 때문에 글이 공개되지 않거나, 작업이 실패해도 아무도 모르는 상태 중 하나가 된다.",
      en: "Which way a failure should fall depends on whether the action is an end or a means.\n\nNotification is a means, so its failure leaves the real work alone. Failure of the real work is the opposite: it has to surface. Treating both the same way lands you with either a post that never publishes because of an email, or a job that fails while nobody finds out.",
    },
  },
  {
    id: "one-inline-code-token-for-color",
    problem: {
      ko: "색상 칩을 인라인 코드 하나로 — 에디터·리더·댓글이 같은 렌더를 공유",
      en: "One inline-code token for color chips — editor, reader, and comments share one renderer",
    },
    definition: {
      ko: "에디터 툴바의 색상 칩 도구는 고른 색을 `#hex` 형태의 인라인 코드로 본문에 심습니다. 문제는 이 색을 게시물·에디터 미리보기·댓글 등 렌더되는 곳마다 색 원(칩)으로 보여줘야 한다는 것 — 화면마다 색 파싱·렌더를 따로 두면 코드가 중복되고 표시가 쉽게 어긋납니다.",
      en: "The editor toolbar's color-chip tool plants the chosen color into the body as an inline-code `#hex`. The catch: that color has to show as a color circle (chip) everywhere it renders — the post, the editor's preview, comments — and giving each surface its own color parsing/rendering means duplicated code that easily drifts apart.",
    },
    cause: {
      ko: "색을 '칩' 전용 노드로 만들면 그 노드를 이해하는 렌더러가 화면마다 필요하고, 직렬화·마크다운 변환·댓글처럼 표시 경로가 늘 때마다 대응 코드도 함께 늘어납니다. 색은 결국 짧은 문자열(`#hex`·`rgb()`·`hsl()`)일 뿐인데, 표현을 무겁게 잡으면 공유가 어려워집니다.",
      en: "If the color were a dedicated 'chip' node, every surface would need a renderer that understands that node, and each new display path — serialization, markdown conversion, comments — would need its own handling. A color is ultimately just a short string (`#hex` · `rgb()` · `hsl()`); making the representation heavy is what makes it hard to share.",
    },
    solution: {
      ko: "색을 평범한 **인라인 코드**로만 저장하고 렌더는 전역 한 곳에 몰았습니다. `applyColorSwatches` 하나가 인라인 `<code>` 내용이 색상값이면 그 앞에 전역 `.color-swatch` 원을 붙이고(검증된 색만 `background` 로 주입, 멱등), 이 패스를 게시물 리더·리치텍스트 미리보기·댓글이 **똑같이** 돌립니다. 에디터의 색상 칩 도구는 렌더를 직접 하지 않고 `#hex` 토큰만 심어, 이미 있는 공통 렌더러에 그대로 얹힙니다.",
      en: "Store the color as plain **inline code** and centralize rendering in one global place. A single `applyColorSwatches` pass prepends the global `.color-swatch` circle before any inline `<code>` whose text is a color value (injecting only validated colors as `background`, idempotently), and the post reader, richtext preview, and comments all run the **same** pass. The editor's color-chip tool renders nothing itself — it just plants the `#hex` token and rides on the shared renderer that already exists.",
    },
    keyInsight: {
      ko: "값을 **이동 가능한 평문 토큰**(인라인 코드)으로 표현하면, 렌더러 하나와 전역 스타일 하나로 렌더되는 모든 화면에서 똑같이 그려집니다. 에디터는 토큰을 '심기'만 하고 렌더는 리더 것을 재사용하니 화면별 중복도 어긋남도 없고, 새 표시 경로가 생겨도 칩이 공짜로 따라옵니다. 표현이 가벼울수록 공유되는 범위가 넓어집니다.",
      en: "Represent a value as a **portable, plain-text token** (inline code) and one renderer plus one global style draw it identically on every surface it appears. The editor only *plants* the token and reuses the reader's rendering, so there's no per-surface duplication or drift — and any new display path gets the chip for free. The lighter the representation, the wider it can be shared.",
    },
    tags: ["single-source-of-truth", "inline-code", "color-swatch", "cross-surface-rendering", "plate"],
  },
  {
    id: "editing-an-existing-post-made-auto",
    problem: {
      ko: "기존 글을 편집하자 자동저장이 내용을 통째로 옛 버전으로 되돌림",
      en: "Editing an existing post made auto-save roll its whole content back to an older version",
    },
    title: { ko: "교차 기기 최신 로딩과 믿을 수 있는 최신성 신호", en: "Cross-device latest loading and a trustworthy freshness signal" },
    definition: {
      ko: "글을 쓰는 도중 브라우저가 닫히거나 다른 기기에서 이어 쓰더라도 내용을 잃지 않도록, 이 편집기는 자동저장을 둔다. 편집 중 내용은 두 곳에 백업된다. 하나는 현재 브라우저에만 저장되는 `localStorage`, 다른 하나는 서버에 시점별 스냅샷으로 쌓이는 리비전이다. 리비전은 특정 브라우저에 묶이지 않아, 다른 기기나 다른 브라우저에서 같은 글을 열 때 마지막으로 편집하던 내용을 이어받는 근거가 된다.\n\n여기서 판단이 하나 필요하다. 글을 다시 열 때 화면에 무엇을 되살릴지 — 서버에 저장된 본문인지, 서버 리비전인지, 이 브라우저의 `localStorage` 인지 — 를 골라야 한다. 백업이 저장본보다 새롭다고 미리 가정하고 먼저 되살리는 방식을 `optimistic restore` 라고 하는데, 잘못 고르면 방금 다른 기기에서 이어 쓴 내용 대신 오래된 버전을 화면에 띄운다. 그래서 세 후보 중 무엇이 진짜 최신인지를 믿을 수 있게 판별하는 것이 자동저장 복원의 핵심이 된다.",
      en: "So that content is not lost when the browser closes or you continue on another device, this editor has auto-save. While editing, the content is backed up in two places: `localStorage`, stored only inside the current browser, and revisions, which accumulate on the server as point-in-time snapshots. Revisions are not tied to a particular browser, so they are the basis for continuing the last edit when the same post is opened on another device or browser.\n\nThis calls for a decision. When a post is reopened, the editor has to choose what to restore on screen — the post saved on the server, a server revision, or this browser's `localStorage`. Restoring up front on the assumption that a backup is newer than the saved post is called `optimistic restore`; choose wrong, and it shows an older version instead of what was just continued on another device. So the core of auto-save restore is telling, reliably, which of the three candidates is truly the newest.",
    },
    cause: {
      ko: "각 후보에는 마지막으로 손댄 시각을 기록한 타임스탬프가 있고, 가장 늦은 것을 최신으로 고르는 것이 자연스러운 방법이다. 글에는 `updated_at`, 리비전에는 만들어진 시각이 그 역할을 한다.\n\n문제는 이 신호를 항상 믿을 수 있는 것은 아니라는 점이다. 저장 경로가 `updated_at` 을 갱신하지 않으면, 실제로는 더 나중에 저장된 본문이 시각상 오래된 것처럼 보인다. 그러면 타임스탬프만 비교하는 순진한 방식은 오래된 리비전을 '가장 최신'으로 오인해, 최신 본문 위에 옛 내용을 덮을 수 있다. 즉 자동복원의 위험은 복원 로직 자체가 아니라, 비교의 근거가 되는 최신성 신호가 부정확할 때 생긴다.",
      en: "Each candidate has a timestamp recording when it was last touched, and the natural approach is to pick the latest as the newest — `updated_at` on the post, the creation time on a revision.\n\nThe catch is that this signal cannot always be trusted. If a save path fails to refresh `updated_at`, a post that was actually saved later can look older by timestamp. A naive comparison of timestamps alone then mistakes an older revision for the newest and can write old content over the latest post. In other words, the danger of auto-restore comes not from the restore logic itself, but from an inaccurate freshness signal underlying the comparison.",
    },
    solution: {
      ko: "그래서 두 가지를 맞춘다. 먼저 최신성 신호를 믿을 수 있게 만든다. 글을 저장할 때 `updated_at` 을 반드시 현재 시각으로 갱신하고, 그 저장으로 대체된 이전 자동저장 리비전은 한꺼번에 dismiss 한다. 이러면 서버에 저장된 본문이 항상 가장 최신이 되고, 저장 시점보다 오래된 리비전은 복원 후보에서 빠진다.\n\n그 위에서 교차 기기 최신 로딩이 동작한다. 글을 열면 서버의 가장 최근 리비전을 확인하되, 그 리비전이 만들어진 시각이 저장된 본문의 `updated_at` 보다 실제로 더 나중일 때만(`savedAt > updated_at`) 복원한다. 리비전이 만들어진 시각은 저장 성공 여부와 무관하게 기록돼 신뢰할 수 있고, 이 조건을 통과하는 리비전은 저장 이후 다른 기기에서 이어 편집한 내용뿐이다. 여기에 더해, 사용자가 이미 이 화면에서 편집을 시작했다면 서버 최신본이 더 새로워 보여도 덮지 않는다. 방금 한 작업을 지우지 않는 것이 항상 먼저다.\n\n`localStorage` 임시 저장은 그대로 두어, 창이 닫혀도 같은 기기에서는 곧바로 이어 쓸 수 있다. 정리하면 세 후보(저장된 본문, 서버 최신 리비전, `localStorage`) 중 가장 최신을 고르되, 편집 중이면 덮지 않고, 리비전은 저장본보다 실제로 더 나중일 때만 복원한다.",
      en: "So two things are lined up. First, the freshness signal is made trustworthy: when a post is saved, `updated_at` is always refreshed to the current time, and the earlier auto-save revisions this save supersedes are dismissed together. This keeps the post on the server always the newest and drops any revision older than the save from the restore candidates.\n\nCross-device latest loading runs on top of that. When a post is opened, the most recent server revision is checked, but restored only when the time it was created is genuinely later than the saved post's `updated_at` (`savedAt > updated_at`). A revision's creation time is recorded regardless of whether the save succeeded, so it is reliable, and the only revisions that pass this test are content continued from another device after the last save. On top of that, if the user has already started editing on this screen, the latest server copy is not applied even if it looks newer — not erasing work just done always comes first.\n\nThe `localStorage` copy is left in place, so writing continues immediately on the same device even after the window closes. In short: among the three candidates (the saved post, the latest server revision, `localStorage`) the newest is chosen, but nothing is overwritten while editing, and a revision is restored only when it is genuinely later than the saved post.",
    },
    keyInsight: {
      ko: "자동으로 최신 버전을 되살리는 기능은, 되살리려는 것이 정말로 더 새로운지 확실히 판별할 수 있을 때에만 안전하다. 판별의 근거인 최신성 신호를 믿을 수 없으면, 그 기능은 사용자가 방금 한 작업을 지울 수 있다.\n\n그래서 안전성은 복원 알고리즘이 아니라 신호의 신뢰도에서 나온다. `updated_at` 을 저장 시 반드시 갱신하고 대체된 리비전을 dismiss 해 '저장본보다 나중'이라는 비교가 언제나 참이 되도록 만든 다음에야, 교차 기기 이어쓰기 같은 `optimistic restore` 를 안전하게 켤 수 있다. 신호를 신뢰할 수 없다면 이런 기능은 켜지 않는 편이 낫다.",
      en: "A feature that automatically restores the newest version is safe only when it can tell for certain that what it restores is genuinely newer. If the freshness signal behind that judgment cannot be trusted, the feature can erase work a user has just done.\n\nSo the safety comes from the reliability of the signal, not from the restore algorithm. Only after `updated_at` is always refreshed on save and superseded revisions are dismissed — making the comparison 'later than the saved post' always true — can `optimistic restore`, such as cross-device continue, be turned on safely. When the signal cannot be trusted, such a feature is better left off.",
    },
    vizKey: "cross-device-autosave",
    tags: ["autosave", "revisions", "optimistic-restore", "cross-device"],
  },
  {
    id: "in-a-two-column-settings-layout",
    problem: {
      ko: "2열로 놓인 두 설정 섹션의 툴바가 한쪽만 아래로 밀려 어긋남",
      en: "In a two-column settings layout, one section's toolbar sat lower than its neighbor's",
    },
    definition: {
      ko: "태그·카테고리 두 에디터를 2열 그리드에 나란히 놨는데, 같은 높이에 있어야 할 툴바·검색창·칩 목록이 한쪽(태그)만 아래로 밀려 있었습니다. 좌우 DOM 구조도 CSS 도 똑같았고, 밀린 쪽 요소에는 그럴 만한 margin·padding 이 없었습니다.",
      en: "Two editors (tags, categories) sat side by side in a two-column grid, yet the toolbar / search / chip list that should line up were pushed down on one side (tags) only. The DOM and CSS were identical on both columns, and the shifted elements had no margin/padding to explain it.",
    },
    cause: {
      ko: "두 섹션은 부모 그리드에서 같은 행이라 **같은 높이로 stretch** 됩니다. 태그 에디터가 카테고리보다 짧아 그 섹션엔 남는 세로 공간이 생겼는데, 섹션 내부도 그리드였고 `align-content` 기본값이 `stretch` 라 그 **남는 높이를 헤더·hint·툴바·에디터 각 행에 똑같이 분배**했습니다. `grid-template-rows` 를 실측하니 짧은 쪽만 행마다 ~36px 씩 커져 있었고, 그만큼 툴바가 아래로 내려간 것이었습니다. 밀린 요소 자체엔 아무 스타일도 없으니 원인이 안 보입니다.",
      en: "The two sections are in the same parent-grid row, so they **stretch to equal height**. The tags editor was shorter than the categories one, leaving spare vertical space in that section — but the section is itself a grid, and `align-content` defaults to `stretch`, so it **spread that spare height equally across its rows** (header · hint · toolbar · editor). Measuring `grid-template-rows` showed each row on the shorter side was ~36px taller, which is exactly how far the toolbar had dropped. The shifted element has no style of its own, so the cause is invisible if you only look at it.",
    },
    solution: {
      ko: "섹션 그리드에 `align-content: start` 한 줄. 남는 높이가 행 사이로 분배되지 않고 섹션 하단에 그대로 남아, 두 열의 헤더·툴바·칩이 같은 Y 에서 시작합니다. 내용을 억지로 같은 높이로 맞추거나 툴바 위치를 하드코딩하는 대신, **남는 공간이 어디로 갈지**만 정한 것입니다.",
      en: "One line on the section grid: `align-content: start`. The spare height stays at the bottom of the section instead of being spread between rows, so both columns' headers/toolbars/chips start at the same Y. Rather than forcing content to equal heights or hardcoding the toolbar position, it just decides **where the slack goes**.",
    },
    keyInsight: {
      ko: "정렬이 어긋나면 어긋난 요소가 아니라 **그것이 든 컨테이너에 남는 공간이 있는지**를 먼저 보세요. grid 의 `align-content` 기본값은 stretch 라, 컨테이너가 콘텐츠보다 크면 그 차이를 행 사이 간격으로 조용히 흘려보냅니다. 진짜 질문은 \"이 요소가 왜 밀렸나\" 가 아니라 \"**부모가 왜 콘텐츠보다 큰가**\" 였습니다.",
      en: "When alignment drifts, look not at the misaligned element but at whether **its container has spare space**. A grid's `align-content` defaults to `stretch`, so when the container is taller than its content it quietly leaks the difference into the gaps between rows. The real question wasn't \"why did this element move\" but \"**why is the parent taller than its content**\".",
    },
    tags: ["css-grid", "align-content", "stretch", "alignment", "layout"],
  },
  {
    id: "the-parent-s-mount-time-fitview",
    problem: {
      ko: "부모의 마운트 fitView 가 자식 effect 의 카메라 제어를 매번 덮어씀",
      en: "The parent's mount-time fitView silently overwrote the child's camera control",
    },
    title: { ko: "effect 실행 순서와 제어권 단일화", en: "Effect ordering and single ownership of control" },
    vizKey: "effect-order",
    definition: {
      ko: "이 사이트의 소개 페이지에는 데이터베이스 구조를 보여 주는 ERD 도표가 있다. 표(테이블)를 노드로 그리고 표 사이의 관계를 엣지로 이어 전체 구조를 한눈에 보여 준다. 이 도표는 `react-flow` 라는 도표 렌더링 라이브러리로 그린다.\n\n여기에 노드를 누르면 누른 노드와 그에 연결된 노드들이 화면 안에 함께 들어오도록 도표가 자동으로 확대·이동하는 기능을 추가하려 했다. 이를 위해 특정 범위가 뷰포트에 들어오도록 화면을 맞추는 `fitView` 를 호출하는 코드를 도표 안쪽에 넣었다.\n\n`fitView` 호출도 정상이고 노드·엣지 연결도 제대로 되어 있었으나, 어떤 노드를 눌러도 화면은 항상 같은 배율과 같은 위치에서 멈췄다. 원인을 서로 다르게 짚어 두 차례 수정했지만 화면 동작은 바뀌지 않았다.",
      en: "This site's About page has an ERD diagram that shows the structure of a database. Tables are drawn as nodes and the relationships between tables as edges, so the whole structure is visible at a glance. The diagram is drawn with `react-flow`, a diagram-rendering library.\n\nThe goal was to add a feature: clicking a node makes the diagram automatically zoom and pan so that the clicked node and the nodes connected to it move into view together. To do this, code that calls `fitView`, which frames the view so a given range fits within the viewport, was placed inside the diagram.\n\nThe `fitView` call was correct and the node and edge connections were wired up properly, yet clicking any node left the view at the same zoom level and the same position every time. The cause was traced along two different paths and fixed twice, but the view's behavior did not change.",
    },
    cause: {
      ko: "원인은 `react-flow` 컴포넌트 자체에 있었다. 이 라이브러리에는 컴포넌트가 처음 마운트될 때 자동으로 한 번 뷰포트를 맞추는 `fitView` 옵션이 기본으로 켜져 있다. 또한 누르는 노드가 바뀔 때마다 도표 전체가 리렌더됐고, 리렌더될 때마다 이 마운트 시점의 자동 `fitView` 도 매번 다시 실행됐다.\n\n문제의 핵심은 두 동작의 실행 순서였다. 렌더가 끝난 뒤에 실행되도록 예약한 `useEffect` 는 부모 컴포넌트보다 자식 컴포넌트 쪽이 먼저 처리된다. 따라서 안쪽(자식)에 넣어 둔 `fitView` effect 가 먼저 실행되고, 이어서 바깥쪽 `react-flow` 컴포넌트의 기본 `fitView` 가 그 결과를 덮어썼다. 이 과정에서 오류가 발생하지 않으므로, 처음에는 넣어 둔 코드가 실행되지 않는다고 오해하고 엉뚱한 부분을 확인하게 된다.",
      en: "The cause was in the `react-flow` component itself. The library has a `fitView` option, turned on by default, that automatically frames the viewport once when the component first mounts. In addition, every time the clicked node changed, the whole diagram re-rendered, and each re-render ran that mount-time automatic `fitView` again.\n\nThe core of the problem was the order in which the two actions ran. A `useEffect` scheduled to run after render is processed for the child component before the parent. So the `fitView` effect placed on the inside (the child) ran first, and then the outer `react-flow` component's default `fitView` overwrote the result. Because no error is raised during this process, the added code is at first mistaken for not running at all, which leads to checking the wrong part.",
    },
    solution: {
      ko: "뷰포트를 맞추는 동작의 소유권을 하나로 통합했다. `fitView()` 를 직접 호출하던 명령형 코드는 제거했다. 대신 상황에 따라 뷰포트를 어떻게 맞출지에 해당하는 설정값만 선언적으로 지정해 두고, 실제로 뷰포트를 움직이는 동작은 `react-flow` 컴포넌트가 자기 렌더 순서가 됐을 때 스스로 수행하도록 맡겼다.\n\n이렇게 바꾸면 명령하는 쪽과 `react-flow` 컴포넌트가 같은 뷰포트를 두고 서로 덮어쓰는 상황이 사라진다. 각 노드의 크기 측정이 끝났는지 기다릴 필요도 없어진다. 뷰포트를 조작하는 주체가 하나뿐이므로, 어떤 노드를 누르든 의도한 대로 화면이 맞춰진다.",
      en: "The ownership of the framing action was consolidated into one. The imperative code that called `fitView()` directly was removed. Instead, only the setting for how the viewport should be framed was specified declaratively in advance depending on the situation, and the actual moving of the viewport was left to the `react-flow` component to perform when its own render turn came.\n\nWith this change, the commanding side and the `react-flow` component no longer overwrite each other over the same viewport. There is also no need to wait for each node's size measurement to finish. Because a single subject controls the viewport, clicking any node frames the view as intended.",
    },
    keyInsight: {
      ko: "가져다 쓰는 기성 컴포넌트가 옵션만으로 이미 처리하고 있는 동작을, 그 옆에서 명령형 호출로 다시 건드리면 결국 나중에 실행된 쪽이 반영된다. 게다가 자식 effect 가 부모 effect 보다 먼저 실행되는 구조이므로, 남의 컴포넌트 안쪽에 끼워 넣은 명령은 항상 먼저 실행되고 곧이어 덮어써지는 위치에 놓인다.\n\n따라서 아무 일도 일어나지 않는 증상을 만났을 때는, 코드가 실행조차 되지 않았다고 먼저 의심하기보다 실행은 됐으나 그 뒤에 다른 동작이 결과를 덮어쓴 것은 아닌지 먼저 확인하는 편이 빠르다.",
      en: "When a ready-made component you borrow already handles something through its options alone, and you also reach in beside it to touch the same thing with an imperative call, the one that runs last is the one that takes effect. And because a child effect runs before a parent effect, a command inserted inside someone else's component always lands in the position where it runs first and is overwritten right after.\n\nSo when you encounter a symptom where nothing happens at all, it is faster to first check whether the code did run and was then overwritten by something else, rather than assuming it never ran in the first place.",
    },
    tags: ["react", "useEffect", "react-flow", "declarative-vs-imperative", "effect-order"],
  },
  {
    id: "drop-was-silently-ignored-on-sql",
    problem: {
      ko: "SQL 가져오기에서 DROP 이 조용히 무시됨 — 파서가 \"남은 것\" 만 돌려줬기 때문",
      en: "DROP was silently ignored on SQL import — because the parser only returned what remained",
    },
    title: { ko: "삭제를 부재가 아니라 명시로 표현하기", en: "Encoding deletion as an explicit signal, not absence" },
    definition: {
      ko: "소개 페이지의 ERD 는 SQL 을 붙여넣으면 그 내용을 읽어 스스로 그려진다. 여기에 merge 를 추가했다. 다이어그램을 지우고 새로 그리는 대신, 붙여넣은 SQL 에서 **달라진 부분만 찾아 현재 그림 위에 반영하는** 방식이다.\n\n그런데 `DROP TABLE posts` 를 붙여넣어도 `posts` 상자가 그대로 남았다. 필드를 지우는 SQL 은 지운 필드가 도로 나타났다. **오류나 경고는 없었다.**",
      en: "The ERD on the about page draws itself by reading SQL you paste in. A merge mode was added on top: instead of wiping the diagram and redrawing it, it **finds only what changed in the pasted SQL and applies that to the current picture.**\n\nBut pasting `DROP TABLE posts` left the `posts` box in place, and SQL removing a field made the field reappear. **No error or warning was shown.**",
    },
    cause: {
      ko: "SQL 을 읽어 ERD 구조로 바꾸는 파서가 따로 있다. 이 파서는 처리를 끝낸 뒤 **살아남은 테이블 목록**을 돌려준다. 무엇을 지웠는지는 알려주지 않는다.\n\nERD 에 `users` 와 `posts` 가 있고 `DROP TABLE posts` 를 붙여넣었다고 하자. 파서는 `[users]` 를 돌려준다. merge 는 이 목록을 받아 `posts` 가 없다는 것을 본다. 그런데 그 사실이 둘 중 무엇인지 알 수 없다.\n1. `DROP TABLE` 로 지웠으니 없애라\n2. 이번 SQL 이 `posts` 를 언급하지 않았을 뿐이니 그대로 두라\n\n**목록에 없는 모습이 두 경우 모두 똑같다.** merge 는 사용자가 만든 데이터를 잃지 않는 것을 첫 원칙으로 삼으므로, 애매하면 2번으로 처리했다. 그래서 모든 삭제가 되돌려졌다. 이름 바꾸기도 옛 이름이 목록에서 사라질 뿐이라 옛 이름과 새 이름이 둘 다 남았다.",
      en: "A separate parser turns the SQL into the ERD's structure. When it finishes it returns **a list of the tables that survived.** It says nothing about what was deleted.\n\nSuppose the ERD holds `users` and `posts`, and you paste `DROP TABLE posts`. The parser returns `[users]`. Merge receives that list and sees `posts` is absent, but cannot tell which of two things that means.\n1. It was dropped, so remove it.\n2. This SQL simply never mentioned `posts`, so leave it alone.\n\n**Absence looks identical in both cases.** Merge takes as its first principle that data the user built must not be lost, so whenever the judgment was unclear it chose the second. Every deletion was reverted. A rename only makes the old name vanish from the list, so both the old and the new name stayed.",
    },
    solution: {
      ko: "파서가 살아남은 목록만 주는 대신 **지운 것을 따로 적어 넘기도록** 바꿨다. `removedTables` 와 `removedColumns` 를 함께 돌려주고, 이름 바꾸기는 옛 이름을 이 목록에 올린다.\n\n이제 merge 는 추측하지 않는다. **삭제 목록에 적힌 것만 지우고, 목록에 없으면 손대지 않는다.** 앞의 예에서 파서는 `남은 것: [users]` 와 `지운 것: [posts]` 를 함께 주므로 해석이 갈릴 여지가 없다.\n\n판단은 SQL 을 전부 반영한 뒤의 최종 상태로 한다. 지웠다가 곧바로 다시 만든 테이블은 삭제로 세지 않는다.",
      en: "Instead of returning only the survivors, the parser now **writes down what it removed and passes that along.** It returns `removedTables` and `removedColumns` as well, and a rename puts the old name on that list.\n\nMerge no longer guesses. **It deletes exactly what the removal list names and leaves anything not on it untouched.** In the example above the parser hands over `survived: [users]` together with `removed: [posts]`, so nothing is left to interpret.\n\nThe decision is made against the final state after all the SQL is applied, so a table dropped and immediately recreated does not count as a deletion.",
    },
    keyInsight: {
      ko: "**무언가가 목록에 없다는 사실만으로는 왜 없는지 알 수 없다.** 지워서 없는 것과 애초에 언급되지 않아 없는 것은 모습이 같다.\n\n없음이라는 한 가지 상태에 두 가지 뜻을 담으면, 그 둘을 구분해야 하는 순간에 한쪽을 **아무 신호 없이** 잘못 처리한다. 에러도 경고도 나지 않는다. 이번 경우에는 삭제가 조용히 무시됐다.\n\n다르게 다뤄야 하는 두 상황이면 표현부터 나눠 둔다. 있음과 없음으로 뭉뚱그리는 대신, 지운 것은 지웠다고 적는다.",
      en: "**The bare fact that something is missing from a list cannot tell you why it is missing.** Gone because it was deleted and gone because it was never mentioned look exactly alike.\n\nLoad one \"absent\" state with two meanings and, at the moment you must separate them, one of them gets handled wrong **with no signal at all.** No error, no warning. Here, deletions were silently ignored.\n\nWhen two situations must be treated differently, separate how they are expressed. Rather than lumping everything into present-or-absent, write down what was removed.",
    },
    tags: ["parser", "merge", "data-modeling", "sql", "semantics"],
  },
  {
    id: "adding-icon-buttons-to-a-table",
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
    id: "where-to-store-member-roles-so",
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
    id: "github-oauth-lets-anyone-with-an",
    section: { ko: "Backend / Auth", en: "Backend / Auth" },
    problem: { ko: "GitHub OAuth 는 계정만 있으면 누구나 로그인 시도가 성공한다", en: "GitHub OAuth lets anyone with an account complete sign-in" },
    title: { ko: "인증(authN)과 인가(authZ)의 분리", en: "Authentication vs authorization" },
    vizKey: "oauth-authz",
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
    id: "forgetting-owner-email-deletes-the-owner",
    section: { ko: "Backend / Auth", en: "Backend / Auth" },
    problem: { ko: "OWNER_EMAIL 을 안 넣고 첫 로그인하면 소유자 계정이 지워진다", en: "Forgetting OWNER_EMAIL deletes the owner's account on first login" },
    definition: {
      ko: "이 사이트는 GitHub 로그인을 쓴다. GitHub 계정만 있으면 누구나 로그인 자체는 성공하므로, 콜백에서 **허용 명단**을 확인해 통과하지 못한 계정은 그 자리에서 삭제한다. 초대받지 않은 외부 계정이 쌓이지 않게 하려는 장치다. 관리자는 초대 테이블이 아니라 `OWNER_EMAIL` 환경변수로 지정한다.\n\n처음 배포하고 관리자 본인이 GitHub 으로 첫 로그인을 했다. **계정이 만들어지자마자 삭제되면서 초대받지 않은 계정이라며 쫓겨났다.** `OWNER_EMAIL` 을 아직 넣지 않은 상태였다.",
      en: "The site signs in with GitHub. Anyone with a GitHub account can complete the sign-in itself, so the callback checks an **allowlist** and deletes any account that fails it on the spot, to keep uninvited outsiders from piling up. The owner is designated not through the invite table but by an `OWNER_EMAIL` environment variable.\n\nRight after the first deploy, the owner signed in with GitHub for the very first time. **The account was deleted the moment it was created, bouncing them out with an \"un-invited account\" message.** `OWNER_EMAIL` had not been filled in yet.",
    },
    title: { ko: "설정이 없을 때 실패하는 방향", en: "Which way it fails when setup is missing" },
    cause: {
      ko: "명단은 세 조건 중 하나를 통과해야 들여보낸다.\n1. 이메일이 `OWNER_EMAIL` 과 같다\n2. 이미 역할을 가지고 있다\n3. 초대 기록이 있다\n\n`OWNER_EMAIL` 이 비어 있으면 **관리자 본인도 셋 어디에도 걸리지 않는다.** 1번은 비교할 값이 없고, 2번과 3번은 첫 로그인이라 당연히 해당이 없다. 그래서 초대받지 않은 사람으로 분류되고 계정이 삭제된다.\n\n설정값 하나가 비어 있다는 이유로 **되돌릴 수 없는 동작이 실행됐다.** 배포 첫날 자기 사이트에서 스스로를 잠그는 형태였다.",
      en: "The allowlist lets you in if one of three conditions holds.\n1. Your email matches `OWNER_EMAIL`\n2. You already have a role\n3. You have an invite on record\n\nWith `OWNER_EMAIL` blank, **even the owner matches none of them.** The first has nothing to compare against, and the second and third cannot apply on a first sign-in. So the owner is classed as uninvited and the account is deleted.\n\nOne empty setting was enough to trigger **an action that cannot be undone.** On day one it locked the owner out of their own site.",
    },
    solution: {
      ko: "두 겹으로 막았다.\n\n**설정값이 비어 있으면 지우지 않는다.** 명단에서 걸러졌더라도 `OWNER_EMAIL` 이 아직 비어 있는 상황이면 그 계정이 곧 관리자가 될 수도 있으므로, 삭제하지 않고 설정값을 넣어 달라는 안내만 보여준다. 설정을 채우고 다시 로그인하면 관리자로 확정된다.\n\n**한 번 관리자가 되면 그 상태를 저장한다.** 관리자가 처음 통과하는 순간 역할을 데이터베이스에 기록하고, 이후로는 환경변수를 매번 확인하지 않고 그 기록으로 관리자를 인정한다. 나중에 설정값이 바뀌거나 비어도 소유권이 사라지지 않는다.",
      en: "Two layers.\n\n**Nothing is deleted while the setting is blank.** If someone is filtered out but `OWNER_EMAIL` is still empty, that account might be the one meant to become the owner, so it is left alone and the app simply asks for the setting. Fill it in, sign in again, and ownership is confirmed.\n\n**Once you are the owner, that state is saved.** The moment the owner first passes, the role is written to the database, and from then on ownership rests on that record rather than a re-check of the environment variable. It survives the setting later changing or going blank.",
    },
    keyInsight: {
      ko: "**첫 설정이 빠졌을 때는 안전하게 실패해야지 되돌릴 수 없게 실패하면 안 된다.** 설정이 없다고 계정을 지우는 것은 복구가 불가능한 방향으로 무너지는 것이다.\n\n판단에 필요한 값이 없을 때 시스템이 고를 수 있는 답은 둘이다. 모른다는 이유로 가장 강한 조치를 하거나, 모르는 동안에는 아무것도 파괴하지 않고 멈추거나. **후자가 기본값이어야 한다.**\n\n그리고 부트스트랩이 한 번 성공하면 그 결과를 저장해 둔다. 매번 같은 설정값에 다시 의존하면 그 값이 사라지는 순간 시스템이 다시 원점으로 돌아간다.",
      en: "**When first-time setup is missing, fail safely, not irreversibly.** Deleting an account because a setting is absent collapses in a direction you cannot undo.\n\nWhen the value a decision depends on is missing, a system has two answers available: take the strongest action because it does not know, or destroy nothing while it does not know. **The second should be the default.**\n\nAnd once bootstrap succeeds, save the result. Depending on the same setting again on every check means the system falls back to square one the moment that value disappears.",
    },
    tags: ["Auth", "OWNER_EMAIL", "bootstrap", "app_metadata", "fail-safe"],
  },
  {
    id: "logged-in-as-owner-yet-other",
    section: { ko: "Backend / Auth", en: "Backend / Auth" },
    problem: { ko: "소유자로 로그인해도 설정 계정 탭에서만 다른 멤버가 안 보인다", en: "Logged in as owner, yet other members show only on the dashboard, not the account tab" },
    definition: {
      ko: "같은 소유자 계정으로 로그인했는데, 대시보드 멤버 섹션엔 다른 멤버가 보이고 설정 계정 탭에선 \"그 외 로그인 계정\" 목록이 통째로 비어 있었습니다.",
      en: "Signed in as the same owner, the dashboard members section listed the other members while the account tab's \"other login accounts\" group was completely empty.",
    },
    cause: {
      ko: "두 원인이 겹쳤습니다.\n\n**① 인가 뒤에 데이터 로드를 체이닝** — 계정 탭은 멤버 상세 로드를 `/context` 응답의 `isOwner` 뒤에 매달아 뒀습니다. 그런데 설정 페이지가 마운트되며 여러 인증 요청을 동시에 쏘고, 그중 하나가 세션 회전으로 401 나면 `/context` 가 실패해 멤버가 통째로 사라졌습니다. (대시보드 `MembersList` 는 `/members` 를 직접 fetch 라 멀쩡했습니다.)\n\n**② 공유된 authorId 로 본인 오인** — \"내 계정\"을 목록에서 빼는 `isMineMember` 가 `authorId` 로도 매칭했는데, 여러 멤버가 저자 프로필 링크로 `\"owner\"` 를 공유하는 데이터가 있어, 다른 멤버가 \"내 계정\"으로 오인돼 \"그 외\" 목록에서 제외됐습니다.",
      en: "Two causes overlapped.\n\n**① Data load chained behind authorization** — the account tab hung the member fetch off the `isOwner` field of the `/context` response. But the settings page fires several auth requests at once on mount, and if one 401s from session rotation, `/context` fails and the members vanish wholesale. (The dashboard `MembersList` fetches `/members` directly and was fine.)\n\n**② Self mis-identified via a shared authorId** — `isMineMember`, which removes \"my account\" from the list, also matched by `authorId`; some members shared `\"owner\"` as their author-profile link, so another member was mistaken for \"my account\" and excluded from the \"others\" list.",
    },
    solution: {
      ko: "① 멤버 목록을 `/context` 성공 여부와 무관하게 **직접 fetch** 하도록 분리하고(대시보드와 동일), `/members` 가 200(=소유자 self-gate 통과)이면 표시 게이트를 통과시켰습니다. ② `isMineMember` 를 authorId 대신 **이메일로만** 매칭하게 바꿔, 공유된 authorId 로 인한 오인 제외를 없앴습니다.",
      en: "① Decoupled the member list to fetch **directly**, independent of `/context` (same as the dashboard); a 200 from `/members` (owner self-gate passed) flips the display gate on. ② Changed `isMineMember` to match by **email only**, not authorId, removing the mis-exclusion from a shared authorId.",
    },
    keyInsight: {
      ko: "**데이터 로드를 별도 인가 요청 뒤에 체이닝하면, 그 요청이 흔들릴 때(세션 회전 등) 데이터가 통째로 사라집니다.** 스스로 403 self-gate 하는 엔드포인트는 직접 부르는 게 견고하고, 신원 대조는 여러 행이 공유할 수 있는 링크(authorId)가 아니라 안정적 자연 키(이메일)로 합니다.",
      en: "**Chaining a data load behind a separate authorization request means one shaky request (e.g. session rotation) can wipe the data entirely.** An endpoint that self-gates with 403 is more robust called directly, and identity comparisons should key off a stable natural key (email), not a link that multiple rows can share (authorId).",
    },
    tags: ["auth", "session-rotation", "data-fetch", "race", "React"],
  },
  {
    id: "the-system-resize-cursor-leaks-over",
    section: { ko: "Frontend / CSS", en: "Frontend / CSS" },
    problem: { ko: "코드블록 리사이즈 그립에서 커스텀 커서 위로 시스템 커서가 계속 새어나옴", en: "The system resize cursor leaks over the custom cursor on the code-block grip" },
    title: { ko: "UA 가 그리는 요소의 페인트 순서", en: "The paint order of UA-drawn chrome" },
    definition: {
      ko: "사이트 전역이 커스텀 커서(`cursor: none` + 직접 그린 커서)라 `resize` 되는 코드블록 우하단 그립에서도 커스텀 커서만 보여야 하는데 **네이티브 리사이즈 커서(↘)가 계속 같이 떴다.** 똑같은 방식인 댓글창은 멀쩡한데 코드블록만 샜다.",
      en: "The whole site uses a custom cursor (`cursor: none` + a hand-drawn cursor), so the resizable code block's bottom-right grip should show only the custom cursor — but **the native resize cursor (↘) kept bleeding through.** The comment box, built the same way, was fine; only the code block leaked.",
    },
    cause: {
      ko: "`resize` 그립은 `::-webkit-resizer` 라는 UA 의사요소로 그려지는데, 이건 스크롤바처럼 **그 요소의 자식들보다 위에 페인트** 된다. 코드블록은 시스템 커서를 가리려 올려둔 투명 오버레이가 resize 요소의 **자식**이라, resizer 가 오버레이보다 위에 그려져 `cursor: none` 이 안 먹었다. 댓글창은 오버레이가 resize 되는 textarea 의 **형제**라 resizer 위에 얹혀 정상이었다.",
      en: "The grip is painted by the `::-webkit-resizer` UA pseudo-element, which — like a scrollbar — **paints above the element's own children.** In the code block, the transparent overlay meant to mask the cursor was a **child** of the resizable element, so the resizer painted on top of it and `cursor: none` never applied. In the comment box the overlay was a **sibling** of the resizable textarea, so it sat above the resizer and worked.",
    },
    solution: {
      ko: "오버레이를 resize 요소의 **형제**로 옮겼다. 프레임을 바깥 컨테이너(`position: relative`)로 한 겹 감싸고 오버레이를 그 안에 형제로 두면, 오버레이가 resizer 위에 페인트되어 시스템 커서를 가린다. `resize` 는 자기 border-radius 가 자기 그립을 자르지 않으므로 프레임에 그대로 둬 네이티브 그립 모양은 유지했다.",
      en: "Moved the overlay to be a **sibling** of the resizable element — wrap the frame in an outer `position: relative` container and place the overlay as a sibling inside it, so it paints above the resizer and masks the system cursor. `resize` stays on the frame (whose own border-radius doesn't clip its own grip), keeping the native grip look.",
    },
    keyInsight: {
      ko: "UA 가 그리는 요소(스크롤바·resizer)는 **자식 위, 형제 아래** 라는 독특한 페인트 순서를 갖는다. 그 위에 무언가를 얹어야 한다면 자식이 아니라 형제로 둬야 한다.",
      en: "UA-drawn chrome (scrollbars, resizers) has a peculiar paint order: **above children, below siblings.** To cover one, place your element as a sibling — not a child.",
    },
    tags: ["CSS", "커서", "resize", "webkit"],
  },
  /* ── Backend / Admin ── */
  {
    id: "accidental-post-deletion-with-no-recovery",
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
    id: "ai-translation-summary-completely-down-on",
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
    id: "every-api-key-change-requires-redeployment",
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
    id: "tedious-identity-verification-for-guest-comments",
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

  /* ── Frontend / Performance ── */
  {
    id: "recaptcha-v3-initial-load-performance-degradation",
    section: { ko: "Frontend / Performance", en: "Frontend / Performance" },
    problem: { ko: "reCAPTCHA v3 초기 로드 성능 저하 (LCP 17.1s, TTI 18.2s)", en: "reCAPTCHA v3 Initial Load Performance Degradation (LCP 17.1s, TTI 18.2s)" },
    title: { ko: "인터랙션 시점까지 미루는 지연 로딩", en: "Deferring the load until the first interaction" },
    vizKey: "recaptcha-lazy",
    definition: {
      ko: "이 사이트에 접속했을 때 가장 먼저 렌더링되는 화면은 홈 화면이다. 화면에서 가장 큰 이미지나 텍스트 블록이 표시되기까지 걸리는 시간을 LCP(Largest Contentful Paint)라고 하고, 방문자가 클릭이나 스크롤 같은 입력에 실제로 반응할 수 있게 되기까지 걸리는 시간을 TTI(Time to Interactive)라고 한다. 두 값 모두 페이지의 초기 성능을 판단하는 지표다.\n\n이 사이트에는 스팸과 자동 봇을 걸러 내기 위한 reCAPTCHA v3가 포함돼 있다. reCAPTCHA v3는 사용자에게 별도의 문제를 내지 않고 백그라운드에서 동작하는 대신, 클라이언트에서 실행되는 스크립트 용량이 큰 편이다. 이 스크립트는 단일 파일 기준 784KB에 이르는데, 페이지가 열리는 순간 곧바로 다운로드가 시작되면서 첫 화면 렌더링을 지연시켰다.\n\n그 결과 LCP는 17.1초, TTI는 18.2초로 측정됐다. '빠른 페이지'로 평가받는 LCP 기준은 2.5초 이내인데, 17초는 방문자가 빈 화면을 보다가 사이트가 정상 동작하지 않는다고 판단하고 이탈하기에 충분한 시간이다.",
      en: "When you open this site, the first screen rendered is the home screen. The time it takes for the largest image or text block on the screen to appear is called LCP (Largest Contentful Paint), and the time until a visitor can actually respond to input such as clicking or scrolling is called TTI (Time to Interactive). Both values are metrics for judging a page's initial performance.\n\nThis site includes reCAPTCHA v3 to filter out spam and automated bots. reCAPTCHA v3 runs in the background without presenting a separate challenge to the user, but in return the script it executes on the client is fairly large. This script amounts to 784KB in a single file, and because the download began the moment the page opened, it delayed the rendering of the first screen.\n\nAs a result, LCP measured 17.1 seconds and TTI 18.2 seconds. The LCP benchmark for a page rated as \"fast\" is within 2.5 seconds, so 17 seconds is enough time for a visitor to look at a blank screen, decide the site is not working, and leave.",
    },
    cause: {
      ko: "구글이 안내하는 기본 통합 방식을 그대로 적용해, 앱이 초기화되는 시점에 reCAPTCHA v3 스크립트를 즉시 로드하도록 설정돼 있었다.\n\n그러나 이 스크립트가 실제로 필요한 지점은 하나뿐이다. 방문자가 문의를 남기는 contact form에서 메시지를 제출할 때 토큰을 발급받는 순간이다. 페이지를 둘러보기만 하다 이탈하는 대다수 방문자는 이 폼을 사용하지 않는다. 그런데도 784KB 스크립트가 모든 방문자에게, 매 방문마다 다운로드되고 있었다.\n\n브라우저는 자바스크립트를 메인 스레드에서 단일 순서로 실행한다. 용량이 큰 스크립트를 다운로드하고 파싱·실행하는 작업이 메인 스레드를 장시간 점유하면, 사용자에게 먼저 보여 줘야 할 콘텐츠의 렌더링이 그 뒤로 밀린다. 앱 초기화 시점에 즉시 로드된 784KB 스크립트가 메인 스레드를 블로킹한 것이 LCP 17.1초의 원인이었다.",
      en: "Google's default integration approach was applied as-is, so the reCAPTCHA v3 script was set to load immediately at the moment the app initializes.\n\nHowever, this script is only needed at a single point: the moment a token is issued when a visitor submits a message through the contact form where they leave an inquiry. The majority of visitors, who only look around and leave, do not use this form. Even so, the 784KB script was being downloaded by every visitor, on every visit.\n\nA browser runs JavaScript in a single sequence on the main thread. When downloading, parsing, and executing a large script occupies the main thread for a long time, the rendering of content that should be shown to the user first is pushed behind it. The 784KB script loaded immediately at app initialization blocking the main thread was the cause of the 17.1-second LCP.",
    },
    solution: {
      ko: "스크립트를 로드하는 시점을 옮겼다. '앱 초기화 시점'이 아니라 '방문자가 페이지에서 처음으로 인터랙션을 발생시킨 시점'까지 미뤘다. 여기서 인터랙션은 클릭, 스크롤, 터치 이벤트를 의미한다. 문서에 이 이벤트 리스너를 한 번만 실행되도록 `once` 옵션으로 등록하고, 최초 이벤트가 발생하면 그때 reCAPTCHA v3 스크립트를 삽입한다.\n\ncontact form까지 도달하는 사용자는 그전에 최소 한 번은 클릭이나 스크롤을 하게 된다. 따라서 제출 버튼을 누르는 시점에는 스크립트가 이미 백그라운드에서 다운로드를 마치고 준비된 상태가 된다. 지연 로드로 폼이 느리게 뜰 수 있다는 우려는 실제로는 거의 발생하지 않는다. 또한 페이지를 읽기만 하고 이탈하는 대다수 방문자는 이 스크립트를 아예 다운로드하지 않으므로, 첫 화면이 지연되던 문제가 해소된다.\n\n여기에 더해, 실제 다운로드가 시작되기 전에 구글 도메인으로의 preconnect를 문서 `<head>`에 추가했다. preconnect는 스크립트를 실제로 요청하기 전에 DNS/TLS 핸드셰이크를 미리 완료해 두는 리소스 힌트다. 이후 스크립트를 다운로드할 때, 매번 연결을 새로 수립하는 데 드는 왕복 시간만큼 응답이 더 빨리 도착한다.",
      en: "The moment the script loads was moved. Instead of \"when the app initializes,\" it now waits until \"the first time the visitor triggers an interaction on the page.\" Here, an interaction means a click, scroll, or touch event. The event listeners are registered with the `once` option so they run only one time, and when the first event fires, the reCAPTCHA v3 script is inserted at that point.\n\nAny user who reaches the contact form has clicked or scrolled at least once beforehand. So by the time they press the submit button, the script has already finished downloading in the background and is ready. The concern that deferred loading might make the form appear slowly rarely occurs in practice. In addition, the majority of visitors who only read and leave never download this script at all, so the problem of the first screen being delayed is resolved.\n\nBeyond that, a preconnect to Google's domain was added to the document `<head>` before the actual download begins. Preconnect is a resource hint that completes the DNS/TLS handshake ahead of time, before the script is actually requested. When the script is later downloaded, the response arrives faster by the round-trip time that would otherwise be spent establishing a new connection each time.",
    },
    keyInsight: {
      ko: "외부에서 가져와 페이지에 삽입하는 서드파티 스크립트를 추가하기 전에, '이것이 첫 렌더링 이전부터 필요한가'를 먼저 확인하는 것이 중요하다.\n\n당장 사용하지 않는 용량이 큰 스크립트를 초기화 시점에 즉시 로드하면, 사용자가 실제로 봐야 할 콘텐츠가 몇 초씩 뒤로 밀린다. 실제로 필요해지기 직전까지 로드를 미루는 것이 대체로 더 안전한 기본값이다.\n\n참고로 이 봇 검사는 contact form에만 적용했다. 댓글은 이미 비밀번호와 접속 IP를 함께 확인하는 방식으로 보호되고 있어서, 여기에 reCAPTCHA v3를 추가하면 댓글을 남기려는 사용자의 문턱만 높아지고 보안상 얻는 이득은 크지 않다고 판단했다.",
      en: "Before adding any third-party script that is fetched externally and inserted into a page, it is important to first check whether it needs to be present before the first render.\n\nLoading a large script you do not use right away at initialization pushes the content users actually need back by several seconds. Deferring the load until just before it is genuinely needed is generally the safer default.\n\nFor reference, this bot check was applied to the contact form only. Comments are already protected by checking both a password and the visitor's connecting IP, so adding reCAPTCHA v3 on top would only raise the barrier for anyone trying to leave a comment while providing little security benefit.",
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
  },
  {
    id: "react-re-render-on-every-mousemove",
    problem: { ko: "mousemove마다 React 리렌더 (60fps 성능 저하)", en: "React Re-render on Every mousemove (60fps Performance Degradation)" },
    title: { ko: "React 리렌더 사이클과 ref 우회", en: "The React re-render cycle and a ref bypass" },
    vizKey: "mousemove-rerender",
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
    id: "layout-jumps-when-toggling-code-block",
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
    id: "heavy-cursor-hit-test-dragging-down",
    problem: { ko: "커스텀 커서의 무거운 hit-test가 가벼운 위치 보간을 함께 느리게 만듦", en: "Heavy Cursor Hit-Test Dragging Down Lightweight Position Interpolation" },
    title: { ko: "무거운 작업과 가벼운 작업의 프레임 분리", en: "Separating heavy and light work across frames" },
    vizKey: "cursor-hittest",
    definition: {
      ko: "이 사이트는 OS 커서를 숨기고 직접 그린 커서를 쓴다. 이 커서는 한 프레임 안에서 두 가지를 한다. 마우스 좌표를 향해 조금씩 이동하는 위치 보간과, 지금 어떤 요소 위에 있는지 판별해 모양을 바꾸는 hit-test 다. 마우스를 빠르게 움직이면 **커서 이동이 끊겨 보였다**.",
      en: "The site hides the OS cursor and draws its own. Within a single frame that cursor does two things: interpolating its position toward the mouse coordinate, and running a hit-test to decide which element it sits over and change shape accordingly. Moving the mouse quickly made the motion **visibly stutter**.",
    },
    cause: {
      ko: "hit-test 는 매 프레임 `elementsFromPoint(x, y)` 를 불렀다. 이 API 는 주어진 좌표에 겹쳐 있는 모든 요소를 배열로 돌려준다. 복잡한 레이아웃에서는 한 점 위에 배경·wrapper·카드·텍스트가 수십에서 수백 개까지 겹치므로, 한 프레임의 16ms 예산 중 **몇 ms 를 여기서 쓴다**.\n\n위치 계산 자체는 가볍지만 **같은 루프에 묶여 있어** hit-test 가 끝날 때까지 기다려, 두 작업이 함께 늦어졌다.",
      en: "The hit-test called `elementsFromPoint(x, y)` on every frame. That API returns every element stacked at the given coordinate, and in a complex layout dozens to hundreds of them overlap at one point, consuming **several ms of each frame's 16ms budget**.\n\nThe position math is cheap on its own, but **sharing a loop** meant it waited for the hit-test to finish. Both slowed down together.",
    },
    solution: {
      ko: "두 작업의 주기를 분리했다. 위치 보간은 매 프레임 그대로 두고, hit-test 는 **60ms 간격으로 한 번만** 실행되도록 제한했다. 1초에 60번이 아니라 약 16번만 돌아 프레임당 비용이 거의 사라진다.\n\nhit-test 의 반응은 최대 60ms, 약 4 프레임 늦어진다. 커서 모양이 바뀌는 시점의 4 프레임 지연은 눈에 띄지 않는다. 반면 위치는 한 프레임만 늦어도 끊김이 바로 드러나므로 이쪽만 매 프레임을 유지했다.",
      en: "The two were put on different cadences. Position interpolation still runs every frame; the hit-test is **capped at once per 60ms**, firing about 16 times a second instead of 60, which drops its per-frame cost to near nothing.\n\nThe hit-test now reacts up to 60ms late, about four frames. A four-frame delay in when the cursor changes shape goes unnoticed. Position, by contrast, reveals stutter the moment a single frame is late, so only that task was held to a strict per-frame cadence.",
    },
    keyInsight: {
      ko: "비용이 다른 두 작업을 하나의 루프에 묶으면 **무거운 쪽이 가벼운 쪽까지 끌어내린다**.\n\n분리의 기준은 **이 작업이 정말 매 프레임 필요한가**다. 한 프레임만 늦어도 눈에 보이는 작업은 매 프레임 두고, 조금 늦어도 감지되지 않는 작업은 빈도를 낮춘다. 같은 함수 안에 있더라도 비용과 체감 민감도가 다르면 주기를 다르게 가져가야 한다.",
      en: "When two tasks of different cost share one loop, **the heavy one drags the light one down with it.**\n\nThe test for separating them is **whether a task genuinely needs to run every frame**. Work that shows when a single frame is late stays per-frame; work whose delay goes unnoticed moves to a lower frequency. Even inside one function, differing cost and perceptual sensitivity call for differing cadences.",
    },
  },

  /* ── CSS / Styling ── */
  {
    id: "only-some-section-dividers-look-darker",
    section: { ko: "CSS / Styling", en: "CSS / Styling" },
    problem: { ko: "일부 섹션 구분선만 유독 진하다 — background 단축속성이 background-clip 을 리셋", en: "Only some section dividers look darker — the background shorthand reset background-clip" },
    definition: {
      ko: "대시보드에서 grid gap hairline 트릭(`gap: 1px` + 셀 배경색)으로 얇은 구분선을 그리는데, 통계·최근활동·인기 같은 몇몇 섹션의 title 아래 구분선만 다른 곳보다 눈에 띄게 진하게 보였습니다.",
      en: "The dashboard draws thin dividers with a grid-gap hairline trick (`gap: 1px` + a cell background), but under a few sections' titles — Stats, Recent activity, Popular — that one divider looked noticeably darker than elsewhere.",
    },
    cause: {
      ko: "베이스에서 `background-clip: padding-box` 로 배경을 padding 안쪽까지만 칠하도록 제한해 뒀는데, 반응형 규칙에서 색만 바꾸려고 `background: var(--border-light-color)` **단축속성**을 썼습니다. `background` 는 shorthand 라 명시하지 않은 하위 속성을 전부 초깃값으로 리셋 → `background-clip` 이 `border-box` 로 되돌아갑니다. 그러면 반투명(alpha 0.3) 배경이 border 영역까지 깔리고, 그 위에 얹힌 섹션 divider 의 반투명 `border-top`(alpha 0.3)과 **합성(alpha compositing)** 되어 그 선만 더 진해졌습니다(0.3 위 0.3 ≈ 0.51).",
      en: "The base pins `background-clip: padding-box` so the background only paints inside the padding, but a responsive rule changed just the color with the `background: var(--border-light-color)` **shorthand**. `background` is a shorthand, so it resets every sub-property it doesn't mention to its initial value — `background-clip` snaps back to `border-box`. The semi-transparent (alpha 0.3) background then bleeds under the border area and **composites** with the section divider's semi-transparent `border-top` (alpha 0.3) sitting on top, so that one line reads darker (0.3 over 0.3 ≈ 0.51).",
    },
    solution: {
      ko: "색만 바꿀 때는 `background` 단축속성 대신 `background-color` **롱핸드**를 씁니다. 그러면 베이스의 `background-clip: padding-box` 가 그대로 유지돼 배경이 border 밑으로 새지 않고, border 와의 합성도 사라져 모든 구분선이 같은 농도로 보입니다.",
      en: "When only the color changes, use the `background-color` **longhand** instead of the `background` shorthand. The base's `background-clip: padding-box` is then preserved, so the background never bleeds under the border, the compositing goes away, and every divider reads at the same weight.",
    },
    keyInsight: {
      ko: "**CSS 단축속성은 \"지정 안 한 하위 속성\"을 유지하지 않고 초깃값으로 리셋합니다.** `background`·`transition`·`font` 같은 shorthand 로 한 가지만 바꾸려다 옆에 세팅해 둔 다른 하위 속성(`background-clip`, `transition-property` 등)을 조용히 날리기 쉽습니다 — 한 속성만 바꿀 땐 대응하는 롱핸드를 씁니다.",
      en: "**A CSS shorthand doesn't keep the sub-properties you omit — it resets them to their initial values.** Reaching for `background`/`transition`/`font` to change one thing quietly wipes the neighbouring sub-property you'd set (`background-clip`, `transition-property`, …) — to change one property, use its longhand.",
    },
    tags: ["css", "background-clip", "shorthand", "border", "compositing"],
  },
  {
    id: "global-transition-shorthand-overriding-component-transitions",
    section: { ko: "CSS / Styling", en: "CSS / Styling" },
    problem: { ko: "글로벌 transition shorthand가 컴포넌트 전환 효과를 덮어씀", en: "Global Transition Shorthand Overriding Component Transitions" },
    title: { ko: "CSS specificity와 shorthand 대체", en: "CSS specificity and shorthand replacement" },
    vizKey: "transition-shorthand",
    definition: {
      ko: "이 사이트는 다크 모드와 라이트 모드를 오갈 수 있다. 테마를 전환하는 순간 색이 한 번에 바뀌면 눈에 부담이 되므로, 색이 부드럽게 넘어가도록 전역 CSS 에 `transition` 규칙을 하나 두었다. 이 규칙은 `html[data-theme-ready] *` 형태로 화면의 모든 요소를 대상으로 삼아, `background-color`, `color`, `border-color` 등의 색 관련 속성이 0.3초에 걸쳐 전환되도록 지정한다.\n\n이 규칙을 적용한 뒤 화면 곳곳의 애니메이션이 동작하지 않는 문제가 나타났다. 메뉴를 접었다 펴는 동작, 옆 패널이 슬라이드로 나오는 동작, 팝업이 서서히 떠오르는 동작이 모두 멈췄다. 버튼은 부드럽게 펼쳐지지 않고 한 번에 나타났고, 팝업도 서서히 표시되는 대신 갑자기 나타났다. 색을 부드럽게 전환하려고 넣은 전역 규칙이, 각 컴포넌트가 `max-height`, `opacity`, `transform` 등에 걸어 둔 개별 `transition` 을 함께 무력화했다.",
      en: "This site can switch between a dark mode and a light mode. Because flipping the colors all at once at the moment of a theme change is hard on the eyes, a single `transition` rule was added to the global CSS so the colors ease from one to the other. Written as `html[data-theme-ready] *`, the rule targets every element on the page and transitions color-related properties such as `background-color`, `color`, and `border-color` over 0.3 seconds.\n\nAfter this rule was applied, animations across the page stopped working. Menus that folded open and closed, side panels that slid into view, and popups that rose gradually all stopped animating. Buttons snapped in instead of expanding smoothly, and popups appeared abruptly instead of fading in. The global rule added to ease the colors also disabled the individual `transition` declarations that each component had set on `max-height`, `opacity`, `transform`, and similar properties.",
    },
    cause: {
      ko: "원인은 두 가지가 맞물린 데 있다.\n\n첫째는 selector 의 specificity 다. CSS 에서 두 규칙이 같은 속성을 두고 충돌하면 요소를 더 구체적으로 지목한 쪽, 즉 specificity 가 높은 쪽이 적용된다. 전역 색 전환 규칙에 쓴 `html[data-theme-ready] *` 선택자는 specificity 가 `(0,1,1)` 로, 컴포넌트가 흔히 쓰는 단일 클래스 선택자 `(0,1,0)` 보다 한 단계 높다. 그래서 전역 규칙이 개별 컴포넌트의 `transition` 규칙을 매번 이겼다.\n\n둘째는 `transition` 이 shorthand 속성이라는 점이다. shorthand 는 여러 하위 속성을 한 줄로 묶어 지정하는데, 이렇게 지정하면 기존 값에 더해지지 않고 그 요소의 `transition` 설정 전체를 덮어쓴다. 전역 규칙은 `background-color`, `color` 등 색 관련 속성만 나열했으므로, 이 규칙이 적용되는 순간 컴포넌트가 `max-height` 나 `transform` 에 걸어 둔 `transition` 은 목록에서 사라졌다. 그 결과 색 이외의 애니메이션이 모두 제거됐다.",
      en: "Two factors combined to cause this.\n\nThe first is selector specificity. In CSS, when two rules conflict over the same property, the one that names the element more specifically, that is, the one with higher specificity, is applied. The `html[data-theme-ready] *` selector used for the global color transition has a specificity of `(0,1,1)`, one step higher than the single-class selectors `(0,1,0)` that components commonly use. As a result, the global rule won over each component's `transition` rule every time.\n\nThe second is that `transition` is a shorthand property. A shorthand packs several sub-properties into one line, and when written this way it does not add to existing values; it overwrites the element's entire `transition` setting. The global rule listed only color-related properties such as `background-color` and `color`, so the moment it applied, the `transition` a component had set on `max-height` or `transform` dropped out of the list. Every animation other than color was removed as a result.",
    },
    solution: {
      ko: "개별 컴포넌트의 `transition` 이 전역 규칙에 밀리지 않도록, 컴포넌트 선택자의 specificity 를 전역 규칙보다 높게 올렸다. 단일 클래스로만 지목하던 것을, 부모와 자식을 함께 적는 복합 선택자로 바꿨다.\n\n예를 들어 `.modal` 하나만 쓰던 규칙을 `.modalWrap .modal` 처럼 부모 클래스와 자식 클래스를 이어 붙였다. 이렇게 하면 specificity 가 `(0,1,0)` 에서 `(0,2,0)` 으로 올라가, 전역 규칙의 `(0,1,1)` 보다 높아진다. 그 결과 전역 색 전환 `transition` 은 그대로 유지되면서, 해당 컴포넌트의 `max-height`, `opacity`, `transform` 애니메이션도 다시 동작했다.\n\n같은 문제가 재발하지 않도록, 애니메이션이 갑자기 멈추면 이 지점을 먼저 확인하라는 내용을 프로젝트 메모에 기록했다.",
      en: "To keep each component's `transition` from being overridden by the global rule, the component selectors were given a higher specificity than the global rule. Where a selector named an element with a single class, it was changed to a compound selector that names the parent and the child together.\n\nFor example, a rule that used only `.modal` was rewritten as `.modalWrap .modal`, chaining the parent class and the child class. This raises the specificity from `(0,1,0)` to `(0,2,0)`, above the global rule's `(0,1,1)`. As a result, the global color `transition` stayed intact while the component's `max-height`, `opacity`, and `transform` animations worked again.\n\nTo prevent the same problem from recurring, a note was added to the project memo saying that when an animation suddenly stops, this is the first thing to check.",
    },
    keyInsight: {
      ko: "핵심은 `transition` 처럼 shorthand 속성으로 지정하면 기존 값에 더해지지 않고 전체를 교체한다는 점이다. 전역 규칙이 나열하지 않은 속성의 `transition` 은 직접 건드리지 않아도 함께 사라진다.\n\n따라서 전역에 이런 규칙을 걸어야 할 때는 shorthand 로 묶지 말고 `transition-property` 와 `transition-duration` 을 개별 속성으로 나눠 적는 편이 안전하다. 또는 애니메이션이 유지되어야 하는 요소의 선택자를 미리 복합 선택자로 만들어 specificity 를 높여 두면, 전역 규칙에 밀리지 않고 자기 `transition` 을 유지할 수 있다.",
      en: "The key point is that specifying with a shorthand property like `transition` does not add to existing values; it replaces the whole set. The `transition` for any property the global rule did not list disappears along with it, even though it was never touched directly.\n\nSo when such a rule must be applied globally, it is safer to split it into individual properties such as `transition-property` and `transition-duration` rather than combining them into a shorthand. Alternatively, giving the selectors of elements that must keep their animation a higher specificity in advance, by making them compound selectors, lets them retain their own `transition` instead of being overridden by the global rule.",
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
    id: "code-highlighting-wrap-button-vanishing-on",
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
    id: "cursor-jumping-randomly-when-contextual-toolbar",
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
    id: "toggle-callout-and-column-block-content",
    problem: { ko: "토글·콜아웃·열블록 콘텐츠가 저장 후 사라짐", en: "Toggle, Callout, and Column Block Content Disappearing After Save" },
    title: { ko: "라이브러리 기본 동작과 명시적 지정의 차이", en: "Library defaults versus explicit overrides" },
    vizKey: "block-deserialize",
    definition: {
      ko: "이 블로그의 글은 Plate 에디터로 작성합니다. 문단 외에도 몇 가지 블록을 본문 사이에 넣을 수 있는데, 눌러서 접고 펴는 토글, 배경색으로 강조하는 콜아웃, 화면을 여러 칸으로 나누는 두 종류의 열 블록이 여기에 해당합니다. 이 블록들은 바깥 컨테이너 안에 다시 본문 노드를 담는 중첩 구조를 가집니다.\n\n증상은 이 블록 안에 작성한 본문이 저장 후 사라지는 것이었습니다. 에디터에서 콜아웃을 하나 만들고 그 안에 본문을 두 줄 작성한 뒤 저장하고, 페이지를 닫았다가 다시 열면 블록의 바깥 컨테이너는 그대로 남아 있는데 안에 작성한 두 줄은 비어 있었습니다. 저장한 본문이 다시 여는 시점에 사라지므로 겉으로는 저장 자체가 실패한 것처럼 보였습니다. 동일한 증상이 토글과 콜아웃, 그리고 두 종류의 열 블록까지 네 블록 모두에서 나타났습니다.",
      en: "The posts on this blog are written in the Plate editor. Beyond plain paragraphs, you can insert several kinds of blocks into the body: a toggle you click to fold and unfold, a callout that draws emphasis with a background color, and two kinds of column blocks that divide the screen into lanes. These blocks share a nested structure, an outer container that again holds body nodes inside it.\n\nThe symptom was that body text written inside one of these blocks disappeared after saving. If you created a callout in the editor, wrote two lines of body text inside it, saved, closed the page, and opened it again, the outer container of the block remained while the two lines written inside were empty. Because the saved body vanished at the moment of reopening, from the outside it looked as though the save itself had failed. The same symptom appeared in all four blocks: the toggle, the callout, and the two kinds of column blocks.",
    },
    cause: {
      ko: "저장 시 본문은 HTML 문자열로 직렬화되어 데이터베이스에 보관됩니다. 페이지를 다시 열 때 에디터는 이 HTML 을 반대로 읽어 Plate 가 다루는 내부 노드 구조로 되돌리는데, 이 역직렬화를 담당하는 것이 블록마다 등록된 deserializer 입니다.\n\n각 블록 타입은 자신의 deserializer 에서 HTML 요소를 어떤 노드로 복원할지 지정합니다. 네 블록의 deserializer 는 모두 반환하는 노드에 `children: []` 를 함께 지정하고 있었습니다.\n\nPlate 의 deserializer 는 `children` 지정 여부에 따라 두 가지로 동작합니다. `children` 을 지정하지 않으면 Plate 가 해당 HTML 요소의 자식들을 재귀 파싱으로 직접 읽어 노드로 복원합니다. 이것이 기본 동작입니다. 반대로 `children` 을 명시하면 Plate 는 지정된 값만 사용하고 HTML 자식을 스스로 파싱하는 과정은 건너뜁니다.\n\n따라서 `children: []` 는 자식이 빈 배열이라고 명시적으로 지정한 것으로 해석됩니다. 저장된 HTML 안에 본문 노드가 들어 있어도 Plate 는 그 자식을 파싱하지 않고, 지정받은 대로 내부가 빈 블록을 만들었습니다. 네 블록에서 본문이 사라진 원인이 이것이었습니다.",
      en: "On save, the body is serialized to an HTML string and stored in the database. When the page is opened again, the editor reads that HTML in reverse and turns it back into the internal node structure Plate works with. The deserializer registered for each block is what handles this deserialization.\n\nEach block type specifies, in its deserializer, what node an HTML element should be restored as. The deserializers for all four blocks specified `children: []` on the node they returned.\n\nA Plate deserializer behaves in one of two ways depending on whether `children` is specified. If `children` is not given, Plate reads the children of that HTML element itself through recursive parsing and restores them as nodes. This is the default behavior. If `children` is specified instead, Plate uses only the given value and skips parsing the HTML children on its own.\n\nSo `children: []` is interpreted as explicitly specifying that the children are an empty array. Even though body nodes were present inside the saved HTML, Plate did not parse those children and produced a block with an empty inside, exactly as specified. This was the cause of the body disappearing in all four blocks.",
    },
    solution: {
      ko: "수정한 부분은 네 블록 deserializer 에서 `children: []` 한 줄을 제거한 것이었습니다.\n\n이 지정이 없어지면 Plate 는 `children` 에 대한 지시를 받지 않은 상태가 되고, 앞서 설명한 기본 동작이 다시 적용됩니다. 즉 저장된 HTML 요소의 자식을 재귀 파싱으로 직접 읽어 본문 노드를 원래대로 복원합니다. 자식을 빈 배열로 고정하는 지정이 사라졌으므로 저장된 본문이 더 이상 버려지지 않습니다. 문제가 있던 토글과 콜아웃, 두 종류의 열 블록에서 동일하게 이 한 줄만 제거해 네 곳을 한 번에 바로잡았습니다.",
      en: "The change was to remove the single line `children: []` from the deserializers of the four blocks.\n\nWith that specification gone, Plate is left with no instruction about `children`, and the default behavior described earlier applies again: it reads the children of the saved HTML element through recursive parsing and restores the body nodes as they were. Because the specification that fixed the children to an empty array was gone, the saved body is no longer discarded. Removing this one line in the same way from the toggle, the callout, and the two kinds of column blocks corrected all four at once.",
    },
    keyInsight: {
      ko: "라이브러리를 가져다 쓸 때, 값을 지정하지 않았을 때의 기본 동작과 값을 명시적으로 지정한 경우를 라이브러리가 내부에서 어떻게 구분하는지 정확히 이해하지 못하면, 안전해 보이는 한 줄이 자동 동작 전체를 꺼 버릴 수 있습니다.\n\n이번 경우 `children` 을 지정하지 않는 것은 Plate 에게 HTML 자식을 알아서 파싱하라는 뜻이었고, `children` 을 지정하는 것은 지정한 값만 쓰고 자동 파싱은 끄라는 뜻이었습니다. `children: []` 처럼 빈 배열을 넣는 것조차 자식이 없다고 의도적으로 지정한 것으로 해석되었습니다.\n\n정리하면, 모든 값을 빠짐없이 명시하는 편이 항상 더 안전하다는 전제가 언제나 옳지는 않다는 것, 그리고 가져다 쓰는 라이브러리가 아무것도 지정하지 않은 기본 상태에서 무엇을 하는지 최소 한 번은 확인해야 한다는 것입니다.",
      en: "When you bring in a library, if you don't accurately understand how it distinguishes its default behavior with no value given from the case where a value is set explicitly, a single line that looks safe can switch off an entire automatic behavior.\n\nIn this case, not specifying `children` meant telling Plate to parse the HTML children on its own, while specifying `children` meant using only the given value and turning the automatic parsing off. Even putting in an empty array as `children: []` was interpreted as deliberately specifying that there are no children.\n\nThe takeaways are that the premise that spelling out every value in full is always the safer choice is not always correct, and that it is worth checking at least once what a library you rely on does in its untouched default state.",
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
    id: "code-highlighting-dies-only-in-the",
    problem: { ko: "코드블록 하이라이팅이 브라우저에서만 죽음 — 빌드·테스트는 전부 통과", en: "Code Highlighting Dies Only in the Browser — Build and Tests All Pass" },
    title: { ko: "트랜스파일과 빌드–런타임 간극", en: "Transpilation and the build–runtime gap" },
    vizKey: "codeblock-highlight",
    definition: {
      ko: "에디터 코드블록에서 HTML 만 색이 하나도 들어가지 않았다. 언어 판별은 정확했고 CSS 같은 다른 언어는 멀쩡했다. 빌드는 통과했고, 문제는 **브라우저에서 열었을 때만** 나타났다.",
      en: "In the editor's code blocks, HTML alone came out with no syntax colors. Language detection was correct and other languages such as CSS rendered fine. The build passed, and the problem appeared **only in a real browser**.",
    },
    cause: {
      ko: "브라우저 콘솔에 정규식이 유효하지 않다는 오류가 한 줄 남아 있었다.\n\n`highlight.js` 는 태그 이름을 판별할 때 모든 언어의 문자를 한 기호로 가리키는 `\\p{L}` 을 쓴다. 번들러가 구형 브라우저용으로 변환하면서 이 표기를 실제 코드포인트 범위의 나열로 풀어쓰는데, 그 목록에는 16비트 두 칸으로 표현되는 상위 평면 문자가 들어간다. 정규식은 `u` 플래그가 켜져 있어야 두 칸을 한 글자로 읽는다. 그런데 `highlight.js` 내부의 `countMatchGroups` 는 이 규칙을 `new RegExp(re.toString() + \"|\")` 로 다시 만들면서 `u` 를 빠뜨린다.\n\n이 재파싱은 언어를 컴파일하는 시점, 즉 `highlight()` 를 부를 때 일어난다. 코드블록을 색칠하려는 순간 SyntaxError 가 나고, **Plate 가 그 예외를 잡아 평문으로 되돌린다.** 페이지는 멀쩡하고 색만 들어오지 않는다. 화면에 드러나는 것이 그게 전부라 진짜 원인은 콘솔에만 남는다.\n\n테스트는 변환 전 원본으로 돌기 때문에 문제의 형태가 **아예 존재하지 않는다**. CSS 가 멀쩡했던 것은 그 규칙에 `\\p{L}` 이 없어서다.",
      en: "One line in the browser console said a regular expression was invalid.\n\n`highlight.js` identifies tag names with `\\p{L}`, a shorthand standing for every letter in every language. Converting the file for older browsers, the bundler expands that shorthand into a list of actual codepoint ranges, and the list includes astral-plane characters written as two 16-bit units. A regular expression reads those two units as one character only when the `u` flag is on, and `highlight.js`'s internal `countMatchGroups` rebuilds the rule as `new RegExp(re.toString() + \"|\")`, dropping `u`.\n\nThat reparse happens when the language is compiled, which is when `highlight()` is called. A SyntaxError is thrown the moment a code block is about to be colored, and **Plate catches it and falls back to plain text.** The page stays fine; only the color is missing. Since that is all the screen shows, the real cause stays in the console.\n\nThe tests run against the untransformed source, where **the problematic form does not exist**. CSS survived because its rules contain no `\\p{L}`.",
    },
    solution: {
      ko: "규칙을 등록하는 시점에 하나씩 훑어, 문제가 되는 상위 평면 표기를 걷어내고 `u` 플래그도 함께 뗐다. 태그 이름에 상위 평면 문자가 쓰일 일은 거의 없고, 한글·한자처럼 실제로 쓰는 글자는 그대로 남아 정상 색칠된다.\n\n**한 번 헛짚었다**. 처음에는 이미 컴파일된 `RegExp` 객체만 고쳤는데 아무 변화가 없었다. 규칙 조각을 이어 붙일 때 완성된 `RegExp` 가 아니라 **문자열로 넘어가고 있었고**, 문제의 표기는 그 문자열 안에 있었다.\n\n테스트는 원본으로 돌기 때문에 번들된 상태를 재현할 수 없다. 그래서 재현 대신 불변식을 검사하기로 했다. 등록된 문법의 모든 정규식을 모아, hljs 가 내부에서 하는 flag 없는 재파싱(`new RegExp(re.toString() + \"|\")`)을 견디는지 확인한다. 하나라도 깨지면 그 언어는 브라우저에서 죽는다는 뜻이다.",
      en: "At the point where the rules are registered, each one is scanned and the astral-plane notation is stripped along with the `u` flag. Astral characters are almost never used in tag names, while everyday characters such as Korean and Chinese stay in place and color normally.\n\n**There was one false start.** At first only the already-compiled `RegExp` objects were changed, with no effect. When `highlight.js` joins its rule fragments it passes them as **plain strings** rather than finished `RegExp` objects, and the notation lived inside those strings.\n\nThe tests run against the original source and cannot reproduce the bundled state, so instead of reproducing it they check an invariant. Every regular expression in the registered grammars is collected and put through the flagless reparse hljs performs internally (`new RegExp(re.toString() + \"|\")`). If even one fails, that language dies in the browser.",
    },
    keyInsight: {
      ko: "**빌드와 테스트를 통과했다는 것이 정상 동작을 뜻하지는 않는다**. 테스트가 도는 환경과 코드가 실제로 실행되는 환경이 다르면, 그 차이에서 생기는 문제는 **테스트가 처음부터 잡을 수 없다**.\n\n라이브러리가 오류를 조용히 삼키면 거리가 더 벌어진다. 화면에는 색이 안 들어온 것으로만 보이고 진짜 원인은 콘솔에만 남는다. 겉 증상과 실제 원인이 멀 때는 추측보다 콘솔과 번들 산출물을 먼저 확보하는 편이 빠르다.",
      en: "**Passing the build and the tests does not by itself mean the code works.** When the environment the tests run in differs from the one the code actually runs in, a failure arising from that gap is something **the tests could never catch**.\n\nA library that swallows its errors widens the gap. On screen it looks like the colors simply did not arrive, while the real cause stays in the console. When the visible symptom is far from the cause, gathering evidence from the console and the bundle output beats guessing.",
    },
    tags: ["highlight.js", "Bundler", "RegExp", "Plate"],
  },
  {
    id: "after-select-all-delete-in-a",
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
    id: "footnotes-inside-headings-not-processed-during",
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
    id: "cannot-distinguish-click-vs-keyboard-for",
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
    id: "admin-list-series-trash-posts-ui",
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
    id: "revision-prompt-loops-due-to-category",
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
    id: "cannot-place-cursor-or-type-next",
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
    id: "auto-save-v2-character-level-draft",
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
    id: "youtube-embed-url-watch-url-fails",
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
    id: "image-resize-handle-click-deletes-image",
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
    id: "editor-toolbar-active-state-wrapper-block",
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
    id: "footnote-ref-content-integrity-orphan-nodes",
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
    id: "multi-block-selection-background-covers-floated",
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
    id: "clicking-a-floated-image-inline-void",
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
    id: "link-click-immediately-navigates-cannot-edit",
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
    id: "loadingscreen-not-included-in-ssr-content",
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
    id: "cta-button-backdrop-filter-blurs-nothing",
    section: { ko: "Frontend / CSS", en: "Frontend / CSS" },
    problem: {
      ko: "CTA 버튼의 `backdrop-filter` 가 배경을 안 흐림 — 조상의 compositing layer 승격에 막혀서",
      en: "CTA button `backdrop-filter` blurs nothing — blocked by an ancestor compositing layer",
    },
    title: { ko: "compositing layer 경계와 backdrop-filter", en: "Compositing layers and backdrop-filter" },
    vizKey: "backdrop-layer",
    definition: {
      ko: "홈 화면 CTA 섹션의 \"Contact / Resume\" 버튼은 호버 시 뒤쪽 3D 커피잔이 흐릿하게 비치는 \"유리창 너머\" 효과 (`backdrop-filter: blur()`) 를 사용합니다.\n\n그런데 이 효과가 **전혀 표시되지 않았습니다.** 단순한 반투명 tint 만 약하게 깔리는 정도였습니다. DevTools \"Computed\" 탭에서 `backdrop-filter` 속성은 분명히 적용되어 있는데, 실제 blur 가 발생하는 단계 (\"sampling\") 가 동작하지 않은 것입니다.",
      en: "The home page CTA section's \"Contact / Resume\" buttons use a \"glass through which the 3D coffee cup behind blurs\" effect (`backdrop-filter: blur()`) on hover.\n\n**The blur was completely invisible** — just a faint translucent tint. DevTools Computed showed the `backdrop-filter` property applied, yet no actual sampling occurred.",
    },
    cause: {
      ko: "홈 진입 애니메이션이 `.home` 래퍼를 `y: '100vh' → 0` 으로 슬라이드 업 하는 **transform 기반** 이었습니다.\n\n애니메이션이 종료된 후에도 framer-motion 이 `transform: translate3d(0,0,0)` 와 `will-change` hint 를 그대로 유지합니다. 사소해 보이지만 이것이 결정적이었습니다. **`.home` 이 자체 compositing layer (브라우저가 내부적으로 별도 GPU 텍스처로 분리해 그리는 layer) 로 승격되는 트리거** 가 되기 때문입니다.\n\n일단 layer 가 분리되면, 내부 자식의 `backdrop-filter` 는 해당 layer **안의 픽셀만** 샘플링할 수 있습니다. layer 바깥에 있는 픽셀 (= 그 아래의 3D 커피 canvas) 은 \"뒤에 아무것도 없는 것\" 으로 처리되므로, blur 자체는 동작하지만 \"비빌 대상\" 이 없어 결과적으로 보이지 않게 됩니다.\n\n추가로 `-webkit-backdrop-filter` 접두사가 환경에 따라 Chrome 의 declaration 파싱을 꼬이게 만드는 경우도 있어 효과를 더 약화시켰습니다.",
      en: "The home entrance animation slid the `.home` wrapper up via a **transform-based** `y: '100vh' → 0`.\n\nAfter the animation finished, framer-motion kept the `transform: translate3d(0,0,0)` and `will-change` hint in place. That sounds harmless, but it's enough to **promote `.home` into its own compositing layer** (a separate GPU texture, internally).\n\nOnce that happens, a descendant's `backdrop-filter` can only sample **inside that layer's boundary** — pixels outside, like the 3D coffee canvas below, are treated as if there's nothing there.\n\nOn top of that, the `-webkit-backdrop-filter` prefix can confuse Chrome's declaration parser in some environments, weakening the effect further.",
    },
    solution: {
      ko: "진입 애니메이션을 **`y` (transform 기반) → `marginTop` (layout 기반)** 으로 교체했습니다.\n\nmargin / padding / width 같은 layout 속성은 GPU 가 아니라 CPU 에서 처리되며 compositing layer 를 생성하지 않습니다. 따라서 `.home` 이 다시 일반 layer 로 돌아오고, 하위 버튼의 `backdrop-filter` 가 layer 경계 너머의 커피 canvas 까지 정상적으로 샘플링하게 됩니다.\n\n또한 layer 를 분리하는 다른 트리거 (예: `.home` 의 `border-radius` + `overflow: clip` 조합) 도 함께 정리하고, `-webkit-backdrop-filter` 접두사는 제거했습니다. 요즘 브라우저는 표준 `backdrop-filter` 만으로 충분히 동작합니다.",
      en: "Swapped the entrance from **`y` (transform-based) → `marginTop` (layout-based)**.\n\nLayout properties — margin, padding, width — run on the CPU and don't promote a compositing layer. With that change, `.home` falls back to a normal layer, and descendants' `backdrop-filter` can sample the coffee canvas behind the layer boundary again.\n\nAdditionally removed other promotion triggers like `.home`'s `border-radius` + `overflow: clip` combo, and dropped `-webkit-backdrop-filter` (modern browsers only need the standard `backdrop-filter`).",
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
          { cells: [{ ko: "호버 시 유리 blur", en: "Hover glass blur" }, { ko: "✗ 안 보임", en: "✗ Not visible" }, { ko: "✓ 정상 표시", en: "✓ Works" }] },
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
    ],
  },
  {
    id: "plate-inline-code-arrow-key-cursor",
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
    id: "admin-table-row-border-cuts-off",
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
    id: "page-transition-stuck-at-hold-skeleton",
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
    id: "posts-bento-grid-template-rows-alone",
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
    id: "sticky-filterbar-intersectionobserver-1px-drift-against",
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
    id: "series-deck-hover-unfold-disappears-then",
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
    id: "working-around-html5-d-d-quirks",
    section: { ko: "Frontend / Interaction", en: "Frontend / Interaction" },
    problem: {
      ko: "HTML5 D&D 의 quirks 회피 — chip 드래그 정렬을 pointer 기반으로 전환",
      en: "Working around HTML5 D&D quirks — replacing chip-reorder drag with pointer events",
    },
    title: { ko: "표준 API 를 버리고 pointer 기반으로", en: "Choosing pointer events over the standard drag API" },
    definition: {
      ko: "이 사이트에는 글쓴이가 자기 글과 작품을 직접 관리하는 admin 화면이 있다. 이 화면의 두 곳에서 항목을 끌어 순서를 바꾸는 정렬 기능을 제공한다. 한 곳은 글에 붙는 태그, 즉 그 글의 주제를 짧게 나타내는 라벨을 배치하고 순서를 정하는 곳이고, 다른 한 곳은 여러 작품을 페이지네이션으로 나눠 보여 주면서 어떤 작품을 앞쪽에 둘지 정하는 곳이다.\n\n목표 동작은 단순하다. 항목을 집어 원하는 자리에 끌어다 놓으면 순서가 그에 맞게 바뀌는 것이다. 초기 구현은 브라우저가 표준으로 제공하는 HTML5 드래그 앤 드롭 API 를 그대로 사용했고, 이 방식에서 세 가지 문제가 함께 나타났다.\n\n첫째, 드래그가 시작되지 않았다. 항목을 집어 당겨도 화면에는 변화가 없었고, 특히 집은 직후 바로 당기면 브라우저가 그 동작을 처리하지 않았다.\n\n둘째, 두 곳을 같은 방식으로 구현했는데도 이동 방향에 따라 결과가 달랐다. 뒤쪽 항목을 앞으로 옮기는 것은 정상 동작했지만, 앞쪽 항목을 뒤로 옮기는 것은 동작하지 않았다.\n\n셋째, 페이지를 넘기면 진행 중이던 드래그가 취소되었다. 페이지네이션으로 나뉜 목록에서 항목을 집은 채 다음 페이지로 이동하려 하면, 집고 있던 항목이 화면에서 사라지면서 드래그가 중단되었다.",
      en: "This site has an admin area where the author manages their own posts and works. Two places inside it let you drag an item to change its order. One arranges the tags on a post, the short labels that indicate what the post is about, and sets their order; the other spreads a set of works across several paginated pages and sets which works appear near the front.\n\nThe intended behavior is simple. You pick up an item, drop it where you want, and the order changes to match. The initial implementation used the browser's standard HTML5 Drag and Drop API, and this approach produced three problems together.\n\nFirst, the drag did not start. Picking up an item and pulling it produced no change on screen, and if the pull began immediately after grabbing the item, the browser did not process the action at all.\n\nSecond, although both places were built the same way, the result depended on the direction of the move. Moving an item from the back toward the front worked, but moving one from the front toward the back did not.\n\nThird, turning the page cancelled the drag in progress. In a paginated list, holding an item while moving to the next page made the held item disappear from the screen, and the drag stopped.",
    },
    cause: {
      ko: "HTML5 드래그 앤 드롭 API 에는 두 가지 성질이 있고, 이 성질들이 구현하려던 동작과 맞지 않았다.\n\n먼저 이 API 는 '이 항목을 끌어도 되는가'를 드래그가 시작되는 순간, 즉 `dragstart` 시점에 `draggable` 속성으로 한 번만 확인하고 그 뒤에는 상태가 바뀌어도 다시 확인하지 않는다. 반면 이번 구현은 지금 집은 항목만 끌 수 있도록 그 시점에 state 로 `draggable` 을 켜는 방식을 썼다. 문제는 React 의 state batching 때문에 상태 변경이 화면에 한 박자 늦게 반영된다는 점이다. 사용자가 항목을 처음 집는 순간에는 아직 `draggable` 이 꺼진 상태가 남아 있고, 브라우저는 그 한 번의 확인에서 끌 수 없다는 값을 읽고 동작을 무시한다. 첫 번째 문제의 원인이 이것이다.\n\n다음으로 이 API 는 드래그 중인 항목이 드래그가 끝날 때까지 화면에 남아 있다고 가정하고, 도중에 그 요소가 화면에서 사라지면(unmount) 드래그를 취소한다. 페이지를 넘기면 집고 있던 항목이 목록에서 빠지며 unmount 되므로, 브라우저는 끌 대상이 없어졌다고 판단하고 드래그를 중단한다. 세 번째 문제의 원인이 이것이다.\n\n방향에 따라 달라지던 두 번째 문제도 원인은 같다. 항목이 앞에서 뒤로 이동하면 화면을 다시 그리는 과정에서 목록이 새로 구성되고, 그 항목은 다른 위치에 다시 그려진다. 브라우저는 이것을 기존 요소가 사라지고 다른 위치에 새 요소가 생긴 것으로 인식해 드래그하던 대상을 놓친다. 작은 순서 바꾸기 하나에 여러 문제가 함께 발생했다.",
      en: "The HTML5 Drag and Drop API has two traits, and both conflicted with the intended behavior.\n\nFirst, it checks whether an item may be dragged only once, at `dragstart`, by reading the `draggable` attribute, and after that it does not check again no matter how the state changes. This implementation, however, enabled dragging only for the item currently held, turning `draggable` on with state at that moment. The problem is that React's state batching applies the change to the screen a beat late. At the instant the user first grabs an item, `draggable` is still off, and on its single check the browser reads 'not draggable' and ignores the action. This is the cause of the first problem.\n\nSecond, the API assumes the dragged item stays on screen until the drag ends, and it cancels the drag if that element disappears partway through, that is, when it unmounts. Turning the page removes the held item from the list and unmounts it, so the browser concludes the target is gone and stops the drag. This is the cause of the third problem.\n\nThe second problem, which varied with direction, has the same cause. When an item moves from front to back, redrawing rebuilds the list and paints that item in a different position. The browser reads this as the existing element disappearing and a new element appearing elsewhere, so it loses track of what was being dragged. A single small reordering feature produced several problems together.",
    },
    solution: {
      ko: "두 곳 모두 표준 API 를 쓰지 않고, pointer events 로 마우스나 손가락의 움직임을 처음부터 끝까지 직접 추적하는 방식으로 바꿨다. 움직임을 직접 처리하므로 앞서의 문제들이 발생하지 않는다.\n\n동작 방식은 다음과 같다. 항목의 핸들에서 `pointerdown` 이 발생하는 순간, 커서가 화면 어디로 움직이든 따라가고 언제 떼는지 감지하도록 `pointermove` 와 `pointerup` 리스너를 붙인다. 커서가 움직일 때마다 그 좌표를 `elementFromPoint` 에 넘겨 현재 커서가 어느 항목 위에 있는지 직접 계산한다. 손을 떼면 처음 집은 항목과 놓인 위치를 비교해 순서를 새로 정하고 그 결과를 화면에 반영한다.\n\n페이지네이션된 목록에는 처리를 하나 더 추가했다. 사용자가 목록의 위쪽이나 아래쪽 가장자리, 즉 폭이 60픽셀 정도인 좁은 띠 위에 잠시 머무르면 페이지만 넘기는 것이 아니라 그 시점에 집고 있던 항목을 옆 페이지의 맨 앞이나 맨 뒤로 실제로 옮긴다(`apply()`). 이렇게 하면 페이지가 바뀌어도 그 항목이 unmount 되지 않고 새 페이지의 첫 항목으로 남으므로 드래그가 중간에 끊기지 않는다.\n\n의도적으로 사용하지 않은 기능이 하나 있다. 한 요소가 이후의 모든 포인터 입력을 독점하게 하는 `setPointerCapture` 는 쓰지 않았다. 이 기능을 켜면 바깥 컨테이너가 그 안의 작은 버튼을 향한 클릭까지 흡수해, 항목을 삭제하는 `×` 버튼을 눌러도 동작하지 않기 때문이다.",
      en: "In both places the standard API was dropped and replaced with pointer events that track the movement of the mouse or finger directly, from start to finish. Because the movement is handled directly, the earlier problems do not occur.\n\nIt works as follows. The moment `pointerdown` fires on an item's handle, `pointermove` and `pointerup` listeners are attached to follow the cursor wherever it moves and to detect when it is released. Each time the cursor moves, its coordinates are passed to `elementFromPoint` to compute directly which item it is currently over. On release, the item first picked up is compared with the position where it was dropped, the new order is determined, and the result is applied to the screen.\n\nFor the paginated list, one more piece was added. When the user lingers over the top or bottom edge of the list, a narrow band roughly 60 pixels wide, the page does not simply advance; at that point the held item is actually moved to the first or last slot of the neighboring page via `apply()`. As a result, even when the page changes, the item does not unmount but remains as the first item of the new page, so the drag is not interrupted.\n\nOne feature was deliberately avoided. `setPointerCapture`, which lets a single element take over all subsequent pointer input, was not used. When it is enabled, the outer container absorbs even the clicks aimed at the small buttons inside it, so pressing an item's `×` remove button would no longer respond.",
    },
    keyInsight: {
      ko: "HTML5 드래그 앤 드롭 API 는 운영체제 차원에서 이미지나 파일을 한 프로그램에서 다른 프로그램으로 옮기는 상황을 전제로 설계되었다. 창과 창을 넘나드는 비교적 큰 단위의 이동에 맞춰져 있다.\n\n그래서 반대되는 용도, 즉 같은 화면 안에서 작은 항목들의 순서만 바꾸는 데 이 API 를 쓰면 원래부터 있던 제약이 곧바로 드러난다. React 의 state 흐름과 어긋나는 점, 요소가 unmount 되는 순간 드래그가 취소되는 점, 안쪽 버튼을 향한 클릭이 가로막히는 점, 이동 방향에 따라 동작이 달라지는 점, 드래그 중 커서를 따라다니는 미리보기 이미지(drag image)를 원하는 모양으로 조정하기 어려운 점이 모두 그런 예다.\n\n작은 순서 바꾸기 정도라면 처음부터 pointer events 로 커서의 움직임을 직접 추적하도록 구현하는 편이 코드도 더 짧고 동작도 더 일관된다. 표준으로 정해진 API 가 존재한다는 사실이 곧 그 상황에서도 그것을 써야 한다는 뜻은 아니라는 점을 이번 사례가 보여 준다.",
      en: "The HTML5 Drag and Drop API was designed for one situation: moving an image or a file from one program to another at the level of the operating system. It is tuned for the relatively large moves that cross from one window into another.\n\nSo when it is used for the opposite purpose, changing only the order of small items within a single screen, the constraints it has always carried appear right away. Its conflict with React's state flow, its cancelling the moment an element unmounts, its blocking of clicks aimed at the buttons inside, its behavior shifting with the direction of the move, and the difficulty of shaping the preview image that trails the cursor, the drag image, into a desired form are all examples of this.\n\nFor a small reorder, implementing it from the outset with pointer events to follow the cursor's movement directly yields both shorter code and more consistent behavior. This case shows that the mere existence of a standard API does not by itself mean it should be used in every situation.",
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
    id: "navigation-menu-overlaps-the-right-actions",
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
    id: "image-fallback-react-onerror-doesn-t",
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
    id: "cover-image-palette-and-other-grid",
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
    id: "custom-colorpicker-popover-anchors-to-the",
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
    id: "anonymous-comment-edit-delete-client-required",
    section: { ko: "Backend / Security", en: "Backend / Security" },
    problem: {
      ko: "익명 댓글 수정·삭제 — 클라이언트는 비밀번호 강제, 서버는 우회 허용",
      en: "Anonymous Comment Edit/Delete — Client Required Password, Server Allowed Bypass",
    },
    title: { ko: "클라이언트가 아니라 서버가 강제하는 인증", en: "Authorization enforced by the server, not the client" },
    vizKey: "anon-comment-auth",
    definition: {
      ko: "익명 댓글은 계정이 없으므로, 작성할 때 입력한 **비밀번호로 본인을 확인한다**. 화면은 그 규칙대로 동작한다. 그런데 서버 라우트를 다시 읽어 보니 **비밀번호 없이도 통과하는 경로**가 살아 있었다.",
      en: "An anonymous comment has no account behind it, so **the password entered when posting is what verifies the author**. The screen follows that rule. Re-reading the server routes, though, showed a path still open that let a request through with no password.",
    },
    cause: {
      ko: "익명 작성자를 알아보는 `commenter_hash` 는 브라우저의 `commenter_id` 와 글의 `target_id` 를 31비트 해시로 압축한 값이다. 이 값 하나가 **두 가지 역할**을 수행한다.\n1. 나머지 연산으로 아바타 이모지와 닉네임을 선택한다.\n2. 수정·삭제 요청이 오면 요청자가 그 댓글을 쓴 작성자(브라우저)인지 판정한다.\n\n요청에 담겨 온 `commenter_id` 와 `target_id` 로 해시를 다시 계산해 저장된 값과 대조하는 방식으로 사용자를 식별하며, **비밀번호와 별개로 동작한다**. 같은 브라우저에서 방금 쓴 댓글을 수정 및 삭제할 때마다 비밀번호를 입력하게 하면 번거로우므로, 브라우저에 저장된 값으로 작성자를 알아보는 용도로 사용한다.\n\n그리고 클라이언트가 이 값을 알아야 아바타를 표시할 수 있으므로 공개 GET 응답에도 포함된다.\n\n```ts\nif (password && comment.password_hash) {\n  authorized = await bcrypt.compare(password, comment.password_hash);\n} else if (commenter_id && target_id && comment.commenter_hash) {\n  authorized = comment.commenter_hash === identity.hash;  // 비밀번호 없이 통과\n}\n```\n\n폼은 비밀번호를 반드시 받으므로 화면에서 나가는 요청에는 언제나 비밀번호가 들어 있다. 그런 요청은 첫 조건에서 인증이 끝나고 해시 분기까지 내려가지 않는다. 하지만 악의적인 공격자는 폼을 거치지 않고 `curl` 로 비밀번호가 없는 요청을 직접 만들어 보낼 수 있고, 그러면 해시 분기로 넘어가게 된다.\n\n이 분기의 판정은 요청에 담겨 온 값으로 해시를 다시 계산해 저장된 값과 같은지 보는 것이 전부다. 그래서 공격자는 피해자의 `commenter_id` 자체를 **알아낼 필요가 없다**. 계산 결과만 같으면 되므로, 결과가 같아지는 다른 값을 넣어도 통과한다.\n\n맞춰야 할 목표값도 이미 공개돼 있다. 저장된 해시가 공개 GET 응답에 그대로 실려 나오기 때문이다. 남은 일은 그 해시가 나오는 값을 찾는 것뿐인데, 해시가 31비트여서 경우의 수가 **약 20억**이다. 무작위로 대입하면 단일 코어로 약 30분이면 하나가 걸린다.\n\n공격은 총 세 단계에 걸쳐서 이루어진다.\n1. 공개 GET 으로 피해자 댓글의 `commenter_hash` 를 읽는다.\n2. 같은 해시가 나오는 `commenter_id` 를 brute-force 로 찾는다.\n3. 그 값을 담아 비밀번호 없이 `PATCH`·`DELETE` 를 보낸다.\n\n삭제된 댓글은 답글이 없으면 행 자체가 지워져 복구할 수 없고, 수정된 댓글은 작성자 이름과 아바타가 그대로라 읽는 사람에게는 작성자가 직접 고친 것으로 보인다.",
      en: "`commenter_hash`, the value that identifies an anonymous author, is the browser's `commenter_id` and the post's `target_id` compressed into a 31-bit hash. This single value serves **two roles**.\n1. A modulo selects the avatar emoji and nickname.\n2. When an edit or delete request arrives, it decides whether the caller is the author (the browser) that wrote the comment.\n\nThe user is identified by recomputing the hash from the `commenter_id` and `target_id` carried in the request and comparing it against the stored value, and this **operates independently of the password**. Requiring the password every time a comment written moments ago in the same browser is edited or deleted would be tedious, so the value stored in the browser is used to recognize the author.\n\nAnd since the client has to know this value in order to display the avatar, it is also included in public GET responses.\n\n```ts\nif (password && comment.password_hash) {\n  authorized = await bcrypt.compare(password, comment.password_hash);\n} else if (commenter_id && target_id && comment.commenter_hash) {\n  authorized = comment.commenter_hash === identity.hash;  // passes without a password\n}\n```\n\nThe form always collects a password, so every request leaving the screen carries one. Those finish at the first condition and never reach the hash branch. A malicious actor, however, can bypass the form and build a request with no password directly using `curl`, which drops it into the hash branch.\n\nAll this branch does is recompute the hash from values carried in the request and check it against the stored one. The attacker therefore **never has to recover** the victim's actual `commenter_id`. Only the result has to match, so any other value that produces the same result gets through.\n\nThe target to match is public as well, since the stored hash ships as-is in public GET responses. All that remains is finding a value that yields it, and at 31 bits there are only **about 2 billion** possibilities. Trying them at random turns one up in roughly 30 minutes on a single core.\n\nThe attack takes three steps.\n1. Read the victim comment's `commenter_hash` from a public GET.\n2. Brute-force a `commenter_id` that produces the same hash.\n3. Send `PATCH`·`DELETE` with that value and no password.\n\nA deleted comment with no replies loses its row entirely and cannot be restored, and an edited one keeps the author's name and avatar, so a reader sees it as the author's own revision.",
    },
    solution: {
      ko: "`else if` 를 제거하고 인증 경로를 **비밀번호 하나로** 줄였다. `commenter_id` 와 `target_id` 는 더 이상 읽지 않으므로 위조할 대상이 없다. 해시를 HMAC-SHA256 으로 바꾸는 방안도 검토했지만, 알고리즘을 바꿔도 **인증 경로가 둘로 남는다**. 그래서 **강화가 아니라 제거**를 골랐다.",
      en: "The `else if` was removed and authentication reduced to the password alone. `commenter_id` and `target_id` are no longer read, so there is nothing left to forge. Replacing the hash with HMAC-SHA256 was considered, but changing the algorithm still **leaves two auth paths**, so the path was **removed rather than hardened**.",
    },
    keyInsight: {
      ko: "클라이언트가 강제한다고 해서 **서버가 강제하는 것은 아니다**. 인증 경로를 OR 로 늘리면 시스템의 강도는 언제나 **약한 쪽으로 내려간다**. 그리고 한 값에 공개돼야 하는 역할과 비밀이어야 하는 역할을 같이 맡기면 **둘 중 하나는 반드시 깨진다**.",
      en: "**Enforcement by the client is not enforcement by the server.** Widening authentication with an OR pulls the system's floor down to **the weaker path**. And giving one value both a role that must be public and a role that must stay secret **breaks one of the two.**",
    },
  },
  {
    id: "public-api-all-true-leaked-all",
    section: { ko: "Backend / Security", en: "Backend / Security" },
    problem: {
      ko: "공개 API 의 `?all=true` 쿼리로 비공개 글 / 휴지통이 인증 없이 전부 노출",
      en: "Public API `?all=true` Leaked All Drafts and Trash Without Auth",
    },
    title: { ko: "공개 API 의 권한 경계", en: "Authorization boundaries on a public API" },
    vizKey: "all-param-leak",
    definition: {
      ko: "글 목록 API 는 발행된 글만 돌려주는 공개 창구다. 관리자 화면은 초안과 휴지통까지 봐야 해서 같은 API 에 `?all=true`·`?trash=true` 를 붙여 썼다. 그런데 이 파라미터가 붙은 요청에도 **서버가 로그인 여부를 확인하지 않았다**.",
      en: "The posts API is a public endpoint that returns published posts only. The admin screen also needs drafts and trash, so it reused the same API with `?all=true` and `?trash=true`. **The server never checked whether the caller was logged in** when those parameters were present.",
    },
    cause: {
      ko: "데이터베이스에 닿는 경로가 둘이다. 하나는 요청자의 세션을 그대로 넘겨 RLS 의 통제를 받는 클라이언트, 다른 하나는 RLS 를 우회해 모든 행에 접근하는 service-role 클라이언트다. 초안까지 다루려면 후자를 쓸 수밖에 없다.\n\nRLS 를 우회하는 순간, 요청자가 관리자인지 확인할 책임이 **데이터베이스에서 API 코드로 넘어온다**. 그 확인이 빠져 있었다. 작품 목록 API 는 파라미터가 없어도 항상 service-role 로 접근하고 공개 조건을 코드가 매번 직접 붙였다. **조건 한 줄이 빠지면** 초안이 그대로 나가는 구조였다.",
      en: "There are two ways to reach the database. One forwards the caller's session and stays under RLS; the other is the service-role client, which bypasses RLS and can read every row. Handling drafts leaves no option but the second.\n\nThe moment RLS is bypassed, the job of confirming that the caller is an administrator **moves from the database to the API code**, and that check was missing. The works API went further: it always used service-role, even with no parameters, and appended the public-only condition by hand each time. **One missing line would have exposed drafts.**",
    },
    solution: {
      ko: "`?all` 이나 `?trash` 가 붙은 요청은 service-role 경로에 **들어가기 전에 로그인을 확인한다**.\n\n```ts\nif (showAll || showTrash) {\n  const { error } = await requireAuth();\n  if (error) return error;              // 401\n}\nconst supabase = showAll || showTrash ? createAdminClient() : await createClient();\n```\n\nid 로 하나씩 읽는 단일 조회 API 도 호출처를 따라가 보니 전부 관리자 화면이었다. 방문자 상세 페이지는 id 가 아니라 slug 로 직접 읽기 때문이다. 여기에도 같은 확인을 붙이고, 모든 요청이 먼저 지나가는 middleware 에 관리자 검문을 한 겹 더 뒀다.",
      en: "A request carrying `?all` or `?trash` now has its **login checked before it enters** the service-role path.\n\n```ts\nif (showAll || showTrash) {\n  const { error } = await requireAuth();\n  if (error) return error;              // 401\n}\nconst supabase = showAll || showTrash ? createAdminClient() : await createClient();\n```\n\nThe single-resource APIs that fetch one row by id turned out to be called only from admin screens, since a visitor's detail page reads by slug instead. They got the same check, and an admin gate was added to the middleware every request passes through first.",
    },
    keyInsight: {
      ko: "RLS 를 우회하는 순간 신분 확인 책임은 API 코드로 넘어온다. 데이터베이스가 대신 막아 주던 보호가 사라지기 때문이다.\n\n그리고 **기본값은 차단이어야 한다**. service-role 로 전부 열어 두고 코드가 공개 조건을 빠뜨리지 않기를 기대하는 방식은 **한 번의 실수로 무너진다**.",
      en: "The moment you bypass RLS, verifying identity becomes the API code's job, because the protection the database was providing is gone.\n\n**And the default should be blocked.** Leaving everything open through service-role and trusting the code never to drop the public-only condition **collapses on a single mistake**.",
    },
  },

  /* ── Frontend / Performance — Font display ── */
  {
    id: "menu-drawer-font-stuck-on-fallback",
    section: { ko: "성능 / 폰트", en: "Performance / Fonts" },
    problem: {
      ko: "Menu drawer 폰트가 fallback 으로 굳음 — `display: optional` + `preload: false` 부작용",
      en: "Menu Drawer Font Stuck on Fallback — `display: optional` + `preload: false` Side Effect",
    },
    title: { ko: "font-display 전략은 폰트마다 다르다", en: "Font-display is a per-font decision" },
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

  /* ── Architecture — 인기글 single source of truth ── */
  {
    id: "popular-post-defined-in-three-places",
    section: { ko: "Architecture / Domain", en: "Architecture / Domain" },
    problem: {
      ko: "인기글 정의가 3 곳에 분산 — UI 의 HOT 배지와 admin 삭제 보호가 서로 다른 \"인기\"",
      en: "\"Popular post\" defined in three places — the UI HOT badge and the admin delete guard disagreed on what \"popular\" meant",
    },
    title: { ko: "'인기'의 단일 정의 소스", en: "A single source of truth for \"popular\"" },
    vizKey: "popular-single-source",
    definition: {
      ko: "\"인기\" 라는 개념이 세 곳에서 각자 정의돼 있었다.\n1. 카드의 HOT 배지 — `view_count` 상위 5개\n2. 정렬 옵션 — `view + like × 3 + comment × 5` 가중 합\n3. admin 삭제 보호 — `view ≥ 100 OR like ≥ 10` 절대 임계값\n\n사용자에게는 하나의 개념인데 코드에는 세 정의가 살아 있었다. **HOT 배지가 붙은 글을 admin 에서 지워도 인기 글이라는 경고가 뜨지 않는** 모순이 가능했다.",
      en: "The idea of a \"popular\" post was defined in three separate places.\n1. The HOT badge on cards — top 5 by `view_count`\n2. The sort option — a weighted score of `view + like × 3 + comment × 5`\n3. The admin delete guard — an absolute threshold of `view ≥ 100 OR like ≥ 10`\n\nTo a user it is one idea; in code three definitions coexisted. **A post wearing the HOT badge could be deleted from admin without ever triggering the \"this is popular\" warning.**",
    },
    cause: {
      ko: "세 정의는 각각 다른 시점에 추가됐고, 그때마다 그 자리에서 가장 합리적인 기준이 즉석에서 정해졌다. HOT 배지는 가장 단순한 신호인 조회수를, 정렬은 댓글이 활발한 글도 잡으려고 가중 합을, 삭제 보호는 신생 글까지 보호하지 않으려고 절대 임계값을 골랐다.\n\n**각 결정은 그 시점에서 옳았다. 셋이 같은 단어를 쓰고 있다는 사실만 아무도 의식하지 않았다.** 도메인 개념이 조용히 갈라지는 전형적인 형태다. 기능마다 그 안에서 가장 합리적인 기준이 자라고, 정합성은 누군가 두 코드를 한 화면에 띄워 볼 때까지 드러나지 않는다.",
      en: "The three definitions were added at different times, and each time whichever criterion was easiest to commit to on the spot became the rule. The badge took the simplest signal, views. The sort broadened it to catch posts with active discussion. The delete guard preferred absolute thresholds so tiny posts would not be protected.\n\n**Each decision was reasonable in its own moment. That all three were claiming the same word went unnoticed.** This is the ordinary shape of silent domain fragmentation: every feature grows its own locally sensible criterion, and the inconsistency surfaces only when two of them land on one screen.",
    },
    solution: {
      ko: "`src/lib/popularity.ts` 하나를 만들고 `scoreOf` 와 `getPopularPostIds` 만 export 했다. 세 호출처를 전부 그 위로 옮겼다.\n\n이제 HOT 배지가 붙은 글, admin 삭제 시 보호되는 글, 정렬 상단에 오는 글이 **자동으로 같아진다.** 가중치를 바꾸고 싶으면 한 줄만 고치면 세 기능이 동시에 따라온다. 정렬과 삭제 보호가 따로 노는 일이 다시 생길 수 없다.",
      en: "A single module, `src/lib/popularity.ts`, exports just `scoreOf` and `getPopularPostIds`, and all three call sites were routed through it.\n\nThe post wearing the HOT badge, the post guarded against admin deletion, and the post at the top of the popular sort are now **the same post by construction.** Tuning the weights is a one-line change all three pick up at once. Sort and delete guard can never drift apart again.",
    },
    keyInsight: {
      ko: "**같은 도메인 개념의 정의는 단일 함수나 모듈로 강제한다.** 분산은 조용한 모순의 시작이다.\n\n인기, 인증된 사용자, 만료된 세션 같은 개념은 코드 곳곳에서 불린다. 그때마다 그 자리에서 가장 합리적인 정의가 자라기 쉬운데, **그렇게 자란 정의들은 각자의 자리에서는 옳고 합쳐서 보면 틀리다.**\n\n특히 단순한 정의와 복합 정의가 같은 단어 아래 공존할 때 위험하다. 단순한 쪽은 이건 모듈로 뽑을 것도 없다는 인상을 주는데, 그 인상이 분산의 입구다.",
      en: "**Force the definition of a domain concept into a single function or module.** Fragmentation is where silent contradiction begins.\n\nConcepts like \"popular\", \"authenticated user\", or \"expired session\" get called from many places, and each call site easily grows its own locally reasonable definition. **Those definitions are individually correct and collectively wrong.**\n\nThe risk is highest when a simple definition and a compound one share the same word. The simple one feels too small to extract, and that feeling is the entrance to fragmentation.",
    },
    tags: ["single source of truth", "domain modeling", "popularity", "refactoring"],
  },

  /* ── Architecture — Lenis cleanup convention ── */
  {
    id: "lenis-infinite-scroll-silently-sticks-across",
    section: { ko: "Architecture / Convention", en: "Architecture / Convention" },
    problem: {
      ko: "Lenis 무한 스크롤이 페이지 전환 시 의도치 않게 켜지는 문제 — opt-out 가정 cleanup 의 함정",
      en: "Lenis Infinite Scroll Silently Sticks Across Page Transitions — the Opt-Out Cleanup Trap",
    },
    title: { ko: "공유 상태의 기본값은 한 곳에만", en: "A default belongs in exactly one place" },
    definition: {
      ko: "`/posts` 에서 `/posts/tags` 로 이동하면 그 페이지가 갑자기 무한 스크롤로 동작했다. 끝에 닿으면 처음으로 점프해 사용자가 위치를 잃는다. 새로고침하면 정상으로 돌아왔다가, 다른 경로로 다시 들어오면 또 켜졌다. **진입 경로에 따라 동작이 달라지는** 형태였다.",
      en: "Navigating from `/posts` to `/posts/tags` left the tags page in infinite-scroll mode. Reaching the bottom jumped back to the top and the reader lost their place. A refresh restored normal behavior; entering again from another route turned it back on. **The behavior depended on how you arrived.**",
    },
    cause: {
      ko: "거의 모든 페이지가 같은 패턴을 따르고 있었다. mount 에서 `setInfinite(false)`, unmount cleanup 에서 `setInfinite(true)` 로 원복. 한 파일만 보면 자연스럽다. 내가 끄고 들어왔으니 나갈 때 되돌려 놓는 것이다.\n\n문제는 이 convention 이 **기본값은 켜짐이고 페이지가 끈다** 는 가정 위에 서 있었다는 점이다. 실제 provider 의 기본값은 꺼짐이었다. **convention 의 가정과 provider 의 실제 default 가 어긋나 있었다.**\n\n그래서 A 페이지가 unmount 하며 켜 놓으면, B 페이지가 스스로 끄지 않는 한 그대로 남는다. 이 패턴이 **15개 파일에 동일하게 박혀 있었고**, 어느 하나를 따로 보면 이상한 점이 없다.",
      en: "Nearly every page followed the same pattern: `setInfinite(false)` on mount, `setInfinite(true)` in the unmount cleanup to put it back. Read one file and it looks natural. I turned it off coming in, so I restore it on the way out.\n\nThe trap is that the convention rested on the assumption that **the default is on and pages opt out.** The provider's actual default was off. **The convention's assumption and the provider's real default disagreed.**\n\nSo when page A turned it on while unmounting, it stayed on unless page B turned it off itself. The pattern sat **identically in 15 files**, and read one at a time nothing looks wrong.",
    },
    solution: {
      ko: "패턴을 뒤집었다. 15개 파일에서 cleanup 의 `setInfinite(true)` 를 지우고, 무한 스크롤이 실제로 필요한 곳 하나만 명시적으로 켜게 했다. 그 한 곳의 cleanup 은 진짜 default 인 꺼짐으로 되돌린다.\n\n가장 큰 이득은 **새 페이지를 만들 때 이 설정을 의식할 필요가 없어졌다**는 점이다. 필요하면 켜고, 아니면 아무것도 쓰지 않는다. 다음 사람이 이 코드를 읽을 때 왜 여기서 스크롤 설정을 만지는지 의아해할 일도 없다.",
      en: "The pattern was inverted. The `setInfinite(true)` cleanup line was removed from 15 files, and only the one page that genuinely wants infinite scroll turns it on explicitly. That page's cleanup restores the real default, off.\n\nThe bigger win is that **a new page no longer has to think about this setting at all.** Turn it on if you need it; otherwise write nothing. Nobody reading the code later has to wonder why a page is touching scroll configuration.",
    },
    keyInsight: {
      ko: "**cleanup 은 원복이 아니라 진짜 default 로 복원이어야 한다.** 내가 바꿨으니 되돌려 놓자는 직관은 한 페이지 단위에서는 옳지만, 그 원래를 페이지마다 다르게 가정하기 시작하면 시스템 차원의 조용한 상태 누수가 된다.\n\n공유 상태를 다룰 때는 둘 중 하나만 쓴다. 진짜 default 로 복원하거나, 명시적으로 켤 때만 손대고 나머지는 건드리지 않는 opt-in 이다. **기본값의 정의는 한 곳에만 살아야 한다.**\n\n그리고 같은 패턴이 15개 파일에 있는 것은 문제가 없다는 증거가 아니라, **한 사람의 잘못된 직관이 그대로 복제된 결과**일 수 있다. 페이지 단위로 자연스러워 보이는 코드일수록 시스템 차원의 어긋남이 늦게 발견된다.",
      en: "**Cleanup should restore the real default, not whatever it was when you arrived.** The instinct to put back what you changed is right at one page's scope, but once each page assumes a different \"original\", the system gets a silent state leak.\n\nFor shared state, do one of two things: restore the genuine default, or adopt an opt-in model where only pages that explicitly want the feature touch it. **The definition of a default must live in exactly one place.**\n\nAnd a pattern repeated across 15 files is not evidence that it is fine. It can be **one person's wrong intuition replicated verbatim.** The more natural code looks page by page, the later a system-level mismatch is found.",
    },
    tags: ["lenis", "convention", "cleanup pattern", "provider default", "silent state leak"],
  },

  /* ── Layout & CSS — PostCard meta separator on wrap ── */
  {
    id: "postcard-meta-separator-leaks-to-the",
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
    id: "admin-works-sort-order-partial-shift",
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
    id: "touch-devices-have-no-hover-desktop",
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
    id: "hovering-a-button-inside-a-draggable",
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
    id: "after-the-transition-morph-clears-the",
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
    id: "hsl-color-tokens-look-uneven-across",
    section: { ko: "Layout & CSS", en: "Layout & CSS" },
    problem: { ko: "HSL 기반 색 토큰이 hue 별로 지각 밝기가 달라 같은 lightness 끼리도 톤이 들쭉날쭉", en: "HSL color tokens look uneven across hues — same lightness reads as different brightness" },
    title: { ko: "지각 밝기와 색 공간 — HSL vs OKLCH", en: "Perceptual lightness and color space" },
    vizKey: "perceptual-color",
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
    id: "scheduled-publish-trash-purge-bound-to",
    section: { ko: "Architecture & Backend", en: "Architecture & Backend" },
    problem: { ko: "예약 발행 / 휴지통 정리가 Vercel cron 에 묶여 호스팅 의존 + 알림 누락", en: "Scheduled publish + trash purge bound to Vercel cron — host lock-in and silent failures" },
    title: { ko: "정기 작업을 데이터가 있는 곳으로", en: "Moving periodic work to where the data lives" },
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
    id: "after-absorbing-page-boilerplate-into-the",
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

  /* ── textarea 글자별 inline highlight — mirror sync 한계 + contenteditable 전환 ── */
  {
    id: "wanted-per-character-background-highlight-inside",
    section: { ko: "Component System", en: "Component System" },
    problem: {
      ko: "textarea 의 초과 글자만 background highlight 주려는데 어떤 방법으로도 정확히 안 맞음 — 결국 native textarea 포기하고 contenteditable 로 전환",
      en: "Wanted per-character background highlight inside a textarea — no overlay technique aligned perfectly, ended up replacing the native textarea with contenteditable",
    },
    title: { ko: "동기화가 아니라 요소 교체", en: "Replacing the element instead of syncing it" },
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
    id: "on-a-textarea-s-resize-handle",
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
    id: "css-var-chains-don-t-resolve",
    section: { ko: "Layout & CSS", en: "Layout & CSS" },
    problem: {
      ko: "CSS `var()` 체인이 JS `getPropertyValue` 로 resolve 안 됨 — Canvas / Three.js 텍스처 배경색이 토큰과 어긋남",
      en: "CSS `var()` chains don't resolve through JS `getPropertyValue` — Canvas / Three.js texture backgrounds drift from the design token",
    },
    title: { ko: "getPropertyValue 와 CSS 변수 체인의 경계", en: "getPropertyValue and CSS variable chains" },
    definition: {
      ko: "이 사이트의 Works 페이지는 완성한 프로젝트를 보여 주며, 이 페이지의 배경은 CSS로 칠한 단색 면이 아니라 JavaScript가 Canvas 위에 색을 직접 그려 넣는 영역이다. 배경을 그리는 코드는 페이지의 배경색을 읽어 와 그대로 칠하도록 작성했고, 목표는 이 Canvas 영역의 색을 페이지 나머지 배경과 정확히 일치시키는 것이었다.\n\n페이지 배경색은 여러 화면이 같은 값을 공유하도록 디자인 토큰으로 한곳에 정의돼 있다. 코드에서는 `getComputedStyle(...).getPropertyValue(...)` 로 이 토큰 값을 읽어 Canvas 에 전달했다.\n\n기대한 결과는 페이지와 동일한 배경색이었으나, 실제 화면에서는 Canvas 영역이 검은색으로 칠해졌다. 개발자 도구로 해당 토큰을 확인하면 밝은 모드용 색과 어두운 모드용 색이 모두 지정돼 있었는데도 결과는 검은색이었다.",
      en: "This site's Works page shows finished projects, and its background is not a solid surface filled by CSS but an area where JavaScript draws color directly onto a Canvas. The drawing code was written to read the page's background color and paint it as-is, and the goal was to match this Canvas area's color exactly to the rest of the page background.\n\nThe page background color is defined in one place as a design token so that many screens share the same value. The code read this token with `getComputedStyle(...).getPropertyValue(...)` and passed it to the Canvas.\n\nThe expected result was a background identical to the page, but in practice the Canvas area was painted black. Even though the developer tools showed the token holding both a light-mode and a dark-mode color, the result was black.",
    },
    cause: {
      ko: "원인은 토큰 값을 읽는 방식에 있었다. `getPropertyValue` 는 해당 property 에 적힌 문자열을 그대로 돌려줄 뿐, 그 문자열이 최종적으로 가리키는 색까지 따라가지 않는다.\n\n이 프로젝트의 색 변수는 한 단계로 끝나지 않고 여러 단계로 연결돼 있다. 배경색 토큰은 색 값을 직접 가지지 않고 `var()` 로 다른 토큰을 참조하며, 그 참조를 끝까지 따라가야 실제 색이 나온다. custom property 의 값은 명세상 참조가 풀린 최종 색이 아니라 적힌 토큰 문자열 그대로로 정의돼 있어서, 코드로 배경색 토큰을 조회하면 색이 아니라 다른 토큰을 가리키는 `var(...)` 문자열이 반환된다. Canvas 는 이 문자열을 색으로 해석하지 못하고, 해석할 수 없는 값이 들어오면 기본값인 검은색으로 칠한다.\n\n혼동을 일으키는 지점은 개발자 도구다. 개발자 도구의 computed style 표시는 참조를 끝까지 추적한 최종 색을 보여 주므로, 코드로 읽어도 같은 색이 나올 것이라고 판단하기 쉽다. 그러나 그것은 개발자 도구가 대신 추적해 표시한 결과이고, `getPropertyValue` 로 custom property 를 조회하면 반환되는 것은 `var(...)` 참조 문자열 하나뿐이다.",
      en: "The cause was in how the token value was read. `getPropertyValue` returns the string written on that property as-is; it does not follow that string through to the color it ultimately points to.\n\nIn this project the color variables are not resolved in a single step but connected across several stages. The background-color token holds no color value directly; it references another token through `var()`, and only by following that reference to the end does the real color appear. By the specification a custom property's value is defined as the written token string itself, not the resolved final color, so querying the background-color token in code returns not a color but a `var(...)` string pointing to another token. The Canvas cannot interpret this string as a color, and when an uninterpretable value arrives it paints its default, black.\n\nThe point that causes confusion is the developer tools. Their computed style display shows the final color traced all the way through the references, so it is easy to assume that reading it in code would yield the same color. But that is only what the developer tools traced and displayed on your behalf; querying a custom property with `getPropertyValue` returns a single `var(...)` reference string.",
    },
    solution: {
      ko: "토큰을 직접 읽는 대신 표준 property 를 한 단계 거치도록 했다. 화면에 보이지 않는 임시 요소를 만들고 그 요소의 `color` 를 이 토큰으로 지정한 다음, `getComputedStyle` 로 그 요소의 `color` 가 최종적으로 무엇으로 계산됐는지 다시 읽었다. 이렇게 하면 브라우저가 연결된 `var()` 참조를 끝까지 풀어 실제 색 값을 반환한다.\n\n이 방법이 동작하는 이유는 `color` 같은 표준 property 가 used value 를 계산하는 단계에서 `var()` 참조를 모두 치환해 최종 색을 실제로 산출하기 때문이다. 따라서 그 property 값을 다시 읽으면 `var(...)` 문자열이 아니라 완전히 해석된 색이 반환된다. custom property 를 직접 조회하면 적힌 문자열만 얻지만, `color` 같은 표준 property 를 한 번 거치면 브라우저가 이미 계산해 둔 색을 받아 올 수 있다.\n\nWorks 페이지의 Canvas 배경도 이 방식으로 페이지 배경색과 맞췄다. 밝은 모드와 어두운 모드를 전환할 때도 같은 방식으로 색을 다시 읽어 다시 칠하므로, 페이지와 Canvas 가 만나는 지점에 색이 어긋나는 경계가 생기지 않는다.",
      en: "Instead of reading the token directly, the fix routes it through a standard property. It creates an element that is not visible on screen, sets that element's `color` to this token, and then reads back with `getComputedStyle` what that element's `color` was finally computed to be. This makes the browser resolve the connected `var()` references to the end and return a real color value.\n\nThis works because a standard property such as `color` substitutes all `var()` references and actually produces the final color while computing its used value. Reading that property back therefore returns a fully resolved color rather than a `var(...)` string. Querying a custom property directly yields only the written string, but routing it once through a standard property such as `color` returns the color the browser has already computed.\n\nThe Works page's Canvas background was matched to the page background color this same way. When switching between light and dark mode, the color is read again and repainted the same way, so no seam of mismatched color appears where the page and the Canvas meet.",
    },
    keyInsight: {
      ko: "custom property 를 `getPropertyValue` 로 읽으면 적힌 문자열만 반환된다. 여러 단계로 연결된 `var()` 참조의 최종 색이 필요하면, `color` 같은 표준 property 를 한 번 거쳐 브라우저가 이미 계산해 둔 computed style 을 읽어야 한다.\n\n개발자 도구는 최종 색까지 풀어서 표시하지만 코드 조회는 그렇게 하지 않는다. 명세상 custom property 의 값은 계산된 색이 아니라 적힌 토큰 문자열 그대로이기 때문이다.\n\n이 문제는 색을 여러 단계로 참조할수록 더 자주 나타난다. 색을 한곳에 직접 적어 두면 드러나지 않고, 한 토큰이 다른 토큰을 `var()` 로 참조하는 구조가 되면 나타난다.\n\n발생 조건도 정해져 있다. 코드가 색을 읽어 순수한 CSS 바깥으로, 예를 들어 Canvas 그래픽, Three.js 로 그린 3차원 장면, 애니메이션 도구로 전달할 때다. 반대로 색을 CSS 안에서만 사용하면 브라우저가 `var()` 참조를 끝까지 풀어 주므로 이 문제는 발생하지 않는다.",
      en: "Read a custom property with `getPropertyValue` and only the written string is returned. When you need the final color at the end of several connected `var()` references, you have to route it through a standard property such as `color` and read the computed style the browser has already produced.\n\nThe developer tools resolve and display the final color, but a lookup in code does not, because by the specification a custom property's value is the written token string rather than the computed color.\n\nThis problem appears more often the more stages colors are referenced through. It stays hidden when a color is written directly in one place, and it surfaces once one token references another token through `var()`.\n\nThe condition under which it occurs is fixed: when code reads a color and passes it outside pure CSS, for example to a Canvas graphic, a three-dimensional scene drawn with Three.js, or an animation tool. Conversely, when the color is used only within CSS, the browser resolves the `var()` references to the end, so the problem does not occur.",
    },
    tags: ["css", "custom-properties", "var", "getComputedStyle", "canvas", "three.js", "design-tokens"],
  },
  {
    id: "dragging-selecting-the-text-next-to",
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
    id: "editor-top-bar-won-t-pin",
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

  /* ── Architecture / Component ── */
  {
    id: "editor-preview-drifts-from-the-published",
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
  {
    id: "comment-markdown-checkboxes-never-rendered-dompurify",
    section: { ko: "Architecture & Backend", en: "Architecture & Backend" },
    problem: {
      ko: "댓글 마크다운 체크박스가 렌더 안 됨 — DOMPurify 가 허용 목록에 넣은 속성을 조용히 지움",
      en: "Comment markdown checkboxes never rendered — DOMPurify silently stripped an explicitly allowlisted attribute",
    },
    title: { ko: "HTML sanitizer의 URI 속성 정책", en: "An HTML sanitizer's URI-attribute policy" },
    vizKey: "dompurify-uri",
    definition: {
      ko: "이 블로그의 댓글은 마크다운을 지원한다. 마크다운은 `**굵게**`, `- 목록`, `[링크](url)` 처럼 간단한 기호로 서식을 적는 문법이다. 그중 `- [ ] 할 일` 은 \"할 일 목록(task list)\" 문법으로, 앞의 `[ ]` 는 빈 **체크박스**로, `[x]` 는 체크된 체크박스로 렌더돼야 한다.\n\n그런데 댓글에 `- [ ] 할 일` 을 쓰면 체크박스가 안 뜨고 **그냥 불릿(•)** 으로만 나왔다.\n\n댓글은 사용자가 직접 쓰는 글이라, 화면에 그리기 전에 **보안 검사(sanitize)** 를 한 번 거친다. 누가 `<script>` 같은 악성 코드를 댓글에 심어도 실행되지 않게, 위험한 HTML 을 걸러 내는 것이다. 이 검사는 `DOMPurify` 라는 라이브러리가 맡고, 방식은 **허용 목록(allowlist)** 이다. \"남겨도 되는 것\" 만 목록에 적어 두고 나머지는 전부 지운다. 남길 HTML **태그**는 `ALLOWED_TAGS` 에, 남길 **속성**은 `ALLOWED_ATTR` 에 적는다.\n\n체크박스는 HTML 로 `<input type=\"checkbox\">` 다. 그래서 이게 안 지워지도록 `ALLOWED_TAGS` 에 `input` 태그를, `ALLOWED_ATTR` 에 `type` 속성을 **분명히 넣어 뒀다.** 그런데도 체크박스가 사라졌고, 콘솔에도 빌드에도 **에러는 발생하지 않았다.** 남기라고 목록에 넣어 둔 `input`·`type` 가 아무런 경고 없이 제거된 것이다.",
      en: "Writing `- [ ] todo` in a comment rendered a **plain bullet** instead of a checkbox. `input` was in `ALLOWED_TAGS` and `type` was in `ALLOWED_ATTR` — and there wasn't a single error anywhere.",
    },
    cause: {
      ko: "먼저 어디서 사라지는지부터 확인했다. 댓글이 화면에 그려지는 과정은 세 단계다.\n\n① 마크다운 텍스트를 `marked` 라는 변환기가 HTML 로 바꾼다.\n\n② 그 HTML 을 `DOMPurify` 가 검사(sanitize)해 안전한 것만 남긴다.\n\n③ 남은 HTML 을 화면에 그린다.\n\n`marked` 는 정상이었다. `- [ ] 할 일` 을 `<input type=\"checkbox\">` 로 제대로 바꿔 냈다. 체크박스가 사라지는 건 ② `DOMPurify` 를 통과한 뒤였다.\n\n원인은 `DOMPurify` 의 규칙 하나였다. `DOMPurify` 는 속성 \"값\" 까지 검사한다. `href`·`src` 같은 속성에는 URL 이 들어간다. 그런데 그 URL 자리에 `javascript:...` 같은 걸 넣으면 클릭하는 순간 코드가 실행되는 공격이 된다. 그래서 `DOMPurify` 는 속성 **값**이 안전한 URL 인지를 정규식(`ALLOWED_URI_REGEXP` — 예: `http:`·`https:`·`mailto:` 로 시작하는 것만 통과)으로 검사하고, 안 맞으면 그 속성을 지운다.\n\n문제는 이 검사의 **대상**이었다. `DOMPurify` 는 \"URL 을 담지 않는다고 스스로 아는 속성(URI-safe 목록: `alt`·`class`·`title` 등)\" 이 아니면, **그 속성 값도 혹시 URL 일까 봐** 위 정규식으로 검사한다. 그런데 기본 URI-safe 목록에는 `type` 이 없다. 그래서 `type=\"checkbox\"` 의 값 `\"checkbox\"` 를 \"URL 인가?\" 하고 검사하고, `http:`·`mailto:` 로 시작하지 않으니 불일치 → `type` 속성을 제거한다.\n\n```ts\nconst ALLOWED_URI_REGEXP = /^(?:https?:|mailto:)/i;\n// type=\"checkbox\" → 값 \"checkbox\" 를 위 정규식으로 검사 → 불일치 → 속성 제거\n```\n\n즉 `ALLOWED_ATTR` 에 `type` 을 넣은 건 **\"이 속성을 남겨라\"** 라는 뜻이지 **\"이 속성의 값을 URL 로 검사하지 말라\"** 는 뜻이 아니었다. 남길지 말지(`ALLOWED_ATTR`)와 값이 URL 로 안전한지(URI 검사)는 **서로 다른 두 축**인데, 이름이 둘 다 \"허용\" 처럼 읽혀 같은 축으로 착각하기 쉽다. 그리고 이 경우 **URI 검사가 조용히 이긴다.**\n\n`type` 이 지워진 뒤, 나머지는 내 코드가 마무리했다. 나는 보안을 위해 sanitize 맨 끝에 검사를 하나 더 붙여 뒀다. `DOMPurify` 가 검사를 끝낸 직후 자동으로 한 번 더 실행되는 `afterSanitizeAttributes` 훅(hook — 정해진 시점에 자동으로 끼어들어 도는 함수)이다. 이 훅에 \"진짜 task-list 체크박스인 `<input>` 만 남기고 나머지 `<input>` 은 전부 지운다\" 는 규칙을 뒀다. 댓글에 아무 입력 폼이나 심어 악용하는 걸 막기 위해서다.\n\n이 훅은 `<input>` 이 체크박스인지를 `type` 으로 판단한다. `type=\"checkbox\"` 면 남기고, 아니면 지운다. 그런데 이 훅이 도는 시점엔 앞 단계에서 `type` 이 이미 사라진 뒤였다. `type` 이 없는 `<input>` 을 본 훅은 \"체크박스가 아니다\" 라고 판단해 `<input>` 을 통째로 지웠다. 그래서 체크박스는 사라지고 불릿만 남았다.\n\n결국 체크박스는 **두 단계에 걸쳐** 죽었다. 먼저 `DOMPurify` 의 URL 검사가 `type` 을 지웠고, 이어서 그 `type` 을 근거로 삼던 내 훅이 `<input>` 자체를 지웠다.\n\n표의 `align` 도 같은 규칙에 조용히 지워지고 있었다. 마크다운으로 표의 열 정렬을 `|:---|---:|` 처럼 적으면 `<td align=\"right\">` 같은 HTML 이 된다. `align` 역시 URI-safe 목록에 없어서, 값 \"right\" 가 URL 인지 검사받다 걸려 제거됐다. 이것도 에러 없이 사라지던 터라, 체크박스를 파고들기 전까지 표 정렬이 안 되는 걸 아무도 몰랐다.",
      en: "marked was fine. It produced `<input type=\"checkbox\">` correctly — the attribute disappeared **after DOMPurify**.\n\nThe cause was one DOMPurify rule: unless an attribute is **known to be URI-safe, DOMPurify tests its *value* against `ALLOWED_URI_REGEXP`**, on the assumption the value might be a URL whose protocol needs checking. And `type` is not in the default URI-safe list (`alt`, `class`, `title`, `value`, …).\n\nSo:\n\n```ts\nconst ALLOWED_URI_REGEXP = /^(?:https?:|mailto:)/i;\n// type=\"checkbox\" → value \"checkbox\" tested against the regex → no match → attribute dropped\n```\n\nPutting `type` in `ALLOWED_ATTR` means **\"keep this attribute\"** — not **\"don't URL-check its value\"**. They're different axes, and **the URI check wins, silently**.\n\nOnce the attribute was gone, my own code finished the job. The `afterSanitizeAttributes` hook checks `type` to keep only task-list checkboxes and remove any other input — but `type` was already stripped, so **the hook judged the checkbox to be \"not a checkbox\" and removed the `<input>`** → bullet only.\n\nThe same rule had quietly killed **table `align`** too. Markdown table alignment (`|:---|---:|`) had been ignored the whole time — also with no error, so nobody noticed until I dug into the checkbox.",
    },
    solution: {
      ko: "URL 이 아닌(그래서 URL 검사가 애초에 필요 없는) 속성들을 검사 대상에서 빼 주면 끝이었다. `DOMPurify` 에는 `ADD_URI_SAFE_ATTR` 이라는 옵션이 있어서, \"이 속성들의 값은 URL 이 아니니 프로토콜 검사를 건너뛰라\" 고 지정할 수 있다.\n\n```ts\n// type/checked/disabled/align — 전부 URL 이 아닌 inert 속성\nconst URI_SAFE_ATTR = [\"type\", \"checked\", \"disabled\", \"align\"];\n\nDOMPurify.sanitize(raw, {\n  ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP,\n  ADD_URI_SAFE_ATTR: URI_SAFE_ATTR,\n});\n```\n\n중요한 건 **이게 보안을 낮추지 않는다는 점**이다. `ADD_URI_SAFE_ATTR` 는 \"이 속성 값의 URL 검사만 건너뛰라\" 는 선언일 뿐, 그 속성을 남길지 말지는 여전히 `ALLOWED_ATTR` 이 결정한다. 정말 URL 을 담는 `href`·`src` 는 이 목록에 넣지 않았으므로, **공격에 쓰일 수 있는 속성의 프로토콜 검사는 그대로 유지**된다. 위험한 축은 안 건드리고, URL 과 무관한 축만 정확히 열어 준 것이다.",
      en: "The fix was to exempt the non-URL, inert attributes from the URI check:\n\n```ts\n// type/checked/disabled/align — all inert, none are URLs\nconst URI_SAFE_ATTR = [\"type\", \"checked\", \"disabled\", \"align\"];\n\nDOMPurify.sanitize(raw, {\n  ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP,\n  ADD_URI_SAFE_ATTR: URI_SAFE_ATTR,\n});\n```\n\nWhat matters is that **this doesn't weaken sanitization**. `ADD_URI_SAFE_ATTR` only declares \"this attribute's value isn't a URL, skip the protocol check\" — whether the attribute is allowed at all is still `ALLOWED_ATTR`'s call. `href` and `src` aren't on the list, so **protocol checking stays fully intact for the attributes that can actually carry a URL**.",
    },
    keyInsight: {
      ko: "**허용 목록에 넣었는데도 사라진다면, 다른 설정 키가 그 허용을 덮고 있는지 봐야 한다.** `ALLOWED_ATTR`(무엇을 남길지)와 `ALLOWED_URI_REGEXP`(값이 URL 로 안전한지)는 별개의 축인데, 이름만 보면 둘 다 \"허용\" 이라 같은 축처럼 읽힌다. 라이브러리 설정은 키 하나만 보고 판단하면 안 되고, **키들 사이의 상호작용까지** 읽어야 한다.\n\n그리고 이 버그가 오래 산 진짜 이유는 **조용해서**다. sanitizer 는 위험한 걸 지우는 게 일이라 \"지웠다\" 고 알리지 않고, 그래서 정상 동작과 조용한 제거가 겉보기엔 똑같다. 표의 `align` 은 아무도 신고하지 않은 채 계속 죽어 있었다. **로그를 남기지 않는 계층에서는 \"에러가 없다\" 가 \"동작한다\" 의 근거가 되지 못한다.**",
      en: "**When something is allowlisted but still disappears, look for a different config key overruling the allowance.** `ALLOWED_ATTR` and `ALLOWED_URI_REGEXP` are separate axes — \"what to keep\" versus \"is this value safe\" — but both read as \"allow\" by name, which makes them look like one axis. Library config can't be reasoned about one key at a time; **you have to read how the keys interact**.\n\nAnd the reason this bug lived so long is that it was **quiet**. A sanitizer's whole job is removing things, so it doesn't announce removals — which makes correct behavior and silent stripping look identical from the outside. Table `align` had been dead the entire time with nobody reporting it. **In a layer that doesn't log, \"no errors\" is not evidence of \"it works\".**",
    },
    tags: ["dompurify", "sanitize", "allowlist", "silent-failure", "markdown", "gfm"],
  },

  /* ── Plate 에디터 — normalizer / hook 순서 ── */
  {
    id: "switching-column-widths-to-froze-the",
    section: { ko: "Plate Editor", en: "Plate Editor" },
    problem: {
      ko: "열블록 너비를 %로 바꾸면 에디터가 멈춤 — normalize 무한루프",
      en: "Switching column widths to % froze the editor — an infinite normalize loop",
    },
    title: { ko: "부동소수점 합과 수렴 종료조건", en: "Floating-point sums and a convergence guard" },
    vizKey: "float-normalize",
    definition: {
      ko: "열블록을 3열로 만들거나 열 너비를 % 로 조정하면 에디터가 그대로 굳었다. 탭이 응답을 멈추고 결국 크래시했다.",
      en: "Making a column block three columns wide, or adjusting a column width by percentage, froze the editor outright. The tab stopped responding and eventually crashed.",
    },
    cause: {
      ko: "`@platejs/layout` 의 normalizer 는 열 너비의 합이 100 이 아니면 `(100 - 합) / 열수` 로 차이를 재분배한다. 열이 추가되거나 빈 열이 제거될 때마다 이 보정이 돈다.\n\n문제는 **100/3 처럼 딱 떨어지지 않는 값**이다. `33.333...` 을 세 번 더해도 부동소수점상 합이 정확히 100 이 되지 않는다. normalizer 는 합이 100 이 아니라고 판단해 다시 보정하고, 그 결과가 또 100 이 아니고, 다시 보정한다. **종료 조건에 영영 도달하지 못한다.**\n\nnormalize 는 동기 루프라 그 사이에 브라우저가 프레임을 그릴 틈이 없다. 그래서 느려짐이 아니라 완전한 정지로 나타났다.",
      en: "`@platejs/layout`'s normalizer redistributes the difference as `(100 - sum) / count` whenever column widths do not add up to 100. That correction runs every time a column is added or an empty one is removed.\n\nThe problem is **a value like 100/3 that does not divide evenly.** Adding `33.333...` three times does not land on exactly 100 in floating point. The normalizer sees a sum that is not 100, corrects again, lands off again, and corrects again. **The exit condition is never reached.**\n\nNormalization is a synchronous loop, so the browser never gets a frame in between. The result was not slowness but a complete stop.",
    },
    solution: {
      ko: "조건을 느슨하게 만드는 길이 있었다. `Math.abs(sum - 100) < 0.01` 로 오차를 허용하면 루프는 멈춘다. 그 대신 **애초에 오차가 생길 수 없는 값 공간으로 옮겼다.**\n\n`ColumnKit` 뒤에 등록한 `ColumnWidthFixKit` 이 원래 `normalizeNode` 를 감싼다. 너비가 정수이면서 합이 100 인 상태가 아니면 비율을 유지한 채 정수로 재분배하고 그 pass 를 즉시 종료한다. 반올림 오차는 가장 큰 열이 흡수해 합이 정확히 100 이 된다.",
      en: "One option was to loosen the condition. Allowing a tolerance with `Math.abs(sum - 100) < 0.01` stops the loop. **Instead the widths were moved into a value space where the error cannot arise at all.**\n\n`ColumnWidthFixKit`, registered after `ColumnKit`, wraps the original `normalizeNode`. Unless the widths are integers summing to 100, it redistributes them as integers while preserving their ratio and ends that pass immediately. The rounding remainder is absorbed by the widest column, so the sum is exactly 100.",
    },
    keyInsight: {
      ko: "**수렴하지 않는 종료 조건은 무한루프와 같은 말이다.** `합 === 100` 은 정수에서는 도달 가능하지만 부동소수점에서는 도달하지 못할 수 있고, 라이브러리는 그 차이를 검사해 주지 않는다.\n\n오차를 허용하는 쪽과 오차가 생길 수 없는 표현을 고르는 쪽 중에서는 후자가 단단하다. 정수로 좁히면 정확히 100 이 표현 가능한 값이 되고, 그때부터 종료 조건은 신뢰할 수 있는 명제가 된다.",
      en: "**An exit condition that cannot converge is just an infinite loop.** `sum === 100` is reachable in integers and may be unreachable in floating point, and the library does not check which one you are in.\n\nBetween tolerating the error and choosing a representation where the error cannot exist, the second is sturdier. Constrain to integers and \"exactly 100\" becomes a representable value, at which point the exit condition is a proposition you can trust.",
    },
    tags: ["plate", "normalizer", "infinite-loop", "floating-point", "column-group"],
  },
  {
    id: "formatting-text-inside-a-code-block",
    section: { ko: "Plate Editor", en: "Plate Editor" },
    problem: {
      ko: "코드블록 안 텍스트에 서식을 넣으면 에디터가 크래시 — \"change in the order of Hooks\"",
      en: "Formatting text inside a code block crashed the editor — \"change in the order of Hooks\"",
    },
    title: { ko: "hook 호출 순서 불변식", en: "The order-of-hooks invariant" },
    vizKey: "hook-order",
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
    id: "on-mobile-the-erd-diagram-collapses",
    problem: {
      ko: "모바일에서 ERD 다이어그램이 높이 0 으로 접혀 아무것도 안 보임",
      en: "On mobile the ERD diagram collapses to height 0 — nothing renders",
    },
    title: { ko: "percentage height와 definite height", en: "Percentage height needs a definite parent" },
    vizKey: "percentage-height",
    definition: {
      ko: "React Flow 캔버스가 담긴 컨테이너는 미디어쿼리에서 `min-height` 로만 높이를 받는데, 그 안의 캔버스는 `height: 100%` 라서 0 으로 계산돼 다이어그램(노드 23개는 DOM 에 다 있음)이 통째로 안 보였다. 데스크탑에선 멀쩡했다.",
      en: "The container holding the React Flow canvas only gets its height from a `min-height` in a media query, while the canvas inside uses `height: 100%` — which resolved to 0, so the whole diagram (all 23 nodes present in the DOM) was invisible. Desktop was fine.",
    },
    cause: {
      ko: "`height: 100%` 는 부모 높이의 100% 라는 뜻이다. 계산하려면 **부모 높이가 먼저 정해져 있어야 한다**. 그런데 `min-height` 만 준 부모는 높이가 정해진 상태가 아니다. 최소 이만큼이라는 하한만 있을 뿐, 실제 높이는 자식이 얼마나 차지하느냐에 따라 정해진다.\n\n여기서 순환이 생긴다. 자식은 부모 높이를 알아야 자기 높이를 정하고, 부모는 자식 높이를 알아야 자기 높이를 정한다. CSS 는 이 순환을 자식 쪽에서 끊는다. **부모 높이가 확정(definite height)되지 않았으면 자식의 percentage height 를 `auto` 로 처리한다.** 그 결과 캔버스 높이가 0 이 됐다. 데스크탑에서는 부모가 실제 높이를 갖고 있어 같은 코드가 정상 동작했다.",
      en: "`height: 100%` means 100% of the parent's height, so **the parent's height has to be settled before it can be computed**. A parent given only `min-height` is not settled. It has a floor and nothing more; its actual height depends on how much room its children take.\n\nThat creates a loop. The child needs the parent's height to decide its own, and the parent needs the child's height to decide its own. CSS breaks the loop on the child's side. **When the parent's height is not definite, the child's percentage height is treated as `auto`.** The canvas ended up at 0. On desktop the parent did carry a real height, so the same code worked there.",
    },
    solution: {
      ko: "컨테이너를 flex 컨테이너(`display: flex; flex-direction: column`)로 만들어 자식이 flex stretch 로 늘어나게 했다. flex 의 stretch 는 부모 높이가 definite 인지와 무관하게 동작하므로, `min-height` 만으로도 자식이 그 높이를 꽉 채운다.",
      en: "Make the container a flex container (`display: flex; flex-direction: column`) so the child stretches to fill it. Flex stretch works regardless of whether the parent's height is definite, so the child fills the `min-height`-derived box.",
    },
    keyInsight: {
      ko: "`height: 100%` 가 0 으로 죽으면 **부모가 `min-height` 로만 높이를 갖는지** 부터 의심한다. percentage height 는 definite height 를 요구하고, `min-height` 는 그 조건을 만족시키지 못한다. definite 높이를 만들 수 없는 상황이라면 percentage 대신 **flex/grid 의 stretch** 로 우회하는 편이 안전하다.",
      en: "When `height: 100%` dies to 0, first suspect that **the parent's height comes only from `min-height`**. Percentage heights require a definite height, and `min-height` doesn't satisfy that. When you can't give a definite height, route around it with **flex/grid stretch** instead of percentages.",
    },
    tags: ["css", "height", "min-height", "flexbox", "react-flow", "responsive"],
  },
  {
    id: "a-frosted-blur-on-the-sticky",
    problem: {
      ko: "스크롤 시 상단 탭바에 frost(blur) 를 깔려는데 blur 가 안 보이거나 잘림",
      en: "A frosted blur on the sticky top bar won't show — or gets clipped",
    },
    title: { ko: "backdrop-filter 와 stacking context", en: "backdrop-filter and the stacking context" },
    vizKey: "sticky-frost",
    definition: {
      ko: "이 블로그의 관리 화면에는 스크롤을 내려도 상단에 계속 고정되는 sticky 바가 있다. 여러 탭을 나란히 담는 도구 모음으로, 화면 어디를 보고 있든 접근할 수 있도록 `position: sticky` 로 상단에 붙여 둔 요소다. 이 바에 `backdrop-filter` 로 서리 낀 유리 같은 흐림 효과를 주려 했다. `backdrop-filter` 는 요소 자신을 흐리는 것이 아니라, 그 요소 뒤로 지나가는 콘텐츠를 읽어 흐리게 그려 주는 CSS 속성이다.\n\n의도한 동작은 단순하다. 바가 유리처럼 자기 뒤를 지나가는 콘텐츠를 흐려 주는 것이다. `backdrop-filter` 를 바 위에 얹은 장식용 의사 요소(pseudo-element) 층에 걸었더니, 효과가 바의 사각형 경계 안에만 적용되어 위쪽 메뉴 영역까지 닿지 못하고 잘렸다. 잘림을 피하려고 이 층을 바에서 떼어 `position: fixed` 로 viewport 에 고정하는 별도 층으로 바꿨다. 그러자 이번에는 흐림이 아래로 지나가는 글에 아무 효과도 내지 못했다. 이 페이지가 Lenis 스무스 스크롤로 스크롤되고 있었기 때문이다.",
      en: "The management screen of this blog has a sticky bar that stays pinned to the top even as the page scrolls down. It is a toolbar holding several tabs side by side, attached to the top with `position: sticky` so it can be reached from wherever you are on the page. The goal was to give this bar a frosted-glass blur with `backdrop-filter`. `backdrop-filter` is a CSS property that does not blur the element itself; it reads the content passing behind the element and paints it blurred.\n\nThe intended behavior is simple: the bar blurs whatever passes behind it, like glass. When `backdrop-filter` was placed on a decorative pseudo-element layer laid over the bar, the effect applied only inside the bar's rectangular boundary and was clipped before it could reach the menu area above. To avoid the clipping, that layer was detached from the bar and turned into a separate layer fixed to the viewport with `position: fixed`. This time the blur had no effect at all on the text passing beneath it, because the page was scrolling under Lenis smooth scroll.",
    },
    cause: {
      ko: "원인은 두 가지가 겹쳐 있었다.\n\n첫 번째는 바를 가로로 스크롤할 수 있게 만든 데서 비롯됐다. 탭이 많아 바가 옆으로 길어졌기 때문에 넘치는 부분을 `overflow-x: auto` 로 밀어서 볼 수 있게 해 두었다. 그런데 CSS 에는 한 가지 숨은 규칙이 있다. 한 축의 `overflow` 를 `visible` 이 아닌 값으로 지정하면, 나머지 축의 `overflow: visible` 도 자동으로 `auto`(사실상 clip)로 계산된다. 즉 `overflow-x` 만 스크롤로 바꿔도 `overflow-y` 가 함께 잘림 상태가 된다. 상자 밖으로 뻗어야 했던 장식 층이 이 규칙에 걸려 좌우뿐 아니라 위아래로도 잘려 나갔다.\n\n두 번째는 `position: fixed` 층의 성질에서 비롯됐다. `backdrop-filter` 는 현재 viewport 에 렌더된 영역을 기준으로 그 뒤 콘텐츠를 읽어 흐린다. 그런데 Lenis 스무스 스크롤은 페이지를 실제로 아래로 내리는 것이 아니라, 본문 전체를 하나의 덩어리로 묶어 `transform` 으로 통째로 위로 밀어 올리는 방식으로 동작한다. `transform` 이 걸린 이 덩어리는 자체 stacking context 를 만들고, `position: fixed` 층은 제자리에 머무는데 그 뒤에 있던 콘텐츠만 다른 위치로 밀려난다. 그 결과 흐릴 대상을 제자리에서 찾지 못해 흐릴 것이 없어진다.",
      en: "Two problems overlapped.\n\nThe first came from making the bar scrollable horizontally. With many tabs the bar grew wide, so the overflow was made reachable with `overflow-x: auto`. But CSS carries a hidden rule: when one axis of `overflow` is set to a value other than `visible`, the other axis's `overflow: visible` is automatically computed as `auto` (effectively clip). In other words, changing only `overflow-x` to a scroll value also puts `overflow-y` into a clipping state. The decorative layer, which needed to extend beyond the box, was caught by this rule and clipped at the top and bottom as well as the sides.\n\nThe second came from the nature of the `position: fixed` layer. `backdrop-filter` reads the content behind it based on the region currently rendered in the viewport. But Lenis smooth scroll does not actually move the page down; it bundles the whole body into a single block and pushes it upward with `transform`. An element under `transform` forms its own stacking context, so while the `position: fixed` layer stays in place, the content behind it slides to a different position. As a result it can no longer find its target where it expects, and there is nothing left to blur.",
    },
    solution: {
      ko: "이 블로그의 글 편집기 상단(topBar)에서는 같은 효과가 이미 정상 동작하고 있었다. 그래서 그 구조를 그대로 가져와 처음부터 다시 구성했다.\n\n먼저 바깥에 가로로도 세로로도 스크롤되지 않는 감싸는 래퍼 층을 하나 두었다. 상단 고정과 `backdrop-filter` 흐림은 이 바깥 층이 담당하게 했다. 잘림의 원인이던 `overflow-x` 스크롤은 그 안에 든 요소 하나에만 따로 부여했다. 이렇게 고정·흐림을 담당하는 층과 가로 스크롤을 담당하는 층으로 역할을 분리하자 장식 층이 더는 경계에 잘리지 않았다.\n\n`backdrop-filter` 는 `position: fixed` 층이 아니라, `position: sticky` 로 스크롤을 따라 상단에 붙어 함께 이동하는 바 자신의 장식 층에 적용했다. 그래야 뒤 콘텐츠가 `transform` 으로 밀려나더라도 흐림이 같은 stacking context 안에서 그 콘텐츠를 따라 이동하며 정상적으로 흐릴 수 있다. 여기에 흐림이 시작되는 위치를 위쪽 메뉴 높이만큼 끌어올려 메뉴 영역까지 덮게 했고, 아래쪽 경계는 흐림이 점차 옅어지며 사라지도록 다듬었다. 별도로 색을 덧칠하지 않고 뒤를 흐리는 것만으로 유리 같은 느낌을 냈다.",
      en: "The same effect was already working correctly at the top of this blog's post editor (topBar), so that structure was carried over and rebuilt from scratch.\n\nFirst, a wrapping layer that scrolls neither horizontally nor vertically was placed on the outside. Pinning to the top and the `backdrop-filter` blur were both assigned to this outer layer. The `overflow-x` scroll that had caused the clipping was given to a single element inside it. Once the roles were split into a layer for pinning and blur and a layer for horizontal scroll, the decorative layer was no longer clipped at the edge.\n\n`backdrop-filter` was applied to the bar's own decorative layer, which stays at the top and moves with the scroll via `position: sticky`, rather than to the `position: fixed` layer. That way, even when the content behind is pushed away by `transform`, the blur moves with that content inside the same stacking context and blurs it correctly. In addition, the point where the blur begins was raised by the height of the menu above so it also covers the menu area, and the bottom edge was smoothed so the blur fades out gradually. No separate color was painted; the glassy look comes purely from blurring what lies behind.",
    },
    keyInsight: {
      ko: "한 축을 `overflow-x` 로 스크롤할 수 있게 만들면 나머지 축의 `overflow` 도 함께 잘린다는 점을 염두에 두는 것이 좋다. 상자 밖으로 벗어나는 장식이나 그림자가 필요한 자리라면, 가로 스크롤을 담당하는 요소와 밖으로 넘치는 효과를 담당하는 요소를 처음부터 분리해 두는 편이 안전하다. 한 요소에 둘을 함께 맡기면 한쪽이 다른 쪽을 잘라 내기 때문이다.\n\n또한 본문 전체를 `transform` 으로 밀어 올리는 Lenis 스무스 스크롤 위에서는, `backdrop-filter` 처럼 뒤를 흐리는 효과를 `position: fixed` 요소가 아니라 스크롤을 따라 함께 이동하는 `position: sticky` 요소에 적용해야 한다. 그래야 같은 stacking context 안에서 멀리 밀려난 뒤 콘텐츠를 놓치지 않고 계속 흐릴 수 있다.",
      en: "It helps to keep in mind that making one axis scrollable with `overflow-x` also clips the other axis's `overflow`. Wherever decoration or a shadow needs to spill outside the box, it is safer to separate the element that handles the horizontal scroll from the element that handles the overflowing effect from the start, because assigning both to one element ends with one clipping the other.\n\nAlso, over a Lenis smooth scroll that pushes the whole body upward with `transform`, an effect that blurs what is behind, such as `backdrop-filter`, should be applied to a `position: sticky` element that moves with the scroll rather than a `position: fixed` one. Only then, within the same stacking context, can it keep hold of the content that has slid far away and go on blurring it.",
    },
    tags: ["css", "sticky", "overflow", "backdrop-filter", "lenis", "frost"],
  },
  {
    id: "restoring-a-deleted-comment-but-its",
    problem: {
      ko: "삭제된 댓글을 복구하려는데 내용이 이미 지워져 있었음",
      en: "Restoring a deleted comment, but its content was already wiped",
    },
    definition: {
      ko: "삭제(tombstone)된 댓글을 되살리는 기능을 만들려는데, `is_deleted` 만 되돌려도 내용이 빈 댓글이 복구됐습니다.",
      en: "Building a restore for a deleted (tombstoned) comment, flipping `is_deleted` back brought back an empty-content comment.",
    },
    cause: {
      ko: "댓글 삭제가 tombstone 시 `content`·`password_hash`·`commenter_hash` 를 전부 빈 값으로 덮어썼습니다(프라이버시 목적). 복구할 원문 자체가 DB 에 없었습니다.",
      en: "On tombstone, delete overwrote `content`·`password_hash`·`commenter_hash` with empty strings (for privacy). The original text to restore simply wasn't in the DB.",
    },
    solution: {
      ko: "삭제 시 내용을 보존하되 공개 API 에서 가렸습니다. tombstone 은 `is_deleted`/`deleted_by` 만 세팅하고 content 는 보존, 공개 GET 은 `is_deleted` 행의 `content`·`commenter_hash` 를 응답에서 빈 값으로 마스킹(UI 는 어차피 placeholder), 관리자 GET 은 원문 유지(복구 미리보기). 복구 엔드포인트는 `is_deleted=true` 행만 매칭 — 하드 삭제로 사라진 완전 삭제는 자연히 404.",
      en: "Preserve the content on delete but mask it in the public API. Tombstone sets only `is_deleted`/`deleted_by` and keeps `content`; the public GET masks `content`·`commenter_hash` to empty for `is_deleted` rows (the UI draws a placeholder anyway), while the admin GET keeps the original for the restore preview. The restore endpoint matches only `is_deleted=true` rows — a hard-deleted comment is gone, so it naturally 404s.",
    },
    keyInsight: {
      ko: "\"복구\" 는 \"삭제 시 무엇을 지웠는가\" 에 달렸습니다 — 되살릴 수 있으려면 삭제가 데이터를 파괴하지 않아야 하고, 대신 노출은 API 응답 레이어에서 가려야 프라이버시와 복구성이 양립합니다.",
      en: "\"Restore\" depends entirely on \"what did delete erase\" — for it to be restorable, delete must not destroy the data, and exposure must instead be masked at the API-response layer so privacy and restorability coexist.",
    },
    tags: ["comments", "soft-delete", "restore", "privacy", "supabase"],
  },
];

// ── 후처리 — 노출 항목 선별 + 메타 적용 ─────────────────────────

/**
 * 패널에 표시할 대표 항목. 배열 순서가 곧 표시 순서다.
 *
 * 나머지 항목은 데이터로 그대로 남아 있되 노출하지 않는다 —
 * 전부 늘어놓으면 읽히지 않아서, 섹션마다 1~3개씩만 골라 둔다.
 * 노출을 바꾸려면 이 배열만 고치면 된다.
 *
 * 선정 기준:
 *   - 원인이 브라우저/명세/번들러 층위 (내가 심은 실수가 아닌 것)
 *   - 같은 원인의 항목이 여럿이면 가장 깊은 하나만
 *   - 섹션 균형 — 프론트 함정만 남지 않도록 보안·백엔드를 반드시 포함
 */
const SHOWN_IDS: readonly string[] = [
  // 인증 / 인가
  "role-stored-in-app-metadata",
  "authorization-moves-to-code-when-rls-is-bypassed",
  "single-auth-path-for-anonymous-comments",
  // 데이터 / 정합성
  "delete-is-a-reversible-state-change",
  "optimistic-concurrency-with-a-version-counter",
  "duplicate-prevention-belongs-in-the-database",
  "revision-history-is-capped-per-entity",
  // 인프라 / 자동화
  "scheduled-jobs-run-inside-the-database",
  "notification-failure-must-not-fail-the-job",
];

export const troubleShootingItems: TroubleShootingItem[] = (() => {
  const byId = new Map(rawTroubleShootingItems.map((i) => [i.id, i]));

  /* 존재하지 않는 id 를 참조하면 조용히 빠지는 대신 즉시 터뜨린다.
     이전 구현은 problem.ko 문자열로 조인해서, 이스케이프 한 겹 차이만으로도
     항목이 아무 신호 없이 목록에서 사라졌다. 같은 실패를 반복하지 않기 위한 가드. */
  const orphans = [
    ...SHOWN_IDS.filter((id) => !byId.has(id)),
    ...Object.keys(itemMeta).filter((id) => !byId.has(id)),
  ];
  if (orphans.length > 0) {
    throw new Error(`troubleshooting: 존재하지 않는 항목 id — ${orphans.join(", ")}`);
  }

  const sectionIndex = (key?: keyof typeof SECTION) =>
    key ? SECTION_ORDER.indexOf(key) : 99;

  return SHOWN_IDS.map((id) => {
    const item = byId.get(id)!;
    const meta = itemMeta[id];
    if (!meta) return item;
    return {
      ...item,
      section: SECTION[meta.section],
      difficulty: meta.difficulty,
      ...(meta.recommended ? { recommended: true } : {}),
      ...(meta.recommendReason ? { recommendReason: meta.recommendReason } : {}),
    };
  }).sort(
    /* 섹션끼리 붙여 준다 (사이드바가 섹션이 바뀔 때만 라벨을 그리므로 필수).
       같은 섹션 안에서는 SHOWN_IDS 에 적은 순서를 그대로 둔다 — sort 는 stable. */
    (a, b) =>
      sectionIndex(itemMeta[a.id]?.section) - sectionIndex(itemMeta[b.id]?.section),
  );
})();
