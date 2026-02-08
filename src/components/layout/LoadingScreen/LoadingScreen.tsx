"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./LoadingScreen.module.css";
import { siteConfig } from "@/config/site.config";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";

// Pages that should skip the loading screen
const SKIP_LOADING_PAGES = ["/privacy"];

export default function LoadingScreen() {
  const pathname = usePathname();
  const { isLoading, isTransitioning, progress } = useLoadingScreen();
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const prevProgressRef = useRef(0);

  // Skip loading screen for certain pages
  const shouldSkipLoading = SKIP_LOADING_PAGES.includes(pathname);

  // Counting animation for progress number
  useEffect(() => {
    const targetProgress = Math.round(progress);
    const startProgress = prevProgressRef.current;
    const difference = targetProgress - startProgress;

    if (difference === 0) return;

    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startProgress + difference * eased);

      setDisplayedProgress(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevProgressRef.current = targetProgress;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [progress]);

  const displayProgress = useMemo(() => {
    return displayedProgress.toString().padStart(3, "0");
  }, [displayedProgress]);

  if (!isLoading || shouldSkipLoading) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="loading-screen"
        className={styles.loadingScreen}
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className={styles.content}>
          {/* Name */}
          <motion.h1
            className={styles.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isTransitioning ? 0 : 1,
              y: isTransitioning ? -20 : 0,
            }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {siteConfig.loading.displayName}
          </motion.h1>

          {/* Progress */}
          <motion.div
            className={styles.progressWrapper}
            initial={{ opacity: 0 }}
            animate={{
              opacity: isTransitioning ? 0 : 1,
            }}
            transition={{ duration: 0.4, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <span className={styles.progressNumber}>{displayProgress}</span>
            <div className={styles.progressTrack}>
              <motion.div
                className={styles.progressBar}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: progress / 100 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
