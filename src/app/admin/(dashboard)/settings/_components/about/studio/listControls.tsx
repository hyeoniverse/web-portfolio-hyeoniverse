"use client";

import { useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type KeyboardCoordinateGetter } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import css from "../AboutStudio.module.css";
import { useL } from "./primitives";
import { GripVertical, Plus, X } from "@/components/icons";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Pressable from "@/components/ui/Pressable";

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
  /** grid 는 여러 열(칸 크기가 달라도 된다), list 는 한 줄씩, flow 는 칩처럼 줄을 넘겨 흐르는 목록 */
  layout?: "grid" | "list" | "flow";
  onDragStart?: () => void;
  /** 놓거나 취소했을 때 */
  onDragEnd?: () => void;
  children: ReactNode;
}) {
  const ids = Array.from({ length: count }, (_, i) => String(i));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: layout === "flow" ? sequentialCoordinates : sortableKeyboardCoordinates }),
  );
  const end = ({ active, over }: DragEndEvent) => {
    onDragEnd?.();
    if (over && active.id !== over.id) onMove(Number(active.id), Number(over.id));
  };
  /* 화면 읽기용 안내(dnd-kit 가 그리는 숨은 div 두 개)는 body 에 둔다. 제자리에 그리면 ERD 표(<table>)나
     Credits 문장(<p>) 안에 div 가 들어가 구조가 어긋나고, 표의 tbody:last-child 규칙도 빗나갔다.
     서버에는 document 가 없는데, dnd-kit 도 이 안내를 마운트 뒤에만 그리므로 첫 렌더는 같다. */
  const accessibility = typeof document === "undefined" ? undefined : { container: document.body };
  return (
    <DndContext sensors={sensors} collisionDetection={pointerFirst} accessibility={accessibility}
      onDragStart={onDragStart} onDragEnd={end} onDragCancel={onDragEnd}>
      <SortableContext items={ids} strategy={layout === "list" ? verticalListSortingStrategy : rectSortingStrategy}>
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

/* 칩처럼 줄을 넘겨 흐르는 목록은 방향키를 공간이 아니라 순서로 읽는다 — ←·↑ 는 앞 칩, →·↓ 는 뒤 칩.
   기본 좌표(sortableKeyboardCoordinates)는 공간 기준이라, 여러 줄로 접힌 칩에서 ← 를 누르면 바로 앞 칩이
   아니라 윗줄의 더 가까운 칩 자리로 갔다. 잡은 칩의 중심을 대상 칩의 중심에 맞춰, 폭이 달라도
   중심 거리로 대상 칩이 골라지게 한다. */
const STEP: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
const sequentialCoordinates: KeyboardCoordinateGetter = (event, { context: { active, over, droppableRects, collisionRect } }) => {
  const step = STEP[event.code];
  if (!step || !active || !collisionRect) return undefined;
  event.preventDefault();
  const target = droppableRects.get(String(Number((over ?? active).id) + step));
  if (!target) return undefined;
  return {
    x: target.left + (target.width - collisionRect.width) / 2,
    y: target.top + (target.height - collisionRect.height) / 2,
  };
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

export function RemoveButton({ onClick, variant = "subtle", label }: {
  onClick: () => void; variant?: "subtle" | "difference";
  /** 무엇을 지우는지까지 말할 때 — "엔드포인트 삭제". 없으면 "삭제" */
  label?: string;
}) {
  const L = useL();
  return (
    <Button variant={variant} shape="circle" size="xs" onClick={onClick} aria-label={label ?? L("삭제", "Remove")}>
      <X size={13} />
    </Button>
  );
}

/** 한도에 닿으면 추가 단추 대신 보인다. 단추가 말없이 사라지면 왜 더 못 넣는지 알 수 없다. */
export function ListLimit({ max }: { max: number }) {
  const L = useL();
  return <p className={css.listLimit}>{L(`최대 ${max}개까지 넣을 수 있습니다.`, `You can add up to ${max}.`)}</p>;
}

/**
 * 글자 칩 목록 — Credits 이름, Design Decisions 태그, Overview 하이라이트가 쓴다.
 * 칩은 손잡이(끌어서 순서) · 글자(누르면 그 자리에서 고친다) · ×(삭제)이고, 끝의 "+ 무엇 추가" 캡슐은
 * 누르면 그 자리에서 입력 칸이 된다. Enter 나 바깥을 누르면 넣고, Esc 는 그만둔다. 비워서 넣으면
 * 고치던 칩은 지워지고 새 칩은 생기지 않는다.
 * 한도에 닿으면 추가 캡슐이 사라진다. 한도 안내(ListLimit)는 부르는 쪽이 둔다. Credits 는 이름이
 * 문장(<p>) 안에 이어 붙어서 안내를 그 밖에 둬야 한다.
 */
export function ChipList({ items, onChange, addLabel, itemLabel, max, chipClassName, addClassName }: {
  items: string[];
  onChange: (v: string[]) => void;
  /** 추가 캡슐 글자 — "이름 추가" */
  addLabel: string;
  /** 칩 하나를 부르는 이름 — 입력 칸의 이름에 쓴다("이름") */
  itemLabel: string;
  max?: number;
  /** 칩·입력 칸 모양 — 블록마다 실제 화면의 태그처럼 보이게 */
  chipClassName?: string;
  /** 추가 캡슐 모양 */
  addClassName?: string;
}) {
  const L = useL();
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const atMax = max !== undefined && items.length >= max;
  const dragLabel = L("끌어서 순서 변경", "Drag to reorder");

  const commitEdit = (i: number, raw: string) => {
    const v = raw.trim();
    setEditing(null);
    if (v === items[i]) return;
    onChange(v ? items.map((x, j) => (j === i ? v : x)) : items.filter((_, j) => j !== i));
  };
  const commitAdd = (raw: string) => {
    const v = raw.trim();
    setAdding(false);
    if (v && !items.includes(v)) onChange([...items, v]);
  };
  /* 한글 조합 중 Enter 는 글자를 확정하는 키라 넘긴다 */
  const onKey = (e: KeyboardEvent<HTMLInputElement>, cancel: () => void) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
    if (e.key === "Escape") cancel();
  };

  return (
    <>
      <SortableList layout="flow" count={items.length} onMove={(from, to) => onChange(arrayMove(items, from, to))}>
        {items.map((v, i) => (editing === i ? (
          <input key={i} className={`${css.chipInput} ${chipClassName ?? ""}`} autoFocus defaultValue={v}
            aria-label={L(`${itemLabel} 고치기`, `Edit ${itemLabel}`)}
            onBlur={(e) => commitEdit(i, e.target.value)}
            onKeyDown={(e) => onKey(e, () => setEditing(null))} />
        ) : (
          <SortableItem key={i} index={i}>{(row) => (
            <span ref={row.ref} style={row.style} className={css.chipSlot}>
              <Chip className={chipClassName} showHandle
                handleProps={{ ...row.handle, "aria-label": dragLabel, title: dragLabel }}
                onClick={() => setEditing(i)}
                onRemove={() => onChange(items.filter((_, j) => j !== i))}>
                {v}
              </Chip>
            </span>
          )}</SortableItem>
        )))}
      </SortableList>
      {!atMax && (
        <span className={`${css.chipAdd} ${adding ? css.chipAddOpen : ""} ${addClassName ?? ""}`}>
          {adding ? (
            <input className={css.chipAddInput} autoFocus aria-label={L(`추가할 ${itemLabel}`, `New ${itemLabel}`)}
              onBlur={(e) => commitAdd(e.target.value)}
              onKeyDown={(e) => onKey(e, () => setAdding(false))} />
          ) : (
            <Pressable className={css.chipAddBtn} onClick={() => setAdding(true)}>
              <Plus size={13} aria-hidden /> {addLabel}
            </Pressable>
          )}
        </span>
      )}
    </>
  );
}
