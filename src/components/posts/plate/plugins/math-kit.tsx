"use client";

import { EquationPlugin, InlineEquationPlugin } from "@platejs/math/react";
import { EquationElement, InlineEquationElement } from "../MathElements";

/** 수식 (KaTeX) — 블록 + 인라인 */
export const MathKit = [
  EquationPlugin.extend({
    render: { node: EquationElement },
    handlers: {
      onKeyDown: ({ editor, event }) => {
        // 블록 수식 선택 상태에서 타이핑 시 새 paragraph 생성
        if (!editor.selection) return;
        const entry = editor.api.above({ match: { type: editor.getType("equation") } });
        if (!entry) return;
        if (event.key === "Backspace" || event.key === "Delete") return; // 삭제는 기본 동작
        if (event.metaKey || event.ctrlKey || event.altKey) return; // 단축키 무시
        if (event.key.length > 1 && event.key !== "Enter") return; // 특수키 무시
        event.preventDefault();
        const [, path] = entry;
        const nextPath = [...path.slice(0, -1), path[path.length - 1] + 1];
        if (!editor.api.node(nextPath)) {
          editor.tf.insertNodes({ type: "p", children: [{ text: "" }] }, { at: nextPath });
        }
        editor.tf.select(nextPath);
        editor.tf.collapse({ edge: "start" });
        if (event.key !== "Enter") {
          editor.tf.insertText(event.key);
        }
      },
    },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-math-block"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "equation",
            texExpression: element.getAttribute("data-latex") || "",
            children: [{ text: "" }],
          }),
        },
      },
    },
  }),
  InlineEquationPlugin.extend({
    render: { node: InlineEquationElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "SPAN" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-math-inline"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "inline_equation",
            texExpression: element.getAttribute("data-latex") || "",
            children: [{ text: "" }],
          }),
        },
      },
    },
  }),
];
