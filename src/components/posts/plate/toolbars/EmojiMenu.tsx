"use client";

// ── Emoji Menu (:) ──
// 노션식 ":키워드" 인라인 이모지 검색. 커서 앞 텍스트에서 :word 패턴을 찾아 @emoji-mart/data
// 로 검색, floating 메뉴로 보여주고 선택 시 이모지(유니코드 문자)를 텍스트로 삽입한다.
// (텍스트 삽입이라 markdown round-trip 도 그대로 보존)

import * as React from "react";
import { createPortal } from "react-dom";
import { useEditorRef, useEditorSelector } from "platejs/react";
import { useVirtualFloating, offset, flip, shift } from "@platejs/floating";
import emojiData from "@emoji-mart/data";
import styles from "../../RichTextEditor.module.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

type EmojiHit = { id: string; native: string; name: string };

const EMOJIS: Record<string, any> = (emojiData as any).emojis ?? {};
const ZERO_WIDTH = /[﻿​-‍]/g;
const MAX = 10;

function searchEmojis(query: string): EmojiHit[] {
  const q = query.toLowerCase();
  const starts: EmojiHit[] = [];
  const includes: EmojiHit[] = [];
  for (const id in EMOJIS) {
    const e = EMOJIS[id];
    const native = e?.skins?.[0]?.native;
    if (!native) continue;
    const name = (e.name as string) || id;
    const hay = [id, name.toLowerCase(), ...((e.keywords as string[]) || [])];
    if (id.startsWith(q) || name.toLowerCase().startsWith(q)) {
      starts.push({ id, native, name });
    } else if (hay.some((h) => h.includes(q))) {
      includes.push({ id, native, name });
    }
    if (starts.length >= MAX) break;
  }
  return [...starts, ...includes].slice(0, MAX);
}

function caretRect(): DOMRect {
  if (typeof window === "undefined") return new DOMRect();
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const r = range.getBoundingClientRect();
    if (r && (r.width || r.height)) return r;
    const rects = range.getClientRects();
    if (rects.length) return rects[0] as DOMRect;
    const node = range.startContainer;
    const el = node.nodeType === 3 ? node.parentElement : (node as Element);
    if (el) return el.getBoundingClientRect();
  }
  return new DOMRect();
}

export default function EmojiMenu() {
  const editor = useEditorRef();
  const [activeIdx, setActiveIdx] = React.useState(0);

  // 커서 앞 텍스트의 마지막 ":word" 토큰 추출 (글자로 시작하는 1자 이상)
  const query = useEditorSelector((ed: any) => {
    try {
      if (!ed.api.isCollapsed() || !ed.selection) return null;
      const entry = ed.api.block();
      if (!entry) return null;
      const start = ed.api.start(entry[1]);
      if (!start) return null;
      const before = (ed.api.string({ anchor: start, focus: ed.selection.focus }) as string).replace(ZERO_WIDTH, "");
      const m = /:([a-z][a-z0-9_+-]*)$/i.exec(before);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }, []);

  const [dismissed, setDismissed] = React.useState<string | null>(null);
  const items = React.useMemo(() => (query ? searchEmojis(query) : []), [query]);
  const open = query != null && query !== dismissed && items.length > 0;

  const { refs, style, update } = useVirtualFloating({
    open,
    getBoundingClientRect: caretRect,
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [offset(6), flip({ padding: 12 }), shift({ padding: 12 })],
  });

  React.useEffect(() => { if (open) update?.(); }, [open, query, update]);
  React.useEffect(() => { setActiveIdx(0); }, [query]);

  const run = React.useCallback((hit: EmojiHit) => {
    if (query == null) return;
    // ":query" 삭제 후 이모지 삽입
    editor.tf.delete({ unit: "character", reverse: true, distance: query.length + 1 });
    editor.tf.insertText(hit.native);
    setTimeout(() => editor.tf.focus(), 0);
  }, [editor, query]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); setActiveIdx((i) => (i + 1) % items.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); setActiveIdx((i) => (i - 1 + items.length) % items.length); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); run(items[activeIdx] ?? items[0]); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setDismissed(query); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, items, activeIdx, run, query]);

  if (!open) return null;

  const menu = (
    // eslint-disable-next-line react-hooks/refs
    <div ref={refs.setFloating} className={styles.slashMenu} style={style} onMouseDown={(e) => e.preventDefault()}>
      {items.map((hit, i) => (
        <button
          key={hit.id}
          type="button"
          className={`${styles.slashItem} ${i === activeIdx ? styles.slashItemActive : ""}`}
          onMouseEnter={() => setActiveIdx(i)}
          onClick={() => run(hit)}
        >
          <span className={styles.emojiNative}>{hit.native}</span>
          <span className={styles.emojiName}>{hit.name}</span>
        </button>
      ))}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(menu, document.body) : null;
}
