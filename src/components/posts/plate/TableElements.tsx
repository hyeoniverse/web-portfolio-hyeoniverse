import React, { useState, useCallback, useEffect, useRef } from "react";
import { CAPTION_EDIT_EVENT } from "./constants";
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
import styles from "../RichTextEditor.module.css";
import { GripVertical, GripHorizontal, Grid2x2, Plus } from "lucide-react";

// 표 고정(freeze) 상태 — 열=CSS sticky-left, 행=JS transform pin(스크롤에 맞춰 translateY).
//  colLefts[colIndex] = 그 열의 sticky left(px, 음수면 negative sticky). COL_NOT_FROZEN 이면 비고정.
//  행 pin·stuck 구분선은 스크롤 중 DOM 직접 처리.
type FreezeState = { rows: number; cols: number; colLefts: number[] };
const TableFreezeCtx = React.createContext<FreezeState>({ rows: 0, cols: 0, colLefts: [] });

const TBL_STICKY_LINE = "var(--color-accent-alpha-50)"; // stuck 구분선 색 — 옅은 accent
// 열 고정 최대 비율 — 고정 열 합이 표시 너비의 이 비율을 넘으면 왼쪽 고정 열부터 sticky 해제(스크롤 영역 확보)
const FREEZE_MAX_RATIO = 0.6;
// colLefts 비고정 sentinel — 실제 offset(음수 negative sticky 포함)과 구분하려고 큰 값 사용
const COL_NOT_FROZEN = 1e9;

/** 스크롤 부모 찾기 — overflow-y auto/scroll 인 첫 조상(없으면 null=window). 행 단독 고정(페이지 sticky) stuck 판정용. */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement || null;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === "auto" || oy === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

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

// 표 전체 선택 — 첫 셀~마지막 셀 범위.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function selectTableAll(editor: any, cellPath: number[]) {
  try {
    const tablePath = cellPath.slice(0, -2);
    const tableEntry = editor.api.node(tablePath);
    if (!tableEntry) return;
    const rows = tableEntry[0].children;
    const nRows = rows.length;
    const lastLen = rows[nRows - 1].children.length;
    const anchor = editor.api.start([...tablePath, 0, 0]);
    const focus = editor.api.end([...tablePath, nRows - 1, lastLen - 1]);
    if (anchor && focus) editor.tf.select({ anchor, focus });
  } catch { /* noop */ }
}

// 행 전체 선택 — 첫 셀~마지막 셀 범위로 selection → table 플러그인이 그 행 셀들을 selected 로 표시.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function selectTableRow(editor: any, cellPath: number[]) {
  try {
    const rowPath = cellPath.slice(0, -1);
    const rowEntry = editor.api.node(rowPath);
    if (!rowEntry) return;
    const n = (rowEntry[0].children as unknown[]).length;
    const anchor = editor.api.start([...rowPath, 0]);
    const focus = editor.api.end([...rowPath, n - 1]);
    if (anchor && focus) editor.tf.select({ anchor, focus });
  } catch { /* noop */ }
}
// 열 전체 선택 — 같은 열 위치(첫 행 셀의 child index)의 첫 행~마지막 행 셀 범위. (병합 없는 일반 표 기준)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function selectTableColumn(editor: any, cellPath: number[]) {
  try {
    const childIdx = cellPath[cellPath.length - 1];
    const tablePath = cellPath.slice(0, -2);
    const tableEntry = editor.api.node(tablePath);
    if (!tableEntry) return;
    const rows = tableEntry[0].children;
    const nRows = rows.length;
    const topIdx = Math.min(childIdx, rows[0].children.length - 1);
    const botIdx = Math.min(childIdx, rows[nRows - 1].children.length - 1);
    const anchor = editor.api.start([...tablePath, 0, topIdx]);
    const focus = editor.api.end([...tablePath, nRows - 1, botIdx]);
    if (anchor && focus) editor.tf.select({ anchor, focus });
  } catch { /* noop */ }
}

// 열 선택 핸들 — 셀 안(첫 행). 행/전체 핸들은 스크롤 밖 rail(아래 SelectRail)에서 렌더.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CellSelectHandles({ editor, element, rowIndex }: { editor: any; element: any; rowIndex: number }) {
  if (rowIndex !== 0) return null;
  const onCol = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try { const p = editor.api.findPath(element); if (p) selectTableColumn(editor, Array.from(p) as number[]); } catch { /* noop */ }
  };
  return (
    <div className={styles.tblColSelect} data-col-handle contentEditable={false} data-cursor="pointer" title="열 전체 선택" onMouseDown={onCol}>
      <GripHorizontal size={11} strokeWidth={2} />
    </div>
  );
}

// 행/전체 선택 rail — 스크롤 컨테이너 바깥(wrapper)에 렌더. 각 행 y 중앙 + 좌상단(전체).
// 세로 스크롤이 없어 행 y는 정적 — 리사이즈/내용 변경 시 재측정.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TableSelectRail({ editor, tablePath, wrapRef, freezeRows = 0 }: { editor: any; tablePath: number[] | null; wrapRef: React.RefObject<HTMLDivElement | null>; freezeRows?: number }) {
  const [rows, setRows] = useState<{ y: number; hidden: boolean }[]>([]);
  // hover 중이거나 셀이 선택된 행 인덱스 — 그 행 핸들만 노출(모든 핸들 동시 노출 방지)
  const [active, setActive] = useState<number[]>([]);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let raf = 0, lastX: number | undefined, lastY: number | undefined;
    const compute = () => {
      raf = 0;
      const table = wrap.querySelector("table"); if (!table) return;
      const trs = Array.from(table.querySelectorAll(":scope > tbody > tr"));
      // 행 핸들 — 그 행 Y범위에 마우스가 있거나(가로 전체 감지) 그 행 셀이 선택됐을 때
      const set = new Set<number>();
      trs.forEach((tr, i) => {
        const r = tr.getBoundingClientRect();
        if (lastY != null && lastY >= r.top && lastY <= r.bottom) set.add(i);
        if (tr.querySelector("[data-cell-selected]")) set.add(i);
      });
      const arr = Array.from(set).sort((a, b) => a - b);
      setActive((prev) => (prev.length === arr.length && prev.every((v, k) => v === arr[k]) ? prev : arr));
      // 열 핸들 — 그 열 X범위에 마우스가 있거나(세로 전체 감지) 그 열 셀이 선택됐을 때 (핸들은 첫 행에 있지만 열 전체로 감지)
      const tr0 = table.getBoundingClientRect();
      const inY = lastY != null && lastY >= tr0.top && lastY <= tr0.bottom;
      table.querySelectorAll("[data-col-handle]").forEach((el) => {
        const h = el as HTMLElement;
        const cell = h.closest("td, th") as HTMLElement | null;
        if (!cell) return;
        const r = cell.getBoundingClientRect();
        const on = (inY && lastX != null && lastX >= r.left && lastX <= r.right) || cell.hasAttribute("data-cell-selected");
        if (on) h.setAttribute("data-col-active", ""); else h.removeAttribute("data-col-active");
      });
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(compute); };
    const onMove = (e: MouseEvent) => { lastX = e.clientX; lastY = e.clientY; schedule(); };
    const onLeave = () => { lastX = undefined; lastY = undefined; schedule(); };
    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    const mo = new MutationObserver(schedule); // 셀 선택(data-cell-selected) 변화 추적
    mo.observe(wrap, { attributes: true, subtree: true, attributeFilter: ["data-cell-selected"] });
    compute();
    return () => { wrap.removeEventListener("mousemove", onMove); wrap.removeEventListener("mouseleave", onLeave); mo.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [wrapRef]);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const sp = findScrollParent(wrap); // 에디터 세로 스크롤 컨테이너(band 판정용)
    let raf = 0;
    const measure = () => {
      raf = 0;
      const table = wrap.querySelector("table");
      if (!table) return;
      const wrapRect = wrap.getBoundingClientRect();
      const trs = Array.from(table.querySelectorAll(":scope > tbody > tr"));
      // 보이는 영역(band, 뷰포트 기준) 밖의 행 핸들은 숨김. 고정 행 블록 아래부터(그 뒤로 스크롤된 행 핸들 숨김).
      //  고정 행은 셀 transform 으로 pin 되어 tr rect 엔 안 잡히므로 pin offset 을 직접 더해 시각 위치 계산.
      const spRect = sp ? sp.getBoundingClientRect() : null;
      let bandTopVp = spRect ? spRect.top : -Infinity;
      const bandBotVp = spRect ? spRect.bottom : Infinity;
      const nFreeze = Math.min(freezeRows, trs.length);
      let pinOff = 0;
      if (nFreeze > 0) {
        const first = (trs[0] as HTMLElement).getBoundingClientRect();
        const pinLine = (spRect ? spRect.top : 0) + 10; // PIN_INSET
        pinOff = Math.max(0, pinLine - first.top);
        const last = (trs[nFreeze - 1] as HTMLElement).getBoundingClientRect();
        bandTopVp = Math.max(bandTopVp, last.bottom + pinOff); // 고정 블록 pin 된 하단
      }
      const next = trs.map((tr, i) => {
        const r = tr.getBoundingClientRect();
        const frozen = i < nFreeze;
        const vTop = frozen ? r.top + pinOff : r.top;    // 고정 행은 pin 위치
        const y = vTop - wrapRect.top + r.height / 2;    // rail 위치(wrap 기준)
        const vpc = vTop + r.height / 2;                 // 뷰포트 기준(숨김 판정)
        const hidden = frozen ? false : (vpc < bandTopVp + 1 || vpc > bandBotVp - 1);
        return { y, hidden };
      });
      setRows((prev) => (prev.length === next.length && prev.every((v, i) => Math.abs(v.y - next[i].y) < 0.5 && v.hidden === next[i].hidden) ? prev : next));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    const rafId = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    // scroll 은 버블 안 하므로 capture 단계로 잡아 중첩 스크롤(editorContent 등)까지 재측정. + resize.
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId); if (raf) cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", onScroll);
    };
  }, [wrapRef, freezeRows]);
  if (!tablePath) return null;
  const selRow = (e: React.MouseEvent, i: number) => {
    e.preventDefault(); e.stopPropagation();
    selectTableRow(editor, [...tablePath, i, 0]);
  };
  const selAll = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    selectTableAll(editor, [...tablePath, 0, 0]);
  };
  return (
    <div className={styles.tblSelectRail} contentEditable={false}>
      <div className={styles.tblAllSelect} data-cursor="pointer" title="표 전체 선택" onMouseDown={selAll}>
        <Grid2x2 size={11} strokeWidth={2} />
      </div>
      {rows.map((row, i) => row.hidden ? null : (
        <div key={i} className={styles.tblRowSelect} style={{ position: "absolute", top: row.y }} data-row-active={active.includes(i) ? "" : undefined} data-cursor="pointer" title="행 전체 선택" onMouseDown={(e) => selRow(e, i)}>
          <GripVertical size={11} strokeWidth={2} />
        </div>
      ))}
    </div>
  );
}
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
/** 행/열 추가 버튼 크기(px) — 행·열 버튼 동일 */
const TBL_ADD_BTN = 22;
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
  fontSize: 19,
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

/** 행/열 추가 후, 표에 헤더 행/열이 있으면 새로 생긴 축의 셀도 헤더(th)로 승격.
 *  새 라인은 항상 맨 끝(마지막 행/열)에 삽입됨. 헤더 여부는 새 라인을 **제외**하고 판단해야 함
 *  (새 셀은 td 라서 포함하면 every()가 항상 false 가 되어 승격이 안 됨).
 *  - axis="row": 첫 열이 (새 행 제외) 전부 th → 새 행의 첫 셀을 th
 *  - axis="col": 첫 행이 (새 열 제외) 전부 th → 새 열의 첫 셀을 th */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyHeaderToNewLine(editor: any, tablePath: number[] | null, axis: "row" | "col") {
  try {
    if (!tablePath) return;
    const entry = editor.api.node(tablePath);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (entry?.[0] as any)?.children as any[] | undefined;
    if (!rows?.length) return;
    editor.tf.withoutNormalizing(() => {
      if (axis === "row") {
        // 새 행 = 마지막 행. 헤더 열 판정은 기존 행들(마지막 제외)로.
        const lastRowIdx = rows.length - 1;
        const prevRows = rows.slice(0, -1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const colHeader = prevRows.length > 0 && prevRows.every((r: any) => r?.children?.[0]?.type === "th");
        if (colHeader && lastRowIdx >= 0) editor.tf.setNodes({ type: "th" }, { at: [...tablePath, lastRowIdx, 0] });
      } else {
        // 새 열 = 각 행의 마지막 셀. 헤더 행 판정은 첫 행의 기존 셀들(마지막 제외)로.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstRowCells = rows[0]?.children as any[] | undefined;
        if (!firstRowCells?.length) return;
        const lastColIdx = firstRowCells.length - 1;
        const prevCells = firstRowCells.slice(0, -1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rowHeader = prevCells.length > 0 && prevCells.every((c: any) => c?.type === "th");
        if (rowHeader && lastColIdx >= 0) editor.tf.setNodes({ type: "th" }, { at: [...tablePath, 0, lastColIdx] });
      }
    });
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

/** 열 추가 클릭 핸들러(공통) — 맨 오른쪽 열 삽입 + 헤더 승격 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addColumnAtEnd(editor: any, tableElement: any) {
  const tp = editor.api.findPath(tableElement);
  selectLastColCell(editor, tableElement);
  recomputeTableIndices(editor);
  insertTableMergeColumn(editor);
  fixZeroColSizes(editor);
  applyHeaderToNewLine(editor, tp ? Array.from(tp) : null, "col");
}

/** 열 추가 버튼(고정/비고정 공용) — 표 우측 끝 바로 옆(거터)에 위치하는 hover 존(행추가 버튼과 동일 패턴).
 *  표 rect 를 측정해 표 우측을 따라다니므로 표 위 콘텐츠에 절대 안 겹침. 평소 숨김 → hover 시 + 버튼 노출.
 *  표가 넓어 가로 스크롤 중이면 우측 끝이 화면 밖 → 스크롤로 우측 끝을 보이게 하면 그때 hover 로 접근. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AddColumnRail({ editor, tableElement, wrapRef }: { editor: any; tableElement: any; wrapRef: React.RefObject<HTMLDivElement | null> }) {
  const [box, setBox] = useState<{ left: number; top: number; height: number } | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const GAP = 4; // 표 우측과 버튼 사이 간격(거터)
    let raf = 0;
    const measure = () => {
      raf = 0;
      const table = wrap.querySelector("table");
      if (!table) return;
      const wr = wrap.getBoundingClientRect();
      const tr = table.getBoundingClientRect();
      const top = tr.top - wr.top;
      const height = tr.height;
      const left = (tr.right - wr.left) + GAP; // 표 우측 끝 바로 옆(거터) — 스크롤에 따라 표를 따라다님
      setBox((p) => (p && Math.abs(p.left - left) < 0.5 && Math.abs(p.top - top) < 0.5 && Math.abs(p.height - height) < 0.5 ? p : { left, top, height }));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    const rafId = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    // .tblScroll 가로 스크롤은 버블 안 하므로 capture 로 잡음. + resize.
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId); if (raf) cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", onScroll);
    };
  }, [wrapRef]);
  if (!box) return null;
  return (
    <div
      contentEditable={false}
      data-table-add-btn
      data-clickable
      role="button"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); addColumnAtEnd(editor, tableElement); }}
      style={{ position: "absolute", left: box.left, top: box.top, height: box.height, width: TBL_ADD_BTN, cursor: "pointer", zIndex: 15 }}
    >
      <div style={{
        ...addBtnBase,
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 999,
        // 평소 숨김 → hover 시 표 우측 끝에서 가로로 펼쳐지며 노출(접힐 땐 반대). 행추가 버튼과 동일한 reveal 성격.
        transformOrigin: "left center",
        transform: show ? "scaleX(1)" : "scaleX(0.35)",
        opacity: show ? 1 : 0,
        transition: "opacity 0.16s ease, transform 0.16s ease",
      }}><Plus size={14} /></div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AddRowBtn({ editor, tableElement, hovered }: { editor: any; tableElement: any; hovered: boolean }) {
  // hover 존(부모 wrapper)이 높이/hover 상태를 제어 → 버튼은 그 영역을 절대배치로 채우기만.
  return (
    <div
      contentEditable={false}
      data-table-add-btn
      data-clickable
      role="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // 마지막 행 아래에 추가
        try {
          const tp = editor.api.findPath(tableElement);
          selectLastRowCell(editor, tableElement);
          recomputeTableIndices(editor);
          insertTableMergeRow(editor);
          applyHeaderToNewLine(editor, tp ? Array.from(tp) : null, "row");
        } catch { /* ignore */ }
      }}
      style={{
        position: "absolute",
        inset: 0,
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
      }}><Plus size={14} /></div>
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
  // 행 추가 + 버튼 — 커서가 벗어나도 잠깐 유지(grace delay) → 좁은 영역에서 바로 닫혀 깜빡이는 것 방지
  const rowBtnTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRowBtn = React.useCallback(() => { if (rowBtnTimer.current) { clearTimeout(rowBtnTimer.current); rowBtnTimer.current = null; } setRowBtnHovered(true); }, []);
  const closeRowBtnDelayed = React.useCallback(() => {
    if (rowBtnTimer.current) clearTimeout(rowBtnTimer.current);
    rowBtnTimer.current = setTimeout(() => setRowBtnHovered(false), 400);
  }, []);
  React.useEffect(() => () => { if (rowBtnTimer.current) clearTimeout(rowBtnTimer.current); }, []);
  // 열 고정 누적 left(px) — CSS sticky-left offset. (행 pin·stuck 구분선은 스크롤 중 DOM 직접 처리)
  const [colLefts, setColLefts] = useState<number[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  // 캡션 input 은 (1) 이미 캡션이 있거나 (2) 툴바의 "캡션 추가" 버튼을 눌러 편집을 시작했을 때만 렌더.
  // 단순 선택만으로는 뜨지 않는다.
  const showCaption = !!(caption || captionEditing);

  // 툴바 캡션 버튼 → 표 DOM 노드에서 커스텀 이벤트가 버블 → 편집 모드 진입 + input focus.
  // (버튼 클릭 시 selection 이 표에서 벗어나 input 이 아직 없어도, 여기서 먼저 렌더시킨 뒤 focus)
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const handler = () => {
      setCaptionEditing(true);
      requestAnimationFrame(() => {
        const input = node.querySelector("[data-img-caption]") as HTMLElement | null;
        if (input) {
          input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
          setTimeout(() => input.focus(), 0);
        }
      });
    };
    node.addEventListener(CAPTION_EDIT_EVENT.table, handler);
    return () => node.removeEventListener(CAPTION_EDIT_EVENT.table, handler);
  }, []);

  const setTableAttr = useCallback((attrs: Record<string, unknown>) => {
    const path = editor.api.findPath(element);
    if (path) editor.tf.setNodes(attrs, { at: path });
  }, [editor, element]);

  // colSizes가 모두 0이면 컨테이너 너비 기반으로 균등 분배해 초기화
  // (예전엔 minWidth:100% + cells[i].offsetWidth 측정 방식이었으나, 셀 stretched 너비를 사용하다 보니
  //  열추가 후 inline-block 의 minWidth 100% 가 table 보다 커져서 열추가 버튼 사이에 큰 여백이 생겼음)
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
  // 화면 너비 맞춤은 이제 "일회성 실행"(툴바 버튼) — 열 너비를 그때 계산해 저장하므로 상시 fit 모드/상태 없음.
  const freezeRows = typeof el.freezeRows === "number" ? (el.freezeRows as number)
    : (el.freezeRow === true || el.freezeHeader === true ? 1 : 0);
  const freezeCols = typeof el.freezeCols === "number" ? (el.freezeCols as number)
    : (el.freezeCol === true ? 1 : 0);
  const rowFreeze = freezeRows > 0;
  const colFreeze = freezeCols > 0;
  const anyFreeze = rowFreeze || colFreeze;
  // 가로는 .tblScroll overflow-x auto 가 공간 부족 시 스크롤. 행은 JS transform pin.
  const scrollOverflow: React.CSSProperties = {};

  // 고정 처리 — 열 sticky-left offset(React 상태) + 행 pin(transform) + stuck 구분선/마스크(box-shadow).
  //  부드러움: 스크롤 중 "연속 rAF 루프"로 매 프레임 scrollTop 을 폴링해 적용(스크롤 이벤트 지연 제거).
  //  측정값은 캐시(reflow 없음), stuck 구분선도 DOM 직접(React 리렌더 없음).
  useEffect(() => {
    if (!anyFreeze) { setColLefts((p) => (p.length ? [] : p)); return; }
    const wrap = wrapRef.current; if (!wrap) return;
    const table = wrap.querySelector("table") as HTMLTableElement | null; if (!table) return;
    const scrollEl = wrap.querySelector("[data-tbl-scroll]") as HTMLElement | null;
    const sp = findScrollParent(wrap);
    const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 0.5);
    const PIN_INSET = 10; // 헤더를 핀 라인보다 이만큼 아래에 → 위 여백에 열 선택 핸들 노출
    let base = 0, maxOff = 0, blockH = 0, rowCells: HTMLElement[] = [];
    let edges: { c: HTMLElement; fr: boolean; fc: boolean; t: boolean; b: boolean; l: boolean; r: boolean }[] = [];
    let colHandles: { h: HTMLElement; cell: HTMLElement; frozen: boolean }[] = [];
    const applyAt = (s: number) => {
      const off = freezeRows > 0 ? Math.max(0, Math.min(s - base, maxOff)) : 0;
      const tf = off > 0.5 ? `translate3d(0,${off}px,0)` : "";
      for (const c of rowCells) c.style.transform = tf;
      const rowStuck = off > 0.5;
      const colStuck = colFreeze && !!scrollEl && scrollEl.scrollLeft > 0;
      // 스크롤로 고정 블록 뒤에 가려진 비고정 열의 열-핸들은 숨김(핸들이 z 높아 고정 블록 위로 삐져나오므로).
      //  핸들 중심이 고정 블록 오른쪽 경계보다 왼쪽(뒤)이면 숨김. 부분적으로 가려진 열도 처리.
      if (colHandles.length) {
        const boundary = colStuck ? edges.find((e) => e.r)?.c : null;
        const frozenRight = boundary ? boundary.getBoundingClientRect().right : -Infinity;
        for (const { h, frozen } of colHandles) {
          const hr = h.getBoundingClientRect();
          const hide = colStuck && !frozen && (hr.left + hr.right) / 2 < frozenRight;
          h.style.visibility = hide ? "hidden" : "";
        }
      }
      for (const e of edges) {
        // 불투명 배경 — stuck(스크롤) 됐을 때만. 정지 시엔 투명(일반 셀처럼) → 배경색 안 바뀜.
        //  셀 자체 배경(el.background/헤더 tint, 반투명 가능)을 불투명 base(--bg-primary) 위에 얹어 완전 불투명화.
        const needBg = (e.fr && rowStuck) || (e.fc && colStuck);
        if (needBg) {
          const cellBg = e.c.style.backgroundColor || "var(--bg-primary)";
          e.c.style.backgroundImage = `linear-gradient(${cellBg}, ${cellBg}), linear-gradient(var(--bg-primary), var(--bg-primary))`;
        } else e.c.style.backgroundImage = "";
        const parts: string[] = [];
        // 상단/좌측(고정 블록 바깥 모서리)은 셀 자체 테두리(1px)가 이미 있으니 마스크만.
        // 스크롤 경계(하단=행 고정, 우측=열 고정)만 2px 구분선 — 인접 셀 테두리가 스크롤로 사라지므로.
        if (rowStuck && e.t) parts.push(`0 -${PIN_INSET + 8}px 0 0 var(--bg-primary)`);
        if (rowStuck && e.b) parts.push(`inset 0 -2px 0 ${TBL_STICKY_LINE}`);
        if (colStuck && e.r) parts.push(`inset -2px 0 0 ${TBL_STICKY_LINE}`);
        e.c.style.boxShadow = parts.join(", ");
      }
    };
    // 연속 rAF 루프 — 스크롤 중 매 프레임 폴링(이벤트 지연 없이 컴포지터와 근접 동기), idle 시 정지.
    //  세로(행 pin) + 가로(열 경계)를 모두 추적 — 가로만 스크롤해도 루프가 살아 border 갱신.
    let looping = false, idle = 0, lastS = NaN, lastL = NaN, rafId = 0;
    const readS = () => (sp ? sp.scrollTop : window.scrollY);
    const frame = () => {
      const s = readS();
      const l = scrollEl ? scrollEl.scrollLeft : 0;
      if (s !== lastS || l !== lastL) { lastS = s; lastL = l; idle = 0; applyAt(s); } else idle++;
      if (idle > 6) { looping = false; return; }
      rafId = requestAnimationFrame(frame);
    };
    // base(표의 스크롤-콘텐츠 상 위치)만 가볍게 재계산 — 표 크기 그대로여도 위 블록 reflow 로 위치만
    // 바뀐 경우(ResizeObserver 가 못 잡음)를 스크롤 시작마다 보정. transform/state 는 안 건드려 flicker 없음.
    const refreshBase = () => {
      const rect = table.getBoundingClientRect();
      maxOff = Math.max(0, rect.height - blockH);
      base = (sp ? rect.top - sp.getBoundingClientRect().top + sp.scrollTop : rect.top + window.scrollY) - PIN_INSET;
    };
    const onScroll = () => { if (!looping) { looping = true; idle = 0; refreshBase(); rafId = requestAnimationFrame(frame); } };
    const measure = () => {
      // 이전 인라인 스타일 정리(리사이즈로 sticky 열 구성이 바뀌면 잔상 방지)
      for (const c of rowCells) c.style.transform = "";
      for (const e of edges) { e.c.style.boxShadow = ""; e.c.style.backgroundImage = ""; }
      const trs = Array.from(table.querySelectorAll(":scope > tbody > tr")) as HTMLElement[];
      const frozenRows = trs.slice(0, freezeRows);
      rowCells = frozenRows.flatMap((tr) => Array.from(tr.children) as HTMLElement[]);
      const firstCells = trs[0] ? Array.from(trs[0].children) : [];
      // 열 sticky offset — 고정 열 합이 표시 너비의 FREEZE_MAX_RATIO 를 넘으면 왼쪽 고정 열부터 sticky 해제(-1),
      //  오른쪽(마지막) 고정 열 우선 유지. 스크롤 영역은 항상 (1-RATIO) 이상 확보. 최소 1개(마지막)는 유지.
      const nCols = firstCells.length;
      const colLefts: number[] = new Array(nCols).fill(COL_NOT_FROZEN);
      if (freezeCols > 0 && nCols > 0) {
        const widths = firstCells.map((c) => (c as HTMLElement).getBoundingClientRect().width);
        const view = scrollEl ? scrollEl.clientWidth : 0;
        const budget = view > 0 ? view * FREEZE_MAX_RATIO : Infinity;
        // 오른쪽(마지막)부터 왼쪽으로, budget 안에 들어가는 만큼만 유지.
        let start = freezeCols, acc = 0;
        for (let j = freezeCols - 1; j >= 0; j--) {
          if (acc + (widths[j] || 0) <= budget) { acc += widths[j] || 0; start = j; } else break;
        }
        if (start === freezeCols) {
          // 마지막 열조차 budget 초과 → 그 열만 negative sticky 로 오른쪽 budget폭만 고정(왼쪽은 스크롤)
          colLefts[freezeCols - 1] = Math.min(0, budget - (widths[freezeCols - 1] || 0));
        } else {
          let left = 0;
          for (let j = start; j < freezeCols; j++) { colLefts[j] = left; left += widths[j] || 0; }
        }
      }
      setColLefts((prev) => (same(prev, colLefts) ? prev : colLefts));
      const colStart = colLefts.findIndex((v) => v < COL_NOT_FROZEN); // 실제 sticky 시작 열
      edges = [];
      trs.forEach((tr, i) => Array.from(tr.children).forEach((cell, j) => {
        const fr = i < freezeRows, fc = colLefts[j] < COL_NOT_FROZEN;
        if (!fr && !fc) return;
        edges.push({ c: cell as HTMLElement, fr, fc, t: fr && i === 0, b: fr && i === freezeRows - 1, l: fc && j === colStart, r: fc && j === freezeCols - 1 });
      }));
      // 열-핸들(첫 행 셀) 목록 — 고정 블록 뒤로 가려질 때 숨기려고
      for (const { h } of colHandles) h.style.visibility = "";
      colHandles = [];
      if (trs[0]) Array.from(trs[0].children).forEach((cell, j) => {
        const h = (cell as HTMLElement).querySelector("[data-col-handle]") as HTMLElement | null;
        if (h) colHandles.push({ h, cell: cell as HTMLElement, frozen: colLefts[j] < COL_NOT_FROZEN });
      });
      blockH = 0; frozenRows.forEach((tr) => { blockH += tr.getBoundingClientRect().height; });
      const rect = table.getBoundingClientRect();
      maxOff = Math.max(0, rect.height - blockH);
      // base = 표 상단 콘텐츠 좌표 - PIN_INSET → off = scrollTop - base (핀 라인보다 PIN_INSET 아래에 붙음)
      base = (sp ? rect.top - sp.getBoundingClientRect().top + sp.scrollTop : rect.top + window.scrollY) - PIN_INSET;
      lastS = NaN; lastL = NaN; applyAt(readS());
    };
    measure();
    // 초기 레이아웃이 늦게 안정될 때(폰트·이미지·에디터 하이드레이션) base 재측정.
    //  특히 새로고침은 스크롤 위치를 복원해서, 표가 이미 스크롤된 채 마운트되면 정지 상태에서도 pin 이 틀어진다.
    let settleCancelled = false;
    const remeasure = () => { if (!settleCancelled) measure(); };
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(remeasure));
    document.fonts?.ready.then(remeasure).catch(() => {});
    window.addEventListener("load", remeasure);
    const vt: Window | HTMLElement = sp || window;
    vt.addEventListener("scroll", onScroll, { passive: true });
    if (scrollEl) scrollEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    const ro = new ResizeObserver(measure); ro.observe(table); if (sp) ro.observe(sp);
    return () => {
      settleCancelled = true;
      cancelAnimationFrame(raf2);
      window.removeEventListener("load", remeasure);
      vt.removeEventListener("scroll", onScroll);
      if (scrollEl) scrollEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      for (const c of rowCells) { c.style.transform = ""; c.style.boxShadow = ""; }
      for (const e of edges) { e.c.style.boxShadow = ""; e.c.style.backgroundImage = ""; }
      for (const { h } of colHandles) h.style.visibility = "";
    };
  }, [freezeRows, freezeCols, anyFreeze, colFreeze]);
  // 헤더 전용 스타일 — 표 레벨 CSS 변수로 th 에 주입 (미지정 시 th 기본값 사용)
  const headerBg = el.headerBg as string | undefined;
  const headerColor = el.headerColor as string | undefined;
  const headerBold = el.headerBold; // undefined = 기본 굵게 / false = 보통

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
    <TableFreezeCtx.Provider value={{ rows: freezeRows, cols: freezeCols, colLefts }}>
    <div {...blockDragProps}
      ref={wrapRef}
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
      {/* 행/전체 선택 rail — 스크롤 밖(wrapper)이라 가로 스크롤해도 좌측에 항상 보임 */}
      <TableSelectRail editor={editor} tablePath={elPath} wrapRef={wrapRef} freezeRows={freezeRows} />
      {/* 상단 여백 + 동일 음수 margin — 표 위치는 그대로 두면서 열/전체 핸들이 위 테두리에 걸쳐도 안 잘리게.
          엑셀 틀 고정: 고정 시 표 내부 2D 스크롤 박스(maxHeight + overflow auto)에서 행·열 sticky. */}
      <div className={styles.tblScroll} data-tbl-scroll style={{
        paddingTop: 9, marginTop: -9,
        ...scrollOverflow,
      }}>
        <div style={{ position: "relative", display: anyFreeze ? "block" : "inline-block", verticalAlign: "top" }}>
          <table
            {...attributes}
            ref={mergedRef}
            {...tableProps}
            data-freeze-row={rowFreeze ? "" : undefined}
            data-freeze-col={colFreeze ? "" : undefined}
            style={{
              ...style,
              width: totalWidth ?? "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              borderRight: borderStyle === "none" ? "none" : `${borderWidth} ${borderStyle} ${borderColor}`,
              borderBottom: borderStyle === "none" ? "none" : `${borderWidth} ${borderStyle} ${borderColor}`,
              tableLayout: "fixed",
              userSelect: isSelectingCell ? "none" : undefined,
              ...(headerBg ? { ["--tbl-header-bg" as string]: headerBg } : {}),
              ...(headerColor ? { ["--tbl-header-color" as string]: headerColor } : {}),
              ...(headerBold === false ? { ["--tbl-header-weight" as string]: "400" } : {}),
            } as React.CSSProperties}
          >
            <colgroup contentEditable={false}>
              {colSizes.map((w, i) => {
                const colStyle = w ? { width: w } : undefined;
                return <col key={i} style={colStyle} />;
              })}
            </colgroup>
            <tbody>{children}</tbody>
          </table>
        </div>
      </div>
      {/* 열 추가(고정/비고정 공용) — 스크롤 컨테이너 밖(wrapper)이라 어떤 overflow 에도 안 잘림.
          표 우측 끝 ↔ .tblScroll 뷰포트 우측 끝 중 더 왼쪽에 배치(TableSelectRail 좌측 rail 과 대칭). */}
      <AddColumnRail editor={editor} tableElement={element} wrapRef={wrapRef} />
      {/* 행 추가 — 평소엔 얇은 hover 존이라 캡션이 표 바로 아래에 붙고,
          이 영역에 hover 하면 버튼이 나타나며 그 높이만큼 캡션이 자연스럽게 아래로 내려감.
          (overflow-x:auto 가 overflow-y:clip 을 강제하므로 스크롤 컨테이너 바깥에 위치) */}
      <div
        contentEditable={false}
        onMouseEnter={() => { if (!captionEditing) openRowBtn(); }}
        onMouseLeave={closeRowBtnDelayed}
        style={{
          // 상단 위치는 고정(marginTop 불변) — hover 시 이게 바뀌면 커서가 margin 영역에 놓여
          // mouseenter/leave 가 반복(깜빡임)됨. 높이만 아래로 늘려 캡션을 밀어낸다.
          position: "relative",
          width: totalWidth,
          maxWidth: "100%",
          height: rowBtnHovered ? 24 : 6,
          // 가로 스크롤바(.tblScroll padding-bottom: md)가 행버튼을 밀어내지 않게, 밴드 위로 끌어올려
          // 표에서 항상 2xs 간격에 고정. (스크롤바는 md 밴드 아래에 위치 — 서로 안 밀어냄)
          marginTop: "calc(var(--spacing-2xs) - var(--spacing-md))",
          transition: "height 0.15s ease",
        }}
      >
        <AddRowBtn editor={editor} tableElement={element} hovered={rowBtnHovered} />
      </div>
      {showCaption && (
        <div contentEditable={false} style={{ width: totalWidth, maxWidth: "100%" }}>
          <InlineCaption caption={caption} onCommit={(v) => setTableAttr({ caption: v || undefined })} onEditingChange={setCaptionEditing} />
        </div>
      )}
    </div>
    <BlockTailClickZone path={elPath} />
    </TableFreezeCtx.Provider>
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
  // var(--bg-primary) 는 직렬화가 헤더 th 에 넣는 불투명 base 의 잔재 — 커스텀 셀 색이 아니므로 무시하고
  // 기본 헤더 배경(defaultBg)을 사용. (deserializer 가 이 값을 el.background 로 잘못 저장하던 버그 방어)
  const elBg = el.background as string | undefined;
  const rawBg = (elBg && elBg !== "var(--bg-primary)") ? elBg : (defaultBg || undefined);
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
      <div data-cursor="resizeH" onPointerDown={onRightPointerDown} style={resizeHandleStyle.right} />
      <div data-cursor="resizeV" onPointerDown={onBottomPointerDown} style={resizeHandleStyle.bottom} />
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
      <div data-cursor="resizeH" onPointerDown={onRightPointerDown} style={resizeHandleStyle.right} />
      <div data-cursor="resizeV" onPointerDown={onBottomPointerDown} style={resizeHandleStyle.bottom} />
    </PlateElement>
  );
}
