import type { CSSProperties, ReactNode } from "react";

// ============================================
// 연락처 타입
// ============================================
export interface ContactForm {
  name: string;
  email: string;
  message: string;
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
    /** 헤더 우측 액션 영역 (닫기 버튼 왼쪽) — 링크/버튼 등 */
    actions?: ReactNode;
  };
  /** 닫기(X) 버튼 바로 왼쪽에 붙는 서브 버튼 (뒤로/앞으로 등) */
  subButtons?: ReactNode;
}

export interface ModalItem {
  id: string;
  header?: {
    icon?: ReactNode;
    title?: string;
    actions?: ReactNode;
  };
  content: ReactNode;
  style?: CSSProperties;
  closeButton?: boolean;
  subButtons?: ReactNode;
}

// ============================================
// 공통 타입
// ============================================
export type SoundType = "click" | "hover" | "success" | "error" | "typing";
export type Theme = "dark" | "light" | "system" | null;

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
