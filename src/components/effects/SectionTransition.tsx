"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/stores/appStore";
import {
  sectionTransitionWrapper,
  sectionTransitionBackdrop,
  sectionTransitionContent,
  sectionTransitionLine,
  sectionTransitionCorner,
} from "@/animations";
import styles from "./SectionTransition.module.css";

export default function SectionTransition() {
  const { isTransitioning, transitionDirection, endTransition } =
    useAppStore();

  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => endTransition(), 1000);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, endTransition]);

  const isDown = transitionDirection === "down";

  return (
    <AnimatePresence mode="wait">
      {isTransitioning && (
        <motion.div
          className={styles.wrapper}
          variants={sectionTransitionWrapper}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Main background */}
          <motion.div
            className={styles.backdrop}
            variants={sectionTransitionBackdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ originY: isDown ? 0 : 1 }}
          />

          {/* Content */}
          <motion.div
            className={styles.content}
            variants={sectionTransitionContent}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Top line */}
            <motion.div
              className={styles.line}
              variants={sectionTransitionLine}
              initial="hidden"
              animate="visible"
            />

            {/* Center content */}
            <div className={styles.center}>
              <motion.span
                className={styles.label}
                initial={{ opacity: 0, y: isDown ? 15 : -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                {isDown ? "Scrolling" : "Returning"}
              </motion.span>

              <motion.div
                className={styles.direction}
                initial={{ opacity: 0, scale: 0.5, rotate: isDown ? -90 : 90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.4, delay: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <span className={styles.arrow}>{isDown ? "↓" : "↑"}</span>
              </motion.div>

              <motion.span
                className={styles.action}
                initial={{ opacity: 0, y: isDown ? -15 : 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                {isDown ? "Next Section" : "Previous Section"}
              </motion.span>
            </div>

            {/* Bottom line */}
            <motion.div
              className={styles.line}
              variants={sectionTransitionLine}
              initial="hidden"
              animate="visible"
            />
          </motion.div>

          {/* Corner accents */}
          <motion.div
            className={`${styles.corner} ${styles.topLeft}`}
            variants={sectionTransitionCorner}
            initial="hidden"
            animate="visible"
            exit="exit"
            custom={360}
          >
            ✦
          </motion.div>
          <motion.div
            className={`${styles.corner} ${styles.bottomRight}`}
            variants={sectionTransitionCorner}
            initial="hidden"
            animate="visible"
            exit="exit"
            custom={-360}
          >
            ✦
          </motion.div>

          {/* Grain overlay */}
          <div className={styles.grain} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
