import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { EditorKit } from "../editor-kit";

/* 회귀 — "내용 제거" 후 붙여넣기가 코드블록 밖으로 새던 문제.
   원인: handleClear 가 removeNodes + insertNodes 로 블록을 통째로 갈아치웠고, removeNodes 가
   selection 을 날려 커서가 이전 형제 블록으로 튕겨나갔다. 그 상태로 붙여넣으면 Plate 의
   코드블록 붙여넣기 핸들러가 `api.block()` 이 code_line 이 아니라며 건너뛰고 기본 붙여넣기로
   떨어져서, 내용이 엉뚱한 블록에 꽂히고 코드블록은 빈 채(=placeholder 그대로) 남았다.

   여기서 지키는 불변식: **내용을 지운 뒤에도 커서가 블록 안에 있어야 한다.**
   그게 깨지면 붙여넣기가 조용히 밖으로 샌다. */

const dt = (text: string) =>
  ({ getData: (t: string) => (t === "text/plain" ? text : "") }) as unknown as DataTransfer;

const makeEditor = () =>
  createPlateEditor({
    plugins: EditorKit as never[],
    value: [
      { type: "p", children: [{ text: "앞" }] },
      {
        type: "code_block",
        lang: "xml",
        wrap: true,
        children: [
          { type: "code_line", children: [{ text: "a1" }] },
          { type: "code_line", children: [{ text: "a2" }] },
        ],
      },
      { type: "p", children: [{ text: "뒤" }] },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

/** elements.tsx 의 handleClear 와 같은 동작 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clearCodeBlock(editor: any, at: number[]) {
  const start = editor.api.start(at);
  const end = editor.api.end(at);
  if (start && end) editor.tf.delete({ at: { anchor: start, focus: end } });
  const caret = editor.api.start(at);
  if (caret) editor.tf.select(caret);
}

describe("코드블록 내용 제거 후 붙여넣기", () => {
  it("지운 뒤에도 커서가 블록 안에 남는다 (이게 깨지면 붙여넣기가 밖으로 샌다)", () => {
    const editor = makeEditor();
    editor.tf.select(editor.api.start([1])!);
    clearCodeBlock(editor, [1]);
    expect(editor.api.block()?.[0]?.type).toBe("code_line");
    expect(editor.selection?.anchor.path[0]).toBe(1);
  });

  it("지운 뒤 붙여넣으면 모든 줄이 블록 안에 들어간다", () => {
    const editor = makeEditor();
    editor.tf.select(editor.api.start([1])!);
    clearCodeBlock(editor, [1]);
    editor.tf.insertData(dt("b1\nb2\nb3"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cb = editor.children[1] as any;
    expect(cb.type).toBe("code_block");
    expect(cb.children.map((l: { children: { text: string }[] }) => l.children[0].text)).toEqual(["b1", "b2", "b3"]);
    // 블록이 3개 그대로 — 나머지 줄이 밖으로 새지 않았다
    expect(editor.children).toHaveLength(3);
  });

  it("이웃 블록이 오염되지 않는다", () => {
    const editor = makeEditor();
    editor.tf.select(editor.api.start([1])!);
    clearCodeBlock(editor, [1]);
    editor.tf.insertData(dt("b1\nb2\nb3"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor.children[0] as any).children[0].text).toBe("앞");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor.children[2] as any).children[0].text).toBe("뒤");
  });

  it("노드를 유지하므로 lang/wrap 이 보존된다 (블록 교체 방식은 이걸 잃었다)", () => {
    const editor = makeEditor();
    editor.tf.select(editor.api.start([1])!);
    clearCodeBlock(editor, [1]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cb = editor.children[1] as any;
    expect(cb.lang).toBe("xml");
    expect(cb.wrap).toBe(true);
  });

  it("첫 붙여넣기도 정상 (지우기 없이)", () => {
    const editor = makeEditor();
    editor.tf.select(editor.api.start([1])!);
    editor.tf.insertData(dt("x1\nx2"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor.children[1] as any).children.length).toBeGreaterThanOrEqual(2);
    expect(editor.children).toHaveLength(3);
  });
});
