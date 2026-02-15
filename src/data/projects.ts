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
    tech: ["Figma", "Next.js", "Three.js"],
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&h=700&fit=crop",
    size: "large",
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
    tech: ["Figma", "Protopie", "React Native"],
    image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1200&h=700&fit=crop",
    size: "small",
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
    tech: ["Sketch", "Zeplin", "Vue.js"],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=700&fit=crop",
    size: "medium",
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
    tech: ["Figma", "D3.js", "React"],
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop",
    size: "tall",
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
    tech: ["Illustrator", "After Effects"],
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=700&fit=crop",
    size: "wide",
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
    tech: ["Figma", "TypeScript", "Node.js"],
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=700&fit=crop",
    size: "small",
  },
];

// 상수
export const PROJECT_COUNT = projects.length;
export const INFINITE_SCROLL_SETS = 10;
export const LONG_PRESS_DURATION = 800;
export const INITIAL_MARGIN = 50;

// 무한 스크롤 배열 생성
export const allProjects = Array(INFINITE_SCROLL_SETS).fill(projects).flat();
