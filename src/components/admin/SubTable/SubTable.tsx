"use client";

import { useEffect, useCallback, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import Checkbox from "@/components/ui/Checkbox";
import { SkeletonLine } from "@/components/ui/Skeleton";
import Pagination from "@/components/ui/Pagination";
import styles from "./SubTable.module.css";

/* ── Types ── */
export interface SubTableColumn<T> {
  key: string;
  label: string;
  className?: string;
  render: (item: T, index: number) => ReactNode;
  skeletonWidth?: string;
  /** 헤더에서 이 열이 차지할 column 수 (기본 1). 다음 열의 헤더는 숨겨진다. */
  headerSpan?: number;
}

export interface SubTableBulkAction {
  label: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface SubTableProps<T extends { id: string }> {
  /* Toggle header */
  icon?: ReactNode;
  title: ReactNode;
  count?: number;
  hint?: ReactNode;
  open: boolean;
  onToggle: () => void;
  headerExtra?: ReactNode;

  /* Table */
  allItems: T[];
  columns: SubTableColumn<T>[];
  gridTemplate: string;

  /* Selection */
  selected: Set<string>;
  onSelectChange: (next: Set<string>) => void;
  bulkActions?: SubTableBulkAction[];

  /* Pagination */
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;

  /* States */
  emptyMessage?: string;
  loading?: boolean;
  skeletonRows?: number;

  /* Row interactions */
  onRowHover?: (item: T, e: React.MouseEvent) => void;
  onRowLeave?: () => void;
  onRowClick?: (item: T, e: React.MouseEvent) => void;

  /* Slots */
  filterBar?: ReactNode;
}

export { styles as subTableStyles };

const ChevronIcon = () => (
  <ChevronDown size={14} />
);

export default function SubTable<T extends { id: string }>({
  icon,
  title,
  count,
  hint,
  open,
  onToggle,
  headerExtra,
  allItems,
  columns,
  gridTemplate,
  selected,
  onSelectChange,
  bulkActions,
  page,
  perPage,
  onPageChange,
  emptyMessage = "No items",
  loading = false,
  skeletonRows = 3,
  onRowHover,
  onRowLeave,
  onRowClick,
  filterBar,
}: SubTableProps<T>) {
  /* Grid: checkbox col + user columns */
  const fullGrid = `28px ${gridTemplate}`;
  const gridStyle = { gridTemplateColumns: fullGrid };

  /* Paginated items */
  const pageItems = allItems.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(allItems.length / perPage));

  /* Selection helpers */
  const allSelected = allItems.length > 0 && allItems.every((item) => selected.has(item.id));
  const someSelected = allItems.some((item) => selected.has(item.id)) && !allSelected;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) onSelectChange(new Set());
    else onSelectChange(new Set(allItems.map((item) => item.id)));
  }, [allItems, allSelected, onSelectChange]);

  const toggleSelect = useCallback((id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectChange(next);
  }, [selected, onSelectChange]);

  /* Drag-to-select */
  const dragStart = useRef<number | null>(null);
  const dragAdding = useRef(true);
  const dragMoved = useRef(false);

  const handleMouseDown = useCallback((idx: number, id: string) => {
    dragStart.current = idx;
    dragAdding.current = !selected.has(id);
    dragMoved.current = false;
  }, [selected]);

  const handleMouseEnter = useCallback((idx: number) => {
    if (dragStart.current === null) return;
    dragMoved.current = true;
    const start = Math.min(dragStart.current, idx);
    const end = Math.max(dragStart.current, idx);
    const next = new Set(selected);
    for (let i = start; i <= end; i++) {
      if (dragAdding.current) next.add(pageItems[i].id);
      else next.delete(pageItems[i].id);
    }
    onSelectChange(next);
  }, [selected, pageItems, onSelectChange]);

  useEffect(() => {
    const onMouseUp = () => { dragStart.current = null; };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <div className={styles.section}>
      {/* Toggle header */}
      <div className={styles.headerRow}>
        <button type="button" className={styles.toggle} onClick={onToggle}>
          {icon}
          <span>
            {title}
            {count != null && count > 0 && ` (${count})`}
          </span>
          <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>
            <ChevronIcon />
          </span>
          {hint && <span className={styles.hint}>{hint}</span>}
        </button>
        {headerExtra}
      </div>

      {/* Collapsible body */}
      <div className={`${styles.body} ${open ? styles.bodyOpen : ""}`}>
        <div>
          {/* Filter bar slot */}
          {filterBar}

          {/* Loading skeleton */}
          {loading ? (
            <div className={styles.tableScroll}>
              <div className={styles.tableInner}>
                <ul className={styles.list}>
                  {Array.from({ length: skeletonRows }, (_, i) => (
                    <li key={i} className={styles.row} style={{ ...gridStyle, opacity: 0.4 }}>
                      <span />
                      {columns.map((col) => (
                        <span key={col.key}>
                          <SkeletonLine width={col.skeletonWidth ?? "60%"} />
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : allItems.length === 0 ? (
            <p className={styles.empty}>{emptyMessage}</p>
          ) : (
            <div className={styles.tableScroll}>
              <div className={styles.tableInner}>
              {/* Bulk bar */}
              <div className={`${styles.bulkBar} ${selected.size > 0 ? styles.bulkBarOpen : ""}`}>
                <span>{selected.size}개 선택</span>
                {bulkActions?.map((action, i) => (
                  <button
                    key={i}
                    className={styles.bulkBtn}
                    disabled={action.disabled}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </button>
                ))}
                <button className={styles.bulkCancel} onClick={() => onSelectChange(new Set())}>
                  ✕
                </button>
              </div>

              {/* Table header */}
              <div className={styles.tableHeader} style={gridStyle}>
                <span className={styles.colCheck}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleSelectAll}
                    shape="square"
                  />
                </span>
                {(() => {
                  const els: ReactNode[] = [];
                  let skip = 0;
                  for (const col of columns) {
                    if (skip > 0) { skip--; continue; }
                    const span = col.headerSpan ?? 1;
                    els.push(
                      <span
                        key={col.key}
                        className={col.className}
                        style={span > 1 ? { gridColumn: `span ${span}` } : undefined}
                      >
                        {col.label}
                      </span>
                    );
                    skip = span - 1;
                  }
                  return els;
                })()}
              </div>

              {/* Rows */}
              <ul className={styles.list} onMouseUp={() => { dragStart.current = null; }}>
                {pageItems.map((item, idx) => (
                  <li
                    key={item.id}
                    className={styles.row}
                    style={gridStyle}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      handleMouseDown(idx, item.id);
                    }}
                    onMouseEnter={(e) => {
                      handleMouseEnter(idx);
                      onRowHover?.(item, e);
                    }}
                    onMouseLeave={() => onRowLeave?.()}
                    onClick={(e) => onRowClick?.(item, e)}
                  >
                    <span className={styles.colCheck} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        shape="square"
                      />
                    </span>
                    {columns.map((col) => (
                      <span key={col.key} className={col.className}>
                        {col.render(item, (page - 1) * perPage + idx)}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
              </div>
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
        </div>
      </div>
    </div>
  );
}
