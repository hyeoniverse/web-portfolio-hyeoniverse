"use client";

import type React from "react";

import { useRef } from "react";

interface ParallaxContainerProps {
  children: React.ReactNode;
}

export default function ParallaxContainer({
  children,
}: ParallaxContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // const { scrollYProgress } = useScroll({
  //   target: containerRef,
  //   offset: ["start start", "end end"],
  // });

  // const y1 = useTransform(scrollYProgress, [0, 1], [0, -50]);
  // const y2 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  // const y3 = useTransform(scrollYProgress, [0, 1], [0, -150]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {children}
    </div>
  );
}
