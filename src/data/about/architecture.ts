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
      ko: "처음 방문한 사용자가 포트폴리오를 탐색하고, 프로젝트를 확인한 뒤 연락처를 남기기까지의 전체 여정",
      en: "The complete journey of a first-time visitor exploring the portfolio, viewing projects, and reaching out via contact",
    },
    steps: [
      {
        label: { ko: "랜딩 페이지", en: "Landing Page" },
        description: {
          ko: "사이트에 진입하면 풀스크린 Hero 섹션이 나타나고, 아래로 스크롤하면 대표 프로젝트 프리뷰와 블로그 하이라이트가 순서대로 등장합니다.",
          en: "Upon entering the site, a full-screen Hero section appears. Scrolling down reveals featured project previews and blog highlights in sequence.",
        },
      },
      {
        label: { ko: "스크롤 탐색", en: "Scroll Explore" },
        description: {
          ko: "GSAP ScrollTrigger 기반 스크롤 애니메이션이 각 섹션을 자연스럽게 연결하며, 시차 효과와 페이드-인으로 콘텐츠를 단계적으로 드러냅니다.",
          en: "GSAP ScrollTrigger-based scroll animations seamlessly connect each section, using parallax and fade-in effects to progressively reveal content.",
        },
      },
      {
        label: { ko: "Works 갤러리", en: "Works Gallery" },
        description: {
          ko: "Masonry 레이아웃으로 프로젝트 카드가 배치되고, 상단 카테고리 필터로 원하는 분야의 작업물만 골라볼 수 있습니다.",
          en: "Project cards are arranged in a Masonry layout. Category filters at the top let you narrow down to specific types of work.",
        },
      },
      {
        label: { ko: "프로젝트 상세", en: "Project Detail" },
        description: {
          ko: "프로젝트를 클릭하면 갤러리 슬라이드, 기술 스택 뱃지, 상세 설명이 표시되며 IP 기반 좋아요로 관심을 표현할 수 있습니다.",
          en: "Clicking a project shows a gallery slideshow, tech stack badges, and detailed description. IP-based likes let visitors express interest.",
        },
      },
      {
        label: { ko: "Contact", en: "Contact" },
        description: {
          ko: "하단 CTA 또는 네비게이션 링크를 통해 Contact Drawer가 열리고, reCAPTCHA 인증 후 이메일이 발송됩니다.",
          en: "The Contact Drawer opens via the bottom CTA or navigation link. After reCAPTCHA verification, the email is sent.",
        },
      },
    ],
  },
  {
    title: "Blog",
    description: {
      ko: "블로그에서 관심 있는 주제의 글을 발견하고, 시리즈를 따라가며 읽고, 좋아요와 댓글로 반응하는 흐름",
      en: "Discovering posts by topic, following a series, reading articles, and engaging through likes and comments",
    },
    steps: [
      {
        label: { ko: "Posts 목록", en: "Posts List" },
        description: {
          ko: "Featured 캐러셀에서 주요 글을 빠르게 훑어보고, 아래 카테고리별 목록에서 전체 포스트를 탐색합니다.",
          en: "Quickly browse highlighted posts in the Featured carousel, then explore the full post list organized by category below.",
        },
      },
      {
        label: { ko: "카테고리 필터", en: "Category Filter" },
        description: {
          ko: "Frontend, Backend, DevOps 등 카테고리 탭으로 분야별 필터링이 가능하며, 각 카테고리 안에서 시리즈 단위로 글이 그룹핑됩니다.",
          en: "Filter by categories like Frontend, Backend, or DevOps using tabs. Within each category, posts are grouped by series.",
        },
      },
      {
        label: { ko: "시리즈 탐색", en: "Series Browse" },
        description: {
          ko: "시리즈 카드를 펼치면 해당 시리즈의 모든 글이 순서대로 나타나, 연속 학습이 가능합니다.",
          en: "Expanding a series card reveals all posts in order, enabling sequential learning through related content.",
        },
      },
      {
        label: { ko: "포스트 읽기", en: "Read Post" },
        description: {
          ko: "Markdown 또는 Rich Text로 작성된 본문이 렌더링되고, 우측 TOC(목차)로 긴 글도 빠르게 탐색할 수 있습니다.",
          en: "Content written in Markdown or Rich Text is rendered with a Table of Contents on the side for quick navigation through long articles.",
        },
      },
      {
        label: { ko: "좋아요 / 댓글", en: "Like / Comment" },
        description: {
          ko: "로그인 없이 IP 기반으로 좋아요를 토글할 수 있고, 닉네임과 비밀번호만으로 게스트 댓글을 남길 수 있습니다.",
          en: "Toggle likes without login via IP-based tracking. Leave guest comments with just a nickname and password.",
        },
      },
    ],
  },
  {
    title: "Admin",
    description: {
      ko: "관리자가 새 콘텐츠를 작성하고, 이미지를 설정하고, 시리즈에 연결한 뒤 발행하는 전체 워크플로우",
      en: "The complete admin workflow from writing new content, setting cover images, linking to series, to publishing",
    },
    steps: [
      {
        label: { ko: "로그인", en: "Login" },
        description: {
          ko: "Supabase Auth를 통한 이메일/비밀번호 인증으로 관리자 대시보드에 접근합니다. 미인증 시 자동 리다이렉트됩니다.",
          en: "Access the admin dashboard via Supabase Auth email/password authentication. Unauthenticated users are automatically redirected.",
        },
      },
      {
        label: { ko: "포스트 작성", en: "Create Post" },
        description: {
          ko: "Markdown 또는 Rich Text 에디터에서 한국어/영어 이중 언어로 작성합니다. 언어 전환 시 자동 번역이 트리거되어 초안을 생성합니다.",
          en: "Write in Korean/English bilingual mode using Markdown or Rich Text editor. Switching languages triggers auto-translation to generate a draft.",
        },
      },
      {
        label: { ko: "커버 이미지", en: "Cover Image" },
        description: {
          ko: "Unsplash에서 키워드로 검색하거나, AI 이미지 생성(스타일 프리셋 선택)으로 커버를 설정합니다. 직접 업로드도 가능합니다.",
          en: "Search Unsplash by keyword, generate AI images with style presets, or upload directly to set the cover image.",
        },
      },
      {
        label: { ko: "시리즈 연결", en: "Link to Series" },
        description: {
          ko: "기존 시리즈를 선택하거나 새로 생성하면 카테고리가 자동으로 동기화됩니다. 시리즈 내 순서도 지정 가능합니다.",
          en: "Select an existing series or create a new one — the category syncs automatically. You can also set the order within a series.",
        },
      },
      {
        label: { ko: "발행", en: "Publish" },
        description: {
          ko: "제목, 본문 등 필수 항목 검증을 거친 뒤 공개/비공개 토글로 발행합니다. 리비전 히스토리에서 이전 버전 복원도 가능합니다.",
          en: "After validating required fields like title and body, publish with the visibility toggle. Previous versions can be restored from revision history.",
        },
      },
    ],
  },
  {
    title: "Contact",
    description: {
      ko: "방문자가 사이트를 떠나지 않고 Drawer 인터페이스에서 빠르게 메시지를 보내는 흐름",
      en: "How visitors quickly send a message through the Drawer interface without leaving the page",
    },
    steps: [
      {
        label: { ko: "Contact 버튼", en: "Contact Button" },
        description: {
          ko: "페이지 하단의 CTA 버튼이나 네비게이션 메뉴의 Contact 링크를 클릭하면 프로세스가 시작됩니다.",
          en: "The process begins when clicking the CTA button at the bottom of the page or the Contact link in the navigation menu.",
        },
      },
      {
        label: { ko: "Drawer 열림", en: "Drawer Opens" },
        description: {
          ko: "페이지 우측에서 슬라이드-인 오버레이 Drawer가 나타납니다. 배경은 흐려지고, 현재 페이지 컨텍스트는 유지됩니다.",
          en: "A slide-in overlay Drawer appears from the right side. The background blurs while maintaining the current page context.",
        },
      },
      {
        label: { ko: "폼 작성", en: "Fill Form" },
        description: {
          ko: "이름, 이메일 주소, 메시지를 입력합니다. 실시간 유효성 검사로 형식 오류를 즉시 안내합니다.",
          en: "Enter your name, email address, and message. Real-time validation immediately flags any format errors.",
        },
      },
      {
        label: { ko: "reCAPTCHA 인증", en: "reCAPTCHA" },
        description: {
          ko: "Google reCAPTCHA v2 체크박스를 완료해야 전송 버튼이 활성화됩니다. 스팸과 봇 요청을 사전 차단합니다.",
          en: "Complete the Google reCAPTCHA v2 checkbox to enable the send button. This blocks spam and bot requests upfront.",
        },
      },
      {
        label: { ko: "이메일 발송", en: "Email Sent" },
        description: {
          ko: "Resend API를 통해 이메일이 전송되고, 성공 메시지가 표시된 후 Drawer가 자동으로 닫힙니다.",
          en: "The email is sent via the Resend API. A success message is displayed, then the Drawer automatically closes.",
        },
      },
    ],
  },
  {
    title: "Theme",
    description: {
      ko: "다크/라이트 모드 전환과 한국어/영어 언어 전환이 실시간으로 전체 UI에 반영되는 과정",
      en: "How dark/light mode and Korean/English language switching are applied in real-time across the entire UI",
    },
    steps: [
      {
        label: { ko: "토글 클릭", en: "Toggle Click" },
        description: {
          ko: "상단 네비게이션 바의 테마 아이콘(해/달)이나 언어 버튼(KO/EN)을 클릭합니다.",
          en: "Click the theme icon (sun/moon) or language button (KO/EN) in the top navigation bar.",
        },
      },
      {
        label: { ko: "CSS Variables 갱신", en: "CSS Vars Update" },
        description: {
          ko: "html 요소의 data-theme 속성이 변경되면, 3-layer 토큰 시스템(Raw → Semantic → Context)이 연쇄적으로 갱신됩니다.",
          en: "When the html element's data-theme attribute changes, the 3-layer token system (Raw → Semantic → Context) cascades updates.",
        },
      },
      {
        label: { ko: "설정 저장", en: "Persist Setting" },
        description: {
          ko: "선택한 테마와 언어가 localStorage에 저장되어 다음 방문 시에도 동일한 설정이 자동 적용됩니다.",
          en: "The selected theme and language are saved to localStorage, automatically applying the same settings on the next visit.",
        },
      },
      {
        label: { ko: "전체 UI 반영", en: "Full UI Update" },
        description: {
          ko: "0.3초 CSS transition으로 배경, 텍스트, 보더, 그림자 등이 부드럽게 전환됩니다. 커스텀 테마색도 즉시 반영됩니다.",
          en: "Background, text, borders, and shadows smoothly transition over 0.3s CSS transitions. Custom theme colors are applied instantly.",
        },
      },
    ],
  },
  {
    title: "About",
    description: {
      ko: "이 페이지 자체의 구조 — 가로 스크롤 기반 인터랙티브 기술 문서를 탐색하는 흐름",
      en: "The structure of this page itself — navigating interactive technical documentation via horizontal scroll",
    },
    steps: [
      {
        label: { ko: "가로 스크롤 시작", en: "Start H-Scroll" },
        description: {
          ko: "데스크톱에서 마우스 휠을 내리면 GSAP ScrollTrigger가 세로 입력을 가로 이동으로 변환하여 패널이 좌우로 흐릅니다.",
          en: "On desktop, scrolling the mouse wheel triggers GSAP ScrollTrigger to convert vertical input into horizontal movement, flowing panels left to right.",
        },
      },
      {
        label: { ko: "14개 패널 순회", en: "Browse 14 Panels" },
        description: {
          ko: "개요, 유저 플로우, 아키텍처, 기능, 디자인 컨셉, ERD 등 14개 주제별 패널을 순서대로 탐색합니다.",
          en: "Browse 14 topic-specific panels in order: Overview, User Flow, Architecture, Features, Design Concept, ERD, and more.",
        },
      },
      {
        label: { ko: "하단 Nav 바로가기", en: "Nav Shortcuts" },
        description: {
          ko: "화면 하단의 도트 네비게이션으로 원하는 패널에 직접 점프할 수 있습니다. 스프링 인디케이터가 현재 위치를 표시합니다.",
          en: "Jump directly to any panel using the dot navigation at the bottom. A spring indicator marks your current position.",
        },
      },
      {
        label: { ko: "기술 문서 탐색", en: "Explore Docs" },
        description: {
          ko: "각 패널에서 인터랙티브 ERD, 코드 하이라이트, 트러블슈팅 사례, 프로세스 타임라인 등을 직접 조작하며 탐색합니다.",
          en: "Within each panel, interact with ERD diagrams, code highlights, troubleshooting cases, process timelines, and more.",
        },
      },
    ],
  },
];
