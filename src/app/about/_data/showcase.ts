/* About 내용 — MacFolio 의 hyeoniverse 사례 페이지에서 가져오고, 숫자는 이 레포에서 다시 셌다
   (API 라우트 = src/app/api 의 route.ts 수, 테스트 = vitest, 결정 기록 = docs/design-system-decisions.md 의 D 항목,
   성능 = README). 관리자 편집은 없다 — 글은 이 파일에서 고친다. */
import { apiMap } from "@/data/generated/apiMap";

export interface L10n {
  ko: string;
  en: string;
}

export const hero = {
  wordmark: "HYEONIVERSE",
  /** 소개 문장 — 가운데 조각(accent)은 포인트 단어 시안에서 강조체로 */
  lead: {
    ko: { before: "작업물과 글을, ", accent: "움직이는", after: " 화면으로." },
    en: { before: "Work and writing, on a screen that ", accent: "moves", after: "." },
  },
  /** 첫 화면의 스크린샷 띠 두 줄 · 워드마크 위에 마우스를 올리면 뜨는 사진. 실제 화면 캡처 */
  shots: [
    { src: "/images/about/showcase/home-light.jpg", width: 1440, height: 900 },
    { src: "/images/about/showcase/cms-editor.jpg", width: 1440, height: 609 },
    { src: "/images/about/showcase/posts.jpg", width: 1440, height: 900 },
    { src: "/images/about/showcase/dashboard.jpg", width: 1600, height: 1000 },
    { src: "/images/about/showcase/theme-presets.jpg", width: 1600, height: 941 },
    { src: "/images/about/showcase/about-tour.jpg", width: 1440, height: 900 },
    { src: "/images/about/showcase/home-dark.jpg", width: 1440, height: 900 },
    { src: "/images/about/showcase/cms-posts.jpg", width: 1600, height: 1000 },
    { src: "/images/about/showcase/translate.jpg", width: 1600, height: 832 },
    { src: "/images/about/showcase/admin-settings.jpg", width: 1440, height: 804 },
  ],
};

/* ── 첫 화면 — 목차 · 기술 스택 띠 · 살아 있는 정보 ── */

/** 목차 — 이 페이지의 장. 아직 옮기지 않은 장은 흐리게 */
export const toc = [
  { href: "#facts", label: { ko: "한눈에 보기", en: "At a glance" }, ready: true },
  /* 차례 — 무엇인지 → 직접 해 보는 기능 → AI → 구조 → 설계 결정 · 보안 → 디자인 → 코드 → 만든 과정(중요한 것부터) */
  { href: "#features", label: { ko: "기능", en: "Features" }, ready: true },
  { href: "#ai", label: { ko: "AI", en: "AI" }, ready: true },
  { href: "#architecture", label: { ko: "구조", en: "Architecture" }, ready: true },
  { href: "#decisions", label: { ko: "설계 결정 · 보안", en: "Decisions · Security" }, ready: true },
  { href: "#design", label: { ko: "디자인", en: "Design" }, ready: true },
  { href: "#code", label: { ko: "코드", en: "Code" }, ready: true },
  { href: "#making", label: { ko: "만든 과정", en: "Making of" }, ready: true },
  { href: "#trust", label: { ko: "신뢰", en: "Trust" }, ready: true },
  { href: "#faq", label: { ko: "자주 묻는 질문", en: "FAQ" }, ready: true },
] as { href: string | null; label: L10n; ready: boolean }[];

export const live = {
  /** 도시를 모를 때 */
  here: { ko: "여기", en: "Here" } satisfies L10n,
  /** 날씨 이름 — lib/weather/sky 의 WeatherKind */
  weather: {
    clear: { ko: "맑음", en: "Clear" },
    cloudy: { ko: "흐림", en: "Cloudy" },
    fog: { ko: "안개", en: "Fog" },
    rain: { ko: "비", en: "Rain" },
    snow: { ko: "눈", en: "Snow" },
    storm: { ko: "뇌우", en: "Thunderstorm" },
  } satisfies Record<string, L10n>,
  latest: { ko: "최근 글", en: "Latest" } satisfies L10n,
  posts: { ko: "글", en: "Posts" } satisfies L10n,
  works: { ko: "작업물", en: "Works" } satisfies L10n,
};

export const facts = {
  eyebrow: { ko: "한눈에 보기", en: "At a glance" } satisfies L10n,
  title: {
    ko: "혼자 만들고, 혼자 운영합니다.",
    en: "Built and run by one person.",
  } satisfies L10n,
  items: [
    { value: "98", unit: "", label: { ko: "Lighthouse 성능", en: "Lighthouse performance" } },
    /* 라우트 수는 생성 파일(scripts/gen-api-map)에서 — 손으로 적으면 라우트가 늘 때마다 어긋났다 */
    { value: String(apiMap.routeFiles), unit: "", label: { ko: "API 라우트", en: "API routes" } },
    { value: "4", unit: { ko: "단계", en: "tiers" }, label: { ko: "권한 — DB 규칙으로 판정", en: "Roles — enforced by DB rules" } },
    { value: "1,195", unit: "", label: { ko: "단위 테스트", en: "Unit tests" } },
    { value: "70", unit: { ko: "건", en: "" }, label: { ko: "디자인 결정 기록", en: "Design decision records" } },
    { value: "6", unit: { ko: "가지", en: "" }, label: { ko: "작업물 레이아웃", en: "Work layouts" } },
  ] as { value: string; unit: string | L10n; label: L10n }[],
};

