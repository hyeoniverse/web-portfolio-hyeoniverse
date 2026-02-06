"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMotionValue, MotionValue } from "framer-motion";
import { REPEL_RADIUS_MULTIPLIER, REPEL_STRENGTH } from "@/constants/animation";

interface MagneticOffset {
  x: number;
  y: number;
  rotation: number;
}

interface UseMagneticRepelReturn {
  magneticOffsets: { [key: string]: MagneticOffset };
  setWorkCircleRef: (id: string, el: HTMLDivElement | null) => void;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}

export function useMagneticRepel(): UseMagneticRepelReturn {
  const [magneticOffsets, setMagneticOffsets] = useState<{
    [key: string]: MagneticOffset;
  }>({});

  const workCircleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const setWorkCircleRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      workCircleRefs.current[id] = el;
    },
    []
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      const newOffsets: { [key: string]: MagneticOffset } = {};

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

          newOffsets[id] = { x: repelX, y: repelY, rotation };
        } else {
          newOffsets[id] = { x: 0, y: 0, rotation: 0 };
        }
      });

      setMagneticOffsets(newOffsets);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return {
    magneticOffsets,
    setWorkCircleRef,
    mouseX,
    mouseY,
  };
}
