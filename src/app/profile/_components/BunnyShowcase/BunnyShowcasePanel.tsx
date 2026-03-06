"use client";

import { Suspense, useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import dynamic from "next/dynamic";
import T from "@/components/ui/T";
import { useIsMobile } from "@/hooks/useIsMobile";
import { createSafeRenderer } from "@/utils/three";
import styles from "./BunnyShowcase.module.css";

const BunnyPreviewScene = dynamic(() => import("./BunnyPreviewScene"), {
  ssr: false,
});

type Expression = "normal" | "surprised" | "happy";

const EXPR_CYCLE: Expression[] = ["normal", "surprised", "happy"];
const CYCLE_INTERVAL = 3000;

/* ── 3D 모델 표정을 본뜬 SVG 아이콘 ── */

const EYE_COLOR = "currentColor";

function NormalFaceSVG() {
  return (
    <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
      {/* 왼쪽 눈: 세로 타원 (3D sphere scale [1, 1.3]) */}
      <ellipse cx="16" cy="16" rx="4" ry="5.5" fill={EYE_COLOR} />
      {/* 오른쪽 눈 */}
      <ellipse cx="32" cy="16" rx="4" ry="5.5" fill={EYE_COLOR} />
    </svg>
  );
}

function SurprisedFaceSVG() {
  return (
    <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
      {/* 왼쪽 >< : 교차 선 (3D rotated box) */}
      <line x1="10" y1="10" x2="18" y2="16" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10" y1="22" x2="18" y2="16" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" />
      {/* 오른쪽 */}
      <line x1="38" y1="10" x2="30" y2="16" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="38" y1="22" x2="30" y2="16" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function HappyFaceSVG() {
  return (
    <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
      {/* 왼쪽 ^^ : 위로 볼록한 아치 (3D torus arc) */}
      <path d="M10 20 Q16 8 22 20" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* 오른쪽 */}
      <path d="M26 20 Q32 8 38 20" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const FACE_MAP: Record<Expression, ReactNode> = {
  normal: <NormalFaceSVG />,
  surprised: <SurprisedFaceSVG />,
  happy: <HappyFaceSVG />,
};

interface Props {
  animateClass?: string;
}

export default function BunnyShowcasePanel({ animateClass }: Props) {
  const { isTouch } = useIsMobile();
  const [expression, setExpression] = useState<Expression>("normal");
  const [snapCount, setSnapCount] = useState(0);
  const cycleIdx = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const ac = animateClass ?? "";

  /* ── 자동 로테이션 시작 ── */
  const startCycle = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      cycleIdx.current = (cycleIdx.current + 1) % EXPR_CYCLE.length;
      setExpression(EXPR_CYCLE[cycleIdx.current]);
    }, CYCLE_INTERVAL);
  }, []);

  useEffect(() => {
    startCycle();
    return () => clearInterval(timerRef.current);
  }, [startCycle]);

  /* ── 클릭으로 표정 변경 (자동 로테이션 리셋 + 정면 스냅) ── */
  const handleExpression = useCallback(
    (expr: Expression) => {
      setExpression(expr);
      setSnapCount((c) => c + 1);
      cycleIdx.current = EXPR_CYCLE.indexOf(expr);
      startCycle();
    },
    [startCycle],
  );

  const expressions: { key: Expression; labelKey: string; descKey: string }[] = [
    { key: "normal", labelKey: "bunny.exprNormal", descKey: "bunny.exprNormalDesc" },
    { key: "surprised", labelKey: "bunny.exprSurprised", descKey: "bunny.exprSurprisedDesc" },
    { key: "happy", labelKey: "bunny.exprHappy", descKey: "bunny.exprHappyDesc" },
  ];

  const cameraConfig = useMemo(
    () => ({
      position: [0, 0.2, 4.5] as [number, number, number],
      fov: 50,
      near: 0.1,
      far: 50,
    }),
    [],
  );

  const dpr = isTouch
    ? Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 1.5)
    : Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);

  return (
    <div className={styles.layout}>
      {/* 3D Preview */}
      <div className={`${styles.preview} ${ac}`}>
        <Canvas
          camera={cameraConfig}
          dpr={dpr}
          gl={(d) =>
            createSafeRenderer(d, {
              alpha: true,
              antialias: !isTouch,
              powerPreference: "high-performance",
            })
          }
          style={{ background: "transparent" }}
          frameloop="always"
        >
          <Suspense fallback={null}>
            <BunnyPreviewScene expression={expression} snapToFront={snapCount} />
          </Suspense>
        </Canvas>
      </div>

      {/* Info */}
      <div className={`${styles.info} ${ac}`}>
        <span className={styles.nameLabel}>MEET</span>
        <h3 className={styles.name}><T k="bunny.name" /></h3>
        <span className={styles.subtitle}><T k="bunny.subtitle" /></span>

        <div className={styles.storyBlock}>
          <p className={styles.storyText}><T k="bunny.story1" /></p>
          <p className={styles.storyText}><T k="bunny.story2" /></p>
          <p className={styles.storyText}><T k="bunny.story3" /></p>
        </div>

        <div className={styles.exprBar}>
          {expressions.map(({ key, labelKey, descKey }) => (
            <button
              key={key}
              type="button"
              className={`${styles.exprCard} ${expression === key ? styles.exprCardActive : ""}`}
              data-active={expression === key || undefined}
              onClick={() => handleExpression(key)}
            >
              <span className={styles.exprFace}>{FACE_MAP[key]}</span>
              <span className={styles.exprLabel}><T k={labelKey} /></span>
              <span className={styles.exprDesc}><T k={descKey} /></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
