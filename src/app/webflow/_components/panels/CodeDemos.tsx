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

/* ── 공유 모바일 감지 (BreakpointGuard가 리마운트 처리) ── */
function useDemoMobile(): boolean {
  return checkMobileLayout();
}

/* =========================================================================
   1. DemoParallax — 마우스 패럴랙스 효과 (HeroSection)
   데스크탑: 마우스 추적 → 스프링 패럴랙스 레이어
   모바일: 사인파 루프로 자동 애니메이션
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

  // 모바일: 사인파로 레이어 자동 애니메이션
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
   2. DemoStaggerText — StaggerText 컴포넌트
   데스크탑: 호버 시 스트로크 시차 트리거
   모바일: 동일한 아웃라인→채우기 효과 자동 순환
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

  // 모바일: 아웃라인 → 채우기 → 대기 자동 순환
  useEffect(() => {
    if (!isMobile) return;
    let timeout: ReturnType<typeof setTimeout>;
    const animDuration = totalChars * delayPerChar * 1000 + 100;

    const cycle = () => {
      // 1단계: 각 글자 아웃라인 (순방향)
      setIsExiting(false);
      setIsOutlining(true);
      timeout = setTimeout(() => {
        // 2단계: 각 글자 채우기 (역방향)
        setIsOutlining(false);
        setIsExiting(true);
        timeout = setTimeout(() => {
          // 3단계: 대기
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
   3. DemoFontMorph — FontMorphText (폰트 카운팅 애니메이션)
   데스크탑: onMouseEnter로 폰트 셔플 트리거
   모바일: 3초마다 자동 순환
   ========================================================================= */
const MORPH_FONTS = [
  { name: "Space Grotesk", family: "var(--font-space-grotesk), sans-serif" },
  { name: "Playfair", family: "var(--font-playfair), Georgia, serif" },
  { name: "JetBrains", family: "var(--font-jetbrains), monospace" },
  { name: "Inter", family: "var(--font-inter), sans-serif" },
];

function DemoFontMorph() {
  const isMobile = useDemoMobile();
  const [displayIdx, setDisplayIdx] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const countRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const currentIdx = useRef(0);

  const startCounting = useCallback(() => {
    if (isCounting) return;
    const target = (currentIdx.current + 1) % MORPH_FONTS.length;
    setIsCounting(true);
    let iterations = 0;
    const total = 10;

    const tick = () => {
      iterations++;
      setDisplayIdx(Math.floor(Math.random() * MORPH_FONTS.length));
      if (iterations >= total) {
        setDisplayIdx(target);
        currentIdx.current = target;
        setIsCounting(false);
        return;
      }
      // 이즈아웃: 간격이 점점 길어짐 (60ms → ~200ms)
      const t = iterations / total;
      const delay = 60 + 160 * t * t;
      countRef.current = setTimeout(tick, delay);
    };
    countRef.current = setTimeout(tick, 60);
  }, [isCounting]);

  // 모바일: 안정적인 ref를 통해 폰트 자동 순환
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
        style={{ fontFamily: MORPH_FONTS[displayIdx].family }}
      >
        Design
      </div>
      <div className={styles.demoFontLabel}>{MORPH_FONTS[displayIdx].name}</div>
      <span className={styles.demoHint}>
        {isMobile ? "Auto-cycling" : "Hover to morph font"}
      </span>
    </div>
  );
}

/* =========================================================================
   4. DemoMagnetic — 자기 호버 효과 (useMagnetic 훅)
   데스크탑: 스프링 물리를 사용한 연속 마우스 추적
   모바일: 원형 자동 진동
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

  // 모바일: 원형 자동 진동
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

const CLIP_DIRECTIONS = [
  { x: 100, y: 50 },
  { x: 0, y: 50 },
  { x: 50, y: 0 },
  { x: 50, y: 100 },
];

/* =========================================================================
   5. DemoClipPath — 방향 인식 ClipPath 등장 (WorksSection)
   데스크탑: 방향 감지를 사용한 onMouseEnter / onMouseLeave
   모바일: 다양한 방향에서 자동 토글 등장
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

  // 모바일: 순환 방향으로 자동 토글
  useEffect(() => {
    if (!isMobile) return;
    let dirIdx = 0;
    let show = false;
    const id = setInterval(() => {
      show = !show;
      if (show) {
        setOrigin(CLIP_DIRECTIONS[dirIdx]);
        dirIdx = (dirIdx + 1) % CLIP_DIRECTIONS.length;
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
   6. DemoInfiniteScroll — 무한 스크롤 래핑 (Works 갤러리)
   데스크탑: CSS 호버로 마퀴 일시정지
   모바일: 탭으로 일시정지 토글
   ========================================================================= */
const MARQUEE_COLORS = [
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

function DemoInfiniteScroll() {
  const isMobile = useDemoMobile();
  const [paused, setPaused] = useState(false);

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
        {[...MARQUEE_COLORS, ...MARQUEE_COLORS, ...MARQUEE_COLORS].map((color, i) => (
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
   7. DemoFrameGrid — 동적 프레임 그리드 (DynamicFrameLayout)
   데스크탑: 셀별 onMouseEnter/Leave
   모바일: 셀 자동 순환
   ========================================================================= */
const GRID_COLORS = [
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

const GRID_SIZE = 12;
const HOVER_SIZE = 6;

function DemoFrameGrid() {
  const isMobile = useDemoMobile();
  const [hovered, setHovered] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // 모바일: 셀 자동 순환
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
        {GRID_COLORS.map((color, i) => {
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
   8. DemoLoadingProgress — 로딩 화면 (LoadingScreen)
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
   9. DemoI18nShift — i18n 레이아웃 시프트 방지 (Works 인트로)
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
   10. DemoErrorBoundary — 에러 바운더리 (error.tsx / global-error.tsx)
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
   11. DemoUnitTest — 단위 테스트 실행 시뮬레이션
   데스크톱: 클릭으로 테스트 실행
   모바일: 자동 재생
   ========================================================================= */
const TEST_CASES = [
  { name: "cn()", suite: "cn.test.ts", count: 6 },
  { name: "formatDate()", suite: "date.test.ts", count: 6 },
  { name: "random()", suite: "random.test.ts", count: 8 },
  { name: "mobileCheck()", suite: "mobileCheck.test.ts", count: 6 },
  { name: "highlight()", suite: "renderHighlight.test.tsx", count: 4 },
];

function DemoUnitTest() {
  const isMobile = useDemoMobile();
  const [results, setResults] = useState<("pending" | "pass")[]>(
    TEST_CASES.map(() => "pending"),
  );
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mobileRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const runTests = useCallback(() => {
    setResults(TEST_CASES.map(() => "pending"));
    setRunning(true);
    TEST_CASES.forEach((_, i) => {
      timerRef.current = setTimeout(() => {
        setResults((prev) => {
          const next = [...prev];
          next[i] = "pass";
          return next;
        });
        if (i === TEST_CASES.length - 1) setRunning(false);
      }, (i + 1) * 350);
    });
  }, []);

  /* 모바일 자동 재생 */
  useEffect(() => {
    if (!isMobile) return;
    const loop = () => {
      runTests();
      mobileRef.current = setTimeout(loop, TEST_CASES.length * 350 + 2000);
    };
    mobileRef.current = setTimeout(loop, 800);
    return () => {
      if (mobileRef.current) clearTimeout(mobileRef.current);
    };
  }, [isMobile, runTests]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const passCount = results.filter((r) => r === "pass").length;
  const total = TEST_CASES.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className={styles.codeDemoInner}>
      <div className={styles.demoTestRunner}>
        <div className={styles.demoTestHeader}>
          <span className={styles.demoTestTitle}>VITEST</span>
          <span className={styles.demoTestCount}>
            {passCount === TEST_CASES.length
              ? `${total} passed`
              : `${passCount}/${TEST_CASES.length}`}
          </span>
        </div>
        <div className={styles.demoTestList}>
          {TEST_CASES.map((tc, i) => (
            <div key={tc.name} className={styles.demoTestRow}>
              <span
                className={`${styles.demoTestIcon} ${
                  results[i] === "pass" ? styles.demoTestPass : ""
                }`}
              >
                {results[i] === "pass" ? "✓" : "○"}
              </span>
              <span className={styles.demoTestName}>{tc.name}</span>
              <span className={styles.demoTestSuite}>{tc.count}</span>
            </div>
          ))}
        </div>
      </div>
      {!isMobile && (
        <button
          className={styles.demoBtn}
          onClick={runTests}
          disabled={running}
          style={{ marginTop: "var(--spacing-sm)" }}
        >
          {running ? "Running…" : passCount > 0 ? "Re-run" : "Run Tests"}
        </button>
      )}
      <span className={styles.demoHint}>
        {running
          ? "Running tests…"
          : passCount === TEST_CASES.length
            ? `All ${total} tests passed`
            : isMobile ? "Auto-running" : "Click to run"}
      </span>
    </div>
  );
}

/* =========================================================================
   내보내기: getCodeDemo(index)
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
  DemoUnitTest,
];

export function getCodeDemo(index: number): React.ReactNode {
  const Demo = demos[index];
  if (!Demo) return null;
  return <Demo />;
}
