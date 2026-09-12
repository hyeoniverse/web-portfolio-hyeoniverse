import { describe, it, expect } from "vitest";
import { createPlateEditor } from "platejs/react";
import { shallow } from "zustand/shallow";
import { EditorKit } from "@/components/posts/plate/editor-kit";
import { readToolbarState, createTextStyleStore, type TextStyleFromDom } from "@/components/posts/plate/hooks";

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

/* 도구 막대의 글꼴·크기·줄 간격은 마크·블록 값이 없으면 커서 자리의 계산된 스타일로 채운다(#895). 편집기가 바뀐 순간에는
   DOM 이 아직 이전 블록이라, 본문 편집기가 커밋 뒤에 refresh() 로 다시 읽고 값이 바뀔 때만 막대에 알린다. */
describe("createTextStyleStore", () => {
  const paragraph: TextStyleFromDom = { fontFamily: "Pretendard", fontSize: "16px", lineHeight: "1.6" };
  const heading: TextStyleFromDom = { fontFamily: "Pretendard", fontSize: "32px", lineHeight: "1.25" };

  it("같은 값을 다시 읽으면 알리지 않고 객체도 그대로 둔다", () => {
    const store = createTextStyleStore(() => ({ ...paragraph }));
    let calls = 0;
    store.subscribe(() => { calls++; });
    store.refresh();
    const first = store.getSnapshot();
    store.refresh();
    expect(calls).toBe(1);
    expect(store.getSnapshot()).toBe(first);
  });

  it("블록이 바뀌어 값이 달라지면 새 값으로 바꾸고 한 번 알린다", () => {
    let dom = paragraph;
    const store = createTextStyleStore(() => ({ ...dom }));
    store.refresh();
    let calls = 0;
    store.subscribe(() => { calls++; });
    dom = heading;
    store.refresh();
    expect(calls).toBe(1);
    expect(store.getSnapshot()).toEqual(heading);
  });

  it("도구 막대 상태는 DOM 을 읽지 않고 마크·블록에 적힌 값만 담는다", () => {
    const state = readToolbarState(makeEditor());
    expect(state).toMatchObject({ markFontFamily: "", markFontSize: "", blockLineHeight: "" });
  });
});

