"use client";

import {
  useState,
  useEffect,
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

  const triggerRef = useRef<HTMLSpanElement>(null);
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
          <div className={`${styles.bubble}${bubbleClassName ? ` ${bubbleClassName}` : ""}`}>{content}</div>
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
