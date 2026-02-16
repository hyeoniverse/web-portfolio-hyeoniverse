import { Variants } from "framer-motion";
import { DURATION, EASING, STAGGER } from "./constants";

/**
 * 방향별 페이드 팩토리
 */
function createDirectionalFade(
  axis: "x" | "y",
  distance: number,
  { duration = 0.4, delay, hasExit = true }: { duration?: number; delay?: number; hasExit?: boolean } = {},
): Variants {
  const transition = { duration, ease: EASING.easeOut, ...(delay != null && { delay }) };
  return {
    hidden: { opacity: 0, [axis]: distance },
    visible: { opacity: 1, [axis]: 0, transition },
    ...(hasExit && {
      exit: { opacity: 0, [axis]: distance, transition: { duration, ease: EASING.easeOut } },
    }),
  } as Variants;
}

/**
 * 페이드 애니메이션
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
 * 방향 이동을 동반한 페이드
 */
export const fadeInUp = createDirectionalFade("y", 20);
export const fadeInDown = createDirectionalFade("y", -20);
export const fadeInLeft = createDirectionalFade("x", -20);
export const fadeInRight = createDirectionalFade("x", 20);

/**
 * 지연 페이드인
 */
export const fadeInUpDelayed = createDirectionalFade("y", 20, { delay: 0.8, duration: 0.6, hasExit: false });
export const fadeInLeftDelayed = createDirectionalFade("x", -20, { delay: 0.6, duration: 0.5, hasExit: false });
export const fadeInRightDelayed = createDirectionalFade("x", 30, { duration: 0.8, delay: 2.5, hasExit: false });

/**
 * 스케일을 동반한 페이드
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
 * 회전을 동반한 아코디언 스타일 페이드
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
      ease: EASING.smooth,
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
      ease: EASING.smoothReverse,
    },
  },
};

/**
 * 수직 슬라이드를 동반한 페이드 - 텍스트 전환용
 */
export const fadeSlideY: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.3 } },
};

/**
 * 커스텀 딜레이를 가진 히어로 섹션 아이템
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
 * 히어로 타이틀 페이드
 */
export const heroTitleFade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 2.3, duration: 0.8 },
  },
};

/**
 * 지연 섹션 노출 애니메이션
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
 * 이미지 페이드 애니메이션 (최적화된 이미지 로딩용)
 */
export const imageFade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.fast },
  },
};
