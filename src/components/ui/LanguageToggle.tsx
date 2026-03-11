"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, useMotionValue, useMotionValueEvent, animate } from "framer-motion";
import styles from "./LanguageToggle.module.css";

type Lang = "ko" | "en";

interface LanguageToggleProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

const KO_POSITION = 0;
const EN_POSITION = 44;
const THRESHOLD = 0.95;

const animationConfig = {
  type: "tween" as const,
  duration: 0.5,
  ease: [0.85, 0, 1, 1] as [number, number, number, number],
};

export default function LanguageToggle({ lang, onLangChange }: LanguageToggleProps) {
  const [hoveredBtn, setHoveredBtn] = useState<Lang | null>(null);
  const [indicatorAt, setIndicatorAt] = useState<Lang>(lang);
  const [locked, setLocked] = useState(false);

  const indicatorX = useMotionValue(lang === "ko" ? KO_POSITION : EN_POSITION);

  const targetPosition = useMemo(() => {
    if (!locked && hoveredBtn && hoveredBtn !== lang) {
      return hoveredBtn === "en" ? EN_POSITION : KO_POSITION;
    }
    return lang === "ko" ? KO_POSITION : EN_POSITION;
  }, [hoveredBtn, lang, locked]);

  useEffect(() => {
    const controls = animate(indicatorX.get(), targetPosition, {
      ...animationConfig,
      onUpdate: (latest) => indicatorX.set(latest),
    });
    return () => controls.stop();
  }, [targetPosition, indicatorX]);

  useMotionValueEvent(indicatorX, "change", (x) => {
    const progress = x / EN_POSITION;
    if (progress >= THRESHOLD) {
      setIndicatorAt("en");
    } else if (progress <= 1 - THRESHOLD) {
      setIndicatorAt("ko");
    }
  });

  useEffect(() => {
    setIndicatorAt(lang);
  }, [lang]);

  const handleToggle = useCallback(() => {
    setLocked(true);
    onLangChange(lang === "ko" ? "en" : "ko");
  }, [lang, onLangChange]);

  return (
    <div
      className={styles.toggle}
      data-clickable="true"
      onClick={handleToggle}
      onMouseLeave={() => { setHoveredBtn(null); setLocked(false); }}
    >
      <motion.div className={styles.indicator} style={{ x: indicatorX }} />
      <div className={styles.inner}>
        <span
          className={styles.btn}
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
        </span>
        <span
          className={styles.btn}
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
        </span>
      </div>
    </div>
  );
}
