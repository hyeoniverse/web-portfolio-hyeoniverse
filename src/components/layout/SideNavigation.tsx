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

// Animation duration in seconds
const ANIMATION_DURATION = 0.35;

export default function SideNavigation() {
  const pathname = usePathname();
  const { playSound } = useSoundManager();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const sideNavWidthRef = useRef<number>(210);
  const animationRef = useRef<number | null>(null);

  // Get TOC labels for current route
  const currentTocLabels: TocLabel[] | null = TOC_LABELS[pathname] || null;

  // Determine visibility based on route
  useEffect(() => {
    const shouldShow = ROUTES_WITH_NAV.includes(pathname);
    setIsSidebarVisible(shouldShow);
  }, [pathname]);

  const isVisible = isSidebarVisible && currentTocLabels !== null;

  // Get actual side-nav-width from CSS
  useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--side-nav-width")
      .trim();
    sideNavWidthRef.current = parseInt(value) || 210;
  }, []);

  // Animate width and sync CSS variable
  useEffect(() => {
    // Cancel any ongoing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    const root = document.documentElement;
    const targetWidth = isVisible ? sideNavWidthRef.current : 0;

    // Get current width
    let startWidth = parseInt(
      root.style.getPropertyValue("--active-side-nav-width") || "0"
    );
    if (isNaN(startWidth)) startWidth = isVisible ? 0 : sideNavWidthRef.current;

    // Skip animation if already at target
    if (Math.abs(startWidth - targetWidth) < 1) {
      root.style.setProperty("--active-side-nav-width", `${targetWidth}px`);
      return;
    }

    const startTime = performance.now();
    const duration = ANIMATION_DURATION * 1000;

    const animateWidth = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Cubic bezier approximation for [0.4, 0, 0.2, 1]
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
