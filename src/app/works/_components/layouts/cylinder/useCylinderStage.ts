"use client";

import { useEffect, useRef } from "react";
import {
  RADIUS,
  PLANE_WIDTH,
  SCROLL_SENSITIVITY,
  SCROLL_CLAMP,
  BACK_THRESHOLD,
} from "./scene";
import type { SlotBounds } from "./useFloatingComments";

/* ── 실린더 무대 상태 ──
   씬과 DOM 오버레이가 공유하는 값은 전부 ref 다. 회전·마우스·슬롯 화면좌표가 매 프레임 바뀌는데
   state 로 두면 60fps 로 리렌더된다. three.js 쪽이 screenPosRef 에 투영 좌표를 써주면
   여기 rAF 가 그 좌표로 DOM 패널을 옮기고, 가장 정면인 슬롯을 골라 인디케이터를 갱신한다.
   intro 슬롯(0번)의 뷰포트 경계도 같은 투영으로 계산해 떠다니는 댓글의 활동 범위로 넘긴다. */
export function useCylinderStage({
  slotCount,
  segAngle,
  arc,
  indicatorDotActiveClassName,
}: {
  slotCount: number;
  segAngle: number;
  arc: number;
  indicatorDotActiveClassName: string;
}) {
  const scrollRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const actualRotRef = useRef(Math.PI);
  const screenPosRef = useRef<{ x: number; y: number }[]>(
    Array.from({ length: slotCount }, () => ({ x: 0, y: 0 })),
  );
  const slotRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const overlayRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const activeIdxRef = useRef(0);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const floatingCommentsRef = useRef<HTMLDivElement>(null);
  // slot 0 패널의 뷰포트 % 경계 (3D 프로젝션에서 계산)
  const slotBoundsRef = useRef<SlotBounds>({ left: 20, top: 15, right: 80, bottom: 85 });
  // metaItem hover 시 실린더 이미지 dimmed (Three.js 내부에서 lerp)
  const hoverDimRef = useRef(0);

  // Wheel
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const clamped = Math.max(-SCROLL_CLAMP, Math.min(SCROLL_CLAMP, e.deltaY));
      scrollRef.current += clamped * SCROLL_SENSITIVITY;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  // Mouse
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
      if (wrapRef.current) {
        wrapRef.current.style.setProperty("--mx", `${e.clientX}px`);
        wrapRef.current.style.setProperty("--my", `${e.clientY}px`);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // rAF — slot visibility + position
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const cylinderRotX = actualRotRef.current;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < slotCount; i++) {
        const slotAngle = i * segAngle;
        let relAngle = -slotAngle + cylinderRotX - Math.PI;
        relAngle = ((relAngle % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;

        const absAngle = Math.abs(relAngle);
        const visible = absAngle < BACK_THRESHOLD;
        const pos = screenPosRef.current[i] || { x: 0, y: 0 };

        const el = slotRefs.current.get(i);
        const ov = overlayRefs.current.get(i);
        const reveal = Math.max(0, 1 - absAngle / (BACK_THRESHOLD * 0.35));
        if (el && ov) {
          if (visible) {
            const metaH = el.offsetHeight;
            const ovH = ov.offsetHeight;
            const shift = ovH / 2;
            el.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y - shift}px))`;
            el.style.opacity = "1";
            el.style.visibility = "visible";
            el.style.setProperty("--reveal", reveal.toFixed(3));
            const gap = 32;
            ov.style.transform = `translate(calc(-50% + ${pos.x}px), ${pos.y - shift + metaH / 2 + gap}px)`;
            ov.style.opacity = "1";
            ov.style.visibility = "visible";
            ov.style.setProperty("--reveal", reveal.toFixed(3));
          } else {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.setProperty("--reveal", "0");
            ov.style.opacity = "0";
            ov.style.visibility = "hidden";
            ov.style.setProperty("--reveal", "0");
          }
        } else if (el) {
          if (visible) {
            el.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`;
            el.style.opacity = "1";
            el.style.visibility = "visible";
            el.style.setProperty("--reveal", reveal.toFixed(3));
          } else {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            el.style.setProperty("--reveal", "0");
          }
        }

        if (absAngle < bestDist) {
          bestDist = absAngle;
          bestIdx = i;
        }
      }

      // intro slot 패널의 뷰포트 경계 계산 (bunny와 동일한 3D 프로젝션 기반)
      const slot0 = screenPosRef.current[0] || { x: 0, y: 0 };
      const camZ = 9, fov = 55;
      const panelDist = camZ + RADIUS;
      const halfH = Math.tan((fov * Math.PI) / 360) * panelDist;
      const aspect = window.innerWidth / window.innerHeight;
      const halfW = halfH * aspect;
      const pxPerUnitX = (window.innerWidth * 0.5) / halfW;
      const pxPerUnitY = (window.innerHeight * 0.5) / halfH;
      const panelHalfWpx = (PLANE_WIDTH / 2) * pxPerUnitX;
      const panelHalfHpx = ((arc * RADIUS) / 2) * pxPerUnitY;
      const cx = window.innerWidth / 2 + slot0.x;
      const cy = window.innerHeight / 2 + slot0.y;
      // 곡면 패널 → 실제 가시 영역은 투영의 ~65%
      const shrink = 0.65;
      slotBoundsRef.current = {
        left: ((cx - panelHalfWpx * shrink) / window.innerWidth) * 100,
        top: ((cy - panelHalfHpx * shrink) / window.innerHeight) * 100,
        right: ((cx + panelHalfWpx * shrink) / window.innerWidth) * 100,
        bottom: ((cy + panelHalfHpx * shrink) / window.innerHeight) * 100,
      };

      // intro 일 때만 댓글 버블 보이기
      const fc = floatingCommentsRef.current;
      if (fc) {
        fc.style.visibility = bestIdx === 0 ? "visible" : "hidden";
      }


      if (activeIdxRef.current !== bestIdx) {
        activeIdxRef.current = bestIdx;
        if (indicatorRef.current) {
          const dots = indicatorRef.current.children;
          for (let j = 0; j < dots.length; j++) {
            dots[j].classList.toggle(indicatorDotActiveClassName, j === bestIdx);
          }
        }
      }



      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // arc / segAngle 은 slotCount 에서 derive 되므로 deps 에 별도 추가 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotCount]);


  return {
    scrollRef,
    mouseRef,
    actualRotRef,
    screenPosRef,
    slotRefs,
    overlayRefs,
    indicatorRef,
    wrapRef,
    floatingCommentsRef,
    slotBoundsRef,
    hoverDimRef,
  };
}
