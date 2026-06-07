"use client";

// ── Markdown Kit ──
// (1) MarkdownPlugin: editor.api.markdown.deserialize/serialize 제공 (remark-gfm 로 표,
//     remark-math 로 수식 파싱). (2) 붙여넣기 override: 마크다운 문서를 통째로 붙이면
//     블록으로 변환. 단 한 줄짜리(인라인) 텍스트 붙여넣기는 기존 동작 유지 — 문장 중간에
//     단어 붙일 때 문단이 쪼개지지 않도록 "블록처럼 보이는" 텍스트만 파싱한다.

import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MarkdownPlugin } from "@platejs/markdown";
import { createPlatePlugin } from "platejs/react";

/** 개행이 있거나 마크다운 블록 문법으로 시작하면 "블록 붙여넣기"로 본다 */
function looksLikeMarkdownBlock(text: string): boolean {
  if (/\r?\n/.test(text)) return true;
  return /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|\$\$|\|.*\|)/.test(text.trimStart());
}

const MarkdownPasteKit = createPlatePlugin({ key: "markdownPaste" }).overrideEditor(
  ({ editor, tf: { insertData } }) => ({
    transforms: {
      insertData(data: DataTransfer) {
        const text = data.getData("text/plain");
        const html = data.getData("text/html");
        // text/html 이 있으면(웹/리치 소스 복사) 기존 HTML 디시리얼라이즈에 맡긴다.
        if (text && !html && looksLikeMarkdownBlock(text)) {
          const nodes = editor.getApi(MarkdownPlugin).markdown.deserialize(text);
          if (Array.isArray(nodes) && nodes.length > 0) {
            editor.tf.insertFragment(nodes);
            return;
          }
        }
        insertData(data);
      },
    },
  })
);

export const MarkdownKit = [
  MarkdownPlugin.configure({
    options: { remarkPlugins: [remarkGfm, remarkMath] },
  }),
  MarkdownPasteKit,
];
