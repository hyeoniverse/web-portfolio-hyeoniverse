// Works page project data

export type CardSize = "large" | "small" | "medium" | "tall" | "wide";

export interface Project {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  description: string;
  role: string;
  tech: string[];
  image: string;
  size: CardSize;
}

export const projects: Project[] = [
  {
    id: "1",
    number: "01",
    title: "Sakharov Space",
    subtitle: "Beyond the Horizon",
    category: "Branding / Web Design",
    year: "2024",
    description: "우주 탐사 스타트업을 위한 브랜드 아이덴티티 및 웹 경험 디자인",
    role: "Lead Designer",
    tech: ["Figma", "Next.js", "Three.js"],
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&h=700&fit=crop",
    size: "large",
  },
  {
    id: "2",
    number: "02",
    title: "Fitil App",
    subtitle: "Move with Purpose",
    category: "UX/UI / Mobile",
    year: "2023",
    description: "피트니스 트래킹과 소셜 기능을 결합한 모바일 앱 디자인",
    role: "Product Designer",
    tech: ["Figma", "Protopie", "React Native"],
    image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1200&h=700&fit=crop",
    size: "small",
  },
  {
    id: "3",
    number: "03",
    title: "Amway Digital",
    subtitle: "Commerce Reimagined",
    category: "E-commerce",
    year: "2023",
    description: "글로벌 이커머스 플랫폼의 사용자 경험 재설계",
    role: "UX Designer",
    tech: ["Sketch", "Zeplin", "Vue.js"],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=700&fit=crop",
    size: "medium",
  },
  {
    id: "4",
    number: "04",
    title: "Nova Finance",
    subtitle: "Data at a Glance",
    category: "Dashboard",
    year: "2024",
    description: "핀테크 스타트업을 위한 실시간 금융 대시보드 디자인",
    role: "UI Designer",
    tech: ["Figma", "D3.js", "React"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop",
    size: "tall",
  },
  {
    id: "5",
    number: "05",
    title: "Luxe Brand",
    subtitle: "Timeless Elegance",
    category: "Branding",
    year: "2024",
    description: "프리미엄 라이프스타일 브랜드의 비주얼 아이덴티티 구축",
    role: "Brand Designer",
    tech: ["Illustrator", "After Effects"],
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=700&fit=crop",
    size: "wide",
  },
  {
    id: "6",
    number: "06",
    title: "TechStart",
    subtitle: "Innovation Hub",
    category: "Web App",
    year: "2023",
    description: "스타트업 인큐베이터를 위한 협업 플랫폼 설계",
    role: "Product Designer",
    tech: ["Figma", "TypeScript", "Node.js"],
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=700&fit=crop",
    size: "small",
  },
];

// Constants
export const PROJECT_COUNT = projects.length;
export const INFINITE_SCROLL_SETS = 10;
export const LONG_PRESS_DURATION = 800;
export const INITIAL_MARGIN = 50;

// Generate infinite scroll array
export const allProjects = Array(INFINITE_SCROLL_SETS).fill(projects).flat();
