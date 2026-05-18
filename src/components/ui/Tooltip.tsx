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
  /** 좌/우 placement 가 viewport 밖으로 나갈 때 1회만 반대 side 로 flip. 무한 ping-pong 방지 */
  const flippedRef = useRef(false);

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
    flippedRef.current = false;
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

  /** bubble 이 그려진 직후 viewport 밖으로 나가지 않도록 가로 시프트 계산 (top/bottom)
   *  또는 좌/우 placement 가 overflow 시 반대 side 로 1회 flip.
   *
   *  포인트: 측정 직전에 bubble.style.transform 을 잠시 지워 \"natural 위치\" 를 직접
   *  측정. 이러면 bubbleShiftX state 가 어떤 값이든 측정값은 항상 동일 → deps 에
   *  포함시킬 필요 없음 → 무한 루프 / subpixel oscillation 방지.
   *
   *  useLayoutEffect 는 페인트 전 동기 실행이라 transform 을 잠깐 지웠다 복원해도
   *  시각 깜빡임 없음. */
  useLayoutEffect(() => {
    if (!visible) {
      setBubbleShiftX(0); // React 가 동일값이면 자동 skip
      return;
    }
    const bubble = bubbleRef.current;
    const trigger = triggerRef.current;
    if (!bubble || !trigger) return;

    // ── dynamic max-width ──
    // 텍스트 길이가 짧으면 좁게, 길면 가로로 더 넓혀 한 줄에 가까운 비율로 표시.
    // max-width 를 잠시 풀고 자연 width 측정 → viewport·상한(720) 으로 cap.
    // 짧은 글은 자연 width 가 작으므로 좁게, 긴 글은 한 줄 너비에 맞춰 펼침.
    const prevMaxW = bubble.style.maxWidth;
    bubble.style.maxWidth = "none";
    const naturalWidth = bubble.getBoundingClientRect().width;
    bubble.style.maxWidth = prevMaxW;
    const idealMax = Math.min(naturalWidth, window.innerWidth - 16, 720);
    bubble.style.setProperty("--_max-w", `${Math.ceil(idealMax)}px`);

    // transform 을 잠깐 비워 natural 위치를 측정 → 즉시 복원
    const prev = bubble.style.transform;
    bubble.style.transform = "none";
    const rect = bubble.getBoundingClientRect();
    bubble.style.transform = prev;

    const margin = 8;
    const vpW = window.innerWidth;

    // 좌/우 placement — overflow 시 반대 side 로 flip (1회만)
    if (pos.side === "left" || pos.side === "right") {
      setBubbleShiftX(0);
      if (flippedRef.current) return;

      const overflowLeft = pos.side === "left" && rect.left < margin;
      const overflowRight = pos.side === "right" && rect.right > vpW - margin;
      if (!overflowLeft && !overflowRight) return;

      const triggerRect = trigger.getBoundingClientRect();
      const opposite: "left" | "right" = pos.side === "left" ? "right" : "left";
      const fitsOpposite = opposite === "right"
        ? triggerRect.right + GAP + rect.width + margin <= vpW
        : triggerRect.left - GAP - rect.width >= margin;

      if (fitsOpposite) {
        flippedRef.current = true;
        setPos({
          x: opposite === "left" ? triggerRect.left - GAP : triggerRect.right + GAP,
          y: triggerRect.top + triggerRect.height / 2,
          side: opposite,
        });
      }
      return;
    }

    // top/bottom — 가로 시프트
    let shift = 0;
    if (rect.left < margin) shift = margin - rect.left;
    else if (rect.right > vpW - margin) shift = vpW - margin - rect.right;

    // subpixel 진동 방지 — 정수 픽셀로 반올림
    setBubbleShiftX(Math.round(shift));
  }, [visible, pos.x, pos.y, pos.side]);

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
            /* z-tooltip 토큰 (700) — drawer/modal 같은 overlay (8000+) 아래에 위치하도록.
               drawer 가 열려있을 때 tooltip 이 그 위로 튀어나오지 않게 하기 위함. */
            zIndex: "var(--z-tooltip)",
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
