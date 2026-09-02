"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/* 타임라인 카드 — framer useScroll 로 스크롤 진행에 비례한 리빌(페이드 + 자기 쪽 슬라이드 + 살짝 scale).
   카드가 뷰 하단→60% 로 올라오는 동안 값이 매핑되고, 지나면 유지. 모바일 단일컬럼선 x 이동 없음. */
export default function TimelineMotionItem({
  side,
  disableX,
  className,
  children,
}: {
  side: "left" | "right";
  disableX: boolean;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 60%"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [44, 0]);
  const xFrom = disableX ? 0 : side === "left" ? -44 : 44;
  const x = useTransform(scrollYProgress, [0, 1], [xFrom, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.965, 1]);
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ opacity, y, x, scale }}
    >
      {children}
    </motion.div>
  );
}
