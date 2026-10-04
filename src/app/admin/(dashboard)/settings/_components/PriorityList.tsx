"use client";

import { useRef, useState } from "react";
import type { SelectOption } from "@/types";
import { ChevronUp, ChevronDown, GripDotsIcon } from "@/components/icons";
import Checkbox from "@/components/ui/Checkbox";
import styles from "./PriorityList.module.css";
import shared from "../Settings.module.css";
import Pressable from "@/components/ui/Pressable";

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
  /** includePrimary 일 때 1번 옆 글 — "기본" */
  primaryLabel?: string;
  /** 항목 줄 끝에 넣을 부가 칸(예: 그 공급자가 부를 모델 이름) */
  extraOf?: (value: T) => React.ReactNode;
  /** 자동 전환이 꺼져 있다 — 1번 뒤 항목을 흐리게(순서는 남겨 둔다) */
  dimRest?: boolean;
}

export function PriorityList<T extends string>({ primary, priority, excluded, options, onChange, onExcludedChange, badgeOf, includePrimary, primaryLabel, extraOf, dimRest }: PriorityListProps<T>) {
  const nonPrimary = options.filter((o) => o.value !== primary);
  const rest = priority.length
    ? [...priority.filter((p) => p !== primary), ...nonPrimary.map((o) => o.value).filter((v) => !priority.includes(v))]
    : nonPrimary.map((o) => o.value);
  const ordered = includePrimary ? [primary, ...rest] : rest;

  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  // 항목을 from → to 로 이동(splice). desktop drop / touch end 공용.
  const reorder = (from: number, to: number) => {
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  /* ── HTML5 drag (desktop) ── */
  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = (idx: number) => {
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    reorder(from, idx);
    dragIdx.current = null;
    setOverIdx(null);
  };
  const handleDragEnd = () => { dragIdx.current = null; setOverIdx(null); };

  /* ── Touch drag (mobile) ── */
  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    dragIdx.current = idx;
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
  };

  return (
    <div className={styles.priorityList} ref={listRef}>
      {ordered.map((val, idx) => {
        const label = options.find((o) => o.value === val)?.label ?? val;
        const isPrimary = includePrimary && idx === 0;
        const isEnabled = isPrimary || !excluded.includes(val);
        return (
          <div key={val} className={styles.priorityRow} data-dim={dimRest && !isPrimary ? "" : undefined}>
            {/* 1번(기본 공급자)은 뺄 수 없다 — 칸 자리만 둔다 */}
            {isPrimary ? <span className={styles.priorityNoCheck} aria-hidden /> : (
              <Checkbox
                shape="square"
                checked={isEnabled}
                onChange={(checked) => {
                  onExcludedChange(
                    checked
                      ? excluded.filter((e) => e !== val)
                      : [...excluded, val]
                  );
                }}
              />
            )}
            {/* 드래그 핸들 — priorityItem 바깥, checkbox 와 item 사이. drag 핸들러도 여기로 이동 */}
            <span
              className={styles.priorityGrip}
              data-draggable
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, idx)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <GripDotsIcon />
            </span>
            <div
              className={`${styles.priorityItem}${overIdx === idx ? ` ${styles.priorityItemOver}` : ""}`}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
            >
              <span className={styles.priorityBadge}>{idx + 1}</span>
              <span className={`${styles.priorityLabel} ${isEnabled ? "" : styles.priorityLabelDisabled}`}>
                {label}
                {isPrimary && primaryLabel && <span className={styles.priorityPrimary}>{primaryLabel}</span>}
                {badgeOf?.(val)}
              </span>
              {extraOf?.(val)}
              <div className={styles.priorityBtns}>
                <Pressable
                  className={shared.priorityBtn}
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  aria-label="Move up"
                ><ChevronUp size={12} strokeWidth={2.5} /></Pressable>
                <Pressable
                  className={shared.priorityBtn}
                  disabled={idx === ordered.length - 1}
                  onClick={() => move(idx, 1)}
                  aria-label="Move down"
                ><ChevronDown size={12} strokeWidth={2.5} /></Pressable>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
