"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from "react";
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

  // Mount/remount: 인디케이터 위치 즉시 설정 (spring 애니메이션 없이).
  // BreakpointGuard 리마운트 시 spring이 0에서 시작하여
  // 타이틀을 감싸지 못하는 문제 방지.
  useLayoutEffect(() => {
    if (!navMounted) return;
    const el = navItemRefs.current[highlightedSection];
    if (!el || !navRef.current) return;
    const pad = 6;
    const navRect = navRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    springX.jump(elRect.left - navRect.left - pad);
    springWidth.jump(elRect.width + pad * 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navMounted]);

  // 렌더 후 인디케이터 동기화 — 활성 섹션 변경 시 spring 애니메이션
  useEffect(() => {
    const el = navItemRefs.current[highlightedSection];
    if (!el) return;
    // 위치 업데이트 (spring 애니메이션)
    updateIndicator(el);
    // 라벨 트랜지션 완료 후 재측정 (300ms는 CSS와 일치)
    const timer = setTimeout(() => updateIndicator(el), 320);
    return () => clearTimeout(timer);
  }, [highlightedSection, updateIndicator, navMounted]);

  const navSections = useMemo(
    () => [
      { id: 0, label: "Hello" },          // hero
      { id: 1, label: "Overview" },       // overview
      { id: 2, label: "Architecture" },   // architecture
      { id: 3, label: "User Flow" },      // userflow
      { id: 4, label: "Features" },       // features
      { id: 5, label: "System" },         // designSystem
      { id: 6, label: "Process" },        // process
      // visualBreak (7) — indicator 없음
      { id: 8, label: "Tech" },           // techStack
      { id: 9, label: "Backend" },        // backend
      { id: 10, label: "ERD" },           // erd
      { id: 11, label: "Code" },          // codeHighlights
      { id: 12, label: "Troubleshoot" },  // troubleshooting
      { id: 13, label: "Security" },      // security
      { id: 14, label: "Credits" },       // credits
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
