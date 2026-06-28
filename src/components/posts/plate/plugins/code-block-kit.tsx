"use client";

import {
  PlateElement,
  PlateLeaf,
  type PlateElementProps,
  type PlateLeafProps,
} from "platejs/react";
import { KEYS } from "platejs";
import { CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin } from "@platejs/code-block/react";
import { CodeBlockRules } from "@platejs/code-block";
import { CodeBlockElement } from "../elements";
import { lowlight } from "../lowlightInstance";

// Plate 기본 코드블록 deserializer 는 language 를 읽지 않아 로드 시 lang 이 사라진다.
// `<code class="language-X">` 의 X 를 lang 으로 복원하는 커스텀 deserializer.
const htmlDeserializerCodeBlock = {
  rules: [{ validNodeName: "PRE" }],
  parse: ({ element }: { element: HTMLElement }) => {
    const codeEl = element.querySelector("code");
    const m = codeEl?.className.match(/language-([\w-]+)/);
    const lang = m?.[1];
    const selectText =
      [...element.childNodes].find((n) => n.nodeName === "SELECT")?.textContent || "";
    const textContent = (element.textContent || "").replace(selectText, "");
    let lines = textContent.split("\n");
    if (!lines.length) lines = [textContent];
    return {
      type: KEYS.codeBlock,
      ...(lang ? { lang } : {}),
      children: lines.map((line) => ({ type: KEYS.codeLine, children: [{ text: line }] })),
    };
  },
};

/** 코드 블록 — lowlight 기반 syntax highlighting */
export const CodeBlockKit = [
  CodeBlockPlugin.configure({
    options: { lowlight, defaultLanguage: "plaintext" },
    render: { node: CodeBlockElement },
    parsers: { html: { deserializer: htmlDeserializerCodeBlock } },
    inputRules: [CodeBlockRules.markdown({ on: "break" })], // ``` + Enter → 코드블록
  }).configurePlugin(CodeLinePlugin, {
    render: {
      node: (props: PlateElementProps) => <PlateElement {...props} as="div" />,
    },
  }).configurePlugin(CodeSyntaxPlugin, {
    render: {
      node: (props: PlateLeafProps) => {
        const leaf = props.leaf as Record<string, unknown>;
        const cls = (leaf.className as string) || undefined;
        return <PlateLeaf {...props} as="span" className={cls} />;
      },
    },
  }),
];
