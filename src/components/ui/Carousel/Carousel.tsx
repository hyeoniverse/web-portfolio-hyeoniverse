"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Children,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import styles from "./Carousel.module.css";

export interface CarouselProps {
  children: ReactNode;
  mode?: "default" | "cylinder";
  autoPlay?: boolean;
  interval?: number;
  pauseOnHover?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  loop?: boolean;
  height?: number | string;
  className?: string;
}

function wrap(index: number, length: number) {
  return ((index % length) + length) % length;
}

export default function Carousel({
  children,
  mode = "default",
  autoPlay = true,
  interval = 5000,
  pauseOnHover = true,
  showArrows = true,
  showDots = true,
  loop = true,
  height,
  className,
}: CarouselProps) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const isSingle = count <= 1;

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (index: number, _dir?: number) => {
      if (isSingle) return;
      const newIdx = loop
        ? wrap(index, count)
        : Math.max(0, Math.min(index, count - 1));
      setCurrent(newIdx);
      setProgressKey((k) => k + 1);
    },
    [count, loop, isSingle],
  );

  const goNext = useCallback(() => goTo(current + 1, 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  useEffect(() => {
    if (isSingle || !autoPlay || paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setInterval(goNext, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSingle, autoPlay, paused, interval, goNext]);

  const viewportStyle = height
    ? { height: typeof height === "number" ? `${height}px` : height }
    : undefined;

  const handleMouseEnter = pauseOnHover ? () => setPaused(true) : undefined;
  const handleMouseLeave = pauseOnHover ? () => setPaused(false) : undefined;

  /* ── Cylinder: 각 슬라이드의 offset 계산 ── */
  const getCylinderOffset = useCallback(
    (i: number) => {
      const diff = ((i - current) % count + count) % count;
      if (diff === 0) return 0;
      if (diff === 1) return 1;
      if (diff === count - 1) return -1;
      return diff <= count / 2 ? 2 : -2;
    },
    [current, count],
  );

  /* ── Single slide ── */
  if (isSingle) {
    return (
      <div className={`${styles.carousel} ${className ?? ""}`}>
        <div className={styles.viewport} style={viewportStyle}>
          <div className={styles.slideWrapper}>
            <div className={styles.slideInner}>{slides[0] ?? null}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.carousel} ${className ?? ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.viewportWrap}>
        {mode === "default" ? (
          /* ── Default Mode — 모든 슬라이드 동시 렌더 + CSS opacity 전환 ── */
          <div className={styles.viewport} style={viewportStyle}>
            {slides.map((slide, i) => (
              <div
                key={i}
                className={`${styles.slide} ${i === current ? styles.slideActive : ""}`}
                aria-hidden={i !== current}
              >
                <div className={styles.slideInner}>{slide}</div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Cylinder Mode (3D) — 모든 슬라이드 동시 렌더 ── */
          <div
            className={`${styles.viewport} ${styles.viewport3d}`}
            style={viewportStyle}
          >
            {slides.map((slide, i) => {
              const offset = getCylinderOffset(i);
              const isVisible = Math.abs(offset) <= 1;
              return (
                <motion.div
                  key={i}
                  className={styles.cylinder}
                  initial={false}
                  animate={{
                    x: `${offset * 58}%`,
                    rotateY: offset * -40,
                    scale: offset === 0 ? 1 : 0.78,
                    opacity: isVisible ? 1 : 0,
                    zIndex: offset === 0 ? 2 : isVisible ? 1 : 0,
                  }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  onClick={
                    offset === -1
                      ? goPrev
                      : offset === 1
                        ? goNext
                        : undefined
                  }
                  data-clickable={offset !== 0 ? "true" : undefined}
                  style={{ pointerEvents: isVisible ? "auto" : "none" }}
                >
                  <div className={styles.slideInner}>{slide}</div>
                  {offset !== 0 && isVisible && (
                    <div className={styles.cylinderOverlay} />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Arrows */}
        {showArrows && (
          <>
            <button
              className={`${styles.arrow} ${styles.arrowPrev}`}
              onClick={goPrev}
              aria-label="Previous slide"
              data-clickable="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              className={`${styles.arrow} ${styles.arrowNext}`}
              onClick={goNext}
              aria-label="Next slide"
              data-clickable="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Dots indicator */}
        {showDots && (
          <div className={styles.dots}>
            {slides.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === current ? styles.dotActive : ""}`}
                onClick={() => goTo(i, i > current ? 1 : -1)}
                aria-label={`Go to slide ${i + 1}`}
                data-clickable="true"
              >
                {i === current && autoPlay && (
                  <motion.div
                    key={progressKey}
                    className={styles.dotFill}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: paused ? 0 : 1 }}
                    transition={{
                      duration: paused ? 0 : interval / 1000,
                      ease: "linear",
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
