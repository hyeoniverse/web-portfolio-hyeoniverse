"use client";

/**
 * 높이 조절 손잡이 — 대상 상자 바로 아래 가운데의 가로 막대. 끌거나(포인터) ↑ · ↓ 키로 대상의 높이를 바꾼다.
 *
 * 본문 편집기는 CSS resize 로 아래 오른쪽 모서리를 끌게 했는데, 브라우저 손잡이는 네모 모서리에 그려지고
 * 안쪽 편집기 테두리는 둥글어서 손잡이가 모서리 밖으로 반쯤 잘려 보였다.
 */
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import styles from "./ResizeHandle.module.css";

const KEY_STEP = 40;

export default function ResizeHandle({ targetRef, min = 320, label, className }: {
  targetRef: RefObject<HTMLElement | null>;
  className?: string;
  /** 가장 낮은 높이(px) */
  min?: number;
  label: string;
}) {
  const setHeight = (el: HTMLElement, h: number) => {
    el.style.height = `${Math.max(min, Math.round(h))}px`;
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = targetRef.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    const startY = e.clientY;
    const startH = el.getBoundingClientRect().height;
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const move = (ev: globalThis.PointerEvent) => setHeight(el, startH + ev.clientY - startY);
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = targetRef.current;
    if (!el || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    setHeight(el, el.getBoundingClientRect().height + (e.key === "ArrowDown" ? KEY_STEP : -KEY_STEP));
  };
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      title={label}
      tabIndex={0}
      className={`${styles.handle}${className ? ` ${className}` : ""}`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <span className={styles.grip} />
    </div>
  );
}
