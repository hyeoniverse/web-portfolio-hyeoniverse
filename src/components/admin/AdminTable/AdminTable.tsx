"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

/** reorder drag 가 켜진 경우에만 LayoutGroup 으로 감싸서 측정 비용을 회피 */
function ConditionalLayoutGroup({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return enabled ? <LayoutGroup>{children}</LayoutGroup> : <>{children}</>;
}
import { GripVertical, Lock } from "@/components/icons";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import CloseButton from "@/components/ui/CloseButton";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import { ModalPrompt } from "@/components/ui/ModalTemplates";
import Pagination from "@/components/ui/Pagination";
import EditableRowNumber from "./EditableRowNumber";
import RowActionsMenu from "./RowActionsMenu";
import styles from "./AdminTable.module.css";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";

/* ── Types ── */
export interface AdminTableColumn<T> {
  key: string;
  label: string;
  className?: string;
  render: (item: T, published: boolean) => ReactNode;
  skeletonWidth?: string;
  /** 로딩 스켈레톤 모양 — "box" 는 썸네일처럼 사각형 블록으로 렌더 (기본 "line") */
  skeletonShape?: "line" | "box";
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
  moveCurrent?: string;
  moveToTop?: string;
  moveToBottom?: string;
  apply?: string;
  exportItem?: string;
  /** rowDisabled 인 행의 체크박스 자리에 붙는 설명 (자물쇠 아이콘의 title/aria-label). */
  noPermission?: string;
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
  /**
   * 이 행을 다룰 수 없는가 — 권한이 없는 항목을 흐리게 표시한다.
   * 클릭 처리는 막지 않는다. 이유를 알리는 것은 onRowClick 을 가진 호출부의 몫이다.
   * 인가 자체는 서버와 RLS 정책이 한다.
   */
  rowDisabled?: (item: T) => boolean;
  /**
   * rowDisabled 인 행에서 조작을 시도했을 때. 이유를 알리는 것은 호출부의 몫이다.
   * 지정하지 않으면 그 행의 수정·삭제 버튼은 아무 일도 하지 않는다.
   */
  onDenied?: (item: T) => void;
  onReorder?: (fromIdx: number, toIdx: number) => void;
  /** 항목 위치 이동 — popover 에서 선택한 newOrder 로 직접 호출 */
  onMove?: (item: T, newOrder: number) => void | Promise<void>;
  /** 행 번호 cell 클릭으로 인라인 편집 — getRowLabel 과 함께 사용 시 활성화 */
  onRowLabelEdit?: (item: T, newValue: number) => void | Promise<void>;
  /** 인라인 편집 시 max 값 — 보통 totalCount */
  rowLabelMax?: number;
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
  onRowLabelEdit,
  rowLabelMax,
  showRowNumbers = false,
  getRowLabel,
  rowDisabled,
  onDenied,
  highlightId,
  children,
}: AdminTableProps<T>) {
  const router = useRouter();
  const { openModal } = useModalStore();
  const { t } = useLanguage();
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
  // 체크박스 열은 내용(체크박스)에 맞춰 — 고정 28px 대신 max-content.
  // 번호 열은 고정 2.5rem(40px) — 숫자 자릿수와 무관하게 # 열 너비 일정(1~4자리 한 줄 수용).
  const effectiveGrid = `max-content ${hasNumCol ? "2.5rem " : ""}${gridTemplate}`;

  /* ── Selection ── */
  /* 권한이 없는 행은 애초에 선택 대상이 아니다 — 전체선택이 그것까지 집으면
     일괄 작업이 매번 "권한 없음" 으로 막힌다. */
  const selectableItems = items.filter((item) => !rowDisabled?.(item));
  const allSelected = selectableItems.length > 0 && selectableItems.every((item) => selected.has(item.id));
  const someSelected = selectableItems.some((item) => selected.has(item.id)) && !allSelected;

  // 드래그 선택
  const dragSelectStart = useRef<number | null>(null);
  const dragSelectAdding = useRef(true);
  // mousedown origin — onReorder 모드에서 체크박스 영역에서 시작된 drag 는 reorder 대신 다중 선택
  const dragOriginRef = useRef<HTMLElement | null>(null);

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
    else setSelected(new Set(selectableItems.map((item) => item.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, allSelected, rowDisabled]);

  const handleBulkDelete = useCallback(() => {
    if (!onBulkDelete || selected.size === 0) return;
    const count = String(selected.size);
    openModal(
      <ModalPrompt
        hint={fillTemplate(t("admin.common.bulkDeleteItemsPrompt"), { count })}
        placeholder={count}
        validate={(v) => v === count}
        confirmText={labels.delete}
        danger
        onConfirm={() => onBulkDelete([...selected]).then(() => setSelected(new Set()))}
      />,
      { id: "bulk-delete-confirm", header: { title: `${labels.delete} (${count})` }, closeButton: true, width: "400px" },
    );
  }, [onBulkDelete, selected, openModal, labels, t]);

  const handleBulkPublish = useCallback((published: boolean) => {
    if (!onBulkPublish || selected.size === 0) return;
    onBulkPublish([...selected], published).then(() => setSelected(new Set()));
  }, [onBulkPublish, selected]);

  const handleRowClick = (item: T) => {
    router.push(`${editBasePath}/${item.id}/edit`);
  };

  const handleDeleteClick = (item: T, e: React.MouseEvent) => {
    e.stopPropagation();
    /* 권한 확인이 확인 모달보다 먼저다. 뒤에 두면 "정말 삭제할까요" 를 거친 뒤에야
       권한이 없다고 알리게 된다. */
    if (rowDisabled?.(item)) { onDenied?.(item); return; }
    const title = getTitle(item);
    openModal(
      <ModalPrompt
        hint={labels.deleteConfirmInput}
        placeholder={title}
        validate={(v) => v === title}
        confirmText={labels.delete}
        danger
        onConfirm={() => onDelete(item.id, title)}
      />,
      {
        id: "delete-confirm",
        closeButton: true,
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
            {hasNumCol && <span className={styles.colNum}>#</span>}
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
                  {col.skeletonShape === "box" ? (
                    /* 실제 썸네일은 64px 각진 네모다 — 48px 짜리에 24px(2xl) 곡률을 주면 정원이 되어
                       불러오는 동안 동그란 자리가 보였다가 네모가 들어선다 */
                    <Skeleton
                      width={col.skeletonWidth ?? "64px"}
                      height="64px"
                      borderRadius="0"
                    />
                  ) : (
                    <SkeletonLine width={col.skeletonWidth ?? "60%"} />
                  )}
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
      {/* 일괄 선택 바는 .table 바깥에 둔다.
          1024px 이하에서 .table 이 overflow-x:auto 가 되며 스크롤 컨테이너가 되는데,
          그 안의 position:sticky 는 뷰포트가 아니라 그 컨테이너를 기준으로 붙는다.
          안에 두면 화면 상단에 고정되지 않고 테이블과 같이 움직인다. */}
      {selected.size > 0 && (
        <div className={styles.bulkBar}>
        <span>{fillTemplate(t("admin.common.selectedCount"), { count: selected.size })}</span>
        {onBulkPublish && (
          <>
            <Button variant="outline" size="xs" onClick={() => handleBulkPublish(true)}>{labels.publishedTooltip}</Button>
            <Button variant="outline" size="xs" onClick={() => handleBulkPublish(false)}>{labels.unpublishedTooltip}</Button>
          </>
        )}
        {onBulkExport && (
          <Button variant="outline" size="xs" onClick={() => onBulkExport([...selected])}>{labels.exportItem ?? t("admin.common.exportMd")}</Button>
        )}
        {extraBulkActions?.map((a, i) => (
          <Button
            key={i}
            variant="outline"
            size="xs"
            tone={a.danger ? "danger" : "default"}
            disabled={a.disabled}
            onClick={async () => {
              await a.onClick([...selected]);
              setSelected(new Set());
            }}
          >
            {a.label}
          </Button>
        ))}
        {onBulkDelete && (
          <Button variant="outline" size="xs" tone="danger" onClick={handleBulkDelete}>{labels.delete}</Button>
        )}
        <CloseButton onClick={() => setSelected(new Set())} ariaLabel={t("admin.common.clearSelection")} size="sm" className={styles.bulkCancelBtn} />
        </div>
      )}
      <div className={styles.table} style={gridStyle}>
        <div className={styles.tableInner}>
        <div className={styles.tableHeader}>
          <span className={styles.colCheck} onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} shape="square" />
          </span>
          {hasNumCol && <span className={styles.colNum}>#</span>}
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
              className={`${styles.row} ${selected.has(item.id) ? styles.rowChanged : ""} ${isDragging ? styles.rowDragging : ""} ${isOver && dropPos === "above" ? styles.dropAbove : ""} ${isOver && dropPos === "below" ? styles.dropBelow : ""} ${highlightId === item.id ? styles.rowHighlight : ""} ${rowDisabled?.(item) ? styles.rowDisabled : ""}`}
              data-clickable="true"
              draggable={!!onReorder}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                const target = e.target as HTMLElement;
                dragOriginRef.current = target;
                const inCheck = !!target.closest(`.${styles.colCheck}`);
                // onReorder OFF → 행 전체에서 다중 선택. ON → 체크박스 영역만 다중 선택.
                if (rowDisabled?.(item)) return;
                if (!onReorder || inCheck) {
                  if (!onReorder) e.preventDefault();
                  handleSelectMouseDown(i);
                }
              }}
              aria-disabled={rowDisabled?.(item) || undefined}
              /* rowDisabled 는 표시만 담당한다. 클릭을 여기서 삼키면 아무 반응이 없어
                 왜 안 되는지 알 수 없다 — 이유를 알릴 수 있는 호출부가 판단한다. */
              onClick={(e) => {
                if (dragSelected.current) return;
                if (onRowClick) onRowClick(item, e); else if (!rowDisabled?.(item)) handleRowClick(item);
              }}
              onDragStart={
                onReorder
                  ? (e) => {
                      // 체크박스 영역에서 시작된 drag → reorder 가 아니라 다중 선택. abort.
                      if (dragOriginRef.current?.closest(`.${styles.colCheck}`)) {
                        (e as unknown as React.DragEvent).preventDefault();
                        return;
                      }
                      // 권한이 없는 행은 끌어서 순서를 바꿀 수 없다
                      if (rowDisabled?.(item)) {
                        (e as unknown as React.DragEvent).preventDefault();
                        return;
                      }
                      // 행 전체 어디서든 drag 시작 가능 (handle 없어도 OK)
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
              {rowDisabled?.(item) ? (
                /* 권한이 없는 행은 체크박스 자리를 자물쇠로 바꾼다. 행 전체를 흐리게 하면
                   내용까지 읽기 어려워지고, 왜 흐린지도 드러나지 않는다. */
                <span
                  className={`${styles.colCheck} ${styles.colCheckLocked}`}
                  onClick={(e) => e.stopPropagation()}
                  title={labels.noPermission}
                  aria-label={labels.noPermission}
                >
                  <Lock size={13} strokeWidth={2} aria-hidden />
                </span>
              ) : (
                <span
                  className={styles.colCheck}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                >
                  <Checkbox checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} shape="square" />
                </span>
              )}
              {hasNumCol && (
                <span className={styles.rowNum}>
                  {/* 순서 변경도 그 행에 대한 쓰기다. 권한이 없으면 편집 가능한 입력으로 두지 않는다 —
                      서버가 막더라도 값이 바뀐 것처럼 보였다가 되돌아가면 무엇이 실패했는지 알 수 없다. */}
                  {onRowLabelEdit && getRowLabel && !rowDisabled?.(item) ? (
                    <EditableRowNumber
                      value={getRowLabel(item, i)}
                      max={rowLabelMax}
                      onSave={(v) => onRowLabelEdit(item, v)}
                    />
                  ) : (
                    <span className={`${styles.rowNumText} ${styles.rowNumStatic}`}>{getRowLabel ? getRowLabel(item, i) : i + 1}</span>
                  )}
                </span>
              )}
              {columns.map((col) => (
                <span key={col.key} className={col.className}>
                  {col.render(item, item.published)}
                </span>
              ))}
              <span
                className={styles.colActions}
                /* 미리보기 훅이 "이 탭은 관리 버튼을 향한 것" 을 알아볼 표식.
                   CSS 모듈 클래스명은 해시되므로 선택자로 쓸 수 없다. */
                data-row-actions
                onClick={(e) => e.stopPropagation()}
              >
                {rowDisabled?.(item) ? (
                  /* 열 수 없는 글이라 링크로 두지 않는다 — 이동한 뒤 403 화면을 보여 주는 것보다
                     여기서 바로 이유를 알리는 편이 짧다. */
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={(e) => { e.stopPropagation(); onDenied?.(item); }}
                  >
                    {labels.edit}
                  </Button>
                ) : (
                  <Button
                    href={`${editBasePath}/${item.id}/edit`}
                    variant="outline"
                    size="xs"
                  >
                    {labels.edit}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="xs"
                  tone="danger"
                  onClick={(e) => handleDeleteClick(item, e)}
                >
                  {labels.delete}
                </Button>
                <RowActionsMenu
                  /* 이동도 쓰기라 권한이 없으면 메뉴에서 아예 뺀다 */
                  onMove={onMove && getRowLabel && !rowDisabled?.(item) ? (newOrder) => onMove(item, newOrder) : undefined}
                  currentOrder={getRowLabel ? Number(getRowLabel(item, i)) || 0 : 0}
                  totalCount={rowLabelMax ?? items.length}
                  onExport={onBulkExport ? () => onBulkExport([item.id]) : undefined}
                  labels={{
                    menuTitle: labels.actions,
                    move: labels.move,
                    moveCurrent: labels.moveCurrent,
                    moveToTop: labels.moveToTop,
                    moveToBottom: labels.moveToBottom,
                    apply: labels.apply,
                    export: labels.exportItem,
                  }}
                />
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
