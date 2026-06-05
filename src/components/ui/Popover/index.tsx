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
  const { isTouch, isMobile } = useIsMobile();
  // responsive 시 터치 디바이스뿐 아니라 좁은 뷰포트(모바일 모드)에서도 bottom sheet 로 전환
  const useSheet = responsive && (isTouch || isMobile);

  const [pos, setPos] = useState<{ top: number; left: number; origin: string; maxHeight?: number }>({
    top: 0,
    left: 0,
    origin: "top right",
  });

  useEffect(() => { setMounted(true); }, []);

  const recompute = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 8; // 화면 가장자리 최소 여백
    const cw = contentRef.current?.offsetWidth ?? 0;
    const ch = contentRef.current?.offsetHeight ?? 0;

    const wantTop = placement.startsWith("top");
    const wantEnd = placement.endsWith("end");

    // ── 세로: 공간 부족하면 flip ──
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    let placeTop = wantTop;
    if (!wantTop && spaceBelow < ch + offset + MARGIN && spaceAbove > spaceBelow) placeTop = true;
    if (wantTop && spaceAbove < ch + offset + MARGIN && spaceBelow > spaceAbove) placeTop = false;

    // 사용 가능한 세로 공간으로 maxHeight 제한 (넘치면 내부 스크롤)
    const avail = (placeTop ? spaceAbove : spaceBelow) - offset - MARGIN;
    const maxHeight = Math.max(120, Math.min(ch || avail, avail, vh - MARGIN * 2));

    let top = placeTop ? rect.top - Math.min(ch, maxHeight) - offset : rect.bottom + offset;
    top = Math.max(MARGIN, Math.min(top, vh - Math.min(ch, maxHeight) - MARGIN));

    // ── 가로: start/end 로 anchor 후 화면 안으로 clamp ──
    let left = wantEnd ? rect.right - cw : rect.left;
    left = Math.max(MARGIN, Math.min(left, vw - cw - MARGIN));

    const origin = `${placeTop ? "bottom" : "top"} ${wantEnd ? "right" : "left"}`;
    setPos({ top, left, origin, maxHeight });
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
                  className="ui-sheet-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={close}
                />
                <motion.div
                  ref={setContentRef}
                  className={cn("ui-sheet", contentClassName)}
                  /* Lenis 가 wheel/touch 를 가로채 내부 스크롤이 막히는 것 방지 */
                  data-lenis-prevent
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 280 }}
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="ui-sheet-handle" aria-hidden>
                    <span className="ui-sheet-handle-bar" />
                  </div>
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
                  <div className={styles.sheetBody}>{renderedContent}</div>
                </motion.div>
              </>
            ) : (
              <motion.div
                ref={contentRef}
                className={cn(styles.dropdown, contentClassName)}
                /* Lenis 가 wheel 을 가로채 내부 스크롤이 막히는 것 방지 */
                data-lenis-prevent
                style={{ top: pos.top, left: pos.left, maxHeight: pos.maxHeight, overflowY: "auto", transformOrigin: pos.origin }}
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
