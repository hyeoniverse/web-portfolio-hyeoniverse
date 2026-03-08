"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./LoadingScreen.module.css";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";

const SKIP_LOADING_PAGES = ["/privacy"];

export default function LoadingScreen() {
  const pathname = usePathname();
  const { isLoading } = useLoadingScreen();
  const shouldSkipLoading = SKIP_LOADING_PAGES.includes(pathname);

  // 로딩 완료 후 짧은 페이드아웃 → 완전 언마운트
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setVisible(false), 50);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!visible || shouldSkipLoading) return null;

  return (
    <div
      className={styles.loadingScreen}
      style={{ opacity: isLoading ? 1 : 0 }}
    >
      <div className={styles.backdrop} />
    </div>
  );
}
