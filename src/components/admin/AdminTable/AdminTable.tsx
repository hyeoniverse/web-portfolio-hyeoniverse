"use client";

import { useState, useMemo, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useModalStore } from "@/stores/modalStore";
import Checkbox from "@/components/ui/Checkbox";
import Tooltip from "@/components/ui/Tooltip";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import styles from "./AdminTable.module.css";

/* ── Types ── */
export interface AdminTableColumn<T> {
  key: string;
  label: string;
  className?: string;
  render: (item: T, published: boolean) => ReactNode;
  skeletonWidth?: string;
}

export interface AdminTableLabels {
  edit: string;
  delete: string;
  deleteConfirm: string;
  deleteConfirmInput: string;
  cancel: string;
  actions: string;
  publishLabel: string;
  publishedTooltip: string;
  unpublishedTooltip: string;
}

export interface AdminTableProps<T extends { id: string; published: boolean }> {
  items: T[];
  columns: AdminTableColumn<T>[];
  editBasePath: string;
  getTitle: (item: T) => string;
  publishOverrides: Map<string, boolean>;
  onPublishToggle: (item: T) => void;
  onPublishAll?: (items: T[], published: boolean) => void;
  onDelete: (id: string, title: string) => Promise<void>;
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
  showRowNumbers?: boolean;
  getRowLabel?: (item: T, index: number) => string | number;
  children?: ReactNode;
}

export default function AdminTable<T extends { id: string; published: boolean }>({
  items,
  columns,
  editBasePath,
  getTitle,
  publishOverrides,
  onPublishToggle,
  onPublishAll,
  onDelete,
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
  showRowNumbers = false,
  getRowLabel,
  children,
}: AdminTableProps<T>) {
  const router = useRouter();
  const { openModal } = useModalStore();

  /* ── Drag & drop state ── */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [dropPos, setDropPos] = useState<"above" | "below">("below");
  const dragAllowedRef = useRef(false);

  const hasNumCol = onReorder || showRowNumbers;
  const effectiveGrid = hasNumCol ? `32px ${gridTemplate}` : gridTemplate;

  const getEffectivePublished = (item: T): boolean => {
    return publishOverrides.has(item.id)
      ? publishOverrides.get(item.id)!
      : item.published;
  };

  /* Select-all state */
  const { allChecked, someChecked } = useMemo(() => {
    if (items.length === 0) return { allChecked: false, someChecked: false };
    let checked = 0;
    for (const item of items) {
      if (getEffectivePublished(item)) checked++;
    }
    return {
      allChecked: checked === items.length,
      someChecked: checked > 0 && checked < items.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, publishOverrides]);

  const handleSelectAll = useCallback(() => {
    if (!onPublishAll) return;
    // If all checked → uncheck all, otherwise check all
    onPublishAll(items, !allChecked);
  }, [items, allChecked, onPublishAll]);

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

  /* Pagination */
  const pageNumbers = useMemo(() => {
    if (!totalPages || totalPages < 1) return [];
    const p = page ?? 1;
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (p <= 3) return [1, 2, 3, 4, 5, -1, totalPages];
    if (p >= totalPages - 2)
      return [
        1,
        -1,
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, -1, p - 1, p, p + 1, -1, totalPages];
  }, [page, totalPages]);

  const gridStyle = { "--_grid": effectiveGrid } as React.CSSProperties;

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className={styles.table} style={gridStyle}>
        <div className={styles.tableHeader}>
          {hasNumCol && <span />}
          <span />
          {columns.map((col) => (
            <span key={col.key}>{col.label}</span>
          ))}
          <span>{labels.actions}</span>
        </div>
        {Array.from({ length: skeletonRows }, (_, i) => (
          <div
            key={i}
            className={styles.row}
            style={{ pointerEvents: "none" }}
          >
            {hasNumCol && (
              <span>
                <SkeletonLine width="16px" />
              </span>
            )}
            <span>
              <SkeletonLine width="20px" />
            </span>
            {columns.map((col) => (
              <span key={col.key}>
                <SkeletonLine width={col.skeletonWidth ?? "60%"} />
              </span>
            ))}
            <span>
              <SkeletonLine width="90px" />
            </span>
          </div>
        ))}
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
        <div className={styles.tableHeader}>
          {hasNumCol && <span />}
          <span className={styles.colCheck}>
            {onPublishAll && (
              <Tooltip content={labels.publishLabel} placement="top">
                <Checkbox
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={handleSelectAll}
                  shape="square"
                />
              </Tooltip>
            )}
          </span>
          {columns.map((col) => (
            <span key={col.key}>{col.label}</span>
          ))}
          <span>{labels.actions}</span>
        </div>

        {items.map((item, i) => {
          const published = getEffectivePublished(item);
          const changed = publishOverrides.has(item.id);
          const isDragging = dragIdx === i;
          const isOver =
            overIdx === i && dragIdx !== null && dragIdx !== i;
          return (
            <div
              key={item.id}
              className={`${styles.row} ${changed ? styles.rowChanged : ""} ${isDragging ? styles.rowDragging : ""} ${isOver && dropPos === "above" ? styles.dropAbove : ""} ${isOver && dropPos === "below" ? styles.dropBelow : ""}`}
              data-clickable="true"
              draggable={!!onReorder}
              onClick={(e) => onRowClick ? onRowClick(item, e) : handleRowClick(item)}
              onDragStart={
                onReorder
                  ? (e) => {
                      if (!dragAllowedRef.current) {
                        e.preventDefault();
                        return;
                      }
                      setDragIdx(i);
                      e.dataTransfer.effectAllowed = "move";
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
                      dragAllowedRef.current = false;
                    }
                  : undefined
              }
              onMouseEnter={
                onRowHover ? (e) => onRowHover(item, e) : undefined
              }
              onMouseLeave={onRowLeave}
            >
              {onReorder ? (
                <span
                  className={styles.dragHandle}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={() => {
                    dragAllowedRef.current = true;
                    const cleanup = () => {
                      dragAllowedRef.current = false;
                    };
                    window.addEventListener("pointerup", cleanup, {
                      once: true,
                    });
                  }}
                >
                  <svg
                    className={styles.dragGrip}
                    width="8"
                    height="12"
                    viewBox="0 0 8 12"
                    fill="currentColor"
                  >
                    <circle cx="2" cy="2" r="1" />
                    <circle cx="6" cy="2" r="1" />
                    <circle cx="2" cy="6" r="1" />
                    <circle cx="6" cy="6" r="1" />
                    <circle cx="2" cy="10" r="1" />
                    <circle cx="6" cy="10" r="1" />
                  </svg>
                  <span className={styles.dragNum}>{i + 1}</span>
                </span>
              ) : showRowNumbers ? (
                <span className={styles.rowNum}>
                  <span className={styles.rowNumText}>{getRowLabel ? getRowLabel(item, i) : i + 1}</span>
                </span>
              ) : null}
              <span
                className={styles.colCheck}
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip content={published ? labels.publishedTooltip : labels.unpublishedTooltip} placement="top">
                  <Checkbox
                    checked={published}
                    onChange={() => onPublishToggle(item)}
                    shape="square"
                  />
                </Tooltip>
              </span>
              {columns.map((col) => (
                <span key={col.key} className={col.className}>
                  {col.render(item, published)}
                </span>
              ))}
              <span
                className={styles.colActions}
                onClick={(e) => e.stopPropagation()}
              >
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
              </span>
            </div>
          );
        })}
      </div>

      {children}

      {/* Pagination */}
      {totalPages >= 1 && page && onPageChange && (
        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => onPageChange(1)} className={styles.pageBtn} title="First">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
          </button>
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={styles.pageBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          {pageNumbers.map((p, i) =>
            p === -1 ? (
              <span key={`ellipsis-${i}`} className={styles.ellipsis}>
                &hellip;
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
              >
                {p}
              </button>
            ),
          )}
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={styles.pageBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <button disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} className={styles.pageBtn} title="Last">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
          </button>
        </div>
      )}

    </>
  );
}

/* ── Publish changes hook ── */
export function usePublishChanges<T extends { id: string; published: boolean }>() {
  const [map, setMap] = useState<Map<string, boolean>>(() => new Map());

  const toggle = useCallback((item: T) => {
    setMap((prev) => {
      const next = new Map(prev);
      const effective = next.has(item.id) ? next.get(item.id)! : item.published;
      const newVal = !effective;
      if (newVal === item.published) next.delete(item.id);
      else next.set(item.id, newVal);
      return next;
    });
  }, []);

  const setAll = useCallback((items: T[], published: boolean) => {
    setMap((prev) => {
      const next = new Map(prev);
      for (const item of items) {
        if (published === item.published) next.delete(item.id);
        else next.set(item.id, published);
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => setMap(new Map()), []);

  const toChanges = useCallback(
    () => Array.from(map.entries()).map(([id, published]) => ({ id, published })),
    [map],
  );

  return {
    publishOverrides: map,
    toggle,
    setAll,
    reset,
    toChanges,
    hasChanges: map.size > 0,
  };
}

/* Re-export styles for consumer use */
export { styles as adminTableStyles };
