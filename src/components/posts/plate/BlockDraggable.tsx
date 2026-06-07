"use client";

import * as React from "react";
import { useDraggable, useDropLine } from "@platejs/dnd";
import type { TElement } from "platejs";
import type { RenderNodeWrapperProps, RenderNodeWrapperFunction } from "platejs/react";
import { GripVertical } from "lucide-react";
import styles from "../RichTextEditor.module.css";

// 공식 @platejs/dnd 기반 블록 드래그 래퍼 (aboveNodes 로 각 블록에 적용).
// 최상위 블록만 핸들 부여 — 표/컬럼/코드라인 내부 등은 제외.
const NON_DRAGGABLE = new Set(["tr", "td", "th", "column", "column_group", "code_line", "column-item"]);

export const BlockDraggable = (props: RenderNodeWrapperProps): RenderNodeWrapperFunction => {
  const { editor, element } = props;
  let path: number[] | null = null;
  try {
    const p = editor.api.findPath(element);
    path = p ? Array.from(p) : null;
  } catch {
    /* path 일시 무효 */
  }
  const type = (element as { type?: string }).type ?? "";
  const enabled = !!path && path.length === 1 && !NON_DRAGGABLE.has(type);
  if (!enabled) return undefined;

  return function DraggableWrapper(elementProps) {
    return <DraggableBlock element={element}>{elementProps.children}</DraggableBlock>;
  };
};

function DraggableBlock({ element, children }: { element: TElement; children: React.ReactNode }) {
  const { isDragging, nodeRef, handleRef } = useDraggable({ element });
  // 공식 BlockDraggable 과 동일하게 인자 없이 호출 — 현재 drop target 위치(top/bottom)를 컨텍스트로 받음.
  // (id/orientation 을 넘기면 매칭이 어긋나 dropLine 이 안 잡혀 indicator 가 안 보였음)
  const { dropLine } = useDropLine();

  return (
    <div ref={nodeRef} className={styles.blockDraggable} style={isDragging ? { opacity: 0.5 } : undefined}>
      <div className={styles.blockDragGutter} contentEditable={false}>
        <button
          type="button"
          ref={handleRef as unknown as React.Ref<HTMLButtonElement>}
          className={styles.blockDragHandleBtn}
          aria-label="Drag to move"
          data-no-drag
        >
          <GripVertical size={14} />
        </button>
      </div>
      {children}
      {dropLine && (
        <div
          contentEditable={false}
          className={`${styles.blockDropLine} ${dropLine === "bottom" ? styles.blockDropLineBottom : styles.blockDropLineTop}`}
        />
      )}
    </div>
  );
}
