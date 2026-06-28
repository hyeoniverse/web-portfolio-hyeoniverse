"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useDragLayer } from "react-dnd";
import { useEditorRef } from "platejs/react";
import { _dndScrollContainer } from "./utils";
import styles from "../RichTextEditor.module.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 블록 드래그 커스텀 ghost — 드래그 중인 블록의 **실제 DOM 을 복제**해 커서 옆에 그대로 띄운다.
 * (텍스트면 텍스트, 이미지면 이미지 등 그대로). 네이티브 HTML5 drag image(불안정·빈 이미지)를
 * disable 하고 이걸로 대체 → 모든 블록이 동일하게 "그대로 ghost". (DndProvider 안에서 렌더)
 */
export function BlockDragLayer() {
  const editor = useEditorRef();
  const ref = React.useRef<HTMLDivElement>(null);
  const { item, offset, isDragging } = useDragLayer((monitor) => ({
    item: monitor.getItem() as any,
    offset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  const el = item?.element;

  // 커서 좌표를 ref 로 유지 (rAF 스크롤 루프가 최신값 참조)
  const offsetRef = React.useRef(offset);
  offsetRef.current = offset;

  // 자동 스크롤 — 커서가 에디터 경계 근처/바깥이면 그 방향으로 에디터 컨테이너를 연속 스크롤.
  // (빌트인 스크롤러는 edge 안쪽 좁은 밴드에서만 동작해 바깥으로 나가면 멈춤 → 직접 처리)
  React.useEffect(() => {
    if (!isDragging) return;
    let raf = 0;
    const EDGE = 72; // 경계에서 이 거리부터 스크롤 시작
    const MAX = 22; // 프레임당 최대 px
    const tick = () => {
      const o = offsetRef.current;
      const container = _dndScrollContainer.current;
      if (o && container) {
        const r = container.getBoundingClientRect();
        let dy = 0;
        if (o.y < r.top + EDGE) dy = -Math.min(MAX, ((r.top + EDGE - o.y) / EDGE) * MAX);
        else if (o.y > r.bottom - EDGE) dy = Math.min(MAX, ((o.y - (r.bottom - EDGE)) / EDGE) * MAX);
        if (dy !== 0) container.scrollBy(0, dy);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isDragging]);

  // 드래그 시작 시 원본 블록 DOM 을 복제해 ghost 컨테이너에 주입 (React 바깥에서 직접 DOM 조작)
  React.useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.replaceChildren();
    container.style.width = "";
    if (!isDragging || !el) return;
    try {
      const dom = editor.api.toDOMNode(el as any) as HTMLElement | null;
      if (!dom) return;
      // toDOMNode 는 슬레이트 노드(예: 코드블록 <pre>)만 반환 → mermaid 미리보기처럼 형제로 렌더되는
      // 부가 요소가 빠진다. 블록 전체 래퍼(.blockDraggable)를 클론하고 드래그 chrome(거터/드롭라인)만 제거.
      const source = (dom.closest(`.${styles.blockDraggable}`) as HTMLElement | null) ?? dom;
      const w = source.getBoundingClientRect().width;
      if (w) container.style.width = `${Math.min(w, 440)}px`;
      const clone = source.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(`.${styles.blockDragGutter}, .${styles.blockDropLine}`).forEach((n) => n.remove());
      clone.style.opacity = "";
      clone.style.margin = "0";
      clone.removeAttribute("contenteditable");
      container.appendChild(clone);
    } catch { /* noop */ }
  }, [isDragging, el, editor]);

  if (!isDragging || !offset || !el) return null;

  return createPortal(
    <div
      ref={ref}
      className={styles.blockDragLayer}
      style={{ transform: `translate(${offset.x + 12}px, ${offset.y + 8}px)` }}
      aria-hidden
    />,
    document.body,
  );
}
