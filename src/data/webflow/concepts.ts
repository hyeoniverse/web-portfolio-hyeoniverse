import type { DesignConceptItem } from "./types";

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
