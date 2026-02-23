"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Children,
  type ReactNode,
} from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
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

const SWIPE_THRESHOLD = 50;
const SLIDE_TRANSITION = {
  type: "tween" as const,
  duration: 0.7,
  ease: [0.25, 0.1, 0.25, 1] as const,
};

function wrap(index: number, length: number) {
  return ((index % length) + length) % length;
}

/* Variant-based animation — slides transition smoothly between positions */
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    scale: 0.8,
    opacity: 0,
  }),
  prev: {
    x: "-75%",
    scale: 0.82,
    opacity: 0.4,
  },
  center: {
    x: "0%",
    scale: 1,
    opacity: 1,
  },
  next: {
    x: "75%",
    scale: 0.82,
    opacity: 0.4,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    scale: 0.8,
    opacity: 0,
  }),
};

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
  const [direction, setDirection] = useState(1);
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

  /* Swipe */
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x < -SWIPE_THRESHOLD) goNext();
      else if (info.offset.x > SWIPE_THRESHOLD) goPrev();
    },
    [goNext, goPrev],
  );

  /* Visible slides — deduplicate for 2-slide edge case */
  const visibleSlides = useMemo(() => {
    const prevIdx = wrap(current - 1, count);
    const nextIdx = wrap(current + 1, count);
    const result: { idx: number; pos: "prev" | "center" | "next" }[] = [
      { idx: prevIdx, pos: "prev" },
      { idx: current, pos: "center" },
    ];
    if (nextIdx !== prevIdx) {
      result.push({ idx: nextIdx, pos: "next" });
    }
    return result;
  }, [current, count]);

  /* Single slide */
  if (isSingle) {
    return (
      <div className={`${styles.carousel} ${className ?? ""}`}>
        <div className={styles.track}>
          <div className={styles.slideCenter}>{slides[0] ?? null}</div>
        </div>
      </div>
    );
  }

  const handleMouseEnter = pauseOnHover ? () => setPaused(true) : undefined;
  const handleMouseLeave = pauseOnHover ? () => setPaused(false) : undefined;

  return (
    <div
      className={`${styles.carousel} ${className ?? ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Track — AnimatePresence enables smooth enter/exit for slides */}
      <div className={styles.track}>
        <AnimatePresence initial={false} custom={direction}>
          {visibleSlides.map(({ idx, pos }) => (
            <motion.div
              key={idx}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate={pos}
              exit="exit"
              transition={SLIDE_TRANSITION}
              className={`${styles.slide} ${
                pos === "center"
                  ? styles.slideCenter
                  : pos === "prev"
                    ? styles.slidePrev
                    : styles.slideNext
              }`}
              {...(pos === "center"
                ? {
                    drag: "x" as const,
                    dragConstraints: { left: 0, right: 0 },
                    dragElastic: 0.12,
                    onDragEnd: handleDragEnd,
                  }
                : {
                    onClick: pos === "prev" ? goPrev : goNext,
                    "data-clickable": "true",
                  })}
            >
              {slides[idx]}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom bar: dots + progress */}
      <div className={styles.bottomBar}>
        {showArrows && (
          <button
            className={`${styles.arrow} ${styles.arrowPrev}`}
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
                onClick={() => goTo(i, i > current ? 1 : -1)}
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
            className={`${styles.arrow} ${styles.arrowNext}`}
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
