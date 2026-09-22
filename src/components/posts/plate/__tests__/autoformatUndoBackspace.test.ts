import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { EditorKit } from "@/components/posts/plate/editor-kit";

/* 자동변환 되돌리기(Backspace)가 자동변환이 아닌 입력에도 걸리던 문제.
   문단 중간에서 스페이스·"-" 를 치면 "변환됐다" 로 잘못 판단해, 다음 Backspace 가 글자를 지우는 대신 editor.undo() 로
   직전 묶음(방금 친 글자들, 툴바의 서식 지우기 등)을 되돌리고 공백을 넣었다. 뒤로 가기처럼 보였다. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ed = any;

function editorWith(text: string): Ed {
  return createPlateEditor({ plugins: EditorKit, value: [{ type: "p", children: [{ text }] }] as never });
}
const textOf = (ed: Ed, i = 0) => ed.api.string([i]);

describe("자동변환 되돌리기 Backspace", () => {
  it("문단 중간에서 친 스페이스 뒤 Backspace 는 그 스페이스만 지운다", () => {
    const ed = editorWith("abcdef");
    ed.tf.select({ path: [0, 0], offset: 3 });
    ed.tf.insertText("x");
    ed.tf.insertText(" ");
    expect(textOf(ed)).toBe("abcx def");
    ed.tf.deleteBackward("character");
    expect(textOf(ed)).toBe("abcxdef");
  });

  it("문단 중간 '-' 도 자동변환으로 보지 않는다", () => {
    const ed = editorWith("abcdef");
    ed.tf.select({ path: [0, 0], offset: 3 });
    ed.tf.insertText("-");
    ed.tf.deleteBackward("character");
    expect(textOf(ed)).toBe("abcdef");
  });

  it("서식 지우기 뒤 Backspace 가 서식 지우기를 되돌리지 않는다", () => {
    const ed = editorWith("abcdef");
    ed.tf.select({ anchor: { path: [0, 0], offset: 0 }, focus: { path: [0, 0], offset: 3 } });
    ed.tf.addMarks({ bold: true });
    ed.tf.select({ path: [0, 1], offset: 0 });
    ed.tf.insertText(" ");
    ed.tf.select({ anchor: { path: [0, 0], offset: 0 }, focus: { path: [0, 0], offset: 3 } });
    ed.tf.removeMarks(["bold"]);
    ed.tf.select({ path: [0, 0], offset: 4 });
    ed.tf.deleteBackward("character");
    expect(textOf(ed)).toBe("abcdef");
    const bold = ed.children[0].children.some((c: { bold?: boolean }) => c.bold);
    expect(bold, "지운 서식이 되살아나면 안 된다").toBe(false);
  });

  it("줄 맨 앞 '# ' 자동변환 직후 Backspace 는 여전히 '# ' 로 되돌린다", () => {
    const ed = editorWith("");
    ed.tf.select({ path: [0, 0], offset: 0 });
    ed.tf.insertText("#");
    ed.tf.insertText(" ");
    expect(ed.children[0].type).toBe("h1");
    ed.tf.deleteBackward("character");
    expect(ed.children[0].type).toBe("p");
    expect(textOf(ed)).toBe("# ");
  });

  it("자동변환 뒤 다른 편집(툴바 등)이 끼면 Backspace 는 되돌리지 않고 글자를 지운다", () => {
    const ed = editorWith("");
    ed.tf.select({ path: [0, 0], offset: 0 });
    ed.tf.insertText("#");
    ed.tf.insertText(" ");
    expect(ed.children[0].type).toBe("h1");
    /* 키보드가 아니라 툴바로 들어온 편집 — 에디터 onKeyDown 을 거치지 않는다 */
    ed.tf.insertNodes({ text: "t" }, { select: true });
    ed.tf.deleteBackward("character");
    expect(ed.children[0].type, "변환이 되돌려지면 안 된다").toBe("h1");
  });

  for (const [typed, expectType] of [["-", undefined], [">", "blockquote"]] as const) {
    it(`줄 맨 앞 "${typed} " 자동변환도 Backspace 로 "${typed} " 가 된다`, () => {
      const ed = editorWith("");
      ed.tf.select({ path: [0, 0], offset: 0 });
      ed.tf.insertText(typed);
      ed.tf.insertText(" ");
      const converted = ed.children[0];
      expect(converted.type === "p" && !converted.listStyleType, "먼저 변환돼야 한다").toBe(false);
      if (expectType) expect(converted.type).toBe(expectType);
      ed.tf.deleteBackward("character");
      expect(ed.children[0].type).toBe("p");
      expect(ed.children[0].listStyleType).toBeUndefined();
      expect(textOf(ed)).toBe(`${typed} `);
    });
  }

  it("인라인 코드 변환(`x` + 스페이스) 직후 Backspace 는 백틱을 되살린다", () => {
    const ed = editorWith("");
    ed.tf.select({ path: [0, 0], offset: 0 });
    for (const ch of "`x`") ed.tf.insertText(ch);
    ed.tf.insertText(" ");
    const hasCode = ed.children[0].children.some((c: { code?: boolean }) => c.code);
    expect(hasCode, "먼저 코드로 변환돼야 한다").toBe(true);
    ed.tf.deleteBackward("character");
    expect(textOf(ed)).toBe("`x` ");
  });

  /* 사용자가 겪은 증상: 글머리표를 "-" 로 되돌린 뒤 Backspace 를 더 누르면 다시 글머리표가 되거나 커서가 다른 줄로 튀었다.
     되돌리며 다시 넣은 공백까지 "자동변환" 으로 오판해, 이어지는 Backspace 마다 undo 가 다시 돌았다 */
  for (const rest of ["", "abc"]) {
    it(`글머리표를 "-" 로 되돌린 뒤의 Backspace 는 평범하게 한 글자씩 지운다 (뒤 글자 ${JSON.stringify(rest)})`, () => {
      const ed: Ed = createPlateEditor({ plugins: EditorKit, value: [{ type: "p", children: [{ text: "prev line" }] }, { type: "p", children: [{ text: rest }] }] as never });
      ed.tf.select({ path: [1, 0], offset: 0 });
      ed.tf.insertText("-");
      ed.tf.insertText(" ");
      expect(ed.children[1].listStyleType).toBe("disc");
      const steps: string[] = [];
      for (let i = 0; i < 3; i++) {
        ed.tf.deleteBackward("character");
        steps.push(`${ed.children[1]?.listStyleType ?? "-"}|${ed.api.string([1])}|${ed.selection.anchor.path.join(".")}:${ed.selection.anchor.offset}`);
      }
      /* 되돌린 뒤로는 목록으로 돌아가지 않고, 커서는 같은 줄에서 한 칸씩 왼쪽으로 */
      expect(steps).toEqual([`-|- ${rest}|1.0:2`, `-|-${rest}|1.0:1`, `-|${rest}|1.0:0`]);
      ed.tf.deleteBackward("character");
      expect(ed.api.string([0]), "줄 맨 앞 Backspace 는 윗줄과 합친다").toBe(`prev line${rest}`);
    });
  }
});

/* 마크다운으로 만들 수 있는 블록은 맨 앞에서 Backspace 로 지웠을 때 표시가 그냥 사라지지 않고 글자로 되돌아온다.
   자동변환 직후뿐 아니라 다른 블록에 갔다 와도 같다(#1123). */
describe("블록 맨 앞 Backspace — 마크다운 표시 복원", () => {
  const block = (extra: Record<string, unknown>, text = "item") => ({ type: "p", children: [{ text }], ...extra });
  const cases: [string, Record<string, unknown>, string][] = [
    ["글머리표", { listStyleType: "disc", indent: 1 }, "- item"],
    ["번호 목록", { listStyleType: "decimal", indent: 1, listStart: 3 }, "3. item"],
    ["체크 목록", { listStyleType: "todo", indent: 1, checked: false }, "[] item"],
    ["체크된 목록", { listStyleType: "todo", indent: 1, checked: true }, "[x] item"],
    ["제목", { type: "h2" }, "## item"],
    ["제목 4", { type: "h4" }, "#### item"],
    ["인용", { type: "blockquote" }, "> item"],
  ];
  for (const [label, extra, expected] of cases) {
    it(`${label} 은 "${expected}" 로 되돌아오고 커서는 표시 뒤에 선다`, () => {
      const ed: Ed = createPlateEditor({ plugins: EditorKit, value: [{ type: "p", children: [{ text: "prev" }] }, block(extra)] as never });
      ed.tf.select({ path: [1, 0], offset: 0 });
      ed.tf.deleteBackward("character");
      expect(ed.children[1].type).toBe("p");
      expect(ed.children[1].listStyleType).toBeUndefined();
      expect(ed.api.string([1])).toBe(expected);
      expect(ed.selection.anchor).toEqual({ path: [1, 0], offset: expected.length - "item".length });
    });
  }

  it("다른 블록에 갔다 와도 표시가 되돌아온다", () => {
    const ed: Ed = createPlateEditor({ plugins: EditorKit, value: [{ type: "p", children: [{ text: "prev" }] }] as never });
    ed.tf.select({ path: [0, 0], offset: 4 });
    ed.tf.insertBreak();
    ed.tf.insertText("-");
    ed.tf.insertText(" ");
    ed.tf.insertText("item");
    expect(ed.children[1].listStyleType).toBe("disc");
    /* 윗줄에 갔다가 돌아온다 — 자동변환 되돌림 창은 닫힌다 */
    ed.tf.select({ path: [0, 0], offset: 0 });
    ed.tf.select({ path: [1, 0], offset: 0 });
    ed.tf.deleteBackward("character");
    expect(ed.api.string([1])).toBe("- item");
  });

  it("들여쓴 목록은 한 단계 줄이는 게 먼저다", () => {
    const ed: Ed = createPlateEditor({ plugins: EditorKit, value: [{ type: "p", children: [{ text: "prev" }] }, block({ listStyleType: "disc", indent: 2 })] as never });
    ed.tf.select({ path: [1, 0], offset: 0 });
    ed.tf.deleteBackward("character");
    expect(ed.children[1].listStyleType).toBe("disc");
    expect(ed.children[1].indent).toBe(1);
    ed.tf.deleteBackward("character");
    expect(ed.api.string([1])).toBe("- item");
  });

  it("평범한 문단 맨 앞 Backspace 는 그대로 윗줄과 합친다", () => {
    const ed: Ed = createPlateEditor({ plugins: EditorKit, value: [{ type: "p", children: [{ text: "prev" }] }, block({})] as never });
    ed.tf.select({ path: [1, 0], offset: 0 });
    ed.tf.deleteBackward("character");
    expect(ed.children).toHaveLength(1);
    expect(ed.api.string([0])).toBe("previtem");
  });
});
