import { computeCellIndices, getTableAbove, insertTableMergeColumn } from "@platejs/table";

/**
 * 표에서 무엇을 고를지 정하는 계산 — 표 전체, 행 하나, 열 하나, 마지막 칸.
 *
 * 화면을 그리지 않는다. 에디터와 칸 위치만 받아서 고를 범위를 정하거나 행·열을 더한다.
 * 그래서 이 파일만 따로 두면 무엇이 선택되는지를 화면 없이도 따져볼 수 있다.
 */

// 표 전체 선택 — 첫 셀~마지막 셀 범위.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function selectTableAll(editor: any, cellPath: number[]) {
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
export function selectTableRow(editor: any, cellPath: number[]) {
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
export function selectTableColumn(editor: any, cellPath: number[]) {
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

/** 마지막 행의 마지막 셀에 selection — 행 추가 시 맨 아래에 삽입 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function selectLastRowCell(editor: any, tableElement: any) {
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
export function applyHeaderToNewLine(editor: any, tablePath: number[] | null, axis: "row" | "col") {
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
export function addColumnAtEnd(editor: any, tableElement: any) {
  const tp = editor.api.findPath(tableElement);
  selectLastColCell(editor, tableElement);
  recomputeTableIndices(editor);
  insertTableMergeColumn(editor);
  fixZeroColSizes(editor);
  applyHeaderToNewLine(editor, tp ? Array.from(tp) : null, "col");
}

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
