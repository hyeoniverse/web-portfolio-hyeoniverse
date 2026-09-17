"use client";

import { useState, useCallback, useRef } from "react";
import type { WorkItem } from "@/data/works";
import { ExpandingWork, PressingWork, HoveringWork } from "@/types";
import {
  LONG_PRESS_THRESHOLD,
  LONG_HOVER_THRESHOLD,
  MAX_SCALE,
  MIN_SCALE,
} from "@/constants/animation";
import { usePageTransition } from "@/providers/PageTransitionProvider";

interface UseWorkInteractionReturn {
  expandingWork: ExpandingWork | null;
  pressingWork: PressingWork | null;
  hoveringWork: HoveringWork | null;
  handlePressStart: (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    work: WorkItem
  ) => void;
  handlePressEnd: () => void;
  /** 그냥 누른 작업물 — rect 는 전환이 커지기 시작할 원의 영역 */
  handleWorkClick: (work: WorkItem, rect: DOMRect) => void;
  handleHoverStart: (e: React.MouseEvent<HTMLDivElement>, work: WorkItem) => void;
  handleHoverEnd: () => void;
  getCurrentScale: (workId: string) => number;
}

export function useWorkInteraction(): UseWorkInteractionReturn {
  const { navigateWithTransition } = usePageTransition();

  /* 그리드 한 칸으로 넘어가는 유일한 길. 작업물·글은 커버가 커지는 전환으로 가고,
     저장소는 사이트 밖이라 새 탭으로 연다 — 전환 연출을 붙이면 커버가 다 커진 뒤
     돌아올 화면이 없어 덮개가 그대로 남는다. */
  const goToWork = useCallback((work: WorkItem, rect: DOMRect) => {
    if (work.kind === "repo") {
      window.open(work.href, "_blank", "noopener,noreferrer");
      return;
    }
    navigateWithTransition(work.href, work.main, rect);
  }, [navigateWithTransition]);

  const [expandingWork, setExpandingWork] = useState<ExpandingWork | null>(null);
  const [pressingWork, setPressingWork] = useState<PressingWork | null>(null);
  const [hoveringWork, setHoveringWork] = useState<HoveringWork | null>(null);

  const pressStartTimeRef = useRef<number>(0);
  const pressAnimationRef = useRef<number>(0);
  const hasNavigatedRef = useRef<boolean>(false);

  const hoverStartTimeRef = useRef<number>(0);
  const hoverAnimationRef = useRef<number>(0);
  const hasHoverNavigatedRef = useRef<boolean>(false);

  const handlePressStart = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      work: WorkItem
    ) => {
      const target = e.currentTarget;
      pressStartTimeRef.current = Date.now();
      hasNavigatedRef.current = false;

      setPressingWork({ id: work.id, scale: MIN_SCALE, element: target });

      const animate = () => {
        if (hasNavigatedRef.current) return;

        const elapsed = Date.now() - pressStartTimeRef.current;
        const progress = Math.min(elapsed / LONG_PRESS_THRESHOLD, 1);
        const newScale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * progress;

        setPressingWork((prev) => (prev ? { ...prev, scale: newScale } : null));

        if (elapsed >= LONG_PRESS_THRESHOLD && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          const rect = target.getBoundingClientRect();
          setExpandingWork({ id: work.id, rect, image: work.main });

          goToWork(work, rect);
          return;
        }

        pressAnimationRef.current = requestAnimationFrame(animate);
      };

      pressAnimationRef.current = requestAnimationFrame(animate);
    },
    [goToWork]
  );

  const handlePressEnd = useCallback(() => {
    cancelAnimationFrame(pressAnimationRef.current);
    setPressingWork(null);
  }, []);

  const handleWorkClick = useCallback(
    (work: WorkItem, rect: DOMRect) => {
      if (hasNavigatedRef.current || hasHoverNavigatedRef.current) return;

      hasNavigatedRef.current = true;
      setExpandingWork({ id: work.id, rect, image: work.main });

      goToWork(work, rect);
    },
    [goToWork]
  );

  const handleHoverStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, work: WorkItem) => {
      if (pressingWork) return;

      const target = e.currentTarget;
      hoverStartTimeRef.current = Date.now();
      hasHoverNavigatedRef.current = false;

      setHoveringWork({
        id: work.id,
        progress: 0,
        scale: MIN_SCALE,
        element: target,
      });

      const animate = () => {
        if (hasHoverNavigatedRef.current || hasNavigatedRef.current) return;

        const elapsed = Date.now() - hoverStartTimeRef.current;
        const progress = Math.min(elapsed / LONG_HOVER_THRESHOLD, 1);
        const newScale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * progress;

        setHoveringWork((prev) =>
          prev ? { ...prev, progress, scale: newScale } : null
        );

        if (elapsed >= LONG_HOVER_THRESHOLD && !hasHoverNavigatedRef.current) {
          hasHoverNavigatedRef.current = true;
          const rect = target.getBoundingClientRect();
          setExpandingWork({ id: work.id, rect, image: work.main });

          // 전역 페이지 전환 시작
          goToWork(work, rect);
          return;
        }

        hoverAnimationRef.current = requestAnimationFrame(animate);
      };

      hoverAnimationRef.current = requestAnimationFrame(animate);
    },
    [pressingWork, goToWork]
  );

  const handleHoverEnd = useCallback(() => {
    cancelAnimationFrame(hoverAnimationRef.current);
    setHoveringWork(null);
  }, []);

  const getCurrentScale = useCallback(
    (workId: string): number => {
      const isPressing = pressingWork?.id === workId;
      const isHovering = hoveringWork?.id === workId && !isPressing;

      if (isPressing && pressingWork) return pressingWork.scale;
      if (isHovering && hoveringWork) return hoveringWork.scale;
      return 1;
    },
    [pressingWork, hoveringWork]
  );

  return {
    expandingWork,
    pressingWork,
    hoveringWork,
    handlePressStart,
    handlePressEnd,
    handleWorkClick,
    handleHoverStart,
    handleHoverEnd,
    getCurrentScale,
  };
}
