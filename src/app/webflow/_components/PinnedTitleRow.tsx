"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";
import styles from "./WebFlowSection.module.css";

interface DotNavConfig {
  count: number;
  activeIndex: number;
  onDotClick: (index: number) => void;
  /** 각 dot에 표시할 힌트 라벨 */
  labels?: string[];
  /** 추가 CSS 클래스 (dotNavMobile, dotNavMobileOnly 등) */
  className?: string;
}

interface PinnedTitleRowProps {
  number: string;
  title: string;
  /** panelTitleCompact 클래스 적용 여부 */
  compact?: boolean;
  /** animate 클래스 적용 여부 */
  animate?: boolean;
  /** 점 네비게이션 설정 (없으면 표시 안 함) */
  dotNav?: DotNavConfig;
}

/** 패널 상단 타이틀 행 — 번호 + 제목 + 선택적 점 네비게이션 */
export default function PinnedTitleRow({
  number,
  title,
  compact = false,
  animate = false,
  dotNav,
}: PinnedTitleRowProps) {
  const animateClass = animate ? ` ${styles.animate}` : "";
  const titleClasses = `${styles.panelTitle}${compact ? ` ${styles.panelTitleCompact}` : ""}${animateClass}`;

  // Dot nav indicator springs
  const dotNavRef = useRef<HTMLDivElement>(null);
  const dotItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);

  const springConfig = { stiffness: 170, damping: 22, mass: 1 };
  const indicatorX = useMotionValue(0);
  const indicatorW = useMotionValue(0);
  const springX = useSpring(indicatorX, springConfig);
  const springW = useSpring(indicatorW, springConfig);

  const updateIndicator = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !dotNavRef.current) return;
      const navRect = dotNavRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      indicatorX.set(elRect.left - navRect.left);
      indicatorW.set(elRect.width);
    },
    [indicatorX, indicatorW],
  );

  const targetDot = hoveredDot ?? (dotNav?.activeIndex ?? 0);

  useEffect(() => {
    if (!dotNav) return;
    const el = dotItemRefs.current[targetDot];
    if (el) {
      updateIndicator(el);
      // 라벨 확장 후 재측정 (active item label transition 완료 시)
      const timer = setTimeout(() => updateIndicator(el), 320);
      return () => clearTimeout(timer);
    }
  }, [targetDot, updateIndicator, dotNav, dotNav?.activeIndex]);

  return (
    <div className={styles.pinnedTitleRow}>
      <div>
        <span className={`${styles.panelNumber}${animateClass}`}>{number}</span>
        <h3 className={titleClasses}>{title}</h3>
      </div>
      {dotNav && (
        <div
          ref={dotNavRef}
          className={`${styles.dotNav}${dotNav.className ? ` ${dotNav.className}` : ""}${animateClass}`}
          onMouseLeave={() => setHoveredDot(null)}
        >
          <motion.span
            className={styles.dotIndicator}
            style={{ x: springX, width: springW }}
          />
          {Array.from({ length: dotNav.count }, (_, i) => (
            <button
              data-clickable="true"
              key={i}
              ref={(el) => {
                dotItemRefs.current[i] = el;
              }}
              className={`${styles.dotItem} ${i === dotNav.activeIndex ? styles.dotItemActive : ""}`}
              onClick={() => dotNav.onDotClick(i)}
              onMouseEnter={() => setHoveredDot(i)}
            >
              <span className={styles.dotCircle} />
              {dotNav.labels?.[i] && (
                <span className={styles.dotText}>{dotNav.labels[i]}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
