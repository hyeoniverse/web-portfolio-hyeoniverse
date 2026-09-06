import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { EditorKit } from "../editor-kit";
import { selectTableAll, selectTableRow, selectTableColumn } from "../table/tableSelection";

/* 표에서 무엇이 선택되는지를 화면 없이 확인한다.
   이 계산은 오랫동안 표를 그리는 1,300줄짜리 파일 안에 있어서 브라우저를 띄우지 않으면
   확인할 수 없었다. 계산만 따로 떼어내면서 검사할 수 있게 됐다. */

/** rows × cols 짜리 표 하나만 든 문서. */
const doc = (rows: number, cols: number) => [
  {
    type: "table",
    children: Array.from({ length: rows }, (_, r) => ({
      type: "tr",
      children: Array.from({ length: cols }, (_, c) => ({
        type: "td",
        children: [{ type: "p", children: [{ text: `r${r}c${c}` }] }],
      })),
    })),
  },
];

const makeEditor = (rows: number, cols: number) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPlateEditor({ plugins: EditorKit as never[], value: doc(rows, cols) } as any);

/** 선택 범위가 덮는 칸의 경로들 — [행, 열] 쌍으로 돌려준다. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function selectedCells(editor: any): string[] {
  const sel = editor.selection;
  if (!sel) return [];
  const [a, b] = [sel.anchor.path, sel.focus.path];
  const out: string[] = [];
  // 표는 [표, 행, 칸, ...] 순서라 경로의 2·3번째가 행·열이다.
  for (let r = a[1]; r <= b[1]; r++) {
    const lo = r === a[1] ? a[2] : 0;
    const hi = r === b[1] ? b[2] : editor.children[0].children[r].children.length - 1;
    for (let c = lo; c <= hi; c++) out.push(`${r},${c}`);
  }
  return out;
}

describe("표 선택 범위", () => {
  it("표 전체를 고르면 첫 칸부터 마지막 칸까지 덮는다", () => {
    const editor = makeEditor(3, 3);
    selectTableAll(editor, [0, 1, 1]);
    const sel = editor.selection!;
    expect(sel.anchor.path.slice(0, 3), "시작 칸").toEqual([0, 0, 0]);
    expect(sel.focus.path.slice(0, 3), "끝 칸").toEqual([0, 2, 2]);
  });

  it("행 하나를 고르면 그 행의 칸만 덮는다", () => {
    const editor = makeEditor(3, 3);
    selectTableRow(editor, [0, 1, 0]);
    expect(selectedCells(editor)).toEqual(["1,0", "1,1", "1,2"]);
  });

  it("열 하나를 고르면 모든 행의 같은 자리 칸을 덮는다", () => {
    const editor = makeEditor(3, 3);
    selectTableColumn(editor, [0, 0, 1]);
    const sel = editor.selection!;
    expect(sel.anchor.path.slice(0, 3), "첫 행의 그 열").toEqual([0, 0, 1]);
    expect(sel.focus.path.slice(0, 3), "마지막 행의 그 열").toEqual([0, 2, 1]);
  });

  it("행이 하나뿐인 표에서도 행 선택이 그 행을 덮는다", () => {
    const editor = makeEditor(1, 4);
    selectTableRow(editor, [0, 0, 2]);
    expect(selectedCells(editor)).toEqual(["0,0", "0,1", "0,2", "0,3"]);
  });

  it("표가 없는 위치를 넘겨도 터지지 않는다", () => {
    const editor = makeEditor(2, 2);
    expect(() => selectTableAll(editor, [99, 99, 99])).not.toThrow();
    expect(() => selectTableRow(editor, [99, 99, 99])).not.toThrow();
    expect(() => selectTableColumn(editor, [99, 99, 99])).not.toThrow();
  });
});
