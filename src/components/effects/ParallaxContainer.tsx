"use client";

import type React from "react";

interface ParallaxContainerProps {
  children: React.ReactNode;
}

export default function ParallaxContainer({
  children,
}: ParallaxContainerProps) {
  return (
    <div style={{ position: "relative" }}>
      {children}
    </div>
  );
}
