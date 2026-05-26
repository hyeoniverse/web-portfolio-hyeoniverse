"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { motion, useMotionValue, useMotionValueEvent, animate } from "framer-motion";
import styles from "./LanguageToggle.module.css";

type Lang = "ko" | "en";

interface LanguageToggleProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  size?: "sm" | "md";
}

const THRESHOLD = 0.95;

const animationConfig = {
  type: "tween" as const,
  duration: 0.5,
  ease: [0.85, 0, 1, 1] as [number, number, number, number],
};

export default function LanguageToggle({ lang, onLangChange, size = "md" }: LanguageToggleProps) {
  const [hoveredBtn, setHoveredBtn] = useState<Lang | null>(null);
  const [indicatorAt, setIndicatorAt] = useState<Lang>(lang);
  const [locked, setLocked] = useState(false);
  const enBtnRef = useRef<HTMLSpanElement>(null);
  const enPosRef = useRef(0);
  const indicatorX = useMotionValue(0);

  useLayoutEffect(() => {
    const en = enBtnRef.current;
    if (!en) return;
    enPosRef.current = en.offsetLeft - 2;
    indicatorX.set(lang === "ko" ? 0 : enPosRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getEnPos = () => enPosRef.current;

  const getTarget = useCallback(() => {
    const ep = getEnPos();
    if (!locked && hoveredBtn && hoveredBtn !== lang) {
      return hoveredBtn === "en" ? ep : 0;
    }
    return lang === "ko" ? 0 : ep;
  }, [hoveredBtn, lang, locked]);

  useEffect(() => {
    const target = getTarget();
    const controls = animate(indicatorX.get(), target, {
      ...animationConfig,
      onUpdate: (latest) => indicatorX.set(latest),
    });
    return () => controls.stop();
  }, [getTarget, indicatorX]);

  useMotionValueEvent(indicatorX, "change", (x) => {
    const ep = getEnPos();
    if (ep <= 0) return;
    const progress = x / ep;
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
      className={`${styles.toggle} ${size === "sm" ? styles.toggleSm : ""}`}
      data-clickable="true"
      role="switch"
      tabIndex={0}
      aria-checked={lang === "en"}
      onClick={handleToggle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggle(); } }}
      onMouseLeave={() => { setHoveredBtn(null); setLocked(false); }}
    >
      <motion.div className={styles.indicator} style={{ x: indicatorX }} />
      <div className={styles.inner}>
        <span
          className={styles.btn}
          onMouseEnter={() => setHoveredBtn("ko")}
        >
          <span className={styles.textInverse} style={{ opacity: indicatorAt === "ko" ? 1 : 0 }}>KO</span>
          <span className={styles.textPrimary} style={{ opacity: indicatorAt === "ko" ? 0 : 1 }}>KO</span>
        </span>
        <span
          ref={enBtnRef}
          className={styles.btn}
          onMouseEnter={() => setHoveredBtn("en")}
        >
          <span className={styles.textInverse} style={{ opacity: indicatorAt === "en" ? 1 : 0 }}>EN</span>
          <span className={styles.textPrimary} style={{ opacity: indicatorAt === "en" ? 0 : 1 }}>EN</span>
        </span>
      </div>
    </div>
  );
}
