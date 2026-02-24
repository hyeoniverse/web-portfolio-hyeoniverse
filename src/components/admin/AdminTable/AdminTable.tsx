"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Checkbox from "@/components/ui/Checkbox";
import { SkeletonLine } from "@/components/ui/Skeleton";
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
  actions: string;
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
  children,
}: AdminTableProps<T>) {
  const router = useRouter();

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
    if (!confirm(`"${getTitle(item)}" — ${labels.deleteConfirm}`)) return;
    onDelete(item.id, getTitle(item));
  };

  /* Pagination */
  const pageNumbers = useMemo(() => {
    if (!totalPages || totalPages <= 1) return [];
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

  const gridStyle = { "--_grid": gridTemplate } as React.CSSProperties;

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className={styles.table} style={gridStyle}>
        <div className={styles.tableHeader}>
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
          <span className={styles.colCheck}>
            {onPublishAll && (
              <Checkbox
                checked={allChecked}
                indeterminate={someChecked}
                onChange={handleSelectAll}
              />
            )}
          </span>
          {columns.map((col) => (
            <span key={col.key}>{col.label}</span>
          ))}
          <span>{labels.actions}</span>
        </div>

        {items.map((item) => {
          const published = getEffectivePublished(item);
          const changed = publishOverrides.has(item.id);
          return (
            <div
              key={item.id}
              className={`${styles.row} ${changed ? styles.rowChanged : ""}`}
              data-clickable="true"
              onClick={() => handleRowClick(item)}
              onMouseEnter={
                onRowHover ? (e) => onRowHover(item, e) : undefined
              }
              onMouseLeave={onRowLeave}
            >
              <span
                className={styles.colCheck}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={published}
                  onChange={() => onPublishToggle(item)}
                />
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
      {totalPages > 1 && page && onPageChange && (
        <div className={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={styles.pageBtn}
          >
            &larr;
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
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={styles.pageBtn}
          >
            &rarr;
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
