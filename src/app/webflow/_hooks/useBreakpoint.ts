"use client";

import { useEffect, useState } from "react";
import { MOBILE_WIDTH, MIN_DESKTOP_HEIGHT } from "./mobileCheck";

export type Breakpoint = "desktop" | "tablet" | "mobile";

function getBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Short viewport → treat as tablet even if wide
  if (w > MOBILE_WIDTH && h < MIN_DESKTOP_HEIGHT) return "tablet";
  if (w > MOBILE_WIDTH) return "desktop";
  if (w >= 768) return "tablet";
  return "mobile";
}

/**
 * Tracks viewport breakpoint (desktop / tablet / mobile).
 * Returns the current breakpoint string — when it changes,
 * dependent effects or `key` props can trigger a full re-init.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>("desktop");

  useEffect(() => {
    const check = () => setBp(getBreakpoint());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return bp;
}
