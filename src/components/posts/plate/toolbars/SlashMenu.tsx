"use client";

// ── Slash Menu (/) ──
// 노션식 슬래시 명령. 빈 문단에서 "/" 입력 시, 그 블록 텍스트("/query")를 읽어 명령을
// 필터링하는 floating 메뉴를 caret 위치에 띄운다. ↑/↓ 이동, Enter/Tab 선택, Esc 취소.
// 공식 @platejs/slash-command 는 메뉴 UI 가 @ariakit 기반(미설치)이라, 검증된 패턴
// (useEditorSelector 로 블록 텍스트 구독 + useVirtualFloating + keydown capture)으로 자체 구현.

import * as React from "react";
import { createPortal } from "react-dom";
import { useEditorRef, useEditorSelector } from "platejs/react";
import { useVirtualFloating, offset, flip, shift } from "@platejs/floating";
import { toggleList } from "@platejs/list";
import { toggleCodeBlock } from "@platejs/code-block";
import { insertTable } from "@platejs/table";
import { insertEquation } from "@platejs/math";
import { insertToc } from "@platejs/toc";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "../../RichTextEditor.module.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Cmd = {
  key: string;
  labelKey: string;
  icon: string;
  keywords: string[];
  run: (editor: any) => void;
};

const COMMANDS: Cmd[] = [
  { key: "p", labelKey: "paragraph", icon: "¶", keywords: ["text", "본문", "paragraph", "para"], run: (e) => e.tf.setNodes({ type: "p" }) },
  { key: "h1", labelKey: "heading1", icon: "H1", keywords: ["heading", "제목", "title", "h1"], run: (e) => e.tf.toggleBlock("h1") },
  { key: "h2", labelKey: "heading2", icon: "H2", keywords: ["heading", "제목", "h2"], run: (e) => e.tf.toggleBlock("h2") },
  { key: "h3", labelKey: "heading3", icon: "H3", keywords: ["heading", "제목", "h3"], run: (e) => e.tf.toggleBlock("h3") },
  { key: "ul", labelKey: "bulletList", icon: "•", keywords: ["bullet", "list", "불릿", "글머리", "목록"], run: (e) => toggleList(e, { listStyleType: "disc" }) },
  { key: "ol", labelKey: "numberedList", icon: "1.", keywords: ["number", "ordered", "번호", "목록"], run: (e) => toggleList(e, { listStyleType: "decimal" }) },
  { key: "todo", labelKey: "todoList", icon: "☑", keywords: ["todo", "check", "할일", "체크"], run: (e) => { const en = e.api.block(); if (en) e.tf.setNodes({ checked: false, listStyleType: "todo" }, { at: en[1] }); } },
  { key: "quote", labelKey: "blockquote", icon: "❝", keywords: ["quote", "인용"], run: (e) => e.tf.toggleBlock("blockquote") },
  { key: "code", labelKey: "codeBlock", icon: "</>", keywords: ["code", "코드"], run: (e) => toggleCodeBlock(e) },
  { key: "hr", labelKey: "insertHr", icon: "—", keywords: ["divider", "hr", "구분", "선"], run: (e) => e.tf.insertNodes({ type: "hr", children: [{ text: "" }] }) },
  { key: "table", labelKey: "insertTable", icon: "▦", keywords: ["table", "표"], run: (e) => e.tf.withMerging(() => insertTable(e, { colCount: 3, rowCount: 3, header: true })) },
  { key: "callout", labelKey: "insertCallout", icon: "💡", keywords: ["callout", "콜아웃", "노트"], run: (e) => { const sel = e.selection; const at = sel ? [sel.anchor.path[0] + 1] : [e.children.length]; e.tf.insertNodes({ type: "callout", bg: "var(--bg-tertiary)", icon: "💡", children: [{ type: "p", children: [{ text: "" }] }] }, { at }); } },
  { key: "equation", labelKey: "equation", icon: "fx", keywords: ["equation", "math", "수식", "latex"], run: (e) => insertEquation(e) },
  { key: "toc", labelKey: "toc", icon: "≡", keywords: ["toc", "목차", "contents", "outline"], run: (e) => insertToc(e) },
  { key: "mermaid", labelKey: "mermaid", icon: "📊", keywords: ["mermaid", "diagram", "다이어그램", "chart", "flow"], run: (e) => e.tf.insertNodes({ type: "code_block", lang: "mermaid", children: [{ type: "code_line", children: [{ text: "graph TD" }] }, { type: "code_line", children: [{ text: "  A[Start] --> B[End]" }] }] }) },
];

const ZERO_WIDTH = /[﻿​-‍]/g;

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

export default function SlashMenu() {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const [activeIdx, setActiveIdx] = React.useState(0);

  // 편집할 때마다 현재(collapsed) 문단의 텍스트를 구독 → 타이핑 시 re-render.
  const blockText = useEditorSelector((ed: any) => {
    try {
      if (!ed.api.isCollapsed()) return null;
      const entry = ed.api.block();
      if (!entry || entry[0]?.type !== "p") return null;
      return (ed.api.string(entry[1]) as string).replace(ZERO_WIDTH, "");
    } catch {
      return null;
    }
  }, []);

  const query = React.useMemo(() => {
    if (blockText == null) return null;
    const m = /^\/([^\s/]*)$/.exec(blockText);
    return m ? m[1] : null;
  }, [blockText]);

  const items = React.useMemo(() => {
    if (query == null) return [] as Cmd[];
    const q = query.toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => {
      const label = (t(`editor.${c.labelKey}`) as string).toLowerCase();
      return label.includes(q) || c.keywords.some((k) => k.toLowerCase().includes(q));
    });
  }, [query, t]);

  const open = query != null && items.length > 0;

  const { refs, style, update } = useVirtualFloating({
    open,
    getBoundingClientRect: caretRect,
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [offset(6), flip({ padding: 12 }), shift({ padding: 12 })],
  });

  React.useEffect(() => { if (open) update?.(); }, [open, query, update]);
  React.useEffect(() => { setActiveIdx(0); }, [query]);

  // "/query" 텍스트(블록 시작~커서) 삭제
  const deleteSlashText = React.useCallback(() => {
    const entry = editor.api.block();
    if (!entry || !editor.selection) return;
    const start = editor.api.start(entry[1]);
    if (!start) return;
    editor.tf.delete({ at: { anchor: start, focus: editor.selection.focus } });
  }, [editor]);

  const run = React.useCallback((cmd: Cmd) => {
    deleteSlashText();
    cmd.run(editor);
    setTimeout(() => editor.tf.focus(), 0);
  }, [editor, deleteSlashText]);

  // 키보드 — 활성 시 캡처 단계에서 ↑/↓/Enter/Tab/Esc 가로채기
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); setActiveIdx((i) => (i + 1) % items.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); setActiveIdx((i) => (i - 1 + items.length) % items.length); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); run(items[activeIdx] ?? items[0]); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); deleteSlashText(); setTimeout(() => editor.tf.focus(), 0); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, items, activeIdx, run, editor, deleteSlashText]);

  if (!open) return null;

  const menu = (
    // eslint-disable-next-line react-hooks/refs
    <div ref={refs.setFloating} className={styles.slashMenu} style={style} onMouseDown={(e) => e.preventDefault()}>
      {items.map((c, i) => (
        <button
          key={c.key}
          type="button"
          className={`${styles.slashItem} ${i === activeIdx ? styles.slashItemActive : ""}`}
          onMouseEnter={() => setActiveIdx(i)}
          onClick={() => run(c)}
        >
          <span className={styles.menuIcon}>{c.icon}</span>
          <span>{t(`editor.${c.labelKey}`)}</span>
        </button>
      ))}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(menu, document.body) : null;
}
