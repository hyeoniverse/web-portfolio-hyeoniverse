"use client";

import { usePathname } from "next/navigation";
import styles from "./LoadingScreen.module.css";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";

const SKIP_LOADING_PAGES = ["/privacy"];

export default function LoadingScreen() {
  const pathname = usePathname();
  const { isLoading, isTransitioning } = useLoadingScreen();
  const shouldSkipLoading = SKIP_LOADING_PAGES.includes(pathname);

  if (!isLoading || shouldSkipLoading) return null;

  return (
    <div className={styles.loadingScreen}>
      <div
        className={`${styles.backdrop} ${isTransitioning ? styles.backdropWipe : ""}`}
      />
    </div>
  );
}
