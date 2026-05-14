"use client";

import { useState, type DragEvent } from "react";
import { GripVertical } from "lucide-react";
import styles from "./DraggableTag.module.css";

/* --------------------------------------------------------------------------
   useTagDrag — DraggableTag 리스트의 drag/drop 상태 + index math 공통화.
   - 커서 X 좌표 기준으로 hover 중인 tag 의 left/right 판정
   - 막대 인디케이터는 dropSide 로 표시
   - drop 시 정확한 삽입 인덱스 계산 (dragIdx 가 to 보다 앞이면 -1)
   -------------------------------------------------------------------------- */

type DropPos = { idx: number; side: "left" | "right" } | null;

export function useTagDrag(onReorder: (from: number, to: number) => void) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropPos, setDropPos] = useState<DropPos>(null);

  const reset = () => {
    setDragIdx(null);
    setDropPos(null);
  };

  /** index i 의 DraggableTag 에 spread 할 props */
  const itemProps = (i: number) => ({
    dragging: dragIdx === i,
    dropSide:
      dragIdx !== null && dragIdx !== i && dropPos?.idx === i
        ? dropPos.side
        : null,
    onDragStart: () => setDragIdx(i),
    onDragOver: (e: DragEvent<HTMLSpanElement>) => {
      if (dragIdx === null) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      setDropPos({ idx: i, side: e.clientX < mid ? "left" : "right" });
    },
    onDrop: (e: DragEvent<HTMLSpanElement>) => {
      e.preventDefault();
      if (dragIdx === null || dropPos === null) {
        reset();
        return;
      }
      let to = dropPos.idx + (dropPos.side === "right" ? 1 : 0);
      // 끌어낸 자리가 to 보다 앞이면 splice 로 한 칸 당겨지므로 보정
      if (dragIdx < to) to -= 1;
      if (to !== dragIdx) onReorder(dragIdx, to);
      reset();
    },
    onDragEnd: () => reset(),
  });

  return { itemProps };
}

/* -------------------------------------------------------------------------- */

interface DraggableTagProps {
  label: string;
  index?: number;
  dragging: boolean;
  /** 막대 인디케이터 위치 — "left": 이 태그 앞에 삽입, "right": 뒤에 삽입 */
  dropSide: "left" | "right" | null;
  onDragStart: () => void;
  onDragOver: (e: DragEvent<HTMLSpanElement>) => void;
  onDrop: (e: DragEvent<HTMLSpanElement>) => void;
  onDragEnd: () => void;
  onRemove: () => void;
}

export default function DraggableTag({
  label,
  dragging,
  dropSide,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
}: DraggableTagProps) {
  return (
    <span
      className={`${styles.tag} ${dragging ? styles.dragging : ""} ${
        dropSide === "left" ? styles.dropBefore : ""
      } ${dropSide === "right" ? styles.dropAfter : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <GripVertical className={styles.grip} size={10} strokeWidth={2.5} />
      {label}
      <button type="button" className={styles.remove} onClick={onRemove}>
        &times;
      </button>
    </span>
  );
}
