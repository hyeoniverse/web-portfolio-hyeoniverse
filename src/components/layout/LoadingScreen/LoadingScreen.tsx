"use client";


import { useState, useEffect, type CSSProperties } from "react";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import styles from "./LoadingScreen.module.css";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { usePopoverRef } from "@/hooks/useTopLayer";

const SKIP_LOADING_PAGES = ["/privacy"];
/** 사이트 로고의 네 갈래 별 */
const STAR_PATH = "M50 0C53 36 64 47 100 50C64 53 53 64 50 100C47 64 36 53 0 50C36 47 47 36 50 0Z";

export default function LoadingScreen() {
  const pathname = useRoutePathname();
  const { isLoading, progress } = useLoadingScreen();
  /* 관리자 화면은 건너뛴다 — 내비게이션이 관리자에서는 로딩 로고 연출을 하지 않아(Navigation 의 isAdminPage) 로고 없는 검은 덮개만 떴다 */
  const shouldSkipLoading = SKIP_LOADING_PAGES.includes(pathname) || pathname.startsWith("/admin");

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
      {/* 진행률 — 로고 아래 작은 별이 아래부터 강조색으로 차오르고, 다 차면 반짝인다(끝난 준비 일의 비율) */}
      <div
        className={styles.progress}
        data-full={progress >= 1 || undefined}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        style={{ "--p": progress } as CSSProperties}
      >
        <svg className={styles.starBase} viewBox="0 0 100 100" aria-hidden>
          <path d={STAR_PATH} />
        </svg>
        <svg className={styles.starFill} viewBox="0 0 100 100" aria-hidden>
          <path d={STAR_PATH} />
        </svg>
      </div>
    </div>
  );
}
