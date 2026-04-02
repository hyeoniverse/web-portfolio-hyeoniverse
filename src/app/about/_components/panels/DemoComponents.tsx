"use client";

import { useState, useCallback, useEffect } from "react";
import { useMotionValue, useSpring, motion } from "framer-motion";
import { useMobileLayout } from "../../_hooks/mobileCheck";
import { MARQUEE_COLORS, GRID_COLORS } from "./demoColors";
import shared from "../AboutSection.module.css";
import local from "./CodeHighlightsPanel.module.css";
const styles = { ...shared, ...local };

/* =========================================================================
   DemoMagnetic — 자기 호버 효과 (useMagnetic 훅)
   데스크탑: 스프링 물리를 사용한 연속 마우스 추적
   모바일: 원형 자동 진동
   ========================================================================= */
export function DemoMagnetic() {
  const isMobile = useMobileLayout();
  const [isHovering, setIsHovering] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 120, damping: 12 });
  const springY = useSpring(y, { stiffness: 120, damping: 12 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * 0.4);
      y.set((e.clientY - centerY) * 0.4);
      if (!isHovering) setIsHovering(true);
    },
    [x, y, isMobile, isHovering],
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
    setIsHovering(false);
  }, [x, y]);

  // 모바일: 원형 자동 진동
  useEffect(() => {
    if (!isMobile) return;
    let rafId: number;
    const loop = (time: number) => {
      const t = time / 1000;
      x.set(Math.sin(t * 1.2) * 18);
      y.set(Math.cos(t * 0.9) * 14);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isMobile, x, y]);

  return (
    <div
      className={styles.codeDemoInner}
      onMouseMove={isMobile ? undefined : handleMouseMove}
      onMouseLeave={isMobile ? undefined : handleMouseLeave}
    >
      <motion.div
        className={styles.demoMagneticBtn}
        style={{ x: springX, y: springY }}
        animate={{
          scale: isHovering ? 1.15 : 1,
          borderColor: isHovering
            ? "var(--text-accent)"
            : "var(--color-accent-alpha-30)",
        }}
        transition={{ duration: 0.25 }}
      >
        {isMobile ? "Magnetic" : "Hover"}
      </motion.div>
      <span className={styles.demoHint}>
        {isMobile ? "Auto-playing" : "Move cursor near the button"}
      </span>
    </div>
  );
}

/* =========================================================================
   DemoInfiniteScroll — 무한 스크롤 래핑 (Works 갤러리)
   데스크탑: CSS 호버로 마퀴 일시정지
   모바일: 탭으로 일시정지 토글
   ========================================================================= */
export function DemoInfiniteScroll() {
  const isMobile = useMobileLayout();
  const [paused, setPaused] = useState(false);

  return (
    <div
      className={styles.codeDemoInner}
      style={{ overflow: "hidden" }}
      onClick={isMobile ? () => setPaused((p) => !p) : undefined}
    >
      <div
        className={styles.demoInfiniteTrack}
        style={
          isMobile && paused ? { animationPlayState: "paused" } : undefined
        }
      >
        {[...MARQUEE_COLORS, ...MARQUEE_COLORS, ...MARQUEE_COLORS].map((color, i) => (
          <div
            key={i}
            className={styles.demoInfiniteBlock}
            style={{ background: color }}
          />
        ))}
      </div>
      <span className={styles.demoHint}>
        {isMobile
          ? paused
            ? "Tap to resume"
            : "Tap to pause"
          : "Hover to pause"}
      </span>
    </div>
  );
}

/* =========================================================================
   DemoFrameGrid — 동적 프레임 그리드 (DynamicFrameLayout)
   데스크탑: 셀별 onMouseEnter/Leave
   모바일: 셀 자동 순환
   ========================================================================= */
const GRID_SIZE = 12;
const HOVER_SIZE = 6;

export function DemoFrameGrid() {
  const isMobile = useMobileLayout();
  const [hovered, setHovered] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // 모바일: 셀 자동 순환
  useEffect(() => {
    if (!isMobile) return;
    let idx = 0;
    const id = setInterval(() => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      setHovered({ row, col });
      idx = (idx + 1) % 9;
    }, 1200);
    return () => clearInterval(id);
  }, [isMobile]);

  const getSizes = (axis: "row" | "col") => {
    if (!hovered) return "4fr 4fr 4fr";
    const idx = axis === "row" ? hovered.row : hovered.col;
    const rest = (GRID_SIZE - HOVER_SIZE) / 2;
    return [0, 1, 2]
      .map((i) => (i === idx ? `${HOVER_SIZE}fr` : `${rest}fr`))
      .join(" ");
  };

  return (
    <div
      className={styles.codeDemoInner}
      style={{ paddingTop: 8, paddingLeft: 8, paddingRight: 8 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateRows: getSizes("row"),
          gridTemplateColumns: getSizes("col"),
          gap: 4,
          width: "100%",
          height: "100%",
          transition:
            "grid-template-rows 0.4s ease, grid-template-columns 0.4s ease",
        }}
      >
        {GRID_COLORS.map((color, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const isActive = hovered?.row === row && hovered?.col === col;
          return (
            <div
              key={i}
              onMouseEnter={
                isMobile ? undefined : () => setHovered({ row, col })
              }
              onMouseLeave={isMobile ? undefined : () => setHovered(null)}
              style={{
                background: color,
                borderRadius: 4,
                opacity: isActive ? 1 : 0.6,
                transition: "opacity 0.3s ease",
              }}
            />
          );
        })}
      </div>
      <span className={styles.demoHint}>
        {isMobile ? "Auto-cycling" : "Hover each cell"}
      </span>
    </div>
  );
}
