import { Variants } from "framer-motion";
import { DURATION, EASING, STAGGER } from "./constants";

/**
 * Float Animations
 */

export const floatIn: Variants = {
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
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: DURATION.verySlow,
      ease: EASING.easeOut,
      delay: 0.5,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.2,
    rotate: 5,
    transition: {
      duration: DURATION.medium,
      ease: EASING.easeIn,
    },
  },
};

export const floatRise: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 30,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: DURATION.slow,
      ease: EASING.easeOut,
      delay: 0.2,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -30,
    transition: {
      duration: DURATION.medium,
      ease: EASING.easeIn,
    },
  },
};

export const floatInSettle: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 30,
    rotateX: -20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: DURATION.medium,
      ease: EASING.smooth,
      ...STAGGER.normal,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 30,
    rotateX: 20,
    transition: {
      duration: DURATION.medium,
      ease: EASING.smoothReverse,
    },
  },
};
