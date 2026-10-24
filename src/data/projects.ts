// 작품 페이지 프로젝트 데이터

import type { LocalizedText } from "@/types/common";
export type { LocalizedText };

export type CardSize = "large" | "small" | "medium" | "tall" | "wide";

/**
 * 갤러리 한 장의 음성(#슬라이드 음성).
 *
 * 그림 주소를 열쇠로 둔다 — 차례를 바꾸거나 한 장을 지워도 음성이 다른 장으로 밀리지 않는다.
 * 대본만 있고 음성 파일이 없으면 읽는 사람의 브라우저가 대본을 읽는다(무료 대체).
 */
export interface GalleryNote {
  /** 읽을 대본 — PPTX 를 올리면 발표자 노트로 채워지고, 편집 화면에서 고칠 수 있다 */
  script?: string;
  /** 음성 파일 — TTS 로 만든 것이나 직접 올린 녹음 */
  audio?: string;
  /** audio 가 어디서 왔는지 — 녹음이면 대본을 고쳐도 "다시 만들기" 를 권하지 않는다 */
  audioSource?: "tts" | "recorded";
  /** TTS 로 만들 때 쓴 대본 — 지금 대본과 다르면 음성이 낡았다고 알린다 */
  audioScript?: string;
  /** TTS 로 만들 때 실제로 쓴 목소리("제공자:성별", lib/ttsVoices) — 고른 제공자가 실패해 넘어갔으면 다를 수 있다 */
  audioVoice?: string;
  /** 화면에만 쓰는 자막 줄 — "다른 언어로 읽기"가 원문 자막 줄(lib/galleryCaptions)을 같은 순번으로 번역해 끼운다.
   *  저장하지 않는다. 줄 수가 원문과 다르면 쓰지 않는다 */
  captions?: string[];
  /** 영어 대본·음성 — 위 칸들이 한국어(기본)이고, 영어는 같은 모양으로 여기에 둔다. 비어 있으면 영어 화면은 한국어를 쓴다 */
  en?: Omit<GalleryNote, "en">;
}
export type GalleryNotes = Record<string, GalleryNote>;

export interface Project {
  id: string;
  /** URL slug — DB 의 works.slug 와 동일. 정적 fallback 에선 optional (없으면 id fallback) */
  slug?: string;
  number: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  /** legacy 단일 카테고리 — categories[0] 미러. 신규 호출부는 categories 사용 권장 */
  category: LocalizedText;
  /** 결과물 형태 (multi) — 웹앱·라이브러리·도구 등 (DB categories_ko/en) */
  categories?: { ko: string[]; en: string[] };
  /** 제작 동기 — 토이/클론/사이드/학교/공모전/오픈소스/스터디 (DB nature_ko/en) */
  nature?: LocalizedText;
  year: string;
  description: LocalizedText;
  role: LocalizedText;
  tech: string[];
  image: string;
  size: CardSize;
  /** 랜딩 페이지 데이터(works.landing, lib/workLanding 로 모양을 맞춘다) */
  landing?: unknown;
  liveUrl?: string;
  githubUrl?: string;
}

export const projects: Project[] = [
  {
    id: "1",
    number: "01",
    title: { ko: "Oval Portfolio", en: "Oval Portfolio" },
    subtitle: { ko: "직접 설계하고 구현한 풀스택 포트폴리오", en: "Full-Stack Portfolio, Designed & Built from Scratch" },
    category: { ko: "풀스택 / 개인 프로젝트", en: "Full-Stack / Personal Project" },
    year: "2025",
    description: {
      ko: "Next.js 15 App Router 기반 포트폴리오 + 자체 Admin CMS. 3-layer 디자인 토큰, GSAP 수평 스크롤, Supabase 인증/DB까지 직접 구축.",
      en: "Portfolio site + custom Admin CMS built on Next.js 15 App Router. 3-layer design tokens, GSAP horizontal scroll, Supabase auth & DB — all hand-crafted.",
    },
    role: { ko: "기획 · 디자인 · 풀스택 개발", en: "Planning · Design · Full-Stack Development" },
    tech: ["Next.js 15", "React 19", "TypeScript", "Supabase", "GSAP", "Lenis", "CSS Modules", "Vercel"],
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=700&fit=crop",
    size: "large",
    githubUrl: "https://github.com",
  },
  {
    id: "2",
    number: "02",
    title: { ko: "Syncboard", en: "Syncboard" },
    subtitle: { ko: "충돌 없는 실시간 협업", en: "Conflict-Free Real-Time Collaboration" },
    category: { ko: "웹 앱 / 실시간 협업", en: "Web App / Real-Time Collaboration" },
    year: "2024",
    description: {
      ko: "CRDT 기반 실시간 화이트보드. 다중 커서, 동시 편집, 오프라인 동기화까지 지원하는 협업 도구.",
      en: "CRDT-based real-time whiteboard. Multi-cursor, concurrent editing, and offline sync — a collaboration tool built for teams.",
    },
    role: { ko: "프론트엔드 리드", en: "Frontend Lead" },
    tech: ["React", "TypeScript", "Yjs", "WebSocket", "Canvas API", "Zustand", "Hocuspocus"],
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&h=700&fit=crop",
    size: "small",
  },
  {
    id: "3",
    number: "03",
    title: { ko: "Reflex Commerce", en: "Reflex Commerce" },
    subtitle: { ko: "결제까지 3초, 이탈률 40% 감소", en: "3s to Checkout, 40% Drop-off Reduction" },
    category: { ko: "이커머스 / 성능 최적화", en: "E-Commerce / Performance Optimization" },
    year: "2024",
    description: {
      ko: "기존 이커머스 플랫폼의 프론트엔드를 Next.js로 마이그레이션하고, 검색·결제 플로우를 최적화하여 전환율을 개선한 프로젝트.",
      en: "Migrated a legacy e-commerce frontend to Next.js, optimizing search and checkout flows to measurably improve conversion rates.",
    },
    role: { ko: "프론트엔드 개발", en: "Frontend Development" },
    tech: ["Next.js 14", "TypeScript", "tRPC", "Prisma", "Redis", "Algolia", "Stripe", "Turborepo"],
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=700&fit=crop",
    size: "medium",
  },
  {
    id: "4",
    number: "04",
    title: { ko: "Prism UI", en: "Prism UI" },
    subtitle: { ko: "토큰 기반 디자인 시스템 구축기", en: "Building a Token-Driven Design System" },
    category: { ko: "디자인 시스템 / 오픈소스", en: "Design System / Open Source" },
    year: "2024",
    description: {
      ko: "사내 5개 프로덕트에서 공유하는 React 컴포넌트 라이브러리. Figma Tokens → Style Dictionary → CSS Custom Properties 파이프라인 구축.",
      en: "Shared React component library across 5 internal products. Built a Figma Tokens → Style Dictionary → CSS Custom Properties pipeline.",
    },
    role: { ko: "디자인 시스템 엔지니어", en: "Design System Engineer" },
    tech: ["React", "TypeScript", "Style Dictionary", "Storybook", "Rollup", "CSS Modules", "Chromatic", "Changesets"],
    image: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&h=700&fit=crop",
    size: "tall",
    githubUrl: "https://github.com",
  },
  {
    id: "5",
    number: "05",
    title: { ko: "Docuflow", en: "Docuflow" },
    subtitle: { ko: "PDF 생성 자동화로 수작업 90% 제거", en: "90% Manual Work Eliminated via PDF Automation" },
    category: { ko: "SaaS / 문서 자동화", en: "SaaS / Document Automation" },
    year: "2023",
    description: {
      ko: "계약서, 견적서, 보고서 등 반복 문서를 템플릿 기반으로 자동 생성하는 B2B SaaS. 드래그앤드롭 에디터로 비개발자도 템플릿 제작 가능.",
      en: "B2B SaaS for template-based auto-generation of contracts, quotes, and reports. Drag-and-drop editor enables non-developers to create templates.",
    },
    role: { ko: "프론트엔드 개발", en: "Frontend Development" },
    tech: ["Vue 3", "TypeScript", "Pinia", "Node.js", "PostgreSQL", "Puppeteer", "AWS Lambda", "S3"],
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&h=700&fit=crop",
    size: "wide",
  },
  {
    id: "6",
    number: "06",
    title: { ko: "Gridview Analytics", en: "Gridview Analytics" },
    subtitle: { ko: "10만 행도 버벅임 없이", en: "100K Rows, Zero Lag" },
    category: { ko: "대시보드 / 데이터 시각화", en: "Dashboard / Data Visualization" },
    year: "2023",
    description: {
      ko: "대규모 데이터를 실시간으로 시각화하는 관제 대시보드. 가상 스크롤 테이블, WebSocket 실시간 차트, 커스텀 위젯 레이아웃.",
      en: "Real-time monitoring dashboard for large-scale data visualization. Virtual scroll tables, WebSocket live charts, and customizable widget layouts.",
    },
    role: { ko: "프론트엔드 개발", en: "Frontend Development" },
    tech: ["React", "TypeScript", "D3.js", "TanStack Virtual", "WebSocket", "Go", "ClickHouse", "Docker"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop",
    size: "small",
  },
];

// 상수
export const INFINITE_SCROLL_SETS = 3;
export const LONG_PRESS_DURATION = 800;
export const INITIAL_MARGIN = 50;
