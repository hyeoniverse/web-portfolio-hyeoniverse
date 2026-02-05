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

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };

      const target = e.target as HTMLElement | null;
      if (!target) return;

      /* ---------- more ---------- */
      const isMore = !!target.closest("[data-more]");
      setMore(isMore);

      /* ---------- clickable ---------- */
      const isClickable =
        !!target.closest("[data-clickable]") ||
        !!target.closest("a, button") ||
        !!target.closest('input[type="checkbox"], input[type="radio"]') ||
        target.classList.contains("clickable") ||
        target.style.cursor === "pointer" ||
        target.getAttribute("role") === "button" ||
        target.dataset.clickable === "true";

      /* ---------- text ---------- */
      const isText =
        isTextInput(target) ||
        !!target.closest(
          "p, h1, h2, h3, h4, h5, h6, span, strong, em, figcaption, label",
        ) ||
        target.classList.contains("text-interactive") ||
        target.closest('[contenteditable="true"]');

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
