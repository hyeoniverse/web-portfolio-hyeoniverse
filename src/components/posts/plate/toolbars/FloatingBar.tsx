"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useVirtualFloating, offset, flip, shift } from "@platejs/floating";
import styles from "../../RichTextEditor.module.css";

interface FloatingBarProps {
  open: boolean;
  /** 앵커(대상 요소) rect 반환 — 이 위에/아래에 바가 붙고 스크롤 시 따라간다 */
  getAnchorRect: () => DOMRect;
  children: React.ReactNode;
  placement?: "top" | "bottom";
  /** 가로 한 줄 레이아웃(이미지 툴바 등). 기본은 세로 stack(표·컬럼 등 멀티 row) */
  inline?: boolean;
  onFocusCapture?: () => void;
  onBlurCapture?: () => void;
}

/**
 * 컨텍스트 floating bar 공통 컴포넌트 — 대상 요소에 앵커 + 스크롤 추적 + 에디터 영역 벗어나면 숨김(클립).
 * body 로 portal(에디터 stacking/overflow 탈출) 하되, 에디터 보이는 영역 밖이면 렌더 안 함.
 */
export default function FloatingBar({
  open, getAnchorRect, children, placement = "top", inline, onFocusCapture, onBlurCapture,
}: FloatingBarProps) {
  const { refs, style, update } = useVirtualFloating({
    open,
    getBoundingClientRect: getAnchorRect,
    strategy: "fixed",
    placement,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });
  const [outOfView, setOutOfView] = useState(false);
  useEffect(() => {
    if (!open) return;
    const recompute = () => {
      update?.();
      const editEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
      const er = editEl?.getBoundingClientRect();
      if (er) {
        const r = getAnchorRect();
        setOutOfView(r.bottom <= er.top || r.top >= er.bottom);
      }
    };
    recompute();
    const raf = requestAnimationFrame(recompute);
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [open, getAnchorRect, update]);

  if (!open || outOfView) return null;

  const node = (
    // eslint-disable-next-line react-hooks/refs
    <div
      ref={refs.setFloating}
      className={`${styles.floatingBar}${inline ? ` ${styles.floatingBarInline}` : ""}`}
      style={style}
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
  return typeof document !== "undefined" ? createPortal(node, document.body) : null;
}
