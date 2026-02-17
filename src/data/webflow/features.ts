import type { DesignFeature } from "./types";

export const designFeatures: DesignFeature[] = [
  {
    icon: "01",
    title: "Infinite Scroll Loop",
    description: {
      ko: "페이지 끝에 도달해도 끊김 없이 처음으로 돌아가는 무한 스크롤을 구현했습니다.",
      en: "Scroll reaches the end and seamlessly loops back to the beginning — an infinite, never-ending experience.",
    },
    tech: ["Lenis", "Infinite Scroll", "Bridge Section"],
    image: "https://images.unsplash.com/photo-1663856542282-bf5647286f63?w=800&q=80",
  },
  {
    icon: "02",
    title: "Mouse Parallax",
    description: {
      ko: "마우스를 움직이면 배경 요소들이 서로 다른 속도로 움직여 입체감을 만들어냅니다.",
      en: "Move your mouse and background layers shift at different speeds, creating a sense of depth.",
    },
    tech: ["Framer Motion", "useMotionValue", "Parallax"],
    image: "https://images.unsplash.com/photo-1730430192070-f7713dc86fbf?w=800&q=80",
  },
  {
    icon: "03",
    title: "Scroll-Triggered Animations",
    description: {
      ko: "스크롤에 따라 각 요소가 자연스럽게 나타나는 등장 애니메이션을 적용했습니다.",
      en: "Elements gracefully appear as you scroll down the page.",
    },
    tech: ["GSAP", "ScrollTrigger", "once: true"],
    image: "https://images.unsplash.com/photo-1645904713415-2bbe59aa2f31?w=800&q=80",
  },
  {
    icon: "04",
    title: "Mix-Blend Navigation",
    description: {
      ko: "어떤 배경 위에서든 항상 잘 보이도록 자동으로 색이 반전되는 네비게이션입니다.",
      en: "Navigation text automatically inverts its color to stay visible against any background.",
    },
    tech: ["CSS Blend Mode", "Fixed Nav", "z-index"],
    image: "https://images.unsplash.com/photo-1648400409242-1a2f2df58e3e?w=800&q=80",
  },
  {
    icon: "05",
    title: "StaggerText Animation",
    description: {
      ko: "마우스를 올리면 글자가 하나씩 순서대로 외곽선으로 바뀌고, 떼면 역순으로 다시 채워집니다.",
      en: "Hover over text — letters turn to outlines one by one. Move away, and they fill back in reverse.",
    },
    tech: ["React State", "CSS text-stroke", "Stagger Delay"],
    image: "https://images.unsplash.com/photo-1558707538-c56435bdcdf3?w=800&q=80",
  },
  {
    icon: "06",
    title: "Performance Optimization",
    description: {
      ko: "성능 분석을 통해 모바일 성능 점수를 60점에서 98점으로 끌어올리고, 페이지 용량을 70% 줄였습니다.",
      en: "Boosted mobile performance score from 60 to 98 and reduced page size by 70% through optimization.",
    },
    tech: ["Font Optimization", "Lazy Loading", "font-display", "browserslist"],
    image: "https://images.unsplash.com/photo-1557920982-fe9c098511d2?w=800&q=80",
  },
  {
    icon: "07",
    title: "Works Horizontal Gallery",
    description: {
      ko: "작품들을 좌우로 스크롤하며 감상할 수 있는 가로 갤러리입니다. 양방향 무한 스크롤을 지원합니다.",
      en: "Browse works by scrolling sideways in a horizontal gallery with infinite scrolling in both directions.",
    },
    tech: ["GSAP", "Infinite Wrapping", "i18n Layout", "Responsive"],
    image: "https://images.unsplash.com/photo-1762928289094-197055a5d5c3?w=800&q=80",
  },
  {
    icon: "08",
    title: "Dark / Light Theme",
    description: {
      ko: "다크 모드와 라이트 모드를 전환하면 모든 요소가 부드럽게 테마에 맞춰 변합니다.",
      en: "Switch between dark and light modes — every element smoothly transitions to match the theme.",
    },
    tech: ["CSS Variables", "data-theme", "Context API", "localStorage"],
    image: "https://images.unsplash.com/photo-1764610144010-6914d3672533?w=800&q=80",
  },
  {
    icon: "09",
    title: "3D Scroll Torus",
    description: {
      ko: "스크롤하면 화면 위를 떠다니는 금속 느낌의 3D 도넛 오브젝트입니다. 테마에 따라 질감이 바뀝니다.",
      en: "A metallic 3D donut floats across the screen as you scroll, with its texture adapting to the theme.",
    },
    tech: ["Three.js", "React Three Fiber", "Lissajous Curve", "Environment Map"],
    image: "https://images.unsplash.com/photo-1639542270103-0e94fc28be38?w=800&q=80",
  },
];
