import type { ProcessStep } from "./types";

export const designProcess: ProcessStep[] = [
  {
    step: "01",
    title: {
      ko: "설계 및 디자인 시스템 구축",
      en: "Design System & Foundation",
    },
    description: {
      ko: "**CSS Variables** 기반 디자인 토큰을 정의하고, **다크/라이트 테마** 전환 시스템과 **CSS Modules 캡슐화 구조를 설계**했습니다. 타이포그래피, 색상, 간격 체계를 확립하고 전체 레이아웃의 기반을 잡았습니다.",
      en: "Defined design tokens based on **CSS Variables**, and established a **dark/light theme** switching system with **CSS Modules encapsulation.** Established typography, color, and spacing systems that form the foundation of the entire layout.",
    },
  },
  {
    step: "02",
    title: {
      ko: "UI 컴포넌트와 인터랙션 구현",
      en: "UI Components & Interaction",
    },
    description: {
      ko: "**Hero** 섹션, **Navigation**, **Contact Drawer**, **Loading Screen** 등 주요 UI 컴포넌트를 구현했습니다. 각 컴포넌트의 움직임은 **GSAP**과 **Framer Motion**으로 처리해 Image Velocity, StaggerText, Mouse Parallax, Magnetic Hover 를 만들었습니다. 스크롤 속도와 마우스 움직임에 **스프링 감쇠**로 반응하도록 해서, 값이 목표치로 점차 수렴하며 멈춥니다.",
      en: "Built the core UI components — **Hero** section, **Navigation**, **Contact Drawer**, and **Loading Screen**. Their motion runs on **GSAP** and **Framer Motion**: Image Velocity, StaggerText, Mouse Parallax, and Magnetic Hover. Each responds to scroll speed and pointer movement with **spring damping**, so values converge on their target and settle instead of snapping.",
    },
  },
  {
    step: "03",
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
    step: "04",
    title: { ko: "성능 최적화", en: "Performance Optimization" },
    description: {
      ko: "**Lighthouse CLI**로 프로덕션 빌드를 측정하며 2차에 걸쳐 최적화를 진행했습니다. reCAPTCHA를 **invisible 모드 + 지연 로딩**으로 전환하고, 미사용 폰트 4종(12파일)을 제거하여 페이지 용량을 **70% 절감**, 모바일 **Performance 98점**을 달성했습니다.",
      en: "Measured production builds with **Lighthouse CLI** through two rounds of optimization. Switched reCAPTCHA to **invisible mode with lazy loading**, removed 4 unused font families (12 files), reduced page weight by **70%**, and achieved a mobile **Performance score of 98**.",
    },
  },
  {
    step: "05",
    title: {
      ko: "문서화 및 프로젝트 회고",
      en: "Documentation & Project Retrospective",
    },
    description: {
      ko: "기술 선택의 이유, 문제 해결 과정, 아키텍처 구조를 기록하는 **About 페이지**를 구현했습니다. Code Highlights, Design Decisions, Architecture 시각화 등 **15개 패널**을 데스크톱 가로 스크롤과 모바일 세로 레이아웃으로 완성했습니다.",
      en: "Built the **About page** documenting technology choices, problem-solving processes, and architecture structure. Completed **15 panels** — Code Highlights, Design Decisions, Architecture visualization, and more — desktop horizontal scroll and mobile vertical layout.",
    },
  },
];
