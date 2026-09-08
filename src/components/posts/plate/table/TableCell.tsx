"use client";

import React, { useCallback } from "react";
import { PlateElement, type PlateElementProps, useEditorRef, useElement } from "platejs/react";
import { useTableCellElement } from "@platejs/table/react";
import { setTableColSize, setTableRowSize } from "@platejs/table";
import styles from "../../RichTextEditor.module.css";
import { CellSelectHandles } from "./TableRails";
import { COL_NOT_FROZEN, TableFreezeCtx } from "./tableFreeze";
import type { FreezeState } from "./tableFreeze";

/**
 * 칸 하나를 그리는 층 — 테두리, 폭 조절, 선택 표시, 고정된 자리.
 *
 * 표 전체가 아니라 칸 하나만 다룬다. 이웃한 칸과 테두리가 겹칠 때 어느 쪽을 보일지는
 * 화면에서 실제 위치를 재서 정한다.
 */

/** 고정 셀 정적 스타일 — 열 고정은 CSS sticky-left, 행 고정은 relative(z·transform pin 용).
 *  불투명 배경은 정지 상태엔 안 주고(투명 = 일반 셀처럼) 스크롤 stuck 될 때만 JS 가 DOM 으로 입힘.
 *  transform·구분선(box-shadow)도 스크롤 중 DOM. buildCellStyle 의 position:relative 뒤에 spread. */
function stickyCellStyle(freeze: FreezeState, rowIndex: number, colIndex: number): React.CSSProperties {
  const fr = rowIndex < freeze.rows;
  const cl = freeze.colLefts[colIndex];
  const fc = typeof cl === "number" && cl < COL_NOT_FROZEN; // 비고정 열은 sentinel
  if (!fr && !fc) return {};
  return {
    position: fc ? "sticky" : "relative",
    ...(fc ? { left: cl } : {}),
    zIndex: fr && fc ? 6 : fr ? 5 : 4,
    ...(fr ? { willChange: "transform" } : {}),
  };
}

// ── 리사이즈 핸들 스타일 ──
// 셀의 borderRight/borderBottom 은 "none" 이고 시각적 경계선은 인접 셀의 borderLeft/borderTop
// (셀 경계에서 +1px 위치). 핸들을 그 선 위에 시각적으로 정렬하려면 outside 쪽으로 약간 더 밀어야 함.
const resizeHandleStyle = {
  right: { position: "absolute" as const, right: -3, top: 0, width: 6, height: "100%", cursor: "col-resize" as const, zIndex: 10, userSelect: "none" as const },
  bottom: { position: "absolute" as const, bottom: -3, left: 0, width: "100%", height: 6, cursor: "row-resize" as const, zIndex: 20, userSelect: "none" as const },
  left: { position: "absolute" as const, left: -3, top: 0, width: 6, height: "100%", cursor: "col-resize" as const, zIndex: 10, userSelect: "none" as const },
};

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
  const c = side.color || "var(--border-color-light)";
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
  // var(--bg-primary) 는 직렬화가 헤더 th 에 넣는 불투명 base 의 잔재 — 커스텀 셀 색이 아니므로 무시하고
  // 기본 헤더 배경(defaultBg)을 사용. (deserializer 가 이 값을 el.background 로 잘못 저장하던 버그 방어)
  const elBg = el.background as string | undefined;
  const rawBg = (elBg && elBg !== "var(--bg-primary)") ? elBg : (defaultBg || undefined);
  const bg = rawBg;
  const cb = (el.cellBorders as CellBordersMap) || {};

  const tblFallback = "var(--tbl-border-width, 1px) var(--tbl-border-style, solid) var(--tbl-border-color, var(--border-color-light))";

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
  const editor = useEditorRef();
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

  const freeze = React.useContext(TableFreezeCtx);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleaned = cleanCellProps(props) as any;
  return (
    <PlateElement {...cleaned}
      as={"td" as unknown as "div"}
      ref={cellRef}
      style={{
        ...buildCellStyle(props, selected, minHeight, width, undefined, edges),
        ...stickyCellStyle(freeze, rowIndex, colIndex),
      }}
    >
      {props.children}
      {(selected || focused) && <CellSelectionOverlay edges={selected ? edges : undefined} allSides={!selected && focused} />}
      <CellSelectHandles editor={editor} element={props.element} rowIndex={rowIndex} />
      <div className={styles.tblCellResize} data-cursor="resizeH" onPointerDown={onRightPointerDown} style={resizeHandleStyle.right} />
      <div className={styles.tblCellResize} data-cursor="resizeV" onPointerDown={onBottomPointerDown} style={resizeHandleStyle.bottom} />
    </PlateElement>
  );
}

export function TableCellHeaderElement(props: PlateElementProps) {
  const editor = useEditorRef();
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

  const freeze = React.useContext(TableFreezeCtx);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleaned = cleanCellProps(props) as any;
  return (
    <PlateElement {...cleaned}
      as={"th" as unknown as "div"}
      ref={cellRef}
      style={{
        // 헤더 스타일은 표 레벨 CSS 변수로 주입 — 배경/글자색/굵기(미지정 시 기본값)
        ...buildCellStyle(props, selected, minHeight, width, "var(--tbl-header-bg, var(--bg-tertiary-alt))", edges),
        color: "var(--tbl-header-color, inherit)",
        fontWeight: "var(--tbl-header-weight, 700)" as unknown as number,
        // 행/열 고정 — 첫 행/열 sticky (buildCellStyle 의 인라인 position:relative 를 덮어씀)
        ...stickyCellStyle(freeze, rowIndex, colIndex),
      }}
    >
      {props.children}
      {(selected || focused) && <CellSelectionOverlay edges={selected ? edges : undefined} allSides={!selected && focused} />}
      <CellSelectHandles editor={editor} element={props.element} rowIndex={rowIndex} />
      <div className={styles.tblCellResize} data-cursor="resizeH" onPointerDown={onRightPointerDown} style={resizeHandleStyle.right} />
      <div className={styles.tblCellResize} data-cursor="resizeV" onPointerDown={onBottomPointerDown} style={resizeHandleStyle.bottom} />
    </PlateElement>
  );
}
