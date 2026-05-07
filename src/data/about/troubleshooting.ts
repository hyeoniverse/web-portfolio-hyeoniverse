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
  { section: keyof typeof SECTION; difficulty: TroubleshootingDifficulty; recommended?: boolean }
> = {
  // Architecture & Backend
  "포스트 실수 삭제 시 복구 불가": { section: "A", difficulty: 3, recommended: true },
  "AI 번역/요약이 provider 장애 시 완전 중단": { section: "A", difficulty: 3, recommended: true },
  "API 키 변경마다 재배포가 필요": { section: "A", difficulty: 2 },
  "비회원 댓글에서 본인 확인이 번거로움": { section: "A", difficulty: 3, recommended: true },
  "에디터 자동저장 주기가 너무 잦아 리비전이 의미 없이 누적됨": { section: "A", difficulty: 2 },
  "자동저장 — localStorage에서 DB 리비전으로의 진화": { section: "A", difficulty: 3, recommended: true },
  "카테고리 자동 보정으로 리비전 프롬프트가 무한 반복": { section: "A", difficulty: 2 },
  // Performance
  "reCAPTCHA v3 초기 로드 성능 저하 (LCP 17.1s, TTI 18.2s)": { section: "P", difficulty: 3, recommended: true },
  "mousemove마다 React 리렌더 (60fps 성능 저하)": { section: "P", difficulty: 2, recommended: true },
  "커스텀 커서의 무거운 hit-test가 가벼운 위치 보간을 함께 느리게 만듦": { section: "P", difficulty: 3, recommended: true },
  "Three.js LatheGeometry 컵에 Canvas 2D 라떼아트 텍스처 합성 — 두 개 평면이 만나는 부분의 자연스러운 블렌딩": { section: "P", difficulty: 3 },
  "GSAP ScrollTrigger 수평 무한 스크롤 — 양방향 무한 wrapping": { section: "P", difficulty: 3, recommended: true },
  "LoadingScreen이 SSR에 포함되지 않아 콘텐츠 flash 발생": { section: "P", difficulty: 2, recommended: true },
  // Layout & CSS
  "코드 블록 줄바꿈 토글 시 레이아웃이 갑자기 튐": { section: "L", difficulty: 2 },
  "글로벌 transition shorthand가 컴포넌트 전환 효과를 덮어씀": { section: "L", difficulty: 2, recommended: true },
  "CSS Module 해시 충돌로 데스크톱 레이아웃 붕괴": { section: "L", difficulty: 3 },
  "CSS 토큰 미정의 — 11개 파일에서 참조하지만 선언 없음": { section: "L", difficulty: 1 },
  "CTA 버튼 `backdrop-filter`가 Chrome에서 동작하지 않음": { section: "L", difficulty: 3, recommended: true },
  "Admin 테이블 모바일 가로 스크롤 시 row border가 중간에서 끊김": { section: "L", difficulty: 3 },
  "Posts Bento — `grid-template-rows` 만으로는 카드별 높이 차이가 빈칸을 만듦": { section: "L", difficulty: 3, recommended: true },
  "sticky filterBar IntersectionObserver — 인기글 사이드바와 1px 어긋남": { section: "L", difficulty: 2 },
  "Navigation 메뉴가 좁은 viewport 에서 우측 actions 와 겹침 + indicator 가 resize 중 메뉴 위치를 못 따라감": { section: "L", difficulty: 2, recommended: true },
  "커버 이미지 팔레트 등 grid 자식이 viewport 밖으로 잘려 나감 — `.row { grid-template-columns: 1fr 1fr }` 의 함정": { section: "L", difficulty: 2, recommended: true },
  // Plate Editor
  "Richtext 게시물에서 코드 하이라이팅·줄바꿈 버튼이 사라짐": { section: "E", difficulty: 2 },
  "Plate 에디터에서 컨텍스트 툴바 표시 시 커서가 멋대로 튐": { section: "E", difficulty: 3 },
  "토글·콜아웃·열블록 콘텐츠가 저장 후 사라짐": { section: "E", difficulty: 3, recommended: true },
  "제목(heading) 안 각주가 마크다운 변환 시 처리 안 됨": { section: "E", difficulty: 3 },
  "Plate inline void 노드에서 클릭 vs 키보드 구분 불가": { section: "E", difficulty: 3 },
  "인라인 이미지 양옆에 커서 배치·텍스트 입력 불가": { section: "E", difficulty: 3 },
  "마크다운 각주 번호 꼬임 — heading renderer 충돌": { section: "E", difficulty: 3 },
  "열블록 스타일 round-trip 유실": { section: "E", difficulty: 3, recommended: true },
  "YouTube embed URL — watch URL이 iframe에서 로드 실패": { section: "E", difficulty: 1 },
  "이미지 리사이즈 핸들 클릭 시 이미지가 삭제됨": { section: "E", difficulty: 2 },
  "에디터 툴바 active 상태 — wrapper 블록 감지 실패": { section: "E", difficulty: 2 },
  "각주 참조/내용 정합성 — 한쪽 삭제 시 고아 노드 잔존": { section: "E", difficulty: 2 },
  "링크 클릭 시 즉시 이동 — 에디터에서 링크 편집 불가": { section: "E", difficulty: 1 },
  "Plate 인라인 코드에서 방향키 커서 점프": { section: "E", difficulty: 2 },
  // Animation & Interaction
  "커스텀 커서 리사이즈 모드에서 마우스 방향에 따라 커서 회전": { section: "I", difficulty: 1 },
  "Page transition 이 hold 단계에서 멈추고 morph 후 skeleton 이 노출": { section: "I", difficulty: 3, recommended: true },
  "Series Deck — hover 펼침이 \"사라졌다 나타나는\" 느낌": { section: "I", difficulty: 3 },
  "Series Deck spread — `setPointerCapture` 가 자식 click 차단 + hit-area 공백으로 flicker": { section: "I", difficulty: 3, recommended: true },
  "HTML5 drag 가 pointermove 를 막아 커스텀 커서가 멈추고 type 도 계속 바뀜": { section: "I", difficulty: 3, recommended: true },
  "HTML5 D&D 의 quirks 회피 — chip 드래그 정렬을 pointer 기반으로 전환": { section: "I", difficulty: 3, recommended: true },
  "이미지 깨짐 placeholder — `dangerouslySetInnerHTML` 로 렌더된 markdown img 에는 React onError 가 안 붙음": { section: "I", difficulty: 3, recommended: true },
  // Component System
  "Admin 리스트(시리즈/휴지통/게시물)의 UI 코드 중복과 스타일 불일치": { section: "C", difficulty: 2 },
  "커스텀 ColorPicker popover 가 trigger 위치에 안 붙음 — wrapper `<span>` 이 0×0 으로 collapse": { section: "C", difficulty: 2, recommended: true },
};

const rawTroubleShootingItems: TroubleShootingItem[] = [
  /* ── Backend / Admin ── */
  {
    section: { ko: "Backend / Admin", en: "Backend / Admin" },
    problem: { ko: "포스트 실수 삭제 시 복구 불가", en: "Accidental Post Deletion with No Recovery" },
    definition: {
      ko: "관리자가 글을 실수로 지우면 **DB 에서 그대로 사라져**, 되돌릴 방법이 전혀 없었습니다.",
      en: "When the admin accidentally deleted a post, it was **permanently removed from the DB** with no recovery mechanism available.",
    },
    cause: {
      ko: "처음 구현은 일반적인 CRUD 패턴 그대로 **\"삭제 버튼 = DB 에서 row 즉시 제거\"** 였습니다.\n\n이후 admin 화면에 체크박스로 여러 글을 한꺼번에 지우는 **일괄 삭제 UI** 를 추가했고, 일괄 삭제가 들어가자 그동안 단일 row 삭제에서는 크게 의식되지 않던 위험이 한눈에 들어왔습니다. **클릭 한 번에 여러 row 가 같이 사라질 수 있고**, 처음 구현된 \"즉시 제거\" 구조에서는 그 사라짐이 곧 영구 손실로 이어진다는 점이었습니다.\n\n관리자가 한 명뿐인 환경은 \"실수가 거의 없을 것\" 이라고 넘기기 쉬우나, 사실은 **한 번의 실수를 받아 줄 다른 사람도, 검토 단계도 존재하지 않는 환경** 입니다. 발생 빈도가 낮더라도 한 번 발생했을 때의 비용이 비대칭적으로 크기 때문에, 일괄 삭제 UI 와 함께 **\"되돌릴 수 있는 삭제\" 구조 (soft delete + 휴지통) 를 같이 도입** 하기로 결정했습니다.",
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
  },
  {
    problem: { ko: "AI 번역/요약이 provider 장애 시 완전 중단", en: "AI Translation/Summary Completely Down on Provider Outage" },
    definition: {
      ko: "AI 번역과 요약 기능은 DeepL, Gemini 같은 외부 회사의 API 를 호출해 처리합니다.\n\n테스트 중 `.env` 의 API 키를 잠시 주석 처리해 봤더니, 번역이나 요약을 시도할 때마다 **\"인증 실패\" 같은 에러 메시지가 사용자 화면에 그대로 노출**되었습니다.\n\n이 사이트는 대부분의 API 를 무료 plan 으로 쓰는 환경이라, **시간당 호출 제한 (rate limit) 도달이나 일시적 장애는 운영 중에도 충분히 발생할 수 있는 시나리오** 였습니다. 테스트로 끝낼 문제가 아니라 실제로 대비가 필요했습니다.",
      en: "The AI translation and summary features call external APIs (DeepL, Gemini, etc.).\n\nWhile testing, I commented out an API key in `.env` — every translation or summary attempt **surfaced raw error messages like \"auth failed\" directly to users**.\n\nMost APIs were on free tiers, so **hitting rate limits or temporary outages was a realistic production concern** — not just a theoretical edge case.",
    },
    cause: {
      ko: "번역 API 는 DeepL · Google · Gemini · Claude 등 여러 곳 중에서 골라 쓸 수 있도록 만들어 두었습니다 (이런 API 서비스 회사를 \"provider\" 라고 부릅니다).\n\n그러나 \"여러 곳을 지원한다\" 는 것이 \"실제로 그 여러 곳을 모두 쓴다\" 와 같은 의미는 아니었습니다. 실제 동작은 \"이 기능은 DeepL 한 곳만 호출한다\" 처럼 **한 번 호출할 때 한 곳만 시도** 하고, 그것이 실패하면 거기서 끝나는 구조였습니다. 자동으로 다른 곳으로 넘어가는 \"대체 경로 (fallback)\" 가 없었습니다.\n\n게다가 API 키가 등록되지 않은 provider 를 선택해 둔 상태에서도 UI 는 해당 기능을 그대로 노출했습니다. \"지금은 사용할 수 없다\" 고 숨기지도 비활성화하지도 않으니, **누가 봐도 실패할 버튼을 사용자가 계속 누를 수 있는** 상태였습니다.",
      en: "Translation can route through any of several external APIs — DeepL, Google, Gemini, Claude (these external API services are called \"providers\").\n\nBut \"supporting multiple providers\" isn't the same as \"using them\". The actual flow was \"this feature only ever calls DeepL\" — **one provider per call, and if it failed, that was the end**. There was no automatic switch to another provider, no \"fallback\".\n\nWorse, even when the selected provider had no API key registered, the UI didn't hide or disable the feature. So **users could keep clicking a button that was guaranteed to fail**.",
    },
    solution: {
      ko: "사이트 설정에서 **\"기본 provider + 백업 provider 순서\"** 를 직접 구성할 수 있게 변경했습니다.\n\n예를 들어 기본은 DeepL, 실패 시 백업 순서를 [Gemini → Google → Claude] 로 두는 식입니다. 기본이 실패하면 백업 리스트를 순서대로 시도하고, 하나라도 성공하면 그 결과를 즉시 반환합니다. 모두 실패해야만 그제서야 사용자 화면에 에러가 노출됩니다.\n\nAPI 키가 등록되지 않은 provider 는 **호출 자체를 시도하지 않고 자동으로 건너뜁니다.** 어차피 실패할 요청을 보낼 이유가 없기 때문입니다.\n\n또한 \"배치 번역\" 케이스도 별도로 처리했습니다. 배치 번역은 한 번의 API 호출에 여러 텍스트를 묶어 보내는 방식 (예: 제목 + 본문 + 요약 세 항목을 한 번에 전송) 인데, 5개를 보냈는데 결과가 4개만 돌아오는 \"부분 실패\" 가 발생할 수 있습니다. 이를 그대로 받아 저장하면 한 줄이 누락된 채로 저장됩니다. 따라서 **입력 개수와 결과 개수를 비교해 일치하지 않으면 그 provider 를 실패로 판정** 하고 다음 백업으로 넘기도록 했습니다.",
      en: "Site settings now expose a **\"primary provider + backup priority list\"** configuration.\n\nFor example: primary DeepL, backups in order [Gemini → Google → Claude]. If primary fails, the backups are tried in order; the first success is returned. Only if all fail does the error reach the user.\n\nProviders missing an API key are **skipped without any network call** — no wasted requests on guaranteed failures.\n\nThere's also a separate case: \"batch translation\" — translating multiple texts in one API call (e.g., sending title + body + excerpt = 3 strings together). A subtle failure mode is that you send 5 strings but only 4 results come back; if you naively use the 4, you save the post with one line silently missing. So the pipeline **compares input count vs. output count and treats any mismatch as a provider failure**, falling through to the next backup.",
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
          { cells: [{ ko: "배치 번역 부분 실패", en: "Partial batch failure" }, { ko: "결과 부족한 채로 저장", en: "Saved with missing rows" }, { ko: "개수 불일치 → 다음 백업", en: "Count mismatch → next backup" }] },
          { cells: [{ ko: "사용자 경험", en: "User experience" }, { ko: "기능이 \"가끔 죽음\"", en: "Feature \"sometimes dies\"" }, { ko: "어떤 회사가 죽어도 동작", en: "Works through outages" }], highlight: true },
        ],
      } satisfies ComparisonTable,
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
  },
  /* ── Editor ── */
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
      };
    });

  const sectionIndex = (sec?: { ko: string; en: string }) => {
    if (!sec) return 99;
    const found = SECTION_ORDER.findIndex((k) => SECTION[k].ko === sec.ko);
    return found < 0 ? 99 : found;
  };

  return enriched.sort((a, b) => {
    const dSec = sectionIndex(a.section) - sectionIndex(b.section);
    if (dSec !== 0) return dSec;
    return (a.difficulty ?? 2) - (b.difficulty ?? 2);
  });
})();
