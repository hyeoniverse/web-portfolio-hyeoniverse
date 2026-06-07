"use client";

// ── Autoformat Undo Kit ──
// 마크다운 자동변환은 trigger 문자(space, "-")가 소비되면서 일어난다(예: "# "→제목).
// 사용자가 변환 "직후" Backspace / Esc 를 누르면 → 변환을 되돌리고 trigger 문자(공백 등)까지
// 그대로 복원해, "# 글자" 같은 리터럴 입력을 가능하게 한다.
//
// 구현: 변환 직후 editor.undo() 로 구조 변경을 되돌리면 marker("#")가 복원된다. 거기에
// 소비됐던 trigger 문자를 다시 넣어주면 "# " 가 된다. 단 그냥 insertText 로 넣으면
// 자동변환이 또 trigger 되므로, 재삽입하는 동안만 inputRules 를 잠시 꺼서 막는다.
// (heading / blockquote / list / hr 전부 동일하게 동작 — undo 가 각 변환을 알아서 되돌림)

import { createPlatePlugin } from "platejs/react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 자동변환을 trigger 하지 않고 문자 그대로 삽입 (inputRules 일시 비활성화) */
function insertRawText(editor: any, text: string) {
  const meta = editor.meta?.inputRules;
  if (!meta) {
    editor.tf.insertText(text);
    return;
  }
  const saved = meta.insertText;
  meta.insertText = { all: [], byTrigger: {} };
  try {
    editor.tf.insertText(text);
  } finally {
    meta.insertText = saved;
  }
}

/** 변환 되돌리기: undo 로 marker 복원 + 소비된 trigger 문자 재삽입 */
function revertAutoformat(editor: any, trigger: string) {
  editor.undo();
  insertRawText(editor, trigger);
}

const MODIFIER_KEYS = ["Shift", "Control", "Meta", "Alt", "CapsLock"];

export const AutoformatUndoKit = [
  createPlatePlugin({
    key: "markdownAutoformatUndo",
    handlers: {
      onKeyDown: ({ editor, event }: any) => {
        const ed = editor as any;
        if (!ed.__mdPending) return;
        if (event.key === "Escape") {
          const { trigger } = ed.__mdPending;
          ed.__mdPending = null;
          revertAutoformat(ed, trigger);
          event.preventDefault();
          return;
        }
        // Backspace 는 deleteBackward transform 에서 처리 — 여기선 건드리지 않음
        if (event.key === "Backspace") return;
        // 그 외 키(방향키·타이핑 등)는 되돌림 윈도우를 닫는다 (insertText 가 필요시 다시 설정)
        if (!MODIFIER_KEYS.includes(event.key)) {
          ed.__mdPending = null;
        }
      },
      // 클릭으로 커서가 이동하면 되돌림 윈도우 종료 (엉뚱한 블록 undo 방지)
      onMouseDown: ({ editor }: any) => {
        (editor as any).__mdPending = null;
      },
    },
  }).overrideEditor(({ editor, tf: { insertText, deleteBackward } }: any) => {
    const ed = editor as any;
    const blockInfo = () => {
      const entry = editor.api.block();
      if (!entry) return { text: "", type: undefined, list: undefined };
      const [node, path] = entry;
      return {
        text: editor.api.string(path) as string,
        type: (node as any).type,
        list: (node as any).listStyleType,
      };
    };

    return {
      transforms: {
        insertText(text: string, options: any) {
          const isTrigger = (text === " " || text === "-") && editor.api.isCollapsed();
          if (!isTrigger) {
            ed.__mdPending = null;
            insertText(text, options);
            return;
          }
          const before = blockInfo();
          insertText(text, options); // 자동변환이 일어날 수 있음
          const after = blockInfo();
          // trigger 문자가 그대로 들어가지 않았거나(소비됨) 블록 구조가 바뀌면 = 자동변환됨
          const consumed = after.text !== before.text + text;
          const structural = after.type !== before.type || after.list !== before.list;
          ed.__mdPending = consumed || structural ? { trigger: text } : null;
        },
        deleteBackward(unit: any) {
          if (ed.__mdPending) {
            const { trigger } = ed.__mdPending;
            ed.__mdPending = null;
            revertAutoformat(ed, trigger);
            return;
          }
          deleteBackward(unit);
        },
      },
    };
  }),
];
