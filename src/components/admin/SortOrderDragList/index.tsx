"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import styles from "./SortOrderDragList.module.css";

interface SortOrderItem {
  id: string;
  title: string;
  sort_order: number;
}

interface SortOrderDragListProps {
  label: string;
  /** 현재 편집 중인 항목 (still 미저장 가능) */
  currentTitle: string;
  currentOrder: number;
  /** 다른 항목들 — sort_order 로 정렬되어 있어야 함 */
  otherItems: SortOrderItem[];
  /**
   * drop / 위치 변경 시 호출.
   * - newOrder: current 항목의 새 순서 (1-based)
   * - otherUpdates: 다른 항목들 중 sort_order 가 바뀐 것들의 ID + 새 순서
   */
  onChange: (
    newOrder: number,
    otherUpdates: Array<{ id: string; sort_order: number }>,
  ) => void;
  /** "현재" 같은 강조 태그 라벨 (default: "현재") */
  currentTag?: string;
  /** 페이지당 항목 수 (default: 5) */
  pageSize?: number;
  /** 드래그 핸들 title (default: "드래그하여 순서 변경") */
  handleTitle?: string;
  className?: string;
}

const CURRENT_KEY = "__current__";

/**
 * Admin editor 공용 정렬 list (works / posts 시리즈 등에서 사용).
 *
 * 다른 항목들과 함께 list 로 보여주고, 현재 항목을 drag 해서 위치 잡음.
 * drop 시 onChange(newOrder, otherUpdates) — 다른 항목들의 sort_order 갱신
 * 정보도 함께 반환. 큰 list 는 페이지네이션(default 5개) + 드래그 중 list edge
 * (60px) hover 시 인접 페이지의 첫/끝 위치로 reorder 자체 수행 (source unmount
 * 으로 drag cancel 되는 걸 방지).
 */
export default function SortOrderDragList({
  label,
  currentTitle,
  currentOrder,
  otherItems,
  onChange,
  currentTag = "현재",
  pageSize = 5,
  handleTitle = "드래그하여 순서 변경",
  className,
}: SortOrderDragListProps) {
  const merged: Array<{ id: string; title: string; isCurrent: boolean }> = [];
  const targetIdx = Math.max(1, Math.min(currentOrder, otherItems.length + 1)) - 1;
  otherItems.forEach((w, i) => {
    if (i === targetIdx) merged.push({ id: CURRENT_KEY, title: currentTitle, isCurrent: true });
    merged.push({ id: w.id, title: w.title || "(untitled)", isCurrent: false });
  });
  if (merged.length === otherItems.length) {
    merged.push({ id: CURRENT_KEY, title: currentTitle, isCurrent: true });
  }

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // edge 에 hover 시 current 를 자동으로 인접 페이지의 첫/끝 위치로 이동.
  // 단순히 setPage 만 하면 current chip 이 새 페이지에 없어 unmount 되며 drag 가 cancel 됨 — 그래서 reorder 도 같이 수행
  const edgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeDirectionRef = useRef<-1 | 1 | null>(null);
  const edgeJumpCountRef = useRef(0);

  const stopEdgeJump = () => {
    if (edgeTimerRef.current) { clearTimeout(edgeTimerRef.current); edgeTimerRef.current = null; }
    edgeDirectionRef.current = null;
    edgeJumpCountRef.current = 0;
  };
  useEffect(() => () => stopEdgeJump(), []);

  const total = otherItems.length + 1;
  const cur = Math.max(1, Math.min(total, currentOrder));

  // ── 페이지네이션 — 항목 많을 때 한 페이지씩. page 는 1-based ──
  const totalPages = Math.max(1, Math.ceil(merged.length / pageSize));
  const pageOfCurrent = Math.floor((cur - 1) / pageSize) + 1;
  const [page, setPage] = useState(pageOfCurrent);
  useEffect(() => { setPage(Math.floor((cur - 1) / pageSize) + 1); }, [cur, pageSize]);
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, merged.length);
  const visible = merged.slice(pageStart, pageEnd);
  const visibleStart = pageStart;

  const apply = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const reordered = [...merged];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    let newCurrent = currentOrder;
    const otherUpdates: Array<{ id: string; sort_order: number }> = [];
    reordered.forEach((it, i) => {
      const newOrder = i + 1;
      if (it.id === CURRENT_KEY) {
        newCurrent = newOrder;
      } else {
        const orig = otherItems.find((w) => w.id === it.id);
        if (orig && orig.sort_order !== newOrder) {
          otherUpdates.push({ id: it.id, sort_order: newOrder });
        }
      }
    });
    onChange(newCurrent, otherUpdates);
  };

  const moveTo = (newPos: number) => {
    const target = Math.max(1, Math.min(total, newPos));
    if (target === cur) return;
    const fromIdx = merged.findIndex((m) => m.id === CURRENT_KEY);
    const toIdx = target - 1;
    apply(fromIdx, toIdx);
  };

  // 드래그 중 edge 감지 — list 위/아래 60px 영역 hover 시 current 를 인접 페이지의 첫/끝 위치로 이동
  useEffect(() => {
    if (dragIdx === null) return;
    const onDocDrag = (e: DragEvent) => {
      const rect = listRef.current?.getBoundingClientRect();
      if (!rect) return;
      const EDGE = 60;
      const y = e.clientY;
      let direction: -1 | 1 | null = null;
      if (y < rect.top + EDGE && page > 1) direction = -1;
      else if (y > rect.bottom - EDGE && page < totalPages) direction = 1;

      if (direction === null) {
        stopEdgeJump();
        return;
      }
      if (edgeDirectionRef.current === direction) return;

      stopEdgeJump();
      edgeDirectionRef.current = direction;
      const fire = () => {
        const targetPage = direction === 1
          ? Math.min(totalPages, (edgeJumpCountRef.current === 0 ? page : Math.floor((cur - 1) / pageSize) + 1) + 1)
          : Math.max(1, (edgeJumpCountRef.current === 0 ? page : Math.floor((cur - 1) / pageSize) + 1) - 1);
        const newCur = direction === 1
          ? Math.min(merged.length, targetPage * pageSize)
          : (targetPage - 1) * pageSize + 1;
        const fromIdx = merged.findIndex((m) => m.id === CURRENT_KEY);
        if (fromIdx >= 0 && newCur - 1 !== fromIdx) {
          apply(fromIdx, newCur - 1);
        }
        edgeJumpCountRef.current += 1;
        const next = edgeJumpCountRef.current === 1 ? 500 : edgeJumpCountRef.current === 2 ? 350 : 250;
        edgeTimerRef.current = setTimeout(fire, next);
      };
      edgeTimerRef.current = setTimeout(fire, 500);
    };
    document.addEventListener("dragover", onDocDrag);
    return () => {
      document.removeEventListener("dragover", onDocDrag);
      stopEdgeJump();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragIdx, page, totalPages, cur, merged.length, pageSize]);

  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      {/* 헤더 — label + 위치 input + 맨앞/맨뒤 jump (한 라인) */}
      <div className={styles.header}>
        <label className={es.fieldLabel}>{label}</label>
        <div className={styles.controls}>
          <span className={styles.pos}>
            <input
              type="number"
              min={1}
              max={total}
              value={cur}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) moveTo(n);
              }}
              className={styles.posInput}
              aria-label="Position"
            />
            <span className={styles.posSep}>/</span>
            <span className={styles.posTotal}>{total}</span>
          </span>
          <div className={styles.jumps}>
            <button
              type="button"
              className={styles.jumpBtn}
              onClick={() => moveTo(1)}
              disabled={cur <= 1}
            >
              ↑ 맨 앞
            </button>
            <button
              type="button"
              className={styles.jumpBtn}
              onClick={() => moveTo(total)}
              disabled={cur >= total}
            >
              ↓ 맨 뒤
            </button>
          </div>
        </div>
      </div>
      {/* 리스트 — drag 로 부분 정렬. edge 감지는 document-level dragover 로 처리 (list 밖에서도 감지) */}
      <div ref={listRef} className={styles.list}>
        {visible.map((item, vIdx) => {
          const idx = visibleStart + vIdx;
          const isDragging = dragIdx === idx;
          const showAbove = overIdx === idx && dragIdx !== null && dragIdx !== idx && dragIdx > idx;
          const showBelow = overIdx === idx && dragIdx !== null && dragIdx !== idx && dragIdx < idx;
          return (
            <div
              key={item.id}
              className={`${styles.item} ${item.isCurrent ? styles.itemCurrent : ""} ${isDragging ? styles.itemDragging : ""} ${showAbove ? styles.itemDropAbove : ""} ${showBelow ? styles.itemDropBelow : ""}`}
              draggable={item.isCurrent}
              onDragStart={(e) => {
                if (!item.isCurrent) { e.preventDefault(); return; }
                setDragIdx(idx);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (dragIdx === null) return;
                e.preventDefault();
                if (overIdx !== idx) setOverIdx(idx);
              }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdx !== null) apply(dragIdx, idx);
                setDragIdx(null);
                setOverIdx(null);
              }}
            >
              <span className={styles.lead}>
                {item.isCurrent ? (
                  <span
                    className={styles.handle}
                    aria-label="Drag to reorder"
                    title={handleTitle}
                    data-cursor="grab"
                  >
                    <GripVertical size={14} strokeWidth={1.8} />
                  </span>
                ) : (
                  <span className={styles.handlePlaceholder} aria-hidden />
                )}
                <span className={styles.num}>{idx + 1}</span>
              </span>
              <span className={styles.title}>
                {item.isCurrent ? <strong>{item.title}</strong> : item.title}
                {item.isCurrent && <span className={styles.currentTag}>{currentTag}</span>}
              </span>
            </div>
          );
        })}
      </div>
      {/* 페이지네이션 — 페이지 1개여도 항상 노출 (Pagination 컴포넌트가 자체 처리) */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
        className={styles.pagination}
      />
    </div>
  );
}
