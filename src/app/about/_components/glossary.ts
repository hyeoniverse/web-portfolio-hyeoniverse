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
