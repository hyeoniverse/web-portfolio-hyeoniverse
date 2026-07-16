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
import { KEYS } from "platejs";
import { detectCodeLanguage } from "../lowlightInstance";

/** 개행이 있거나 마크다운 블록 문법으로 시작하면 "블록 붙여넣기"로 본다 */
function looksLikeMarkdownBlock(text: string): boolean {
  if (/\r?\n/.test(text)) return true;
  return /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|\$\$|\|.*\|)/.test(text.trimStart());
}

const MarkdownPasteKit = createPlatePlugin({ key: "markdownPaste" }).overrideEditor(
  ({ editor, tf: { insertData } }) => ({
    transforms: {
      insertData(data: DataTransfer) {
        /* 코드블록 안에선 markdown 으로 해석하면 안 된다 — 거긴 리터럴 코드다.
           looksLikeMarkdownBlock 은 "개행이 있으면 true" 라서 여러 줄 코드가 전부 여기 걸렸고,
           markdown 파서가 그걸 한 문단으로 뭉쳐(개행 유실) fragment 로 넣는 바람에
           첫 줄만 들어가고 code_line 이 안 생겨 placeholder 도 안 지워졌다.
           CodeBlockKit 의 insertData 가 줄 단위로 code_line 을 만들게 그대로 넘긴다. */
        try {
          if (editor.api.some({ match: { type: [KEYS.codeBlock, KEYS.codeLine] } })) {
            insertData(data);
            return;
          }
        } catch { /* ignore */ }
        const text = data.getData("text/plain");
        const html = data.getData("text/html");
        // text/html 이 있으면(웹/리치 소스 복사) 기존 HTML 디시리얼라이즈에 맡긴다.
        if (text && !html && looksLikeMarkdownBlock(text)) {
          /* 코드처럼 보이면 markdown 파서에 **넘기지 않는다** — 코드블록 하나로 통째로 만든다.
             markdown 은 4칸 들여쓰기만 코드로 보고 나머지 줄은 문단으로 가른다. 그래서 들여쓰기가
             섞인 코드(대부분의 실제 코드)는 "문단 + code_block + 문단" 으로 찢어진다.
             게다가 MDX 처리가 `class` 를 `className` 으로 바꿔서 **코드 내용까지 훼손**한다.
             markdown 문서(detected === "markdown")는 그대로 markdown 으로 파싱한다. */
          const lang = detectCodeLanguage(text);
          if (lang && lang !== "markdown") {
            const lines = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
            editor.tf.insertNodes(
              {
                type: KEYS.codeBlock,
                lang,
                children: lines.map((line) => ({ type: KEYS.codeLine, children: [{ text: line }] })),
              },
              { select: true },
            );
            return;
          }
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
