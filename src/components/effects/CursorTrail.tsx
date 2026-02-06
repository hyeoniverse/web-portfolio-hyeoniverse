"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useIsMobile } from "@/hooks/useIsMobile";
import styles from "./CursorTrail.module.css";

type CursorType = "big" | "text" | "";

/* ---------------- helpers ---------------- */

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

  const [isVisible, setIsVisible] = useState(true);
  const [isClicking, setIsClicking] = useState(false);
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

    // Get cursor radius from actual element size
    const getCursorRadius = () => {
      const inner = el.querySelector(`.${styles.cursorInner}`) as HTMLElement;
      if (inner) {
        return inner.offsetWidth / 2;
      }
      return 10; // fallback
    };

    // Check element at a specific point
    const checkElementAt = (x: number, y: number) => {
      const elements = document.elementsFromPoint(x, y);
      for (const el of elements) {
        if (el === cursorRef.current || cursorRef.current?.contains(el)) continue;
        return el as HTMLElement;
      }
      return null;
    };

    // Check if any point on circle edge hits a matching element
    const findElementOnCircleEdge = (
      cx: number,
      cy: number,
      radius: number,
      selector: string | ((el: HTMLElement) => boolean)
    ): HTMLElement | null => {
      const points = 8; // Check 8 points around the circle
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const el = checkElementAt(x, y);
        if (el) {
          if (typeof selector === "function") {
            if (selector(el)) return el;
          } else {
            if (el.closest(selector)) return el;
          }
        }
      }
      // Also check center
      const centerEl = checkElementAt(cx, cy);
      if (centerEl) {
        if (typeof selector === "function") {
          if (selector(centerEl)) return centerEl;
        } else {
          if (centerEl.closest(selector)) return centerEl;
        }
      }
      return null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };

      const cx = circleRef.current.x || e.clientX;
      const cy = circleRef.current.y || e.clientY;
      const radius = getCursorRadius();

      /* ---------- more ---------- */
      const moreEl = findElementOnCircleEdge(cx, cy, radius, "[data-more]");
      setMore(!!moreEl);

      /* ---------- clickable ---------- */
      const isClickable = !!findElementOnCircleEdge(cx, cy, radius, (el) => {
        return (
          !!el.closest("[data-clickable]") ||
          !!el.closest("a, button") ||
          !!el.closest('input[type="checkbox"], input[type="radio"]') ||
          el.classList.contains("clickable") ||
          el.style.cursor === "pointer" ||
          el.getAttribute("role") === "button" ||
          el.dataset.clickable === "true"
        );
      });

      /* ---------- text ---------- */
      const isText = !!findElementOnCircleEdge(cx, cy, radius, (el) => {
        return (
          isTextInput(el) ||
          !!el.closest(
            "p, h1, h2, h3, h4, h5, h6, span, strong, em, figcaption, label"
          ) ||
          el.classList.contains("text-interactive") ||
          !!el.closest('[contenteditable="true"]')
        );
      });

      /* ---------- priority ---------- */
      if (isClickable) setCursorType("big");
      else if (isText) setCursorType("text");
      else setCursorType("");
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleEnter = () => setIsVisible(true);
    const handleLeave = () => setIsVisible(false);

    const animate = () => {
      if (!el) return;

      /* follow */
      circleRef.current.x += (mouseRef.current.x - circleRef.current.x) * speed;
      circleRef.current.y += (mouseRef.current.y - circleRef.current.y) * speed;

      const translate = `translate(${circleRef.current.x}px, ${circleRef.current.y}px)`;

      /* velocity */
      const dx = mouseRef.current.x - prevMouseRef.current.x;
      const dy = mouseRef.current.y - prevMouseRef.current.y;
      prevMouseRef.current = { ...mouseRef.current };

      const velocity = Math.min(Math.sqrt(dx * dx + dy * dy) * 4, 150);

      /* scale */
      const targetScale = (velocity / 150) * 0.5;
      scaleRef.current += (targetScale - scaleRef.current) * speed;
      const scale = `scale(${1 + scaleRef.current}, ${1 - scaleRef.current})`;

      /* rotate */
      if (velocity > 20) {
        angleRef.current = (Math.atan2(dy, dx) * 180) / Math.PI;
      }
      const rotate = `rotate(${angleRef.current}deg)`;

      el.style.transform = `${translate} ${rotate} ${scale}`;

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseenter", handleEnter);
    document.addEventListener("mouseleave", handleLeave);

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseenter", handleEnter);
      document.removeEventListener("mouseleave", handleLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
      )}
    >
      <div className={styles.cursorInner}>
        <span className={styles.cursorText}>{isMore ? "More" : "Click"}</span>
      </div>
    </div>
  );
}
