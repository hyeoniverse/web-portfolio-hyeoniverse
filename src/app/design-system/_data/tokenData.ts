import type { BannerLayout } from "@/app/posts/_components/PostsBanner/PostsBanner";
import type { LocalizedText } from "@/types/common";
import type { Post } from "@/types/post";

// ─── Color Data ───
export const brandColors = [
  { name: "accent", var: "--color-accent" },
  { name: "accent-dark", var: "--color-accent-dark" },
  { name: "accent-light", var: "--color-accent-light" },
];

export const neutralScale = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 999];

export const alphaSteps = [5, 10, 15, 20, 30, 50, 70, 80, 90, 95, 100];

export const semanticColors = [
  { name: "--text-primary", ref: "neutral-900" },
  { name: "--text-secondary", ref: "neutral-800" },
  { name: "--text-tertiary", ref: "neutral-600" },
  { name: "--text-muted", ref: "neutral-500" },
  { name: "--text-accent", ref: "accent" },
  { name: "--text-inverse", ref: "neutral-50" },
  { name: "--bg-primary", ref: "neutral-50" },
  { name: "--bg-inverse", ref: "neutral-950" },
  { name: "--bg-accent-solid", ref: "accent" },
];

// ─── Spacing Data ───
export const spacingScale = [
  { name: "--spacing-0", value: "0" },
  { name: "--spacing-1", value: "1px" },
  { name: "--spacing-2", value: "0.125rem" },
  { name: "--spacing-4", value: "0.25rem" },
  { name: "--spacing-8", value: "0.5rem" },
  { name: "--spacing-12", value: "0.75rem" },
  { name: "--spacing-16", value: "1rem" },
  { name: "--spacing-20", value: "1.25rem" },
  { name: "--spacing-24", value: "1.5rem" },
  { name: "--spacing-32", value: "2rem" },
  { name: "--spacing-40", value: "2.5rem" },
  { name: "--spacing-48", value: "3rem" },
  { name: "--spacing-64", value: "4rem" },
  { name: "--spacing-80", value: "5rem" },
  { name: "--spacing-96", value: "6rem" },
  { name: "--spacing-112", value: "7rem" },
  { name: "--spacing-128", value: "8rem" },
];

// ─── Radius Data ───
export const radiusScale = [
  /* 눈금 — 이름이 px 값이다(docs/design-system.md 2-3-2). 지금 컴포넌트가 고르는 것은 full · circle · 24,
     나머지는 "각진 것 자체가 의미"인 자리(체크박스 등) 전용. 역할 토큰으로 옮기는 중(3.5-1) */
  { name: "full", var: "--radius-full", value: "9999px", note: "알약·칩·행 하이라이트" },
  { name: "circle", var: "--radius-circle", value: "50%", note: "정원 — full 로 옮기는 중" },
  { name: "24", var: "--radius-24", value: "24px", note: "면 있는 것" },
  { name: "16", var: "--radius-16", value: "16px", note: "동심원 안쪽" },
  { name: "12", var: "--radius-12", value: "12px", note: "동심원 안쪽" },
  { name: "8", var: "--radius-8", value: "8px", note: "예외 전용" },
  { name: "6", var: "--radius-6", value: "6px", note: "예외 전용" },
  { name: "4", var: "--radius-4", value: "4px", note: "예외 전용" },
  { name: "2", var: "--radius-2", value: "2px", note: "예외 전용" },
];

// ─── Grid Templates Data ───
// 등분 컬럼 토큰. minmax(0,1fr) 로 자식이 트랙을 밀어 grid blowout 나는 것 방지 (overflow-safe)
export const gridColsScale = [
  { name: "--grid-columns-2", cols: 2 },
  { name: "--grid-columns-3", cols: 3 },
  { name: "--grid-columns-4", cols: 4 },
  { name: "--grid-columns-5", cols: 5 },
  { name: "--grid-columns-7", cols: 7 },
];

// ─── Shadow Data ───
export const shadowScale = [
  "--shadow-xs",
  "--shadow-sm",
  "--shadow-md",
  "--shadow-lg",
  "--shadow-xl",
  "--shadow-2xl",
];

// ─── Motion Data ───
export const durations = [
  { name: "--duration-instant", value: "0.1s" },
  { name: "--duration-fast", value: "0.15s" },
  { name: "--duration-base", value: "0.3s" },
  { name: "--duration-moderate", value: "0.35s" },
  { name: "--duration-slow", value: "0.5s" },
  { name: "--duration-slower", value: "0.8s" },
  { name: "--duration-slowest", value: "1.5s" },
];

export const easings = [
  { name: "--ease-bounce", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { name: "--ease-material", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
  { name: "--ease-out-expo", value: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { name: "--ease-in-out", value: "cubic-bezier(0.25, 0.1, 0.25, 1)" },
];

// ─── Z-index Data ───
export const zScale = [
  { name: "--z-index-below", value: "-1", label: "Background" },
  { name: "--z-index-content", value: "10", label: "Page Content" },
  { name: "--z-index-nav", value: "100", label: "Navigation" },
  { name: "--z-index-float", value: "200", label: "Floating UI" },
  { name: "--z-index-dropdown", value: "500", label: "Dropdown / Popover" },
  { name: "--z-index-tooltip", value: "700", label: "Tooltip" },
  { name: "--z-index-overlay", value: "9000", label: "Overlay / Drawer" },
  { name: "--z-index-top", value: "10000", label: "Cursor / Transition" },
];

// ─── Typography Data ───
export const typoVariants = [
  "h1", "h2", "h3", "h4", "h5", "h6", "body1", "body2", "caption", "overline",
] as const;

export const typoColors = ["primary", "secondary", "tertiary", "muted", "accent"] as const;

// ─── TOC Data ───
/** 목차 — 구역과 그 아래 소제목. 소제목 id 는 해당 제목 요소의 id 와 같아야 한다. */
export const tocSections: { id: string; label: string; subs?: { id: string; label: string }[] }[] = [
  {
    id: "principles",
    label: "Principles",
    subs: [
      { id: "principles-tiers", label: "3-Tier" },
      { id: "principles-ssot", label: "Single Source" },
      { id: "principles-theme", label: "Semantic Theme" },
      { id: "principles-no-raw", label: "No Raw Values" },
    ],
  },
  { id: "colors", label: "Colors" },
  { id: "alpha", label: "Alpha" },
  { id: "semantic", label: "Semantic" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing" },
  { id: "radius", label: "Radius" },
  { id: "grid", label: "Grid" },
  { id: "shadows", label: "Shadows" },
  { id: "motion", label: "Motion" },
  { id: "z-index", label: "Z-Index" },
  {
    id: "threejs",
    label: "3D (Three.js)",
    subs: [
      { id: "threejs-coffee", label: "Coffee Cup" },
      { id: "threejs-torus", label: "Scroll Torus" },
      { id: "threejs-bunny", label: "Bunny" },
    ],
  },
  {
    id: "components",
    label: "Components",
    subs: [
      { id: "components-layout", label: "Layout" },
      { id: "components-buttons", label: "Buttons" },
      { id: "components-toggles", label: "Toggles" },
      { id: "components-inputs", label: "Inputs" },
      { id: "components-pickers", label: "Pickers" },
      { id: "components-chips", label: "Chips" },
      { id: "components-overlays", label: "Overlays" },
      { id: "components-feedback", label: "Feedback" },
    ],
  },
  {
    id: "tooltip",
    label: "Tooltip",
    subs: [
      { id: "tooltip-basic", label: "Basic" },
      { id: "tooltip-translation", label: "Translation" },
    ],
  },
  { id: "editor", label: "Editor" },
  { id: "banner", label: "Banner Layouts" },
];

// ─── Banner mock data ───
export const BANNER_LAYOUTS: BannerLayout[] = ["fullwidth", "split", "cards", "ticker"];
export const BANNER_LAYOUT_LABELS: Record<BannerLayout, LocalizedText> = {
  fullwidth: { ko: "Fullwidth — 풀 와이드 캐러셀 (Default / Cylinder)", en: "Fullwidth — Full-width Carousel (Default / Cylinder)" },
  split: { ko: "Split — 이미지 세로 슬라이드 + 텍스트 fade (무한 루프)", en: "Split — Vertical Image Slide + Text Fade (Infinite Loop)" },
  cards: { ko: "Cards — 중앙 포커스 카드", en: "Cards — Center-focus Card Stack" },
  ticker: { ko: "Ticker — 세로 슬라이드 바 (무한 루프)", en: "Ticker — Vertical Sliding Bar (Infinite Loop)" },
};

const MOCK_POST: Post = {
  id: "demo-1",
  title: "비주얼 스토리텔링의 예술",
  slug: "demo",
  content: "",
  content_type: "markdown",
  excerpt: "디자인, 사진, 내러티브가 만나는 지점을 현대 디지털 렌즈로 탐구합니다.",
  cover_image: "https://picsum.photos/seed/ds-banner-1/1200/600",
  tags: [],
  category: "Design",
  is_pinned: true,
  published: true,
  language: "ko",
  view_count: 0,
  like_count: 0,
  created_at: "",
  updated_at: "",
  title_en: "The Art of Visual Storytelling",
  content_en: "",
  excerpt_en: "Exploring the intersection of design, photography, and narrative through a modern digital lens.",
  post_number: 0,
  series_id: null,
  series_order: 0,
  summary_ko: "",
  summary_en: "",
  github_url: "",
};

export const MOCK_POSTS: Post[] = [
  MOCK_POST,
  { ...MOCK_POST, id: "demo-2", title: "모던 인터페이스 구축하기", title_en: "Building Modern Interfaces", category: "Frontend", excerpt: "컴포넌트 아키텍처와 디자인 시스템에 대한 깊은 탐구.", excerpt_en: "A deep dive into component architecture and design systems.", cover_image: "https://picsum.photos/seed/ds-banner-2/1200/600" },
  { ...MOCK_POST, id: "demo-3", title: "대규모 성능 최적화", title_en: "Performance at Scale", category: "DevOps", excerpt: "높은 트래픽 환경에서 웹 애플리케이션을 최적화하는 기법.", excerpt_en: "Techniques for optimizing web applications under heavy load.", cover_image: "https://picsum.photos/seed/ds-banner-3/1200/600" },
];
