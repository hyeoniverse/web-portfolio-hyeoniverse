"use client";

// ── Date Mention Menu (@) ──
// 노션식 "@" 인라인 날짜 멘션. 커서 앞 "@키워드" 를 감지해 floating 메뉴(오늘/내일/어제/날짜 선택…)를
// 띄우고, 선택 시 "@키워드" 를 지운 뒤 date_mention(inline void) 노드를 삽입한다.

import * as React from "react";
import { createPortal } from "react-dom";
import { useEditorRef, useEditorSelector, useEditorId, useEventEditorValue } from "platejs/react";
import { useVirtualFloating, offset, flip, shift } from "@platejs/floating";
import { CalendarDays } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { relativeDateStr, genShortId, _pendingDateMentionOpen } from "../dateUtils";
import styles from "../../RichTextEditor.module.css";
import Pressable from "@/components/ui/Pressable";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ZERO_WIDTH = /[﻿​-‍]/g;

type Item = {
  key: string;
  label: string;
  hint?: string;
  keywords: string[];
  /** date "YYYY-MM-DD" 또는 null(= 오늘 + picker 열기) */
  date: string | null;
  pick?: boolean;
};

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

export default function DateMentionMenu() {
  const editor = useEditorRef();
  const { language } = useLanguage();
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [dismissed, setDismissed] = React.useState<string | null>(null);

  // 커서 앞 "@키워드" 추출 — @ 앞이 시작/공백일 때만(이메일 foo@bar 오탐 방지)
  const query = useEditorSelector((ed: any) => {
    try {
      if (!ed.api.isCollapsed() || !ed.selection) return null;
      const focus = ed.selection.focus;
      const leaf = ed.api.node(focus.path);
      const text = typeof leaf?.[0]?.text === "string" ? (leaf[0].text as string) : "";
      const before = text.slice(0, focus.offset).replace(ZERO_WIDTH, "");
      const m = /@([^\s@]*)$/.exec(before);
      if (!m) return null;
      const prev = before[before.length - m[0].length - 1];
      if (prev !== undefined && !/\s/.test(prev)) return null; // @ 앞이 글자면 무시
      return m[1] ?? "";
    } catch {
      return null;
    }
  }, []);

  const allItems = React.useMemo<Item[]>(() => [
    { key: "today", label: t("오늘", "Today"), hint: relativeDateStr(0), keywords: ["오늘", "today", "now"], date: relativeDateStr(0) },
    { key: "tomorrow", label: t("내일", "Tomorrow"), hint: relativeDateStr(1), keywords: ["내일", "tomorrow"], date: relativeDateStr(1) },
    { key: "yesterday", label: t("어제", "Yesterday"), hint: relativeDateStr(-1), keywords: ["어제", "yesterday"], date: relativeDateStr(-1) },
    { key: "pick", label: t("날짜 선택…", "Pick a date…"), keywords: ["날짜", "date", "선택", "pick", "calendar", "달력"], date: null, pick: true },
  ], [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = React.useMemo(() => {
    if (query == null) return [];
    const q = query.toLowerCase();
    if (!q) return allItems;
    return allItems.filter((it) => it.label.toLowerCase().includes(q) || it.keywords.some((k) => k.toLowerCase().includes(q)));
  }, [query, allItems]);

  // 에디터 포커스가 이 에디터에 있을 때만 열림 — 바깥 클릭 시 blur → 자동 닫힘 (SlashMenu 와 동일 패턴)
  const focused = useEditorId() === useEventEditorValue("focus");
  const open = query != null && query !== dismissed && items.length > 0 && focused;

  const { refs, style, update } = useVirtualFloating({
    open,
    getBoundingClientRect: caretRect,
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [offset(6), flip({ padding: 12 }), shift({ padding: 12 })],
  });

  React.useEffect(() => { if (open) update?.(); }, [open, query, update]);
  React.useEffect(() => { setActiveIdx(0); }, [query]);
  React.useEffect(() => {
    if (!open) return;
    document.querySelector<HTMLElement>(`[data-date-nav="${activeIdx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  const run = React.useCallback((item: Item) => {
    if (query == null) return;
    const id = genShortId();
    if (item.pick) _pendingDateMentionOpen.current = id;
    // "@키워드" 삭제 후 date_mention 삽입
    editor.tf.delete({ unit: "character", reverse: true, distance: query.length + 1 });
    editor.tf.insertNodes({
      type: "date_mention",
      date: item.date ?? relativeDateStr(0),
      id,
      children: [{ text: "" }],
    } as any);
    setDismissed(null);
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

  return createPortal(
    // eslint-disable-next-line react-hooks/refs
    <div ref={refs.setFloating} className={styles.slashMenu} style={style} onMouseDown={(e) => e.preventDefault()}>
      {items.map((it, i) => (
        <Pressable noTapScale
          key={it.key}
          data-date-nav={i}
          className={`${styles.slashItem} ${i === activeIdx ? styles.slashItemActive : ""}`}
          onMouseEnter={() => setActiveIdx(i)}
          onClick={() => run(it)}
        >
          <span className={styles.menuIcon}><CalendarDays size={16} /></span>
          <span>{it.label}</span>
          {it.hint && <span className={styles.dateMentionHint}>{it.hint}</span>}
        </Pressable>
      ))}
    </div>,
    document.body,
  );
}
