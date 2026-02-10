"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  useMotionValue,
  useSpring,
  useTransform,
  motion,
} from "framer-motion";
import StaggerText from "@/components/effects/StaggerText/StaggerText";
import styles from "../WebFlowSection.module.css";

/* =========================================================================
   1. DemoParallax — Mouse Parallax Effect (HeroSection)
   ========================================================================= */
function DemoParallax() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const layer1X = useTransform(springX, [0, 1], [-20, 20]);
  const layer1Y = useTransform(springY, [0, 1], [-15, 15]);
  const layer2X = useTransform(springX, [0, 1], [-12, 12]);
  const layer2Y = useTransform(springY, [0, 1], [-8, 8]);
  const layer3X = useTransform(springX, [0, 1], [-6, 6]);
  const layer3Y = useTransform(springY, [0, 1], [-4, 4]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    },
    [mouseX, mouseY],
  );

  return (
    <div
      ref={containerRef}
      className={styles.codeDemoInner}
      onMouseMove={handleMouseMove}
      style={{ cursor: "crosshair" }}
    >
      <motion.div
        style={{
          x: layer1X,
          y: layer1Y,
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "1px solid var(--color-accent-alpha-30)",
          position: "absolute",
          top: "20%",
          left: "25%",
        }}
      />
      <motion.div
        style={{
          x: layer2X,
          y: layer2Y,
          width: 40,
          height: 40,
          border: "1px solid var(--text-tertiary)",
          position: "absolute",
          top: "50%",
          right: "25%",
        }}
      />
      <motion.div
        style={{
          x: layer3X,
          y: layer3Y,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "var(--color-accent-alpha-30)",
          position: "absolute",
          bottom: "25%",
          left: "45%",
        }}
      />
      <span className={styles.demoHint}>Move your mouse</span>
    </div>
  );
}

/* =========================================================================
   2. DemoStaggerText — StaggerText Component
   ========================================================================= */
function DemoStaggerText() {
  return (
    <div
      className={styles.codeDemoInner}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
        fontWeight: 600,
        color: "var(--text-accent-secondary)",
      }}
    >
      <StaggerText
        strokeColor="var(--text-accent-secondary)"
        strokeWidth={1}
        delayPerChar={0.04}
      >
        Hover Me
      </StaggerText>
    </div>
  );
}

/* =========================================================================
   3. DemoFontMorph — FontMorphText (font counting animation)
   ========================================================================= */
function DemoFontMorph() {
  const fonts = [
    { name: "Space Grotesk", family: "var(--font-space-grotesk), sans-serif" },
    { name: "Playfair", family: "var(--font-playfair), Georgia, serif" },
    { name: "JetBrains", family: "var(--font-jetbrains), monospace" },
    { name: "Inter", family: "var(--font-inter), sans-serif" },
  ];
  const [displayIdx, setDisplayIdx] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const countRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const currentIdx = useRef(0);

  const startCounting = useCallback(() => {
    if (isCounting) return;
    const target = (currentIdx.current + 1) % fonts.length;
    setIsCounting(true);
    let iterations = 0;
    const total = 10;

    const tick = () => {
      iterations++;
      setDisplayIdx(Math.floor(Math.random() * fonts.length));
      if (iterations >= total) {
        setDisplayIdx(target);
        currentIdx.current = target;
        setIsCounting(false);
        return;
      }
      // ease-out: intervals get progressively longer (60ms → ~200ms)
      const t = iterations / total;
      const delay = 60 + 160 * t * t;
      countRef.current = setTimeout(tick, delay);
    };
    countRef.current = setTimeout(tick, 60);
  }, [isCounting, fonts.length]);

  useEffect(() => {
    return () => {
      if (countRef.current) clearTimeout(countRef.current);
    };
  }, []);

  return (
    <div
      className={styles.codeDemoInner}
      onMouseEnter={startCounting}
    >
      <div
        className={styles.demoFontText}
        style={{ fontFamily: fonts[displayIdx].family }}
      >
        Design
      </div>
      <div className={styles.demoFontLabel}>{fonts[displayIdx].name}</div>
      <span className={styles.demoHint}>Hover to morph font</span>
    </div>
  );
}

/* =========================================================================
   4. DemoMagnetic — Magnetic Hover Effect (useMagnetic hook)
   ========================================================================= */
function DemoMagnetic() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * 0.35);
      y.set((e.clientY - centerY) * 0.35);
    },
    [x, y],
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <div
      className={styles.codeDemoInner}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: "none" }}
    >
      <motion.div
        className={styles.demoMagneticBtn}
        style={{ x: springX, y: springY }}
      >
        Hover
      </motion.div>
      <span className={styles.demoHint}>Move cursor near the button</span>
    </div>
  );
}

/* =========================================================================
   5. DemoClipPath — Direction-Aware ClipPath Reveal (WorksSection)
   ========================================================================= */
function DemoClipPath() {
  const [isHovered, setIsHovered] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dirX = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : 0;
      const dirY = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 1 : -1) : 0;
      setOrigin({ x: 50 + dirX * 50, y: 50 + dirY * 50 });
      setIsHovered(true);
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <div className={styles.codeDemoInner}>
      <div
        className={styles.demoClipBox}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={styles.demoClipBase}>Works</div>
        <motion.div
          className={styles.demoClipOverlay}
          initial={false}
          animate={{
            clipPath: isHovered
              ? "circle(100% at 50% 50%)"
              : `circle(0% at ${origin.x}% ${origin.y}%)`,
          }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          Works
        </motion.div>
      </div>
      <span className={styles.demoHint}>Hover from different sides</span>
    </div>
  );
}

/* =========================================================================
   6. DemoInfiniteScroll — Infinite Scroll Wrapping (Works Gallery)
   ========================================================================= */
function DemoInfiniteScroll() {
  const colors = [
    "var(--color-accent-alpha-30)",
    "var(--text-tertiary)",
    "var(--color-accent-alpha-50, var(--color-accent-alpha-30))",
    "var(--text-tertiary)",
    "var(--color-accent-alpha-30)",
    "var(--text-tertiary)",
    "var(--color-accent-alpha-30)",
    "var(--text-tertiary)",
    "var(--color-accent-alpha-50, var(--color-accent-alpha-30))",
    "var(--text-tertiary)",
    "var(--color-accent-alpha-30)",
    "var(--text-tertiary)",
  ];

  return (
    <div className={styles.codeDemoInner} style={{ overflow: "hidden" }}>
      <div className={styles.demoInfiniteTrack}>
        {[...colors, ...colors, ...colors].map((color, i) => (
          <div
            key={i}
            className={styles.demoInfiniteBlock}
            style={{ background: color }}
          />
        ))}
      </div>
      <span className={styles.demoHint}>Hover to pause</span>
    </div>
  );
}

/* =========================================================================
   7. DemoSvgPath — SVG Path Draw Animation (ParallaxBackground)
   ========================================================================= */
function DemoSvgPath() {
  const [animKey, setAnimKey] = useState(0);

  return (
    <div className={styles.codeDemoInner}>
      <svg
        width="220"
        height="80"
        viewBox="0 0 220 80"
        fill="none"
        className={styles.demoSvg}
      >
        <motion.path
          key={`p-${animKey}`}
          d="M10,40 C50,10 80,10 110,40 S170,70 210,40"
          stroke="var(--text-accent-secondary)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0.3 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        <motion.circle
          key={`c-${animKey}`}
          cx="210"
          cy="40"
          r="4"
          fill="var(--text-accent-secondary)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.9, duration: 0.3 }}
        />
        <motion.path
          key={`p2-${animKey}`}
          d="M10,60 Q60,30 110,55 T210,50"
          stroke="var(--text-tertiary)"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, ease: "easeInOut", delay: 0.3 }}
        />
      </svg>
      <button
        className={styles.demoBtn}
        onClick={() => setAnimKey((k) => k + 1)}
        style={{ marginTop: "var(--spacing-sm)" }}
      >
        Replay
      </button>
    </div>
  );
}

/* =========================================================================
   8. DemoLoadingProgress — Loading Screen (LoadingScreen)
   ========================================================================= */
function DemoLoadingProgress() {
  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number>(0);

  const start = useCallback(() => {
    if (isRunning || count > 0) {
      setCount(0);
      setProgress(0);
      setIsRunning(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    setIsRunning(true);
    startRef.current = performance.now();

    const step = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / 1800, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(eased * 100);
      setCount(val);
      setProgress(eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setIsRunning(false);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [isRunning, count]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className={styles.codeDemoInner}>
      <div className={styles.demoLoadingNumber}>
        {String(count).padStart(3, "0")}
      </div>
      <div className={styles.demoLoadingTrack}>
        <div
          className={styles.demoLoadingBar}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <button
        className={styles.demoBtn}
        onClick={start}
        style={{ marginTop: "var(--spacing-md)" }}
      >
        {count > 0 ? "Reset" : "Start"}
      </button>
    </div>
  );
}

/* =========================================================================
   9. DemoI18nShift — i18n Layout Shift Prevention (Works Intro)
   ========================================================================= */
function DemoI18nShift() {
  const [isKo, setIsKo] = useState(false);
  const en = "OK";
  const ko =
    "양식을 제출하기 전에 모든 필수 항목을 빠짐없이 작성해 주시기 바랍니다.";

  return (
    <div
      className={styles.codeDemoInner}
      style={{ justifyContent: "flex-start", paddingTop: "var(--spacing-md)" }}
    >
      <button
        className={styles.demoBtn}
        onClick={() => setIsKo((prev) => !prev)}
        style={{ marginBottom: "var(--spacing-md)" }}
      >
        {isKo ? "EN" : "KO"}
      </button>
      <div className={styles.demoI18nRow}>
        <div className={styles.demoI18nCol}>
          <span className={styles.demoI18nLabel}>no fix</span>
          <div className={styles.demoI18nTextBox}>{isKo ? ko : en}</div>
          <div className={styles.demoI18nBar}>Next →</div>
        </div>
        <div className={styles.demoI18nCol}>
          <span className={styles.demoI18nLabel}>min-height</span>
          <div className={styles.demoI18nTextBox} style={{ minHeight: 80 }}>
            {isKo ? ko : en}
          </div>
          <div className={styles.demoI18nBar}>Next →</div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Export: getCodeDemo(index)
   ========================================================================= */
const demos = [
  DemoParallax,
  DemoStaggerText,
  DemoFontMorph,
  DemoMagnetic,
  DemoClipPath,
  DemoInfiniteScroll,
  DemoSvgPath,
  DemoLoadingProgress,
  DemoI18nShift,
];

export function getCodeDemo(index: number): React.ReactNode {
  const Demo = demos[index];
  if (!Demo) return null;
  return <Demo />;
}
