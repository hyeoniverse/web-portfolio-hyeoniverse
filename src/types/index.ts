import type { CSSProperties, ReactNode } from "react";

// ============================================
// Project Types
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
// Skills Types
// ============================================
export interface Skills {
  domain: Domain;
  skills: Skill[];
}

export interface Domain {
  id: string;
  title: string;
  subTitle?: string;
  description: string;
}

export interface Skill {
  title: string;
  icon?: string;
  level?: string;
  numericLevel: number;
  description?: string;
  keywords?: string[];
}

// ============================================
// Experience Types
// ============================================
export interface Experience {
  id: string;
  title: string;
  organization?: string;
  startDate: string;
  endDate: string | null;
  description: string[];
  technologies?: string[];
  type: "activity" | "education" | "achievement";
}

// ============================================
// Blog Types
// ============================================
export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  url: string;
  featured?: boolean;
}

// ============================================
// Contact Types
// ============================================
export interface ContactForm {
  name: string;
  email: string;
  message: string;
}

// ============================================
// UI Element Types
// ============================================
export interface MousePosition {
  x: number;
  y: number;
}

export interface FloatingElement {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
}

export interface Droplet {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

export interface ClickEffect {
  id: number;
  x: number;
  y: number;
}

// ============================================
// Navigation Types
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
// Modal Types
// ============================================
export interface ModalOptions {
  id?: string;
  style?: CSSProperties;
  closeButton?: boolean;
  scrollable?: boolean;
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
// Common Types
// ============================================
export type SoundType = "click" | "hover" | "success" | "error" | "typing";
export type Theme = "dark" | "light" | "system";
export type TransitionDirection = "down" | "up";
