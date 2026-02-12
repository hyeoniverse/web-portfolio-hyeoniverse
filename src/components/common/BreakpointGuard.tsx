"use client";

import { useEffect, useState } from "react";

type Breakpoint = "desktop" | "tablet" | "mobile";

function getBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w > 1024) return "desktop";
  if (w >= 768) return "tablet";
  return "mobile";
}

/**
 * Remounts all children when the viewport crosses a breakpoint boundary
 * (1024px or 768px). Providers above this component stay stable.
 */
export default function BreakpointGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [bp, setBp] = useState<Breakpoint>("desktop");

  useEffect(() => {
    const check = () => setBp(getBreakpoint());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return <div key={bp}>{children}</div>;
}
