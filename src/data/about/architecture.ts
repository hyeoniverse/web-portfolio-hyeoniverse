import type { OverviewStat, StructureItem, UserFlow } from "./types";

export const projectOverview = {
  description: {
    ko: "이 포트폴리오는 Next.js 15 App Router 기반으로, 2025.02.05 ~ 02.10 총 6일 만에 완성되었습니다. AI 페어 프로그래밍(Vibe Coding)을 적극 활용하여 GSAP/Framer Motion 스크롤 애니메이션, Lenis 무한 루프 스크롤, CSS Variables 디자인 토큰, 한/영 이중 언어 지원 등 기술적 도전을 단기간에 구현할 수 있었습니다. 이후 Supabase 기반 블로그·좋아요·댓글 시스템을 추가하여 풀스택 포트폴리오로 확장했습니다.",
    en: "This portfolio was built on Next.js 15 App Router and completed in just 6 days (2025.02.05 – 02.10). By leveraging AI pair programming (Vibe Coding), complex frontend challenges — GSAP/Framer Motion scroll animations, Lenis infinite loop scroll, CSS Variables design tokens, and bilingual i18n — were implemented in a compressed timeline. Later expanded into a full-stack portfolio with Supabase-powered blog, likes, and comment systems.",
  },
  highlights: [
    "Next.js 15",
    "GSAP ScrollTrigger",
    "Framer Motion",
    "Lenis Smooth Scroll",
    "Three.js (R3F)",
    "CSS Variables",
    "Supabase",
    "i18n (KO/EN)",
    "IP-Based Likes",
    "Dark/Light Theme",
  ],
  stats: [
    { value: "6 Days", label: { ko: "개발 기간\n(2/5 – 2/10)", en: "Dev Period\n(2/5 – 2/10)" } },
    { value: "50+", label: { ko: "컴포넌트", en: "Components" } },
    { value: "15+", label: { ko: "커스텀 훅", en: "Custom Hooks" } },
    { value: "98", label: { ko: "Lighthouse", en: "Lighthouse" } },
    { value: "2", label: { ko: "언어 지원", en: "Languages" } },
    { value: "15+", label: { ko: "라이브러리", en: "Libraries" } },
  ] as OverviewStat[],
};

export const projectStructure: StructureItem[] = [
  { path: "src/", description: { ko: "소스 코드 루트", en: "Source code root" }, indent: 0 },
  { path: "app/", description: { ko: "Next.js App Router — 페이지 & API 라우트", en: "Next.js App Router — pages & API routes" }, indent: 1 },
  { path: "(home)/", description: { ko: "랜딩 페이지 — Hero, About, Works, CTA 등 7개 섹션", en: "Landing page — 7 sections: Hero, About, Works, CTA, etc." }, indent: 2 },
  { path: "works/", description: { ko: "프로젝트 갤러리 + [id] 상세 페이지 (좋아요)", en: "Project gallery + [id] detail pages (likes)" }, indent: 2 },
  { path: "posts/", description: { ko: "블로그 목록 + [slug] 상세 (좋아요·댓글)", en: "Blog list + [slug] detail (likes & comments)" }, indent: 2 },
  { path: "profile/", description: { ko: "프로필 페이지 — 소개 & 철학", en: "Profile page — introduction & philosophy" }, indent: 2 },
  { path: "about/", description: { ko: "이 페이지 — 개발 과정 & 기술 문서", en: "This page — development process & technical docs" }, indent: 2 },
  { path: "admin/", description: { ko: "어드민 대시보드 — 포스트 CRUD, 설정", en: "Admin dashboard — post CRUD, settings" }, indent: 2 },
  { path: "api/", description: { ko: "API 라우트 — posts, comments, likes, contact, cover, admin", en: "API routes — posts, comments, likes, contact, cover, admin" }, indent: 2 },
  { path: "components/", description: { ko: "재사용 가능한 UI 컴포넌트 라이브러리", en: "Reusable UI component library" }, indent: 1 },
  { path: "layout/", description: { ko: "Navigation, Footer, ContactDrawer, DetailLayout", en: "Navigation, Footer, ContactDrawer, DetailLayout" }, indent: 2 },
  { path: "effects/", description: { ko: "StaggerText, Parallax, CursorTrail, FontMorph, ScrollTorus", en: "StaggerText, Parallax, CursorTrail, FontMorph, ScrollTorus" }, indent: 2 },
  { path: "ui/", description: { ko: "Button, Modal, Typography, OptimizedImage", en: "Button, Modal, Typography, OptimizedImage" }, indent: 2 },
  { path: "posts/", description: { ko: "PostEditor, MarkdownRenderer, CoverImagePicker", en: "PostEditor, MarkdownRenderer, CoverImagePicker" }, indent: 2 },
  { path: "admin/", description: { ko: "어드민 패널 컴포넌트", en: "Admin panel components" }, indent: 2 },
  { path: "hooks/", description: { ko: "15개 커스텀 훅 — useMagnetic, useScrollVelocity, useHorizontalScroll 등", en: "15 custom hooks — useMagnetic, useScrollVelocity, useHorizontalScroll, etc." }, indent: 1 },
  { path: "lib/supabase/", description: { ko: "Supabase 클라이언트 — browser, server, admin (3-tier)", en: "Supabase clients — browser, server, admin (3-tier)" }, indent: 1 },
  { path: "stores/", description: { ko: "Zustand 상태 관리 — app, project, modal, contact, transition", en: "Zustand state management — app, project, modal, contact, transition" }, indent: 1 },
  { path: "providers/", description: { ko: "Context Providers — Theme, Language, Lenis, reCAPTCHA, SiteConfig", en: "Context Providers — Theme, Language, Lenis, reCAPTCHA, SiteConfig" }, indent: 1 },
  { path: "types/", description: { ko: "TypeScript 타입 정의 — Post, Comment 등", en: "TypeScript type definitions — Post, Comment, etc." }, indent: 1 },
  { path: "config/", description: { ko: "사이트 설정 — site.config.ts", en: "Site configuration — site.config.ts" }, indent: 1 },
  { path: "animations/", description: { ko: "Framer Motion 프리셋 — fade, slide, scale, spring 등 7개 카테고리", en: "Framer Motion presets — 7 categories: fade, slide, scale, spring, etc." }, indent: 1 },
  { path: "styles/", description: { ko: "디자인 토큰, 베이스 스타일, 애니메이션, 유틸리티", en: "Design tokens, base styles, animations, utilities" }, indent: 1 },
  { path: "data/", description: { ko: "정적 데이터 — projects, services, profile, about", en: "Static data — projects, services, profile, about" }, indent: 1 },
  { path: "locales/", description: { ko: "i18n 번역 파일 — ko.json, en.json", en: "i18n translation files — ko.json, en.json" }, indent: 1 },
];

export const userFlows: UserFlow[] = [
  {
    title: "Visitor",
    description: {
      ko: "방문자가 포트폴리오를 탐색하고 좋아요·댓글을 남기는 흐름",
      en: "How visitors browse the portfolio and interact with likes & comments",
    },
    steps: [
      { label: { ko: "Home", en: "Home" } },
      { label: { ko: "Works 갤러리", en: "Works Gallery" } },
      { label: { ko: "Work 상세 + 좋아요", en: "Work Detail + Like" } },
      { label: { ko: "Posts 목록", en: "Posts List" } },
      { label: { ko: "Post 상세 + 좋아요/댓글", en: "Post Detail + Like/Comment" } },
    ],
  },
  {
    title: "Admin",
    description: {
      ko: "관리자가 콘텐츠를 생성·관리하는 흐름",
      en: "How admins create and manage content",
    },
    steps: [
      { label: { ko: "/admin 접속", en: "/admin URL" } },
      { label: { ko: "Supabase Auth 로그인", en: "Supabase Auth Login" } },
      { label: { ko: "대시보드", en: "Dashboard" } },
      { label: { ko: "포스트 작성/편집", en: "Create/Edit Post" } },
      { label: { ko: "발행", en: "Publish" } },
    ],
  },
  {
    title: "About",
    description: {
      ko: "이 페이지의 탐색 흐름 — 가로 스크롤로 기술 문서 순회",
      en: "Navigating this page — horizontal scroll through technical docs",
    },
    steps: [
      { label: { ko: "가로 스크롤 시작", en: "Start Horizontal Scroll" } },
      { label: { ko: "12개 패널 순회", en: "Browse 12 Panels" } },
      { label: { ko: "기술 문서 탐색", en: "Explore Tech Docs" } },
      { label: { ko: "하단 Nav로 이동", en: "Jump via Bottom Nav" } },
    ],
  },
];
