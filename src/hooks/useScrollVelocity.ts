"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, MotionValue } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import { SCROLL_VELOCITY, SPRING_CONFIG } from "@/constants/animation";

interface UseScrollVelocityReturn {
  workImageOffsetY: MotionValue<number>;
  smoothWorkImageY: MotionValue<number>;
  servicesGapOffset: MotionValue<number>;
  smoothServicesGap: MotionValue<number>;
}

export function useScrollVelocity(hasMounted: boolean): UseScrollVelocityReturn {
  const { lenis } = useLenis();

  const workImageOffsetY = useMotionValue(0);
  const smoothWorkImageY = useSpring(workImageOffsetY, SPRING_CONFIG.velocity);

  const servicesGapOffset = useMotionValue(0);
  const smoothServicesGap = useSpring(servicesGapOffset, SPRING_CONFIG.serviceGap);

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    if (!hasMounted || !lenis) return;

    const { maxOffset, workMultiplier, serviceMultiplier, resetDelay } =
      SCROLL_VELOCITY;

    const handleScroll = () => {
      const lenisAny = lenis as unknown as {
        velocity: number;
        targetScroll: number;
        animatedScroll: number;
      };
      const velocity = lenisAny.velocity;

      if (Math.abs(velocity) > 0.05) {
        const width = window.innerWidth;
        const scale = width <= 768 ? 0.3 : width <= 1024 ? 0.6 : 1;
        const scaledMaxOffset = maxOffset * scale;
        const scaledWorkMultiplier = workMultiplier * scale;

        const offset = Math.max(
          -scaledMaxOffset,
          Math.min(scaledMaxOffset, velocity * scaledWorkMultiplier)
        );
        workImageOffsetY.set(offset);

        const gapOffset = Math.max(
          -25,
          Math.min(25, velocity * serviceMultiplier)
        );
        servicesGapOffset.set(gapOffset);

        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          workImageOffsetY.set(0);
          servicesGapOffset.set(0);
        }, resetDelay);
      }
    };

    lenis.on("scroll", handleScroll);

    return () => {
      lenis.off("scroll", handleScroll);
      clearTimeout(resetTimerRef.current);
    };
  }, [hasMounted, lenis, workImageOffsetY, servicesGapOffset]);

  return {
    workImageOffsetY,
    smoothWorkImageY,
    servicesGapOffset,
    smoothServicesGap,
  };
}
