import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { EditorKit } from "@/components/posts/plate/editor-kit";

/* 편집기에서 쓰는 제목은 h1~h4 다. h5·h6 는 마크다운으로도 만들어지지 않고, 예전 글에 있던 것만 그대로 그린다. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ed = any;

function typeMarkdown(prefix: string): Ed {
  const ed: Ed = createPlateEditor({ plugins: EditorKit, value: [{ type: "p", children: [{ text: "" }] }] as never });
  ed.tf.select({ path: [0, 0], offset: 0 });
  for (const ch of prefix) ed.tf.insertText(ch);
  ed.tf.insertText(" ");
  return ed;
}

describe("제목 단계", () => {
  for (const [prefix, type] of [["#", "h1"], ["##", "h2"], ["###", "h3"], ["####", "h4"]] as const) {
    it(`"${prefix} " 는 ${type} 로 바뀐다`, () => {
      const ed = typeMarkdown(prefix);
      expect(ed.children[0].type).toBe(type);
      expect(ed.api.string([0])).toBe("");
    });
  }

  for (const prefix of ["#####", "######"]) {
    it(`"${prefix} " 는 제목이 되지 않고 글자로 남는다`, () => {
      const ed = typeMarkdown(prefix);
      expect(ed.children[0].type).toBe("p");
      expect(ed.api.string([0])).toBe(`${prefix} `);
    });
  }

  it("예전 글의 h5·h6 는 그대로 남는다", () => {
    const ed: Ed = createPlateEditor({
      plugins: EditorKit,
      value: [{ type: "h5", children: [{ text: "old5" }] }, { type: "h6", children: [{ text: "old6" }] }] as never,
    });
    expect(ed.children.map((b: Ed) => b.type)).toEqual(["h5", "h6"]);
  });
});
