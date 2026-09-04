"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";
import { usePanelTitle } from "../_hooks/usePanelTitle";
import frame from "./AboutPanel.module.css";
import nav from "./AboutNav.module.css";
import shell from "./AboutSection.module.css";
import Pressable from "@/components/ui/Pressable";
const styles = { ...frame, ...nav, ...shell };

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
  /** 제목을 직접 넘길 때만. 보통은 panelKey 만 주고 레지스트리가 정하게 둔다. */
  title?: React.ReactNode;
  /** 패널 키 — 관리자 override → @/data/about/panels 기본값 순으로 제목이 정해진다. */
  panelKey?: string;
  /** panelTitleCompact 클래스 적용 여부 */
  compact?: boolean;
  /** animate 클래스 적용 여부 */
  animate?: boolean;
  /** 점 네비게이션 설정 (없으면 표시 안 함) */
  dotNav?: DotNavConfig;
  /** dotNav 대신 오른쪽에 커스텀 콘텐츠 표시 */
  rightContent?: React.ReactNode;
  /** 추가 CSS 클래스 */
  className?: string;
}

/** 패널 상단 타이틀 행 — 제목 + 선택적 점 네비게이션 */
export default function PinnedTitleRow({
  title,
  panelKey,
  compact = false,
  animate = false,
  dotNav,
  rightContent,
  className,
}: PinnedTitleRowProps) {
  /* 제목을 직접 받은 경우에만 그것을 쓴다. 아니면 키로 정해진 제목. */
  const resolved = usePanelTitle(panelKey ?? "");
  const animateClass = animate ? ` ${styles.animate}` : "";
  const titleClasses = `${styles.panelTitle}${compact ? ` ${styles.panelTitleCompact}` : ""}${animateClass}`;

  // Dot nav indicator springs
  const dotNavRef = useRef<HTMLDivElement>(null);
  const dotItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);

  const springConfig = { stiffness: 170, damping: 22, mass: 1 };
  const indicatorX = useMotionValue(0);
  const indicatorW = useMotionValue(0);
  const indicatorH = useMotionValue(0);
  const springX = useSpring(indicatorX, springConfig);
  const springW = useSpring(indicatorW, springConfig);
  const springH = useSpring(indicatorH, springConfig);

  const updateIndicator = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !dotNavRef.current) return;
      const navRect = dotNavRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      indicatorX.set(elRect.left - navRect.left);
      indicatorW.set(elRect.width);
      indicatorH.set(elRect.height);
    },
    [indicatorX, indicatorW, indicatorH],
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
    <div className={`${styles.pinnedTitleRow}${className ? ` ${className}` : ""}`}>
      <div className={styles.titleRowLeft}>
        <h3 className={titleClasses}>{title ?? resolved}</h3>
        {rightContent}
      </div>
      {dotNav && (
        <div className={`${styles.dotNavWrap}${dotNav.className ? ` ${dotNav.className}` : ""}${animateClass}`}>
          <Pressable noTapScale
            data-clickable="true"
            className={styles.dotArrow}
            onClick={() => dotNav.onDotClick(0)}
            disabled={dotNav.activeIndex === 0}
            aria-label="First"
          >
            «
          </Pressable>
          <Pressable noTapScale
            data-clickable="true"
            className={styles.dotArrow}
            onClick={() => dotNav.onDotClick(Math.max(0, dotNav.activeIndex - 1))}
            disabled={dotNav.activeIndex === 0}
            aria-label="Previous"
          >
            ‹
          </Pressable>

          <div
            ref={dotNavRef}
            className={styles.dotNav}
            onMouseLeave={() => setHoveredDot(null)}
          >
            <motion.span
              className={styles.dotIndicator}
              style={{ x: springX, y: "-50%", width: springW, height: springH }}
            />
            {Array.from({ length: dotNav.count }, (_, i) => (
              <Pressable noTapScale
                data-clickable="true"
                key={i}
                ref={(el) => {
                  dotItemRefs.current[i] = el;
                }}
                className={`${styles.dotItem} ${i === dotNav.activeIndex ? styles.dotItemActive : ""}`}
                onClick={() => dotNav.onDotClick(i)}
                onMouseEnter={() => setHoveredDot(i)}
                aria-label={dotNav.labels?.[i] ?? `Item ${i + 1} of ${dotNav.count}`}
                aria-current={i === dotNav.activeIndex ? "step" : undefined}
              >
                <span className={styles.dotCircle} />
                {dotNav.labels?.[i] && (
                  <span className={styles.dotText}>{dotNav.labels[i]}</span>
                )}
              </Pressable>
            ))}
          </div>

          <Pressable noTapScale
            data-clickable="true"
            className={styles.dotArrow}
            onClick={() => dotNav.onDotClick(Math.min(dotNav.count - 1, dotNav.activeIndex + 1))}
            disabled={dotNav.activeIndex === dotNav.count - 1}
            aria-label="Next"
          >
            ›
          </Pressable>
          <Pressable noTapScale
            data-clickable="true"
            className={styles.dotArrow}
            onClick={() => dotNav.onDotClick(dotNav.count - 1)}
            disabled={dotNav.activeIndex === dotNav.count - 1}
            aria-label="Last"
          >
            »
          </Pressable>
        </div>
      )}
    </div>
  );
}
