import type { DesignConceptItem } from "./types";

export const designPhilosophy: DesignConceptItem[] = [
  {
    id: "oval",
    title: "THE OVAL",
    subtitle: {
      ko: "하나의 형태, 하나의 토큰",
      en: "One Shape, One Token",
    },
    description: {
      ko: "로고 → 커서 트레일 → 버튼 → 카드 모서리 → Floating Object. 타원 형태를 점진적으로 확장했고, --radius-capsule 토큰 하나로 전체 곡률을 통제합니다. 개별 요소가 아닌 하나의 시스템으로 관리되기 때문에 테마가 바뀌어도 형태 언어는 유지됩니다.",
      en: "Logo → cursor trail → buttons → card corners → Floating Objects. The oval expanded progressively, and a single --radius-capsule token controls all curvature. Because it's managed as one system rather than individual elements, the visual language holds across different themes.",
    },
    examples: ["--radius-capsule", "CursorTrail", "CTA Buttons", "Floating Object"],
  },
  {
    id: "line-curve",
    title: "LINE & CURVE",
    subtitle: {
      ko: "정적일 땐 직교, 동적일 땐 곡선",
      en: "Orthogonal at Rest, Curved in Motion",
    },
    description: {
      ko: "CSS Grid 기반 레이아웃은 직교 정렬을 유지합니다. 움직임이 시작되는 순간 — GSAP 트윈의 cubic-bezier, Lenis의 lerp 보간, 호버 시 ease-out — 에만 곡선이 개입합니다. 초기에는 linear easing을 사용했지만 기계적인 느낌이 강해 전환했습니다.",
      en: "CSS Grid layouts maintain orthogonal alignment. Curves only enter when motion begins — cubic-bezier in GSAP tweens, lerp interpolation in Lenis, ease-out on hover. Linear easing was used initially but felt too mechanical, leading to the switch.",
    },
    examples: ["cubic-bezier", "Lenis lerp", "CSS Grid", "ease-out Hover"],
  },
  {
    id: "depth",
    title: "DEPTH & LAYER",
    subtitle: {
      ko: "스크롤 = 깊이",
      en: "Scroll = Depth",
    },
    description: {
      ko: "가로 스크롤 진행률이 곧 기술적 깊이입니다. Overview → Features → Design → Tech → Code → Troubleshooting. 하단 dot nav가 현재 위치를 시각화하고, useHorizontalScroll 훅이 무한 루프와 위치 추적을 처리합니다. 앞쪽만 보고 나가도, 끝까지 가도 성립하는 구조입니다.",
      en: "Horizontal scroll progress maps directly to technical depth. Overview → Features → Design → Tech → Code → Troubleshooting. The bottom dot nav visualizes current position, and useHorizontalScroll handles infinite looping and tracking. The structure works whether you leave early or read through to the end.",
    },
    examples: ["useHorizontalScroll", "Dot Nav", "Infinite Scroll"],
  },
  {
    id: "space",
    title: "NEGATIVE SPACE",
    subtitle: {
      ko: "뺀 것이 넣은 것보다 많은 디자인",
      en: "More Was Removed Than Added",
    },
    description: {
      ko: "--editorial-space-* 토큰이 패널 패딩, 텍스트 간격, 섹션 거리를 일괄 관리합니다. Tech Stack과 Code 사이에 배치된 Visual Break 패널은 100vw 전체가 빈 공간입니다. 밀집 구간 사이에서 시선이 리셋되어야 각 섹션이 개별적으로 인식됩니다.",
      en: "The --editorial-space-* tokens manage panel padding, text gaps, and section distances in one place. The Visual Break panel between Tech Stack and Code is 100vw of empty space. A visual reset between dense sections is what makes each one register individually.",
    },
    examples: ["--editorial-space-*", "Visual Break", "Spacing Tokens"],
  },
];
