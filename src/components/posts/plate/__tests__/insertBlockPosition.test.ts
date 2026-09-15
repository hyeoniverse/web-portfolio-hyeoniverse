import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { insertTable } from "@platejs/table";
import { insertToc } from "@platejs/toc";
import { insertEquation } from "@platejs/math";
import { EditorKit } from "@/components/posts/plate/editor-kit";
import { insertBlockHere, insertLibBlockHere } from "@/components/posts/plate/insertBlock";

/**
 * + 핸들/슬래시로 요소를 넣을 때 위치 회귀 안전망.
 *
 * + 버튼은 먼저 빈 문단을 바로 아래에 만들고 그 자리에서 메뉴를 연다. 삽입형 명령이 그 빈 문단을
 * "대체" 하지 않고 "다음"에 넣으면, 빈 줄이 남고 요소가 한 칸 아래로 가며 중첩 안에선 최상위로 튄다(#991).
 */

const p = (text = "") => ({ type: "p", children: [{ text }] });
const hr = () => ({ type: "hr", children: [{ text: "" }] });

function makeEditor(value: unknown[]) {
  return createPlateEditor({ plugins: EditorKit, value: value as never });
}
const types = (nodes: unknown[]) => (nodes as { type: string }[]).map((n) => n.type);

describe("insertBlockHere — 삽입 위치", () => {
  it("빈 문단 자리를 대체한다 (빈 줄이 남지 않는다)", () => {
    // [문단 A, 빈 문단] — + 버튼이 방금 만든 빈 문단에 커서가 있는 상태
    const editor = makeEditor([p("A"), p("")]);
    editor.tf.select({ path: [1, 0], offset: 0 });

    insertBlockHere(editor, hr());

    // 기대: [문단 A, hr]  (틀리면: [문단 A, 빈 문단, hr])
    expect(types(editor.children)).toEqual(["p", "hr"]);
  });

  it("내용이 있는 문단이면 바로 다음에 넣는다", () => {
    const editor = makeEditor([p("A"), p("B")]);
    editor.tf.select({ path: [0, 0], offset: 1 }); // 문단 A 안

    insertBlockHere(editor, hr());

    // 기대: [A, hr, B]
    expect(types(editor.children)).toEqual(["p", "hr", "p"]);
  });

  it("중첩(컬럼) 안 빈 문단이면 그 컬럼 안에 넣는다 — 최상위로 튀지 않는다", () => {
    const editor = makeEditor([
      {
        type: "column_group",
        children: [
          { type: "column", width: "50%", children: [p("왼쪽")] },
          { type: "column", width: "50%", children: [p("")] }, // 빈 문단 있는 오른쪽 컬럼
        ],
      },
    ]);
    // 오른쪽 컬럼의 빈 문단: [column_group=0, column=1, p=0]
    editor.tf.select({ path: [0, 1, 0, 0], offset: 0 });

    insertBlockHere(editor, hr());

    // 최상위는 여전히 column_group 하나뿐 (밖으로 안 나감)
    expect(types(editor.children)).toEqual(["column_group"]);
    // 오른쪽 컬럼 안의 빈 문단이 hr 로 대체됨
    const rightCol = (editor.children[0] as { children: { children: unknown[] }[] }).children[1];
    expect(types(rightCol.children)).toEqual(["hr"]);
  });
});

describe("insertLibBlockHere — 라이브러리 삽입 함수(table·toc·equation)", () => {
  // 이들은 노드를 직접 만들어 "현재 블록 다음"에 넣어, 예전엔 [문단, 빈 문단, 요소] 로 빈 줄이 남았다(#991).
  const emptyBelow = () => {
    const editor = makeEditor([p("A"), p("")]);
    editor.tf.select({ path: [1, 0], offset: 0 });
    return editor;
  };

  it("table — 빈 문단을 남기지 않는다", () => {
    const editor = emptyBelow();
    insertLibBlockHere(editor, (ed) => ed.tf.withMerging(() => insertTable(ed, { colCount: 2, rowCount: 2 })));
    expect(types(editor.children)).toEqual(["p", "table"]);
  });

  it("toc — 빈 문단을 남기지 않는다", () => {
    const editor = emptyBelow();
    insertLibBlockHere(editor, (ed) => insertToc(ed));
    expect(types(editor.children)).toEqual(["p", "toc"]);
  });

  it("equation — 빈 문단을 남기지 않는다", () => {
    const editor = emptyBelow();
    insertLibBlockHere(editor, (ed) => insertEquation(ed));
    expect(types(editor.children)).toEqual(["p", "equation"]);
  });
});
