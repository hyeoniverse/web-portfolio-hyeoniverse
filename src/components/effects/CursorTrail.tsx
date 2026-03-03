"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useIsMobile } from "@/hooks/useIsMobile";
import styles from "./CursorTrail.module.css";

type CursorType = "big" | "text" | "grab" | "disabled" | "";

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
  const [isMore, setMore] = useState(false);

  const mouseRef = useRef({ x: 0, y: 0 });
  const circleRef = useRef({ x: 0, y: 0 });
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(0);
  const angleRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (isTouch) return;

    const el = cursorRef.current;
    if (!el) return;

    const speed = 0.5;

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

    const runHitTest = (mx: number, my: number) => {
      const target = checkElementAt(mx, my);

      setMore(!!target?.closest("[data-more]"));

      const isDisabled = !!target && (
        (target as HTMLButtonElement).disabled === true ||
        !!target.closest("[disabled]") ||
        !!target.closest("[aria-disabled='true']") ||
        !!target.closest("[data-disabled]")
      );

      const isDraggable = !isDisabled && !!target?.closest("[data-draggable]");

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

      if (isDraggable) setCursorType("grab");
      else if (isDisabled) setCursorType("disabled");
      else if (isClickable) setCursorType("big");
      else if (isText) setCursorType("text");
      else setCursorType("");
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
      if (target?.closest("[data-draggable]")) {
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

      const translate = `translate(${circleRef.current.x}px, ${circleRef.current.y}px)`;

      /* 속도 */
      const dx = mouseRef.current.x - prevMouseRef.current.x;
      const dy = mouseRef.current.y - prevMouseRef.current.y;
      prevMouseRef.current = { ...mouseRef.current };

      const velocity = Math.min(Math.sqrt(dx * dx + dy * dy) * 4, 150);

      /* 스케일 */
      const targetScale = (velocity / 150) * 0.5;
      scaleRef.current += (targetScale - scaleRef.current) * speed;
      const scale = `scale(${1 + scaleRef.current}, ${1 - scaleRef.current})`;

      /* 회전 */
      if (velocity > 20) {
        angleRef.current = (Math.atan2(dy, dx) * 180) / Math.PI;
      }
      const rotate = `rotate(${angleRef.current}deg)`;

      el.style.transform = `${translate} ${rotate} ${scale}`;

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", handleMouseMove);
    window.addEventListener("pointerdown", handleMouseDown);
    window.addEventListener("pointerup", handleMouseUp);
    document.addEventListener("pointerenter", handleEnter);
    document.addEventListener("pointerleave", handleLeave);

    animate();

    return () => {
      window.removeEventListener("pointermove", handleMouseMove);
      window.removeEventListener("pointerdown", handleMouseDown);
      window.removeEventListener("pointerup", handleMouseUp);
      document.removeEventListener("pointerenter", handleEnter);
      document.removeEventListener("pointerleave", handleLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (hitTestTimer) clearTimeout(hitTestTimer);
    };
  }, [isTouch]);

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
        <span className={styles.cursorText}>
          {cursorType === "grab" ? "Drag" : isMore ? "More" : "Click"}
        </span>
      </div>
    </div>
  );
}
