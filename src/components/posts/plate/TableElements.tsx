import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
  useEditorSelector,
  useElement,
} from "platejs/react";
import {
  TableProvider,
  TablePlugin,
  useTableCellElement,
  useTableColSizes,
  useTableElement,
  useSelectedCells,
} from "@platejs/table/react";
import {
  setTableColSize,
  setTableRowSize,
  computeCellIndices,
  getTableAbove,
  insertTableMergeRow,
  insertTableMergeColumn,
} from "@platejs/table";
import { InlineCaption } from "./elements";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import { BlockTailClickZone } from "./elements";
// ── 테이블 엘리먼트 (colgroup + tbody + 가로스크롤 래핑) ──
// TableProvider를 바깥에 감싸야 useTableElement / useTableColSizes가 store에 접근 가능
export function TableElement(props: PlateElementProps) {
  return (
    <TableProvider>
      <TableElementInner {...props} />
    </TableProvider>
  );
}

// ── 행/열 추가 버튼 스타일 ──
const addBtnBase: React.CSSProperties = {
  position: "absolute",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-light-color)",
  color: "var(--text-muted)",
  cursor: "pointer",
  opacity: 0,
  transition: "opacity 0.15s",
  zIndex: 4,
  padding: 0,
  fontSize: 16,
  lineHeight: 1,
  fontWeight: 400,
};

/** 마지막 행의 마지막 셀에 selection — 행 추가 시 맨 아래에 삽입 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function selectLastRowCell(editor: any, tableElement: any) {
  try {
    const tablePath = editor.api.findPath(tableElement);
    if (!tablePath) return;
    const rows = tableElement.children;
    const lastRowIdx = rows ? rows.length - 1 : 0;
    const lastRow = rows?.[lastRowIdx];
    const lastCellIdx = lastRow?.children ? lastRow.children.length - 1 : 0;
    // td > p > text — leaf까지 도달해야 함
    const cellPath = [...tablePath, lastRowIdx, lastCellIdx];
    const point = { path: [...cellPath, 0, 0], offset: 0 };
    editor.tf.select({ anchor: point, focus: point });
  } catch { /* ignore */ }
}

/** 첫 행의 마지막 셀에 selection — 열 추가 시 맨 오른쪽에 삽입 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function selectLastColCell(editor: any, tableElement: any) {
  try {
    const tablePath = editor.api.findPath(tableElement);
    if (!tablePath) return;
    const firstRow = tableElement.children?.[0];
    const lastCellIdx = firstRow?.children ? firstRow.children.length - 1 : 0;
    // td > p > text — leaf까지 도달해야 함
    const cellPath = [...tablePath, 0, lastCellIdx];
    const point = { path: [...cellPath, 0, 0], offset: 0 };
    editor.tf.select({ anchor: point, focus: point });
  } catch { /* ignore */ }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AddColumnBtn({ editor, tableElement }: { editor: any; tableElement: any }) {
  const [show, setShow] = useState(false);
  return (
    <div
      contentEditable={false}
      data-table-add-btn
      data-clickable
      role="button"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        selectLastColCell(editor, tableElement);
        recomputeTableIndices(editor);
        insertTableMergeColumn(editor);
        fixZeroColSizes(editor);
      }}
      style={{
        position: "absolute",
        top: 0,
        left: "calc(100% + var(--spacing-2xs))",
        width: 18,
        height: "100%",
        cursor: "pointer",
        zIndex: 4,
      }}
    >
      <div style={{
        ...addBtnBase,
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 999,
        opacity: show ? 1 : 0,
      }}>+</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AddRowBtn({ editor, tableElement, disabled, hovered, onHoverChange }: { editor: any; tableElement: any; disabled?: boolean; hovered: boolean; onHoverChange: (v: boolean) => void }) {
  return (
    <div
      contentEditable={false}
      data-table-add-btn
      data-clickable
      role="button"
      onMouseEnter={() => { if (!disabled) onHoverChange(true); }}
      onMouseLeave={() => onHoverChange(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // 마지막 행 아래에 추가
        try {
          selectLastRowCell(editor, tableElement);
          recomputeTableIndices(editor);
          insertTableMergeRow(editor);
        } catch { /* ignore */ }
      }}
      style={{
        width: "100%",
        height: 18,
        cursor: "pointer",
      }}
    >
      <div style={{
        ...addBtnBase,
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 999,
        opacity: hovered ? 1 : 0,
      }}>+</div>
    </div>
  );
}

function TableElementInner({ children, attributes, style, element }: PlateElementProps) {
  const editor = useEditorRef();
  const { props: tableProps } = useTableElement();
  // Plate v53: useTableElement 반환에서 isSelectingCell 가 빠지고 plugin API 로 이동.
  // 타입 정의 상 isSelectingCell 이 intersection 의 한쪽에만 있어서 unknown 으로 우회 cast.
  const isSelectingCell = useEditorSelector(
    (e) => (e.getApi(TablePlugin).table as unknown as { isSelectingCell: () => boolean }).isSelectingCell(),
    [],
  );
  const rawColSizes = useTableColSizes();
  const colSizes = Array.isArray(rawColSizes) ? rawColSizes : [];
  useSelectedCells();
  const tableRef = useRef<HTMLTableElement | null>(null);
  const initializedRef = useRef(false);

  const el = element as Record<string, unknown>;
  const caption = (el.caption as string) || "";
  const borderColor = (el.borderColor as string) || "var(--border-light-color)";
  const borderStyle = (el.borderStyle as string) || "solid";
  const borderWidth = (el.borderWidth as string) || "1px";
  const [captionEditing, setCaptionEditing] = useState(false);
  const [rowBtnHovered, setRowBtnHovered] = useState(false);

  const setTableAttr = useCallback((attrs: Record<string, unknown>) => {
    const path = editor.api.findPath(element);
    if (path) editor.tf.setNodes(attrs, { at: path });
  }, [editor, element]);

  // colSizes가 모두 0이면 컨테이너 너비 기반으로 균등 분배해 초기화
  // (예전엔 minWidth:100% + cells[i].offsetWidth 측정 방식이었으나, 셀 stretched 너비를 사용하다 보니
  //  열추가 후 inline-block 의 minWidth 100% 가 table 보다 커져서 AddColumnBtn 사이에 큰 여백이 생겼음)
  useEffect(() => {
    if (initializedRef.current) return;
    if (!tableRef.current) return;
    const allZero = colSizes.every((s) => !s);
    if (!allZero) { initializedRef.current = true; return; }
    const firstRow = tableRef.current.querySelector("tbody > tr");
    if (!firstRow) return;
    const numCols = firstRow.children.length;
    if (numCols === 0) return;

    const scrollContainer = tableRef.current.parentElement?.parentElement as HTMLElement | null;
    const containerWidth = scrollContainer?.clientWidth ?? 600;
    const available = Math.max(200, containerWidth - 26 /* paddingRight */);
    const targetWidth = Math.floor(available / numCols);

    const tablePath = editor.api.findPath(element);
    if (!tablePath) return;
    for (let i = 0; i < numCols; i++) {
      setTableColSize(editor, { colIndex: i, width: targetWidth }, { at: tablePath });
    }
    initializedRef.current = true;
  });

  // colSizes 합계로 테이블 너비 결정 (마지막 열 리사이즈 시 표 자체가 늘어남)
  const allSet = colSizes.length > 0 && colSizes.every((s) => s > 0);
  const totalWidth = allSet ? colSizes.reduce((sum, w) => sum + w, 0) : undefined;

  // attributes.ref와 tableRef를 합침
  const mergedRef = useCallback((node: HTMLTableElement | null) => {
    tableRef.current = node;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrRef = (attributes as any).ref;
    if (typeof attrRef === "function") attrRef(node);
    else if (attrRef) attrRef.current = node;
  }, [attributes]);

  const elPath = (() => { try { const p = editor.api.findPath(element); return p ? Array.from(p) : null; } catch { return null; } })();

  const { blockDragProps } = useBlockDrag(elPath);

  return (
    <BlockDropZone path={elPath}>
    <div {...blockDragProps}
      data-table-wrap
      style={{
        position: "relative",
        maxWidth: "100%",
        margin: "var(--spacing-2xs, 4px) 0 0 0",
        ["--tbl-border-color" as string]: borderColor,
        ["--tbl-border-style" as string]: borderStyle,
        ["--tbl-border-width" as string]: borderWidth,
      } as React.CSSProperties}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("td, th") && !target.closest("[data-table-add-btn]")) {
          e.preventDefault();
          e.stopPropagation();
          if (editor.selection) editor.tf.deselect();
          const active = document.activeElement as HTMLElement | null;
          if (active?.closest?.("[data-slate-editor]")) active.blur();
        }
      }}
    >
      <div style={{ overflowX: "auto", paddingRight: 26 }}>
        <div style={{ position: "relative", display: "inline-block", verticalAlign: "top" }}>
          <table
            {...attributes}
            ref={mergedRef}
            {...tableProps}
            style={{
              ...style,
              width: totalWidth ?? "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              borderRight: borderStyle === "none" ? "none" : `${borderWidth} ${borderStyle} ${borderColor}`,
              borderBottom: borderStyle === "none" ? "none" : `${borderWidth} ${borderStyle} ${borderColor}`,
              tableLayout: "fixed",
              userSelect: isSelectingCell ? "none" : undefined,
            }}
          >
            <colgroup contentEditable={false}>
              {colSizes.map((w, i) => (
                <col key={i} style={w ? { width: w } : undefined} />
              ))}
            </colgroup>
            <tbody>{children}</tbody>
          </table>
          {/* 열 추가 (오른쪽) — 표 바로 옆 */}
          <AddColumnBtn editor={editor} tableElement={element} />
        </div>
      </div>
      {/* 행 추가 — overflow-x:auto 가 overflow-y:clip 을 강제하므로 스크롤 컨테이너 바깥에 위치 */}
      <div contentEditable={false} style={{ position: "relative", marginTop: "var(--spacing-2xs)" }}>
        <AddRowBtn editor={editor} tableElement={element} disabled={captionEditing} hovered={rowBtnHovered} onHoverChange={setRowBtnHovered} />
      </div>
      {caption !== undefined && caption !== "" && (
        <div contentEditable={false}>
          <InlineCaption caption={caption} onCommit={(v) => setTableAttr({ caption: v || undefined })} onEditingChange={setCaptionEditing} autoEdit={!caption.trim()} />
        </div>
      )}
    </div>
    <BlockTailClickZone path={elPath} />
    </BlockDropZone>
  );
}

// ── 테이블 행 엘리먼트 ──
// Slate가 블록 사이에 삽입하는 빈 텍스트 노드(<span>)는 CSS로 숨김 (children 필터링하면 path 추적 깨짐)
export function TableRowElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="tr" style={{ ...props.style, position: "relative" }}>
      {props.children}
    </PlateElement>
  );
}

// ── 리사이즈 핸들 스타일 ──
// 셀의 borderRight/borderBottom 은 "none" 이고 시각적 경계선은 인접 셀의 borderLeft/borderTop
// (셀 경계에서 +1px 위치). 핸들을 그 선 위에 시각적으로 정렬하려면 outside 쪽으로 약간 더 밀어야 함.
const resizeHandleStyle = {
  right: { position: "absolute" as const, right: -3, top: 0, width: 6, height: "100%", cursor: "col-resize" as const, zIndex: 10, userSelect: "none" as const },
  bottom: { position: "absolute" as const, bottom: -3, left: 0, width: "100%", height: 6, cursor: "row-resize" as const, zIndex: 20, userSelect: "none" as const },
  left: { position: "absolute" as const, left: -3, top: 0, width: 6, height: "100%", cursor: "col-resize" as const, zIndex: 10, userSelect: "none" as const },
};

/** 현재 테이블의 셀 인덱스 재계산 — 병합 후 stale 캐시 방지 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function recomputeTableIndices(editor: any) {
  const tableEntry = getTableAbove(editor);
  if (tableEntry) {
    computeCellIndices(editor, { all: true, tableNode: tableEntry[0] });
  }
}

/** 열 추가 후 colSize=0인 열에 최소 너비 부여 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fixZeroColSizes(editor: any) {
  const tableEntry = getTableAbove(editor);
  if (!tableEntry) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tbl = tableEntry[0] as any;
  const colSizes: number[] = tbl.colSizes;
  if (!colSizes?.some((s: number) => !s)) return;
  const nonZero = colSizes.filter((s: number) => s > 0);
  const fallback = nonZero.length ? Math.round(nonZero.reduce((a: number, b: number) => a + b, 0) / nonZero.length) : 100;
  const fixed = colSizes.map((s: number) => s || fallback);
  editor.tf.setNodes({ colSizes: fixed }, { at: tableEntry[1] });
}

/** props.attributes에서 colspan/rowspan 등 잘못된 DOM property 제거 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanCellProps(rest: Record<string, any>) {
  if (rest.attributes) {
    const { colspan: _colspan, rowspan: _rowspan, ...cleanAttrs } = rest.attributes;
    return { ...rest, attributes: cleanAttrs };
  }
  return rest;
}

// ── 셀 스타일 빌더 (background, verticalAlign, cellBorders 등 노드 속성 반영) ──
type CellBorderVal = { style?: string; width?: string; color?: string } | null | undefined;
type CellBordersMap = { top?: CellBorderVal; right?: CellBorderVal; bottom?: CellBorderVal; left?: CellBorderVal };

function borderStr(side: CellBorderVal, fallback: string): string {
  if (side === null) return "none";
  if (!side) return fallback;
  const w = side.width || "1px";
  const s = side.style || "solid";
  const c = side.color || "var(--border-light-color)";
  return `${w} ${s} ${c}`;
}

function buildCellStyle(
  props: PlateElementProps,
  selected: boolean,
  minHeight: number | undefined,
  width: number | string,
  defaultBg?: string,
  _edges?: { top: boolean; bottom: boolean; left: boolean; right: boolean },
): React.CSSProperties {
  const el = props.element as Record<string, unknown>;
  const rawBg = (el.background as string) || defaultBg || undefined;
  const bg = rawBg;
  const cb = (el.cellBorders as CellBordersMap) || {};

  const tblFallback = "var(--tbl-border-width, 1px) var(--tbl-border-style, solid) var(--tbl-border-color, var(--border-light-color))";

  const result: React.CSSProperties = {
    backgroundColor: bg,
    verticalAlign: (el.verticalAlign as string) || undefined,
    position: "relative",
    padding: "6px 8px",
    borderTop: borderStr(cb.top, tblFallback),
    borderRight: borderStr(cb.right, "none"),
    borderBottom: borderStr(cb.bottom, "none"),
    borderLeft: borderStr(cb.left, tblFallback),
    transition: selected ? "none" : undefined,
    minWidth: 48,
    height: minHeight ?? undefined,
    width: width || undefined,
    overflow: "visible",
  };

  return result;
}

/** 선택 indicator overlay — border 위에 렌더링되어 다른 셀 border에 가려지지 않음 */
function CellSelectionOverlay({ edges, allSides }: {
  edges?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  allSides?: boolean;
}) {
  if (!edges && !allSides) return null;
  const w = 2;
  const c = "var(--color-accent)";
  const show = allSides
    ? { top: true, bottom: true, left: true, right: true }
    : edges;
  if (!show) return null;
  return (
    <div
      contentEditable={false}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 3,
        boxShadow: [
          show.top    ? `inset 0 ${w}px 0 0 ${c}` : "",
          show.bottom ? `inset 0 -${w}px 0 0 ${c}` : "",
          show.left   ? `inset ${w}px 0 0 0 ${c}` : "",
          show.right  ? `inset -${w}px 0 0 0 ${c}` : "",
        ].filter(Boolean).join(", ") || "none",
      }}
    />
  );
}

/** colspan/rowspan을 반영한 grid map을 만들어 인접 셀 선택 여부로 외곽 edge 판별 */
function getCellEdgesFromDOM(cellEl: HTMLElement | null): { top: boolean; bottom: boolean; left: boolean; right: boolean } {
  const edges = { top: true, bottom: true, left: true, right: true };
  if (!cellEl) return edges;

  const table = cellEl.closest("table");
  if (!table) return edges;

  const allRows = Array.from(table.querySelectorAll("tr"));

  // grid[row][col] = cellElement — colspan/rowspan 반영
  const grid: (HTMLElement | null)[][] = [];
  for (let r = 0; r < allRows.length; r++) {
    if (!grid[r]) grid[r] = [];
    const cells = Array.from(allRows[r].children) as HTMLElement[];
    let c = 0;
    for (const cell of cells) {
      while (grid[r][c]) c++;
      const cs = (cell as HTMLTableCellElement).colSpan || 1;
      const rs = (cell as HTMLTableCellElement).rowSpan || 1;
      for (let dr = 0; dr < rs; dr++) {
        for (let dc = 0; dc < cs; dc++) {
          if (!grid[r + dr]) grid[r + dr] = [];
          grid[r + dr][c + dc] = cell;
        }
      }
      c += cs;
    }
  }

  // 현재 셀이 차지하는 grid 범위 계산
  let minRow = Infinity, maxRow = -1, minCol = Infinity, maxCol = -1;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      if (grid[r][c] === cellEl) {
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
      }
    }
  }
  if (maxRow < 0) return edges;

  // top: 위쪽 인접 셀이 모두 선택 → edge 숨김
  if (minRow > 0) {
    let all = true;
    for (let c = minCol; c <= maxCol; c++) {
      const n = grid[minRow - 1]?.[c];
      if (!n || !n.hasAttribute("data-cell-selected")) { all = false; break; }
    }
    if (all) edges.top = false;
  }

  // bottom
  if (maxRow < grid.length - 1) {
    let all = true;
    for (let c = minCol; c <= maxCol; c++) {
      const n = grid[maxRow + 1]?.[c];
      if (!n || !n.hasAttribute("data-cell-selected")) { all = false; break; }
    }
    if (all) edges.bottom = false;
  }

  // left
  if (minCol > 0) {
    let all = true;
    for (let r = minRow; r <= maxRow; r++) {
      const n = grid[r]?.[minCol - 1];
      if (!n || !n.hasAttribute("data-cell-selected")) { all = false; break; }
    }
    if (all) edges.left = false;
  }

  // right
  const maxGridCol = Math.max(...grid.map(row => row?.length ?? 0)) - 1;
  if (maxCol < maxGridCol) {
    let all = true;
    for (let r = minRow; r <= maxRow; r++) {
      const n = grid[r]?.[maxCol + 1];
      if (!n || !n.hasAttribute("data-cell-selected")) { all = false; break; }
    }
    if (all) edges.right = false;
  }

  return edges;
}

// ── 커스텀 셀 리사이즈 훅 (인접 셀 영향 없이 현재 열만 조절) ──
function useCellResize(colIndex: number, rowIndex: number) {
  const editor = useEditorRef();
  const element = useElement();

  // 셀 path → 표 path/node (cell → row → table 이므로 -2)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTableEntry = (): [any, number[]] | null => {
    const cellPath = editor.api.findPath(element);
    if (!cellPath || cellPath.length < 2) return null;
    const tablePath = cellPath.slice(0, -2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = editor.api.node(tablePath) as any;
    if (!entry) return null;
    return [entry[0], tablePath];
  };

  const onRightPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const tableEntry = getTableEntry();
    if (!tableEntry) return;
    const [tableNode, tablePath] = tableEntry;
    const colSizes = (tableNode.colSizes as number[]) || [];
    const cell = (e.target as HTMLElement).closest("td,th") as HTMLElement | null;
    const tableEl = cell?.closest("table") as HTMLTableElement | null;
    const colgroup = tableEl?.querySelector("colgroup");
    const allCols = colgroup ? (Array.from(colgroup.children) as HTMLElement[]) : [];
    const colEl = allCols[colIndex];
    const firstRow = tableEl?.querySelector("tbody > tr");
    const firstRowCells = firstRow ? (Array.from(firstRow.children) as HTMLElement[]) : [];
    const startWidth = colSizes[colIndex] || cell?.offsetWidth || 100;
    const startX = e.clientX;
    const startTableWidth = tableEl?.offsetWidth ?? 0;
    let pending = startWidth;

    // 모든 col 에 explicit width 가 있어야 다른 col 이 redistribute 되지 않음
    // (colSize 가 비어 있는 col 이 있으면 fixed layout 에서 남은 공간 가져감)
    allCols.forEach((c, i) => {
      if (!c.style.width) {
        const w = firstRowCells[i]?.offsetWidth;
        if (w) c.style.width = `${w}px`;
      }
    });

    // 드래그 중 cursor 유지 — CursorTrail 의 mouseover-기반 감지가 셀 텍스트 위에서 text 로 바뀌는 것 방지
    document.body.setAttribute("data-cursor", "resizeH");
    // 드래그 동안 텍스트 선택/IME 진입 방지
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      pending = Math.max(48, startWidth + delta);
      // Slate transform 우회 — DOM 직접 갱신 (frame 100+ cell 재렌더링 비용 회피)
      if (colEl) colEl.style.width = `${pending}px`;
      // table 자체 width 도 같이 늘려야 다른 col 이 줄지 않음 (table-layout: fixed 에서
      // table.width 고정이면 sum 이 늘었을 때 다른 col 이 비례 축소됨)
      if (tableEl) tableEl.style.width = `${startTableWidth + (pending - startWidth)}px`;
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.body.removeAttribute("data-cursor");
      document.body.style.userSelect = "";
      // 최종 위치만 Slate state 에 commit (drag 중엔 DOM 만 변경됐음)
      setTableColSize(editor, { colIndex, width: pending }, { at: tablePath });
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, element, colIndex]);

  const onBottomPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const tableEntry = getTableEntry();
    if (!tableEntry) return;
    const [, tablePath] = tableEntry;
    const cell = (e.target as HTMLElement).closest("td,th") as HTMLElement | null;
    const tableEl = cell?.closest("table") as HTMLTableElement | null;
    // 행의 모든 cell 에 height 적용해야 행 전체가 따라옴 (cellStyle 에서 height: minHeight 사용)
    const rowEl = cell?.closest("tr") as HTMLTableRowElement | null;
    const rowCells = rowEl ? Array.from(rowEl.children) as HTMLElement[] : [];
    const startH = cell?.getBoundingClientRect().height ?? 40;
    const startY = e.clientY;
    let pending = startH;

    document.body.setAttribute("data-cursor", "resizeV");
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientY - startY;
      pending = Math.max(24, startH + delta);
      // DOM 직접 갱신
      for (const c of rowCells) c.style.height = `${pending}px`;
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.body.removeAttribute("data-cursor");
      document.body.style.userSelect = "";
      setTableRowSize(editor, { rowIndex, height: pending }, { at: tablePath });
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    // 사용하지 않는 tableEl 경고 회피 (DOM 직접 갱신을 row level 로 했음)
    void tableEl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, element, rowIndex]);

  return { onRightPointerDown, onBottomPointerDown };
}

// ── 테이블 셀 컴포넌트 (선택 하이라이트 + 커스텀 리사이즈 핸들) ──
/** 셀 선택 시 외곽 edge를 MutationObserver로 안정적으로 감지 */
function useSelectionEdges(
  cellRef: React.RefObject<HTMLTableCellElement | null>,
  selected: boolean,
) {
  const [edges, setEdges] = React.useState<{ top: boolean; bottom: boolean; left: boolean; right: boolean } | undefined>();

  React.useEffect(() => {
    if (!selected) { setEdges(undefined); return; }
    const cell = cellRef.current;
    if (!cell) return;

    const recompute = () => setEdges(getCellEdgesFromDOM(cell));

    // 초기 계산 (다른 셀 attribute가 이미 반영된 후)
    requestAnimationFrame(recompute);

    // 테이블 내 data-cell-selected 속성 변경 감지
    const table = cell.closest("table");
    if (!table) return;
    const observer = new MutationObserver(recompute);
    observer.observe(table, { attributes: true, attributeFilter: ["data-cell-selected"], subtree: true });
    return () => observer.disconnect();
  }, [selected, cellRef]);

  return edges;
}

/** 현재 셀에 커서가 위치하는지 감지 */
function useCellFocused(cellRef: React.RefObject<HTMLTableCellElement | null>) {
  const editor = useEditorRef();
  const element = useElement();
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    const check = () => {
      if (!editor.selection || !cellRef.current) { setFocused(false); return; }
      try {
        const cellEntry = editor.api.above({ at: editor.selection, match: { type: [editor.getType("td"), editor.getType("th")] } });
        setFocused(cellEntry ? cellEntry[0] === element : false);
      } catch { setFocused(false); }
    };
    check();
    // Slate selection 변경 시 재확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orig = (editor as any).onChange;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor as any).onChange = (...args: any[]) => { orig.apply(editor, args); check(); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { (editor as any).onChange = orig; };
  }, [editor, element, cellRef]);

  return focused;
}

export function TableCellElement(props: PlateElementProps) {
  const { selected, colIndex, colSpan, rowIndex, minHeight, width } = useTableCellElement();
  const { onRightPointerDown, onBottomPointerDown } = useCellResize(colIndex, rowIndex);
  const cellRef = React.useRef<HTMLTableCellElement>(null);
  const edges = useSelectionEdges(cellRef, selected);
  const focused = useCellFocused(cellRef);
  const el = props.element as Record<string, unknown>;
  const rowSpan = (el.rowSpan as number) || 1;

  React.useEffect(() => {
    const td = cellRef.current;
    if (!td) return;
    td.colSpan = colSpan > 1 ? colSpan : 1;
    td.rowSpan = rowSpan > 1 ? rowSpan : 1;
  }, [colSpan, rowSpan]);

  // data-cell-selected를 DOM에 직접 설정 (PlateElement가 커스텀 prop을 전달하지 않음)
  React.useEffect(() => {
    const td = cellRef.current;
    if (!td) return;
    if (selected) td.setAttribute("data-cell-selected", "");
    else td.removeAttribute("data-cell-selected");
  }, [selected]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleaned = cleanCellProps(props) as any;
  return (
    <PlateElement {...cleaned}
      as={"td" as unknown as "div"}
      ref={cellRef}
      style={buildCellStyle(props, selected, minHeight, width, undefined, edges)}
    >
      {props.children}
      {(selected || focused) && <CellSelectionOverlay edges={selected ? edges : undefined} allSides={!selected && focused} />}
      <div data-cursor="resizeH" onPointerDown={onRightPointerDown} style={resizeHandleStyle.right} />
      <div data-cursor="resizeV" onPointerDown={onBottomPointerDown} style={resizeHandleStyle.bottom} />
    </PlateElement>
  );
}

export function TableCellHeaderElement(props: PlateElementProps) {
  const { selected, colIndex, colSpan, rowIndex, minHeight, width } = useTableCellElement();
  const { onRightPointerDown, onBottomPointerDown } = useCellResize(colIndex, rowIndex);
  const cellRef = React.useRef<HTMLTableCellElement>(null);
  const edges = useSelectionEdges(cellRef, selected);
  const focused = useCellFocused(cellRef);
  const el = props.element as Record<string, unknown>;
  const rowSpan = (el.rowSpan as number) || 1;

  React.useEffect(() => {
    const th = cellRef.current;
    if (!th) return;
    th.colSpan = colSpan > 1 ? colSpan : 1;
    th.rowSpan = rowSpan > 1 ? rowSpan : 1;
  }, [colSpan, rowSpan]);

  // data-cell-selected를 DOM에 직접 설정
  React.useEffect(() => {
    const th = cellRef.current;
    if (!th) return;
    if (selected) th.setAttribute("data-cell-selected", "");
    else th.removeAttribute("data-cell-selected");
  }, [selected]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleaned = cleanCellProps(props) as any;
  return (
    <PlateElement {...cleaned}
      as={"th" as unknown as "div"}
      ref={cellRef}
      style={buildCellStyle(props, selected, minHeight, width, "var(--bg-tertiary)", edges)}
    >
      {props.children}
      {(selected || focused) && <CellSelectionOverlay edges={selected ? edges : undefined} allSides={!selected && focused} />}
      <div data-cursor="resizeH" onPointerDown={onRightPointerDown} style={resizeHandleStyle.right} />
      <div data-cursor="resizeV" onPointerDown={onBottomPointerDown} style={resizeHandleStyle.bottom} />
    </PlateElement>
  );
}
