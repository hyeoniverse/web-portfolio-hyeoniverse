"use client";

import { useKeepOnTopRef } from "@/hooks/useTopLayer";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePageTransition } from "@/stores/pageTransition";
import styles from "./PageTransitionOverlay.module.css";

export default function PageTransitionOverlay() {
  const { isTransitioning, circleData, endTransition } = usePageTransition();

  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        endTransition();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, endTransition]);

  /* 늘 맨 위(3.10-1) — 모달 · 팝오버 위로 */
  const topRef = useKeepOnTopRef<HTMLDivElement>(1);

  return (
    <AnimatePresence>
      {isTransitioning && circleData && (
        <motion.div
          ref={topRef}
          className={styles.overlay}
          data-nav-tone-skip
          initial={{
            top: circleData.centerY - circleData.size / 2,
            left: circleData.centerX - circleData.size / 2,
            width: circleData.size,
            height: circleData.size,
            borderRadius: "50%",
          }}
          animate={{
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            borderRadius: "0%",
          }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <motion.img
            src={circleData.image}
            alt=""
            className={styles.image}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 1,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
