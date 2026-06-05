"use client";

import { useState, type DragEvent } from "react";

type DropPos = { idx: number; side: "left" | "right" } | null;

/**
 * Chip 리스트의 drag/drop 상태 + index math 공통화.
 * - 커서 X 좌표 기준 hover 중인 chip 의 left/right 판정
 * - 막대 인디케이터는 dropSide 로 표시
 * - drop 시 정확한 삽입 인덱스 계산 (dragIdx 가 to 보다 앞이면 -1 보정)
 *
 * 사용:
 *   const { itemProps } = useChipReorder((from, to) => reorder(from, to));
 *   ...
 *   {items.map((it, i) => {
 *     const { dragging, dropSide, ...handlers } = itemProps(i);
 *     return <Chip dragging={dragging} dropSide={dropSide} dragHandlers={{ draggable: true, ...handlers }} ... />;
 *   })}
 */
export function useChipReorder(onReorder: (from: number, to: number) => void) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropPos, setDropPos] = useState<DropPos>(null);

  const reset = () => {
    setDragIdx(null);
    setDropPos(null);
  };

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
      if (dragIdx < to) to -= 1;
      if (to !== dragIdx) onReorder(dragIdx, to);
      reset();
    },
    onDragEnd: () => reset(),
  });

  return { itemProps };
}
