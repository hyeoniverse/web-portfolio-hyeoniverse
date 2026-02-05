import { Variants } from "framer-motion";
import { DURATION, EASING, STAGGER, EASING as E } from "./constants";

/**
 * Fade Animations
 */

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      ...STAGGER.slow,
      duration: DURATION.fast,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      ...STAGGER.slow,
      duration: DURATION.fast,
      ease: EASING.easeOut,
    },
  },
};

/**
 * Fade with directional movement
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.4, ease: EASING.easeOut },
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.4, ease: EASING.easeOut },
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.4, ease: EASING.easeOut },
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.4, ease: EASING.easeOut },
  },
};

/**
 * Fade with scale
 */
export const fadeInUpScale: Variants = {
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
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.8,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
};

/**
 * Accordion-style fade with rotation
 */
export const accordionFade: Variants = {
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
      ease: E.smooth,
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
      ease: E.smoothReverse,
    },
  },
};

/**
 * Fade in with delay - for footer content
 */
export const fadeInUpDelayed: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.8, duration: 0.6, ease: EASING.easeOut },
  },
};

/**
 * Fade in from left with delay - for scroll indicators
 */
export const fadeInLeftDelayed: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { delay: 0.6, duration: 0.5, ease: EASING.easeOut },
  },
};

/**
 * Fade with vertical slide - for text transitions
 */
export const fadeSlideY: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.3 } },
};

/**
 * Fade in from right with delay - for hero actions
 */
export const fadeInRightDelayed: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, delay: 2.5, ease: EASING.easeOut },
  },
};

/**
 * Hero section item with custom delay
 */
export const heroSectionItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay },
  }),
};

/**
 * Hero title fade
 */
export const heroTitleFade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 2.3, duration: 0.8 },
  },
};

/**
 * Lazy section reveal animation
 */
export const lazySectionReveal: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};

/**
 * Image fade animation (for optimized image loading)
 */
export const imageFade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.fast },
  },
};
