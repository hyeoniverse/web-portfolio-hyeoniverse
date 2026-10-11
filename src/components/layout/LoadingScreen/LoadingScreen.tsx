"use client";


import { useState, useEffect } from "react";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import styles from "./LoadingScreen.module.css";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { usePopoverRef } from "@/hooks/useTopLayer";

const SKIP_LOADING_PAGES = ["/privacy"];

export default function LoadingScreen() {
  const pathname = useRoutePathname();
  const { isLoading } = useLoadingScreen();
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
    </div>
  );
}
