import { useState, useEffect } from "react";

interface MobileStatus {
  isTouch: boolean; // Pointer가 coarse이면 true
  isMobile: boolean; // 화면 너비 기준 (예: 768px 이하)
}

export function useIsMobile(breakpoint = 768, heightBreakpoint?: number): MobileStatus {
  const [status, setStatus] = useState<MobileStatus>({
    isTouch: false,
    isMobile: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMobile = () => {
      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      const isMobile =
        window.innerWidth <= breakpoint ||
        (heightBreakpoint != null && window.innerHeight <= heightBreakpoint);
      setStatus({ isTouch, isMobile });
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint, heightBreakpoint]);

  return status;
}
