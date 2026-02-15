/**
 * 애니메이션 상수
 * 재사용 가능한 easing 함수와 transition 값들
 */

export const EASING = {
  easeOut: "easeOut",
  easeIn: "easeIn",
  easeInOut: "easeInOut",
  linear: "linear",
  // 커스텀 cubic-bezier easing 함수
  smooth: [0.25, 0.46, 0.45, 0.94] as const,
  smoothReverse: [0.55, 0.06, 0.68, 0.19] as const,
  expo: [0.76, 0, 0.24, 1] as const,
} as const;

export const DURATION = {
  fast: 0.3,
  normal: 0.5,
  medium: 0.8,
  slow: 1.2,
  verySlow: 1.5,
} as const;

export const SPRING = {
  soft: { type: "spring" as const, stiffness: 300, damping: 25, mass: 0.8 },
  medium: { type: "spring" as const, stiffness: 400, damping: 20 },
  stiff: { type: "spring" as const, stiffness: 500, damping: 20 },
  gentle: { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.6 },
} as const;

export const STAGGER = {
  fast: { staggerChildren: 0.05, delayChildren: 0.1 },
  normal: { staggerChildren: 0.1, delayChildren: 0.2 },
  medium: { staggerChildren: 0.15, delayChildren: 0.3 },
  slow: { staggerChildren: 0.2, delayChildren: 0.1 },
} as const;
