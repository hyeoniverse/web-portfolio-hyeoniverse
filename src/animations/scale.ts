import { Variants } from "framer-motion";
import { DURATION, EASING } from "./constants";

/**
 * 스케일 애니메이션
 */

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.fast, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: DURATION.fast, ease: EASING.easeOut },
  },
};

export const scaleOut: Variants = {
  hidden: { opacity: 1, scale: 1 },
  visible: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: DURATION.fast, ease: EASING.easeIn },
  },
};

export const zoomIn: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.normal, ease: EASING.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: DURATION.normal, ease: EASING.easeIn },
  },
};

export const zoomOut: Variants = {
  hidden: { opacity: 1, scale: 1 },
  visible: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: DURATION.normal, ease: EASING.easeIn },
  },
};
