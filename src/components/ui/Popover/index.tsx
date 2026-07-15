"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/utils/cn";
import { usePortalContainer } from "../portalContainer";
import styles from "./Popover.module.css";

export type PopoverPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end" | "right-start" | "left-start";

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
  /** - "glass"(기본): 반투명 scrim + blur, blend 없음. 색이 정확하고 가독성이 안정적이다.
   *  - "difference": 투명 + blur + 뒤 페이지와 반전 합성. 밑에 뭐가 깔리든 대비가 자동으로 잡힌다.
   *    콘텐츠는 filter: invert(1) 로 "반대색을 주입"해서 넣으므로 (|배경 − (1−색)|),
   *    **밝은 배경 위에선 의도한 색이 거의 그대로 복원**되고 어두운 배경 위에선 반전된 색이 된다.
   *    ※ 배경이 임의 색/이미지면 색이 틀어진다 — 그래서 기본은 glass.
   *    ※ "특정 텍스트만 반전"은 불가능 — blend 는 패널 단위로만 걸린다.
   *  - "solid": 불투명 bg-primary. 뒤가 전혀 비치면 안 될 때. */
  variant?: "glass" | "solid" | "difference";
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
  /** dropdown 높이 제한.
   *  - undefined(기본): 가용 세로 공간 기준 자동 계산 + 넘치면 내부 스크롤
   *  - number: 해당 px 로 고정
   *  - false: maxHeight 캡 없이 내용 전체 표시(스크롤 X) — 내용이 bounded 할 때만 사용 */
  maxHeight?: number | false;
  /** 데스크톱에서 trigger 에 hover 하면 열리고, trigger↔content 사이 이동은 짧은 지연으로 유지. 클릭도 그대로 동작.
   *  (터치/모바일 sheet 모드에선 무시 — hover 개념이 없음) */
  openOnHover?: boolean;
}

// openOnHover popover 는 한 번에 하나만 열림 — 새 hover popover 가 열리면 이전 것을 닫는다
// (같은 floating bar 안에서 여러 메뉴가 동시에 펼쳐지는 것 방지). click-only popover 는 기존 outside-click 로 처리.
let activeHoverPopover: { close: () => void } | null = null;

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
  variant = "glass",
  contentClassName,
  responsive = true,
  sheetTitle,
  contentRef: externalContentRef,
  maxHeight: maxHeightProp,
  openOnHover = false,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? !!controlledOpen : uncontrolledOpen;
  // 오버레이(모달) 안이면 그 stacking context 로 portal → 전역 z 없이 모달 위에 뜬다.
  const portalContainer = usePortalContainer();

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const close = () => setOpen(false);
  const toggle = () => setOpen(!open);

  // ── hover 로 열기(openOnHover, 데스크톱) — trigger↔content 이동/이탈 순간은 close 타이머로 브릿지.
  //    열림은 즉시, 닫힘은 넉넉한 지연(실수로 벗어나거나 빠르게 지나칠 때 팝오버가 휙휙 닫히지 않게) ──
  const HOVER_CLOSE_DELAY = 500;
  const hoverTimer = useRef(0);
  const cancelHoverClose = () => { if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = 0; } };
  const hoverOpen = () => { if (!openOnHover) return; cancelHoverClose(); setOpen(true); };
  const hoverScheduleClose = () => { if (!openOnHover) return; cancelHoverClose(); hoverTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY); };
  useEffect(() => cancelHoverClose, []); // 언마운트 시 타이머 정리

  // ── 단일 오픈 조율(openOnHover) — 이 popover 가 열리면 다른 hover popover 를 닫음 ──
  const selfRef = useRef<{ close: () => void }>({ close: () => {} });
  selfRef.current.close = close;
  useEffect(() => {
    if (!openOnHover) return;
    if (open) {
      if (activeHoverPopover && activeHoverPopover !== selfRef.current) activeHoverPopover.close();
      activeHoverPopover = selfRef.current;
    } else if (activeHoverPopover === selfRef.current) {
      activeHoverPopover = null;
    }
  }, [open, openOnHover]);
  useEffect(() => () => { if (activeHoverPopover === selfRef.current) activeHoverPopover = null; }, []);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // dropdown(=contentRef)엔 maxHeight 가 걸려 offsetHeight 가 capped → 내용 자연 높이를
  // 못 잼. maxHeight 없는 inner wrapper 를 따로 관찰/측정해 내용 변화(예: 날짜 picker
  // inline 펼침)에도 popover 가 같이 커지도록.
  const innerRef = useRef<HTMLDivElement>(null);
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
    // inner wrapper(높이 제약 없음)로 내용 자연 높이 측정 — capped 된 contentRef 대신
    const ch = innerRef.current?.offsetHeight ?? contentRef.current?.offsetHeight ?? 0;

    // ── side(right/left) placement — 서브메뉴/플라이아웃: 트리거 옆에 배치, 공간 부족하면 좌우 flip ──
    if (placement.startsWith("right") || placement.startsWith("left")) {
      const wantLeft = placement.startsWith("left");
      const spaceRight = vw - rect.right;
      const spaceLeft = rect.left;
      let placeLeft = wantLeft;
      if (!wantLeft && spaceRight < cw + offset + MARGIN && spaceLeft > spaceRight) placeLeft = true;
      if (wantLeft && spaceLeft < cw + offset + MARGIN && spaceRight > spaceLeft) placeLeft = false;
      let sideLeft = placeLeft ? rect.left - cw - offset : rect.right + offset;
      sideLeft = Math.max(MARGIN, Math.min(sideLeft, vw - cw - MARGIN));
      const availSide = vh - MARGIN * 2;
      const sideMaxH = Math.max(120, Math.min(ch || availSide, availSide));
      let sideTop = rect.top; // start 정렬(트리거 상단)
      sideTop = Math.max(MARGIN, Math.min(sideTop, vh - Math.min(ch, sideMaxH) - MARGIN));
      setPos({ top: sideTop, left: sideLeft, origin: `top ${placeLeft ? "right" : "left"}`, maxHeight: sideMaxH });
      return;
    }

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
    // inner wrapper 를 우선 관찰 — capped 된 contentRef 는 내용 커져도 border-box 가 안 변해 RO 가 안 fire
    const roTarget = innerRef.current ?? contentRef.current;
    if (ro && roTarget) ro.observe(roTarget);
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
  // maxHeight prop: false → 캡 없음(스크롤 X), number → 고정, undefined → 자동 계산값
  const effMaxHeight = maxHeightProp === false ? undefined : (maxHeightProp ?? pos.maxHeight);

  return (
    <>
      <span
        ref={triggerRef}
        className={cn(styles.trigger, className)}
        onClick={(e) => { e.stopPropagation(); if (openOnHover && open) return; toggle(); }}
        onMouseEnter={hoverOpen}
        onMouseLeave={hoverScheduleClose}
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
                ref={setContentRef}
                className={cn(
                  styles.dropdown,
                  variant === "glass" && styles.dropdownGlass,
                  variant === "difference" && styles.dropdownDifference,
                  contentClassName,
                )}
                /* Lenis 가 wheel 을 가로채 내부 스크롤이 막히는 것 방지 */
                data-lenis-prevent
                style={{ top: pos.top, left: pos.left, maxHeight: effMaxHeight, overflowY: effMaxHeight != null ? "auto" : "visible", transformOrigin: pos.origin }}
                initial={{ opacity: 0, scale: 0.92, y: placement.startsWith("bottom") ? -4 : 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: placement.startsWith("bottom") ? -4 : 4 }}
                transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={cancelHoverClose}
                onMouseLeave={hoverScheduleClose}
              >
                <div ref={innerRef}>{renderedContent}</div>
              </motion.div>
            )
          )}
        </AnimatePresence>,
        portalContainer ?? document.body,
      )}
    </>
  );
}

export { MenuItem, MenuItemTrailing, MenuDivider } from "./Menu";
