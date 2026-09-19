"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  RADIUS,
  PLANE_WIDTH,
  SCROLL_SENSITIVITY,
  SCROLL_CLAMP,
  BACK_THRESHOLD,
  FLING_MS,
  cylinderCamera,
  wrapAngle,
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
  frozen = false,
}: {
  slotCount: number;
  segAngle: number;
  arc: number;
  indicatorDotActiveClassName: string;
  /** 굴리지 않는다 — 작업물이 없어 인트로 칸만 있을 때는 돌릴 것이 없고, 돌리면 그 칸에 붙어
      있는 글자와 몽이가 화면 밖으로 따라 나간다(#1062). 휠은 부르는 쪽이 따로 쓴다 */
  frozen?: boolean;
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
    if (frozen) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const clamped = Math.max(-SCROLL_CLAMP, Math.min(SCROLL_CLAMP, e.deltaY));
      scrollRef.current += clamped * SCROLL_SENSITIVITY;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [frozen]);

  /* 슬롯을 앞면으로 돌린다 — 키보드 목록에서 초점이 옮겨 갈 때 쓴다. 휠과 같은 scrollRef 를 옮기므로
     회전은 휠처럼 따라온다. 씬의 목표 회전각이 scrollRef × segAngle × slotCount 라, 슬롯 i 가 앞면이 되는
     각은 i × segAngle 이다. 한 바퀴 안에서 가까운 쪽으로 돈다. */
  const rotateTo = useCallback((slot: number) => {
    const turn = segAngle * slotCount;
    const delta = slot * segAngle - scrollRef.current * turn;
    scrollRef.current += (delta - Math.PI * 2 * Math.round(delta / (Math.PI * 2))) / turn;
  }, [segAngle, slotCount]);

  /* Touch — 휠이 없는 터치 화면에서도 돌린다(#940). 한 손가락으로 위아래로 끌면 먼 쪽 판이 손가락을 따라 돌고,
     놓으면 떼기 직전 속도로 조금 더 간 자리에서 가까운 판에 멈춘다. 두 손가락(확대)이 되면 돌리기를 멈춘다.
     브라우저가 끌기를 스크롤로 가져가지 않도록 .wrap 에 touch-action: pinch-zoom 을 둔다. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const turn = segAngle * slotCount;
    // 손가락이 1px 움직일 때 scrollRef 변화 — 먼 쪽 판의 한 점이 손가락과 같이 움직이게
    const perPixel = () => {
      const { z, fov } = cylinderCamera(window.innerWidth, window.innerHeight);
      const pxPerUnit = window.innerHeight / 2 / (Math.tan((fov * Math.PI) / 360) * (z + RADIUS));
      return 1 / (RADIUS * pxPerUnit * turn);
    };
    const snap = () => {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < slotCount; i++) {
        const d = Math.abs(wrapAngle(scrollRef.current * turn - i * segAngle));
        if (d < bestDist) { bestDist = d; best = i; }
      }
      rotateTo(best);
    };
    const pointers = new Set<number>();
    let dragging: number | null = null;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0; // px/ms, 위로 끌면 +
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      pointers.add(e.pointerId);
      if (pointers.size > 1) {
        if (dragging !== null) snap();
        dragging = null;
        return;
      }
      dragging = e.pointerId;
      lastY = e.clientY;
      lastT = e.timeStamp;
      velocity = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== dragging) return;
      const dy = lastY - e.clientY;
      scrollRef.current += dy * perPixel();
      velocity = dy / Math.max(1, e.timeStamp - lastT);
      lastY = e.clientY;
      lastT = e.timeStamp;
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (e.pointerId !== dragging) return;
      dragging = null;
      // 멈췄다가 떼면 던지지 않는다
      if (e.type === "pointerup" && e.timeStamp - lastT < 100) scrollRef.current += velocity * FLING_MS * perPixel();
      snap();
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [segAngle, slotCount, rotateTo]);

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
        const relAngle = wrapAngle(-slotAngle + cylinderRotX - Math.PI);

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
      // 씬과 같은 카메라 — 좁은 화면에서는 카메라가 물러나고 시야각이 넓어진다(#940)
      const { z: camZ, fov } = cylinderCamera(window.innerWidth, window.innerHeight);
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

      /* 글자는 판 안에 들어가야 한다 — 판이 화면에서 차지하는 너비와 높이를 모든 칸에 넘겨 글자
         크기가 그것을 따르게 한다. 글자 크기가 창 너비(vw)로만 잡혀 있어서, 창이 좁거나 판이
         멀어져 판이 작아지면 제목이 판 밖으로 나갔다. 칸은 모두 같은 크기라 값도 하나다 */
      const panelWpx = Math.round(panelHalfWpx * shrink * 2);
      const panelHpx = Math.round(panelHalfHpx * shrink * 2);
      for (const el of slotRefs.current.values()) {
        el.style.setProperty("--panel-w", `${panelWpx}px`);
        el.style.setProperty("--panel-h", `${panelHpx}px`);
      }

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
    rotateTo,
  };
}
