"use client";

import { useState, type CSSProperties } from "react";
import { DndContext, KeyboardCode, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import css from "../AboutStudio.module.css";
import { ListLimit } from "./listControls";
import { useL } from "./primitives";
import { ChevronLeft, ChevronRight, Plus } from "@/components/icons";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";

/**
 * 한 번에 한 항목씩 편집하는 목록의 상태 — Backend·User Flow·Design System·Code Highlights·
 * Design Decisions 가 쓴다. 다섯 블록이 같은 탭 상태·추가·삭제·선택을 각자 들고 있었다.
 *
 * 새 항목은 초안으로만 들고 있다가 처음 고칠 때 목록에 넣는다. 예전에는 추가하는 순간 빈 항목을
 * 목록에 넣고, 입력 없이 떠나면 지웠다. 떠났는지를 포커스로 판단해서, 스테이지 안에서 연 팝오버
 * (body 에 따로 그려진다) 안을 누르면 떠난 것으로 보고 지웠다. 새 Design System 컨셉에 배경
 * 이미지부터 고르려 하면 컨셉이 사라졌다. 초안은 목록 밖에 있으니 떠났는지 볼 필요가 없고,
 * 손대지 않은 초안은 저장값에 들어가지 않는다.
 */
export function useStageList<T extends object>(value: T[], onChange: (v: T[]) => void, make: () => T) {
  const [tab, setTab] = useState(0);
  const [draft, setDraft] = useState<T | null>(null);
  const items = draft ? [...value, draft] : value;
  const cur = Math.min(tab, Math.max(0, items.length - 1));
  const isDraft = draft !== null && cur === value.length;

  return {
    items,
    cur,
    it: items[cur],
    /** 지금 보는 항목이 아직 목록에 넣지 않은 초안인지 */
    isDraft,
    hasDraft: draft !== null,
    /** 지금 항목을 고친다. 초안이면 이때 목록 끝에 넣는다. */
    set: (p: Partial<T>) => {
      if (isDraft) {
        onChange([...value, { ...draft, ...p }]);
        setDraft(null);
        return;
      }
      onChange(value.map((x, i) => (i === cur ? { ...x, ...p } : x)));
    },
    add: () => {
      if (!draft) setDraft(make());
      setTab(value.length);
    },
    remove: () => {
      if (isDraft) setDraft(null);
      else onChange(value.filter((_, i) => i !== cur));
      setTab(Math.max(0, cur - 1));
    },
    /** 다른 항목으로 옮긴다. 손대지 않은 초안은 이때 버린다. */
    select: (next: number) => {
      if (isDraft && next !== cur) setDraft(null);
      setTab(next);
    },
    /** from 자리의 항목을 to 로 옮긴다. 보던 항목을 계속 보도록 지금 자리도 따라 옮긴다. */
    move: (from: number, to: number) => {
      onChange(arrayMove(value, from, to));
      setTab(cur === from ? to : from < cur && cur <= to ? cur - 1 : to <= cur && cur < from ? cur + 1 : cur);
    },
  };
}

export type StageList<T extends object> = ReturnType<typeof useStageList<T>>;

const stepNo = (i: number) => String(i + 1).padStart(2, "0");

/* 스테이지 전환 스트립 — 번호, 좌우 이동, 지금 항목 이름, 추가. 실제 패널의 dotNav 를 닮았다.
   번호를 끌어 순서를 바꾼다. 마우스는 5px 움직이면, 터치는 0.25초 누르고 있으면 집는다(바로 떼면
   그 항목으로 간다). 키보드는 스페이스로 집고 방향키로 옮긴다. Enter 는 그 항목을 여는 데 남겨 둔다.
   번호는 줄이 모자라면 다음 줄로 내려간다. 예전에는 한 줄로 고정해, 모바일에서 뒤쪽 번호와 다음·추가
   단추가 화면 밖으로 나가 잘렸다(main 이 가로 넘침을 clip 한다). */
export function StageTabs({ list, labelOf, addLabel, max }: {
  list: Pick<StageList<object>, "items" | "cur" | "hasDraft" | "select" | "move" | "add">;
  labelOf: (i: number) => string;
  addLabel: string;
  max: number;
}) {
  const L = useL();
  const { cur, select } = list;
  const count = list.items.length;
  /* 자리가 곧 id — 끌어 놓는 순간에만 쓰이므로 인덱스로 충분하다. 초안은 목록 밖이라 끌 수 없다. */
  const ids = Array.from({ length: count - (list.hasDraft ? 1 : 0) }, (_, i) => String(i));
  const atMax = ids.length >= max;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: [KeyboardCode.Space], cancel: [KeyboardCode.Esc], end: [KeyboardCode.Space, KeyboardCode.Enter, KeyboardCode.Tab] },
    }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) list.move(Number(active.id), Number(over.id));
  };

  return (
    <div className={css.stageTabs}>
      <div className={css.stageNav}>
        <Button className={css.stageArrow} variant="subtle" shape="circle" size="xs" aria-label={L("이전", "Previous")}
          disabled={cur <= 0} onClick={() => select(cur - 1)}>
          <ChevronLeft size={14} />
        </Button>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className={css.stageDots}>
              {ids.map((id, i) => (
                <StageDot key={id} id={id} index={i} active={i === cur} label={labelOf(i)} onSelect={select} />
              ))}
              {list.hasDraft && (
                <Pressable title={labelOf(count - 1)} aria-current={cur === count - 1 ? "true" : undefined}
                  className={`${css.stageDot} ${css.stageDotDraft} ${cur === count - 1 ? css.stageDotOn : ""}`}
                  onClick={() => select(count - 1)}>
                  {stepNo(count - 1)}
                </Pressable>
              )}
            </div>
          </SortableContext>
        </DndContext>
        <Button className={css.stageArrow} variant="subtle" shape="circle" size="xs" aria-label={L("다음", "Next")}
          disabled={cur >= count - 1} onClick={() => select(cur + 1)}>
          <ChevronRight size={14} />
        </Button>
      </div>
      <span className={css.stageTabLabel} title={labelOf(cur)}>{labelOf(cur)}</span>
      <div className={css.stageAdd}>
        {atMax ? <ListLimit max={max} /> : (
          <Button variant="subtle" size="xs" icon={<Plus size={14} />} onClick={list.add}>{addLabel}</Button>
        )}
      </div>
    </div>
  );
}

function StageDot({ id, index, active, label, onSelect }: {
  id: string; index: number; active: boolean; label: string; onSelect: (i: number) => void;
}) {
  const L = useL();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: DndCSS.Translate.toString(transform), transition };
  return (
    <Pressable ref={setNodeRef} style={style}
      className={`${css.stageDot} ${active ? css.stageDotOn : ""} ${isDragging ? css.stageDotDragging : ""}`}
      title={`${label} · ${L("끌어서 순서 변경", "Drag to reorder")}`}
      aria-current={active ? "true" : undefined}
      onClick={() => onSelect(index)} {...attributes} {...listeners}>
      {stepNo(index)}
    </Pressable>
  );
}
