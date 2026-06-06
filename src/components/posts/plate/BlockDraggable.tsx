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
  const { dropLine } = useDropLine({ id: (element as { id?: string }).id, orientation: "horizontal" });

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
      {(dropLine === "top" || dropLine === "bottom") && (
        <div
          contentEditable={false}
          className={`${styles.blockDropLine} ${dropLine === "top" ? styles.blockDropLineTop : styles.blockDropLineBottom}`}
        />
      )}
    </div>
  );
}
