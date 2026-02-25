// 작품 인터랙션 임계값
export const LONG_PRESS_THRESHOLD = 800; // ms
export const LONG_HOVER_THRESHOLD = 2000; // ms
export const MAX_SCALE = 1.5;
export const MIN_SCALE = 1;

// 자기장 반발 설정
export const REPEL_RADIUS_MULTIPLIER = 1.5;
export const REPEL_STRENGTH = 25;

// 스프링 설정
export const SPRING_CONFIG = {
  normal: { stiffness: 150, damping: 15 },
  smooth: { stiffness: 50, damping: 20 },
  velocity: { stiffness: 100, damping: 25 },
  serviceGap: { stiffness: 120, damping: 18 },
} as const;

// 스크롤 속도 설정
export const SCROLL_VELOCITY = {
  maxOffset: 50,
  workMultiplier: 30,
  serviceMultiplier: 15,
  resetDelay: 150,
} as const;
