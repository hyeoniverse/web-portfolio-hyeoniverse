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

  // 드래그 시작 시 원본 블록 DOM 을 복제해 ghost 컨테이너에 주입 (React 바깥에서 직접 DOM 조작).
  // 그룹 드래그(indent 자식 포함)면 item.id = [부모,...자식] → 전부 클론해 쌓아 그룹째 들리는 것처럼 보이게.
  React.useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.replaceChildren();
    container.style.width = "";
    if (!isDragging || !el) return;
    try {
      const groupIds: any[] = Array.isArray(item?.id) && item.id.length > 1 ? item.id : [];
      const nodes: any[] = groupIds.length
        ? groupIds.map((gid) => editor.api.node({ id: gid, at: [] })?.[0]).filter(Boolean)
        : [el];
      let maxW = 0;
      for (const node of nodes) {
        const dom = editor.api.toDOMNode(node as any) as HTMLElement | null;
        if (!dom) continue;
        // toDOMNode 는 슬레이트 노드(예: 코드블록 <pre>)만 반환 → mermaid 미리보기처럼 형제로 렌더되는
        // 부가 요소가 빠진다. 블록 전체 래퍼(.blockDraggable)를 클론하고 드래그 chrome(거터/드롭라인)만 제거.
        const source = (dom.closest(`.${styles.blockDraggable}`) as HTMLElement | null) ?? dom;
        const w = source.getBoundingClientRect().width;
        if (w > maxW) maxW = w;
        const clone = source.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(`.${styles.blockDragGutter}, .${styles.blockDropLine}`).forEach((n) => n.remove());
        // ghost 는 그룹 컨테이너 배경(.blockDragLayerGroup) 한 겹만 — 클론된 블록/내부 블록에서
        // 선택·드래그·컬럼 tint 를 전부 걷어낸다(안쪽 블록에 개별 배경/tint 가 겹쳐 보이지 않게).
        const strip = (elm: Element) => {
          elm.classList.remove(styles.blockDragging, styles.blockDraggableActive, styles.colElementActive);
          elm.removeAttribute("data-block-selected");
          elm.removeAttribute("data-group-parent");
          elm.removeAttribute("data-sel-merge-up");
          elm.removeAttribute("data-sel-merge-down");
        };
        strip(clone);
        clone.querySelectorAll("*").forEach(strip);
        clone.querySelectorAll(`.${styles.colElement}`).forEach((c) => ((c as HTMLElement).style.boxShadow = "none"));
        clone.style.opacity = "";
        clone.style.margin = "0";
        clone.removeAttribute("contenteditable");
        container.appendChild(clone);
      }
      if (maxW) container.style.width = `${Math.min(maxW, 440)}px`;
    } catch { /* noop */ }
  }, [isDragging, el, item, editor]);

  if (!isDragging || !offset || !el) return null;

  // 묶인 블록(indent 그룹) 드래그면 클론들을 하나의 배경으로 감싼다.
  const isGroup = Array.isArray(item?.id) && item.id.length > 1;
  // 열블록이면 컨테이너에 직접 tint 오버레이(그룹 기준 오버레이는 ghost 폭에서 오른쪽이 잘림).
  const isColumn = (el as { type?: string })?.type === "column_group";

  return createPortal(
    <div
      ref={ref}
      className={`${styles.blockDragLayer}${isGroup ? ` ${styles.blockDragLayerGroup}` : ""}${isColumn ? ` ${styles.blockDragLayerColumn}` : ""}`}
      style={{ transform: `translate(${offset.x + 12}px, ${offset.y + 8}px)` }}
      aria-hidden
    />,
    document.body,
  );
}
