"use client";

import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import css from "../AboutStudio.module.css";
import { useL } from "./primitives";
import { GripVertical, X } from "@/components/icons";
import Button from "@/components/ui/Button";

/* About 편집 블록이 목록을 다루는 공통 방식 — 추가는 목록 끝, 삭제는 항목의 ×, 순서는 손잡이를 끌어서.
   항목의 손잡이와 ×는 오른쪽 위 도구 묶음(.itemTools)에 둔다. 마우스를 올리거나 키보드로 항목에
   들어가면 보이고, 올리는 동작이 없는 터치 기기에서는 늘 보인다. */

/**
 * 끌어서 순서를 바꾸는 목록. 손잡이로만 끈다 — 칸 전체를 잡게 하면 글자 선택·입력과 부딪힌다.
 * 자리가 곧 id 다. 끌어 놓는 순간에만 쓰이므로 인덱스로 충분하다.
 * 키보드는 손잡이에서 스페이스로 집고 방향키로 옮긴다.
 */
export function SortableList({ count, onMove, layout = "grid", onDragStart, onDragEnd, children }: {
  count: number;
  onMove: (from: number, to: number) => void;
  /** grid 는 여러 열(칸 크기가 달라도 된다), list 는 한 줄씩 */
  layout?: "grid" | "list";
  onDragStart?: () => void;
  /** 놓거나 취소했을 때 */
  onDragEnd?: () => void;
  children: ReactNode;
}) {
  const ids = Array.from({ length: count }, (_, i) => String(i));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const end = ({ active, over }: DragEndEvent) => {
    onDragEnd?.();
    if (over && active.id !== over.id) onMove(Number(active.id), Number(over.id));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={pointerFirst}
      onDragStart={onDragStart} onDragEnd={end} onDragCancel={onDragEnd}>
      <SortableContext items={ids} strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/* 놓을 자리는 포인터가 올라가 있는 칸이다. 칸 중심끼리 가장 가까운 곳(closestCenter)을 고르면,
   손잡이가 칸 모서리에 있어서 큰 칸을 끌 때 칸 중심이 손보다 한참 떨어져 엉뚱한 칸에 놓였다
   (Key Features 에서 오른쪽 칸을 노렸는데 한 줄 아래 칸으로 감). 포인터가 칸 사이에 있거나
   키보드로 옮길 때는 중심 거리로 고른다. */
const pointerFirst: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : closestCenter(args);
};

export type SortHandle = HTMLAttributes<HTMLElement>;

/** 목록의 항목 하나. ref·style 은 항목 뿌리에, handle 은 손잡이에 붙인다. */
export function useSortableItem(index: number) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(index) });
  /* Translate — 칸 크기가 서로 달라도 늘리거나 줄이지 않고 옮기기만 한다 */
  const style: CSSProperties = { transform: DndCSS.Translate.toString(transform), transition, zIndex: isDragging ? 2 : undefined };
  return { ref: setNodeRef, style, isDragging, handle: { ...attributes, ...listeners } as SortHandle };
}

/** map 안에서 바로 쓰는 항목 — 항목마다 컴포넌트를 떼지 않고 useSortableItem 결과를 넘겨받는다 */
export function SortableItem({ index, children }: { index: number; children: (item: ReturnType<typeof useSortableItem>) => ReactNode }) {
  const item = useSortableItem(index);
  return <>{children(item)}</>;
}

/** 격자 항목의 손잡이. 이미지 위에 놓이는 항목은 variant="difference" */
export function DragHandle({ handle, variant = "subtle" }: { handle: SortHandle; variant?: "subtle" | "difference" }) {
  const L = useL();
  const label = L("끌어서 순서 변경", "Drag to reorder");
  return (
    <Button variant={variant} shape="circle" size="xs" className={css.dragHandle} aria-label={label} title={label} data-cursor="grab" {...handle}>
      <GripVertical size={13} />
    </Button>
  );
}

export function RemoveButton({ onClick, variant = "subtle" }: { onClick: () => void; variant?: "subtle" | "difference" }) {
  const L = useL();
  return (
    <Button variant={variant} shape="circle" size="xs" onClick={onClick} aria-label={L("삭제", "Remove")}>
      <X size={13} />
    </Button>
  );
}

/** 한도에 닿으면 추가 단추 대신 보인다. 단추가 말없이 사라지면 왜 더 못 넣는지 알 수 없다. */
export function ListLimit({ max }: { max: number }) {
  const L = useL();
  return <p className={css.listLimit}>{L(`최대 ${max}개까지 넣을 수 있습니다.`, `You can add up to ${max}.`)}</p>;
}
