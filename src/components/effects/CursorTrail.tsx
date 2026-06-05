"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useIsMobile } from "@/hooks/useIsMobile";
import styles from "./CursorTrail.module.css";

type CursorType = "big" | "text" | "grab" | "resize" | "resizeH" | "resizeV" | "resizeDiag" | "disabled" | "stop" | "zoom" | "next" | "prev" | "";

/* ---------------- 헬퍼 함수 ---------------- */

/**
 * textarea / text 계열 input만 텍스트로 인식
 */
const isTextInput = (el: HTMLElement | null) => {
  if (!el) return false;

  const input = el.closest("input, textarea") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;

  if (!input) return false;

  if (input.tagName === "TEXTAREA") return true;

  if (input.tagName === "INPUT") {
    const type = input.type;
    return (
      type === "text" ||
      type === "email" ||
      type === "password" ||
      type === "search" ||
      type === "url" ||
      type === "tel"
    );
  }

  return false;
};

export default function CursorTrail() {
  const { isTouch } = useIsMobile();

  const cursorRef = useRef<HTMLDivElement>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cursorType, setCursorType] = useState<CursorType>("");
  const cursorTypeRef = useRef<CursorType>("");
  const [isMore, setMore] = useState(false);

  const mouseRef = useRef({ x: 0, y: 0 });
  const circleRef = useRef({ x: 0, y: 0 });
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(0);
  const angleRef = useRef(0);
  const rafRef = useRef<number>(0);
  /** cursorInner 실제 렌더 크기 — animate 에서 매 프레임 offsetWidth 읽으면 layout thrash 발생 */
  const innerSizeRef = useRef({ w: 20, h: 20 });

  useEffect(() => {
    if (isTouch) return;

    document.documentElement.classList.add("custom-cursor");
    return () => { document.documentElement.classList.remove("custom-cursor"); };
  }, [isTouch]);

  useEffect(() => {
    if (isTouch) return;

    const el = cursorRef.current;
    if (!el) return;

    const speed = 0.5;

    /* cursorInner 실제 크기 추적 — state 변화로 width/height 가 transition 될 때마다 갱신 */
    const inner = el.firstElementChild as HTMLElement | null;
    const ro = inner && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          if (!inner) return;
          innerSizeRef.current = { w: inner.offsetWidth, h: inner.offsetHeight };
        })
      : null;
    if (inner && ro) ro.observe(inner);
    if (inner) innerSizeRef.current = { w: inner.offsetWidth || 20, h: inner.offsetHeight || 20 };

    // 커서 오버레이를 건너뛰고 해당 지점의 최상위 요소 가져오기
    const checkElementAt = (x: number, y: number) => {
      const elements = document.elementsFromPoint(x, y);
      for (const el of elements) {
        if (el === cursorRef.current || cursorRef.current?.contains(el)) continue;
        return el as HTMLElement;
      }
      return null;
    };

    let hasMoved = false;
    let hitTestTimer = 0;
    // mouseover 이벤트로 data-cursor 감지 (elementsFromPoint보다 확실)
    let activeDateCursor: CursorType | null = null;
    const handleOverForCursor = (e: Event) => {
      const t = e.target as HTMLElement | null;
      const dc = t?.closest("[data-cursor]");
      activeDateCursor = dc ? (dc.getAttribute("data-cursor") as CursorType) : null;
    };
    document.addEventListener("mouseover", handleOverForCursor, true);

    // HTML5 drag 진행 중인지 추적 — 드래그 중에는 cursor type 을 grab 으로 고정 (hover 마다 type 바뀌는 거 방지)
    let isHtml5Dragging = false;
    const onDragStart = () => {
      isHtml5Dragging = true;
      cursorTypeRef.current = "grab";
      setCursorType("grab");
    };
    const onDragEnd = () => {
      isHtml5Dragging = false;
    };
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("dragend", onDragEnd, true);
    document.addEventListener("drop", onDragEnd, true);

    const runHitTest = (mx: number, my: number) => {
      // 드래그 중에는 type 변경 skip — grab 고정
      if (isHtml5Dragging) return;
      const target = checkElementAt(mx, my);

      const hasMore = !!target?.closest("[data-more]");
      setMore(hasMore);

      const isDisabled = !!target && (
        (target as HTMLButtonElement).disabled === true ||
        !!target.closest("[disabled]") ||
        !!target.closest("[aria-disabled='true']") ||
        !!target.closest("[data-disabled]")
      );

      const draggableEl = !isDisabled && target?.closest("[data-draggable], [draggable]");
      // 클릭 가능 요소가 draggable 의 자손이면 (e.g., 드래그 가능한 row 안의 버튼) → 클릭 우선
      const clickableInsideDrag = draggableEl && target && (
        target.closest("button, a, [data-clickable]")
      );
      const clickInsideDrag = !!clickableInsideDrag
        && draggableEl !== clickableInsideDrag
        && draggableEl.contains(clickableInsideDrag);
      const isDraggable = !!draggableEl
        && draggableEl.getAttribute("draggable") !== "false"
        && !clickInsideDrag;

      // clickable 판별 시, 매칭된 interactive 요소 자체가 disabled이면 제외
      const clickableEl = !isDraggable && !isDisabled && target && (
        target.closest("[data-clickable]") ||
        target.closest("a, button") ||
        target.closest('input[type="checkbox"], input[type="radio"]') ||
        (target.classList.contains("clickable") ? target : null) ||
        (target.getAttribute("role") === "button" ? target : null) ||
        (target.dataset.clickable === "true" ? target : null)
      );
      const isClickable = !!clickableEl && !(
        (clickableEl as HTMLButtonElement).disabled === true ||
        clickableEl.hasAttribute("disabled") ||
        clickableEl.getAttribute("aria-disabled") === "true" ||
        clickableEl.hasAttribute("data-disabled")
      );

      const isText = !isDraggable && !!target && (
        isTextInput(target) ||
        !!target.closest(
          "p, h1, h2, h3, h4, h5, h6, span, strong, em, figcaption, label"
        ) ||
        target.classList.contains("text-interactive") ||
        !!target.closest('[contenteditable="true"]')
      );

      // data-cursor: mouseover 이벤트 결과 + elementsFromPoint 폴백 둘 다 체크
      const dataCursor = activeDateCursor
        || target?.closest("[data-cursor]")?.getAttribute("data-cursor") as CursorType | null;

      const next: CursorType = isDraggable ? "grab"
        : isDisabled ? "disabled"
        : dataCursor ? dataCursor
        : (isClickable || hasMore) ? "big"
        : isText ? "text"
        : "";

      cursorTypeRef.current = next;
      if (next === "resize" || next === "resizeH" || next === "resizeV" || next === "resizeDiag") {
        angleRef.current = 0;
        scaleRef.current = 0;
      }
      setCursorType(next);
    };

    const handleMouseMove = (e: PointerEvent) => {
      if (!hasMoved) {
        hasMoved = true;
        circleRef.current = { x: e.clientX, y: e.clientY };
        setIsVisible(true);
      }
      mouseRef.current = { x: e.clientX, y: e.clientY };

      // elementsFromPoint 호출을 ~60ms 간격으로 제한
      if (!hitTestTimer) {
        hitTestTimer = window.setTimeout(() => {
          hitTestTimer = 0;
          runHitTest(mouseRef.current.x, mouseRef.current.y);
        }, 60);
      }
    };

    const handleMouseDown = (e: PointerEvent) => {
      const target = checkElementAt(e.clientX, e.clientY);
      const dragEl = target?.closest("[data-draggable], [draggable]");
      if (dragEl && dragEl.getAttribute("draggable") !== "false") {
        setIsDragging(true);
      } else {
        setIsClicking(true);
      }
    };
    const handleMouseUp = () => {
      setIsClicking(false);
      setIsDragging(false);
    };

    const handleEnter = () => { if (hasMoved) setIsVisible(true); };
    const handleLeave = () => setIsVisible(false);

    const animate = () => {
      if (!el) return;

      /* 따라가기 */
      circleRef.current.x += (mouseRef.current.x - circleRef.current.x) * speed;
      circleRef.current.y += (mouseRef.current.y - circleRef.current.y) * speed;

      /* visual 을 mouse 정중앙에 맞추기 — cursorInner 의 실제 렌더 크기로 보정 (ResizeObserver 캐시) */
      const halfW = innerSizeRef.current.w / 2;
      const halfH = innerSizeRef.current.h / 2;
      const translate = `translate(${circleRef.current.x - halfW}px, ${circleRef.current.y - halfH}px)`;

      /* 속도 */
      const dx = mouseRef.current.x - prevMouseRef.current.x;
      const dy = mouseRef.current.y - prevMouseRef.current.y;
      prevMouseRef.current = { ...mouseRef.current };

      const velocity = Math.min(Math.sqrt(dx * dx + dy * dy) * 4, 150);

      /* resize 모드에서는 회전/스케일 비활성화 */
      const ct = cursorTypeRef.current;
      const isResize = ct === "resize" || ct === "resizeH" || ct === "resizeV" || ct === "resizeDiag";

      if (isResize) {
        angleRef.current = 0;
        scaleRef.current = 0;
        el.style.transform = translate;
      } else {
        const targetScale = (velocity / 150) * 0.5;
        scaleRef.current += (targetScale - scaleRef.current) * speed;
        if (velocity > 20) {
          angleRef.current = (Math.atan2(dy, dx) * 180) / Math.PI;
        }
        el.style.transform = `${translate} rotate(${angleRef.current}deg) scale(${1 + scaleRef.current}, ${1 - scaleRef.current})`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    // HTML5 drag 중엔 브라우저가 pointermove 를 막으므로 dragover 도 함께 듣고 동일 핸들러 호출 → 커서가 따라옴
    const handleDragMove = (e: DragEvent) => {
      // PointerEvent 와 시그니처가 호환되는 부분만 사용 (clientX/Y) → 캐스팅
      handleMouseMove(e as unknown as PointerEvent);
    };

    window.addEventListener("pointermove", handleMouseMove);
    window.addEventListener("dragover", handleDragMove);
    window.addEventListener("pointerdown", handleMouseDown);
    window.addEventListener("pointerup", handleMouseUp);
    document.addEventListener("pointerenter", handleEnter);
    document.addEventListener("pointerleave", handleLeave);

    animate();

    return () => {
      window.removeEventListener("pointermove", handleMouseMove);
      window.removeEventListener("dragover", handleDragMove);
      window.removeEventListener("pointerdown", handleMouseDown);
      window.removeEventListener("pointerup", handleMouseUp);
      document.removeEventListener("pointerenter", handleEnter);
      document.removeEventListener("pointerleave", handleLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (hitTestTimer) clearTimeout(hitTestTimer);
      document.removeEventListener("mouseover", handleOverForCursor, true);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("dragend", onDragEnd, true);
      document.removeEventListener("drop", onDragEnd, true);
      ro?.disconnect();
    };
  }, [isTouch]);

  /* 현재 cursor 상태에 맞는 라벨. 상태가 없으면 빈 문자열. */
  const computedLabel = cursorType === "grab" ? "Drag"
    : cursorType === "stop" ? "Stop"
    : cursorType === "zoom" ? "View"
    : cursorType === "next" ? "Next"
    : cursorType === "prev" ? "Prev"
    : cursorType === "big" ? (isMore ? "More" : "Click")
    : "";

  /* fade-out 중에 React 가 fallback ("Click") 으로 즉시 swap 하면 "Click" 이 잠깐 노출됨.
     opacity transition 끝날 때까지 마지막 라벨을 유지. */
  const [displayLabel, setDisplayLabel] = useState("");
  const labelClearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (computedLabel) {
      if (labelClearTimerRef.current) {
        clearTimeout(labelClearTimerRef.current);
        labelClearTimerRef.current = null;
      }
      setDisplayLabel(computedLabel);
    } else {
      // fade 후 클리어 — CSS transition (duration-base 0.3s) 끝나고 안전 마진
      if (labelClearTimerRef.current) clearTimeout(labelClearTimerRef.current);
      labelClearTimerRef.current = window.setTimeout(() => {
        setDisplayLabel("");
        labelClearTimerRef.current = null;
      }, 320);
    }
  }, [computedLabel]);

  if (isTouch) return null;

  return (
    <div
      ref={cursorRef}
      className={clsx(
        styles.cursor,
        isVisible ? styles.visible : styles.hidden,
        cursorType && styles[cursorType],
        isClicking && styles.clicking,
        isDragging && styles.dragging,
      )}
    >
      <div className={styles.cursorInner}>
        <span className={styles.cursorText}>{displayLabel}</span>
        {cursorType === "zoom" && (
          <svg className={styles.zoomIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.6" y2="16.6" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        )}
      </div>
    </div>
  );
}
