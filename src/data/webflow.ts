import type { Language } from "@/providers/LanguageProvider";

type LocalizedText = Record<Language, string>;

export interface DesignFeature {
  icon: string;
  title: string; // Not translated (section title)
  description: LocalizedText;
  tech: string[];
}

export interface ProcessStep {
  step: string;
  title: LocalizedText;
  description: LocalizedText;
}

export interface CodeExample {
  title: string; // Not translated (technical title)
  description: LocalizedText;
  code: string; // Not translated (code)
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

export const projectOverview = {
  description: {
    ko: "이 포트폴리오는 Next.js 15 App Router 기반으로 구축되었습니다. GSAP과 Framer Motion을 조합한 스크롤 애니메이션, Lenis를 활용한 무한 루프 스크롤, CSS Variables 기반 디자인 토큰 시스템, 그리고 한국어/영어 이중 언어 지원까지 — 프론트엔드 개발의 다양한 기술적 도전을 담고 있습니다.",
    en: "This portfolio is built on Next.js 15 App Router. It encompasses various frontend engineering challenges — scroll animations combining GSAP and Framer Motion, infinite loop scrolling with Lenis, a CSS Variables-based design token system, and Korean/English bilingual support.",
  },
  stats: [
    { value: "5", label: { ko: "페이지", en: "Pages" } },
    { value: "40+", label: { ko: "컴포넌트", en: "Components" } },
    { value: "12+", label: { ko: "커스텀 훅", en: "Custom Hooks" } },
    { value: "98", label: { ko: "Lighthouse", en: "Lighthouse" } },
    { value: "2", label: { ko: "언어 지원", en: "Languages" } },
    { value: "5", label: { ko: "Zustand 스토어", en: "Zustand Stores" } },
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
  { name: "Instrument Serif", category: "Typography" },
  { name: "Space Grotesk", category: "Typography" },
];

export const designProcess: ProcessStep[] = [
  {
    step: "01",
    title: {
      ko: "Design System 구축",
      en: "Design System Setup",
    },
    description: {
      ko: "CSS Variables를 활용한 디자인 토큰 시스템 구축. 컬러, 타이포그래피, 스페이싱, 그림자 등 일관된 디자인 언어를 정의했습니다.",
      en: "Built a design token system using CSS Variables. Defined consistent design language including colors, typography, spacing, and shadows.",
    },
  },
  {
    step: "02",
    title: {
      ko: "컴포넌트 설계",
      en: "Component Design",
    },
    description: {
      ko: "재사용 가능한 UI 컴포넌트와 레이아웃 시스템 설계. CSS Modules로 스타일 캡슐화를 구현했습니다.",
      en: "Designed reusable UI components and layout system. Implemented style encapsulation with CSS Modules.",
    },
  },
  {
    step: "03",
    title: {
      ko: "애니메이션 레이어",
      en: "Animation Layer",
    },
    description: {
      ko: "GSAP과 Framer Motion을 조합하여 스크롤 기반 애니메이션과 인터랙션을 구현했습니다.",
      en: "Implemented scroll-based animations and interactions by combining GSAP and Framer Motion.",
    },
  },
  {
    step: "04",
    title: {
      ko: "무한 스크롤 구현",
      en: "Infinite Scroll Implementation",
    },
    description: {
      ko: "Lenis infinite scroll과 Bridge 섹션을 결합하여 자연스러운 순환 스크롤 경험을 완성했습니다.",
      en: "Completed natural circular scroll experience by combining Lenis infinite scroll with Bridge section.",
    },
  },
  {
    step: "05",
    title: {
      ko: "Lighthouse 성능 최적화",
      en: "Lighthouse Performance Optimization",
    },
    description: {
      ko: "Lighthouse CLI로 프로덕션 빌드를 직접 측정하며 2차에 걸친 최적화를 진행. 1차: reCAPTCHA 지연 로딩, 접근성 수정. 2차: 미사용 폰트 제거, font-display:swap, 리소스 경량화로 모바일 98점 달성.",
      en: "Measured production build directly with Lighthouse CLI through two rounds of optimization. 1st: reCAPTCHA lazy loading, accessibility fixes. 2nd: Removed unused fonts, font-display:swap, resource optimization achieving mobile score of 98.",
    },
  },
  {
    step: "06",
    title: {
      ko: "Works 가로 갤러리 구현",
      en: "Works Horizontal Gallery Implementation",
    },
    description: {
      ko: "GSAP rAF 기반 가로 스크롤 갤러리에 인트로 인플로우 배치, oneSetWidth 양방향 무한 래핑, 뷰포트 중심 기반 활성 카드 감지, 언어 전환 레이아웃 안정화를 구현.",
      en: "Implemented in-flow intro placement in GSAP rAF-based horizontal scroll gallery, bidirectional infinite wrapping with oneSetWidth, viewport center-based active card detection, and language switch layout stabilization.",
    },
  },
];

export const codeExamples: CodeExample[] = [
  {
    title: "Mouse Parallax Effect",
    description: {
      ko: "Framer Motion을 활용한 마우스 추적 패럴랙스",
      en: "Mouse-tracking parallax using Framer Motion",
    },
    code: `const mouseX = useMotionValue(0);
const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
const floatX = useTransform(smoothX, [0, window.innerWidth], [-30, 30]);`,
  },
  {
    title: "Scroll-Triggered Animation",
    description: {
      ko: "GSAP ScrollTrigger를 활용한 등장 애니메이션",
      en: "Reveal animation using GSAP ScrollTrigger",
    },
    code: `gsap.from(".element", {
  y: 100, opacity: 0,
  scrollTrigger: {
    trigger: ref.current,
    start: "top 70%",
    once: true
  }
});`,
  },
  {
    title: "Scroll Velocity Parallax",
    description: {
      ko: "Lenis velocity를 활용한 스크롤 속도 기반 이미지 패럴랙스",
      en: "Scroll velocity-based image parallax using Lenis velocity",
    },
    code: `const workImageOffsetY = useMotionValue(0);
const smoothY = useSpring(workImageOffsetY, { stiffness: 100, damping: 15 });

lenis.on("scroll", () => {
  const velocity = lenis.velocity;
  if (Math.abs(velocity) > 0.05) {
    const offset = Math.max(-50, Math.min(50, velocity * 30));
    workImageOffsetY.set(offset);
  }
});`,
  },
  {
    title: "StaggerText Component",
    description: {
      ko: "호버 시 순차적 외곽선 애니메이션, 해제 시 역순 색상 복원",
      en: "Sequential outline animation on hover, reverse color restoration on release",
    },
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
    title: "reCAPTCHA Lazy Loading",
    description: {
      ko: "의도적 인터랙션 기반 서드파티 스크립트 지연 로딩 (타이머/scroll 제거)",
      en: "Third-party script lazy loading based on intentional interaction (timer/scroll removed)",
    },
    code: `const [shouldLoad, setShouldLoad] = useState(false);

useEffect(() => {
  const load = () => setShouldLoad(true);
  // 의도적 인터랙션만 (scroll/timer 제거 → Lighthouse에서 미로드)
  const events = ["click", "touchstart", "keydown"];
  events.forEach((e) =>
    document.addEventListener(e, () => { load(); cleanup(); },
      { once: true, passive: true })
  );
  return cleanup;
}, []);

if (!shouldLoad) return <>{children}</>;
return <GoogleReCaptchaProvider ...>{children}</GoogleReCaptchaProvider>;`,
  },
  {
    title: "Infinite Scroll Wrapping",
    description: {
      ko: "oneSetWidth 기반 양방향 무한 스크롤 래핑",
      en: "Bidirectional infinite scroll wrapping based on oneSetWidth",
    },
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
    title: "i18n Layout Shift Prevention",
    description: {
      ko: "언어 전환 시 min-height로 레이아웃 시프트 방지",
      en: "Preventing layout shift during language switching with min-height",
    },
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
];

export const troubleShootingItems: TroubleShootingItem[] = [
  {
    problem: {
      ko: "Lenis Scroll Velocity 효과 미작동",
      en: "Lenis Scroll Velocity effect not working",
    },
    cause: {
      ko: "RAF 폴링 방식으로 스크롤 위치를 직접 계산하면 velocity 값이 부정확하게 측정됨",
      en: "Calculating scroll position directly with RAF polling results in inaccurate velocity measurements",
    },
    solution: {
      ko: "Lenis의 네이티브 on('scroll') 이벤트를 사용하여 인스턴스에서 직접 velocity 속성 접근",
      en: "Used Lenis native on('scroll') event to access velocity property directly from instance",
    },
    keyInsight: {
      ko: "Lenis는 내부적으로 velocity를 계산하여 인스턴스 속성으로 제공. 직접 delta 계산보다 정확함",
      en: "Lenis internally calculates velocity and provides it as instance property. More accurate than manual delta calculation",
    },
  },
  {
    problem: {
      ko: "Framer Motion transform과 CSS transform 충돌",
      en: "Framer Motion transform conflicts with CSS transform",
    },
    cause: {
      ko: "CSS에서 transform: translate(-50%, -50%)로 중앙 정렬 시 Framer Motion의 y 속성이 덮어씌워짐",
      en: "Framer Motion's y property gets overwritten when centering with CSS transform: translate(-50%, -50%)",
    },
    solution: {
      ko: "margin 기반 중앙 정렬로 변경 (margin-left: -65%, margin-top: -65%)",
      en: "Changed to margin-based centering (margin-left: -65%, margin-top: -65%)",
    },
    keyInsight: {
      ko: "Framer Motion의 style 속성은 inline transform을 생성하므로 CSS transform과 분리 필요",
      en: "Framer Motion's style prop creates inline transform, so it needs to be separated from CSS transform",
    },
  },
  {
    problem: {
      ko: "TypeScript useRef 타입 에러",
      en: "TypeScript useRef type error",
    },
    cause: {
      ko: "useRef<ReturnType<typeof setTimeout>>()에서 초기값 미제공으로 인한 타입 에러",
      en: "Type error from not providing initial value in useRef<ReturnType<typeof setTimeout>>()",
    },
    solution: {
      ko: "useRef<ReturnType<typeof setTimeout> | undefined>(undefined)로 명시적 초기화",
      en: "Explicit initialization with useRef<ReturnType<typeof setTimeout> | undefined>(undefined)",
    },
    keyInsight: {
      ko: "clearTimeout은 undefined를 허용하지만 null은 허용하지 않음",
      en: "clearTimeout accepts undefined but not null",
    },
  },
  {
    problem: {
      ko: "GSAP ScrollTrigger 수평 무한 스크롤 구현",
      en: "Implementing GSAP ScrollTrigger horizontal infinite scroll",
    },
    cause: {
      ko: "ScrollTrigger는 유한한 스크롤 범위를 가지며, 끝에 도달 시 역방향 스크롤로 보이는 문제 발생",
      en: "ScrollTrigger has a finite scroll range, causing reverse scroll appearance when reaching the end",
    },
    solution: {
      ko: "스크롤 거리를 콘텐츠의 10배로 설정하고, modulo 연산으로 컨테이너 x 위치를 순환시켜 한 방향 무한 스크롤 구현",
      en: "Set scroll distance to 10x content and cycled container x position with modulo operation for unidirectional infinite scroll",
    },
    keyInsight: {
      ko: "스크롤 위치 텔레포트 대신 긴 스크롤 범위 + 시각적 위치 루프 방식이 더 자연스러움",
      en: "Long scroll range + visual position loop approach is more natural than scroll position teleporting",
    },
  },
  {
    problem: {
      ko: "reCAPTCHA v3 초기 로드 성능 저하 (LCP 17.1s, TTI 18.2s)",
      en: "reCAPTCHA v3 initial load performance degradation (LCP 17.1s, TTI 18.2s)",
    },
    cause: {
      ko: "GoogleReCaptchaProvider가 앱 루트를 감싸며 초기 로드 시 ~784KB JS를 즉시 다운로드. 메인 스레드 280ms 차단, Google 도메인 Preconnect 부재로 400ms 추가 지연",
      en: "GoogleReCaptchaProvider wrapping app root downloads ~784KB JS on initial load. 280ms main thread blocking, 400ms additional delay due to missing Google domain Preconnect",
    },
    solution: {
      ko: "유저 인터랙션(scroll/click/touch/keydown) 또는 4초 타임아웃 후 reCAPTCHA 로드. Preconnect 힌트 추가. WCAG 색상 대비 및 heading order, aria-label 접근성 수정",
      en: "Load reCAPTCHA after user interaction (scroll/click/touch/keydown) or 4s timeout. Added Preconnect hints. Fixed WCAG color contrast, heading order, and aria-label accessibility",
    },
    keyInsight: {
      ko: "서드파티 스크립트는 초기 로드에서 제외하고 유저 인터랙션 후 로드하면 LCP/TTI에 큰 영향. mix-blend-mode: difference는 Lighthouse가 blend 전 색상으로 대비를 측정하므로 오탐 가능",
      en: "Excluding third-party scripts from initial load and loading after user interaction significantly impacts LCP/TTI. mix-blend-mode: difference may cause false positives as Lighthouse measures contrast with pre-blend colors",
    },
  },
  {
    problem: {
      ko: "미사용 폰트로 인한 리소스 낭비 (폰트 19파일, 페이지 1,489KB)",
      en: "Resource waste from unused fonts (19 font files, page 1,489KB)",
    },
    cause: {
      ko: "next/font/google로 등록된 9개 폰트 패밀리 중 4개(IBM Plex Mono, Bebas Neue, Cormorant Garamond, Abril Fatface)가 CSS에서 미참조. reCAPTCHA 4초 타이머가 Lighthouse 테스트 중 트리거. font-display 미설정으로 폰트 렌더링 차단",
      en: "4 out of 9 font families registered with next/font/google (IBM Plex Mono, Bebas Neue, Cormorant Garamond, Abril Fatface) unreferenced in CSS. reCAPTCHA 4s timer triggered during Lighthouse test. Font rendering blocked due to missing font-display",
    },
    solution: {
      ko: "미사용 폰트 4개 제거(12파일 절약), Inter 가중치 7→5개 축소, font-display:swap 추가, reCAPTCHA 타이머/scroll 이벤트 제거, 미사용 preconnect 제거, browserslist 추가",
      en: "Removed 4 unused fonts (12 files saved), reduced Inter weights 7→5, added font-display:swap, removed reCAPTCHA timer/scroll events, removed unused preconnect, added browserslist",
    },
    keyInsight: {
      ko: "next/font로 등록만 해도 폰트 파일이 다운로드됨. 지연 로딩의 타이머 폴백은 성능 측정 도구에서 의도치 않게 트리거될 수 있으므로 의도적 인터랙션만 사용해야 함. 결과: Performance 60→98, 페이지 용량 70% 감소",
      en: "Font files download just by registering with next/font. Timer fallbacks in lazy loading can unintentionally trigger in performance measurement tools, so only intentional interactions should be used. Result: Performance 60→98, 70% page size reduction",
    },
  },
  {
    problem: {
      ko: "Works 가로 갤러리 양방향 무한 스크롤",
      en: "Works horizontal gallery bidirectional infinite scroll",
    },
    cause: {
      ko: "프로젝트 10세트를 반복 배치했지만 유한한 세트로는 양쪽 방향 끝이 존재하여 흰 화면이 나타남",
      en: "Repeated 10 sets of projects but finite sets still have ends in both directions, showing white screen",
    },
    solution: {
      ko: "연속된 인트로 요소의 offsetLeft 차이로 oneSetWidth를 계산하고, rAF 루프에서 while 문으로 scrollX/targetScrollX를 양방향 래핑",
      en: "Calculated oneSetWidth from offsetLeft difference of consecutive intro elements, wrapped scrollX/targetScrollX bidirectionally with while loop in rAF loop",
    },
    keyInsight: {
      ko: "콘텐츠 복제 세트 수를 늘리는 것보다 스크롤 위치 자체를 래핑하는 방식이 DOM 부담 없이 진정한 무한 스크롤을 구현할 수 있음",
      en: "Wrapping scroll position itself rather than increasing content duplication sets achieves true infinite scroll without DOM overhead",
    },
  },
  {
    problem: {
      ko: "언어 전환 시 Works 인트로 레이아웃 시프트",
      en: "Works intro layout shift on language switch",
    },
    cause: {
      ko: "한국어/영어 텍스트 길이 차이로 줄바꿈이 달라지고, justify-content: center가 적용된 flex 컨테이너에서 자식 높이 변화 시 공간이 재분배됨",
      en: "Different line breaks due to Korean/English text length difference, space redistribution when child height changes in flex container with justify-content: center",
    },
    solution: {
      ko: "min-height를 em 단위(줄 수 × line-height)로 설정하여 양쪽 언어 모두에서 일관된 공간 확보. 모바일에서는 세로 스크롤이므로 min-height: auto로 리셋",
      en: "Set min-height in em units (lines × line-height) for consistent space in both languages. Reset to min-height: auto on mobile since it uses vertical scroll",
    },
    keyInsight: {
      ko: "다국어 지원 시 텍스트 영역에 min-height로 최대 줄 수 기준 공간을 예약하면 레이아웃 시프트 방지. em 단위 사용으로 font-size 변경에도 자동 대응",
      en: "Reserving space based on max line count with min-height in text areas prevents layout shift in multilingual support. Using em units auto-adjusts to font-size changes",
    },
  },
];
