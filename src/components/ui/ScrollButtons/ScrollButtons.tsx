"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown } from "@/components/icons";
import { useLenis } from "@/providers/LenisProvider";
import styles from "./ScrollButtons.module.css";
import Pressable from "@/components/ui/Pressable";

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

  /* 보이는지를 <html> 에 알린다 — 그 위에 쌓이는 떠 있는 것(읽어 주기 단추)이 단추가 사라지면 내려앉는다 */
  useEffect(() => {
    document.documentElement.toggleAttribute("data-scroll-buttons", visible);
    return () => document.documentElement.removeAttribute("data-scroll-buttons");
  }, [visible]);

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
      <Pressable noTapScale className={`${styles.btn} ${styles.btnTop} ${visCls}`} onClick={scrollToTop} aria-label="Scroll to top" data-clickable="true">
        <ChevronUp size={16} />
      </Pressable>
      <Pressable noTapScale className={`${styles.btn} ${styles.btnBottom} ${visCls}`} onClick={scrollToBottom} aria-label="Scroll to bottom" data-clickable="true">
        <ChevronDown size={16} />
      </Pressable>
    </>
  );
}
