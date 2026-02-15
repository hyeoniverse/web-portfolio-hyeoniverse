"use client";

import { useEffect, useState } from "react";

/**
 * 너비(1024/768)와 높이(640) 임계값으로
 * 복합 브레이크포인트 키를 계산. 경계 변경 시 리마운트 트리거.
 */
function getBreakpoint(): string {
  if (typeof window === "undefined") return "desktop-tall";
  const width = window.innerWidth;
  const height = window.innerHeight;

  const widthBp = width > 1024 ? "desktop" : width >= 768 ? "tablet" : "mobile";
  const heightBp = height < 640 ? "short" : "tall";

  return `${widthBp}-${heightBp}`;
}

/**
 * 뷰포트가 브레이크포인트 경계를 넘을 때 모든 자식을 리마운트.
 * 너비: 1024px (데스크톱/태블릿), 768px (태블릿/모바일)
 * 높이: 640px (높음/낮음 — webflow 패널 최소 높이와 일치)
 * 이 컴포넌트 위의 Provider는 안정적으로 유지.
 */
export default function BreakpointGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [breakpoint, setBreakpoint] = useState("desktop-tall"); // SSR 안전 기본값

  useEffect(() => {
    const check = () => setBreakpoint(getBreakpoint());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return <div key={breakpoint}>{children}</div>;
}
