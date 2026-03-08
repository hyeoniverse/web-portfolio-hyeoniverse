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
  children: ReactNode;
}

const GAP = 8;

export default function Tooltip({
  content,
  delay = 0,
  placement = "auto",
  disabled,
  wrapperStyle,
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
    if (placement === "auto" && rect.top < 60) side = "bottom";
    setPos({
      x: cx,
      y: side === "top" ? rect.top - GAP : rect.bottom + GAP,
      side,
    });
  }, [placement]);

  const show = useCallback(() => {
    if (disabled) return;
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
    setVisible(false);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (disabled) return <>{children}</>;

  return (
    <>
      <span
        ref={triggerRef}
        style={{ display: "inline-flex", ...wrapperStyle }}
        onMouseEnter={show}
        onMouseLeave={hide}
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
          <div className={styles.bubble}>{content}</div>
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
