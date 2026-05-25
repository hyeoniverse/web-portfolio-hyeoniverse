"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import styles from "./HeartIcon.module.css";

interface HeartIconProps {
  /** 좋아요 활성화 (filled state) */
  liked: boolean;
  /** API 호출 중 — wave fill/drain 애니메이션 재생. 응답 빨라도 minDuration 으로 끝까지 보장 */
  busy?: boolean;
  /** SVG width/height (px). burst 파티클 거리/크기도 비례 스케일링 */
  size?: number;
}

/**
 * HeartIcon — 좋아요 표시용 하트 SVG + wave fill 애니메이션 + 채우기 완료 시 burst 효과.
 *
 * 상태 머신 (data-state):
 *  - empty   : 빈 하트 (default)
 *  - filling : busy && liked  → 파도 차오름
 *  - filled  : !busy && liked → 가득 채워진 stable state
 *  - draining: busy && !liked → 가라앉음
 *
 * 채우기 완료 (filling → filled 전환 + liked) 직후 burst 1회 트리거 — 10개 mini 하트가
 * 위쪽으로 방울처럼 떠오름 (driftX/rise/scale/opacity/delay/duration/size random).
 *
 * stroke / fill 모두 currentColor 사용 — 부모의 color 가 자동 적용됨.
 */
export default function HeartIcon({ liked, busy = false, size = 20 }: HeartIconProps) {
  const clipId = useId();
  const [animBusy, setAnimBusy] = useState(false);
  const busyStartRef = useRef<number | null>(null);
  const [burstKey, setBurstKey] = useState(0);
  const prevAnimBusyRef = useRef(false);

  // busy 신호를 받아 wave 애니메이션이 최소 minDuration 동안 재생되도록 wrap.
  // (API 응답이 빨라서 busy 가 짧게 깜빡여도 wave 가 끝까지 보이게)
  useEffect(() => {
    if (busy) {
      busyStartRef.current = Date.now();
      setAnimBusy(true);
      return;
    }
    if (busyStartRef.current === null) return;
    const elapsed = Date.now() - busyStartRef.current;
    const minDuration = 2000; // wave (1.8s) + delay (0.2s)
    const remaining = Math.max(0, minDuration - elapsed);
    const id = setTimeout(() => {
      setAnimBusy(false);
      busyStartRef.current = null;
    }, remaining);
    return () => clearTimeout(id);
  }, [busy]);

  // 채우기 완료 (animBusy true → false 전환 + liked 상태일 때) → burst 1회 트리거
  useEffect(() => {
    if (prevAnimBusyRef.current && !animBusy && liked) {
      setBurstKey((k) => k + 1);
    }
    prevAnimBusyRef.current = animBusy;
  }, [animBusy, liked]);

  // 상태 머신 — CSS 가 data-state 별로 wave path/animation 분기
  const state = animBusy
    ? (liked ? "filling" : "draining")
    : (liked ? "filled" : "empty");

  // burst 마다 새 random 파티클 — 위쪽으로 방울 떠오름. heart size 에 비례 스케일링
  const burstParticles = useMemo(() => {
    if (burstKey === 0) return [];
    const scale = size / 20; // 기본 size=20 기준으로 보정
    return Array.from({ length: 10 }, () => ({
      driftX: (Math.random() - 0.5) * 90 * scale,
      rise: (45 + Math.random() * 55) * scale,
      particleScale: 0.7 + Math.random() * 0.6,
      opacityPeak: 0.5 + Math.random() * 0.5,
      delay: Math.random() * 280,
      duration: 1100 + Math.random() * 600,
      particleSize: (6 + Math.random() * 7) * scale,
    }));
  }, [burstKey, size]);

  return (
    <span className={styles.heartHolder}>
      <svg
        className={styles.heartIcon}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-hidden="true"
        data-state={state}
      >
        <defs>
          <clipPath id={clipId}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </clipPath>
        </defs>
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g clipPath={`url(#${clipId})`}>
          <path className={styles.heartWaveBack} d="M-2 28 C 6 28 18 28 30 28 L 30 28 L -2 28 Z" />
          <path className={styles.heartWaveMid} d="M-2 28 C 8 28 16 28 30 28 L 30 28 L -2 28 Z" />
          <path className={styles.heartWaveFront} d="M-2 28 C 6 28 18 28 30 28 L 30 28 L -2 28 Z" />
        </g>
      </svg>
      {burstKey > 0 && (
        <span key={burstKey} className={styles.burst} aria-hidden>
          {burstParticles.map((p, i) => (
            <span
              key={i}
              className={styles.burstParticle}
              style={{
                "--drift-x": `${p.driftX}px`,
                "--rise": `${p.rise}px`,
                "--scale": p.particleScale,
                "--opacity-peak": p.opacityPeak,
                "--delay": `${p.delay}ms`,
                "--duration": `${p.duration}ms`,
                "--size": `${p.particleSize}px`,
              } as CSSProperties}
            />
          ))}
        </span>
      )}
    </span>
  );
}
