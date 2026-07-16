import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { EditorKit } from "../editor-kit";

/* 회귀 — 코드블록 전체를 Cmd+A 로 지운 뒤 붙여넣으면 첫 줄만 들어가고 나머지가 블록 밖으로 새던 문제.

   실제 브라우저에서 찍은 깨진 상태:
     줄 수: 0 / placeholder: "코드를 입력하세요" / code 자식: SPAN(=텍스트 노드)
     → code_block[text:"…"] — 자식이 code_line 이 아니라 raw 텍스트였다.

   이 상태를 아무도 못 고친다:
     · Plate 의 withNormalizeCodeBlock 은 setNodes({type: code_line}) 만 해서 텍스트엔 무력
     · Slate 는 children[0] 이 텍스트면 "텍스트를 담는 블록"으로 보고 그대로 둔다
   → 자기모순이 없어 영구히 남고, 커서가 code_block 안에 놓여 붙여넣기가 블록 밖으로 샌다. */

const dt = (text: string) =>
  ({ getData: (t: string) => (t === "text/plain" ? text : "") }) as unknown as DataTransfer;

/** 브라우저에서 관측된 깨진 모양 그대로 — code_block 의 자식이 텍스트 노드 */
const brokenValue = () => [
  { type: "p", children: [{ text: "앞" }] },
  { type: "code_block", lang: "xml", children: [{ text: "" }] },
  { type: "p", children: [{ text: "뒤" }] },
];

const mk = () =>
  createPlateEditor({
    plugins: EditorKit as never[],
    value: brokenValue(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

describe("code_block 구조 복구", () => {
  it("텍스트 자식이 code_line 으로 감싸진다", () => {
    const editor = mk();
    editor.tf.normalize({ force: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cb = editor.children[1] as any;
    expect(cb.type).toBe("code_block");
    expect(cb.children[0].type).toBe("code_line");
  });

  it("복구된 뒤 붙여넣으면 모든 줄이 블록 안에 들어간다 (핵심 증상)", () => {
    const editor = mk();
    editor.tf.normalize({ force: true });
    editor.tf.select(editor.api.start([1])!);
    // 커서가 code_line 안에 있어야 Plate 의 코드블록 붙여넣기가 동작한다
    expect(editor.api.block()?.[0]?.type).toBe("code_line");

    editor.tf.insertData(dt("b1\nb2\nb3"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cb = editor.children[1] as any;
    expect(cb.children.map((l: { children: { text: string }[] }) => l.children[0].text)).toEqual(["b1", "b2", "b3"]);
    // 블록 3개 그대로 — 나머지 줄이 밖으로 새지 않았다
    expect(editor.children).toHaveLength(3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor.children[2] as any).children[0].text).toBe("뒤");
  });

  it("내용이 있는 텍스트 자식도 보존하며 감싼다", () => {
    const editor = createPlateEditor({
      plugins: EditorKit as never[],
      value: [{ type: "code_block", lang: "xml", children: [{ text: '<main class="app">' }] }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    editor.tf.normalize({ force: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cb = editor.children[0] as any;
    expect(cb.children[0].type).toBe("code_line");
    expect(cb.children[0].children[0].text).toBe('<main class="app">');
  });

  it("정상 구조는 건드리지 않는다", () => {
    const editor = createPlateEditor({
      plugins: EditorKit as never[],
      value: [{ type: "code_block", lang: "xml", children: [{ type: "code_line", children: [{ text: "ok" }] }] }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    editor.tf.normalize({ force: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cb = editor.children[0] as any;
    expect(cb.children).toHaveLength(1);
    expect(cb.children[0].type).toBe("code_line");
    expect(cb.children[0].children[0].text).toBe("ok");
  });
});
