"use client";


import { useState, useEffect } from "react";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import styles from "./LoadingScreen.module.css";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { usePopoverRef } from "@/hooks/useTopLayer";

const SKIP_LOADING_PAGES = ["/privacy"];

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
      {/* 진행률 — 끝난 준비 일의 비율(글꼴 · 문서 · 첫 사진 · 로고 · 페이지의 3D · 하늘) */}
      <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <span className={styles.track}>
          <span className={styles.fill} style={{ scale: `${progress} 1` }} />
        </span>
        <span className={styles.percent}>{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
}
