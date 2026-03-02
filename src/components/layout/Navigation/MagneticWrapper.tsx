"use client";

import { useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function MagneticWrapper({
  children,
  strength = 0.4,
  radius = 80,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  radius?: number;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const restCenterX = rect.left - springX.get() + rect.width / 2;
      const restCenterY = rect.top - springY.get() + rect.height / 2;
      const deltaX = e.clientX - restCenterX;
      const deltaY = e.clientY - restCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < radius) {
        x.set(deltaX * strength);
        y.set(deltaY * strength);
      } else {
        x.set(0);
        y.set(0);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [x, y, springX, springY, strength, radius]);

  return (
    <motion.div ref={wrapperRef} style={{ x: springX, y: springY }} className={className}>
      {children}
    </motion.div>
  );
}
