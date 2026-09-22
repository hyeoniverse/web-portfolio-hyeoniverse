"use client";

// ── Autoformat Undo Kit ──
// 마크다운 자동변환은 trigger 문자(space, "-")가 소비되면서 일어난다(예: "# "→제목).
// 사용자가 변환 "직후" Backspace / Esc 를 누르면 → 변환을 되돌리고 trigger 문자(공백 등)까지
// 그대로 복원해, "# 글자" 같은 리터럴 입력을 가능하게 한다.
//
// 구현: trigger 를 넣기 전 history 위치를 적어 두고, 변환이 일어났으면 그 뒤로 쌓인 연산만 거꾸로 되돌린다.
// 그러면 marker("#")가 남은 상태로 돌아가고, 소비됐던 trigger 문자를 다시 넣어 "# " 가 된다. 그냥 insertText 로
// 넣으면 자동변환이 또 trigger 되므로, 재삽입하는 동안만 inputRules 를 잠시 꺼서 막는다.
// (heading / blockquote / list / hr 전부 동일하게 동작 — 변환이 만든 연산을 그대로 뒤집는다)
//
// editor.undo() 를 쓰지 않는 이유: "#" 입력과 변환이 한 history 묶음으로 합쳐져 undo 가 "#" 까지 지웠고,
// 변환 뒤 툴바로 한 편집(서식 지우기 등)이 끼면 undo 가 그것을 되돌렸다. 그래서 되돌리기 직전에 history 가
// 변환 직후 그대로인지 확인하고, 아니면 평범한 Backspace 로 동작한다.

import { createPlatePlugin } from "platejs/react";
import { OperationApi } from "platejs";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** history 의 한 시점 — 마지막 묶음과 그 안의 연산 수 */
type HistoryMark = { count: number; last: { operations: unknown[] } | undefined; opLen: number };
type Pending = { trigger: string; before: HistoryMark; after: HistoryMark; selection: unknown };

function historyMark(editor: any): HistoryMark | null {
  const undos = editor.history?.undos;
  if (!Array.isArray(undos)) return null;
  const last = undos[undos.length - 1];
  return { count: undos.length, last, opLen: last ? last.operations.length : 0 };
}

const sameMark = (a: HistoryMark | null, b: HistoryMark) =>
  !!a && a.count === b.count && a.last === b.last && a.opLen === b.opLen;

/** since 이후 history 에 쌓인 연산 — 마지막 묶음에 합쳐진 것과 새 묶음 모두. 알 수 없으면 null */
function opsSince(editor: any, since: HistoryMark): any[] | null {
  const undos: { operations: any[] }[] = editor.history.undos;
  if (!since.last) return undos.flatMap((b) => b.operations);
  const i = undos.indexOf(since.last as { operations: any[] });
  if (i < 0) return null; // history 상한으로 밀려났다
  return [...undos[i].operations.slice(since.opLen), ...undos.slice(i + 1).flatMap((b) => b.operations)];
}

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

/** 변환 되돌리기 — 변환 직후 그대로일 때만. 되돌렸으면 true */
function revertAutoformat(editor: any, pending: Pending): boolean {
  if (!sameMark(historyMark(editor), pending.after)) return false; // 변환 뒤 다른 편집이 끼었다
  const ops = opsSince(editor, pending.before);
  if (!ops || ops.length === 0) return false;
  editor.tf.withNewBatch(() => {
    editor.tf.withoutNormalizing(() => {
      for (const op of [...ops].reverse()) editor.apply(OperationApi.inverse(op));
    });
    if (pending.selection) editor.tf.select(pending.selection);
    insertRawText(editor, pending.trigger);
  });
  return true;
}

/** 마크다운 표시로 되돌릴 수 있는 블록 — 타입별 표시 문자 */
const BLOCK_MARKER: Record<string, string> = {
  h1: "# ",
  h2: "## ",
  h3: "### ",
  h4: "#### ",
  h5: "##### ",
  h6: "###### ",
  blockquote: "> ",
};

/** 리스트 항목의 표시 문자 — 불릿 "- ", 번호 "1. ", 체크 "[] "/"[x] " */
function listMarker(node: any): string | null {
  const type = node.listStyleType;
  if (!type) return null;
  if (type === "decimal") return `${node.listStart ?? 1}. `;
  if (type === "todo") return node.checked ? "[x] " : "[] ";
  return "- ";
}

/**
 * 블록 맨 앞 Backspace → 마크다운 표시로 되돌린다(글머리표 → "- ", 제목 → "## ", 인용 → "> ").
 * 서식만 풀고 표시가 그냥 사라지면, 방금 무엇이었는지가 글에서 지워진다. 되돌린 표시는 그대로 지우거나
 * 다시 스페이스를 쳐서 블록으로 되돌릴 수 있다. 자동변환 직후뿐 아니라 언제 눌러도 같게 동작한다.
 *
 * 들여쓴 리스트(2단계 이상)는 한 단계 줄이는 게 먼저라 건드리지 않는다(리스트 기본 동작).
 */
function restoreBlockMarker(editor: any): boolean {
  const selection = editor.selection;
  if (!selection || !editor.api.isCollapsed()) return false;
  const entry = editor.api.block();
  if (!entry) return false;
  const [node, path] = entry;
  if (!editor.api.isStart(selection.anchor, path)) return false;
  const marker = listMarker(node) ?? BLOCK_MARKER[(node as any).type as string];
  if (!marker) return false;
  if ((node as any).listStyleType && ((node as any).indent ?? 0) > 1) return false;
  editor.tf.withNewBatch(() => {
    editor.tf.withoutNormalizing(() => {
      if ((node as any).listStyleType) {
        editor.tf.unsetNodes(["listStyleType", "listStart", "listType", "checked", "indent"], { at: path });
      }
      if ((node as any).type !== "p") editor.tf.setNodes({ type: "p" }, { at: path });
      insertRawText(editor, marker);
    });
  });
  return true;
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
          const pending = ed.__mdPending as Pending;
          ed.__mdPending = null;
          if (revertAutoformat(ed, pending)) event.preventDefault();
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
          const mark = historyMark(editor);
          const selection = editor.selection;
          insertText(text, options); // 자동변환이 일어날 수 있음
          const after = blockInfo();
          /* trigger 가 그대로 들어갔으면 블록 글자 수가 정확히 그만큼 는다. 자동변환은 trigger 를 먹고 표시 문자(#·-·> 등)를
             지우거나 블록 모양을 바꾼다. 예전에는 after.text === before.text + text 로 봐서, 커서가 블록 끝이 아닐 때(문단 중간)
             친 스페이스·"-" 를 늘 변환으로 오판했다 — 그 뒤 Backspace 가 글자를 지우는 대신 직전 편집을 되돌렸다 */
          const consumed = after.text.length !== before.text.length + text.length;
          const structural = after.type !== before.type || after.list !== before.list;
          ed.__mdPending = (consumed || structural) && mark
            ? ({ trigger: text, before: mark, after: historyMark(editor)!, selection } satisfies Pending)
            : null;
        },
        deleteBackward(unit: any) {
          const pending = ed.__mdPending as Pending | null;
          ed.__mdPending = null;
          if (pending && revertAutoformat(ed, pending)) return;
          /* 자동변환 직후가 아니어도 블록 맨 앞이면 마크다운 표시로 되돌린다 */
          if (restoreBlockMarker(ed)) return;
          deleteBackward(unit);
        },
      },
    };
  }),
];
