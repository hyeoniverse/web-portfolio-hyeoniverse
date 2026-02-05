import { Variants } from "framer-motion";
import { DURATION, EASING } from "./constants";

/**
 * Slide Animations
 */

export const slideInBottom: Variants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.easeOut },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: DURATION.normal, ease: EASING.easeInOut },
  },
};

export const slideOutBottom: Variants = {
  hidden: { y: 0 },
  visible: {
    y: "100%",
    transition: { duration: DURATION.normal, ease: EASING.easeIn },
  },
};

export const slideInTop: Variants = {
  hidden: { y: "-100%" },
  visible: {
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.easeOut },
  },
  exit: {
    y: "-100%",
    opacity: 0,
    transition: { duration: DURATION.normal, ease: EASING.easeInOut },
  },
};

export const slideInLeft: Variants = {
  hidden: { x: "-100%" },
  visible: {
    x: 0,
    transition: { duration: DURATION.normal, ease: EASING.easeOut },
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: { duration: DURATION.normal, ease: EASING.easeInOut },
  },
};

export const slideInRight: Variants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { duration: DURATION.normal, ease: EASING.easeOut },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: DURATION.normal, ease: EASING.easeInOut },
  },
};
