import { useState, useEffect } from "react";

interface MobileStatus {
  isTouch: boolean; // Pointer가 coarse이면 true
  isMobile: boolean; // 화면 너비 기준 (예: 768px 이하)
}

export function useIsMobile(breakpoint = 768): MobileStatus {
  const [status, setStatus] = useState<MobileStatus>({
    isTouch: false,
    isMobile: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMobile = () => {
      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      const isMobile = window.innerWidth <= breakpoint;
      setStatus({ isTouch, isMobile });
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return status;
}
