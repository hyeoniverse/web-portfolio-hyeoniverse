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
    title: { ko: "핵심 UI 컴포넌트 개발", en: "Core UI Component Development" },
    description: {
      ko: "**Hero** 섹션, **Navigation**, **Contact Drawer**, **Loading Screen** 등 주요 UI 컴포넌트를 구현했습니다. 네비게이션의 언어·테마 버튼에 **flip/pop 애니메이션**을 적용하고, 로딩 화면에 **001→100 카운팅 애니메이션**을 추가하는 등 각 컴포넌트의 인터랙션을 설계했습니다.",
      en: "Built core UI components including **Hero** section, **Navigation**, **Contact Drawer**, and **Loading Screen**. Applied **flip/pop animations** to the navigation's language and theme buttons, added a **001→100 counting animation** to the loading screen, and designed interactions for each component.",
    },
  },
  {
    step: "03",
    title: { ko: "인터랙션 및 모션 디자인", en: "Interaction & Motion Design" },
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
    title: { ko: "성능 최적화", en: "Performance Optimization" },
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
      ko: "기술 선택의 이유, 문제 해결 과정, 아키텍처 구조를 기록하는 **Webflow 페이지**를 구현했습니다. Code Highlights, Troubleshooting, Architecture 시각화 등 **6개 패널**을 데스크톱 가로 스크롤과 모바일 세로 레이아웃으로 완성했습니다.",
      en: "Built the **Webflow page** documenting technology choices, problem-solving processes, and architecture structure. Completed **6 panels** — Code Highlights, Troubleshooting, Architecture visualization, and more — desktop horizontal scroll and mobile vertical layout.",
    },
  },
];
