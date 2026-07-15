"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useVirtualFloating, offset, flip, shift } from "@platejs/floating";
import { GripVertical } from "lucide-react";
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
  /**
   * 대상이 스크롤로 뷰포트를 벗어나도 바를 에디터 화면 안으로 clamp 해서 계속 보이게 하고,
   * "영역 밖이면 숨김"을 적용하지 않는다. **기본 true** — 모든 컨텍스트 바가 스크롤 시 사라지지 않고 따라옴
   * (콘텐츠 위에 겹쳐도 OK). 특정 바에서 옛 "벗어나면 숨김"이 필요하면 false 로 끈다.
   */
  keepInView?: boolean;
  /**
   * 앵커 대상 **인스턴스 식별자**(보통 블록 path). 같은 바가 `open` 인 채로 같은 타입의 다른
   * 블록으로 대상이 바뀌면 이 값이 달라진다 → drag-pin/오프셋을 리셋해 새 대상에 다시 앵커한다.
   * (같은 인스턴스 안에서의 스크롤/레이아웃 변화엔 값이 그대로라 pin 이 유지됨)
   *
   * 지정하지 않으면 인스턴스 추적을 하지 않고 `open` 토글 시에만 pin 이 리셋된다(기존 동작).
   */
  anchorKey?: string | number | null;
}

/**
 * 컨텍스트 floating bar 공통 컴포넌트 — 대상 요소에 앵커 + 스크롤 추적 + 에디터 영역 벗어나면 숨김(클립).
 * body 로 portal(에디터 stacking/overflow 탈출). 핸들을 잡고 드래그하면 앵커 위치에서 자유롭게 옮길 수 있다.
 * keepInView 면 전역 도구(Find)처럼 항상 화면 안에 유지된다.
 */
export default function FloatingBar({
  open, getAnchorRect, children, placement = "top", inline, onFocusCapture, onBlurCapture, keepInView = true, anchorKey,
}: FloatingBarProps) {
  // keepInView: 앵커 rect 를 에디터 뷰포트 안으로 clamp — 매치가 스크롤로 벗어나도 바는 화면 안에 유지.
  const anchorFn = useCallback((): DOMRect => {
    const r = getAnchorRect();
    if (!keepInView) return r;
    const editEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
    const er = editEl?.getBoundingClientRect();
    if (!er) return r;
    const top = Math.min(Math.max(r.top, er.top + 8), Math.max(er.top + 8, er.bottom - 48));
    const left = Math.min(Math.max(r.left, er.left + 8), Math.max(er.left + 8, er.right - 8));
    return new DOMRect(left, top, r.width, r.height);
  }, [getAnchorRect, keepInView]);
  const { refs, style, update } = useVirtualFloating({
    open,
    getBoundingClientRect: anchorFn,
    strategy: "fixed",
    placement,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });
  const [outOfView, setOutOfView] = useState(false);
  // 사용자가 핸들로 옮긴 오프셋 — 앵커 위치 위에 더해짐 (드래그 중 라이브)
  const [drag, setDrag] = useState({ dx: 0, dy: 0 });
  const dragRef = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  // 핸들로 명시적으로 옮기면 그 화면 위치에 고정(pin) — 이후 앵커/스크롤 추적 중단. 닫힐 때 초기화.
  const [pinned, setPinned] = useState<{ top: number; left: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!open) { setDrag({ dx: 0, dy: 0 }); setPinned(null); } }, [open]);
  // 앵커 대상 인스턴스가 바뀌면(같은 타입 다른 블록으로 이동) drag-pin/오프셋을 무효화 →
  // 아래 rAF 추적이 다시 활성화되어 새 대상에 재앵커된다. 같은 인스턴스면 anchorKey 가 그대로라 pin 유지.
  useEffect(() => { setDrag({ dx: 0, dy: 0 }); setPinned(null); }, [anchorKey]);

  // 앵커를 매 프레임 추적 — 앵커 rect 가 바뀔 때만 재계산(update).
  // 스크롤/리사이즈뿐 아니라 "레이아웃 변화"(예: 캡션 추가로 rect 확장, 비디오 metadata 로드로
  // 크기 변경)도 잡아서 바 위치를 즉시 옮긴다. 이벤트 리스너만으론 이런 변화를 놓쳐서 stale 됐음.
  useEffect(() => {
    if (!open || pinned) return; // pinned 이면 앵커 추적 중단(고정 위치 유지)
    let rafId = 0;
    let lastKey = "";
    const loop = () => {
      const r = anchorFn();
      const key = `${Math.round(r.top)}|${Math.round(r.left)}|${Math.round(r.width)}|${Math.round(r.height)}`;
      if (key !== lastKey) {
        lastKey = key;
        update?.();
        // keepInView 는 항상 보여야 하므로 "영역 밖 숨김"을 적용하지 않는다.
        if (!keepInView) {
          const editEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
          const er = editEl?.getBoundingClientRect();
          if (er) setOutOfView(r.bottom <= er.top || r.top >= er.bottom);
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [open, anchorFn, update, pinned, keepInView]);

  if (!open || (outOfView && !pinned)) return null;

  const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, dx: drag.dx, dy: drag.dy };
  };
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = dragRef.current;
    if (!s) return;
    setDrag({ dx: s.dx + (e.clientX - s.x), dy: s.dy + (e.clientY - s.y) });
  };
  const onUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragRef.current;
    if (!start) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
    // 실제로 옮겼으면(2px 초과) 현재 화면 위치에 고정 — 이후 앵커/스크롤 추적 중단
    if (Math.abs(e.clientX - start.x) > 2 || Math.abs(e.clientY - start.y) > 2) {
      const r = frameRef.current?.getBoundingClientRect();
      if (r) setPinned({ top: r.top, left: r.left });
    }
    setDrag({ dx: 0, dy: 0 }); // 라이브 오프셋 초기화 (pin 위치에 반영됨 / 미세 드래그 잔여 제거)
  };

  // 메인 툴바 아래로 clamp — 바가 스크롤로 위로 올라가도 상단 툴바를 가리지 않게(툴바 바로 아래에 붙음).
  const toolbarBottom = (() => {
    if (typeof document === "undefined") return 0;
    const tb = document.querySelector("[data-editor-toolbar]");
    return tb ? tb.getBoundingClientRect().bottom : 0;
  })();
  const floatStyle: React.CSSProperties = pinned
    ? { position: "fixed", top: pinned.top, left: pinned.left, zIndex: "var(--z-dropdown)" }
    : {
        ...style,
        top: typeof style.top === "number" ? Math.max(style.top, toolbarBottom + 8) : style.top,
        zIndex: "var(--z-dropdown)",
      };

  const node = (
    // 바깥: 앵커 위치(스크롤 추적) 또는 고정(pin) 위치 / 프레임: 드래그 오프셋 + glass 외형 / 컨텐츠: 버튼들
    // eslint-disable-next-line react-hooks/refs
    <div ref={refs.setFloating} style={floatStyle}>
      <div
        ref={frameRef}
        className={`${styles.floatingBarFrame}${inline ? ` ${styles.floatingBarFrameInline}` : ""}`}
        style={drag.dx || drag.dy ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
      >
        <button
          type="button"
          className={styles.floatingBarHandle}
          data-cursor="grab"
          aria-label="move toolbar"
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <GripVertical size={13} />
        </button>
        <div
          className={`${styles.floatingBar}${inline ? ` ${styles.floatingBarInline}` : ""}`}
          onFocusCapture={onFocusCapture}
          onBlurCapture={onBlurCapture}
          onMouseDown={(e) => e.preventDefault()}
        >
          {children}
        </div>
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(node, document.body) : null;
}
