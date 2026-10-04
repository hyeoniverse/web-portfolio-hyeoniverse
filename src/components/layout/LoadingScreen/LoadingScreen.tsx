"use client";

import { useKeepOnTopRef } from "@/hooks/useTopLayer";

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

  /* 늘 맨 위(3.10-1). 속성은 올라온 뒤에 붙인다 — 서버 HTML 에 있으면 hydration 전까지 보이지 않는다 */
  const topRef = useKeepOnTopRef<HTMLDivElement>(2);

  if (!visible || shouldSkipLoading) return null;

  return (
    <div
      ref={topRef}
      className={styles.loadingScreen}
      style={{ opacity: isLoading ? 1 : 0 }}
      data-nav-tone-skip
    >
      <div className={styles.backdrop} />
    </div>
  );
}
