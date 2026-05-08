"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./Tooltip.module.css";

interface TooltipProps {
  content: ReactNode;
  delay?: number;
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  disabled?: boolean;
  wrapperStyle?: React.CSSProperties;
  /** bubble 자체에 추가할 className — max-width / padding 등 부분 오버라이드용 */
  bubbleClassName?: string;
  children: ReactNode;
}

const GAP = 8;

export default function Tooltip({
  content,
  delay = 0,
  placement = "auto",
  disabled,
  wrapperStyle,
  bubbleClassName,
  children,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, side: "top" as "top" | "bottom" | "left" | "right" });
  /** 뷰포트 우/좌 경계에 가까울 때 bubble 이 viewport 안으로 들어오도록 한 px 시프트.
   *  arrow 는 그대로 두어 trigger 중심을 가리키고, bubble 만 옆으로 밀려 잘림 방지 */
  const [bubbleShiftX, setBubbleShiftX] = useState(0);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (placement === "left" || placement === "right") {
      const cy = rect.top + rect.height / 2;
      setPos({
        x: placement === "left" ? rect.left - GAP : rect.right + GAP,
        y: cy,
        side: placement,
      });
      return;
    }

    const cx = rect.left + rect.width / 2;
    let side: "top" | "bottom" = placement === "auto" ? "top" : placement;
    if (placement === "auto") {
      // 가장 가까운 scroll container의 상단을 기준으로 판단
      let scrollTop = 0;
      let parent = el.parentElement;
      while (parent) {
        const ov = getComputedStyle(parent).overflowY;
        if (ov === "auto" || ov === "scroll" || ov === "hidden") {
          scrollTop = parent.getBoundingClientRect().top;
          break;
        }
        parent = parent.parentElement;
      }
      // tooltip이 위에 뜰 공간이 부족하면 아래로
      if (rect.top - scrollTop < 40 || rect.top < 60) side = "bottom";
    }
    setPos({
      x: cx,
      y: side === "top" ? rect.top - GAP : rect.bottom + GAP,
      side,
    });
  }, [placement]);

  const autoHideRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    if (disabled) return;
    clearTimeout(autoHideRef.current);
    measure();
    if (delay > 0) {
      timerRef.current = setTimeout(() => {
        measure();
        setVisible(true);
      }, delay);
    } else {
      setVisible(true);
    }
  }, [disabled, delay, measure]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(autoHideRef.current);
    setVisible(false);
  }, []);

  const handleTouch = useCallback(() => {
    if (disabled) return;
    if (visible) {
      hide();
      return;
    }
    show();
    autoHideRef.current = setTimeout(hide, 2000);
  }, [disabled, visible, show, hide]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearTimeout(autoHideRef.current);
  }, []);

  /** bubble 이 그려진 직후 viewport 밖으로 나가지 않도록 가로 시프트 계산.
   *  - top / bottom 배치일 때만 동작 (left / right 는 가로 정렬이 의미 다름)
   *  - useLayoutEffect — 페인트 전 동기 실행이라 시각적 깜빡임 없이 보정됨 */
  useLayoutEffect(() => {
    if (!visible) return;
    if (pos.side === "left" || pos.side === "right") {
      setBubbleShiftX(0);
      return;
    }
    const bubble = bubbleRef.current;
    if (!bubble) return;

    const rect = bubble.getBoundingClientRect();
    const margin = 8;
    const vpW = window.innerWidth;

    let shift = 0;
    if (rect.left < margin) shift = margin - rect.left;
    else if (rect.right > vpW - margin) shift = vpW - margin - rect.right;

    setBubbleShiftX(shift);
  }, [visible, pos.x, pos.side]);

  if (disabled) return <>{children}</>;

  return (
    <>
      <span
        ref={triggerRef}
        style={{ display: "inline-flex", ...wrapperStyle }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onTouchStart={handleTouch}
      >
        {children}
      </span>

      {visible && createPortal(
        <div
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            transform:
              pos.side === "left" ? "translate(-100%, -50%)" :
              pos.side === "right" ? "translate(0, -50%)" :
              `translate(-50%, ${pos.side === "top" ? "-100%" : "0"})`,
            zIndex: 10001,
            pointerEvents: "none",
          }}
        >
          <div
            ref={bubbleRef}
            className={`${styles.bubble}${bubbleClassName ? ` ${bubbleClassName}` : ""}`}
            // bubbleShiftX 만 bubble 에 적용 — arrow 는 그대로 두어 trigger 중앙을 가리킴
            style={bubbleShiftX !== 0 ? { transform: `translateX(${bubbleShiftX}px)` } : undefined}
          >
            {content}
          </div>
          <div
            className={`${styles.arrow} ${
              pos.side === "top" ? styles.arrowBottom :
              pos.side === "bottom" ? styles.arrowTop :
              pos.side === "left" ? styles.arrowRight :
              styles.arrowLeft
            }`}
          />
        </div>,
        document.body,
      )}
    </>
  );
}
