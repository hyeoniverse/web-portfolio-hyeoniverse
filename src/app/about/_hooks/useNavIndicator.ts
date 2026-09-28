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
  navSections: { id: number; key: string; label: string }[];
} {
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const springConfig = { stiffness: 170, damping: 22, mass: 1 };
  const indicatorX = useMotionValue(0);
  const indicatorWidth = useMotionValue(0);
  const springX = useSpring(indicatorX, springConfig);
  const springWidth = useSpring(indicatorWidth, springConfig);

  // horizontal nav — springX = left offset, springWidth = width
  const updateIndicator = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !navRef.current) return;
      const pad = 0;
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
    const pad = 0;
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
      { id: 0, key: "hero", label: "Hello" },
      { id: 1, key: "overview", label: "Overview" },
      { id: 2, key: "architecture", label: "Architecture" },
      { id: 3, key: "userflow", label: "User Flow" },
      { id: 4, key: "features", label: "Features" },
      { id: 5, key: "designSystem", label: "Design System" },
      { id: 6, key: "process", label: "Build Process" },
      { id: 7, key: "techStack", label: "Tech Stack" },
      { id: 8, key: "backend", label: "API" },
      { id: 9, key: "erd", label: "ERD" },
      { id: 10, key: "codeHighlights", label: "Code Highlights" },
      { id: 11, key: "troubleshooting", label: "Decisions" },
      { id: 12, key: "security", label: "Security" },
      { id: 13, key: "credits", label: "Credits" },
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
