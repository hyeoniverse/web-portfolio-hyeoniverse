"use client";

import { useEffect, useCallback, useRef } from "react";
import { useMotionValue, MotionValue } from "framer-motion";
import { REPEL_RADIUS_MULTIPLIER, REPEL_STRENGTH } from "@/constants/animation";
import type { MagneticOffset } from "@/types";

interface CachedRect {
  cx: number; // centerX
  cy: number; // centerY
  w: number;  // width
}

interface UseMagneticRepelReturn {
  setWorkCircleRef: (id: string, el: HTMLDivElement | null) => void;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}

const LERP_FACTOR = 0.15;

export function useMagneticRepel(): UseMagneticRepelReturn {
  const workCircleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const targetOffsets = useRef<{ [key: string]: MagneticOffset }>({});
  const currentOffsets = useRef<{ [key: string]: MagneticOffset }>({});
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rafId = useRef<number>(0);

  // rect 캐시 — resize 시에만 갱신
  const cachedRects = useRef<{ [key: string]: CachedRect }>({});
  const scrollY = useRef(0);
  const cacheScrollY = useRef(0); // 캐시 생성 시점의 scrollY

  // 스크롤 중 플래그 — 스크롤 중에는 getBoundingClientRect 호출 차단
  const isScrolling = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setWorkCircleRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      workCircleRefs.current[id] = el;
      if (el && !currentOffsets.current[id]) {
        currentOffsets.current[id] = { x: 0, y: 0, rotation: 0 };
        targetOffsets.current[id] = { x: 0, y: 0, rotation: 0 };
      }
    },
    []
  );

  // rect 캐시 갱신
  const updateRectCache = useCallback(() => {
    const sy = window.scrollY;
    cacheScrollY.current = sy;
    Object.entries(workCircleRefs.current).forEach(([id, el]) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      cachedRects.current[id] = {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2 + sy, // 절대 Y
        w: rect.width,
      };
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      // 스크롤 중이면 target만 0으로 리셋하고 rect 계산 건너뜀
      if (isScrolling.current) {
        Object.keys(workCircleRefs.current).forEach((id) => {
          targetOffsets.current[id] = { x: 0, y: 0, rotation: 0 };
        });
        return;
      }

      const sy = scrollY.current;

      Object.entries(workCircleRefs.current).forEach(([id]) => {
        const cached = cachedRects.current[id];
        if (!cached) return;

        // 캐시된 위치 + 스크롤 보정
        const centerX = cached.cx;
        const centerY = cached.cy - sy; // 절대 Y → 뷰포트 Y

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const repelRadius = cached.w * REPEL_RADIUS_MULTIPLIER;

        if (distance < repelRadius && distance > 0) {
          const force = (1 - distance / repelRadius) * REPEL_STRENGTH;
          const repelX = -(deltaX / distance) * force;
          const repelY = -(deltaY / distance) * force;
          const rotation = repelX * 0.15;
          targetOffsets.current[id] = { x: repelX, y: repelY, rotation };
        } else {
          targetOffsets.current[id] = { x: 0, y: 0, rotation: 0 };
        }
      });
    };

    const loop = () => {
      let needsUpdate = false;

      Object.entries(workCircleRefs.current).forEach(([id, element]) => {
        if (!element) return;

        const target = targetOffsets.current[id] || { x: 0, y: 0, rotation: 0 };
        const current = currentOffsets.current[id] || { x: 0, y: 0, rotation: 0 };

        const nx = current.x + (target.x - current.x) * LERP_FACTOR;
        const ny = current.y + (target.y - current.y) * LERP_FACTOR;
        const nr = current.rotation + (target.rotation - current.rotation) * LERP_FACTOR;

        const x = Math.abs(nx) < 0.01 ? 0 : nx;
        const y = Math.abs(ny) < 0.01 ? 0 : ny;
        const r = Math.abs(nr) < 0.001 ? 0 : nr;

        if (x !== current.x || y !== current.y || r !== current.rotation) {
          needsUpdate = true;
        }

        currentOffsets.current[id] = { x, y, rotation: r };
        element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${r}deg)`;
      });

      if (needsUpdate) {
        rafId.current = requestAnimationFrame(loop);
      } else {
        rafId.current = 0;
      }
    };

    const startLoop = () => {
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(loop);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMouseMove(e);
      startLoop();
    };

    // 스크롤 감지 — 스크롤 중에는 magnetic repel 비활성
    const onScroll = () => {
      scrollY.current = window.scrollY;
      isScrolling.current = true;
      clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        isScrolling.current = false;
        updateRectCache(); // 스크롤 종료 후 rect 캐시 갱신
      }, 150);
    };

    // 리사이즈 시 rect 캐시 갱신
    const onResize = () => updateRectCache();

    // 초기 캐시 생성 (약간의 딜레이 후)
    const initTimer = setTimeout(() => {
      scrollY.current = window.scrollY;
      updateRectCache();
    }, 100);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(scrollTimer.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [mouseX, mouseY, updateRectCache]);

  return {
    setWorkCircleRef,
    mouseX,
    mouseY,
  };
}
