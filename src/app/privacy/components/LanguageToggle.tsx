"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, useMotionValue, useMotionValueEvent, animate } from "framer-motion";
import type { Language } from "@/data/privacyContent";
import styles from "./LanguageToggle.module.css";

interface LanguageToggleProps {
  lang: Language;
  onLangChange: (lang: Language) => void;
}

// Position constants (in pixels)
const KO_POSITION = 0;
const EN_POSITION = 48;
const THRESHOLD = 0.95;

// Animation config - starts very slow, then accelerates dramatically
const animationConfig = {
  type: "tween" as const,
  duration: 0.5,
  ease: [0.85, 0, 1, 1], // strong ease-in curve
};

export default function LanguageToggle({
  lang,
  onLangChange,
}: LanguageToggleProps) {
  const [hoveredBtn, setHoveredBtn] = useState<Language | null>(null);
  const [indicatorAt, setIndicatorAt] = useState<Language>(lang);

  // Motion value for indicator position
  const indicatorX = useMotionValue(lang === "ko" ? KO_POSITION : EN_POSITION);

  // Calculate target position based on hover and current lang
  const targetPosition = useMemo(() => {
    if (hoveredBtn && hoveredBtn !== lang) {
      // Magnetic effect: move toward hovered button
      return hoveredBtn === "en" ? EN_POSITION : KO_POSITION;
    }
    // Default: stay at current lang position
    return lang === "ko" ? KO_POSITION : EN_POSITION;
  }, [hoveredBtn, lang]);

  // Animate to target position (starts slow, accelerates)
  useEffect(() => {
    const controls = animate(indicatorX, targetPosition, animationConfig);
    return () => controls.stop();
  }, [targetPosition, indicatorX]);

  // Subscribe to motion value and update indicatorAt when threshold is crossed
  useMotionValueEvent(indicatorX, "change", (x) => {
    const progress = x / EN_POSITION;
    if (progress >= THRESHOLD) {
      setIndicatorAt("en");
    } else if (progress <= 1 - THRESHOLD) {
      setIndicatorAt("ko");
    }
  });

  // Sync indicatorAt with lang on lang change
  useEffect(() => {
    setIndicatorAt(lang);
  }, [lang]);

  return (
    <div className={styles.toggle} onMouseLeave={() => setHoveredBtn(null)}>
      <motion.div
        className={styles.indicator}
        style={{ x: indicatorX }}
      />
      <div className={styles.inner}>
        <button
          className={styles.btn}
          onClick={() => onLangChange("ko")}
          onMouseEnter={() => setHoveredBtn("ko")}
        >
          <span
            className={styles.textInverse}
            style={{ opacity: indicatorAt === "ko" ? 1 : 0 }}
          >
            KO
          </span>
          <span
            className={styles.textPrimary}
            style={{ opacity: indicatorAt === "ko" ? 0 : 1 }}
          >
            KO
          </span>
        </button>
        <button
          className={styles.btn}
          onClick={() => onLangChange("en")}
          onMouseEnter={() => setHoveredBtn("en")}
        >
          <span
            className={styles.textInverse}
            style={{ opacity: indicatorAt === "en" ? 1 : 0 }}
          >
            EN
          </span>
          <span
            className={styles.textPrimary}
            style={{ opacity: indicatorAt === "en" ? 0 : 1 }}
          >
            EN
          </span>
        </button>
      </div>
    </div>
  );
}
