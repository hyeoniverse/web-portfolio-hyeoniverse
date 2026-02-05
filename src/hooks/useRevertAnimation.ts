import { useRef } from "react";
import { useScroll, useTransform, useInView } from "framer-motion";

interface ScrollAnimationConfig {
  /** 역재생 시작 지점 (0-1) */
  reverseStart?: number;
  /** 역재생 종료 지점 (0-1) */
  reverseEnd?: number;
  /** 초기 Y 오프셋 */
  initialY?: number;
  /** 최종 Y 오프셋 */
  finalY?: number;
}

/**
 * 스크롤 기반 애니메이션을 위한 커스텀 훅
 * 요소가 뷰포트에 들어오고 나갈 때 자동으로 애니메이션 재생/역재생
 */
export function useScrollAnimation(config: ScrollAnimationConfig = {}) {
  const {
    reverseStart = 0.5,
    reverseEnd = 0.7,
    initialY = 100,
    finalY = -100,
  } = config;

  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.1, once: false });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // 애니메이션 진행 구간: [진입 시작, 진입 완료, 역재생 시작, 역재생 완료]
  const animationPoints = [0, 0.3, reverseStart, reverseEnd];

  const opacity = useTransform(scrollYProgress, animationPoints, [0, 1, 1, 0]);

  const y = useTransform(scrollYProgress, animationPoints, [
    initialY,
    0,
    0,
    finalY,
  ]);

  const width = useTransform(scrollYProgress, animationPoints, [
    "0%",
    "100%",
    "100%",
    "0%",
  ]);

  return {
    ref,
    inView,
    scrollYProgress,
    opacity,
    y,
    width,
  };
}
