import type { Language } from "@/providers/LanguageProvider";

interface GlossaryEntry {
  /** 텍스트에서 매칭할 패턴 (대소문자 무시) */
  match: string[];
  tip: Record<Language, string>;
}

const glossary: GlossaryEntry[] = [
  {
    match: ["soft delete"],
    tip: {
      ko: "데이터를 실제로 삭제하지 않고, 삭제 표시만 남기는 패턴",
      en: "Pattern that marks data as deleted instead of actually removing it",
    },
  },
  {
    match: ["fallback"],
    tip: {
      ko: "주요 경로가 실패했을 때 자동으로 전환되는 대체 경로",
      en: "Alternative path automatically used when the primary fails",
    },
  },
  {
    match: ["rate limit"],
    tip: {
      ko: "일정 시간 내 허용된 API 호출 횟수 제한",
      en: "Limit on the number of API calls allowed within a time window",
    },
  },
  {
    match: ["debounce"],
    tip: {
      ko: "연속된 호출 중 마지막 호출만 실행되도록 지연시키는 기법",
      en: "Technique that delays execution until calls stop for a set period",
    },
  },
  {
    match: ["SHA-256"],
    tip: {
      ko: "단방향 해시 알고리즘. 같은 입력은 항상 같은 결과를 내지만 역추적 불가",
      en: "One-way hash algorithm. Same input always produces the same output, but irreversible",
    },
  },
  {
    match: ["bcrypt"],
    tip: {
      ko: "비밀번호 전용 해시 알고리즘. 의도적으로 느려서 무차별 대입에 강함",
      en: "Password-specific hashing algorithm. Intentionally slow to resist brute force",
    },
  },
  {
    match: ["JSONB"],
    tip: {
      ko: "PostgreSQL의 바이너리 JSON. 구조화된 데이터를 효율적으로 저장·검색 가능",
      en: "PostgreSQL binary JSON type for efficient structured data storage and querying",
    },
  },
  {
    match: ["TTL"],
    tip: {
      ko: "Time To Live. 캐시 데이터가 유효한 시간",
      en: "Time To Live. How long cached data remains valid",
    },
  },
  {
    match: ["requestAnimationFrame", "RAF"],
    tip: {
      ko: "브라우저의 다음 화면 갱신(~16ms) 시점에 맞춰 코드를 실행하는 API",
      en: "Browser API that runs code in sync with the next screen refresh (~16ms)",
    },
  },
  {
    match: ["lerp", "LERP"],
    tip: {
      ko: "Linear Interpolation. 두 값 사이를 일정 비율로 부드럽게 보간하는 기법",
      en: "Linear Interpolation. Smoothly blends between two values at a given ratio",
    },
  },
  {
    match: ["hit-test"],
    tip: {
      ko: "특정 좌표에 어떤 요소가 있는지 판별하는 과정",
      en: "Process of determining which element exists at a given coordinate",
    },
  },
  {
    match: ["FLIP"],
    tip: {
      ko: "First-Last-Invert-Play. 변경 전후 상태를 측정한 뒤 역재생하는 애니메이션 기법",
      en: "First-Last-Invert-Play. Measures before/after states, then animates the difference",
    },
  },
  {
    match: ["WAAPI", "Web Animations API"],
    tip: {
      ko: "브라우저 내장 애니메이션 API. 메인 스레드와 별도로 실행 가능",
      en: "Browser-native animation API that can run off the main thread",
    },
  },
  {
    match: ["useState"],
    tip: {
      ko: "React 상태 훅. 값이 변경되면 컴포넌트가 다시 렌더링됨",
      en: "React state hook. Changing the value triggers a component re-render",
    },
  },
  {
    match: ["useRef"],
    tip: {
      ko: "React 참조 훅. 값을 저장하지만 변경해도 리렌더링이 발생하지 않음",
      en: "React ref hook. Stores values without triggering re-renders on change",
    },
  },
  {
    match: ["LCP"],
    tip: {
      ko: "Largest Contentful Paint. 가장 큰 콘텐츠가 화면에 표시되는 시점",
      en: "Largest Contentful Paint. When the largest content element becomes visible",
    },
  },
  {
    match: ["TTI"],
    tip: {
      ko: "Time to Interactive. 페이지가 사용자 입력에 반응 가능해지는 시점",
      en: "Time to Interactive. When the page becomes responsive to user input",
    },
  },
  {
    match: ["preconnect"],
    tip: {
      ko: "외부 서버와 DNS/TLS 연결을 미리 수립하여 실제 요청 시 지연을 줄이는 힌트",
      en: "Resource hint that pre-establishes DNS/TLS connections to reduce latency",
    },
  },
  {
    match: ["sendBeacon"],
    tip: {
      ko: "페이지가 닫혀도 데이터를 안전하게 전송하는 브라우저 API",
      en: "Browser API that reliably sends data even when the page is closing",
    },
  },
  {
    match: ["elementsFromPoint"],
    tip: {
      ko: "특정 좌표의 모든 DOM 요소를 반환하는 API. 중첩 요소가 많으면 비용이 큼",
      en: "API returning all DOM elements at a coordinate. Expensive with many nested elements",
    },
  },
  {
    match: ["CSS Module"],
    tip: {
      ko: "CSS 클래스명에 고유 해시를 붙여 스타일 충돌을 방지하는 기법",
      en: "Technique that appends unique hashes to class names to prevent style conflicts",
    },
  },
  {
    match: ["shorthand"],
    tip: {
      ko: "여러 CSS 속성을 한 줄로 축약하는 문법. 미지정 속성은 초기값으로 리셋됨",
      en: "CSS syntax combining multiple properties in one line. Unspecified properties reset to defaults",
    },
  },
  {
    match: ["FK"],
    tip: {
      ko: "Foreign Key. DB 테이블 간의 참조 관계를 정의하는 제약 조건",
      en: "Foreign Key. Constraint defining referential relationships between DB tables",
    },
  },
  {
    match: ["Plate"],
    tip: {
      ko: "Slate 기반의 Rich Text 에디터 프레임워크. 플러그인으로 기능 확장 가능",
      en: "Slate-based rich text editor framework. Extensible via plugins",
    },
  },
  {
    match: ["inline void", "Inline Void"],
    tip: {
      ko: "편집 불가한 인라인 요소. 각주·멘션 등 텍스트 흐름 속 특수 노드에 사용",
      en: "Non-editable inline element used for footnotes, mentions, and other special nodes within text flow",
    },
  },
  {
    match: ["void node"],
    tip: {
      ko: "자식 텍스트를 가지지 않는 Slate 노드. 이미지·구분선 등에 사용",
      en: "Slate node with no child text. Used for images, dividers, etc.",
    },
  },
  {
    match: ["dangerouslySetInnerHTML"],
    tip: {
      ko: "React에서 HTML 문자열을 직접 삽입하는 속성. XSS 위험이 있어 주의 필요",
      en: "React prop for injecting raw HTML strings. Requires caution due to XSS risks",
    },
  },
  {
    match: ["SSR"],
    tip: {
      ko: "Server-Side Rendering. 서버에서 HTML을 미리 생성하여 전달하는 방식",
      en: "Server-Side Rendering. Pre-generates HTML on the server before sending to the client",
    },
  },
  {
    match: ["MutationObserver"],
    tip: {
      ko: "DOM 변경을 비동기로 감지하는 브라우저 API",
      en: "Browser API that asynchronously observes DOM changes",
    },
  },
  {
    match: ["contentEditable"],
    tip: {
      ko: "HTML 요소를 브라우저에서 직접 편집 가능하게 만드는 속성",
      en: "HTML attribute that makes an element editable directly in the browser",
    },
  },
  {
    match: ["slug"],
    tip: {
      ko: "URL에 사용되는 사람이 읽을 수 있는 고유 식별자 (예: my-first-post)",
      en: "Human-readable unique identifier used in URLs (e.g., my-first-post)",
    },
  },
  {
    match: ["WebP"],
    tip: {
      ko: "Google이 개발한 이미지 포맷. JPEG/PNG 대비 25~35% 작은 파일 크기",
      en: "Image format by Google. 25-35% smaller file sizes compared to JPEG/PNG",
    },
  },
  {
    match: ["RLS"],
    tip: {
      ko: "Row Level Security. DB 행 단위로 접근 권한을 제어하는 Supabase/PostgreSQL 기능",
      en: "Row Level Security. Supabase/PostgreSQL feature controlling access at the row level",
    },
  },
  {
    match: ["marked-footnote"],
    tip: {
      ko: "마크다운 파서 marked의 각주 확장 플러그인",
      en: "Footnote extension plugin for the marked markdown parser",
    },
  },
  {
    match: ["투표 블록", "poll"],
    tip: {
      ko: "본문에 삽입하는 투표 블록. 질문/옵션은 본문 HTML에 저장되고 집계만 poll_votes 테이블이 담당",
      en: "An in-content poll block. Questions/options live in the content HTML; only the tally is stored in the poll_votes table",
    },
  },
  {
    match: ["related-series", "series_work_relations"],
    tip: {
      ko: "프로젝트와 시리즈를 다대다로 잇는 조인 테이블 기반 연관 시리즈 기능",
      en: "Related-series feature backed by a join table linking works and series in a many-to-many relationship",
    },
  },
  {
    match: ["mermaid"],
    tip: {
      ko: "텍스트로 플로차트·다이어그램을 그리는 문법. 본문에서 코드 블록처럼 렌더링됨",
      en: "Text-based syntax for drawing flowcharts and diagrams, rendered like a code block in content",
    },
  },
  {
    match: ["ViewModeToggle", "뷰 모드"],
    tip: {
      ko: "콘텐츠 표시 방식(예: 목록/그리드)을 전환하는 토글 컴포넌트",
      en: "Toggle component that switches the content display mode (e.g., list/grid)",
    },
  },
  {
    match: ["reCAPTCHA"],
    tip: {
      ko: "구글의 봇 판별 서비스. v3 는 사용자 조작 없이 행동 점수로 사람/봇을 추정",
      en: "Google's bot-detection service. v3 scores traffic as human or bot with no user interaction",
    },
  },
  {
    match: ["service-role", "service role"],
    tip: {
      ko: "Supabase 관리자 키. RLS 같은 권한 검사를 우회하므로 서버에서만 써야 안전",
      en: "Supabase admin key that bypasses checks like RLS — safe only on the server",
    },
  },
  {
    match: ["deserializer", "역직렬화"],
    tip: {
      ko: "저장된 문자열(HTML 등)을 다시 편집기 노드 구조로 되돌리는 변환기",
      en: "Converter that turns a stored string (e.g. HTML) back into editor node structures",
    },
  },
  {
    match: ["stacking context", "쌓임 맥락"],
    tip: {
      ko: "z-index 비교가 유효한 독립 계층. position·opacity·transform·filter 등이 새로 만든다",
      en: "An independent layer where z-index applies, created by position, opacity, transform, filter, etc.",
    },
  },
  {
    match: ["middleware"],
    tip: {
      ko: "요청이 처리되기 전에 가로채 공통 로직(인증·리다이렉트 등)을 실행하는 계층",
      en: "Layer that intercepts requests before handling to run shared logic (auth, redirects, etc.)",
    },
  },
  {
    match: ["default-deny", "default-allow"],
    tip: {
      ko: "접근을 기본 차단(default-deny)할지 기본 허용(default-allow)할지의 정책. 기본 차단이 빠뜨려도 안전한 쪽으로 실패",
      en: "Whether access defaults to deny or allow. Default-deny fails safe when a rule is forgotten",
    },
  },
  {
    match: ["brute-force", "무차별 대입"],
    tip: {
      ko: "가능한 값을 전부 대입해 뚫는 공격",
      en: "Attack that tries every possible value until one works",
    },
  },
  {
    match: ["throttle"],
    tip: {
      ko: "연속 호출을 일정 간격당 한 번으로 제한하는 기법. debounce 와 달리 주기적으로 실행됨",
      en: "Technique capping calls to once per interval — unlike debounce, it keeps firing periodically",
    },
  },
  {
    match: ["Lenis"],
    tip: {
      ko: "관성·감속을 흉내 내는 부드러운 스크롤 라이브러리",
      en: "Smooth-scroll library that emulates inertia and easing",
    },
  },
  {
    match: ["fps"],
    tip: {
      ko: "Frames Per Second. 1초에 그려지는 화면 프레임 수 (60fps ≈ 16ms/프레임)",
      en: "Frames Per Second. Screen frames drawn per second (60fps ≈ 16ms/frame)",
    },
  },

  /* ── 노출 항목에 등장하는 용어 보강 ── */
  {
    match: ["HMAC-SHA256", "HMAC"],
    tip: {
      ko: "비밀 키를 함께 넣어 계산하는 해시. 키를 모르면 같은 값을 만들어 낼 수 없어 위조에 강하다",
      en: "A hash computed with a secret key — without the key the same value can't be produced, so it resists forgery",
    },
  },
  {
    match: ["UUID"],
    tip: {
      ko: "중복될 확률이 사실상 없는 128비트 무작위 식별자",
      en: "A 128-bit random identifier with a negligible chance of collision",
    },
  },
  {
    match: ["localStorage"],
    tip: {
      ko: "브라우저가 도메인별로 보관하는 저장 공간. 같은 브라우저에서만 읽히고 서버는 못 본다",
      en: "Per-domain browser storage — readable only in the same browser, invisible to the server",
    },
  },
  {
    match: ["curl"],
    tip: {
      ko: "터미널에서 서버로 직접 요청을 보내는 도구. 브라우저와 화면 폼을 거치지 않는다",
      en: "A terminal tool that sends requests straight to a server, bypassing the browser and its forms",
    },
  },
  {
    match: ["URI"],
    tip: {
      ko: "자원을 가리키는 문자열. `https://…` 뿐 아니라 `mailto:`·`data:` 같은 형태도 포함한다",
      en: "A string identifying a resource — not just `https://…` but forms like `mailto:` and `data:`",
    },
  },
  {
    match: ["compositing layer", "합성 레이어"],
    tip: {
      ko: "브라우저가 따로 떼어 GPU 텍스처로 그리는 층. 경계 밖 픽셀은 그 층에서 보이지 않는다",
      en: "A layer the browser paints as its own GPU texture — pixels outside its bounds are invisible to it",
    },
  },
  {
    match: ["will-change"],
    tip: {
      ko: "곧 바뀔 속성을 브라우저에 미리 알리는 CSS 속성. 레이어 승격을 유발한다",
      en: "A CSS hint that a property will change soon — it promotes the element to its own layer",
    },
  },
  {
    match: ["backdrop-filter"],
    tip: {
      ko: "요소 자신이 아니라 뒤에 비치는 콘텐츠를 흐리거나 보정하는 CSS 속성",
      en: "A CSS property that filters what shows through behind an element, not the element itself",
    },
  },
  {
    match: ["definite height", "확정 높이"],
    tip: {
      ko: "브라우저가 계산 전에 이미 아는 높이. 자식의 `height: 100%` 는 이 값이 있어야 풀린다",
      en: "A height the browser knows up front — a child's `height: 100%` only resolves against one",
    },
  },
  {
    match: ["서로게이트 페어", "surrogate pair"],
    tip: {
      ko: "16비트 두 칸을 이어 붙여 한 글자를 나타내는 방식. 이모지 등 상위 평면 문자에 쓰인다",
      en: "Two 16-bit units joined to represent one character — used for emoji and other astral-plane text",
    },
  },
  {
    match: ["astral plane", "상위 평면"],
    tip: {
      ko: "16비트 한 칸에 안 들어가는 유니코드 영역. 이모지와 희귀 문자가 여기 있다",
      en: "The Unicode range beyond a single 16-bit unit — emoji and rare characters live here",
    },
  },
  {
    match: ["트랜스파일", "transpile"],
    tip: {
      ko: "최신 문법을 옛 브라우저도 읽는 문법으로 바꿔 쓰는 변환",
      en: "Rewriting modern syntax into a form older browsers can also read",
    },
  },
  {
    match: ["번들러", "bundler"],
    tip: {
      ko: "여러 소스 파일을 브라우저가 받을 수 있는 형태로 묶고 변환하는 빌드 도구",
      en: "A build tool that packs and transforms source files into what a browser can load",
    },
  },
  {
    match: ["의사요소", "pseudo-element"],
    tip: {
      ko: "HTML 에 없지만 CSS 로 만들어 내는 가상 요소 (`::before`, `::-webkit-resizer` 등)",
      en: "A virtual element created by CSS rather than HTML (`::before`, `::-webkit-resizer`, …)",
    },
  },
  {
    match: ["pg_cron"],
    tip: {
      ko: "PostgreSQL 안에서 직접 정기 작업을 돌리는 확장. 호스팅의 cron 이 필요 없어진다",
      en: "A PostgreSQL extension that runs scheduled jobs inside the database, with no host cron needed",
    },
  },
  {
    match: ["pg_net"],
    tip: {
      ko: "PostgreSQL 이 직접 HTTP 요청을 보낼 수 있게 하는 확장",
      en: "A PostgreSQL extension that lets the database itself make HTTP requests",
    },
  },
  {
    match: ["Vault"],
    tip: {
      ko: "Supabase 가 API 키 같은 비밀 값을 암호화해 보관하는 저장소",
      en: "Supabase's encrypted store for secrets such as API keys",
    },
  },
  {
    match: ["cron"],
    tip: {
      ko: "정해진 시각·주기로 작업을 자동 실행하는 스케줄러",
      en: "A scheduler that runs jobs automatically at fixed times or intervals",
    },
  },
  {
    match: ["idempotent", "멱등"],
    tip: {
      ko: "여러 번 실행해도 결과가 한 번 실행한 것과 같은 성질",
      en: "Running it repeatedly leaves the same result as running it once",
    },
  },
  {
    match: ["fail-soft"],
    tip: {
      ko: "부수 작업이 실패해도 본 작업은 그대로 완료시키는 설계",
      en: "A design where a side task can fail without taking the main task down",
    },
  },
  {
    match: ["font-display"],
    tip: {
      ko: "웹폰트가 아직 안 왔을 때 무엇을 보여줄지 정하는 CSS 설정 (`swap`, `optional` 등)",
      en: "The CSS setting for what to show while a web font is still loading (`swap`, `optional`, …)",
    },
  },
  {
    match: ["부동소수점", "floating point"],
    tip: {
      ko: "컴퓨터가 소수를 근삿값으로 다루는 방식. `0.1 + 0.2 !== 0.3` 이 되는 원인이다",
      en: "How computers store fractions approximately — the reason `0.1 + 0.2 !== 0.3`",
    },
  },
  {
    match: ["plaintext-only"],
    tip: {
      ko: "`contenteditable` 값 중 하나. 붙여넣기에서 서식을 걷어내고 Enter 를 줄바꿈으로 고정한다",
      en: "A `contenteditable` mode that strips formatting on paste and makes Enter a plain newline",
    },
  },
  {
    match: ["IME"],
    tip: {
      ko: "한글·일본어처럼 여러 입력을 조합해 한 글자를 만드는 입력기",
      en: "The input system that composes one character from several keystrokes (Korean, Japanese, …)",
    },
  },
  {
    match: ["caret"],
    tip: {
      ko: "입력 위치를 나타내는 깜빡이는 문자 커서",
      en: "The blinking text cursor marking the insertion point",
    },
  },
  {
    match: ["TreeWalker"],
    tip: {
      ko: "DOM 트리의 노드를 조건에 맞춰 순회하는 브라우저 API",
      en: "A browser API for walking DOM nodes that match a given filter",
    },
  },
  {
    match: ["overscroll"],
    tip: {
      ko: "스크롤 끝에서 더 당겼을 때 화면이 밀렸다 돌아오는 동작 (macOS 의 rubber band)",
      en: "The bounce past a scroll boundary — macOS's rubber-band effect",
    },
  },
  {
    match: ["react-flow"],
    tip: {
      ko: "노드와 연결선으로 도표를 그리는 React 라이브러리",
      en: "A React library for drawing diagrams from nodes and edges",
    },
  },
  {
    match: ["fitView"],
    tip: {
      ko: "도표 전체 또는 지정한 범위가 화면에 들어오도록 확대·이동을 맞추는 동작",
      en: "Framing the view so the whole diagram, or a given range, fits on screen",
    },
  },
  {
    match: ["useEffect"],
    tip: {
      ko: "렌더가 끝난 뒤 실행되도록 예약하는 React 훅",
      en: "A React hook that schedules work to run after render",
    },
  },
  {
    match: ["프레임 예산", "frame budget"],
    tip: {
      ko: "한 프레임 안에 끝내야 하는 시간. 60fps 면 약 16ms 다",
      en: "The time one frame has to finish in — about 16ms at 60fps",
    },
  },
];

/** 언어별로 match → tip 맵을 한 번만 빌드 */
function buildMap(lang: Language): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of glossary) {
    for (const m of entry.match) {
      map.set(m.toLowerCase(), entry.tip[lang]);
    }
  }
  return map;
}

const cache = new Map<Language, { regex: RegExp; map: Map<string, string> }>();

export function getGlossary(lang: Language) {
  let cached = cache.get(lang);
  if (!cached) {
    const map = buildMap(lang);
    const escaped = [...map.keys()]
      .sort((a, b) => b.length - a.length) // 긴 것 우선 매치
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
    cached = { regex, map };
    cache.set(lang, cached);
  }
  return cached;
}
