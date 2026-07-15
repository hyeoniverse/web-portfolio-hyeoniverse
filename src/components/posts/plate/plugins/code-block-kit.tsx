"use client";

import {
  PlateElement,
  type PlateElementProps,
  type PlateLeafProps,
} from "platejs/react";
import { KEYS, createRuleFactory } from "platejs";
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

// ``` + Space → 코드블록. 헤딩(# )·인용(> )과 동일한 blockStart(space trigger) 규칙.
// space trigger 라서 AutoformatUndoKit 가 자동으로 Backspace 되돌림을 처리한다:
// 변환 직후 Backspace → undo(``` 문단 복원) + 소비된 공백 재삽입 = "``` " (공백 유지, 코드블록만 해제).
/* eslint-disable @typescript-eslint/no-explicit-any */
const CodeBlockSpaceRule = createRuleFactory({
  type: "blockStart",
  trigger: " ",
  match: "```",
  // 이미 코드블록 안이면 비활성 (중첩 방지 — 인용 규칙과 동일 가드)
  enabled: ({ editor }: any) =>
    !editor.api.some({ match: { type: [editor.getType(KEYS.codeBlock)] } }),
  apply: ({ editor }: any) => {
    const entry = editor.api.block();
    if (!entry) return false;
    const path = entry[1];
    // "```" 문단을 통째로 비우고 빈 코드블록으로 교체 (내장 blockFence apply 와 동일 방식)
    editor.tf.removeNodes({ at: path });
    editor.tf.insertNodes(
      {
        type: editor.getType(KEYS.codeBlock),
        children: [{ type: editor.getType(KEYS.codeLine), children: [{ text: "" }] }],
      },
      { at: path }
    );
    const start = editor.api.start([...path, 0]);
    if (start) editor.tf.select(start);
    return true;
  },
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/** 코드 블록 — lowlight 기반 syntax highlighting */
export const CodeBlockKit = [
  CodeBlockPlugin.configure({
    options: { lowlight, defaultLanguage: "plaintext" },
    render: { node: CodeBlockElement },
    parsers: { html: { deserializer: htmlDeserializerCodeBlock } },
    // ``` + Space(주요) / ``` + Enter(보조) 둘 다 코드블록 생성
    inputRules: [CodeBlockSpaceRule(), CodeBlockRules.markdown({ on: "break" })],
  }).configurePlugin(CodeLinePlugin, {
    render: {
      node: (props: PlateElementProps) => <PlateElement {...props} as="div" />,
    },
  }).configurePlugin(CodeSyntaxPlugin, {
    render: {
      // syntax 토큰은 타이핑마다 leaf 에 붙었다 떨어진다. 훅을 쓰는 PlateLeaf 를 여기서 조건부로
      // 마운트하면 slate 의 Leaf 컴포넌트 훅 순서가 바뀌어 "change in order of Hooks" 에러가 난다.
      // → 훅 없는 순수 span(중첩 leaf 데코레이터)으로 렌더해 토큰 유무와 무관하게 훅 구조를 고정.
      node: (props: PlateLeafProps) => {
        const leaf = props.leaf as Record<string, unknown>;
        const cls = (leaf.className as string) || undefined;
        return <span className={cls}>{props.children}</span>;
      },
    },
  }),
];
