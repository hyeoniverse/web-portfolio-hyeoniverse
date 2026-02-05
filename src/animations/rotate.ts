import { Variants } from "framer-motion";
import { EASING } from "./constants";

/**
 * Rotate Animations
 */

export const rotateIn: Variants = {
  hidden: { opacity: 0, rotate: -45 },
  visible: {
    opacity: 1,
    rotate: 0,
    transition: { duration: 0.4, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    rotate: -45,
    transition: { duration: 0.4, ease: EASING.easeIn },
  },
};

export const rotateOut: Variants = {
  hidden: { opacity: 1, rotate: 0 },
  visible: {
    opacity: 0,
    rotate: 45,
    transition: { duration: 0.4, ease: EASING.easeIn },
  },
};

/**
 * Flip Animations
 */
export const flipInX: Variants = {
  hidden: { opacity: 0, rotateX: -90 },
  visible: {
    opacity: 1,
    rotateX: 0,
    transition: { duration: 0.6, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    rotateX: 90,
    transition: { duration: 0.6, ease: EASING.easeIn },
  },
};

export const flipOutX: Variants = {
  hidden: { opacity: 1, rotateX: 0 },
  visible: {
    opacity: 0,
    rotateX: 90,
    transition: { duration: 0.6, ease: EASING.easeIn },
  },
};

export const flipInY: Variants = {
  hidden: { opacity: 0, rotateY: -90 },
  visible: {
    opacity: 1,
    rotateY: 0,
    transition: { duration: 0.6, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    rotateY: 90,
    transition: { duration: 0.6, ease: EASING.easeIn },
  },
};

/**
 * Tilt Animations
 */
export const tiltInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -30,
    scale: 0.9,
    rotateY: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    rotateY: 0,
    transition: {
      duration: 0.6,
      ease: EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: -30,
    scale: 0.9,
    rotateY: -10,
    transition: {
      duration: 0.6,
      ease: EASING.smoothReverse,
    },
  },
};

export const tiltInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 30,
    scale: 0.9,
    rotateY: 10,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    rotateY: 0,
    transition: {
      duration: 0.6,
      ease: EASING.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: 30,
    scale: 0.9,
    rotateY: 10,
    transition: {
      duration: 0.6,
      ease: EASING.smoothReverse,
    },
  },
};
