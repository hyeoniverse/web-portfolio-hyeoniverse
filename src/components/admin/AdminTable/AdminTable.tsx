"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

/** reorder drag 가 켜진 경우에만 LayoutGroup 으로 감싸서 측정 비용을 회피 */
function ConditionalLayoutGroup({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return enabled ? <LayoutGroup>{children}</LayoutGroup> : <>{children}</>;
}
import { GripVertical, Download, ArrowUpDown } from "lucide-react";
import { useModalStore } from "@/stores/modalStore";
import Checkbox from "@/components/ui/Checkbox";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import Pagination from "@/components/ui/Pagination";
import styles from "./AdminTable.module.css";

/* ── Types ── */
export interface AdminTableColumn<T> {
  key: string;
  label: string;
  className?: string;
  render: (item: T, published: boolean) => ReactNode;
  skeletonWidth?: string;
}

interface AdminTableLabels {
  edit: string;
  delete: string;
  deleteConfirm: string;
  deleteConfirmInput: string;
  cancel: string;
  actions: string;
  publishLabel: string;
  publishedTooltip: string;
  unpublishedTooltip: string;
  move?: string;
}

export interface AdminTableProps<T extends { id: string; published: boolean }> {
  items: T[];
  columns: AdminTableColumn<T>[];
  editBasePath: string;
  getTitle: (item: T) => string;
  onDelete: (id: string, title: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkPublish?: (ids: string[], published: boolean) => Promise<void>;
  onBulkExport?: (ids: string[]) => Promise<void>;
  /** 추가 일괄 작업 — 라벨/핸들러만 전달하면 표준 버튼으로 렌더 */
  extraBulkActions?: Array<{
    label: ReactNode;
    onClick: (ids: string[]) => void | Promise<void>;
    danger?: boolean;
    disabled?: boolean;
  }>;
  footerExtra?: ReactNode;
  gridTemplate: string;
  loading?: boolean;
  emptyMessage?: string;
  skeletonRows?: number;
  labels: AdminTableLabels;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowHover?: (item: T, e: React.MouseEvent) => void;
  onRowLeave?: () => void;
  onRowClick?: (item: T, e: React.MouseEvent) => void;
  onReorder?: (fromIdx: number, toIdx: number) => void;
  /** 항목 위치 이동 — 클릭 시 부모가 dialog 등으로 위치 선택 처리 */
  onMove?: (item: T) => void;
  showRowNumbers?: boolean;
  getRowLabel?: (item: T, index: number) => string | number;
  highlightId?: string | null;
  children?: ReactNode;
}

export default function AdminTable<T extends { id: string; published: boolean }>({
  items,
  columns,
  editBasePath,
  getTitle,
  onDelete,
  onBulkDelete,
  onBulkPublish,
  onBulkExport,
  extraBulkActions,
  footerExtra,
  gridTemplate,
  loading = false,
  emptyMessage = "No items yet",
  skeletonRows = 6,
  labels,
  page,
  totalPages = 1,
  onPageChange,
  onRowHover,
  onRowLeave,
  onRowClick,
  onReorder,
  onMove,
  showRowNumbers = false,
  getRowLabel,
  highlightId,
  children,
}: AdminTableProps<T>) {
  const router = useRouter();
  const { openModal } = useModalStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* ── Drag & drop state ── */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [dropPos, setDropPos] = useState<"above" | "below">("below");
  const highlightRef = useRef<HTMLDivElement>(null);
  const didHighlightScroll = useRef(false);

  useEffect(() => {
    if (highlightId && highlightRef.current && !didHighlightScroll.current) {
      didHighlightScroll.current = true;
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, items]);

  const hasNumCol = onReorder || showRowNumbers;
  const effectiveGrid = `28px ${hasNumCol ? "28px " : ""}${gridTemplate}`;

  /* ── Selection ── */
  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const someSelected = items.some((item) => selected.has(item.id)) && !allSelected;

  // 드래그 선택
  const dragSelectStart = useRef<number | null>(null);
  const dragSelectAdding = useRef(true);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectMouseDown = useCallback((idx: number) => {
    dragSelectStart.current = idx;
    dragSelectAdding.current = !selected.has(items[idx]?.id);
  }, [items, selected]);

  const handleSelectMouseEnter = useCallback((idx: number) => {
    if (dragSelectStart.current === null) return;
    if (idx !== dragSelectStart.current) dragSelected.current = true;
    const start = Math.min(dragSelectStart.current, idx);
    const end = Math.max(dragSelectStart.current, idx);
    setSelected((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        if (dragSelectAdding.current) next.add(items[i].id);
        else next.delete(items[i].id);
      }
      return next;
    });
  }, [items]);

  const dragSelected = useRef(false);

  useEffect(() => {
    const onMouseUp = () => {
      if (dragSelectStart.current !== null && dragSelected.current) {
        // 드래그 선택 직후 클릭 이벤트 차단
        setTimeout(() => { dragSelected.current = false; }, 0);
      } else {
        dragSelected.current = false;
      }
      dragSelectStart.current = null;
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((item) => item.id)));
  }, [items, allSelected]);

  const handleBulkDelete = useCallback(() => {
    if (!onBulkDelete || selected.size === 0) return;
    const count = String(selected.size);
    openModal(
      <ModalPrompt
        hint={`${selected.size}개 항목을 삭제하려면 "${count}"을(를) 입력하세요.`}
        placeholder={count}
        validate={(v) => v === count}
        cancelText={labels.cancel}
        confirmText={labels.delete}
        danger
        onConfirm={() => onBulkDelete([...selected]).then(() => setSelected(new Set()))}
      />,
      { id: "bulk-delete-confirm", header: { title: `${labels.delete} (${count})` }, closeButton: true, width: "400px" },
    );
  }, [onBulkDelete, selected, openModal, labels]);

  const handleBulkPublish = useCallback((published: boolean) => {
    if (!onBulkPublish || selected.size === 0) return;
    onBulkPublish([...selected], published).then(() => setSelected(new Set()));
  }, [onBulkPublish, selected]);

  const handleRowClick = (item: T) => {
    router.push(`${editBasePath}/${item.id}/edit`);
  };

  const handleDeleteClick = (item: T, e: React.MouseEvent) => {
    e.stopPropagation();
    const title = getTitle(item);
    openModal(
      <ModalPrompt
        hint={labels.deleteConfirmInput}
        placeholder={title}
        validate={(v) => v === title}
        cancelText={labels.cancel}
        confirmText={labels.delete}
        danger
        onConfirm={() => onDelete(item.id, title)}
      />,
      {
        id: "delete-confirm",
        closeButton: false,
        width: "400px",
        header: { title: `\u201C${title}\u201D` },
      },
    );
  };


  const gridStyle = { "--_grid": effectiveGrid } as React.CSSProperties;

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className={styles.table} style={gridStyle}>
        <div className={styles.tableInner}>
          <div className={styles.tableHeader}>
            <span />
            {hasNumCol && <span>#</span>}
            {columns.map((col) => (
              <span key={col.key} className={col.className}>{col.label}</span>
            ))}
            <span className={styles.colActions}>{labels.actions}</span>
          </div>
          {Array.from({ length: skeletonRows }, (_, i) => (
            <div
              key={i}
              className={styles.row}
              style={{ pointerEvents: "none" }}
            >
              <span><SkeletonLine width="16px" /></span>
              {hasNumCol && <span><SkeletonLine width="16px" /></span>}
              {columns.map((col) => (
                <span key={col.key} className={col.className}>
                  <SkeletonLine width={col.skeletonWidth ?? "60%"} />
                </span>
              ))}
              <span>
                <SkeletonLine width="90px" />
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty ── */
  if (items.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <>
      <div className={styles.table} style={gridStyle}>
        <div className={styles.tableInner}>
        <div className={`${styles.bulkBar} ${selected.size > 0 ? styles.bulkBarOpen : ""}`}>
          <span>{selected.size}개 선택</span>
          {onBulkPublish && (
            <>
              <button className={styles.bulkActionBtn} onClick={() => handleBulkPublish(true)}>{labels.publishedTooltip}</button>
              <button className={styles.bulkActionBtn} onClick={() => handleBulkPublish(false)}>{labels.unpublishedTooltip}</button>
            </>
          )}
          {onBulkExport && (
            <button className={styles.bulkActionBtn} onClick={() => onBulkExport([...selected])}>.md 내보내기</button>
          )}
          {extraBulkActions?.map((a, i) => (
            <button
              key={i}
              className={`${styles.bulkActionBtn} ${a.danger ? styles.bulkActionDanger : ""}`}
              disabled={a.disabled}
              onClick={async () => {
                await a.onClick([...selected]);
                setSelected(new Set());
              }}
            >
              {a.label}
            </button>
          ))}
          {onBulkDelete && (
            <button className={`${styles.bulkActionBtn} ${styles.bulkActionDanger}`} onClick={handleBulkDelete}>{labels.delete}</button>
          )}
          <button className={styles.bulkCancelBtn} onClick={() => setSelected(new Set())}>✕</button>
        </div>
        <div className={styles.tableHeader}>
          <span className={styles.colCheck} onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} shape="square" />
          </span>
          {hasNumCol && <span>#</span>}
          {columns.map((col) => (
            <span key={col.key} className={col.className}>{col.label}</span>
          ))}
          <span className={styles.colActions}>{labels.actions}</span>
        </div>

        {/* layout / LayoutGroup 은 reorder drag 시 행 swap 애니메이션이 필요할 때만 활성화.
            그렇지 않으면 행 selection 토글마다 Framer Motion 이 모든 행을 측정해서 비싸짐 (대형 admin 테이블 hot path). */}
        <ConditionalLayoutGroup enabled={!!onReorder}>
        <AnimatePresence initial={false}>
        {items.map((item, i) => {
          const isDragging = dragIdx === i;
          const isOver =
            overIdx === i && dragIdx !== null && dragIdx !== i;
          return (
            <motion.div
              key={item.id}
              layout={!!onReorder}
              transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.8 }}
              ref={highlightId === item.id ? highlightRef : undefined}
              className={`${styles.row} ${selected.has(item.id) ? styles.rowChanged : ""} ${isDragging ? styles.rowDragging : ""} ${isOver && dropPos === "above" ? styles.dropAbove : ""} ${isOver && dropPos === "below" ? styles.dropBelow : ""} ${highlightId === item.id ? styles.rowHighlight : ""}`}
              data-clickable="true"
              draggable={!!onReorder}
              onMouseDown={(e) => { if (e.button === 0 && !onReorder) { e.preventDefault(); handleSelectMouseDown(i); } }}
              onClick={(e) => { if (dragSelected.current) return; if (onRowClick) onRowClick(item, e); else handleRowClick(item); }}
              onDragStart={
                onReorder
                  ? (e) => {
                      // 행 전체 어디서든 drag 시작 가능 (handle 없어도 OK)
                      // motion.div 은 onDragStart 가 더 넓은 이벤트 union 이라 cast 필요
                      setDragIdx(i);
                      (e as unknown as React.DragEvent).dataTransfer.effectAllowed = "move";
                    }
                  : undefined
              }
              onDragOver={
                onReorder
                  ? (e) => {
                      if (dragIdx === null) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const rect = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      const mid = rect.top + rect.height / 2;
                      setDropPos(e.clientY < mid ? "above" : "below");
                      setOverIdx(i);
                    }
                  : undefined
              }
              onDrop={
                onReorder
                  ? (e) => {
                      e.preventDefault();
                      if (dragIdx === null) return;
                      const rect = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      const mid = rect.top + rect.height / 2;
                      const pos =
                        e.clientY < mid ? "above" : "below";
                      let toIdx: number;
                      if (pos === "above") {
                        toIdx =
                          dragIdx < i ? i - 1 : i;
                      } else {
                        toIdx =
                          dragIdx <= i ? i : i + 1;
                      }
                      toIdx = Math.max(
                        0,
                        Math.min(toIdx, items.length - 1),
                      );
                      if (toIdx !== dragIdx) onReorder(dragIdx, toIdx);
                      setDragIdx(null);
                      setOverIdx(null);
                    }
                  : undefined
              }
              onDragEnd={
                onReorder
                  ? () => {
                      setDragIdx(null);
                      setOverIdx(null);
                    }
                  : undefined
              }
              onMouseEnter={(e) => {
                handleSelectMouseEnter(i);
                if (onRowHover) onRowHover(item, e);
              }}
              onMouseLeave={onRowLeave}
            >
              {onReorder && (
                <span
                  className={styles.dragHandle}
                  onClick={(e) => e.stopPropagation()}
                  aria-hidden
                >
                  <GripVertical
                    className={styles.dragGrip}
                    size={12}
                    fill="currentColor"
                  />
                </span>
              )}
              <span className={styles.colCheck} onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}>
                <Checkbox checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} shape="square" />
              </span>
              {hasNumCol && (
                <span className={styles.rowNum}>
                  <span className={styles.rowNumText}>{getRowLabel ? getRowLabel(item, i) : i + 1}</span>
                </span>
              )}
              {columns.map((col) => (
                <span key={col.key} className={col.className}>
                  {col.render(item, item.published)}
                </span>
              ))}
              <span
                className={styles.colActions}
                onClick={(e) => e.stopPropagation()}
              >
                {onMove && (
                  <button
                    className={styles.moveBtn}
                    onClick={(e) => { e.stopPropagation(); onMove(item); }}
                    title={labels.move ?? "이동"}
                    aria-label={labels.move ?? "이동"}
                  >
                    <ArrowUpDown size={14} />
                  </button>
                )}
                <Link
                  href={`${editBasePath}/${item.id}/edit`}
                  className={styles.actionBtn}
                >
                  {labels.edit}
                </Link>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => handleDeleteClick(item, e)}
                >
                  {labels.delete}
                </button>
                {onBulkExport && (
                  <button
                    className={styles.exportIconBtn}
                    title=".md 내보내기"
                    onClick={(e) => { e.stopPropagation(); onBulkExport([item.id]); }}
                  >
                    <Download size={14} />
                  </button>
                )}
              </span>
            </motion.div>
          );
        })}
        </AnimatePresence>
        </ConditionalLayoutGroup>
        </div>
      </div>

      {children}

      {footerExtra && (
        <div className={styles.footerExtra}>{footerExtra}</div>
      )}

      {page && onPageChange && (
        <Pagination page={page} totalPages={totalPages} onChange={onPageChange} className={styles.pagination} />
      )}

    </>
  );
}

/* Re-export styles for consumer use */
export { styles as adminTableStyles };
