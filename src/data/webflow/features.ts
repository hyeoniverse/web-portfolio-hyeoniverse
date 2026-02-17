import type { DesignFeature } from "./types";

export const designFeatures: DesignFeature[] = [
  {
    icon: "01",
    title: "Infinite Scroll Loop",
    description: {
      ko: "Lenis smooth scroll과 무한 루프를 결합하여 끊김 없는 순환 스크롤 경험을 구현했습니다.",
      en: "Implemented seamless circular scroll experience by combining Lenis smooth scroll with infinite loop.",
    },
    tech: ["Lenis", "Infinite Scroll", "Bridge Section"],
    image: "https://images.unsplash.com/photo-1739981824648-12121c92d702?w=800&q=80",
  },
  {
    icon: "02",
    title: "Mouse Parallax",
    description: {
      ko: "Framer Motion의 useSpring과 useTransform을 활용한 마우스 반응형 패럴랙스 효과를 적용했습니다.",
      en: "Applied mouse-responsive parallax effects using Framer Motion's useSpring and useTransform.",
    },
    tech: ["Framer Motion", "useMotionValue", "Parallax"],
    image: "https://images.unsplash.com/photo-1521729839347-131a32f9abcb?w=800&q=80",
  },
  {
    icon: "03",
    title: "Scroll-Triggered Animations",
    description: {
      ko: "GSAP ScrollTrigger로 스크롤 위치에 따라 자연스럽게 등장하는 요소들을 구현했습니다.",
      en: "Implemented naturally appearing elements based on scroll position using GSAP ScrollTrigger.",
    },
    tech: ["GSAP", "ScrollTrigger", "once: true"],
    image: "https://images.unsplash.com/photo-1741099660208-21b2bdaee8d2?w=800&q=80",
  },
  {
    icon: "04",
    title: "Mix-Blend Navigation",
    description: {
      ko: "mix-blend-mode: difference를 활용해 배경에 따라 자동으로 반전되는 네비게이션을 구현했습니다.",
      en: "Implemented auto-inverting navigation based on background using mix-blend-mode: difference.",
    },
    tech: ["CSS Blend Mode", "Fixed Nav", "z-index"],
    image: "https://images.unsplash.com/photo-1756259291906-873f00c0866d?w=800&q=80",
  },
  {
    icon: "05",
    title: "StaggerText Animation",
    description: {
      ko: "텍스트를 개별 문자로 분리하여 호버 시 순차적 외곽선 애니메이션을 구현했습니다. 호버 해제 시 역순으로 색상이 채워지며 stroke가 유지됩니다.",
      en: "Split text into individual characters for sequential outline animation on hover. On hover release, colors fill in reverse order while stroke is maintained.",
    },
    tech: ["React State", "CSS text-stroke", "Stagger Delay"],
    image: "https://images.unsplash.com/photo-1446688568582-55ddb4b37cad?w=800&q=80",
  },
  {
    icon: "06",
    title: "Lighthouse Performance Optimization",
    description: {
      ko: "2차에 걸친 Lighthouse 분석 기반 성능 최적화. 미사용 폰트 4개(12파일) 제거, reCAPTCHA 인터랙션 기반 지연 로딩, font-display:swap 적용으로 모바일 Performance 60→98점, 페이지 용량 70% 감소를 달성했습니다.",
      en: "Performance optimization based on two rounds of Lighthouse analysis. Removed 4 unused fonts (12 files), implemented interaction-based lazy loading for reCAPTCHA, applied font-display:swap to achieve mobile Performance 60→98, and reduced page size by 70%.",
    },
    tech: ["Font Optimization", "Lazy Loading", "font-display", "browserslist"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  },
  {
    icon: "07",
    title: "Works Horizontal Gallery",
    description: {
      ko: "GSAP requestAnimationFrame 기반 가로 스크롤 갤러리. 인트로 섹션을 인플로우 아이템으로 배치하고, oneSetWidth 래핑으로 양방향 무한 스크롤을 구현했습니다. 언어 전환 시 min-height로 레이아웃 시프트를 방지합니다.",
      en: "Horizontal scroll gallery based on GSAP requestAnimationFrame. Placed intro section as an in-flow item, implemented bidirectional infinite scroll with oneSetWidth wrapping. Prevents layout shift during language switching with min-height.",
    },
    tech: ["GSAP", "Infinite Wrapping", "i18n Layout", "Responsive"],
    image: "https://images.unsplash.com/photo-1758380742154-44738eb92832?w=800&q=80",
  },
  {
    icon: "08",
    title: "Dark/Light Theme System",
    description: {
      ko: "CSS Variables 기반 다크/라이트 테마 시스템. data-theme 속성 전환과 전역 transition으로 모든 컴포넌트가 자연스럽게 테마에 반응합니다.",
      en: "Dark/light theme system based on CSS Variables. All components respond naturally to theme changes via data-theme attribute switching and global transitions.",
    },
    tech: ["CSS Variables", "data-theme", "Context API", "localStorage"],
    image: "https://images.unsplash.com/photo-1750996017360-48d87c71a41c?w=800&q=80",
  },
  {
    icon: "09",
    title: "Bilingual i18n Support",
    description: {
      ko: "한국어/영어 이중 언어 지원. LanguageProvider를 통한 전역 언어 상태 관리와 각 컴포넌트의 LocalizedText 타입으로 타입 안전한 다국어 시스템을 구현했습니다.",
      en: "Korean/English bilingual support. Implemented a type-safe multilingual system with global language state management via LanguageProvider and LocalizedText types across all components.",
    },
    tech: ["Context API", "TypeScript Generics", "LocalizedText", "SSR-safe"],
    image: "https://images.unsplash.com/photo-1706403615881-d83dc2067c5d?w=800&q=80",
  },
  {
    icon: "10",
    title: "3D Scroll Torus",
    description: {
      ko: "Three.js(React Three Fiber) 기반 3D 메탈릭 토러스가 스크롤에 연동되어 화면 위를 떠다닙니다. Lenis 누적 스크롤을 추적하여 리사주 곡선 경로를 따라 회전·이동하며, 다크/라이트 테마별 머티리얼과 모바일 geometry 간소화를 적용했습니다.",
      en: "A metallic 3D torus built with Three.js (React Three Fiber) floats across the screen, driven by scroll. It tracks cumulative Lenis scroll to follow a Lissajous curve path with continuous rotation, featuring theme-adaptive materials and optimized mobile geometry.",
    },
    tech: ["Three.js", "React Three Fiber", "Lissajous Curve", "Environment Map"],
    image: "https://images.unsplash.com/photo-1684569547117-e2d19fc6d796?w=800&q=80",
  },
  {
    icon: "11",
    title: "Mobile Torus Touch Repulsion",
    description: {
      ko: "모바일에서 3D 토러스에 터치/클릭 반발 인터랙션을 구현했습니다. R3F Canvas가 pointer-events를 차단하므로 window 이벤트를 수동 추적하여 NDC 좌표로 변환, 자석 존과 반발 존의 이중 물리 시스템을 적용했습니다.",
      en: "Implemented touch/click repulsion interaction for the 3D torus on mobile. Since R3F Canvas blocks pointer-events, manually tracked window events and converted to NDC coordinates, applying a dual physics system of attraction and repulsion zones.",
    },
    tech: ["Touch Events", "NDC Coordinates", "Dual-Zone Physics", "R3F Canvas"],
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80",
  },
  {
    icon: "12",
    title: "Runtime Performance Optimization",
    description: {
      ko: "프로젝트 전체 런타임 성능 최적화. Hero/마퀴 애니메이션을 CSS animation으로 전환(컴포지터 스레드), useMagneticRepel의 60fps React 리렌더를 ref 기반 직접 DOM 조작으로 제거, Three.js FrontSide 렌더링과 geometry dispose로 GPU 최적화를 달성했습니다.",
      en: "Comprehensive runtime performance optimization. Moved Hero/marquee animations to CSS animation (compositor thread), eliminated 60fps React re-renders in useMagneticRepel with ref-based direct DOM manipulation, and optimized GPU usage with Three.js FrontSide rendering and geometry disposal.",
    },
    tech: ["CSS Animation", "requestAnimationFrame", "GPU Optimization", "Direct DOM"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  },
];
