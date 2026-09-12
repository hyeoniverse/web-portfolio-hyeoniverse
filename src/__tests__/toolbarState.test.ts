import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { shallow } from "zustand/shallow";
import { EditorKit } from "@/components/posts/plate/editor-kit";
import { readToolbarState } from "@/components/posts/plate/hooks";

/* 본문 도구 막대는 readToolbarState 가 돌려준 값을 얕게 견줘, 같으면 다시 그리지 않는다(#877).
   값에 배열·객체가 섞이면 매번 달라 보여 한 글자마다 막대 전체를 다시 그리게 된다. */

const p = (text = "") => ({ type: "p", children: [{ text }] });

function makeEditor(text = "본문") {
  const editor = createPlateEditor({ plugins: EditorKit, value: [p(text)] as never });
  editor.tf.select({ path: [0, 0], offset: text.length });
  return editor;
}

describe("readToolbarState", () => {
  it("값은 모두 원시값이다", () => {
    const state = readToolbarState(makeEditor());
    for (const [key, value] of Object.entries(state)) {
      expect(["string", "boolean"], key).toContain(typeof value);
    }
  });

  it("글자를 이어 쳐도 같은 상태로 본다", () => {
    const editor = makeEditor();
    editor.tf.insertText("가");
    const before = readToolbarState(editor);
    editor.tf.insertText("나다");
    expect(shallow(before, readToolbarState(editor))).toBe(true);
  });

  it("굵게를 켜면 달라지고 bold 가 켜진다", () => {
    const editor = makeEditor();
    const before = readToolbarState(editor);
    editor.tf.toggleMark("bold");
    const after = readToolbarState(editor);
    expect(after.bold).toBe(true);
    expect(shallow(before, after)).toBe(false);
  });

  it("문단을 제목으로 바꾸면 블록 종류가 바뀐다", () => {
    const editor = makeEditor();
    editor.tf.toggleBlock("h2");
    expect(readToolbarState(editor).blockType).toBe("h2");
  });

  it("처음에는 되돌릴 것이 없고, 글자를 치면 되돌릴 수 있다", () => {
    const editor = makeEditor();
    expect(readToolbarState(editor).canUndo).toBe(false);
    editor.tf.insertText("가");
    expect(readToolbarState(editor)).toMatchObject({ canUndo: true, canRedo: false });
  });
});
