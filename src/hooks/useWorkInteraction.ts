"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { WorkItem } from "@/data/works";
import {
  LONG_PRESS_THRESHOLD,
  LONG_HOVER_THRESHOLD,
  MAX_SCALE,
  MIN_SCALE,
} from "@/constants/animation";

interface ExpandingWork {
  id: string;
  rect: DOMRect;
  image: string;
}

interface PressingWork {
  id: string;
  scale: number;
  element: HTMLElement | null;
}

interface HoveringWork {
  id: string;
  progress: number;
  scale: number;
  element: HTMLElement | null;
}

interface UseWorkInteractionReturn {
  expandingWork: ExpandingWork | null;
  pressingWork: PressingWork | null;
  hoveringWork: HoveringWork | null;
  handlePressStart: (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    work: WorkItem
  ) => void;
  handlePressEnd: () => void;
  handleWorkClick: (work: WorkItem, e: React.MouseEvent) => void;
  handleHoverStart: (e: React.MouseEvent<HTMLDivElement>, work: WorkItem) => void;
  handleHoverEnd: () => void;
  getCurrentScale: (workId: string) => number;
  isNavigating: boolean;
}

export function useWorkInteraction(): UseWorkInteractionReturn {
  const router = useRouter();

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

          setTimeout(() => {
            router.push(`/works/${work.id}`);
          }, 600);
          return;
        }

        pressAnimationRef.current = requestAnimationFrame(animate);
      };

      pressAnimationRef.current = requestAnimationFrame(animate);
    },
    [router]
  );

  const handlePressEnd = useCallback(() => {
    cancelAnimationFrame(pressAnimationRef.current);
    setPressingWork(null);
  }, []);

  const handleWorkClick = useCallback(
    (work: WorkItem, e: React.MouseEvent) => {
      if (hasNavigatedRef.current || hasHoverNavigatedRef.current) return;

      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();

      hasNavigatedRef.current = true;
      setExpandingWork({ id: work.id, rect, image: work.main });

      setTimeout(() => {
        router.push(`/works/${work.id}`);
      }, 600);
    },
    [router]
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

          setTimeout(() => {
            router.push(`/works/${work.id}`);
          }, 600);
          return;
        }

        hoverAnimationRef.current = requestAnimationFrame(animate);
      };

      hoverAnimationRef.current = requestAnimationFrame(animate);
    },
    [router, pressingWork]
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
    isNavigating: hasNavigatedRef.current || hasHoverNavigatedRef.current,
  };
}
