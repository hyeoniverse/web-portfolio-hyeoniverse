import type { BannerLayout } from "@/app/posts/_components/PostsBanner/PostsBanner";
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
  { name: "--spacing-zero", value: "0" },
  { name: "--spacing-2xs", value: "0.25rem" },
  { name: "--spacing-xs", value: "0.5rem" },
  { name: "--spacing-sm", value: "0.75rem" },
  { name: "--spacing-md", value: "1rem" },
  { name: "--spacing-lg", value: "1.25rem" },
  { name: "--spacing-xl", value: "1.5rem" },
  { name: "--spacing-2xl", value: "2rem" },
  { name: "--spacing-3xl", value: "3rem" },
  { name: "--spacing-4xl", value: "4rem" },
  { name: "--spacing-5xl", value: "6rem" },
  { name: "--spacing-6xl", value: "8rem" },
];

// ─── Radius Data ───
export const radiusScale = [
  { name: "2xs", var: "--radius-2xs", value: "2px" },
  { name: "xs", var: "--radius-xs", value: "4px" },
  { name: "sm", var: "--radius-sm", value: "6px" },
  { name: "md", var: "--radius-md", value: "8px" },
  { name: "lg", var: "--radius-lg", value: "12px" },
  { name: "xl", var: "--radius-xl", value: "16px" },
  { name: "2xl", var: "--radius-2xl", value: "24px" },
  { name: "3xl", var: "--radius-3xl", value: "28px" },
  { name: "4xl", var: "--radius-4xl", value: "32px" },
  { name: "5xl", var: "--radius-5xl", value: "36px" },
  { name: "6xl", var: "--radius-6xl", value: "42px" },
  { name: "capsule", var: "--radius-capsule", value: "9999px" },
  { name: "circle", var: "--radius-circle", value: "50%" },
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
  { name: "--z-below", value: "-1", label: "Background" },
  { name: "--z-content", value: "10", label: "Page Content" },
  { name: "--z-nav", value: "100", label: "Navigation" },
  { name: "--z-float", value: "200", label: "Floating UI" },
  { name: "--z-dropdown", value: "500", label: "Dropdown / Popover" },
  { name: "--z-tooltip", value: "700", label: "Tooltip" },
  { name: "--z-overlay", value: "9000", label: "Overlay / Drawer" },
  { name: "--z-top", value: "10000", label: "Cursor / Transition" },
];

// ─── Typography Data ───
export const typoVariants = [
  "h1", "h2", "h3", "h4", "h5", "h6", "body1", "body2", "caption", "overline",
] as const;

export const typoColors = ["primary", "secondary", "tertiary", "muted", "accent"] as const;

// ─── TOC Data ───
export const tocSections = [
  { id: "principles", label: "Principles" },
  { id: "colors", label: "Colors" },
  { id: "alpha", label: "Alpha" },
  { id: "semantic", label: "Semantic" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing" },
  { id: "radius", label: "Radius" },
  { id: "shadows", label: "Shadows" },
  { id: "motion", label: "Motion" },
  { id: "z-index", label: "Z-Index" },
  { id: "threejs", label: "3D (Three.js)" },
  { id: "components", label: "Components" },
  { id: "tooltip", label: "Tooltip" },
  { id: "editor", label: "Editor" },
  { id: "banner", label: "Banner Layouts" },
];

// ─── Banner mock data ───
export const BANNER_LAYOUTS: BannerLayout[] = ["fullwidth", "split", "cards", "ticker"];
export const BANNER_LAYOUT_LABELS: Record<BannerLayout, { ko: string; en: string }> = {
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
