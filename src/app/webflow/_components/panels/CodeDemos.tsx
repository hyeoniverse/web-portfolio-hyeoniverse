"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { useMotionValue, useSpring, motion } from "framer-motion";
import { useTheme } from "@/providers/ThemeProvider";
import { createSafeRenderer } from "@/utils/three";
import {
  TORUS_GEOMETRY,
  TORUS_MATERIAL,
  TORUS_SCALE,
} from "@/constants/torus";
import StaggerText from "@/components/effects/StaggerText/StaggerText";
import { checkMobileLayout } from "../../_hooks/mobileCheck";
import styles from "../WebFlowSection.module.css";

/* ── 공유 모바일 감지 (BreakpointGuard가 리마운트 처리) ── */
function useDemoMobile(): boolean {
  return checkMobileLayout();
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
   4. DemoMagnetic — 자기 호버 효과 (useMagnetic 훅)
   데스크탑: 스프링 물리를 사용한 연속 마우스 추적
   모바일: 원형 자동 진동
   ========================================================================= */
function DemoMagnetic() {
  const isMobile = useDemoMobile();
  const [isHovering, setIsHovering] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 120, damping: 12 });
  const springY = useSpring(y, { stiffness: 120, damping: 12 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * 0.4);
      y.set((e.clientY - centerY) * 0.4);
      if (!isHovering) setIsHovering(true);
    },
    [x, y, isMobile, isHovering],
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
    setIsHovering(false);
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
    >
      <motion.div
        className={styles.demoMagneticBtn}
        style={{ x: springX, y: springY }}
        animate={{
          scale: isHovering ? 1.15 : 1,
          borderColor: isHovering
            ? "var(--text-accent-secondary)"
            : "var(--color-accent-alpha-30)",
        }}
        transition={{ duration: 0.25 }}
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
   8. DemoScrollTorus — 실제 3D 메탈릭 토러스 (ScrollTorus)
   리사주 곡선 경로를 따라 자동 회전하는 3D 토러스
   ========================================================================= */
function MiniTorusScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { theme } = useTheme();
  const mat = TORUS_MATERIAL[theme];

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * 0.6;

    meshRef.current.position.x = Math.sin(t * 0.7) * 0.6;
    meshRef.current.position.y = Math.cos(t * 1.1) * 0.4;
    meshRef.current.position.z = Math.sin(t * 0.4) * 0.2;

    meshRef.current.rotation.x = t * 2.5;
    meshRef.current.rotation.y = t * 4.0;
    meshRef.current.rotation.z = t * 1.2;
  });

  const s = 0.7;

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} />
      <directionalLight position={[-3, -2, 4]} intensity={0.5} />
      <mesh
        ref={meshRef}
        scale={[TORUS_SCALE.x * s, TORUS_SCALE.y * s, TORUS_SCALE.z * s]}
      >
        <torusGeometry
          args={[TORUS_GEOMETRY.radius, TORUS_GEOMETRY.tube, 24, 48]}
        />
        <meshStandardMaterial
          color={mat.color}
          emissive={mat.emissive}
          emissiveIntensity={mat.emissiveIntensity}
          metalness={mat.metalness}
          roughness={mat.roughness}
          envMapIntensity={mat.envMapIntensity}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

function DemoScrollTorus() {
  return (
    <div className={styles.codeDemoInner} style={{ padding: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={(d) => createSafeRenderer(d, { alpha: true, antialias: true, powerPreference: "high-performance" })}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <Suspense fallback={null}>
          <MiniTorusScene />
        </Suspense>
      </Canvas>
      <span className={styles.demoHint}>3D Metallic Torus</span>
    </div>
  );
}

/* =========================================================================
   내보내기: getCodeDemo(index)
   ========================================================================= */
const demos = [
  DemoStaggerText,
  DemoMagnetic,
  DemoInfiniteScroll,
  DemoFrameGrid,
  DemoScrollTorus,
];

export function getCodeDemo(index: number): React.ReactNode {
  const Demo = demos[index];
  if (!Demo) return null;
  return <Demo />;
}
