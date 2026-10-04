"use client";

import { useRef, useState } from "react";
import type { SelectOption } from "@/types";
import { GripDotsIcon } from "@/components/icons";
import Checkbox from "@/components/ui/Checkbox";
import styles from "./PriorityList.module.css";

interface PriorityListProps<T extends string> {
  primary: T;
  priority: T[];
  excluded: T[];
  options: SelectOption<T>[];
  onChange: (next: T[]) => void;
  onExcludedChange: (next: T[]) => void;
  /** 항목 옆 작은 표시 — 키 없음·꺼짐처럼 이 순서에 넣어도 쓰이지 않을 공급자를 알린다 */
  badgeOf?: (value: T) => React.ReactNode;
  /** 기본 공급자를 1번으로 목록에 넣는다 — 1번이 곧 기본 공급자, 끌어 올리면 기본이 바뀐다.
   *  onChange 는 기본 공급자를 앞에 둔 전체 순서를 돌려준다(부모가 [0] 을 provider 로). 1번에는 빼기 칸이 없다 */
  includePrimary?: boolean;
  /** 상자 안 이름 자리에 대신 넣을 것 — 예: 모델 콤보박스(모델 이름이 곧 공급자라 이름을 두 번 쓰지 않는다). null 이면 이름 */
  innerOf?: (value: T) => React.ReactNode;
  /** 자동 전환이 꺼져 있다 — 1번(기본)만 보인다. 순서는 그대로 남아 켜면 돌아온다 */
  onlyPrimary?: boolean;
  /** 줄 아래 펼쳐지는 상세(공급자 상태의 원인 · 사용량) — 접힘은 안에서 처리하고 여기선 자리만 준다 */
  detailOf?: (value: T) => React.ReactNode;
}

export function PriorityList<T extends string>({ primary, priority, excluded, options, onChange, onExcludedChange, badgeOf, includePrimary, innerOf, onlyPrimary, detailOf }: PriorityListProps<T>) {
  const nonPrimary = options.filter((o) => o.value !== primary);
  const rest = priority.length
    ? [...priority.filter((p) => p !== primary), ...nonPrimary.map((o) => o.value).filter((v) => !priority.includes(v))]
    : nonPrimary.map((o) => o.value);
  const full = includePrimary ? [primary, ...rest] : rest;
  /* 자동 전환이 꺼져 있어도 뒤 항목은 그려 두고 접는다(높이 0) — 켜고 끌 때 펼쳐지고 접히는 움직임이 보인다 */
  const ordered = full;
  const collapsed = !!includePrimary && !!onlyPrimary;

  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  /* 끌고 있는 줄 — 제자리는 반투명(고스트), 끌림 이미지는 줄 전체 */
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  // 항목을 from → to 로 이동(splice). desktop drop / touch end 공용.
  const reorder = (from: number, to: number) => {
    const next = [...full];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  /* ── HTML5 drag (desktop) ── */
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragIdx.current = idx;
    setDraggingIdx(idx);
    const row = (e.currentTarget as HTMLElement).closest(`.${styles.priorityRow}`) as HTMLElement | null;
    if (row) {
      const rect = row.getBoundingClientRect();
      e.dataTransfer.setDragImage(row, e.clientX - rect.left, e.clientY - rect.top);
    }
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = (idx: number) => {
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    reorder(from, idx);
    dragIdx.current = null;
    setOverIdx(null);
    setDraggingIdx(null);
  };
  const handleDragEnd = () => { dragIdx.current = null; setOverIdx(null); setDraggingIdx(null); };

  /* ── Touch drag (mobile) ── */
  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    dragIdx.current = idx;
    setDraggingIdx(idx);
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragIdx.current === null || !listRef.current) return;
    const y = e.touches[0].clientY;
    const items = listRef.current.querySelectorAll<HTMLElement>(`.${styles.priorityItem}`);
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        setOverIdx(i);
        return;
      }
    }
  };

  const handleTouchEnd = () => {
    if (dragIdx.current !== null && overIdx !== null && dragIdx.current !== overIdx) {
      reorder(dragIdx.current, overIdx);
    }
    dragIdx.current = null;
    setOverIdx(null);
    setDraggingIdx(null);
  };

  const renderRow = (val: T, idx: number) => {
        const label = options.find((o) => o.value === val)?.label ?? val;
        const isPrimary = includePrimary && idx === 0;
        const isEnabled = isPrimary || !excluded.includes(val);
        const detail = detailOf?.(val);
        return (
          <div key={val} className={styles.priorityEntry}>
          <div className={styles.priorityRow} data-dragging={draggingIdx === idx ? "" : undefined}>
            {/* 드래그 핸들 — 맨 앞. 모든 줄에서 끈다(기본 줄을 내리면 기본이 바뀐다) */}
            <span
              className={styles.priorityGrip}
              data-draggable
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, idx)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <GripDotsIcon />
            </span>
            {/* 1번(기본 공급자)은 뺄 수 없다 — 체크된 채 잠근다 */}
            <Checkbox
              shape="square"
              checked={isEnabled}
              disabled={isPrimary}
              onChange={(checked) => {
                if (isPrimary) return;
                onExcludedChange(
                  checked
                    ? excluded.filter((e) => e !== val)
                    : [...excluded, val]
                );
              }}
            />
            <div
              className={`${styles.priorityItem}${overIdx === idx ? ` ${styles.priorityItemOver}` : ""}`}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
            >
              <span className={styles.priorityBadge}>{idx + 1}</span>
              {(() => {
                const inner = innerOf?.(val);
                return inner ?? (
                  <span className={`${styles.priorityLabel} ${isEnabled ? "" : styles.priorityLabelDisabled}`}>{label}</span>
                );
              })()}
            </div>
            {/* 상자 밖 오른쪽 — 상태(꺼짐 · 키 없음 · 실패 중). 1번이 기본이라는 건 따로 적지 않는다 */}
            {badgeOf?.(val) ? <span className={styles.priorityAside}>{badgeOf(val)}</span> : null}
          </div>
          {detail ? <div className={styles.priorityDetail}>{detail}</div> : null}
          </div>
        );
  };

  return (
    <div className={styles.priorityList} ref={listRef}>
      {includePrimary ? (
        <>
          {renderRow(ordered[0], 0)}
          <div className={styles.priorityRest} data-open={collapsed ? undefined : ""} aria-hidden={collapsed || undefined}>
            <div className={styles.priorityRestInner} inert={collapsed || undefined}>
              {ordered.slice(1).map((val, i) => renderRow(val, i + 1))}
            </div>
          </div>
        </>
      ) : ordered.map(renderRow)}
    </div>
  );
}
