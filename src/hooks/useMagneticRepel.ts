"use client";

import { useEffect, useCallback, useRef } from "react";
import { useMotionValue, MotionValue } from "framer-motion";
import { REPEL_RADIUS_MULTIPLIER, REPEL_STRENGTH } from "@/constants/animation";

interface MagneticOffset {
  x: number;
  y: number;
  rotation: number;
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      Object.entries(workCircleRefs.current).forEach(([id, element]) => {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const repelRadius = rect.width * REPEL_RADIUS_MULTIPLIER;

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

        // 충분히 작으면 스냅
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

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [mouseX, mouseY]);

  return {
    setWorkCircleRef,
    mouseX,
    mouseY,
  };
}
