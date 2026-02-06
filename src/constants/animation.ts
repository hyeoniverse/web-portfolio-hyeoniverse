// Work interaction thresholds
export const LONG_PRESS_THRESHOLD = 800; // ms
export const LONG_HOVER_THRESHOLD = 2000; // ms
export const MAX_SCALE = 1.5;
export const MIN_SCALE = 1;

// Magnetic repel settings
export const REPEL_RADIUS_MULTIPLIER = 1.5;
export const REPEL_STRENGTH = 25;

// Spring configurations
export const SPRING_CONFIG = {
  normal: { stiffness: 150, damping: 15 },
  smooth: { stiffness: 50, damping: 20 },
  velocity: { stiffness: 100, damping: 15 },
  serviceGap: { stiffness: 120, damping: 18 },
} as const;

// Scroll velocity settings
export const SCROLL_VELOCITY = {
  maxOffset: 50,
  workMultiplier: 30,
  serviceMultiplier: 15,
  resetDelay: 150,
} as const;
