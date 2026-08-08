"use client";

import { createPlatePlugin } from "platejs/react";
import type { TElement } from "platejs";
import { CALLOUT_BY_TYPE, type CalloutType } from "../calloutTypes";

// GitHub 문법 입력 자동변환 — 닫는 `]` 트리거.
//  1) `[!NOTE/TIP/IMPORTANT/WARNING/CAUTION]` (문단 시작) → 타입별 아이콘·배경의 콜아웃(알림).
//  2) `[^label]` → 각주 참조(footnote_ref) + 문서 끝 각주 내용(footnote_content). 슬래시 각주와 동일 구조.

export const GithubSyntaxKit = [
  createPlatePlugin({ key: "githubSyntax" }).overrideEditor(
    ({ editor, tf: { insertText } }) => ({
      transforms: {
        insertText(text, options) {
          if (text === "]" && editor.api.isCollapsed() && editor.selection) {
            const entry = editor.api.block();
            if (entry) {
              const [node, path] = entry;
              const focus = editor.selection.focus;
              const before = editor.api.string({ anchor: editor.api.start(path)!, focus });

              // ── 알림: 문단 전체가 정확히 "[!TYPE" 일 때 → 콜아웃으로 감싼다 ──
              const am = /^\[!(note|tip|important|warning|caution)$/i.exec(before);
              if (am && node.type === "p") {
                const t = CALLOUT_BY_TYPE[am[1].toLowerCase() as CalloutType];
                editor.tf.delete({ at: { anchor: editor.api.start(path)!, focus: editor.api.end(path)! } });
                editor.tf.wrapNodes({ type: "callout", bg: t.bg, icon: t.icon, children: [] } as TElement, { at: path });
                return;
              }

              // ── 각주: 커서 앞이 "[^label" → footnote_ref + 문서 끝 footnote_content ──
              const fm = /\[\^([^\]\s]+)$/.exec(before);
              if (fm) {
                const nextId = String(
                  Array.from(editor.api.nodes({ at: [], match: (n) => (n as TElement).type === "footnote_ref" })).length + 1
                );
                editor.tf.delete({ unit: "character", reverse: true, distance: fm[0].length });
                editor.tf.insertNodes({ type: "footnote_ref", footnoteId: nextId, children: [{ text: "" }] });
                editor.tf.insertNodes(
                  { type: "footnote_content", footnoteId: nextId, children: [{ text: "각주 내용" }] },
                  { at: [editor.children.length] }
                );
                return;
              }
            }
          }
          insertText(text, options);
        },
      },
    })
  ),
];
