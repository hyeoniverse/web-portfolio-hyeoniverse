"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./LoadingScreen.module.css";
import { config } from "@/config";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { thisYear } from "@/utils";
import FontMorphText from "@/components/effects/FontMorphText";
import { DEFAULT_FONTS } from "@/hooks/useFontMorph";

// Redis-style easing curves
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_IN_OUT_EXPO: [number, number, number, number] = [0.87, 0, 0.13, 1];

export default function LoadingScreen() {
  const { isLoading, isTransitioning, progress } = useLoadingScreen();
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const [, setIsMounted] = useState(false);
  const animationRef = useRef<number | null>(null);
  const prevProgressRef = useRef(0);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Counting animation for progress number
  useEffect(() => {
    const targetProgress = Math.round(progress);
    const startProgress = prevProgressRef.current;
    const difference = targetProgress - startProgress;

    if (difference === 0) return;

    const duration = 300; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
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

  if (!isLoading) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="loading-screen"
        className={`${styles.loadingScreen}`}
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
      >
        {/* Main Content */}
        <div className={styles.content}>
          {/* Top Meta */}
          <motion.div
            className={styles.topMeta}
            initial={{ opacity: 0, y: -20 }}
            animate={{
              opacity: isTransitioning ? 0 : 1,
              y: isTransitioning ? -40 : 0,
            }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE_OUT_EXPO }}
          >
            <span className={styles.metaLabel}>Portfolio</span>
            <span className={styles.metaDivider}>/</span>
            <span className={styles.metaValue}>{thisYear}</span>
          </motion.div>

          {/* Center - Bold Typography */}
          <div className={styles.heroSection}>
            {/* Large Name - Font Morph Animation */}
            <motion.div
              className={styles.nameContainer}
              initial={{ opacity: 0, y: 60 }}
              animate={{
                opacity: isTransitioning ? 0 : 1,
                y: isTransitioning ? -60 : 0,
              }}
              transition={{ duration: 0.8, delay: 0.4, ease: EASE_OUT_EXPO }}
            >
              <h1 className={styles.heroName}>
                <FontMorphText
                  text={config.personal.eng.name}
                  fonts={DEFAULT_FONTS}
                  autoPlay={!isTransitioning}
                  interval={250} // 500ms마다 전환
                  hoverTrigger={false}
                  countingDuration={600} // 전체 카운팅 지속시간
                  countingSpeed={230} // 각 프레임 간격 (느리게)
                  splitByChar={true} // 글자별로 쪼개기
                  staggerDelay={0.04}
                  animationDuration={0.5}
                  charClassName={styles.nameChar}
                />
              </h1>
            </motion.div>

            {/* Role Tag with pulse */}
            <motion.div
              className={styles.roleContainer}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: isTransitioning ? 0 : 1,
                scale: isTransitioning ? 0.9 : 1,
              }}
              transition={{ duration: 0.6, delay: 0.8, ease: EASE_OUT_EXPO }}
            >
              <motion.span
                className={styles.roleTag}
                animate={{
                  borderColor: isTransitioning
                    ? "var(--text-primary)"
                    : [
                        "var(--text-primary)",
                        "var(--text-secondary)",
                        "var(--text-primary)",
                      ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {config.personal.eng.role}
              </motion.span>
            </motion.div>
            {/* Decorative Line with shimmer */}
            <motion.div
              className={styles.heroLine}
              initial={{ scaleX: 0 }}
              animate={{
                scaleX: isTransitioning ? 0 : 1,
              }}
              transition={{ duration: 1, delay: 0.6, ease: EASE_OUT_EXPO }}
            />
          </div>

          {/* Bottom Section */}
          <motion.div
            className={styles.bottomSection}
            initial={{ opacity: 0, y: 40 }}
            animate={{
              opacity: isTransitioning ? 0 : 1,
              y: isTransitioning ? 60 : 0,
            }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE_OUT_EXPO }}
          >
            {/* Progress Counter */}
            <div className={styles.progressArea}>
              <div className={styles.progressMeta}>
                <span className={styles.progressLabel}>Loading</span>
              </div>
              <div className={styles.progressCounter}>
                <span className={styles.progressNumber}>{displayProgress}</span>
              </div>
              {/* Progress Bar with glow */}
              <div className={styles.progressTrack}>
                <motion.div
                  className={styles.progressBar}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: progress / 100 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
                <motion.div
                  className={styles.progressGlow}
                  animate={{
                    left: `${progress}%`,
                    opacity: isTransitioning ? 0 : [0.5, 1, 0.5],
                  }}
                  transition={{
                    left: { duration: 0.4, ease: "easeOut" },
                    opacity: {
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                />
              </div>
            </div>

            {/* Location */}
            <div className={styles.locationArea}>
              <span className={styles.locationLabel}>Based in</span>
              <span className={styles.locationValue}>
                {config.personal.location}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Copyright - Absolutely positioned at bottom center */}
        <motion.div
          className={styles.copyrightArea}
          initial={{ opacity: 0 }}
          animate={{ opacity: isTransitioning ? 0 : 0.6 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <span className={styles.copyrightText}>© {thisYear} HYEON</span>
          <span className={styles.copyrightText}>All Rights Reserved</span>
        </motion.div>

        {/* Exit Reveal - Synced with HeroSection entrance */}
        <motion.div
          className={styles.exitReveal}
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{
            clipPath: isTransitioning ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)",
          }}
          transition={{ duration: 0.8, ease: EASE_IN_OUT_EXPO }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
