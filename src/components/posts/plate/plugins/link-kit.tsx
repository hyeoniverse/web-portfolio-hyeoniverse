"use client";

import { LinkPlugin } from "@platejs/link/react";
import { upsertLink, LinkRules } from "@platejs/link";
import { KEYS, isUrl } from "platejs";
import { createPlatePlugin } from "platejs/react";
import { LinkElement } from "../elements";

// ── 텍스트 선택 후 URL 붙여넣기 → 선택 텍스트를 그대로 두고 링크로 감싼다 ──
// Plate LinkPlugin 기본(keepSelectedTextOnPaste)이 우리 붙여넣기 파이프라인에서 안 걸려서 명시적으로 처리.
const LinkPasteKit = createPlatePlugin({ key: "linkPasteSelection" }).overrideEditor(
  ({ editor, tf: { insertData } }) => ({
    transforms: {
      insertData(data: DataTransfer) {
        const text = data.getData("text/plain")?.trim();
        const html = data.getData("text/html");
        // 순수 URL(텍스트) 을 텍스트 선택 위에 붙여넣고, 코드블록이 아닐 때만 링크로 래핑
        if (
          text && !html &&
          !editor.api.isCollapsed() &&
          isUrl(text) &&
          !editor.api.some({ match: { type: editor.getType(KEYS.codeBlock) } })
        ) {
          // 성공(스킴 유효 등)하면 소비, 실패하면 기본 붙여넣기로 폴백
          if (upsertLink(editor, { url: text })) return;
        }
        insertData(data);
      },
    },
  }),
);

/** 링크 — 마크다운 입력: `[텍스트](url)` 자동 링크화 */
export const LinkKit = [
  LinkPlugin.configure({
    render: { node: LinkElement },
    inputRules: [LinkRules.markdown()],
  }),
  LinkPasteKit,
];
