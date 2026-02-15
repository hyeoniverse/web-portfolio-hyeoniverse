import type { Language } from "@/providers/LanguageProvider";

type LocalizedText = Record<Language, string>;

export interface DesignFeature {
  icon: string;
  title: string; // Not translated (section title)
  description: LocalizedText;
  tech: string[];
  image?: string;
}

export interface ProcessStep {
  step: string;
  title: LocalizedText;
  description: LocalizedText;
}

export interface CodeExample {
  title: string;
  description: LocalizedText;
  code: string;
  language: string;
  media?: string; // image or video URL (to be added)
}

export interface TroubleShootingItem {
  problem: LocalizedText;
  cause: LocalizedText;
  solution: LocalizedText;
  keyInsight: LocalizedText;
}

export interface TechStackItem {
  name: string;
  category: string;
}

export interface OverviewStat {
  value: string;
  label: LocalizedText;
}

export interface StructureItem {
  path: string;
  description: LocalizedText;
  indent: number;
}

export interface DesignConceptItem {
  id: string;
  title: string;
  subtitle: LocalizedText;
  description: LocalizedText;
  image: string;
}

export const designConcepts: DesignConceptItem[] = [
  {
    id: "typography",
    title: "TYPOGRAPHY",
    subtitle: {
      ko: "4가지 서체 시스템",
      en: "4-Font Type System",
    },
    description: {
      ko: "Inter(UI), Instrument Serif(디스플레이), JetBrains Mono(코드), Space Grotesk(보조) — 각 역할에 맞는 서체를 선택해 가독성과 개성을 동시에 확보했습니다.",
      en: "Inter (UI), Instrument Serif (display), JetBrains Mono (code), Space Grotesk (secondary) — each font chosen for its role, balancing readability with personality.",
    },
    image: "https://images.unsplash.com/photo-1618761714954-0b8cd0026356?w=800&q=80",
  },
  {
    id: "color",
    title: "COLOR SYSTEM",
    subtitle: {
      ko: "다크/라이트 듀얼 팔레트",
      en: "Dark/Light Dual Palette",
    },
    description: {
      ko: "CSS Variables 기반 디자인 토큰으로 다크/라이트 테마를 전환합니다. Accent, Neutral, Background 3계층 팔레트가 모든 컴포넌트에 일관되게 적용됩니다.",
      en: "CSS Variables design tokens power dark/light theme switching. A 3-layer palette — Accent, Neutral, Background — is applied consistently across all components.",
    },
    image: "https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?w=800&q=80",
  },
  {
    id: "motion",
    title: "MOTION & SCROLL",
    subtitle: {
      ko: "물리 기반 인터랙션",
      en: "Physics-Based Interactions",
    },
    description: {
      ko: "Lenis smooth scroll, GSAP horizontal scroll, Framer Motion spring physics — 세 라이브러리를 조합하여 자연스러운 무게감의 인터랙션을 구현했습니다.",
      en: "Lenis smooth scroll, GSAP horizontal scroll, Framer Motion spring physics — three libraries combined for interactions with natural weight and momentum.",
    },
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
  },
  {
    id: "layout",
    title: "LAYOUT & SPACING",
    subtitle: {
      ko: "일관된 스페이싱 스케일",
      en: "Consistent Spacing Scale",
    },
    description: {
      ko: "2xs(4px)부터 4xl(64px)까지 7단계 스페이싱 토큰을 정의하여 모든 컴포넌트에 일관된 간격 시스템을 적용했습니다.",
      en: "A 7-step spacing scale from 2xs (4px) to 4xl (64px) ensures consistent spacing across all components.",
    },
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80",
  },
  {
    id: "grid",
    title: "GRID SYSTEM",
    subtitle: {
      ko: "7단계 반응형 브레이크포인트",
      en: "7-Step Responsive Breakpoints",
    },
    description: {
      ko: "XS(320px)부터 4K(1920px)까지 7단계 브레이크포인트로 모든 디바이스에서 최적화된 레이아웃을 제공합니다.",
      en: "From XS (320px) to 4K (1920px), 7 breakpoints ensure optimized layouts across all devices.",
    },
    image: "https://images.unsplash.com/photo-1545235617-9465d2a55698?w=800&q=80",
  },
  {
    id: "icons",
    title: "ICONOGRAPHY",
    subtitle: {
      ko: "Lucide + 브랜드 아이콘",
      en: "Lucide + Brand Icons",
    },
    description: {
      ko: "Lucide React 아이콘과 커스텀 브랜드 SVG를 조합하여 일관된 아이콘 시스템을 구축했습니다.",
      en: "Lucide React icons combined with custom brand SVGs form a consistent iconography system.",
    },
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80",
  },
];

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
  {
    path: "src/",
    description: { ko: "소스 코드 루트", en: "Source code root" },
    indent: 0,
  },
  {
    path: "app/",
    description: {
      ko: "Next.js App Router — 페이지 & API 라우트",
      en: "Next.js App Router — pages & API routes",
    },
    indent: 1,
  },
  {
    path: "(home)/",
    description: {
      ko: "랜딩 페이지 — Hero, About, Works, CTA 등 7개 섹션",
      en: "Landing page — 7 sections: Hero, About, Works, CTA, etc.",
    },
    indent: 2,
  },
  {
    path: "works/",
    description: {
      ko: "프로젝트 갤러리 + [id] 동적 상세 페이지",
      en: "Project gallery + [id] dynamic detail pages",
    },
    indent: 2,
  },
  {
    path: "about/",
    description: {
      ko: "소개 페이지 — 프로필 & 철학",
      en: "About page — profile & philosophy",
    },
    indent: 2,
  },
  {
    path: "webflow/",
    description: {
      ko: "이 페이지 — 개발 과정 & 기술 문서",
      en: "This page — development process & technical docs",
    },
    indent: 2,
  },
  {
    path: "api/contact/",
    description: {
      ko: "이메일 전송 API 엔드포인트",
      en: "Email sending API endpoint",
    },
    indent: 2,
  },
  {
    path: "components/",
    description: {
      ko: "재사용 가능한 UI 컴포넌트 라이브러리",
      en: "Reusable UI component library",
    },
    indent: 1,
  },
  {
    path: "layout/",
    description: {
      ko: "Navigation, Footer, ContactDrawer, LoadingScreen",
      en: "Navigation, Footer, ContactDrawer, LoadingScreen",
    },
    indent: 2,
  },
  {
    path: "effects/",
    description: {
      ko: "StaggerText, Parallax, CursorTrail, FontMorph",
      en: "StaggerText, Parallax, CursorTrail, FontMorph",
    },
    indent: 2,
  },
  {
    path: "ui/",
    description: {
      ko: "Button, Modal, Typography, OptimizedImage",
      en: "Button, Modal, Typography, OptimizedImage",
    },
    indent: 2,
  },
  {
    path: "hooks/",
    description: {
      ko: "12개 커스텀 훅 — useMagnetic, useScrollVelocity 등",
      en: "12 custom hooks — useMagnetic, useScrollVelocity, etc.",
    },
    indent: 1,
  },
  {
    path: "stores/",
    description: {
      ko: "Zustand 상태 관리 — app, project, modal, contact, transition",
      en: "Zustand state management — app, project, modal, contact, transition",
    },
    indent: 1,
  },
  {
    path: "providers/",
    description: {
      ko: "Context Providers — Theme, Language, Lenis, reCAPTCHA",
      en: "Context Providers — Theme, Language, Lenis, reCAPTCHA",
    },
    indent: 1,
  },
  {
    path: "animations/",
    description: {
      ko: "Framer Motion 프리셋 — fade, slide, scale, spring 등 7개 카테고리",
      en: "Framer Motion presets — 7 categories: fade, slide, scale, spring, etc.",
    },
    indent: 1,
  },
  {
    path: "styles/globals/",
    description: {
      ko: "CSS 디자인 토큰, 베이스 스타일, 애니메이션, 유틸리티",
      en: "CSS design tokens, base styles, animations, utilities",
    },
    indent: 1,
  },
  {
    path: "data/",
    description: {
      ko: "정적 데이터 — projects, services, about, webflow",
      en: "Static data — projects, services, about, webflow",
    },
    indent: 1,
  },
  {
    path: "locales/",
    description: {
      ko: "i18n 번역 파일 — ko.json, en.json",
      en: "i18n translation files — ko.json, en.json",
    },
    indent: 1,
  },
];

export const designFeatures: DesignFeature[] = [
  {
    icon: "01",
    title: "Infinite Scroll Loop",
    description: {
      ko: "Lenis smooth scroll과 무한 루프를 결합하여 끊김 없는 순환 스크롤 경험을 구현했습니다.",
      en: "Implemented seamless circular scroll experience by combining Lenis smooth scroll with infinite loop.",
    },
    tech: ["Lenis", "Infinite Scroll", "Bridge Section"],
  },
  {
    icon: "02",
    title: "Mouse Parallax",
    description: {
      ko: "Framer Motion의 useSpring과 useTransform을 활용한 마우스 반응형 패럴랙스 효과를 적용했습니다.",
      en: "Applied mouse-responsive parallax effects using Framer Motion's useSpring and useTransform.",
    },
    tech: ["Framer Motion", "useMotionValue", "Parallax"],
  },
  {
    icon: "03",
    title: "Scroll-Triggered Animations",
    description: {
      ko: "GSAP ScrollTrigger로 스크롤 위치에 따라 자연스럽게 등장하는 요소들을 구현했습니다.",
      en: "Implemented naturally appearing elements based on scroll position using GSAP ScrollTrigger.",
    },
    tech: ["GSAP", "ScrollTrigger", "once: true"],
  },
  {
    icon: "04",
    title: "Mix-Blend Navigation",
    description: {
      ko: "mix-blend-mode: difference를 활용해 배경에 따라 자동으로 반전되는 네비게이션을 구현했습니다.",
      en: "Implemented auto-inverting navigation based on background using mix-blend-mode: difference.",
    },
    tech: ["CSS Blend Mode", "Fixed Nav", "z-index"],
  },
  {
    icon: "05",
    title: "StaggerText Animation",
    description: {
      ko: "텍스트를 개별 문자로 분리하여 호버 시 순차적 외곽선 애니메이션을 구현했습니다. 호버 해제 시 역순으로 색상이 채워지며 stroke가 유지됩니다.",
      en: "Split text into individual characters for sequential outline animation on hover. On hover release, colors fill in reverse order while stroke is maintained.",
    },
    tech: ["React State", "CSS text-stroke", "Stagger Delay"],
  },
  {
    icon: "06",
    title: "Lighthouse Performance Optimization",
    description: {
      ko: "2차에 걸친 Lighthouse 분석 기반 성능 최적화. 미사용 폰트 4개(12파일) 제거, reCAPTCHA 인터랙션 기반 지연 로딩, font-display:swap 적용으로 모바일 Performance 60→98점, 페이지 용량 70% 감소를 달성했습니다.",
      en: "Performance optimization based on two rounds of Lighthouse analysis. Removed 4 unused fonts (12 files), implemented interaction-based lazy loading for reCAPTCHA, applied font-display:swap to achieve mobile Performance 60→98, and reduced page size by 70%.",
    },
    tech: ["Font Optimization", "Lazy Loading", "font-display", "browserslist"],
  },
  {
    icon: "07",
    title: "Works Horizontal Gallery",
    description: {
      ko: "GSAP requestAnimationFrame 기반 가로 스크롤 갤러리. 인트로 섹션을 인플로우 아이템으로 배치하고, oneSetWidth 래핑으로 양방향 무한 스크롤을 구현했습니다. 언어 전환 시 min-height로 레이아웃 시프트를 방지합니다.",
      en: "Horizontal scroll gallery based on GSAP requestAnimationFrame. Placed intro section as an in-flow item, implemented bidirectional infinite scroll with oneSetWidth wrapping. Prevents layout shift during language switching with min-height.",
    },
    tech: ["GSAP", "Infinite Wrapping", "i18n Layout", "Responsive"],
  },
  {
    icon: "08",
    title: "Dark/Light Theme System",
    description: {
      ko: "CSS Variables 기반 다크/라이트 테마 시스템. data-theme 속성 전환과 전역 transition으로 모든 컴포넌트가 자연스럽게 테마에 반응합니다.",
      en: "Dark/light theme system based on CSS Variables. All components respond naturally to theme changes via data-theme attribute switching and global transitions.",
    },
    tech: ["CSS Variables", "data-theme", "Context API", "localStorage"],
  },
  {
    icon: "09",
    title: "Bilingual i18n Support",
    description: {
      ko: "한국어/영어 이중 언어 지원. LanguageProvider를 통한 전역 언어 상태 관리와 각 컴포넌트의 LocalizedText 타입으로 타입 안전한 다국어 시스템을 구현했습니다.",
      en: "Korean/English bilingual support. Implemented a type-safe multilingual system with global language state management via LanguageProvider and LocalizedText types across all components.",
    },
    tech: ["Context API", "TypeScript Generics", "LocalizedText", "SSR-safe"],
  },
];

export const techStack: TechStackItem[] = [
  { name: "Next.js 15", category: "Framework" },
  { name: "React 19", category: "Library" },
  { name: "TypeScript", category: "Language" },
  { name: "GSAP + ScrollTrigger", category: "Animation" },
  { name: "Lenis Smooth Scroll", category: "Scroll" },
  { name: "Framer Motion", category: "Interaction" },
  { name: "CSS Modules", category: "Styling" },
  { name: "CSS Variables", category: "Design Tokens" },
  { name: "Zustand", category: "State Management" },
  { name: "Formspree", category: "Form & Email" },
];

export const designProcess: ProcessStep[] = [
  {
    step: "01",
    title: {
      ko: "설계 및 디자인 시스템 구축",
      en: "Design System & Foundation",
    },
    description: {
      ko: "**CSS Variables** 기반 디자인 토큰을 정의하고, **다크/라이트 테마** 전환 시스템과 **CSS Modules** 캡슐화 구조를 설계했습니다. **16회 이상의 디자인 반복**을 거쳐 타이포그래피, 색상, 간격 체계를 확립하고 전체 레이아웃의 기반을 잡았습니다.",
      en: "Defined design tokens based on **CSS Variables**, and established a **dark/light theme** switching system with **CSS Modules** encapsulation. Through **16+ design iterations**, established typography, color, and spacing systems that form the foundation of the entire layout.",
    },
  },
  {
    step: "02",
    title: {
      ko: "핵심 UI 컴포넌트 개발",
      en: "Core UI Component Development",
    },
    description: {
      ko: "**Hero** 섹션, **Navigation**, **Contact Drawer**, **Loading Screen** 등 주요 UI 컴포넌트를 구현했습니다. 네비게이션의 언어·테마 버튼에 **flip/pop 애니메이션**을 적용하고, 로딩 화면에 **001→100 카운팅 애니메이션**을 추가하는 등 각 컴포넌트의 인터랙션을 설계했습니다.",
      en: "Built core UI components including **Hero** section, **Navigation**, **Contact Drawer**, and **Loading Screen**. Applied **flip/pop animations** to the navigation's language and theme buttons, added a **001→100 counting animation** to the loading screen, and designed interactions for each component.",
    },
  },
  {
    step: "03",
    title: {
      ko: "인터랙션 및 모션 디자인",
      en: "Interaction & Motion Design",
    },
    description: {
      ko: "**GSAP**과 **Framer Motion**을 활용해 Image Velocity, StaggerText, Mouse Parallax, Magnetic Hover, Direction-Aware ClipPath 등 **물리 기반 인터랙션**을 구현했습니다. 스크롤 속도와 마우스 움직임에 반응하는 **스프링 감쇠 기반 애니메이션**으로 자연스러운 모션을 구현했습니다.",
      en: "Implemented **physics-based interactions** using **GSAP** and **Framer Motion** — Image Velocity, StaggerText, Mouse Parallax, Magnetic Hover, and Direction-Aware ClipPath. Built natural motion through **spring-damped animations** that respond to scroll speed and mouse movement.",
    },
  },
  {
    step: "04",
    title: {
      ko: "다국어 지원 및 반응형 최적화",
      en: "Internationalization & Responsive Design",
    },
    description: {
      ko: "한/영 **다국어(i18n)** 시스템을 도입하고, 언어별 텍스트 길이 차이로 발생하는 **레이아웃 시프트**를 min-height 예약 방식으로 해결했습니다. 데스크톱·태블릿·모바일 각 환경에 맞는 **반응형 레이아웃**을 구현하고, **clamp() 기반 유동 사이징**을 적용했습니다.",
      en: "Introduced a Korean/English **i18n system** and resolved **layout shifts** from text length differences using reserved min-height. Implemented **responsive layouts** tailored to desktop, tablet, and mobile environments with **clamp()-based fluid sizing**.",
    },
  },
  {
    step: "05",
    title: {
      ko: "성능 최적화",
      en: "Performance Optimization",
    },
    description: {
      ko: "**Lighthouse CLI**로 프로덕션 빌드를 측정하며 2차에 걸쳐 최적화를 진행했습니다. reCAPTCHA를 **invisible 모드 + 지연 로딩**으로 전환하고, 미사용 폰트 4종(12파일)을 제거하여 페이지 용량을 **70% 절감**, 모바일 **Performance 98점**을 달성했습니다.",
      en: "Measured production builds with **Lighthouse CLI** through two rounds of optimization. Switched reCAPTCHA to **invisible mode with lazy loading**, removed 4 unused font families (12 files), reduced page weight by **70%**, and achieved a mobile **Performance score of 98**.",
    },
  },
  {
    step: "06",
    title: {
      ko: "문서화 및 프로젝트 회고",
      en: "Documentation & Project Retrospective",
    },
    description: {
      ko: "기술 선택의 이유, 문제 해결 과정, 아키텍처 구조를 기록하는 **Webflow 페이지**를 구현했습니다. Code Highlights, Troubleshooting, Architecture 시각화 등 **6개 패널**을 **50회 이상의 커밋**을 거쳐 데스크톱 가로 스크롤과 모바일 세로 레이아웃으로 완성했습니다.",
      en: "Built the **Webflow page** documenting technology choices, problem-solving processes, and architecture structure. Completed **6 panels** — Code Highlights, Troubleshooting, Architecture visualization, and more — through **50+ commits** with desktop horizontal scroll and mobile vertical layout.",
    },
  },
];

export const codeExamples: CodeExample[] = [
  {
    title: "Mouse Parallax Effect",
    description: {
      ko: "마우스를 움직이면 배경 요소들이 **살짝 시차를 두고 따라오는** 효과입니다. 마우스 위치를 실시간으로 추적하되, 곧바로 따라가는 것이 아니라 **스프링(용수철)처럼 탄성 있게 지연**시켜 자연스러운 느낌을 줍니다. 각 레이어마다 이동 범위를 다르게 설정해 **깊이감**을 표현합니다.",
      en: "Background elements **follow the mouse with a slight delay**, creating a sense of depth. Instead of snapping instantly, they move with a **spring-like elastic motion** for a natural feel. Each layer has a different movement range, making closer elements move more and farther elements less — just like **real parallax**.",
    },
    language: "javascript",
    code: `const mouseX = useMotionValue(0);
const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
const floatX = useTransform(smoothX, [0, window.innerWidth], [-30, 30]);`,
  },
  {
    title: "StaggerText Component",
    description: {
      ko: "텍스트에 마우스를 올리면 글자가 왼쪽부터 차례로 **외곽선만 남으며 비워지고**, 마우스를 떼면 **오른쪽부터 역순으로 색이 다시 채워집니다**. 한꺼번에 바뀌는 것이 아니라 글자마다 **0.04초씩 시간차**를 두어 도미노처럼 퍼지는 느낌을 줍니다.",
      en: "When you hover over text, letters **empty out to just outlines** from left to right. When you move away, colors **fill back in reverse order**. Each letter changes with a **0.04-second delay** after the previous one, creating a **domino-like ripple effect**.",
    },
    language: "javascript",
    code: `// 호버: 순방향 (첫 글자 → 마지막)
// 해제: 역방향 (마지막 → 첫 글자), stroke 유지
const forwardDelay = i * 0.04;
const reverseDelay = (totalChars - 1 - i) * 0.04;
const delay = isHovered ? forwardDelay : reverseDelay;

// CSS: step-end로 즉시 전환
.char { transition: color 0.01s step-end; }
.charHovered { color: transparent; -webkit-text-stroke: 1px; }
.charExiting { -webkit-text-stroke: 1px; } // stroke 유지`,
  },
  {
    title: "FontMorph Counting Animation",
    description: {
      ko: "마우스를 올리면 글꼴이 **슬롯머신처럼 빠르게 돌아가다가** 목표 글꼴에 멈추는 애니메이션입니다. **0.05초 간격**으로 랜덤 글꼴을 번갈아 보여주다가, 일정 횟수가 지나면 **점점 느려지며 최종 글꼴에 안착**합니다.",
      en: "On hover, fonts **spin like a slot machine**, rapidly cycling through random typefaces before landing on the target. Fonts change every **0.05 seconds**, then **gradually slow down** until settling on the final font.",
    },
    language: "javascript",
    code: `const startCounting = (targetIdx) => {
  setIsCounting(true);
  let iterations = 0;
  const total = Math.floor(countingDuration / countingSpeed);

  countingRef.current = setInterval(() => {
    iterations++;
    // 카운팅 중: 랜덤 폰트 표시
    setDisplayIndex(Math.floor(Math.random() * fonts.length));

    if (iterations >= total) {
      clearInterval(countingRef.current);
      // 최종 목표 폰트로 안착
      setDisplayIndex(targetIdx);
      setIsCounting(false);
    }
  }, 50); // countingSpeed
};`,
  },
  {
    title: "Magnetic Hover Effect",
    description: {
      ko: "커서를 버튼 근처로 가져가면 버튼이 **자석에 끌리듯 커서 쪽으로 살짝 이동**합니다. 커서와 버튼 중심 사이의 거리에 비례하여 움직이며, 커서가 멀어지면 **탄성 있게 원래 자리로 되돌아갑니다**.",
      en: "Move your cursor near the button and it **slides toward you like a magnet**. The closer the cursor gets, the more the button follows. When you move away, it **bounces back to its original position** with a spring-like motion.",
    },
    language: "javascript",
    code: `const x = useMotionValue(0);
const y = useMotionValue(0);
const springX = useSpring(x, { stiffness: 150, damping: 15 });
const springY = useSpring(y, { stiffness: 150, damping: 15 });

const onMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  x.set((e.clientX - (rect.left + rect.width / 2)) * 0.35);
  y.set((e.clientY - (rect.top + rect.height / 2)) * 0.35);
};
const onMouseLeave = () => { x.set(0); y.set(0); };`,
  },
  {
    title: "Direction-Aware ClipPath Reveal",
    description: {
      ko: "마우스가 **어느 방향에서 들어왔는지 감지**하여, 그 방향에서부터 **원형으로 퍼지며 내용이 드러나는** 호버 효과입니다. 왼쪽에서 들어오면 왼쪽부터, 아래에서 들어오면 아래부터 펼쳐집니다. 마우스를 떼면 **같은 방향으로 다시 수축**합니다.",
      en: "This effect **detects which direction your mouse enters from** and reveals content as a **circle expanding from that side**. Enter from the left — it spreads from the left. From below — it grows upward. On mouse leave, it **shrinks back the same way**.",
    },
    language: "javascript",
    code: `// 진입 방향 감지
const dx = e.clientX - (rect.left + rect.width / 2);
const dy = e.clientY - (rect.top + rect.height / 2);
const dirX = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : 0;
const dirY = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 1 : -1) : 0;

// clipPath: 진입 방향 → 전체 노출
animate={{
  clipPath: isHovering
    ? "circle(80% at 50% 50%)"
    : \`circle(0% at \${50 + dirX * 50}% \${50 + dirY * 50}%)\`
}}`,
  },
  {
    title: "Infinite Scroll Wrapping",
    description: {
      ko: "프로젝트 카드가 **좌우 어느 방향으로든 끝없이 순환**하는 가로 갤러리입니다. 같은 카드를 여러 세트 복제해 놓고, 스크롤이 끝에 가까워지면 **눈에 보이지 않게 위치를 되감아** 처음으로 돌려놓습니다. 사용자는 끊김 없이 계속 스크롤할 수 있습니다.",
      en: "A horizontal gallery where project cards **loop endlessly in both directions**. The same cards are duplicated in sets, and when you scroll near the edge, the position is **silently reset** so you never reach the end. The result is a **seamless infinite scroll** experience.",
    },
    language: "javascript",
    code: `// 연속된 인트로 간 거리로 한 세트 너비 계산
const introEls = slider.querySelectorAll('.intro');
const oneSetWidth = introEls[1].offsetLeft - introEls[0].offsetLeft;

// rAF 루프에서 양방향 래핑
while (scrollX > oneSetWidth * 3) {
  scrollX -= oneSetWidth;
  targetScrollX -= oneSetWidth;
}
while (scrollX < -oneSetWidth * 3) {
  scrollX += oneSetWidth;
  targetScrollX += oneSetWidth;
}`,
  },
  {
    title: "Dynamic Frame Grid",
    description: {
      ko: "3×3 CSS Grid에서 **호버한 셀이 커지고 나머지가 줄어드는** 반응형 레이아웃입니다. `grid-template-rows`와 `grid-template-columns`의 **fr 단위를 동적으로 변경**하여 호버된 행·열에 더 많은 공간을 할당합니다. CSS transition만으로 **부드러운 크기 재분배**가 이루어집니다.",
      en: "A responsive layout where the **hovered cell expands while others shrink** in a 3×3 CSS Grid. By **dynamically changing fr units** of `grid-template-rows` and `grid-template-columns`, more space is allocated to the hovered row and column. Smooth **size redistribution** is achieved with CSS transitions alone.",
    },
    language: "javascript",
    code: `const GRID_SIZE = 12;
const HOVER_SIZE = 6;

const getSizes = (axis) => {
  if (!hovered) return "4fr 4fr 4fr";
  const idx = axis === "row" ? hovered.row : hovered.col;
  const rest = (GRID_SIZE - HOVER_SIZE) / 2;
  return [0, 1, 2]
    .map((i) => (i === idx
      ? \`\${HOVER_SIZE}fr\` : \`\${rest}fr\`))
    .join(" ");
};

// Grid에 적용
style={{
  gridTemplateRows: getSizes("row"),
  gridTemplateColumns: getSizes("col"),
  transition: "grid-template-rows 0.4s ease,
               grid-template-columns 0.4s ease",
}}`,
  },
  {
    title: "Loading Screen Progress",
    description: {
      ko: "페이지를 처음 열 때 보이는 로딩 화면입니다. 숫자가 **001에서 100까지 부드럽게 올라가며**, 처음엔 빠르다가 **끝에 가까울수록 천천히 감속**합니다. 항상 **세 자리 숫자**(001, 055, 100)로 표시되고, 아래 프로그레스 바도 숫자와 함께 채워집니다.",
      en: "The loading screen shown when the page first opens. The counter **smoothly counts from 001 to 100**, starting fast and **gradually slowing down** near the end. It always shows **three digits** (001, 055, 100), and the progress bar below fills in sync with the number.",
    },
    language: "javascript",
    code: `// 이전 값에서 새 값으로 ease-out 보간
const animate = (currentTime) => {
  const elapsed = currentTime - startTime;
  const t = Math.min(elapsed / 300, 1);
  const eased = 1 - Math.pow(1 - t, 3);
  const value = Math.round(start + diff * eased);
  setDisplayedProgress(value);
  if (t < 1) requestAnimationFrame(animate);
};

// 표시: 001, 055, 100 형식
displayedProgress.toString().padStart(3, "0")

// 프로그레스 바 동기화
<motion.div animate={{ scaleX: progress / 100 }} />`,
  },
  {
    title: "i18n Layout Shift Prevention",
    description: {
      ko: "한국어와 영어는 같은 뜻이라도 **글자 수와 줄 수가 달라서**, 언어를 바꾸면 텍스트 높이가 변하며 **주변 요소들이 밀려나는 현상**이 생깁니다. 이를 막기 위해 텍스트 영역에 **미리 최소 높이를 확보**해 두어, 어떤 언어든 같은 공간을 차지하도록 합니다.",
      en: "Korean and English have **different character counts and line breaks** for the same meaning, so switching languages changes text height and **pushes surrounding elements around**. To prevent this, each text area is given a **reserved minimum height** so both languages always occupy the same space.",
    },
    language: "css",
    code: `/* 최대 줄 수 × line-height로 공간 예약 */
.introDesc { min-height: 4.95em; }   /* 3줄 × 1.65 */
.introDetail { min-height: 6.6em; }  /* 4줄 × 1.65 */
.introQuote { min-height: 3.3em; }   /* 2줄 × 1.65 */

/* 모바일: 세로 스크롤이므로 불필요 */
@media (max-width: 768px) {
  .introDesc, .introDetail, .introQuote {
    min-height: auto;
  }
}`,
  },
  {
    title: "Error Boundary",
    description: {
      ko: "Next.js의 **2단계 에러 바운더리**로 런타임 에러를 안전하게 처리합니다. `error.tsx`는 라우트 단위로 동작하며, Provider가 살아 있어 **i18n·테마·애니메이션**을 모두 사용할 수 있습니다. `global-error.tsx`는 루트 레이아웃 자체가 깨졌을 때 동작하므로 **인라인 스타일만** 사용하고, `<Link>` 대신 `<a>`를 씁니다. 두 페이지 모두 `error.digest`를 참조 ID로 표시하되 **기술 정보는 노출하지 않습니다**.",
      en: "Next.js **two-layer error boundaries** safely handle runtime errors. `error.tsx` works at the route level where Providers survive, enabling **i18n, theming, and animations**. `global-error.tsx` fires when the root layout itself breaks, so it uses **inline styles only** and `<a>` instead of `<Link>`. Both pages display `error.digest` as a reference ID while **hiding technical details**.",
    },
    language: "javascript",
    code: `// error.tsx — 라우트 레벨 (Provider 접근 가능)
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Application Error:", error);
  }, [error]);

  return (
    // Staggered entrance animations
    <motion.div initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ ease: "backOut" }}>
      <span>!</span>
    </motion.div>

    // 안전한 참조 ID만 노출
    {error.digest && <p>Ref: {error.digest}</p>}

    // reset(): Next.js가 제공하는 재렌더링 함수
    <button onClick={reset}>Try Again</button>
    <Link href="/">Go Home</Link>
  );
}

// global-error.tsx — 루트 레벨 (인라인 스타일만)
// CSS Modules·Link·Provider 사용 불가
<html><body>
  <button onClick={reset} style={{...}}>
    Try Again
  </button>
  <a href="/">Go Home</a>
</body></html>`,
  },
  {
    title: "Unit Testing with Vitest",
    description: {
      ko: "**Vitest + React Testing Library**로 핵심 유틸과 컴포넌트를 테스트합니다. 클래스명 조합(`cn`), 날짜 포맷, 랜덤 생성, 모바일 판별, 하이라이트 마크업 변환 등 **순수 함수와 렌더링 결과**를 검증하며, jsdom 환경에서 **브라우저 API를 모킹**하여 실행합니다.",
      en: "Core utilities and components are tested with **Vitest + React Testing Library**. Tests cover class name merging (`cn`), date formatting, random generation, mobile detection, and highlight markup — verifying **pure functions and render output** in a jsdom environment with **mocked browser APIs**.",
    },
    language: "javascript",
    code: `// cn.test.ts — 클래스명 조합 유틸
expect(cn("px-2", "px-4")).toBe("px-4");
expect(cn("foo", false, "bar")).toBe("foo bar");

// mobileCheck.test.ts — 브라우저 API 모킹
Object.defineProperty(window, "innerWidth", { value: 800 });
Object.defineProperty(window, "innerHeight", { value: 600 });
expect(checkMobileLayout()).toBe(true);

// renderHighlight.test.tsx — React 렌더링 테스트
const { container } = render(
  <>{renderHighlight("**강조** 텍스트")}</>
);
expect(container.querySelector(".highlighted-text"))
  .toBeTruthy();`,
  },
];

export const troubleShootingItems: TroubleShootingItem[] = [
  {
    problem: {
      ko: "Lenis Scroll Velocity 효과 미작동",
      en: "Lenis Scroll Velocity Effect Not Working",
    },
    cause: {
      ko: "스크롤 속도에 따라 요소가 기울어지는 효과를 만들려 했습니다. 매 화면 갱신마다 스크롤 위치를 직접 읽어 속도를 계산했는데, **값이 들쑥날쑥하며 애니메이션이 떨리는 현상**이 발생했습니다. 원인은 스크롤 라이브러리(Lenis)가 내부적으로 **움직임을 부드럽게 가공**하고 있어서, 외부에서 읽은 값과 **타이밍이 어긋났기 때문**이었습니다.",
      en: "I wanted elements to tilt based on scroll speed. I manually read the scroll position every frame and calculated velocity myself, but the values were erratic and **animations jittered**. The cause: the scroll library (Lenis) internally **smooths out the movement**, so the values I read externally were **out of sync** with what Lenis was actually doing.",
    },
    solution: {
      ko: "직접 계산하는 방식을 버리고, **Lenis가 제공하는 스크롤 이벤트**에서 속도 값을 가져오도록 바꿨습니다. 라이브러리가 이미 정확하게 계산해 놓은 값을 그대로 사용하니 **떨림 없이 부드러운 애니메이션**이 구현되었습니다.",
      en: "Instead of calculating velocity myself, I switched to using the **scroll event provided by Lenis** and read the speed value it already computed. Using the library's own accurate values resulted in **smooth, jitter-free animations**.",
    },
    keyInsight: {
      ko: "라이브러리가 이미 계산해 놓은 값이 있다면, 같은 걸 직접 다시 계산하기보다 **라이브러리가 제공하는 값을 그대로 쓰는 것**이 항상 더 정확합니다.",
      en: "If a library already computes a value internally, **using the value it provides** is always more accurate than trying to recalculate the same thing yourself.",
    },
  },
  {
    problem: {
      ko: "Framer Motion transform과 CSS transform 충돌",
      en: "Framer Motion Transform Conflicts with CSS Transform",
    },
    cause: {
      ko: "CSS의 transform 속성으로 요소를 화면 중앙에 배치한 상태에서, 애니메이션 라이브러리(Framer Motion)로 스크롤 효과를 추가했습니다. 그런데 라이브러리가 **같은 transform 속성을 덮어써버려서**, 중앙 배치 설정이 사라지고 **요소가 엉뚱한 위치로 튀어나갔습니다**.",
      en: "I centered an element using CSS's transform property, then added a scroll animation with Framer Motion. But the library **overwrote the same transform property**, erasing the centering and causing the **element to jump to an unexpected position**.",
    },
    solution: {
      ko: "중앙 배치 방식을 transform 대신 **margin으로 변경**했습니다. transform 속성을 **애니메이션 전용으로 비워두면서도** 화면 중앙 배치를 유지할 수 있었습니다.",
      en: "Changed the centering method from transform to **margin-based positioning**. This keeps transform **reserved exclusively for animations** while still centering the element visually.",
    },
    keyInsight: {
      ko: "CSS 속성과 애니메이션 라이브러리가 **같은 속성을 동시에 사용하면 충돌**합니다. 위치 잡기와 움직임 효과는 **서로 다른 속성으로 분리**해야 안전합니다.",
      en: "When CSS and an animation library try to control **the same property, they conflict**. Positioning and motion effects should use **separate properties** to avoid interference.",
    },
  },
  {
    problem: {
      ko: "TypeScript useRef 타입 에러",
      en: "TypeScript useRef Type Error",
    },
    cause: {
      ko: "타이머 ID를 저장하기 위해 React의 useRef를 사용했는데, **초기값을 넣지 않았더니** TypeScript가 이 변수를 **\"읽기 전용\"으로 인식**해버렸습니다. 이후 새 값을 넣으려 하면 **\"수정할 수 없는 속성입니다\"**라는 에러가 발생했습니다.",
      en: "I used React's useRef to store a timer ID but **forgot to provide an initial value**. TypeScript then treated it as **read-only**, so when I tried to assign a new value, it threw a **\"cannot modify read-only property\"** error.",
    },
    solution: {
      ko: "**초기값(undefined)을 명시적으로 전달**했습니다. 초기값이 있으면 TypeScript가 **\"수정 가능한 변수\"로 인식**하여, 이후 자유롭게 새 값을 넣을 수 있게 됩니다.",
      en: "Added an **explicit initial value (undefined)**. With an initial value present, TypeScript recognizes it as a **\"mutable variable\"**, allowing new values to be freely assigned afterward.",
    },
    keyInsight: {
      ko: "React의 useRef는 **초기값을 넣었느냐 안 넣었느냐에 따라 동작이 달라집니다**. 값을 저장하는 용도로 쓸 때는 **반드시 초기값을 넘겨야** 나중에 수정할 수 있습니다.",
      en: "React's useRef **behaves differently based on whether you provide an initial value**. When using it to store values, you **must provide an initial value** to be able to modify it later.",
    },
  },
  {
    problem: {
      ko: "GSAP ScrollTrigger 수평 무한 스크롤 구현",
      en: "Implementing Horizontal Infinite Scroll with GSAP ScrollTrigger",
    },
    cause: {
      ko: "GSAP으로 가로 스크롤을 만들었지만, **스크롤할 수 있는 범위에 끝이 있어서** 끝에 도달하면 더 진행할 수 없었습니다. 위치를 순환시키는 방법도 시도했지만, 끝에 닿는 순간 **갑자기 처음으로 되돌아가는 듯한 끊김**이 보였습니다.",
      en: "I built horizontal scroll with GSAP, but the **scrollable range had a fixed end** — once you reached it, you couldn't go further. Trying to loop positions caused a **visible snap back to the start** when hitting the boundary.",
    },
    solution: {
      ko: "스크롤 가능 거리를 실제 콘텐츠 폭의 **10배로 넉넉하게** 설정한 뒤, 화면에 보이는 위치만 **콘텐츠 폭 단위로 되감아** 순환시켰습니다. 사용자는 끝에 도달할 일 없이 계속 스크롤하며, 시각적으로는 **콘텐츠가 무한히 반복**됩니다.",
      en: "Set the scrollable distance to **10 times the actual content width**, then silently **looped the visible position** within that range. Users never reach the end and keep scrolling while **content visually repeats infinitely**.",
    },
    keyInsight: {
      ko: "무한 스크롤의 핵심은 스크롤 자체를 되감는 것이 아니라, **보이는 화면만 순환**시키는 것입니다. 사용자의 스크롤 흐름을 끊지 않으면서 무한한 느낌을 줄 수 있습니다.",
      en: "The key to infinite scroll isn't resetting the scroll itself, but **looping only what's visible**. This creates an infinite feel without disrupting the user's natural scroll flow.",
    },
  },
  {
    problem: {
      ko: "reCAPTCHA v3 초기 로드 성능 저하 (LCP 17.1s, TTI 18.2s)",
      en: "reCAPTCHA v3 Initial Load Performance Degradation (LCP 17.1s, TTI 18.2s)",
    },
    cause: {
      ko: "공식 문서대로 보안 스크립트(reCAPTCHA)를 앱 시작 시 바로 불러왔더니, 페이지를 열자마자 **784KB짜리 파일이 다운로드**되었습니다. 이 파일이 다른 작업을 막으면서 **페이지가 화면에 표시되기까지 17초**나 걸리게 되었습니다.",
      en: "Following official docs, I loaded the security script (reCAPTCHA) immediately on app start, which caused a **784KB file to download right away**. This blocked other work and pushed the **page display time to 17 seconds**.",
    },
    solution: {
      ko: "보안 스크립트를 처음부터 불러오지 않고, **사용자가 처음 클릭하거나 터치하는 시점**에 불러오도록 변경했습니다. 또한 Google 서버와의 **연결을 미리 준비**해 두어 실제 로드 시 더 빨라지도록 했습니다.",
      en: "Instead of loading the security script upfront, it now loads **when the user first clicks or touches the page**. I also **pre-established the connection** to Google's server so the actual load is faster when needed.",
    },
    keyInsight: {
      ko: "외부 스크립트는 **\"지금 당장 필요한가?\"를 먼저 따져야** 합니다. 당장 안 쓰는 무거운 파일을 처음부터 불러오면, 정작 사용자가 보는 화면이 수 초씩 늦어집니다.",
      en: "Always ask **\"is this needed right now?\"** before loading external scripts. Loading heavy files upfront that aren't immediately needed **delays what the user actually sees** by several seconds.",
    },
  },
  {
    problem: {
      ko: "미사용 폰트로 인한 리소스 낭비 (폰트 19파일, 페이지 1,489KB)",
      en: "Resource Waste from Unused Fonts (19 Files, 1,489KB Page Weight)",
    },
    cause: {
      ko: "글꼴을 **9종류 등록**해 두었는데, 실제로 사용하는 건 **5종류뿐**이었습니다. 나머지 4종류는 디자인 실험 때 추가한 뒤 지우지 않은 것이었습니다. Next.js는 **등록만 해도 파일을 포함**시키기 때문에, 쓰지도 않는 **12개의 글꼴 파일**이 매번 다운로드되고 있었습니다.",
      en: "I had **9 font families** registered, but only **5 were actually in use**. The other 4 were leftover from design experiments. Since Next.js **includes font files just by registering them**, **12 unused font files** were being downloaded every time.",
    },
    solution: {
      ko: "사용하지 않는 글꼴 **4종류를 제거**(12파일 절약)하고, 한 글꼴의 굵기 옵션도 **7개에서 실제 쓰는 5개로** 줄였습니다. 또한 글꼴이 로딩되는 동안에도 **텍스트가 먼저 표시**되도록 설정했습니다.",
      en: "Removed **4 unused font families** (12 files saved) and reduced weight variations from **7 to the 5 actually used**. Also ensured **text appears immediately** while fonts are still loading.",
    },
    keyInsight: {
      ko: "Next.js에서는 글꼴을 **등록하기만 해도 자동으로 다운로드**됩니다. 안 쓰는 글꼴이 쌓이지 않도록 주기적으로 정리해야 합니다. 이 정리만으로 **성능 점수가 60에서 98로**, 페이지 용량이 **70% 줄었습니다**.",
      en: "In Next.js, **registering a font means it gets downloaded** automatically. Unused fonts should be cleaned up regularly. This cleanup alone improved the **performance score from 60 to 98** and reduced page weight by **70%**.",
    },
  },
  {
    problem: {
      ko: "Works 가로 갤러리 양방향 무한 스크롤",
      en: "Bidirectional Infinite Scroll for Works Horizontal Gallery",
    },
    cause: {
      ko: "프로젝트 카드를 10세트 복제하여 가로로 나열했지만, 아무리 많이 복제해도 **양쪽 끝은 존재**합니다. 끝에 도달하면 빈 화면이 보여서, 진정한 무한 스크롤이 아닌 **\"아주 긴 유한 스크롤\"**에 불과했습니다.",
      en: "I duplicated project cards into 10 sets, but no matter how many copies, there are still **two ends**. Reaching either end showed empty space — it was just a **\"very long finite scroll\"**, not truly infinite.",
    },
    solution: {
      ko: "카드 한 세트의 **정확한 폭을 계산**한 뒤, 스크롤 위치가 세트 경계를 넘을 때마다 **한 세트 폭만큼 되감아** 순환시킵니다. 사용자 눈에는 끊김 없이 **양방향으로 무한히 스크롤**되는 것처럼 보입니다.",
      en: "After **calculating the exact width of one card set**, whenever the scroll crosses a set boundary, the position is **rewound by exactly one set width**. To the user, it looks like **seamless infinite scrolling** in both directions.",
    },
    keyInsight: {
      ko: "무한 스크롤은 콘텐츠를 끝없이 복제하는 것이 아니라, 한정된 콘텐츠 위에서 **보이는 위치만 되감는 것**입니다. **3세트면 충분**하고, 나머지는 계산이 해결합니다.",
      en: "Infinite scroll doesn't mean duplicating content forever — it means **rewinding the visible position** over a finite set. **Three sets are enough**; math handles the rest.",
    },
  },
  {
    problem: {
      ko: "언어 전환 시 Works 인트로 레이아웃 시프트",
      en: "Layout Shift in Works Intro on Language Switch",
    },
    cause: {
      ko: "한국어와 영어는 같은 뜻이라도 **글자 수가 크게 다릅니다**. 언어를 바꾸면 텍스트의 줄 수가 달라지면서 높이가 변하고, **주변 요소들이 갑자기 위아래로 밀려나는 현상**이 발생했습니다.",
      en: "Korean and English have **very different character counts** for the same meaning. Switching languages changes the number of lines, altering height and causing **surrounding elements to suddenly jump up or down**.",
    },
    solution: {
      ko: "텍스트 영역에 **두 언어 중 더 긴 쪽에 맞춰 최소 높이를 고정**해 두어, 어떤 언어든 같은 공간을 차지하도록 했습니다. 모바일에서는 세로 스크롤이라 밀림이 눈에 띄지 않으므로 **높이 고정을 해제**했습니다.",
      en: "Each text area was given a **fixed minimum height matching the taller language**, so both languages occupy the same space. On mobile, where vertical scrolling makes shifts less noticeable, the **height lock is removed**.",
    },
    keyInsight: {
      ko: "여러 언어를 지원하는 화면에서는 **가장 긴 언어에 맞춰 공간을 미리 확보**해 두는 것이 레이아웃 안정성의 핵심입니다.",
      en: "In multilingual interfaces, the key to stable layouts is **reserving space based on whichever language takes up the most room**.",
    },
  },
];
