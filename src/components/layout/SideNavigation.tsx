"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSoundManager } from "@/hooks/useSoundManager";
import { ROUTES_WITH_NAV, TOC_LABELS } from "@/constants";
import type { TocLabel } from "@/types";
import { fadeInUp, staggerContainer, sideNavVariants } from "@/animations";
import styles from "./SideNavigation.module.css";

// 애니메이션 지속 시간 (초)
const ANIMATION_DURATION = 0.35;

export default function SideNavigation() {
  const pathname = usePathname();
  const { playSound } = useSoundManager();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const sideNavWidthRef = useRef<number>(210);
  const animationRef = useRef<number | null>(null);

  // 현재 경로에 해당하는 TOC 라벨 가져오기
  const currentTocLabels: TocLabel[] | null = TOC_LABELS[pathname] || null;

  // 경로에 따라 표시 여부 결정
  useEffect(() => {
    const shouldShow = ROUTES_WITH_NAV.includes(pathname);
    setIsSidebarVisible(shouldShow);
  }, [pathname]);

  const isVisible = isSidebarVisible && currentTocLabels !== null;

  // CSS에서 실제 side-nav-width 값 가져오기
  useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--side-nav-width")
      .trim();
    sideNavWidthRef.current = parseInt(value) || 210;
  }, []);

  // 너비 애니메이션 및 CSS 변수 동기화
  useEffect(() => {
    // 진행 중인 애니메이션 취소
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    const root = document.documentElement;
    const targetWidth = isVisible ? sideNavWidthRef.current : 0;

    // 현재 너비 가져오기
    let startWidth = parseInt(
      root.style.getPropertyValue("--active-side-nav-width") || "0"
    );
    if (isNaN(startWidth)) startWidth = isVisible ? 0 : sideNavWidthRef.current;

    // 이미 목표 값에 도달한 경우 애니메이션 건너뛰기
    if (Math.abs(startWidth - targetWidth) < 1) {
      root.style.setProperty("--active-side-nav-width", `${targetWidth}px`);
      return;
    }

    const startTime = performance.now();
    const duration = ANIMATION_DURATION * 1000;

    const animateWidth = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // [0.4, 0, 0.2, 1] 큐빅 베지어 근사
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentWidth = startWidth + (targetWidth - startWidth) * eased;
      root.style.setProperty("--active-side-nav-width", `${currentWidth}px`);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateWidth);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animateWidth);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible]);

  const handleMouseEnter = useCallback(() => {
    playSound("hover");
  }, [playSound]);

  const handleClick = useCallback(() => {
    playSound("click");
  }, [playSound]);

  return (
    <AnimatePresence mode="wait">
      {isVisible && currentTocLabels && (
        <motion.nav
          id="side-navigation"
          variants={sideNavVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          custom={sideNavWidthRef.current}
          style={{ overflow: "hidden" }}
        >
          <motion.div
            className={styles.tocContent}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {currentTocLabels.map((item, index) => {
              const isActive = item.path === pathname;
              return (
                <motion.div
                  key={item.section}
                  variants={fadeInUp}
                  custom={index}
                >
                  <Link
                    href={item.path || "/"}
                    className={`${styles.tocButton} ${isActive ? styles.active : ""}`}
                    onMouseEnter={handleMouseEnter}
                    onClick={handleClick}
                  >
                    <motion.span
                      whileHover={isActive ? undefined : { scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {item.label}
                    </motion.span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
