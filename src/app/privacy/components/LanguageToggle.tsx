"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, useMotionValue, useMotionValueEvent, animate } from "framer-motion";
import type { Language } from "@/data/privacyContent";
import styles from "./LanguageToggle.module.css";

interface LanguageToggleProps {
  lang: Language;
  onLangChange: (lang: Language) => void;
}

// 위치 상수 (픽셀)
const KO_POSITION = 0;
const EN_POSITION = 48;
const THRESHOLD = 0.95;

// 애니메이션 설정 - 매우 느리게 시작한 후 급격하게 가속
const animationConfig = {
  type: "tween" as const,
  duration: 0.5,
  ease: [0.85, 0, 1, 1] as [number, number, number, number], // strong ease-in curve
};

export default function LanguageToggle({
  lang,
  onLangChange,
}: LanguageToggleProps) {
  const [hoveredBtn, setHoveredBtn] = useState<Language | null>(null);
  const [indicatorAt, setIndicatorAt] = useState<Language>(lang);

  // 인디케이터 위치용 모션 값
  const indicatorX = useMotionValue(lang === "ko" ? KO_POSITION : EN_POSITION);

  // 호버 및 현재 언어에 따른 목표 위치 계산
  const targetPosition = useMemo(() => {
    if (hoveredBtn && hoveredBtn !== lang) {
      // 자기 효과: 호버된 버튼 쪽으로 이동
      return hoveredBtn === "en" ? EN_POSITION : KO_POSITION;
    }
    // 기본: 현재 언어 위치에 유지
    return lang === "ko" ? KO_POSITION : EN_POSITION;
  }, [hoveredBtn, lang]);

  // 목표 위치로 애니메이션 (느리게 시작, 가속)
  useEffect(() => {
    const controls = animate(indicatorX.get(), targetPosition, {
      ...animationConfig,
      onUpdate: (latest) => indicatorX.set(latest),
    });
    return () => controls.stop();
  }, [targetPosition, indicatorX]);

  // 모션 값 구독 및 임계값 초과 시 indicatorAt 업데이트
  useMotionValueEvent(indicatorX, "change", (x) => {
    const progress = x / EN_POSITION;
    if (progress >= THRESHOLD) {
      setIndicatorAt("en");
    } else if (progress <= 1 - THRESHOLD) {
      setIndicatorAt("ko");
    }
  });

  // 언어 변경 시 indicatorAt을 lang과 동기화
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
