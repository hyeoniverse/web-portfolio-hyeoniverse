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
  { name: "Zustand", category: "State Management" },
  { name: "Formspree", category: "Form & Email" },
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
      ko: "마우스를 움직이면 배경 요소가 따라 움직이는 패럴랙스 효과입니다. 마우스 X 좌표를 실시간 추적하되, useSpring으로 부드러운 지연(스프링 물리)을 적용합니다. 그 값을 화면 너비 기준 -30px~+30px 범위로 변환하여 요소의 위치에 반영합니다.",
      en: "A parallax effect where background elements follow mouse movement. It tracks the mouse X coordinate in real-time, then applies smooth delay using useSpring (spring physics). The value is then mapped to a -30px to +30px range relative to screen width and applied to element positions.",
    },
    // media: "/videos/mouse-parallax.mp4",
    language: "javascript",
    code: `const mouseX = useMotionValue(0);
const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
const floatX = useTransform(smoothX, [0, window.innerWidth], [-30, 30]);`,
  },
  {
    title: "Scroll-Triggered Animation",
    description: {
      ko: "스크롤을 내려 요소가 뷰포트에 진입하면 자동으로 등장 애니메이션이 재생됩니다. GSAP ScrollTrigger가 요소의 위치를 감지하여, 화면의 70% 지점에 도달하면 아래에서 위로 100px 이동하며 투명도 0에서 1로 페이드인됩니다. once: true로 최초 1회만 실행됩니다.",
      en: "Elements automatically animate in when they enter the viewport during scrolling. GSAP ScrollTrigger detects element position — when it reaches 70% of the viewport, the element slides up 100px while fading in from transparent to visible. The once: true option ensures it only plays once.",
    },
    // media: "/videos/scroll-triggered.mp4",
    language: "javascript",
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
      ko: "스크롤 속도에 따라 이미지가 위아래로 밀리는 효과입니다. Lenis 스크롤 라이브러리의 velocity(속도) 값을 실시간으로 읽어, 빠르게 스크롤하면 이미지가 최대 ±50px까지 이동합니다. useSpring이 급격한 값 변화를 부드럽게 감쇠시켜 자연스러운 관성 느낌을 만듭니다.",
      en: "Images shift up or down based on scroll speed. It reads the velocity value from the Lenis scroll library in real-time — fast scrolling pushes images up to ±50px. useSpring smoothly dampens sudden value changes, creating a natural inertia feel.",
    },
    // media: "/videos/scroll-velocity.mp4",
    language: "javascript",
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
      ko: "텍스트에 마우스를 올리면 글자가 왼쪽부터 순서대로 외곽선만 남으며 비워지고, 마우스를 떼면 오른쪽부터 역순으로 색이 다시 채워지는 애니메이션입니다. 각 글자에 인덱스 × 0.04초의 딜레이를 줘서 순차 효과를 만들고, CSS text-stroke로 외곽선 상태를 유지합니다.",
      en: "When hovering over text, letters empty out to just outlines from left to right. On mouse leave, colors fill back in reverse order from right to left. Each character gets an index × 0.04s delay for the sequential effect, and CSS text-stroke maintains the outline state.",
    },
    // media: "/videos/stagger-text.mp4",
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
    title: "reCAPTCHA Lazy Loading",
    description: {
      ko: "Google reCAPTCHA 스크립트(~784KB)를 처음부터 로드하면 페이지 성능이 크게 저하됩니다. 이를 해결하기 위해 사용자가 실제로 클릭·터치·키보드 입력을 할 때까지 로드를 지연시킵니다. 타이머나 스크롤 이벤트는 Lighthouse 측정 중 자동으로 트리거되므로 의도적으로 제거했습니다.",
      en: "Loading the Google reCAPTCHA script (~784KB) upfront severely degrades page performance. To solve this, script loading is deferred until the user actually clicks, touches, or types. Timer and scroll events were intentionally removed since they auto-trigger during Lighthouse measurements.",
    },
    // media: "/videos/recaptcha-lazy.mp4",
    language: "javascript",
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
      ko: "프로젝트 카드가 좌우 양방향으로 끝없이 순환하는 가로 갤러리입니다. 콘텐츠를 여러 세트 복제하고, 연속된 인트로 요소 사이의 거리로 '한 세트 너비'를 계산합니다. rAF 루프에서 스크롤 위치가 ±3세트를 넘으면 한 세트만큼 순간이동(텔레포트)시켜, DOM 부담 없이 무한 스크롤을 구현합니다.",
      en: "A horizontal gallery where project cards loop infinitely in both directions. Content is duplicated in sets, and 'one set width' is calculated from the distance between consecutive intro elements. In the rAF loop, when scroll position exceeds ±3 sets, it teleports by one set width — achieving infinite scroll without DOM overhead.",
    },
    // media: "/videos/infinite-scroll.mp4",
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
    title: "i18n Layout Shift Prevention",
    description: {
      ko: "한국어와 영어는 같은 내용이라도 글자 수와 줄바꿈이 달라 언어 전환 시 레이아웃이 흔들립니다. 이를 방지하기 위해 각 텍스트 영역에 '최대 줄 수 × line-height' 만큼의 min-height를 em 단위로 지정하여 양쪽 언어 모두 동일한 공간을 확보합니다. 모바일은 세로 스크롤이라 시프트가 눈에 띄지 않으므로 해제합니다.",
      en: "Korean and English have different character counts and line breaks for the same content, causing layout shift on language switch. To prevent this, each text area gets a min-height in em units calculated as 'max lines × line-height', reserving consistent space for both languages. On mobile, vertical scrolling makes shift less noticeable, so it's disabled.",
    },
    // media: "/videos/i18n-layout.mp4",
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
];

export const troubleShootingItems: TroubleShootingItem[] = [
  {
    problem: {
      ko: "Lenis Scroll Velocity 효과 미작동",
      en: "Lenis Scroll Velocity Effect Not Working",
    },
    cause: {
      ko: "스크롤 속도에 따라 요소가 기울어지는 효과를 구현하려 했습니다. requestAnimationFrame으로 매 프레임마다 스크롤 위치를 읽고, 이전 프레임과의 차이(delta)로 velocity를 직접 계산했는데, 값이 들쑥날쑥하며 애니메이션이 떨리는 현상이 발생했습니다. Lenis가 내부적으로 스크롤을 보간(interpolation)하기 때문에, 외부에서 RAF로 읽은 위치값은 실제 스크롤 의도와 타이밍이 어긋나는 것이 원인이었습니다.",
      en: "I wanted to create an effect where elements tilt based on scroll speed. I used requestAnimationFrame to read the scroll position every frame and manually calculated velocity from the delta between frames. The values were erratic and animations jittered. The root cause was that Lenis internally interpolates scroll, so positions read externally via RAF were out of sync with the actual scroll intent and timing.",
    },
    solution: {
      ko: "RAF 폴링을 제거하고, Lenis의 네이티브 on('scroll') 이벤트 콜백으로 전환했습니다. 콜백 인자에서 인스턴스의 velocity 속성을 직접 읽으면 Lenis의 보간 주기와 완벽하게 동기화된 값을 얻을 수 있어, 부드러운 tilt 애니메이션이 구현되었습니다.",
      en: "Removed RAF polling and switched to Lenis's native on('scroll') event callback. Reading the velocity property directly from the instance in the callback gives values perfectly synchronized with Lenis's interpolation cycle, resulting in smooth tilt animations.",
    },
    keyInsight: {
      ko: "외부 라이브러리가 내부적으로 값을 계산하고 있다면, 같은 값을 직접 재계산하기보다 라이브러리가 제공하는 API를 통해 접근하는 것이 항상 더 정확합니다.",
      en: "When a library internally computes a value, accessing it through the library's own API is always more accurate than recalculating the same value externally.",
    },
  },
  {
    problem: {
      ko: "Framer Motion transform과 CSS transform 충돌",
      en: "Framer Motion Transform Conflicts with CSS Transform",
    },
    cause: {
      ko: "요소를 뷰포트 중앙에 배치하기 위해 CSS로 position: absolute + transform: translate(-50%, -50%)를 적용한 상태에서, Framer Motion의 y 속성으로 스크롤 기반 패럴랙스를 추가했습니다. 그런데 Framer Motion이 style에 transform을 직접 설정하면서 CSS의 translate(-50%, -50%)가 완전히 덮어씌워져, 요소가 중앙에서 벗어나 엉뚱한 위치로 이동했습니다.",
      en: "I positioned an element at the viewport center using CSS position: absolute + transform: translate(-50%, -50%), then added scroll-based parallax with Framer Motion's y property. However, Framer Motion sets transform directly on the style attribute, completely overwriting the CSS translate(-50%, -50%). The element jumped away from center to an unexpected position.",
    },
    solution: {
      ko: "CSS transform 대신 margin 기반 중앙 정렬(margin-left: -65%, margin-top: -65%)로 변경했습니다. transform 속성을 Framer Motion 전용으로 비워두면서도 시각적 중앙 배치를 유지할 수 있었습니다.",
      en: "Replaced CSS transform centering with margin-based centering (margin-left: -65%, margin-top: -65%). This keeps the transform property free for Framer Motion while maintaining the visual center positioning.",
    },
    keyInsight: {
      ko: "Framer Motion은 inline style로 transform을 제어합니다. CSS transform과 동일 속성을 공유하게 되면 충돌이 불가피하므로, 위치 잡기는 margin이나 inset 같은 별도 속성으로 분리해야 합니다.",
      en: "Framer Motion controls transform via inline styles. Sharing the same property with CSS transform inevitably causes conflicts, so positioning should be handled with separate properties like margin or inset.",
    },
  },
  {
    problem: {
      ko: "TypeScript useRef 타입 에러",
      en: "TypeScript useRef Type Error",
    },
    cause: {
      ko: "setTimeout의 반환값을 저장하기 위해 useRef<ReturnType<typeof setTimeout>>()을 사용했는데, 초기값을 넘기지 않아 타입이 MutableRefObject가 아닌 RefObject로 추론되었습니다. 이후 ref.current에 새 타이머를 할당하려 하면 \"읽기 전용 속성입니다\"라는 타입 에러가 발생했습니다.",
      en: "I used useRef<ReturnType<typeof setTimeout>>() to store setTimeout's return value but didn't pass an initial value. TypeScript inferred it as RefObject (read-only) instead of MutableRefObject. Attempting to assign a new timer to ref.current then threw a \"read-only property\" type error.",
    },
    solution: {
      ko: "useRef<ReturnType<typeof setTimeout> | undefined>(undefined)로 명시적 초기값을 전달했습니다. 초기값을 넘기면 TypeScript가 MutableRefObject로 추론하여 current에 자유롭게 할당할 수 있습니다. cleanup 시 clearTimeout(ref.current)도 undefined를 정상적으로 받아들입니다.",
      en: "Passed an explicit initial value: useRef<ReturnType<typeof setTimeout> | undefined>(undefined). Providing an initial value makes TypeScript infer MutableRefObject, allowing free assignment to current. clearTimeout(ref.current) also gracefully accepts undefined during cleanup.",
    },
    keyInsight: {
      ko: "React의 useRef는 초기값 유무에 따라 반환 타입이 달라집니다. DOM ref가 아닌 값 저장 용도라면 반드시 초기값을 넘겨 MutableRefObject를 얻어야 합니다.",
      en: "React's useRef returns different types depending on whether an initial value is provided. For storing values (not DOM refs), always pass an initial value to get MutableRefObject.",
    },
  },
  {
    problem: {
      ko: "GSAP ScrollTrigger 수평 무한 스크롤 구현",
      en: "Implementing Horizontal Infinite Scroll with GSAP ScrollTrigger",
    },
    cause: {
      ko: "GSAP ScrollTrigger로 가로 스크롤을 구현했지만, 스크롤 가능한 범위가 유한하기 때문에 끝에 도달하면 더 이상 진행할 수 없었습니다. wrap() 유틸리티로 위치를 순환시키는 방법도 시도했지만, 스크롤 진행도(progress)가 1에 도달하면 역방향으로 돌아가는 듯한 시각적 끊김이 발생했습니다.",
      en: "I implemented horizontal scroll with GSAP ScrollTrigger, but the scrollable range was finite—reaching the end meant no further progression. Trying to cycle positions with the wrap() utility caused visual snapping when scroll progress hit 1 and appeared to reverse direction.",
    },
    solution: {
      ko: "스크롤 가능 거리를 실제 콘텐츠 폭의 10배로 크게 설정한 뒤, onUpdate 콜백에서 modulo 연산으로 컨테이너의 x 위치를 콘텐츠 폭 단위로 순환시켰습니다. 사용자는 끝에 도달할 일 없이 한 방향으로 계속 스크롤하며, 시각적으로는 콘텐츠가 무한히 반복됩니다.",
      en: "Set the scrollable distance to 10x the actual content width, then in the onUpdate callback used modulo to cycle the container's x position in content-width increments. Users never reach the end and keep scrolling in one direction while content visually loops infinitely.",
    },
    keyInsight: {
      ko: "무한 스크롤의 핵심은 스크롤 위치를 텔레포트하는 것이 아니라, 충분히 긴 스크롤 범위 안에서 시각적 위치만 루프시키는 것입니다. 사용자의 물리적 스크롤 흐름을 끊지 않으면서 무한한 느낌을 줄 수 있습니다.",
      en: "The key to infinite scroll isn't teleporting scroll position, but looping only the visual position within a sufficiently long scroll range. This gives an infinite feel without disrupting the user's physical scroll flow.",
    },
  },
  {
    problem: {
      ko: "reCAPTCHA v3 초기 로드 성능 저하 (LCP 17.1s, TTI 18.2s)",
      en: "reCAPTCHA v3 Initial Load Performance Degradation (LCP 17.1s, TTI 18.2s)",
    },
    cause: {
      ko: "GoogleReCaptchaProvider를 앱 루트에 감싸는 공식 권장 방식을 따랐더니, 페이지 로드 즉시 ~784KB의 reCAPTCHA JS가 다운로드되었습니다. 메인 스레드를 280ms 동안 차단하고, Google 도메인에 대한 Preconnect 힌트가 없어 DNS/TLS 핸드셰이크에만 400ms가 추가로 소요되면서 LCP가 17초까지 치솟았습니다.",
      en: "Following the official recommendation of wrapping GoogleReCaptchaProvider at the app root caused ~784KB of reCAPTCHA JS to download immediately on page load. It blocked the main thread for 280ms, and without Preconnect hints for Google's domain, DNS/TLS handshake added another 400ms—pushing LCP to 17 seconds.",
    },
    solution: {
      ko: "reCAPTCHA 로드를 사용자의 첫 인터랙션(click/touch/keydown) 시점으로 지연시켰습니다. 추가로 Google 도메인에 대한 Preconnect 힌트를 <head>에 삽입하고, WCAG 접근성 이슈(색상 대비, heading 순서, aria-label 누락)도 함께 수정했습니다.",
      en: "Deferred reCAPTCHA loading to the user's first interaction (click/touch/keydown). Also added Preconnect hints for Google's domain in <head>, and fixed WCAG accessibility issues (color contrast, heading order, missing aria-labels).",
    },
    keyInsight: {
      ko: "서드파티 스크립트는 \"언제 필요한가\"를 기준으로 로드 시점을 결정해야 합니다. Contact 폼의 reCAPTCHA처럼 초기 뷰에서 불필요한 스크립트를 즉시 로드하면, 정작 사용자가 보는 콘텐츠의 렌더링이 수 초씩 지연됩니다.",
      en: "Third-party script loading should be timed based on \"when is it actually needed.\" Loading scripts like reCAPTCHA (only needed for the Contact form) immediately delays rendering of the content users actually see by several seconds.",
    },
  },
  {
    problem: {
      ko: "미사용 폰트로 인한 리소스 낭비 (폰트 19파일, 페이지 1,489KB)",
      en: "Resource Waste from Unused Fonts (19 Files, 1,489KB Page Weight)",
    },
    cause: {
      ko: "next/font/google로 9개 폰트 패밀리를 등록해두었는데, 실제 CSS에서 참조하는 것은 5개뿐이었습니다. 나머지 4개(IBM Plex Mono, Bebas Neue, Cormorant Garamond, Abril Fatface)는 디자인 실험 중 추가한 뒤 제거하지 않은 것이었습니다. next/font는 등록만으로도 폰트 파일을 빌드에 포함시키기 때문에, 실제로 사용하지 않는 12개의 폰트 파일이 그대로 다운로드되고 있었습니다.",
      en: "I had registered 9 font families via next/font/google, but only 5 were actually referenced in CSS. The remaining 4 (IBM Plex Mono, Bebas Neue, Cormorant Garamond, Abril Fatface) were leftover from design experiments and never removed. Since next/font includes font files in the build just by registration, 12 unused font files were being downloaded.",
    },
    solution: {
      ko: "미사용 폰트 4개를 제거하고(12파일 절약), Inter의 가중치를 7개에서 실제 사용하는 5개로 줄였습니다. 모든 폰트에 font-display: swap을 추가해 폰트 로딩 중에도 텍스트가 보이도록 하고, reCAPTCHA의 4초 타이머 폴백도 제거했습니다.",
      en: "Removed 4 unused fonts (12 files saved), reduced Inter from 7 to 5 actually-used weights. Added font-display: swap to all fonts so text remains visible during loading, and removed reCAPTCHA's 4-second timer fallback.",
    },
    keyInsight: {
      ko: "next/font는 등록 = 다운로드입니다. 사용하지 않는 폰트도 빌드에 포함되므로, 정기적으로 등록된 폰트와 CSS 참조를 대조해야 합니다. 이 정리만으로 Performance 점수가 60에서 98로, 페이지 용량이 70% 감소했습니다.",
      en: "With next/font, registration = download. Unused fonts are still included in the build, so registered fonts should be regularly cross-referenced with CSS usage. This cleanup alone improved the Performance score from 60 to 98 and reduced page weight by 70%.",
    },
  },
  {
    problem: {
      ko: "Works 가로 갤러리 양방향 무한 스크롤",
      en: "Bidirectional Infinite Scroll for Works Horizontal Gallery",
    },
    cause: {
      ko: "프로젝트 카드를 10세트 복제하여 가로로 나열했지만, 복제된 세트에는 양쪽 끝이 존재합니다. 왼쪽이나 오른쪽 끝에 도달하면 콘텐츠가 없는 빈 화면이 노출되어, 진정한 무한 스크롤이 아닌 \"매우 긴 유한 스크롤\"에 불과했습니다.",
      en: "I duplicated project cards into 10 sets laid out horizontally, but duplicated sets still have two ends. Reaching either end exposed empty white space, making it a \"very long finite scroll\" rather than true infinite scroll.",
    },
    solution: {
      ko: "한 세트의 정확한 폭(oneSetWidth)을 연속된 인트로 요소의 offsetLeft 차이로 계산합니다. rAF 렌더 루프에서 현재 스크롤 위치가 세트 경계를 넘을 때마다 while문으로 양방향 래핑하여 scrollX와 targetScrollX를 순환시킵니다. 시각적으로는 끊김 없이 양방향 무한 스크롤이 됩니다.",
      en: "Calculated the exact width of one set (oneSetWidth) from the offsetLeft difference of consecutive intro elements. In the rAF render loop, whenever the scroll position crosses a set boundary, a while loop wraps both scrollX and targetScrollX bidirectionally. Visually, this creates seamless infinite scroll in both directions.",
    },
    keyInsight: {
      ko: "무한 스크롤은 DOM을 무한히 복제하는 것이 아니라, 유한한 콘텐츠 위에서 스크롤 위치만 순환시키는 것입니다. 콘텐츠 3세트면 충분하고, 나머지는 수학적 래핑이 해결합니다.",
      en: "Infinite scroll isn't about infinitely duplicating DOM—it's about cycling scroll position over finite content. Three content sets are enough; mathematical wrapping handles the rest.",
    },
  },
  {
    problem: {
      ko: "언어 전환 시 Works 인트로 레이아웃 시프트",
      en: "Layout Shift in Works Intro on Language Switch",
    },
    cause: {
      ko: "한국어와 영어는 같은 내용이라도 텍스트 길이가 크게 다릅니다. 언어를 전환하면 줄바꿈 위치가 바뀌면서 텍스트 블록의 높이가 변하고, justify-content: center가 적용된 flex 컨테이너가 남는 공간을 재분배하면서 인접 요소들이 갑자기 위아래로 밀려나는 시프트가 발생했습니다.",
      en: "Korean and English text have significantly different lengths for the same content. Switching languages changes line break positions, altering text block height. The flex container with justify-content: center redistributed the remaining space, causing adjacent elements to suddenly shift up or down.",
    },
    solution: {
      ko: "텍스트 영역에 min-height를 em 단위(예상 최대 줄 수 × line-height)로 지정하여, 어떤 언어든 동일한 공간이 예약되도록 했습니다. 모바일에서는 세로 스크롤 레이아웃이므로 min-height: auto로 리셋하여 불필요한 여백을 방지했습니다.",
      en: "Set min-height on text areas in em units (expected max lines × line-height) to reserve identical space regardless of language. On mobile, where the layout switches to vertical scroll, min-height resets to auto to prevent unnecessary whitespace.",
    },
    keyInsight: {
      ko: "다국어 UI에서는 가장 긴 언어 기준으로 공간을 예약하는 것이 레이아웃 안정성의 핵심입니다. em 단위를 사용하면 font-size가 바뀌어도 비례하여 자동 조정됩니다.",
      en: "In multilingual UIs, reserving space based on the longest language is key to layout stability. Using em units ensures proportional auto-adjustment even when font-size changes.",
    },
  },
];
