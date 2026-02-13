"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  useMotionValue,
  useSpring,
  useTransform,
  motion,
} from "framer-motion";
import StaggerText from "@/components/effects/StaggerText/StaggerText";
import { checkMobileLayout } from "../../_hooks/mobileCheck";
import styles from "../WebFlowSection.module.css";

/* ── Shared mobile detection hook ── */
function useDemoMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(checkMobileLayout());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

/* =========================================================================
   1. DemoParallax — Mouse Parallax Effect (HeroSection)
   Desktop: mouse tracking → spring parallax layers
   Mobile: auto-animate with sine wave loop
   ========================================================================= */
function DemoParallax() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const isMobile = useDemoMobile();

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
      if (isMobile) return;
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    },
    [mouseX, mouseY, isMobile],
  );

  // Mobile: auto-animate layers with sine wave
  useEffect(() => {
    if (!isMobile) return;
    let rafId: number;
    const loop = (time: number) => {
      const t = time / 1000;
      mouseX.set(0.5 + 0.4 * Math.sin(t * 0.7));
      mouseY.set(0.5 + 0.4 * Math.cos(t * 0.5));
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isMobile, mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      className={styles.codeDemoInner}
      onMouseMove={isMobile ? undefined : handleMouseMove}
      style={{ cursor: isMobile ? "default" : "crosshair" }}
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
      <span className={styles.demoHint}>
        {isMobile ? "Auto-playing" : "Move your mouse"}
      </span>
    </div>
  );
}

/* =========================================================================
   2. DemoStaggerText — StaggerText Component
   Desktop: hover triggers stroke stagger
   Mobile: auto-cycles the same outline→fill-back effect
   ========================================================================= */
function DemoStaggerText() {
  const isMobile = useDemoMobile();
  const text = "Hover Me";
  const chars = text.split("");
  const totalChars = chars.length;
  const delayPerChar = 0.04;
  const strokeColor = "var(--text-accent-secondary)";

  const [isOutlining, setIsOutlining] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Mobile: auto-cycle outline → fill-back → idle
  useEffect(() => {
    if (!isMobile) return;
    let timeout: ReturnType<typeof setTimeout>;
    const animDuration = totalChars * delayPerChar * 1000 + 100;

    const cycle = () => {
      // Phase 1: outline each char (forward)
      setIsExiting(false);
      setIsOutlining(true);
      timeout = setTimeout(() => {
        // Phase 2: fill back each char (reverse)
        setIsOutlining(false);
        setIsExiting(true);
        timeout = setTimeout(() => {
          // Phase 3: idle
          setIsExiting(false);
          timeout = setTimeout(cycle, 2000);
        }, animDuration);
      }, animDuration + 800);
    };

    timeout = setTimeout(cycle, 1000);
    return () => clearTimeout(timeout);
  }, [isMobile, totalChars, delayPerChar]);

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
      {isMobile ? (
        <span style={{ display: "inline" }}>
          {chars.map((char, i) => {
            const fwd = i * delayPerChar;
            const rev = (totalChars - 1 - i) * delayPerChar;
            const delay = isOutlining ? fwd : rev;

            const charStyle: React.CSSProperties = {
              display: "inline-block",
              transition: "color 0.01s step-end",
              transitionDelay: `${delay}s`,
            };

            if (isOutlining) {
              charStyle.color = "transparent";
              charStyle.WebkitTextStroke = `1px ${strokeColor}`;
            } else if (isExiting) {
              charStyle.WebkitTextStroke = `1px ${strokeColor}`;
            }

            return (
              <span key={i} style={charStyle}>
                {char === " " ? "\u00A0" : char}
              </span>
            );
          })}
        </span>
      ) : (
        <StaggerText
          strokeColor={strokeColor}
          strokeWidth={1}
          delayPerChar={delayPerChar}
        >
          Hover Me
        </StaggerText>
      )}
      {isMobile && (
        <span className={styles.demoHint}>Auto-playing</span>
      )}
    </div>
  );
}

/* =========================================================================
   3. DemoFontMorph — FontMorphText (font counting animation)
   Desktop: onMouseEnter triggers font shuffle
   Mobile: auto-cycles every 3s
   ========================================================================= */
function DemoFontMorph() {
  const isMobile = useDemoMobile();
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

  // Mobile: auto-cycle fonts via stable ref
  const startCountingRef = useRef(startCounting);
  startCountingRef.current = startCounting;

  useEffect(() => {
    if (!isMobile) return;
    const id = setInterval(() => startCountingRef.current(), 3000);
    return () => clearInterval(id);
  }, [isMobile]);

  useEffect(() => {
    return () => {
      if (countRef.current) clearTimeout(countRef.current);
    };
  }, []);

  return (
    <div
      className={styles.codeDemoInner}
      onMouseEnter={isMobile ? undefined : startCounting}
      onClick={isMobile ? startCounting : undefined}
    >
      <div
        className={styles.demoFontText}
        style={{ fontFamily: fonts[displayIdx].family }}
      >
        Design
      </div>
      <div className={styles.demoFontLabel}>{fonts[displayIdx].name}</div>
      <span className={styles.demoHint}>
        {isMobile ? "Auto-cycling" : "Hover to morph font"}
      </span>
    </div>
  );
}

/* =========================================================================
   4. DemoMagnetic — Magnetic Hover Effect (useMagnetic hook)
   Desktop: continuous mouse tracking with spring physics
   Mobile: auto-oscillate in a circle
   ========================================================================= */
function DemoMagnetic() {
  const isMobile = useDemoMobile();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * 0.35);
      y.set((e.clientY - centerY) * 0.35);
    },
    [x, y, isMobile],
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  // Mobile: auto-oscillate in a circle
  useEffect(() => {
    if (!isMobile) return;
    let rafId: number;
    const loop = (time: number) => {
      const t = time / 1000;
      x.set(Math.sin(t * 1.2) * 18);
      y.set(Math.cos(t * 0.9) * 14);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isMobile, x, y]);

  return (
    <div
      className={styles.codeDemoInner}
      onMouseMove={isMobile ? undefined : handleMouseMove}
      onMouseLeave={isMobile ? undefined : handleMouseLeave}
      style={{ cursor: isMobile ? "default" : "none" }}
    >
      <motion.div
        className={styles.demoMagneticBtn}
        style={{ x: springX, y: springY }}
      >
        {isMobile ? "Magnetic" : "Hover"}
      </motion.div>
      <span className={styles.demoHint}>
        {isMobile ? "Auto-playing" : "Move cursor near the button"}
      </span>
    </div>
  );
}

/* =========================================================================
   5. DemoClipPath — Direction-Aware ClipPath Reveal (WorksSection)
   Desktop: onMouseEnter with direction detection / onMouseLeave
   Mobile: auto-toggle reveal from different directions
   ========================================================================= */
function DemoClipPath() {
  const isMobile = useDemoMobile();
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

  // Mobile: auto-toggle with cycling directions
  useEffect(() => {
    if (!isMobile) return;
    const dirs = [
      { x: 100, y: 50 },
      { x: 0, y: 50 },
      { x: 50, y: 0 },
      { x: 50, y: 100 },
    ];
    let dirIdx = 0;
    let show = false;
    const id = setInterval(() => {
      show = !show;
      if (show) {
        setOrigin(dirs[dirIdx]);
        dirIdx = (dirIdx + 1) % dirs.length;
      }
      setIsHovered(show);
    }, 2000);
    return () => clearInterval(id);
  }, [isMobile]);

  return (
    <div className={styles.codeDemoInner}>
      <div
        className={styles.demoClipBox}
        onMouseEnter={isMobile ? undefined : handleMouseEnter}
        onMouseLeave={isMobile ? undefined : handleMouseLeave}
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
      <span className={styles.demoHint}>
        {isMobile ? "Auto-playing" : "Hover from different sides"}
      </span>
    </div>
  );
}

/* =========================================================================
   6. DemoInfiniteScroll — Infinite Scroll Wrapping (Works Gallery)
   Desktop: CSS hover pauses marquee
   Mobile: tap to toggle pause
   ========================================================================= */
function DemoInfiniteScroll() {
  const isMobile = useDemoMobile();
  const [paused, setPaused] = useState(false);

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
    <div
      className={styles.codeDemoInner}
      style={{ overflow: "hidden" }}
      onClick={isMobile ? () => setPaused((p) => !p) : undefined}
    >
      <div
        className={styles.demoInfiniteTrack}
        style={
          isMobile && paused ? { animationPlayState: "paused" } : undefined
        }
      >
        {[...colors, ...colors, ...colors].map((color, i) => (
          <div
            key={i}
            className={styles.demoInfiniteBlock}
            style={{ background: color }}
          />
        ))}
      </div>
      <span className={styles.demoHint}>
        {isMobile
          ? paused
            ? "Tap to resume"
            : "Tap to pause"
          : "Hover to pause"}
      </span>
    </div>
  );
}

/* =========================================================================
   7. DemoFrameGrid — Dynamic Frame Grid (DynamicFrameLayout)
   Desktop: onMouseEnter/Leave per cell
   Mobile: auto-cycle through cells
   ========================================================================= */
function DemoFrameGrid() {
  const isMobile = useDemoMobile();
  const GRID_SIZE = 12;
  const HOVER_SIZE = 6;
  const [hovered, setHovered] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const colors = [
    "var(--color-accent-alpha-30)",
    "var(--text-tertiary)",
    "var(--color-accent-alpha-50, var(--color-accent-alpha-30))",
    "var(--text-tertiary)",
    "var(--color-accent-alpha-30)",
    "var(--text-tertiary)",
    "var(--color-accent-alpha-50, var(--color-accent-alpha-30))",
    "var(--text-tertiary)",
    "var(--color-accent-alpha-30)",
  ];

  // Mobile: auto-cycle through cells
  useEffect(() => {
    if (!isMobile) return;
    let idx = 0;
    const id = setInterval(() => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      setHovered({ row, col });
      idx = (idx + 1) % 9;
    }, 1200);
    return () => clearInterval(id);
  }, [isMobile]);

  const getSizes = (axis: "row" | "col") => {
    if (!hovered) return "4fr 4fr 4fr";
    const idx = axis === "row" ? hovered.row : hovered.col;
    const rest = (GRID_SIZE - HOVER_SIZE) / 2;
    return [0, 1, 2]
      .map((i) => (i === idx ? `${HOVER_SIZE}fr` : `${rest}fr`))
      .join(" ");
  };

  return (
    <div
      className={styles.codeDemoInner}
      style={{ paddingTop: 8, paddingLeft: 8, paddingRight: 8 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateRows: getSizes("row"),
          gridTemplateColumns: getSizes("col"),
          gap: 4,
          width: "100%",
          height: "100%",
          transition:
            "grid-template-rows 0.4s ease, grid-template-columns 0.4s ease",
        }}
      >
        {colors.map((color, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const isActive = hovered?.row === row && hovered?.col === col;
          return (
            <div
              key={i}
              onMouseEnter={
                isMobile ? undefined : () => setHovered({ row, col })
              }
              onMouseLeave={isMobile ? undefined : () => setHovered(null)}
              style={{
                background: color,
                borderRadius: 4,
                opacity: isActive ? 1 : 0.6,
                transition: "opacity 0.3s ease",
              }}
            />
          );
        })}
      </div>
      <span className={styles.demoHint}>
        {isMobile ? "Auto-cycling" : "Hover each cell"}
      </span>
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
   10. DemoErrorBoundary — Error Boundary (error.tsx / global-error.tsx)
   ========================================================================= */
function DemoErrorBoundary() {
  const [crashed, setCrashed] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <div className={styles.codeDemoInner}>
      {!crashed ? (
        <>
          <motion.div
            key={`ok-${key}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "var(--spacing-md)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "rgb(34,197,94)",
              }}
            />
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              Running
            </span>
          </motion.div>
          <button
            className={styles.demoBtn}
            onClick={() => setCrashed(true)}
          >
            Trigger Error
          </button>
        </>
      ) : (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, ease: "backOut" }}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "2px solid rgb(239,68,68)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "var(--spacing-sm)",
            }}
          >
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: 300,
                color: "rgb(239,68,68)",
                lineHeight: 1,
              }}
            >
              !
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Something went wrong
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{
              fontSize: "0.65rem",
              color: "var(--text-tertiary)",
              marginBottom: "var(--spacing-sm)",
            }}
          >
            Ref: a3f8b2c
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ display: "flex", gap: 8 }}
          >
            <button
              className={styles.demoBtn}
              onClick={() => {
                setCrashed(false);
                setKey((k) => k + 1);
              }}
            >
              Try Again
            </button>
            <button
              className={styles.demoBtn}
              onClick={() => {
                setCrashed(false);
                setKey((k) => k + 1);
              }}
              style={{ opacity: 0.6 }}
            >
              Go Home
            </button>
          </motion.div>
        </>
      )}
      <span className={styles.demoHint}>
        {crashed ? "Staggered error UI" : "Click to crash"}
      </span>
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
  DemoFrameGrid,
  DemoLoadingProgress,
  DemoI18nShift,
  DemoErrorBoundary,
];

export function getCodeDemo(index: number): React.ReactNode {
  const Demo = demos[index];
  if (!Demo) return null;
  return <Demo />;
}
