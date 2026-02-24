"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Children,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Carousel.module.css";

export interface CarouselProps {
  children: ReactNode;
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
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (index: number, dir?: number) => {
      if (isSingle) return;
      const newIdx = loop
        ? wrap(index, count)
        : Math.max(0, Math.min(index, count - 1));
      setDirection(dir ?? (index > current ? 1 : -1));
      setCurrent(newIdx);
      setProgressKey((k) => k + 1);
    },
    [count, loop, isSingle, current],
  );

  const goNext = useCallback(() => goTo(current + 1, 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  /* Auto-play */
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

  const viewportStyle = height ? { height: typeof height === "number" ? `${height}px` : height } : undefined;

  /* Slide transition variants */
  const slideVariants = {
    enter: (d: number) => ({
      x: d > 0 ? "80%" : "-80%",
      scale: 0.92,
      opacity: 0,
    }),
    center: {
      x: 0,
      scale: 1,
      opacity: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? "-80%" : "80%",
      scale: 0.92,
      opacity: 0,
    }),
  };

  /* Single slide */
  if (isSingle) {
    return (
      <div className={`${styles.carousel} ${className ?? ""}`}>
        <div className={styles.viewport} style={viewportStyle}>
          <div className={`${styles.active} ${styles.edgeBoth}`}>
            <div className={styles.slideInner}>{slides[0] ?? null}</div>
          </div>
        </div>
      </div>
    );
  }

  /* Upcoming 2 slides */
  const next1 = wrap(current + 1, count);
  const next2 = wrap(current + 2, count);

  const handleMouseEnter = pauseOnHover ? () => setPaused(true) : undefined;
  const handleMouseLeave = pauseOnHover ? () => setPaused(false) : undefined;

  return (
    <div
      className={`${styles.carousel} ${className ?? ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.viewportWrap}>
        <div className={styles.viewport} style={viewportStyle}>
          {/* Active slide container */}
          <div className={`${styles.active} ${styles.edgeLeft}`}>
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className={styles.activeSlide}
                transition={{
                  type: "tween",
                  duration: 0.7,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                <div className={styles.slideInner}>{slides[current]}</div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Upcoming slivers */}
          <div
            className={styles.sliver}
            onClick={() => goTo(next1, 1)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goTo(next1, 1);
              }
            }}
            data-clickable="true"
          >
            <div className={styles.slideInner}>{slides[next1]}</div>
          </div>

          <div
            className={`${styles.sliver} ${styles.edgeRight}`}
            onClick={() => goTo(next2, 1)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goTo(next2, 1);
              }
            }}
            data-clickable="true"
          >
            <div className={styles.slideInner}>{slides[next2]}</div>
          </div>
        </div>

        {/* Arrows */}
        {showArrows && (
          <>
            <button
              className={`${styles.arrow} ${styles.arrowPrev}`}
              onClick={goPrev}
              aria-label="Previous slide"
              data-clickable="true"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              className={`${styles.arrow} ${styles.arrowNext}`}
              onClick={goNext}
              aria-label="Next slide"
              data-clickable="true"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Indicator — progress dots */}
        {showDots && (
          <div className={styles.indicator}>
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
