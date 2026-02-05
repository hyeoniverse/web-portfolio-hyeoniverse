import { Variants, TargetAndTransition } from "framer-motion";
import { DURATION, EASING, SPRING, STAGGER } from "./constants";

/**
 * UI Component Animations
 * Modal, Form, Tooltip, Button 등 UI 컴포넌트 전용 애니메이션
 */

// ===== Modal Animations =====
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.75,
    y: 100,
    rotateX: -15,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotateX: 0,
    transition: {
      ...SPRING.soft,
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: -50,
    rotateX: 15,
    transition: SPRING.gentle,
  },
};

export const contentVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...SPRING.medium,
      staggerChildren: 0.05,
    },
  },
};

export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRING.medium,
  },
};

// ===== Image Viewer =====
export const imageViewerVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    rotateY: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: SPRING.soft,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    rotateY: 10,
    transition: SPRING.gentle,
  },
};

// ===== Tooltip =====
export const tooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 15,
    scale: 0.85,
    rotateX: -10,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 400,
      mass: 0.5,
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.9,
    rotateX: 5,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 500,
      mass: 0.4,
    },
  },
};

// ===== Form Animations =====
export const formVariants: Variants = {
  hidden: {
    opacity: 0,
    height: 0,
    y: -30,
    scale: 0.9,
    rotateX: -15,
  },
  visible: {
    opacity: 1,
    height: "auto",
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      duration: DURATION.medium,
      ease: EASING.smooth,
      ...STAGGER.medium,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    y: -30,
    scale: 0.9,
    rotateX: 15,
    transition: {
      duration: 0.6,
      ease: EASING.smoothReverse,
    },
  },
};

// ===== Button Animations =====
export const hoverButton: TargetAndTransition = {
  scale: 1.05,
  y: -2,
  rotateX: -5,
  transition: { duration: 0.2 },
};

export const submitButtonVariants = {
  rest: {
    scale: 1,
    rotateX: 0,
    boxShadow: "0 4px 12px rgba(26, 26, 26, 0.15)",
  },
  hover: {
    scale: 1.03,
    rotateX: -2,
    boxShadow: "0 8px 25px rgba(26, 26, 26, 0.25)",
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeOut,
    },
  },
  tap: {
    scale: 0.98,
    rotateX: 2,
    transition: {
      duration: 0.1,
      ease: EASING.easeInOut,
    },
  },
};

// ===== Social Links =====
export const socialLinksVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.6,
    },
  },
};

export const socialItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
};

// ===== Image Viewer Animations =====
export const imageViewerBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

export const imageViewerCloseButton = {
  whileHover: { scale: 1.1, rotate: 90 },
  whileTap: { scale: 0.9 },
  transition: { type: "spring" as const, damping: 15, stiffness: 400 },
};

export const imageViewerNavButton = {
  whileHover: { scale: 1.1 },
  whileTap: { scale: 0.9 },
  transition: { type: "spring" as const, damping: 15, stiffness: 400 },
};

export const imageViewerImage: Variants = {
  hidden: { opacity: 0, scale: 0.9, rotateY: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: { type: "spring", damping: 20, stiffness: 300 },
  },
  exit: { opacity: 0, scale: 0.9, rotateY: -10 },
};

export const imageViewerCounter: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.3, type: "spring", damping: 20, stiffness: 300 },
  },
};

// ===== Back Button Animation =====
export const backButtonVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, x: -20, transition: { duration: DURATION.fast } },
};

// ===== Accent CTA Animation =====
export const accentCtaVariants: Variants = {
  hidden: { opacity: 0, scale: 0, rotateZ: -45 },
  visible: {
    opacity: 1,
    scale: 1,
    rotateZ: 0,
    transition: { delay: 1, duration: DURATION.medium, ease: EASING.easeOut },
  },
};

// ===== Side Navigation Animation =====
export const sideNavVariants: Variants = {
  hidden: { width: 0, opacity: 0 },
  visible: (width: number) => ({
    width,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  }),
  exit: { width: 0, opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

// ===== Action Buttons Expanded Menu =====
export const expandedMenuVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
  exit: { opacity: 0, scale: 0.8, y: 10, transition: { duration: 0.2 } },
};

// ===== Editorial Header/Footer =====
export const editorialHeaderVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.medium, delay: 0.2 },
  },
};

export const editorialFooterVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.medium, delay: 0.4 },
  },
};

// ===== Theme Toggle Icon =====
export const themeToggleRotate = {
  animate: (isDark: boolean) => ({
    rotate: isDark ? 0 : 180,
    transition: { duration: DURATION.fast },
  }),
};

// ===== Interactive Hover Effects =====
/**
 * Playful rotation on hover - good for badges, labels, small accents
 */
export const playfulRotateHover: TargetAndTransition = {
  scale: 1.2,
  rotateZ: 15,
};

export const playfulRotateHoverReverse: TargetAndTransition = {
  scale: 1.1,
  rotateZ: -15,
};

/**
 * 3D lift with text shadow - good for prominent text/titles
 */
export const textLiftHover: TargetAndTransition = {
  scale: 1.05,
  textShadow: "0 0 20px rgba(0,0,0,0.3)",
  transition: { duration: 0.2 },
};

/**
 * 3D perspective tilt - good for cards, panels
 */
export const perspectiveTiltHover: TargetAndTransition = {
  scale: 1.1,
  rotateX: 10,
  rotateZ: -2,
  transition: { duration: 0.3 },
};
