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

  /* ── Cylinder visible slides ── */
  const cylinderSlides = isSingle
    ? []
    : [-1, 0, 1].map((offset) => ({
        idx: wrap(current + offset, count),
        offset,
      }));

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
          /* ── Default Mode — connected flow (no mode="wait") ── */
          <div className={styles.viewport} style={viewportStyle}>
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ x: `${d * 100}%` }),
                  center: { x: "0%" },
                  exit: (d: number) => ({ x: `${-d * 100}%` }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                className={styles.slide}
                transition={{
                  type: "tween",
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className={styles.slideInner}>{slides[current]}</div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          /* ── Cylinder Mode (3D) — slides flow together ── */
          <div
            className={`${styles.viewport} ${styles.viewport3d}`}
            style={viewportStyle}
          >
            <AnimatePresence initial={false}>
              {cylinderSlides.map(({ idx, offset }) => (
                <motion.div
                  key={idx}
                  className={styles.cylinder}
                  initial={{
                    x: direction > 0 ? "80%" : "-80%",
                    rotateY: direction > 0 ? -50 : 50,
                    scale: 0.65,
                    opacity: 0,
                  }}
                  animate={{
                    x: `${offset * 58}%`,
                    rotateY: offset * -40,
                    scale: offset === 0 ? 1 : 0.78,
                    opacity: 1,
                    zIndex: offset === 0 ? 2 : 1,
                  }}
                  exit={{
                    x: direction > 0 ? "-80%" : "80%",
                    rotateY: direction > 0 ? 50 : -50,
                    scale: 0.65,
                    opacity: 0,
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
                >
                  <div className={styles.slideInner}>{slides[idx]}</div>
                  {offset !== 0 && <div className={styles.cylinderOverlay} />}
                </motion.div>
              ))}
            </AnimatePresence>
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
