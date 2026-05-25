"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/utils/cn";
import styles from "./Popover.module.css";

export type PopoverPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

interface PopoverRenderProps {
  close: () => void;
}

interface PopoverProps {
  /** 클릭 시 popover 토글 — 보통 button 하나. ref / onClick 자동 wiring. */
  trigger: ReactNode;
  /** content. close 호출 가능. */
  children: ReactNode | ((p: PopoverRenderProps) => ReactNode);
  placement?: PopoverPlacement;
  /** trigger 와 content 사이 gap (px). */
  offset?: number;
  /** controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** wrapper className (trigger 감싸는 span). */
  className?: string;
  /** dropdown / sheet content 의 className. */
  contentClassName?: string;
  /** 터치 디바이스 (pointer:coarse) 에서 bottom sheet 로 렌더. 기본 true. */
  responsive?: boolean;
  /** bottom sheet 헤더 제목 (responsive=true 일 때). */
  sheetTitle?: ReactNode;
  /** content DOM 노드 ref — 직접 DOM 측정/조작이 필요할 때. */
  contentRef?: RefObject<HTMLDivElement | null>;
}

/** 공통 Popover — desktop dropdown (portal) + touch bottom sheet 자동 전환.
 *  - portal 로 body 렌더 → 부모 stacking context / overflow 영향 안 받음
 *  - outside click / ESC 로 닫힘
 *  - scroll / resize 시 자동 reposition
 */
export default function Popover({
  trigger,
  children,
  placement = "bottom-end",
  offset = 4,
  open: controlledOpen,
  onOpenChange,
  className,
  contentClassName,
  responsive = true,
  sheetTitle,
  contentRef: externalContentRef,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? !!controlledOpen : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const close = () => setOpen(false);
  const toggle = () => setOpen(!open);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // 외부 ref 가 있으면 동기화 (직접 DOM 측정/조작용)
  const setContentRef = (node: HTMLDivElement | null) => {
    contentRef.current = node;
    if (externalContentRef) (externalContentRef as { current: HTMLDivElement | null }).current = node;
  };
  const [mounted, setMounted] = useState(false);
  const { isTouch } = useIsMobile();
  const useSheet = responsive && isTouch;

  const [pos, setPos] = useState<{ top: number; left?: number; right?: number; origin: string }>({
    top: 0,
    origin: "top right",
  });

  useEffect(() => { setMounted(true); }, []);

  const recompute = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const contentH = contentRef.current?.offsetHeight ?? 0;
    let top = 0;
    let left: number | undefined;
    let right: number | undefined;
    let origin = "top right";
    switch (placement) {
      case "bottom-end":
        top = rect.bottom + offset;
        right = window.innerWidth - rect.right;
        origin = "top right";
        break;
      case "bottom-start":
        top = rect.bottom + offset;
        left = rect.left;
        origin = "top left";
        break;
      case "top-end":
        top = rect.top - contentH - offset;
        right = window.innerWidth - rect.right;
        origin = "bottom right";
        break;
      case "top-start":
        top = rect.top - contentH - offset;
        left = rect.left;
        origin = "bottom left";
        break;
    }
    setPos({ top, left, right, origin });
  };

  useLayoutEffect(() => {
    if (!open || useSheet) return;
    recompute();
    const onScroll = () => recompute();
    const onResize = () => recompute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    // content 자체 크기 변화 (예: tab/section 전환) 시에도 recompute — placement 'top-*' 에서 height 변화하면 위치 어긋남
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => recompute()) : null;
    if (ro && contentRef.current) ro.observe(contentRef.current);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
    // recompute 는 의존성 추적 안 함 — placement/offset 변경 시 effect 재실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, useSheet, placement, offset]);

  // outside click + ESC
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !contentRef.current?.contains(t)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // sheet 열릴 때 body scroll lock
  useEffect(() => {
    if (!open || !useSheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, useSheet]);

  const renderedContent = typeof children === "function" ? children({ close }) : children;

  return (
    <>
      <span
        ref={triggerRef}
        className={cn(styles.trigger, className)}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
      >
        {trigger}
      </span>
      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            useSheet ? (
              <>
                <motion.div
                  className={styles.sheetBackdrop}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={close}
                />
                <motion.div
                  ref={setContentRef}
                  className={cn(styles.sheet, contentClassName)}
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 280 }}
                  role="dialog"
                  aria-modal="true"
                >
                  <div className={styles.sheetHeader}>
                    {sheetTitle ? <h3 className={styles.sheetTitle}>{sheetTitle}</h3> : <span />}
                    <button
                      type="button"
                      className={styles.sheetClose}
                      onClick={close}
                      aria-label="닫기"
                    >
                      <X size={18} aria-hidden />
                    </button>
                  </div>
                  {renderedContent}
                </motion.div>
              </>
            ) : (
              <motion.div
                ref={contentRef}
                className={cn(styles.dropdown, contentClassName)}
                style={{ top: pos.top, left: pos.left, right: pos.right, transformOrigin: pos.origin }}
                initial={{ opacity: 0, scale: 0.92, y: placement.startsWith("bottom") ? -4 : 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: placement.startsWith("bottom") ? -4 : 4 }}
                transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                {renderedContent}
              </motion.div>
            )
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

export { MenuItem, MenuItemTrailing, MenuDivider } from "./Menu";
