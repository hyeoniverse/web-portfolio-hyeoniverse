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
    (index: number) => {
      if (isSingle) return;
      const newIdx = loop
        ? wrap(index, count)
        : Math.max(0, Math.min(index, count - 1));
      setCurrent(newIdx);
      setProgressKey((k) => k + 1);
    },
    [count, loop, isSingle],
  );

  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

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

  /* Single slide */
  if (isSingle) {
    return (
      <div className={`${styles.carousel} ${className ?? ""}`}>
        <div className={styles.viewport}>
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
      <div className={styles.viewport}>
        {/* Active slide container — overflow clips enter/exit */}
        <div className={`${styles.active} ${styles.edgeLeft}`}>
          <AnimatePresence initial={false}>
            <motion.div
              key={current}
              className={styles.activeSlide}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
            >
              <div className={styles.slideInner}>{slides[current]}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Upcoming slivers */}
        <div
          className={styles.sliver}
          onClick={() => goTo(next1)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goTo(next1);
            }
          }}
          data-clickable="true"
        >
          <div className={styles.slideInner}>{slides[next1]}</div>
        </div>

        <div
          className={`${styles.sliver} ${styles.edgeRight}`}
          onClick={() => goTo(next2)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goTo(next2);
            }
          }}
          data-clickable="true"
        >
          <div className={styles.slideInner}>{slides[next2]}</div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        {showArrows && (
          <button
            className={styles.arrow}
            onClick={goPrev}
            aria-label="Previous slide"
            data-clickable="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {showDots && (
          <div className={styles.dots}>
            {slides.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === current ? styles.dotActive : ""}`}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                data-clickable="true"
              >
                {i === current && autoPlay && !paused && (
                  <motion.span
                    key={progressKey}
                    className={styles.dotProgress}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: interval / 1000, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {showArrows && (
          <button
            className={styles.arrow}
            onClick={goNext}
            aria-label="Next slide"
            data-clickable="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
