import { Variants } from "framer-motion";
import { SPRING } from "./constants";

/**
 * Spring-based Animations
 */

export const bounceIn: Variants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING.stiff,
  },
  exit: {
    opacity: 0,
    scale: 0.3,
    transition: SPRING.stiff,
  },
};

export const bounceOut: Variants = {
  hidden: { opacity: 1, scale: 1 },
  visible: {
    opacity: 0,
    scale: 0.3,
    transition: SPRING.stiff,
  },
};

export const springIn: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING.medium,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 20,
    transition: SPRING.gentle,
  },
};

export const springScale: Variants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: SPRING.soft,
  },
  exit: {
    scale: 0,
    transition: SPRING.gentle,
  },
};
