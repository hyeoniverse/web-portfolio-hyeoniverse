"use client";

import { useEffect, useState, useRef } from "react";
import { BREAKPOINT } from "@/constants";

/**
 * 너비(1024/768)와 높이(640) 임계값으로
 * 복합 브레이크포인트 키를 계산. 경계 변경 시 리마운트 트리거.
 */
function getBreakpoint(): string {
  if (typeof window === "undefined") return "desktop-tall";
  const width = window.innerWidth;
  const height = window.innerHeight;

  const widthBp = width > BREAKPOINT.tablet ? "desktop" : "mobile";
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
  /* 자식의 key. 경계를 넘을 때마다 1씩 올려 통째로 다시 만든다.
   *
   * 전에는 key 가 브레이크포인트 이름이었고 "desktop-tall" 로 시작했다. 첫 effect 에서 실제 값을
   * 넣으면 모바일(과 높이 640 이하 창)에서는 그 자리에서 key 가 바뀌어, 방문하자마자 페이지 전체가
   * 한 번 부서졌다 다시 만들어졌다. 이미 그려진 히어로 글이 새 노드로 다시 그려져 LCP 가 그 시각
   * (모바일 조건 6~7초)으로 밀렸고, 3D 캔버스도 전부 새로 떴다.
   *
   * 첫 값은 맞출 필요가 없다 — 처음 마운트가 이미 그 뷰포트 안에서 일어났다. key 는 "넘었다"는
   * 사건만 알리면 되므로 이름 대신 횟수를 쓴다. 이름을 쓰면 첫 값을 안 맞출 때 되돌아오는 전환
   * (mobile → desktop-tall)에서 key 가 그대로라 리마운트가 빠진다. */
  const [generation, setGeneration] = useState(0);
  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>("hidden");
  /** 지금 기준으로 삼는 브레이크포인트. 첫 effect 에서 실제 값을 넣는다. */
  const bpRef = useRef("");
  const busyRef = useRef(false);

  useEffect(() => {
    bpRef.current = getBreakpoint();

    const handleResize = () => {
      const next = getBreakpoint();
      if (next === bpRef.current || busyRef.current) return;

      bpRef.current = next;
      busyRef.current = true;

      // React 18+ 자동 배칭: 오버레이(즉시 불투명) + key 변경이
      // 하나의 렌더 사이클에서 커밋 → 리마운트가 오버레이 뒤에서 발생
      setOverlayPhase("solid");
      setGeneration((g) => g + 1);
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
          setGeneration((g) => g + 1);
        }
      }, FADE_OUT_MS);
      return () => clearTimeout(timer);
    }
  }, [overlayPhase]);

  return (
    <>
      <div key={generation}>{children}</div>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: "var(--z-top)",
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
