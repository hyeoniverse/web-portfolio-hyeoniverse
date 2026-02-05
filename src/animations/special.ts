import { Variants } from "framer-motion";
import { DURATION, EASING, STAGGER } from "./constants";

/**
 * Special Effects and Complex Animations
 */

// ===== Container Animations =====
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: STAGGER.normal,
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION.normal,
    },
  },
};

export const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  visible: {
    opacity: 1,
    transition: STAGGER.slow,
  },
};

// ===== Loading & Skeleton Animations =====
export const shimmer: Variants = {
  animate: {
    backgroundPosition: ["-200% 0", "200% 0"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: EASING.linear,
    },
  },
};

export const pulse: Variants = {
  animate: {
    opacity: [1, 0.4, 1],
    transition: {
      duration: DURATION.verySlow,
      repeat: Infinity,
      ease: EASING.easeInOut,
    },
  },
};

export const sparkle: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: 0,
  },
  visible: {
    opacity: [0, 1, 0],
    scale: [0, 1.2, 0],
    rotate: [0, 180, 360],
    transition: {
      duration: 3,
      repeat: Number.POSITIVE_INFINITY,
      ease: EASING.easeInOut,
    },
  },
};

// ===== Backdrop Effects =====
export const backdropBlurFadeIn: Variants = {
  hidden: {
    opacity: 0,
    backdropFilter: "blur(0px)",
  },
  visible: {
    opacity: 1,
    backdropFilter: "blur(12px)",
    transition: { duration: 0.4, ease: EASING.smooth },
  },
  exit: {
    opacity: 0,
    backdropFilter: "blur(0px)",
    transition: { duration: DURATION.fast, ease: EASING.smooth },
  },
};

export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
    backdropFilter: "blur(0px)",
  },
  visible: {
    opacity: 1,
    backdropFilter: "blur(12px)",
    transition: {
      duration: 0.4,
      ease: EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    backdropFilter: "blur(0px)",
    transition: {
      duration: DURATION.fast,
      ease: EASING.smooth,
    },
  },
};

// ===== 3D Effects =====
export const elementRotateScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0, rotate: -180 },
  visible: {
    opacity: 0.6,
    scale: 1,
    rotate: 0,
    transition: { duration: DURATION.slow, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0,
    rotate: 180,
    transition: { duration: DURATION.slow, ease: EASING.easeIn },
  },
};

export const textRotateXIn: Variants = {
  hidden: { opacity: 0, scale: 0.8, rotateX: 90 },
  visible: {
    opacity: 1,
    scale: 1,
    rotateX: 0,
    transition: { duration: 1, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 1.2,
    rotateX: -90,
    transition: { duration: 1, ease: EASING.easeOut },
  },
};

export const openYFromTop: Variants = {
  hidden: {
    opacity: 0,
    rotateX: -90,
    transformOrigin: "top",
  },
  visible: {
    opacity: 1,
    rotateX: 0,
    transformOrigin: "top",
    transition: {
      ...STAGGER.medium,
      duration: 0.6,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    rotateX: 90,
    transformOrigin: "top",
    transition: { duration: 0.6, ease: EASING.easeIn },
  },
};

// ===== Transition Effects =====
export const liquidWaveAnimation: Variants = {
  hidden: (direction: "up" | "down") => ({
    y: direction === "down" ? "-100%" : "100%",
    scaleY: 0,
  }),
  visible: (direction: "up" | "down") => ({
    y: direction === "down" ? "100%" : "-100%",
    scaleY: [0, 1.2, 1, 0.8, 0],
    transition: {
      duration: DURATION.slow,
      ease: EASING.smooth,
    },
  }),
};

export const rippleAnimation: Variants = {
  hidden: { scale: 0, opacity: 0.8 },
  visible: {
    scale: 3,
    opacity: 0,
    transition: {
      duration: 1,
      ease: EASING.easeOut,
    },
  },
};

export const mistEffectAnimation: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 0.3,
    scale: 1.2,
    transition: { duration: DURATION.medium },
  },
  exit: {
    opacity: 0,
    scale: 1.5,
    transition: { duration: DURATION.medium },
  },
};

// ===== Wipe Animations =====
export const wipeInFromBottom: Variants = {
  hidden: {
    clipPath: "inset(100% 0 0 0)",
    opacity: 0,
    height: 0,
  },
  visible: {
    clipPath: "inset(0% 0 0 0)",
    opacity: 1,
    height: "auto",
    transition: {
      duration: DURATION.medium,
      ease: EASING.smooth,
      ...STAGGER.normal,
    },
  },
  exit: {
    clipPath: "inset(0% 0 100% 0)",
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.6,
      ease: EASING.smoothReverse,
    },
  },
};

export const wipeInFromTop: Variants = {
  hidden: {
    clipPath: "inset(0 0 100% 0)",
    opacity: 0,
    height: 0,
  },
  visible: {
    clipPath: "inset(0% 0 0% 0)",
    opacity: 1,
    height: "auto",
    transition: {
      duration: DURATION.medium,
      ease: EASING.smooth,
      ...STAGGER.medium,
    },
  },
  exit: {
    clipPath: "inset(0% 0 100% 0)",
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.6,
      ease: EASING.smoothReverse,
    },
  },
};

// ===== Custom Background Animations =====
export const floatingElementAnimation: Variants = {
  hidden: ({ x, y }: { x: number; y: number }) => ({
    opacity: 0,
    scale: 0,
    x,
    y,
  }),
  visible: ({ randomX, randomY }: { randomX: number; randomY: number }) => ({
    opacity: [0, 0.3, 0],
    scale: [0, 1, 0],
    x: [randomX, Math.random() * 400 - 200, Math.random() * 200 - 100],
    y: [randomY, Math.random() * 400 - 200, Math.random() * 200 - 100],
    transition: {
      duration: 8 + Math.random() * 4,
      repeat: Infinity,
      ease: EASING.easeInOut,
    },
  }),
};

export const backgroundTitleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 1.2,
    rotate: -5,
    transition: {
      duration: DURATION.medium,
      ease: EASING.easeIn,
    },
  },
  visible: {
    opacity: 0.3,
    scale: 1,
    rotate: 0,
    transition: {
      duration: DURATION.verySlow,
      ease: EASING.easeOut,
      delay: 0.5,
    },
  },
};

// ===== Section Transition Animations =====
export const sectionTransitionWrapper: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const sectionTransitionBackdrop = {
  hidden: { scaleY: 0 },
  visible: { scaleY: 1, transition: { duration: 0.4, ease: EASING.expo } },
  exit: { scaleY: 0, transition: { duration: 0.3, ease: EASING.expo } },
};

export const sectionTransitionContent: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, delay: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const sectionTransitionLine: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.5, delay: 0.25, ease: EASING.expo } },
};

export const sectionTransitionCorner: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: (rotate: number) => ({
    opacity: 1,
    scale: 1,
    rotate,
    transition: { duration: 0.4, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] },
  }),
  exit: { opacity: 0, scale: 0 },
};

// ===== Floating/Infinite Animations =====
export const floatingShape: Variants = {
  animate: {
    y: [-10, 10, -10],
    rotate: [-2, 2, -2],
    transition: {
      duration: 6,
      repeat: Number.POSITIVE_INFINITY,
      ease: EASING.easeInOut,
    },
  },
};

export const infiniteRotateSlow: Variants = {
  animate: {
    rotateZ: [0, 360],
    transition: {
      duration: 30,
      repeat: Number.POSITIVE_INFINITY,
      ease: EASING.linear,
    },
  },
};

export const titleNumberPulse: Variants = {
  animate: {
    rotateY: [0, 5, 0],
    scale: [1, 1.02, 1],
    transition: {
      duration: 4,
      repeat: Number.POSITIVE_INFINITY,
      ease: EASING.easeInOut,
    },
  },
};

export const lineWidthPulse: Variants = {
  animate: {
    width: ["0%", "100%", "0%"],
    transition: {
      duration: 3,
      repeat: Number.POSITIVE_INFINITY,
      ease: EASING.easeInOut,
    },
  },
};

export const scaleXGrow: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.8, ease: EASING.easeInOut } },
};

// ===== Editorial/Magazine Style Animations =====
/**
 * Perspective depth animation - items appear from deep perspective
 * Good for: Section headers, editorial titles, magazine-style layouts
 */
export const perspectiveDepth: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
    rotateX: -90,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: DURATION.medium,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: 40,
    rotateX: -90,
    transition: {
      duration: DURATION.medium,
      ease: EASING.easeIn,
    },
  },
};

/**
 * 3D flip from side - Y-axis rotation entrance
 * Good for: Cards, panels, secondary titles
 */
export const flipFromSide: Variants = {
  hidden: {
    opacity: 0,
    x: 100,
    rotateY: 90,
  },
  visible: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    transition: {
      duration: 1,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: -100,
    rotateY: -90,
    transition: {
      duration: 1,
      ease: EASING.easeIn,
    },
  },
};

/**
 * Vertical decorative line growth
 * Good for: Dividers, separators, editorial accents
 */
export const lineGrowth: Variants = {
  hidden: {
    height: 0,
    rotateZ: 5,
  },
  visible: {
    height: "var(--line-height, 120px)",
    rotateZ: 0,
    transition: {
      duration: DURATION.slow,
      delay: 0.5,
      ease: EASING.easeOut,
    },
  },
  exit: {
    height: 0,
    rotateZ: -5,
    transition: {
      duration: DURATION.medium,
      ease: EASING.easeIn,
    },
  },
};
