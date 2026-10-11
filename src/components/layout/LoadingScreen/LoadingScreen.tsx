"use client";


import { useState, useEffect } from "react";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import styles from "./LoadingScreen.module.css";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { usePopoverRef } from "@/hooks/useTopLayer";

const SKIP_LOADING_PAGES = ["/privacy"];
/** 사이트 로고의 네 갈래 별 — 12×12 크기로 줄여 둔 것 */
const STAR_PATH = "M6 0C6.36 4.32 7.68 5.64 12 6C7.68 6.36 6.36 7.68 6 12C5.64 7.68 4.32 6.36 0 6C4.32 5.64 5.64 4.32 6 0Z";
/** 진행률 별자리의 별 자리(viewBox 200×40) — 위아래로 살짝 엇갈려 별자리처럼 */
const CONSTELLATION: [number, number][] = [
  [16, 24],
  [58, 14],
  [100, 26],
  [142, 12],
  [184, 22],
];

export default function LoadingScreen() {
  const pathname = useRoutePathname();
  const { isLoading, progress } = useLoadingScreen();
  const shouldSkipLoading = SKIP_LOADING_PAGES.includes(pathname);

  // 로딩 완료 후 짧은 페이드아웃 → 완전 언마운트
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  /* top layer(popover, 3.10-1). nav 의 로고가 이 위에서 가운데 → 제자리로 움직여야 해서 nav 도 그 동안 top layer 에 올라온다(Navigation.tsx keepOnTop) */
  const popoverRef = usePopoverRef<HTMLDivElement>();

  if (!visible || shouldSkipLoading) return null;

  return (
    <div
      ref={popoverRef}
      popover="manual"
      className={styles.loadingScreen}
      style={{ opacity: isLoading ? 1 : 0 }}
      data-nav-tone-skip
    >
      <div className={styles.backdrop} />
      {/* 진행률 — 로고 아래 별 다섯을 잇는 별자리. 진행률만큼 왼쪽부터 선이 이어지고, 선이 닿은 별이 강조색으로 켜진다 */}
      <svg
        className={styles.progress}
        viewBox="0 0 200 40"
        data-full={progress >= 1 || undefined}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        {CONSTELLATION.slice(1).map(([x, y], i) => {
          const [px, py] = CONSTELLATION[i];
          const fill = Math.min(1, Math.max(0, progress * (CONSTELLATION.length - 1) - i));
          return (
            <g key={i}>
              <line className={styles.lineBase} x1={px} y1={py} x2={x} y2={y} />
              <line className={styles.lineFill} x1={px} y1={py} x2={x} y2={y} pathLength={1} style={{ strokeDashoffset: 1 - fill }} />
            </g>
          );
        })}
        {CONSTELLATION.map(([x, y], i) => (
          <path
            key={i}
            className={styles.star}
            data-on={progress * (CONSTELLATION.length - 1) >= i - 0.001 || undefined}
            d={STAR_PATH}
            style={{ translate: `${x - 6}px ${y - 6}px` }}
          />
        ))}
      </svg>
    </div>
  );
}
