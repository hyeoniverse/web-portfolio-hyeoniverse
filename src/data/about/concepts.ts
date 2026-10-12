import type { DesignConceptItem } from "./types";

export const designConcepts: DesignConceptItem[] = [
  {
    id: "typography",
    title: "TYPOGRAPHY",
    subtitle: {
      ko: "역할마다 서체 하나",
      en: "One Typeface per Role",
    },
    description: {
      ko: "본문 · UI 는 Pretendard 하나로 맞추고, 화면 제목과 장식은 Instrument Serif · Playfair(한글은 나눔명조), 코드는 JetBrains Mono, 내비게이션은 Space Grotesk 를 씁니다. 글자는 크기 · 줄간격 · 굵기를 묶은 역할 토큰으로 고릅니다.",
      en: "Body and UI text share one family, Pretendard; screen titles and decoration use Instrument Serif and Playfair (Nanum Myeongjo for Korean), code uses JetBrains Mono, and navigation uses Space Grotesk. Text is set through role tokens that bundle size, leading and weight.",
    },
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80",
  },
  {
    id: "color",
    title: "COLOR SYSTEM",
    subtitle: {
      ko: "다크/라이트 듀얼 팔레트",
      en: "Dark/Light Dual Palette",
    },
    description: {
      ko: "팔레트(원시) → 역할(글자 · 배경 · 테두리) → 컴포넌트 세 층의 토큰으로 색을 정하고, 역할 토큰 안의 light-dark() 로 다크 · 라이트를 한 번에 바꿉니다. 컴포넌트는 역할 색만 쓰고, 역할 쌍마다 WCAG 대비를 잽니다.",
      en: "Colors follow three token layers — palette (raw) → role (text, surface, border) → component — and light-dark() inside role tokens switches dark and light at once. Components use role colors only, and every role pair's WCAG contrast is measured.",
    },
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
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
    image: "https://images.unsplash.com/photo-1545235617-9465d2a55698?w=800&q=80",
  },
  {
    id: "layout",
    title: "LAYOUT & SPACING",
    subtitle: {
      ko: "일관된 스페이싱 스케일",
      en: "Consistent Spacing Scale",
    },
    description: {
      ko: "간격은 이름이 px 값인 눈금(--spacing-0 부터 --spacing-128 까지)으로 정하고, 배지 · 행 · 모달 · 카드의 안쪽 여백은 역할 토큰으로 묶어 모든 컴포넌트에 같은 간격을 적용합니다.",
      en: "Spacing uses a scale named by its px value (--spacing-0 to --spacing-128), and the inner padding of badges, rows, modals and cards is bundled into role tokens so every component spaces alike.",
    },
    image: "https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?w=800&q=80",
  },
  {
    id: "grid",
    title: "GRID SYSTEM",
    subtitle: {
      ko: "작은 화면 기본 · 컨테이너 쿼리",
      en: "Small-Screen First · Container Queries",
    },
    description: {
      ko: "작은 화면을 기본으로 쓰고 480 · 768 · 1024 · 1280px 에서 넓혀 갑니다. 페이지 골격은 화면 폭을, 컴포넌트는 자기 칸의 폭(컨테이너 쿼리)을 보고 배치를 바꿉니다. 높이는 모바일 주소창을 고려해 svh · dvh 로 잽니다.",
      en: "Layouts start from the small screen and widen at 480, 768, 1024 and 1280px. Page skeletons respond to the viewport, components to their own box (container queries), and heights use svh and dvh to account for mobile address bars.",
    },
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80",
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
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80",
  },
];
