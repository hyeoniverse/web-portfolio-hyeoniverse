// 작품 페이지 프로젝트 데이터

import type { Language } from "@/providers/LanguageProvider";

export type CardSize = "large" | "small" | "medium" | "tall" | "wide";

export type LocalizedText = Record<Language, string>;

export interface Project {
  id: string;
  number: string;
  title: string;
  subtitle: LocalizedText;
  category: LocalizedText;
  year: string;
  description: LocalizedText;
  role: LocalizedText;
  tech: string[];
  image: string;
  size: CardSize;
  /* ── Detail page fields ── */
  overview: LocalizedText;
  challenge: LocalizedText;
  solution: LocalizedText;
  gallery: string[];
  liveUrl?: string;
  githubUrl?: string;
}

export const projects: Project[] = [
  {
    id: "1",
    number: "01",
    title: "Sakharov Space",
    subtitle: { ko: "지평선 너머", en: "Beyond the Horizon" },
    category: { ko: "브랜딩 / 웹 디자인", en: "Branding / Web Design" },
    year: "2024",
    description: {
      ko: "우주 탐사 스타트업을 위한 브랜드 아이덴티티 및 웹 경험 디자인",
      en: "Brand identity and web experience design for a space exploration startup",
    },
    role: { ko: "리드 디자이너", en: "Lead Designer" },
    tech: ["Figma", "Next.js", "Three.js", "GSAP", "Tailwind CSS"],
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&h=700&fit=crop",
    size: "large",
    overview: {
      ko: "Sakharov Space는 민간 우주 탐사를 선도하는 스타트업입니다. 우주의 광활함과 인류의 도전 정신을 담은 브랜드 아이덴티티를 설계하고, 몰입감 있는 3D 웹 경험을 구현했습니다. 랜딩 페이지에서 로켓 발사 시뮬레이션을 Three.js로 구현하여 방문자가 우주 탐사의 스릴을 직접 체감할 수 있도록 했습니다.",
      en: "Sakharov Space is a startup pioneering private space exploration. I designed a brand identity capturing the vastness of space and humanity's spirit of adventure, then built an immersive 3D web experience. The landing page features a rocket launch simulation built with Three.js, letting visitors experience the thrill of space exploration firsthand.",
    },
    challenge: {
      ko: "기술적으로 복잡한 우주 산업을 일반 대중에게 친근하게 전달하면서도, 전문성과 신뢰감을 동시에 표현해야 했습니다. 또한 3D 에셋이 무거워 모바일 환경에서의 성능 최적화가 큰 과제였습니다.",
      en: "The challenge was making the technically complex space industry approachable to the general public while maintaining professionalism and trustworthiness. Additionally, heavy 3D assets required significant performance optimization for mobile environments.",
    },
    solution: {
      ko: "미니멀한 타이포그래피와 깊은 네이비 컬러 팔레트로 전문성을 유지하면서, 인터랙티브 3D 요소로 호기심을 자극했습니다. LOD(Level of Detail) 시스템과 지연 로딩을 적용하여 모바일에서도 60fps를 유지했습니다.",
      en: "I maintained professionalism through minimal typography and a deep navy color palette while sparking curiosity with interactive 3D elements. Implementing LOD (Level of Detail) systems and lazy loading ensured 60fps even on mobile devices.",
    },
    gallery: [
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=1200&h=800&fit=crop",
    ],
    liveUrl: "https://example.com",
    githubUrl: "https://github.com",
  },
  {
    id: "2",
    number: "02",
    title: "Fitil App",
    subtitle: { ko: "목적을 가지고 움직이다", en: "Move with Purpose" },
    category: { ko: "UX/UI / 모바일", en: "UX/UI / Mobile" },
    year: "2023",
    description: {
      ko: "피트니스 트래킹과 소셜 기능을 결합한 모바일 앱 디자인",
      en: "Mobile app design combining fitness tracking and social features",
    },
    role: { ko: "프로덕트 디자이너", en: "Product Designer" },
    tech: ["Figma", "Protopie", "React Native", "Firebase"],
    image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1200&h=700&fit=crop",
    size: "small",
    overview: {
      ko: "Fitil은 운동을 혼자가 아닌 함께하는 경험으로 바꾸는 피트니스 앱입니다. 실시간 운동 트래킹, 친구와의 챌린지, 그리고 개인 맞춤 루틴 추천 기능을 하나의 앱에 담았습니다. 사용자 리서치부터 프로토타입, 최종 UI까지 전 과정을 리드했습니다.",
      en: "Fitil is a fitness app that transforms exercise from a solo activity into a shared experience. It combines real-time workout tracking, friend challenges, and personalized routine recommendations in one app. I led the entire process from user research to prototype to final UI.",
    },
    challenge: {
      ko: "피트니스 앱 시장은 이미 포화 상태였고, 기존 앱들의 복잡한 UI가 초보 사용자를 좌절시키고 있었습니다. 운동 데이터의 실시간 시각화와 소셜 피드를 자연스럽게 통합하는 것도 어려운 과제였습니다.",
      en: "The fitness app market was already saturated, and existing apps' complex UIs frustrated beginner users. Naturally integrating real-time workout data visualization with social feeds was another significant challenge.",
    },
    solution: {
      ko: "카드 기반의 심플한 UI로 핵심 기능에 빠르게 접근할 수 있도록 했고, 온보딩 과정에서 사용자의 피트니스 수준을 파악해 맞춤형 인터페이스를 제공했습니다. 소셜 피드는 운동 완료 후 자연스럽게 노출되어 동기 부여를 강화했습니다.",
      en: "I designed a card-based simple UI for quick access to core features and identified users' fitness levels during onboarding to provide customized interfaces. Social feeds were naturally exposed after workout completion to boost motivation.",
    },
    gallery: [
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1200&h=800&fit=crop",
    ],
  },
  {
    id: "3",
    number: "03",
    title: "Amway Digital",
    subtitle: { ko: "커머스의 재발견", en: "Commerce Reimagined" },
    category: { ko: "이커머스", en: "E-commerce" },
    year: "2023",
    description: {
      ko: "글로벌 이커머스 플랫폼의 사용자 경험 재설계",
      en: "User experience redesign for a global e-commerce platform",
    },
    role: { ko: "UX 디자이너", en: "UX Designer" },
    tech: ["Sketch", "Zeplin", "Vue.js", "Vuex", "Storybook"],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=700&fit=crop",
    size: "medium",
    overview: {
      ko: "글로벌 건강식품 기업 Amway의 디지털 커머스 플랫폼을 전면 재설계했습니다. 40개국 이상에서 사용되는 플랫폼의 일관된 사용자 경험을 유지하면서도, 각 지역의 문화적 특성을 반영한 로컬라이제이션 전략을 수립했습니다.",
      en: "I led a complete redesign of Amway's digital commerce platform. While maintaining a consistent user experience across 40+ countries, I developed localization strategies reflecting each region's cultural characteristics.",
    },
    challenge: {
      ko: "다국적 사용자 기반으로 인해 문화별 쇼핑 패턴이 매우 달랐고, 레거시 시스템과의 호환성을 유지하면서 현대적인 UX를 적용해야 했습니다. 수천 개의 SKU를 효율적으로 탐색할 수 있는 구조도 필요했습니다.",
      en: "Shopping patterns varied significantly across cultures due to the multinational user base. I needed to apply modern UX while maintaining compatibility with legacy systems, and create an efficient browsing structure for thousands of SKUs.",
    },
    solution: {
      ko: "AI 기반 개인화 추천 엔진을 도입하고, 지역별 A/B 테스트를 통해 최적의 레이아웃을 도출했습니다. 디자인 시스템을 구축하여 40개국 이상의 로컬 팀이 일관된 품질로 페이지를 제작할 수 있도록 지원했습니다.",
      en: "I introduced an AI-powered personalized recommendation engine and derived optimal layouts through regional A/B testing. Building a design system enabled 40+ local teams to create pages with consistent quality.",
    },
    gallery: [
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=800&fit=crop",
    ],
  },
  {
    id: "4",
    number: "04",
    title: "Nova Finance",
    subtitle: { ko: "한눈에 보는 데이터", en: "Data at a Glance" },
    category: { ko: "대시보드", en: "Dashboard" },
    year: "2024",
    description: {
      ko: "핀테크 스타트업을 위한 실시간 금융 대시보드 디자인",
      en: "Real-time financial dashboard design for a fintech startup",
    },
    role: { ko: "UI 디자이너", en: "UI Designer" },
    tech: ["Figma", "D3.js", "React", "WebSocket", "PostgreSQL"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop",
    size: "tall",
    overview: {
      ko: "Nova Finance는 기관 투자자를 위한 실시간 금융 데이터 대시보드입니다. 수백 개의 데이터 포인트를 직관적인 차트와 위젯으로 시각화하여, 복잡한 금융 데이터를 한눈에 파악할 수 있도록 설계했습니다. WebSocket 기반 실시간 업데이트로 지연 없는 데이터 모니터링을 구현했습니다.",
      en: "Nova Finance is a real-time financial data dashboard for institutional investors. I visualized hundreds of data points through intuitive charts and widgets, making complex financial data comprehensible at a glance. WebSocket-based real-time updates enable lag-free data monitoring.",
    },
    challenge: {
      ko: "방대한 양의 실시간 데이터를 성능 저하 없이 렌더링하는 것이 최대 과제였습니다. 또한 금융 전문가들의 기존 워크플로우를 존중하면서도, 신규 사용자가 쉽게 적응할 수 있는 인터페이스가 필요했습니다.",
      en: "The biggest challenge was rendering massive amounts of real-time data without performance degradation. Additionally, the interface needed to respect financial experts' existing workflows while being accessible to new users.",
    },
    solution: {
      ko: "가상화(virtualization) 기법으로 보이는 영역만 렌더링하고, D3.js 차트에 Canvas 렌더링을 적용하여 수천 개의 데이터 포인트도 매끄럽게 표시했습니다. 커스터마이징 가능한 대시보드 레이아웃으로 각 사용자가 필요한 데이터를 자유롭게 배치할 수 있도록 했습니다.",
      en: "I applied virtualization to render only visible areas and used Canvas rendering for D3.js charts to smoothly display thousands of data points. Customizable dashboard layouts let each user freely arrange the data they need.",
    },
    gallery: [
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1200&h=800&fit=crop",
    ],
    liveUrl: "https://example.com",
  },
  {
    id: "5",
    number: "05",
    title: "Luxe Brand",
    subtitle: { ko: "시대를 초월한 우아함", en: "Timeless Elegance" },
    category: { ko: "브랜딩", en: "Branding" },
    year: "2024",
    description: {
      ko: "프리미엄 라이프스타일 브랜드의 비주얼 아이덴티티 구축",
      en: "Visual identity development for a premium lifestyle brand",
    },
    role: { ko: "브랜드 디자이너", en: "Brand Designer" },
    tech: ["Illustrator", "After Effects", "Photoshop", "InDesign"],
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=700&fit=crop",
    size: "wide",
    overview: {
      ko: "Luxe는 지속가능한 럭셔리를 추구하는 라이프스타일 브랜드입니다. 클래식한 세리프 타이포그래피와 절제된 컬러 팔레트를 기반으로, 시간이 지나도 변치 않는 우아함을 표현하는 비주얼 아이덴티티를 설계했습니다. 로고, 패키지, 웹사이트, 매장 사이니지까지 전 터치포인트에 걸쳐 일관된 브랜드 경험을 구축했습니다.",
      en: "Luxe is a lifestyle brand pursuing sustainable luxury. I designed a visual identity expressing timeless elegance based on classic serif typography and a restrained color palette. I built a consistent brand experience across all touchpoints—logo, packaging, website, and store signage.",
    },
    challenge: {
      ko: "럭셔리하면서도 '지속가능성'이라는 가치를 함께 전달해야 했습니다. 기존 럭셔리 브랜드와 차별화하면서도, 프리미엄 세그먼트의 기대에 부합하는 품격을 유지하는 것이 핵심이었습니다.",
      en: "The core challenge was conveying both luxury and sustainability values. I needed to differentiate from existing luxury brands while maintaining the prestige expected in the premium segment.",
    },
    solution: {
      ko: "자연에서 영감을 받은 뉴트럴 톤 컬러를 주축으로, 금박 대신 엠보싱과 텍스처로 고급감을 표현했습니다. 재생 용지와 대두 잉크를 사용한 인쇄물로 지속가능성을 실천하면서도 촉감의 럭셔리를 유지했습니다.",
      en: "Using nature-inspired neutral tones as the primary palette, I expressed luxury through embossing and texture instead of gold foil. Print materials using recycled paper and soy ink maintained tactile luxury while practicing sustainability.",
    },
    gallery: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&h=800&fit=crop",
    ],
  },
  {
    id: "6",
    number: "06",
    title: "TechStart",
    subtitle: { ko: "혁신의 허브", en: "Innovation Hub" },
    category: { ko: "웹 앱", en: "Web App" },
    year: "2023",
    description: {
      ko: "스타트업 인큐베이터를 위한 협업 플랫폼 설계",
      en: "Collaboration platform design for a startup incubator",
    },
    role: { ko: "프로덕트 디자이너", en: "Product Designer" },
    tech: ["Figma", "TypeScript", "Node.js", "Socket.IO", "MongoDB"],
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=700&fit=crop",
    size: "small",
    overview: {
      ko: "TechStart는 스타트업 인큐베이터의 멘토와 팀을 연결하는 협업 플랫폼입니다. 실시간 채팅, 프로젝트 칸반 보드, 멘토링 세션 예약, 투자자 매칭 기능을 하나의 플랫폼에 통합했습니다. 50개 이상의 스타트업 팀이 동시에 사용하는 환경에서 안정적으로 운영되고 있습니다.",
      en: "TechStart is a collaboration platform connecting mentors and teams in a startup incubator. It integrates real-time chat, project kanban boards, mentoring session booking, and investor matching in one platform. It operates reliably in an environment where 50+ startup teams use it simultaneously.",
    },
    challenge: {
      ko: "다양한 역할(멘토, 창업자, 투자자)의 사용자가 각자 다른 목적으로 플랫폼을 사용하기 때문에, 하나의 인터페이스로 모든 워크플로우를 수용하는 것이 어려웠습니다. 실시간 협업 기능의 동시성 이슈도 까다로운 과제였습니다.",
      en: "Users with diverse roles (mentors, founders, investors) each used the platform for different purposes, making it difficult to accommodate all workflows in a single interface. Concurrency issues in real-time collaboration were also a tricky challenge.",
    },
    solution: {
      ko: "역할 기반 대시보드를 설계하여 각 사용자 유형에 최적화된 뷰를 제공하고, 공통 활동(채팅, 일정)은 통합 인터페이스로 접근할 수 있도록 했습니다. CRDT 기반 동시 편집과 Optimistic UI 패턴으로 실시간 협업의 체감 속도를 높였습니다.",
      en: "I designed role-based dashboards providing optimized views for each user type, with common activities (chat, scheduling) accessible through a unified interface. CRDT-based concurrent editing and Optimistic UI patterns improved the perceived speed of real-time collaboration.",
    },
    gallery: [
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&h=800&fit=crop",
    ],
    githubUrl: "https://github.com",
  },
];

// 상수
export const PROJECT_COUNT = projects.length;
export const INFINITE_SCROLL_SETS = 10;
export const LONG_PRESS_DURATION = 800;
export const INITIAL_MARGIN = 50;

// 무한 스크롤 배열 생성
export const allProjects = Array(INFINITE_SCROLL_SETS).fill(projects).flat();
