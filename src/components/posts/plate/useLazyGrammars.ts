"use client";

import { useEffect } from "react";
import { KEYS, type TCodeBlockElement } from "platejs";
import type { PlateEditor } from "platejs/react";
import { resetCodeBlockDecorations } from "@platejs/code-block";
import { loadAllGrammars, needsMoreGrammars } from "./lowlightInstance";

/* 문법을 받은 뒤 하이라이트를 다시 계산한 편집기 — 편집기마다 한 번이면 된다 */
const redecorated = new WeakSet<object>();

/**
 * 코드 블록의 언어가 처음에 싣지 않은 것이면 나머지 문법을 받고, 받은 뒤 편집기의 코드 블록 하이라이트를
 * 다시 계산한다. Plate 는 코드 줄마다 하이라이트 결과를 캐시해서, 문법이 없을 때 계산한 빈 결과가 남아
 * 있으면 문법이 들어와도 다시 계산하지 않는다. 그래서 캐시를 지우고 다시 그리게 한다.
 * 받는 동안과 받지 못했을 때는 지금처럼 글자만 보인다.
 */
export function useLazyGrammars(editor: PlateEditor, lang: string | undefined) {
  useEffect(() => {
    if (!needsMoreGrammars(lang)) return;
    let alive = true;
    loadAllGrammars()
      .then(() => {
        if (!alive || redecorated.has(editor)) return;
        redecorated.add(editor);
        const type = editor.getType(KEYS.codeBlock);
        for (const [node] of editor.api.nodes({ at: [], match: { type } })) {
          resetCodeBlockDecorations(node as TCodeBlockElement);
        }
        editor.api.redecorate();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [editor, lang]);
}
