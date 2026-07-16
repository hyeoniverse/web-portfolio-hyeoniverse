import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { EditorKit } from "../editor-kit";

/* 회귀 — 코드블록이 아닌 곳에 코드를 붙여넣으면 markdown 파서가 갈가리 찢던 문제.

   markdown 은 4칸 들여쓰기만 코드로 보고 나머지 줄은 문단으로 가른다. 그래서 들여쓰기가 섞인
   실제 코드는 "문단 + code_block + 문단" 이 됐고(첫 줄·마지막 줄이 블록 밖), MDX 처리가
   `class` 를 `className` 으로 바꿔 **내용까지 훼손**했다. 언어도 안 잡혔다. */

const dt = (text: string, html?: string) =>
  ({ getData: (t: string) => (t === "text/plain" ? text : t === "text/html" ? (html ?? "") : "") }) as unknown as DataTransfer;

const mk = () =>
  createPlateEditor({
    plugins: EditorKit as never[],
    value: [{ type: "p", children: [{ text: "" }] }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const textOf = (n: any): string => n.text ?? (n.children || []).map(textOf).join("");

const HTML_SRC = `  <main class="app">
    <h1>제목</h1>

    <section class="card">
      <h2>카운터</h2>
      <button id="dec">-</button>
    </section>
  </main>`;

describe("코드블록 밖에 코드 붙여넣기", () => {
  it("HTML 전체가 코드블록 하나로 들어간다 (첫 줄·마지막 줄 포함)", () => {
    const editor = mk();
    editor.tf.select(editor.api.start([0])!);
    editor.tf.insertData(dt(HTML_SRC));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blocks = editor.children as any[];
    const cb = blocks.find((b) => b.type === "code_block");
    expect(cb).toBeTruthy();
    const lines = cb.children.map((l: unknown) => textOf(l));
    expect(lines[0]).toBe('  <main class="app">');   // 첫 줄이 블록 안
    expect(lines.at(-1)).toBe("  </main>");          // 마지막 줄이 블록 안
    expect(lines).toHaveLength(HTML_SRC.split("\n").length);
    // 코드블록 밖으로 샌 문단이 없다
    expect(blocks.filter((b) => b.type === "p" && textOf(b).trim() !== "")).toHaveLength(0);
  });

  it("언어가 자동 감지된다", () => {
    const editor = mk();
    editor.tf.select(editor.api.start([0])!);
    editor.tf.insertData(dt(HTML_SRC));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cb = (editor.children as any[]).find((b) => b.type === "code_block");
    expect(cb.lang).toBe("xml");
  });

  it("내용이 훼손되지 않는다 — class 가 className 으로 안 바뀐다", () => {
    const editor = mk();
    editor.tf.select(editor.api.start([0])!);
    editor.tf.insertData(dt(HTML_SRC));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cb = (editor.children as any[]).find((b) => b.type === "code_block");
    const joined = cb.children.map((l: unknown) => textOf(l)).join("\n");
    expect(joined).toContain('class="app"');
    expect(joined).not.toContain("className");
  });

  it("JS 도 감지해서 코드블록으로", () => {
    const editor = mk();
    editor.tf.select(editor.api.start([0])!);
    editor.tf.insertData(dt('const x = 1;\nfunction f() {\n  return x;\n}'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cb = (editor.children as any[]).find((b) => b.type === "code_block");
    expect(cb.lang).toBe("javascript");
    expect(cb.children).toHaveLength(4);
  });

  it("markdown 문서는 여전히 markdown 으로 파싱된다 (회귀 방지)", () => {
    const editor = mk();
    editor.tf.select(editor.api.start([0])!);
    editor.tf.insertData(dt("# 제목\n\n본문 문단입니다.\n\n- 항목 하나\n- 항목 둘"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const types = (editor.children as any[]).map((b) => b.type);
    expect(types).toContain("h1");
    expect(types).not.toContain("code_block");
  });

  it("text/html 이 있으면(리치 소스 복사) 건드리지 않는다", () => {
    const editor = mk();
    editor.tf.select(editor.api.start([0])!);
    editor.tf.insertData(dt("const x = 1;\nconst y = 2;", "<p>const x = 1;</p>"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor.children as any[]).find((b) => b.type === "code_block")).toBeUndefined();
  });

  it("평범한 여러 줄 산문은 코드블록이 되지 않는다", () => {
    const editor = mk();
    editor.tf.select(editor.api.start([0])!);
    editor.tf.insertData(dt("안녕하세요 반갑습니다\n오늘 날씨가 좋네요"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor.children as any[]).find((b) => b.type === "code_block")).toBeUndefined();
  });
});
