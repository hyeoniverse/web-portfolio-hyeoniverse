import type { OverviewStat, StructureItem, UserFlow } from "./types";

export const projectOverview = {
  description: {
    ko: "Next.js 15 App Router 기반 풀스택 포트폴리오. AI 페어 프로그래밍으로 6일 만에 완성. GSAP/Framer Motion 애니메이션, Lenis 무한 스크롤, Supabase 블로그·좋아요·댓글 시스템 등을 포함합니다.",
    en: "Full-stack portfolio built on Next.js 15 App Router, completed in 6 days with AI pair programming. Features GSAP/Framer Motion animations, Lenis infinite scroll, and Supabase-powered blog with likes & comments.",
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
  { path: "admin/", description: { ko: "어드민 대시보드 — 포스트/작업물 CRUD, 설정(콘텐츠·프로필·계정)", en: "Admin dashboard — posts/works CRUD, settings (content, profile, account)" }, indent: 2 },
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
      ko: "첫 방문자의 포트폴리오 탐색 흐름",
      en: "First visitor's portfolio exploration flow",
    },
    steps: [
      {
        label: { ko: "랜딩 페이지", en: "Landing Page" },
        description: { ko: "Hero + Works 프리뷰 + CTA 섹션", en: "Hero + Works preview + CTA sections" },
      },
      {
        label: { ko: "스크롤 탐색", en: "Scroll Explore" },
        description: { ko: "GSAP ScrollTrigger 애니메이션으로 각 섹션 순회", en: "Browse sections via GSAP ScrollTrigger animations" },
      },
      {
        label: { ko: "Works 갤러리", en: "Works Gallery" },
        description: { ko: "Masonry 그리드 + 카테고리 필터", en: "Masonry grid + category filter" },
      },
      {
        label: { ko: "프로젝트 상세", en: "Project Detail" },
        description: { ko: "갤러리 슬라이드 + 기술 스택 + IP 기반 좋아요", en: "Gallery slide + tech stack + IP-based likes" },
      },
      {
        label: { ko: "Contact", en: "Contact" },
        description: { ko: "Drawer + reCAPTCHA + 이메일 발송", en: "Drawer + reCAPTCHA + email send" },
      },
    ],
  },
  {
    title: "Blog",
    description: {
      ko: "블로그 글을 발견하고 읽는 흐름",
      en: "Discovering and reading blog posts",
    },
    steps: [
      {
        label: { ko: "Posts 목록", en: "Posts List" },
        description: { ko: "Featured 캐러셀 + 카테고리별 포스트 목록", en: "Featured carousel + categorized post list" },
      },
      {
        label: { ko: "카테고리 필터", en: "Category Filter" },
        description: { ko: "카테고리 탭 + 시리즈 그룹핑", en: "Category tabs + series grouping" },
      },
      {
        label: { ko: "시리즈 탐색", en: "Series Browse" },
        description: { ko: "시리즈 카드 더보기/접기 토글", en: "Series card expand/collapse toggle" },
      },
      {
        label: { ko: "포스트 읽기", en: "Read Post" },
        description: { ko: "Markdown/Rich Text 렌더링 + TOC", en: "Markdown/Rich Text rendering + TOC" },
      },
      {
        label: { ko: "좋아요 / 댓글", en: "Like / Comment" },
        description: { ko: "IP 좋아요 토글 + 게스트 댓글 (bcrypt)", en: "IP-based like toggle + guest comments (bcrypt)" },
      },
    ],
  },
  {
    title: "Admin",
    description: {
      ko: "관리자 콘텐츠 생성·발행 흐름",
      en: "Admin content creation and publishing flow",
    },
    steps: [
      {
        label: { ko: "로그인", en: "Login" },
        description: { ko: "Supabase Auth 이메일/비밀번호 인증", en: "Supabase Auth email/password authentication" },
      },
      {
        label: { ko: "포스트 작성", en: "Create Post" },
        description: { ko: "Markdown/Rich Text 에디터 + 한/영 이중 언어", en: "Markdown/Rich Text editor + bilingual KO/EN" },
      },
      {
        label: { ko: "커버 이미지", en: "Cover Image" },
        description: { ko: "Unsplash 검색 또는 AI 생성 (스타일 프리셋)", en: "Unsplash search or AI generation (style presets)" },
      },
      {
        label: { ko: "시리즈 연결", en: "Link to Series" },
        description: { ko: "시리즈 선택 시 카테고리 자동 동기화", en: "Category auto-syncs on series selection" },
      },
      {
        label: { ko: "발행", en: "Publish" },
        description: { ko: "필수 항목 검증 → 공개/비공개 토글", en: "Required field validation → publish toggle" },
      },
    ],
  },
  {
    title: "Contact",
    description: {
      ko: "방문자가 연락처를 남기는 흐름",
      en: "Visitor contact submission flow",
    },
    steps: [
      {
        label: { ko: "Contact 버튼", en: "Contact Button" },
        description: { ko: "하단 CTA 또는 Navigation 링크", en: "Bottom CTA or Navigation link" },
      },
      {
        label: { ko: "Drawer 열림", en: "Drawer Opens" },
        description: { ko: "슬라이드-인 오버레이 Drawer", en: "Slide-in overlay drawer" },
      },
      {
        label: { ko: "폼 작성", en: "Fill Form" },
        description: { ko: "이름, 이메일, 메시지 입력", en: "Name, email, and message inputs" },
      },
      {
        label: { ko: "reCAPTCHA 인증", en: "reCAPTCHA" },
        description: { ko: "Google reCAPTCHA v2 봇 방지", en: "Google reCAPTCHA v2 bot prevention" },
      },
      {
        label: { ko: "이메일 발송", en: "Email Sent" },
        description: { ko: "Resend API → 성공 피드백 + Drawer 닫기", en: "Resend API → success feedback + close drawer" },
      },
    ],
  },
  {
    title: "Theme",
    description: {
      ko: "다크/라이트 테마 및 언어 전환",
      en: "Dark/Light theme and language switching",
    },
    steps: [
      {
        label: { ko: "토글 클릭", en: "Toggle Click" },
        description: { ko: "Navigation 내 테마/언어 토글 버튼", en: "Theme/language toggle in Navigation" },
      },
      {
        label: { ko: "CSS Variables 갱신", en: "CSS Vars Update" },
        description: { ko: "html[data-theme] 속성 변경 → 토큰 전환", en: "html[data-theme] attribute change → token swap" },
      },
      {
        label: { ko: "쿠키 저장", en: "Cookie Persist" },
        description: { ko: "next-themes 쿠키로 설정 유지", en: "Persist setting via next-themes cookie" },
      },
      {
        label: { ko: "전체 UI 반영", en: "Full UI Update" },
        description: { ko: "0.3s transition으로 모든 컴포넌트 테마 전환", en: "0.3s transition across all components" },
      },
    ],
  },
  {
    title: "About",
    description: {
      ko: "이 페이지 — 가로 스크롤로 기술 문서 탐색",
      en: "This page — explore tech docs via horizontal scroll",
    },
    steps: [
      {
        label: { ko: "가로 스크롤 시작", en: "Start H-Scroll" },
        description: { ko: "GSAP ScrollTrigger가 세로 스크롤을 가로로 변환", en: "GSAP ScrollTrigger converts vertical to horizontal scroll" },
      },
      {
        label: { ko: "14개 패널 순회", en: "Browse 14 Panels" },
        description: { ko: "각 패널별 기술 문서 · 코드 · 인터랙티브 요소", en: "Per-panel tech docs, code, and interactive elements" },
      },
      {
        label: { ko: "하단 Nav 바로가기", en: "Nav Shortcuts" },
        description: { ko: "Spring 인디케이터 + 패널 직접 이동", en: "Spring indicator + direct panel navigation" },
      },
      {
        label: { ko: "기술 문서 탐색", en: "Explore Docs" },
        description: { ko: "ERD, 코드 하이라이트, 트러블슈팅 등", en: "ERD, code highlights, troubleshooting, etc." },
      },
    ],
  },
];
