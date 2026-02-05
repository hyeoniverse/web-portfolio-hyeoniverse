"use client";

import { useMemo, useCallback, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_FONTS, type FontConfig } from "@/hooks/useFontMorph";
import styles from "./FontMorphText.module.css";

// ============================================
// Types
// ============================================
export interface FontMorphTextProps {
  text: string; // 표시할 텍스트
  fonts?: FontConfig[]; // 사용할 폰트 목록
  autoPlay?: boolean; // 자동으로 폰트 변경
  interval?: number; // 자동 변경 간격 (ms)
  className?: string;
  charClassName?: string;
  hoverTrigger?: boolean; // 호버 시 변경 활성화
  countingDuration?: number; // 각 프레임 간격 (50ms)
  countingSpeed?: number; // 전체 카운팅 지속 시간 (ms)
  splitByChar?: boolean; // 글자별로 쪼개기
  staggerDelay?: number; // 글자별 등장 지연 (0.03s)
  animationDuration?: number; // 글자 등장 애니메이션 시간
  onFontChange?: (font: FontConfig, index: number) => void;
}

// Animation easing
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ============================================
// Component
// ============================================
export default function FontMorphText({
  text,
  fonts = DEFAULT_FONTS,
  autoPlay = false,
  interval = 2000,
  className = "",
  charClassName = "",
  hoverTrigger = true,
  countingDuration = 600,
  countingSpeed = 50,
  splitByChar = true,
  staggerDelay = 0.03,
  animationDuration = 0.5,
  onFontChange,
}: FontMorphTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);

  const countingRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const targetIndexRef = useRef(0);
  const isHoveringRef = useRef(false);

  const currentFont = fonts[displayIndex] || fonts[0];

  // Split text into characters
  const characters = useMemo(() => {
    return text.split("");
  }, [text]);

  // Counting animation - rapidly cycle through fonts then settle
  const startCounting = useCallback(
    (targetIdx?: number) => {
      if (isCounting) return;

      // Calculate target index
      const nextTarget =
        targetIdx !== undefined ? targetIdx : (currentIndex + 1) % fonts.length;
      targetIndexRef.current = nextTarget;

      setIsCounting(true);

      let iterations = 0;
      const totalIterations = Math.floor(countingDuration / countingSpeed);

      // Rapid cycling phase
      countingRef.current = setInterval(() => {
        iterations++;

        // Random font during counting
        const randomIdx = Math.floor(Math.random() * fonts.length);
        setDisplayIndex(randomIdx);

        // Slow down near the end and settle on target
        if (iterations >= totalIterations) {
          if (countingRef.current) {
            clearInterval(countingRef.current);
            countingRef.current = null;
          }

          // Final settle animation
          setDisplayIndex(targetIndexRef.current);
          setCurrentIndex(targetIndexRef.current);
          setIsCounting(false);
        }
      }, countingSpeed);
    },
    [isCounting, currentIndex, fonts.length, countingDuration, countingSpeed],
  );

  // Handle hover - trigger counting animation
  const handleMouseEnter = useCallback(() => {
    if (!hoverTrigger) return;
    isHoveringRef.current = true;
    startCounting();
  }, [hoverTrigger, startCounting]);

  const handleMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
  }, []);

  // Auto-play effect
  useEffect(() => {
    if (autoPlay && !isCounting) {
      autoPlayRef.current = setInterval(() => {
        if (!isHoveringRef.current) {
          startCounting();
        }
      }, interval);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, [autoPlay, interval, isCounting, startCounting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countingRef.current) clearInterval(countingRef.current);
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, []);

  // Notify parent of font change
  useEffect(() => {
    onFontChange?.(currentFont, displayIndex);
  }, [currentFont, displayIndex, onFontChange]);

  const fontStyle = {
    fontFamily: currentFont.family,
    fontWeight: currentFont.weight || 400,
    fontStyle: currentFont.style || "normal",
  };

  return (
    <div
      className={`${styles.container} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={displayIndex}
          className={styles.textWrapper}
          style={fontStyle}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{
            duration: isCounting ? 0.05 : 0.3,
            ease: isCounting ? "linear" : EASE_OUT_EXPO,
          }}
        >
          {splitByChar ? (
            characters.map((char, index) => (
              <motion.span
                key={index}
                className={`${styles.char} ${charClassName}`}
                initial={{ opacity: 0, y: 30, rotateX: -60 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  duration: animationDuration,
                  delay: index * staggerDelay,
                  ease: EASE_OUT_EXPO,
                }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))
          ) : (
            <span>{text}</span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
