"use client";

import { useEffect, useState, useRef } from "react";

/**
 * 너비(1024/768)와 높이(640) 임계값으로
 * 복합 브레이크포인트 키를 계산. 경계 변경 시 리마운트 트리거.
 */
function getBreakpoint(): string {
  if (typeof window === "undefined") return "desktop-tall";
  const width = window.innerWidth;
  const height = window.innerHeight;

  const widthBp = width > 1024 ? "desktop" : "mobile";
  const heightBp = height <= 640 ? "short" : "tall";

  return `${widthBp}-${heightBp}`;
}

/** 리마운트 후 effect 정착 대기 (ms) */
const SETTLE_MS = 150;
/** fade-out 애니메이션 시간 (ms) */
const FADE_OUT_MS = 450;

type OverlayPhase = "hidden" | "solid" | "fading";

/**
 * 뷰포트가 브레이크포인트 경계를 넘을 때 모든 자식을 리마운트.
 * 너비: 1024px (데스크톱/모바일)
 * 높이: 640px (높음/낮음 — about 패널 최소 높이와 일치)
 * 이 컴포넌트 위의 Provider는 안정적으로 유지.
 *
 * 전환 오버레이: 브레이크포인트 변경 시 즉시 불투명 → 리마운트 → fade-out.
 * 오버레이와 key 변경을 같은 렌더 사이클에서 처리하여
 * R3F Canvas 등 useLayoutEffect 기반 라이브러리와의 호환성 보장.
 */
export default function BreakpointGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeBreakpoint, setActiveBreakpoint] = useState("desktop-tall");
  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>("hidden");
  const bpRef = useRef("desktop-tall");
  const busyRef = useRef(false);

  useEffect(() => {
    const initial = getBreakpoint();
    bpRef.current = initial;
    setActiveBreakpoint(initial);

    const handleResize = () => {
      const next = getBreakpoint();
      if (next === bpRef.current || busyRef.current) return;

      bpRef.current = next;
      busyRef.current = true;

      // React 18+ 자동 배칭: 오버레이(즉시 불투명) + key 변경이
      // 하나의 렌더 사이클에서 커밋 → 리마운트가 오버레이 뒤에서 발생
      setOverlayPhase("solid");
      setActiveBreakpoint(next);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 오버레이 상태 머신: solid → fading → hidden
  useEffect(() => {
    if (overlayPhase === "solid") {
      // effect 정착 대기 후 fade-out 시작
      const timer = setTimeout(() => setOverlayPhase("fading"), SETTLE_MS);
      return () => clearTimeout(timer);
    }
    if (overlayPhase === "fading") {
      // fade-out 완료 후 정리 + 대기 중 변경 체크
      const timer = setTimeout(() => {
        setOverlayPhase("hidden");
        busyRef.current = false;

        // 전환 중 놓친 브레이크포인트 변경 처리
        const current = getBreakpoint();
        if (current !== bpRef.current) {
          bpRef.current = current;
          busyRef.current = true;
          setOverlayPhase("solid");
          setActiveBreakpoint(current);
        }
      }, FADE_OUT_MS);
      return () => clearTimeout(timer);
    }
  }, [overlayPhase]);

  return (
    <>
      <div key={activeBreakpoint}>{children}</div>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "var(--bg-primary)",
          opacity: overlayPhase === "solid" ? 1 : 0,
          transition:
            overlayPhase === "fading"
              ? `opacity ${FADE_OUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
              : "none",
          pointerEvents: overlayPhase === "hidden" ? "none" : "all",
        }}
      />
    </>
  );
}
