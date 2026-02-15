"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useSpring, useMotionValue, type MotionValue } from "framer-motion";

export function useNavIndicator(activeSection: number, navMounted = false): {
  navRef: React.RefObject<HTMLElement | null>;
  navItemRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  hoveredSection: number | null;
  setHoveredSection: (v: number | null) => void;
  highlightedSection: number;
  springX: MotionValue<number>;
  springWidth: MotionValue<number>;
  navSections: { id: number; label: string }[];
} {
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const springConfig = { stiffness: 170, damping: 22, mass: 1 };
  const indicatorX = useMotionValue(0);
  const indicatorWidth = useMotionValue(0);
  const springX = useSpring(indicatorX, springConfig);
  const springWidth = useSpring(indicatorWidth, springConfig);

  const updateIndicator = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !navRef.current) return;
      const pad = 6;
      const navRect = navRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      indicatorX.set(elRect.left - navRect.left - pad);
      indicatorWidth.set(elRect.width + pad * 2);
    },
    [indicatorX, indicatorWidth],
  );

  const highlightedSection = hoveredSection ?? activeSection;

  // 렌더 후 인디케이터 동기화 — CSS 트랜지션 시작을 위해 한 프레임 대기
  useEffect(() => {
    const el = navItemRefs.current[highlightedSection];
    if (!el) return;
    // 위치 즉시 업데이트
    updateIndicator(el);
    // 라벨 트랜지션 완료 후 재측정 (300ms는 CSS와 일치)
    const timer = setTimeout(() => updateIndicator(el), 320);
    return () => clearTimeout(timer);
  }, [highlightedSection, updateIndicator, navMounted]);

  const navSections = useMemo(
    () => [
      { id: 0, label: "Hello" },
      { id: 1, label: "Overview" },
      { id: 2, label: "Architecture" },
      { id: 3, label: "Features" },
      { id: 4, label: "Design" },
      { id: 5, label: "Process" },
      { id: 6, label: "Tech" },
      { id: 7, label: "Code" },
      { id: 8, label: "Troubleshoot" },
      { id: 9, label: "Credits" },
    ],
    [],
  );

  return {
    navRef,
    navItemRefs,
    hoveredSection,
    setHoveredSection,
    highlightedSection,
    springX,
    springWidth,
    navSections,
  };
}
