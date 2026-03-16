"use client";

import { useState, useEffect, useCallback } from "react";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./ScrollButtons.module.css";

interface ScrollButtonsProps {
  threshold?: number;
}

export default function ScrollButtons({ threshold = 300 }: ScrollButtonsProps) {
  const { lenis } = useLenis();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setVisible(window.scrollY > threshold);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    if (lenis) lenis.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [lenis]);

  const scrollToBottom = useCallback(() => {
    const target = document.documentElement.scrollHeight;
    if (lenis) lenis.scrollTo(target, { duration: 1.2 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  }, [lenis]);

  const visCls = visible ? styles.visible : "";

  return (
    <>
      <button type="button" className={`${styles.btn} ${styles.btnTop} ${visCls}`} onClick={scrollToTop} aria-label="Scroll to top" data-clickable="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button type="button" className={`${styles.btn} ${styles.btnBottom} ${visCls}`} onClick={scrollToBottom} aria-label="Scroll to bottom" data-clickable="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </>
  );
}
