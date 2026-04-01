import type { CSSProperties, ReactNode } from "react";

// ============================================
// 프로젝트 타입
// ============================================
export interface Project {
  id: string;
  title: string;
  description: string;
  period: { start: string; end?: string };
  teamSize: number;
  thumbnail?: string;
  images?: string[];
  technologies: string[];
  liveUrl?: string;
  githubUrl?: string;
  blogUrls?: { title: string; url: string }[];
  category: ProjectCategories;
}

export type ProjectCategories = "all" | "team" | "single";

// ============================================
// 연락처 타입
// ============================================
export interface ContactForm {
  name: string;
  email: string;
  message: string;
}

// ============================================
// 네비게이션 타입
// ============================================
export interface NavItem {
  id: string;
  label: string;
  number: string;
  path: string;
}

export interface TocLabel {
  label: string;
  section: string;
  path?: string;
}

// ============================================
// 모달 타입
// ============================================
export interface ModalOptions {
  id?: string;
  style?: CSSProperties;
  closeButton?: boolean;
  width?: string;
  height?: string;
  background?: string;
  header?: {
    icon?: ReactNode;
    title?: string;
  };
}

export interface ModalItem {
  id: string;
  header?: {
    icon?: ReactNode;
    title?: string;
  };
  content: ReactNode;
  style?: CSSProperties;
  closeButton?: boolean;
}

// ============================================
// 공통 타입
// ============================================
export type SoundType = "click" | "hover" | "success" | "error" | "typing";
export type Theme = "dark" | "light" | "system" | null;
export type TransitionDirection = "down" | "up";

// ============================================
// 작품 인터랙션 타입
// ============================================
export interface ExpandingWork {
  id: string;
  rect: DOMRect;
  image: string;
}

export interface PressingWork {
  id: string;
  scale: number;
  element: HTMLElement | null;
}

export interface HoveringWork {
  id: string;
  progress: number;
  scale: number;
  element: HTMLElement | null;
}

// ============================================
// 자기장 효과 타입
// ============================================
export interface MagneticOffset {
  x: number;
  y: number;
  rotation: number;
}
