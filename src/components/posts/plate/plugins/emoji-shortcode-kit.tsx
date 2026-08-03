"use client";

import { createPlatePlugin } from "platejs/react";
import { EMOJI_SHORTCODES } from "@/utils/emojiShortcodeMap";

// GitHub 식 `:name:` → 이모지 즉시 변환. 닫는 콜론(`:`)을 치는 순간, 커서 앞이 정확한 shortcode
// (`:tada` 등)면 유니코드 이모지로 바꾼다. (에디터엔 `:키워드` 검색 메뉴(EmojiMenu)가 따로 있고,
//  이건 shortcode 를 끝까지 친 경우의 GitHub 식 즉시 변환 — 둘이 상호 보완.)
export const EmojiShortcodeKit = [
  createPlatePlugin({ key: "emojiShortcode" }).overrideEditor(
    ({ editor, tf: { insertText } }) => ({
      transforms: {
        insertText(text, options) {
          if (text === ":" && editor.api.isCollapsed() && editor.selection) {
            const focus = editor.selection.focus;
            const leaf = editor.api.node(focus.path);
            const raw = typeof leaf?.[0]?.text === "string" ? (leaf[0].text as string) : "";
            const before = raw.slice(0, focus.offset);
            const m = /:([a-z0-9_+-]+)$/i.exec(before);
            const native = m ? EMOJI_SHORTCODES[m[1].toLowerCase()] : undefined;
            if (m && native) {
              // `:name` 삭제 후 이모지 삽입 — 닫는 콜론은 소비(재삽입 안 함)
              editor.tf.delete({ unit: "character", reverse: true, distance: m[0].length });
              editor.tf.insertText(native);
              return;
            }
          }
          insertText(text, options);
        },
      },
    })
  ),
];
