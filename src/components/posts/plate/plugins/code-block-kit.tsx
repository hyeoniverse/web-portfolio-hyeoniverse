"use client";

import {
  PlateElement,
  type PlateElementProps,
  type PlateLeafProps,
} from "platejs/react";
import { KEYS, createRuleFactory, ElementApi, TextApi } from "platejs";
import { createPlatePlugin } from "platejs/react";
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
    // mermaid 뷰 모드(plateSerializer 가 pre 에 실어 보낸다) 복원 — 없으면 코드만 보기가 기본
    const gv = element.getAttribute("data-graph-view");
    const graphView = gv === "split" || gv === "diagram" || gv === "code" ? gv : undefined;
    // 줄바꿈(wrap) 토글 상태 복원 — plateSerializer 가 pre[data-wrap="true"] 로 실어 보낸다.
    const wrap = element.getAttribute("data-wrap") === "true" ? true : undefined;
    const selectText =
      [...element.childNodes].find((n) => n.nodeName === "SELECT")?.textContent || "";
    const textContent = (element.textContent || "").replace(selectText, "");
    let lines = textContent.split("\n");
    if (!lines.length) lines = [textContent];
    return {
      type: KEYS.codeBlock,
      ...(lang ? { lang } : {}),
      ...(graphView ? { graphView } : {}),
      ...(wrap ? { wrap } : {}),
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

/* ── code_block 의 자식은 항상 code_line 이어야 한다 ──
   Cmd+A 로 코드블록 전체를 선택해 지우면 code_line 들이 통째로 사라지고 **raw 텍스트 노드**만
   남는 경우가 있다(code_block[text:""]). 이 상태는 아무도 못 고친다:
     · Plate 의 withNormalizeCodeBlock 은 `setNodes({type: code_line})` 만 해서 텍스트엔 무력하다
       (텍스트 노드에 type 을 붙여도 element 가 되지 않는다)
     · Slate 는 children[0] 이 텍스트면 그 블록을 "텍스트를 담는 블록"으로 보고 그대로 둔다
   → 자기모순이 없어서 **영구히 깨진 채로 남는다.** 증상:
     · isEmpty 가 children[].children 를 못 찾아 "비었다"로 오판 → 글자가 있는데 placeholder 가 안 사라짐
     · 커서가 code_line 이 아니라 code_block 안에 놓임 → 붙여넣기 때 Plate 가 나머지 줄을
       "가장 낮은 블록(=code_block)"의 **형제**로 넣어서 블록 아래로 새어나간다(첫 줄만 안에 남음)
   여기서 텍스트 자식을 code_line 으로 감싸 구조를 복구한다. */
const CodeBlockStructureKit = createPlatePlugin({ key: "codeBlockStructure" }).overrideEditor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ editor, tf: { normalizeNode } }: any) => ({
    transforms: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      normalizeNode(entry: any) {
        const [node, path] = entry;
        if (ElementApi.isElement(node) && node.type === editor.getType(KEYS.codeBlock)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const kids = (node.children ?? []) as any[];
          const i = kids.findIndex((c) => TextApi.isText(c));
          if (i >= 0) {
            editor.tf.wrapNodes(
              { type: editor.getType(KEYS.codeLine), children: [] },
              { at: [...path, i] },
            );
            return; // 한 번에 하나만 — Slate 가 다시 정규화를 돌려준다
          }
        }
        normalizeNode(entry);
      },
    },
  }),
);

/** 코드 블록 — lowlight 기반 syntax highlighting */
export const CodeBlockKit = [
  CodeBlockStructureKit,
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
