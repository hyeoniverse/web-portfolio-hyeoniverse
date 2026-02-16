import type { OverviewStat, StructureItem } from "./types";

export const projectOverview = {
  description: {
    ko: "이 포트폴리오는 Next.js 15 App Router 기반으로, 2025.02.05 ~ 02.10 총 6일 만에 완성되었습니다. AI 페어 프로그래밍(Vibe Coding)을 적극 활용하여 GSAP/Framer Motion 스크롤 애니메이션, Lenis 무한 루프 스크롤, CSS Variables 디자인 토큰, 한/영 이중 언어 지원 등 기술적 도전을 단기간에 구현할 수 있었습니다.",
    en: "This portfolio was built on Next.js 15 App Router and completed in just 6 days (2025.02.05 – 02.10). By leveraging AI pair programming (Vibe Coding), complex frontend challenges — GSAP/Framer Motion scroll animations, Lenis infinite loop scroll, CSS Variables design tokens, and bilingual i18n — were implemented in a compressed timeline.",
  },
  highlights: [
    "Next.js 15",
    "GSAP ScrollTrigger",
    "Framer Motion",
    "Lenis Smooth Scroll",
    "Three.js (R3F)",
    "CSS Variables",
    "i18n (KO/EN)",
    "AI Pair Programming",
    "Dark/Light Theme",
  ],
  stats: [
    { value: "6 Days", label: { ko: "개발 기간\n(2/5 – 2/10)", en: "Dev Period\n(2/5 – 2/10)" } },
    { value: "40+", label: { ko: "컴포넌트", en: "Components" } },
    { value: "12+", label: { ko: "커스텀 훅", en: "Custom Hooks" } },
    { value: "98", label: { ko: "Lighthouse", en: "Lighthouse" } },
    { value: "2", label: { ko: "언어 지원", en: "Languages" } },
    { value: "10+", label: { ko: "라이브러리", en: "Libraries" } },
  ] as OverviewStat[],
};

export const projectStructure: StructureItem[] = [
  { path: "src/", description: { ko: "소스 코드 루트", en: "Source code root" }, indent: 0 },
  { path: "app/", description: { ko: "Next.js App Router — 페이지 & API 라우트", en: "Next.js App Router — pages & API routes" }, indent: 1 },
  { path: "(home)/", description: { ko: "랜딩 페이지 — Hero, About, Works, CTA 등 7개 섹션", en: "Landing page — 7 sections: Hero, About, Works, CTA, etc." }, indent: 2 },
  { path: "works/", description: { ko: "프로젝트 갤러리 + [id] 동적 상세 페이지", en: "Project gallery + [id] dynamic detail pages" }, indent: 2 },
  { path: "about/", description: { ko: "소개 페이지 — 프로필 & 철학", en: "About page — profile & philosophy" }, indent: 2 },
  { path: "webflow/", description: { ko: "이 페이지 — 개발 과정 & 기술 문서", en: "This page — development process & technical docs" }, indent: 2 },
  { path: "api/contact/", description: { ko: "이메일 전송 API 엔드포인트", en: "Email sending API endpoint" }, indent: 2 },
  { path: "components/", description: { ko: "재사용 가능한 UI 컴포넌트 라이브러리", en: "Reusable UI component library" }, indent: 1 },
  { path: "layout/", description: { ko: "Navigation, Footer, ContactDrawer, LoadingScreen", en: "Navigation, Footer, ContactDrawer, LoadingScreen" }, indent: 2 },
  { path: "effects/", description: { ko: "StaggerText, Parallax, CursorTrail, FontMorph, ScrollTorus", en: "StaggerText, Parallax, CursorTrail, FontMorph, ScrollTorus" }, indent: 2 },
  { path: "ui/", description: { ko: "Button, Modal, Typography, OptimizedImage", en: "Button, Modal, Typography, OptimizedImage" }, indent: 2 },
  { path: "hooks/", description: { ko: "12개 커스텀 훅 — useMagnetic, useScrollVelocity 등", en: "12 custom hooks — useMagnetic, useScrollVelocity, etc." }, indent: 1 },
  { path: "stores/", description: { ko: "Zustand 상태 관리 — app, project, modal, contact, transition", en: "Zustand state management — app, project, modal, contact, transition" }, indent: 1 },
  { path: "providers/", description: { ko: "Context Providers — Theme, Language, Lenis, reCAPTCHA", en: "Context Providers — Theme, Language, Lenis, reCAPTCHA" }, indent: 1 },
  { path: "animations/", description: { ko: "Framer Motion 프리셋 — fade, slide, scale, spring 등 7개 카테고리", en: "Framer Motion presets — 7 categories: fade, slide, scale, spring, etc." }, indent: 1 },
  { path: "styles/globals/", description: { ko: "CSS 디자인 토큰, 베이스 스타일, 애니메이션, 유틸리티", en: "CSS design tokens, base styles, animations, utilities" }, indent: 1 },
  { path: "data/", description: { ko: "정적 데이터 — projects, services, about, webflow", en: "Static data — projects, services, about, webflow" }, indent: 1 },
  { path: "locales/", description: { ko: "i18n 번역 파일 — ko.json, en.json", en: "i18n translation files — ko.json, en.json" }, indent: 1 },
];
