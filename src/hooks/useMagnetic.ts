"use client";

import { useRef, useCallback } from "react";
import { useMotionValue, useSpring, MotionValue } from "framer-motion";

export interface UseMagneticReturn {
  ref: React.RefObject<HTMLDivElement | null>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
}

export function useMagnetic(strength: number = 0.3): UseMagneticReturn {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      // rest position = visual position minus current spring offset
      const restCenterX = rect.left - springX.get() + rect.width / 2;
      const restCenterY = rect.top - springY.get() + rect.height / 2;
      x.set((e.clientX - restCenterX) * strength);
      y.set((e.clientY - restCenterY) * strength);
    },
    [strength, x, y, springX, springY]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return {
    ref,
    x: springX,
    y: springY,
    handleMouseMove,
    handleMouseLeave,
  };
}
