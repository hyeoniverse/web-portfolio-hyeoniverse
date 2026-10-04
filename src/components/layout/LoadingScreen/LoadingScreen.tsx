"use client";


import { useState, useEffect } from "react";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import styles from "./LoadingScreen.module.css";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";

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

  /* top layer 에 올리지 않는다(3.10-1 예외) — nav 의 로고가 이 위에서 가운데 → 제자리로 움직여야 해서 페이지 층(float)에 두고 nav 를 그 위로 올린다 */

  if (!visible || shouldSkipLoading) return null;

  return (
    <div
      className={styles.loadingScreen}
      style={{ opacity: isLoading ? 1 : 0 }}
      data-nav-tone-skip
    >
      <div className={styles.backdrop} />
    </div>
  );
}
