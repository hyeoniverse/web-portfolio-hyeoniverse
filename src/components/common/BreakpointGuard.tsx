"use client";

import { useEffect, useState } from "react";

/**
 * Computes a composite breakpoint key from width (1024/768)
 * and height (640) thresholds. Any boundary crossing triggers remount.
 */
function getBreakpoint(): string {
  if (typeof window === "undefined") return "desktop-tall";
  const w = window.innerWidth;
  const h = window.innerHeight;

  const widthBp = w > 1024 ? "desktop" : w >= 768 ? "tablet" : "mobile";
  const heightBp = h < 640 ? "short" : "tall";

  return `${widthBp}-${heightBp}`;
}

/**
 * Remounts all children when the viewport crosses a breakpoint boundary.
 * Width: 1024px (desktop/tablet), 768px (tablet/mobile)
 * Height: 640px (tall/short — matches webflow panel min-height)
 * Providers above this component stay stable.
 */
export default function BreakpointGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [bp, setBp] = useState(getBreakpoint);

  useEffect(() => {
    const check = () => setBp(getBreakpoint());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return <div key={bp}>{children}</div>;
}
