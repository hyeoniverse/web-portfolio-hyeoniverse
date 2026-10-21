"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { GripVertical } from "@/components/icons";
import Pagination from "@/components/ui/Pagination";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import styles from "./SortOrderDragList.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import Badge from "@/components/ui/Badge";

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
  /** 지금 편집하는 항목에 붙는 태그 (기본: 관리자 공통 "현재") */
  currentTag?: string;
  /** 페이지당 항목 수 (default: 5) */
  pageSize?: number;
  /** 드래그 핸들 title (기본: 관리자 공통 "드래그로 순서 변경") */
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
  currentTag: currentTagProp,
  pageSize = 5,
  handleTitle: handleTitleProp,
  className,
}: SortOrderDragListProps) {
  const { t } = useLanguage();
  const currentTag = currentTagProp ?? t("admin.common.currentTag");
  const handleTitle = handleTitleProp ?? t("admin.common.dragToReorder");
  const merged: Array<{ id: string; title: string; isCurrent: boolean }> = [];
  const targetIdx = Math.max(1, Math.min(currentOrder, otherItems.length + 1)) - 1;
  otherItems.forEach((w, i) => {
    if (i === targetIdx) merged.push({ id: CURRENT_KEY, title: currentTitle, isCurrent: true });
    merged.push({ id: w.id, title: w.title || "(untitled)", isCurrent: false });
  });
  if (merged.length === otherItems.length) {
    merged.push({ id: CURRENT_KEY, title: currentTitle, isCurrent: true });
  }

  /* 끌기 — 움직이는 줄은 늘 '현재 글' 하나라 끄는 중인지만 들고, 놓을 자리(overIdx)는 포인터 아래 줄의 data-sort-idx 로 찾는다.
     HTML5 드래그 앤 드롭은 놓아도 순서가 바뀌지 않는 경우가 있어(브라우저 · 커서 효과의 dragstart 가로채기) RelationPicker 처럼 pointer 로 한다 */
  const [dragging, setDragging] = useState(false);
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
  const curChanged = useDepsChanged([cur, pageSize]);
  if (curChanged) setPage(Math.floor((cur - 1) / pageSize) + 1);
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

  /* 놓을 때는 마지막 렌더의 목록으로 계산한다 — 끄는 동안 가장자리 넘김(아래)이 현재 글 자리를 옮길 수 있다 */
  const latestRef = useRef({ merged, apply });
  useLayoutEffect(() => { latestRef.current = { merged, apply }; });
  const curIdx = merged.findIndex((m) => m.id === CURRENT_KEY);

  const rowIdxAt = (x: number, y: number): number | null => {
    const row = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-sort-idx]");
    const n = row ? Number(row.dataset.sortIdx) : NaN;
    return Number.isNaN(n) ? null : n;
  };

  const onHandlePointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    setOverIdx(null);
    let last: number | null = null;
    const onMove = (ev: PointerEvent) => {
      const n = rowIdxAt(ev.clientX, ev.clientY);
      if (n !== null && n !== last) { last = n; setOverIdx(n); }
    };
    const onUp = (ev: PointerEvent) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      setDragging(false);
      setOverIdx(null);
      if (ev.type === "pointercancel") return;
      const to = rowIdxAt(ev.clientX, ev.clientY) ?? last;
      const { merged: m, apply: run } = latestRef.current;
      const from = m.findIndex((it) => it.id === CURRENT_KEY);
      if (to !== null && from >= 0) run(from, to);
    };
    document.body.style.cursor = "grabbing";
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  };

  // 드래그 중 edge 감지 — list 위/아래 60px 영역 hover 시 current 를 인접 페이지의 첫/끝 위치로 이동
  useEffect(() => {
    if (!dragging) return;
    const onDocDrag = (e: PointerEvent) => {
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
    document.addEventListener("pointermove", onDocDrag);
    return () => {
      document.removeEventListener("pointermove", onDocDrag);
      stopEdgeJump();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, page, totalPages, cur, merged.length, pageSize]);

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
              aria-label={t("admin.common.position")}
            />
            <span className={styles.posSep}>/</span>
            <span className={styles.posTotal}>{total}</span>
          </span>
          <div className={styles.jumps}>
            <Pressable noTapScale
              className={styles.jumpBtn}
              onClick={() => moveTo(1)}
              disabled={cur <= 1}
            >
              ↑ {t("admin.common.jumpFirst")}
            </Pressable>
            <Pressable noTapScale
              className={styles.jumpBtn}
              onClick={() => moveTo(total)}
              disabled={cur >= total}
            >
              ↓ {t("admin.common.jumpLast")}
            </Pressable>
          </div>
        </div>
      </div>
      {/* 리스트 — drag 로 부분 정렬. edge 감지는 document-level dragover 로 처리 (list 밖에서도 감지) */}
      <div ref={listRef} className={styles.list}>
        {visible.map((item, vIdx) => {
          const idx = visibleStart + vIdx;
          const isDragging = dragging && item.isCurrent;
          const showAbove = dragging && overIdx === idx && idx < curIdx;
          const showBelow = dragging && overIdx === idx && idx > curIdx;
          return (
            <div
              key={item.id}
              className={`${styles.item} ${item.isCurrent ? styles.itemCurrent : ""} ${isDragging ? styles.itemDragging : ""} ${showAbove ? styles.itemDropAbove : ""} ${showBelow ? styles.itemDropBelow : ""}`}
              data-sort-idx={idx}
              /* 현재 글 줄 어디를 잡아도 끈다 — 손잡이(12px)만 잡게 하면 맞히기 어려웠다 */
              onPointerDown={item.isCurrent ? onHandlePointerDown : undefined}
            >
              <span className={styles.lead}>
                {item.isCurrent ? (
                  <span
                    className={styles.handle}
                    title={handleTitle}
                    data-cursor="grab"
                    aria-hidden
                  >
                    <GripVertical size={14} strokeWidth={1.8} />
                  </span>
                ) : (
                  <span className={styles.handlePlaceholder} aria-hidden />
                )}
                <span className={styles.num}>{idx + 1}</span>
              </span>
              {/* 제목만 줄어들며 말줄임 — '현재' 칩은 줄지 않아 공간이 모자라도 잘리지 않는다 */}
              <span className={styles.title}>
                <span className={styles.titleText} title={item.title}>
                  {item.isCurrent ? <strong>{item.title}</strong> : item.title}
                </span>
                {item.isCurrent && <Badge variant="solid" tone="accent" className={styles.titleBadge}>{currentTag}</Badge>}
              </span>
            </div>
          );
        })}
      </div>
      {/* 페이지네이션 — 넘길 페이지가 있을 때만. 한 페이지에 다 보이면 단추 줄만 남아 자리를 차지했다 */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          className={styles.pagination}
        />
      )}
    </div>
  );
}
