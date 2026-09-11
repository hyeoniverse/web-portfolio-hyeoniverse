"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useStateFromProp } from "@/hooks/useStateFromProp";
import type { Language } from "@/types";
import { motion, useMotionValue, useMotionValueEvent, animate } from "framer-motion";
import styles from "./LanguageToggle.module.css";


interface LanguageToggleProps {
  lang: Language;
  onLangChange: (lang: Language) => void;
  size?: "sm" | "md";
}

const THRESHOLD = 0.95;

const animationConfig = {
  type: "tween" as const,
  duration: 0.5,
  ease: [0.85, 0, 1, 1] as [number, number, number, number],
};

export default function LanguageToggle({ lang, onLangChange, size = "md" }: LanguageToggleProps) {
  const [hoveredBtn, setHoveredBtn] = useState<Language | null>(null);
  const [indicatorAt, setIndicatorAt] = useStateFromProp<Language>(lang);
  const [locked, setLocked] = useState(false);
  const enBtnRef = useRef<HTMLSpanElement>(null);
  const enPosRef = useRef<number | null>(null);
  const indicatorX = useMotionValue(0);

  /* EN 단추의 위치 — 처음 쓸 때 읽는다. 마운트할 때 읽으면 그 순간 레이아웃을 강제로 계산하는데, 편집 화면처럼
     DOM 이 큰 화면에서는 그 한 번이 오래 걸렸다(작업물 편집기를 열 때 80 ms 남짓).
     KO 로 시작하면 마우스를 올리거나 누를 때까지 필요 없다. */
  const getEnPos = () => {
    if (enPosRef.current === null && enBtnRef.current) enPosRef.current = enBtnRef.current.offsetLeft - 2;
    return enPosRef.current ?? 0;
  };

  useLayoutEffect(() => {
    if (lang === "en") indicatorX.set(getEnPos());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
