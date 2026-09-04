"use client";

import { useEffect, useRef, type RefObject } from "react";
import styles from "../TroubleshootingPanel.module.css";

/* 모바일 항목 전환 — 세로 스크롤 하나로 본문 읽기와 항목 넘김을 같이 처리한다.

   본문이 끝에 닿기 전에는 브라우저의 native 스크롤에 맡기고, 끝에 닿은 뒤
   "손을 떼지 않고 계속 세게 미는" 신호일 때만 다음 항목으로 넘긴다.
   fling 의 관성 꼬리(delta 가 작아지는 구간)는 무시해야 살짝 튕긴 것만으로 넘어가지 않는다.
   가로 swipe 는 세로 스크롤과 구분해 바로 다음/이전 탭으로 보낸다. */
export function useTroubleMobileNav({
  isMobile,
  items,
  activeIndex,
  ideEditorRef,
  onSelect,
}: {
  isMobile: boolean;
  items: unknown[];
  /** 현재 활성 항목 — 핸들러가 재구독 없이 읽어야 해 ref 로 미러링해 돌려준다 */
  activeIndex: number;
  ideEditorRef: RefObject<HTMLDivElement | null>;
  /** 항목 전환 — 부모의 handleItemClick. 최신 값을 ref 로 들고 쓴다 */
  onSelect: (index: number) => void;
}) {
  const activeIdxRef = useRef(activeIndex);
  const ideEdgeAccRef = useRef<{ dir: "up" | "down"; accumulated: number } | null>(null);
  const handleItemClickRef = useRef(onSelect);
  useEffect(() => { handleItemClickRef.current = onSelect; });
  useEffect(() => { activeIdxRef.current = activeIndex; }, [activeIndex]);
  // 활성 변경 시 누적 리셋 — 새 콘텐츠의 edge 부터 새로 센다
  useEffect(() => { ideEdgeAccRef.current = null; }, [activeIndex]);

  useEffect(() => {
    if (!isMobile) return;
    const editor = ideEditorRef.current;
    if (!editor) return;
    const ACTIVE_DELTA = 15; // 이상 = 적극 스크롤
    const QUIET_MS = 100; // active wheel 사이 이 시간 이상 비면 = release 후 재스크롤
    const PUSH_THRESHOLD = 520; // edge 위 active 누적 = 손 안 떼고 "명백하게" 계속 세게 push 의 신호
    const COOLDOWN_MS = 250; // 전환 직후 잠금
    const EDGE_GRACE_MS = 420; // edge 도달 직후 이 시간 동안은 전환 X (fling 흡수)
    const SWIPE_THRESHOLD = 50;
    const TOUCH_LOCK_RATIO = 1.2;

    let lastActiveTime = 0; // 마지막 active wheel (edge 안팎 무관)
    let edgeEnterTime = 0; // edge 진입 시각 (0 = 아직 edge 아님)
    let cooldownUntil = 0;
    let touchStart: { x: number; y: number } | null = null;
    let touchHorizontal: boolean | null = null;

    const fireTransition = (dir: "up" | "down", now: number) => {
      const cur = activeIdxRef.current;
      const nextIdx = dir === "down"
        ? Math.min(items.length - 1, cur + 1)
        : Math.max(0, cur - 1);
      if (nextIdx !== cur) {
        handleItemClickRef.current?.(nextIdx);
        cooldownUntil = now + COOLDOWN_MS;
      }
      ideEdgeAccRef.current = null;
    };

    const onWheel = (e: WheelEvent) => {
      const content = editor.querySelector(`.${styles.ideEditorContent}`) as HTMLElement | null;
      if (!content) return;
      const atTop = content.scrollTop <= 0;
      const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 1;
      const dir: "up" | "down" = e.deltaY > 0 ? "down" : "up";
      const atEdgeInDir = (dir === "up" && atTop) || (dir === "down" && atBottom);
      const d = Math.abs(e.deltaY);
      const now = performance.now();

      if (!atEdgeInDir) {
        // 컨텐츠 내부 스크롤 — active 시각 기록, native 통과
        if (d >= ACTIVE_DELTA) lastActiveTime = now;
        ideEdgeAccRef.current = null;
        edgeEnterTime = 0;
        return;
      }

      // edge 위 — momentum 끊기 위해 항상 preventDefault
      e.preventDefault();

      if (edgeEnterTime === 0) edgeEnterTime = now;

      if (now < cooldownUntil) {
        ideEdgeAccRef.current = null;
        return;
      }
      if (d < ACTIVE_DELTA) {
        // momentum tail — 무시 (lastActiveTime 갱신 안 함 → release 감지 가능)
        return;
      }

      const wasQuiet = now - lastActiveTime > QUIET_MS;
      lastActiveTime = now;

      // edge 도달 직후 GRACE 시간 동안은 무조건 흡수 — 강한 fling 의 active 부분이 여기서 소진됨.
      if (now - edgeEnterTime < EDGE_GRACE_MS) {
        ideEdgeAccRef.current = null;
        return;
      }

      if (wasQuiet) {
        // (a) release 후 재스크롤 = 또 스크롤 → 즉시 전환
        fireTransition(dir, now);
        return;
      }

      // 연속 active — (b) 누적 push 가 PUSH_THRESHOLD 도달하면 = 또 스크롤로 인정
      const last = ideEdgeAccRef.current;
      if (!last || last.dir !== dir) {
        ideEdgeAccRef.current = { dir, accumulated: d };
        return;
      }
      last.accumulated += d;
      if (last.accumulated >= PUSH_THRESHOLD) {
        fireTransition(dir, now);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchHorizontal = null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchStart || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;
      if (touchHorizontal === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        touchHorizontal = Math.abs(dx) > Math.abs(dy) * TOUCH_LOCK_RATIO;
      }
      if (touchHorizontal === true) {
        // 가로 swipe 의도 확정 — native 세로 스크롤 차단
        e.preventDefault();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      const start = touchStart;
      const horizontal = touchHorizontal;
      touchStart = null;
      touchHorizontal = null;
      if (!start || horizontal !== true) return;
      const dx = e.changedTouches[0].clientX - start.x;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      const cur = activeIdxRef.current;
      // 왼쪽 swipe (dx < 0) = 다음 탭, 오른쪽 swipe = 이전 탭
      const nextIdx = dx < 0
        ? Math.min(items.length - 1, cur + 1)
        : Math.max(0, cur - 1);
      if (nextIdx !== cur) handleItemClickRef.current?.(nextIdx);
    };

    editor.addEventListener("wheel", onWheel, { passive: false });
    editor.addEventListener("touchstart", onTouchStart, { passive: true });
    editor.addEventListener("touchmove", onTouchMove, { passive: false });
    editor.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      editor.removeEventListener("wheel", onWheel);
      editor.removeEventListener("touchstart", onTouchStart);
      editor.removeEventListener("touchmove", onTouchMove);
      editor.removeEventListener("touchend", onTouchEnd);
    };
    // ref 객체는 참조가 고정이라 추가해도 재구독이 늘지 않는다
  }, [isMobile, items.length, ideEditorRef]);

  return { activeIdxRef, ideEdgeAccRef };
}
