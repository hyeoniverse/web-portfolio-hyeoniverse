"use client";

// ── Slash Menu (/) ──
// 노션식 슬래시 명령. 빈 문단에서 "/" 입력 시, 그 블록 텍스트("/query")를 읽어 명령을
// 필터링하는 floating 메뉴를 caret 위치에 띄운다. ↑/↓ 이동, Enter/Tab 선택, Esc 취소.
// 공식 @platejs/slash-command 는 메뉴 UI 가 @ariakit 기반(미설치)이라, 검증된 패턴
// (useEditorSelector 로 블록 텍스트 구독 + useVirtualFloating + keydown capture)으로 자체 구현.

import * as React from "react";
import { createPortal } from "react-dom";
import { useEditorRef, useEditorSelector, useEditorId, useEventEditorValue } from "platejs/react";
import { useVirtualFloating, offset, flip, shift } from "@platejs/floating";
import { toggleList } from "@platejs/list";
import { toggleCodeBlock } from "@platejs/code-block";
import { insertTable } from "@platejs/table";
import { insertEquation } from "@platejs/math";
import { insertToc } from "@platejs/toc";
import {
  Pilcrow, Heading1, Heading2, Heading3, Quote,
  List, ListOrdered, ListChecks,
  Image as ImageIcon, Video,
  Code, Minus, Table as TableIcon, Lightbulb, Columns2, Columns3, ChevronRight, Sigma, ListTree, Workflow, LayoutPanelTop, Vote,
} from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { genPollId } from "../PollElements";
import { _imageUploadFn, _slashOpenTrigger } from "../utils";
import styles from "../../RichTextEditor.module.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ICON = 16;

type Cmd = {
  key: string;
  labelKey: string;
  icon: React.ReactNode;
  keywords: string[];
  run: (editor: any) => void;
};

// 다음 블록 위치에 노드 삽입 (현재 블록 다음)
const insertAfter = (e: any, node: any) => {
  const sel = e.selection;
  const at = sel ? [sel.anchor.path[0] + 1] : [e.children.length];
  e.tf.insertNodes(node, { at });
};
const insertColumns = (e: any, cols: number) => {
  const colChildren = Array.from({ length: cols }, (_, i) => ({
    type: "column",
    width: `${i < cols - 1 ? Math.floor(100 / cols) : 100 - Math.floor(100 / cols) * (cols - 1)}%`,
    children: [{ type: "p", children: [{ text: "" }] }],
  }));
  insertAfter(e, { type: "column_group", children: colChildren });
};
const triggerImageUpload = (e: any) => {
  const fn = _imageUploadFn.current;
  if (!fn) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    try { const url = await fn(f); if (url) e.tf.insertNodes({ type: "img", url, children: [{ text: "" }] }); } catch { /* ignore */ }
  };
  input.click();
};

const GROUPS: { labelKey: string; items: Cmd[] }[] = [
  { labelKey: "groupBasic", items: [
    { key: "p", labelKey: "paragraph", icon: <Pilcrow size={ICON} />, keywords: ["text", "본문", "paragraph", "para"], run: (e) => e.tf.setNodes({ type: "p" }) },
    { key: "h1", labelKey: "heading1", icon: <Heading1 size={ICON} />, keywords: ["heading", "제목", "title", "h1"], run: (e) => e.tf.toggleBlock("h1") },
    { key: "h2", labelKey: "heading2", icon: <Heading2 size={ICON} />, keywords: ["heading", "제목", "h2"], run: (e) => e.tf.toggleBlock("h2") },
    { key: "h3", labelKey: "heading3", icon: <Heading3 size={ICON} />, keywords: ["heading", "제목", "h3"], run: (e) => e.tf.toggleBlock("h3") },
    { key: "quote", labelKey: "blockquote", icon: <Quote size={ICON} />, keywords: ["quote", "인용"], run: (e) => e.tf.toggleBlock("blockquote") },
  ] },
  { labelKey: "groupLists", items: [
    { key: "ul", labelKey: "bulletList", icon: <List size={ICON} />, keywords: ["bullet", "list", "불릿", "글머리", "목록"], run: (e) => toggleList(e, { listStyleType: "disc" }) },
    { key: "ol", labelKey: "numberedList", icon: <ListOrdered size={ICON} />, keywords: ["number", "ordered", "번호", "목록"], run: (e) => toggleList(e, { listStyleType: "decimal" }) },
    { key: "todo", labelKey: "todoList", icon: <ListChecks size={ICON} />, keywords: ["todo", "check", "할일", "체크"], run: (e) => { const en = e.api.block(); if (en) e.tf.setNodes({ checked: false, listStyleType: "todo" }, { at: en[1] }); } },
  ] },
  { labelKey: "groupMedia", items: [
    { key: "image", labelKey: "insertImage", icon: <ImageIcon size={ICON} />, keywords: ["image", "이미지", "사진", "그림", "photo", "picture"], run: (e) => triggerImageUpload(e) },
    { key: "video", labelKey: "insertEmbed", icon: <Video size={ICON} />, keywords: ["video", "비디오", "embed", "youtube", "임베드", "동영상"], run: (e) => insertAfter(e, { type: "media_embed", url: "", children: [{ text: "" }] }) },
  ] },
  { labelKey: "groupContainer", items: [
    { key: "callout", labelKey: "insertCallout", icon: <Lightbulb size={ICON} />, keywords: ["callout", "콜아웃", "노트"], run: (e) => { const sel = e.selection; const at = sel ? [sel.anchor.path[0] + 1] : [e.children.length]; e.tf.insertNodes({ type: "callout", bg: "var(--bg-tertiary)", icon: "💡", children: [{ type: "p", children: [{ text: "" }] }] }, { at }); } },
    { key: "toggle", labelKey: "insertToggle", icon: <ChevronRight size={ICON} />, keywords: ["toggle", "토글", "접기", "fold", "accordion"], run: (e) => insertAfter(e, { type: "toggle", open: true, children: [{ type: "p", children: [{ text: "" }] }, { type: "p", children: [{ text: "" }] }] }) },
    { key: "tabs", labelKey: "insertTabs", icon: <LayoutPanelTop size={ICON} />, keywords: ["tabs", "탭", "tab"], run: (e) => insertAfter(e, { type: "tabs", activeTab: 0, children: [{ type: "tab_panel", label: "Tab 1", children: [{ type: "p", children: [{ text: "" }] }] }, { type: "tab_panel", label: "Tab 2", children: [{ type: "p", children: [{ text: "" }] }] }] }) },
  ] },
  { labelKey: "groupData", items: [
    { key: "code", labelKey: "codeBlock", icon: <Code size={ICON} />, keywords: ["code", "코드"], run: (e) => toggleCodeBlock(e) },
    { key: "table", labelKey: "insertTable", icon: <TableIcon size={ICON} />, keywords: ["table", "표"], run: (e) => e.tf.withMerging(() => insertTable(e, { colCount: 3, rowCount: 3, header: true })) },
    { key: "equation", labelKey: "equation", icon: <Sigma size={ICON} />, keywords: ["equation", "math", "수식", "latex"], run: (e) => insertEquation(e) },
    { key: "mermaid", labelKey: "mermaid", icon: <Workflow size={ICON} />, keywords: ["mermaid", "diagram", "다이어그램", "chart", "flow"], run: (e) => e.tf.insertNodes({ type: "code_block", lang: "mermaid", children: [{ type: "code_line", children: [{ text: "graph TD" }] }, { type: "code_line", children: [{ text: "  A[Start] --> B[End]" }] }] }) },
    { key: "poll", labelKey: "insertPoll", icon: <Vote size={ICON} />, keywords: ["poll", "vote", "투표", "설문"], run: (e) => insertAfter(e, { type: "poll", pollId: genPollId(), multiple: false, options: [{ optionId: genPollId(), label: "항목 1" }, { optionId: genPollId(), label: "항목 2" }], children: [{ text: "" }] }) },
  ] },
  { labelKey: "groupLayout", items: [
    { key: "col2", labelKey: "columns2", icon: <Columns2 size={ICON} />, keywords: ["column", "columns", "열", "단", "2", "분할"], run: (e) => insertColumns(e, 2) },
    { key: "col3", labelKey: "columns3", icon: <Columns3 size={ICON} />, keywords: ["column", "columns", "열", "단", "3", "분할"], run: (e) => insertColumns(e, 3) },
    { key: "hr", labelKey: "insertHr", icon: <Minus size={ICON} />, keywords: ["divider", "hr", "구분", "선"], run: (e) => e.tf.insertNodes({ type: "hr", children: [{ text: "" }] }) },
    { key: "toc", labelKey: "toc", icon: <ListTree size={ICON} />, keywords: ["toc", "목차", "contents", "outline"], run: (e) => insertToc(e) },
  ] },
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

export default function SlashMenu({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const editorId = useEditorId();
  const focusedId = useEventEditorValue("focus");
  const focused = editorId === focusedId;
  const [activeIdx, setActiveIdx] = React.useState(0);
  // + 버튼으로 "/" 없이 수동 오픈 — 이때는 블록 텍스트 전체를 필터 쿼리로 사용
  const [manualOpen, setManualOpen] = React.useState(false);
  const cancelRef = React.useRef<(() => void) | null>(null);
  const prevManual = React.useRef(false);
  React.useEffect(() => {
    _slashOpenTrigger.current = (onCancel) => { cancelRef.current = onCancel ?? null; setManualOpen(true); };
    return () => { _slashOpenTrigger.current = null; };
  }, []);
  // 수동 오픈이 명령 선택 없이 닫히면(blur/Esc/이동) onCancel 실행 → 빈 추가 블록 제거
  React.useEffect(() => {
    if (prevManual.current && !manualOpen) {
      cancelRef.current?.();
      cancelRef.current = null;
    }
    prevManual.current = manualOpen;
  }, [manualOpen]);

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

  // 다른 블록으로 이동하거나 선택이 풀리면(blockText null) 수동 오픈 해제
  React.useEffect(() => { if (blockText == null) setManualOpen(false); }, [blockText]);
  // 에디터 포커스를 잃으면(blur) 수동 오픈 해제 → onCancel 로 빈 추가 블록 제거.
  // (메뉴 항목은 onMouseDown preventDefault 라 클릭해도 에디터 포커스 유지됨)
  React.useEffect(() => { if (!focused) setManualOpen(false); }, [focused]);

  const query = React.useMemo(() => {
    if (blockText == null) return null;
    // 수동 오픈: "/" 없이 블록 텍스트 전체가 쿼리 (공백 들어가면 닫힘)
    if (manualOpen) return /\s/.test(blockText) ? null : blockText;
    const m = /^\/([^\s/]*)$/.exec(blockText);
    return m ? m[1] : null;
  }, [blockText, manualOpen]);

  const groups = React.useMemo(() => {
    if (query == null) return [] as { labelKey: string; items: Cmd[] }[];
    const q = query.toLowerCase();
    return GROUPS
      .map((g) => ({
        labelKey: g.labelKey,
        items: q
          ? g.items.filter((c) => {
              const label = (t(`editor.${c.labelKey}`) as string).toLowerCase();
              return label.includes(q) || c.keywords.some((k) => k.toLowerCase().includes(q));
            })
          : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [query, t]);
  const items = React.useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const open = query != null && items.length > 0 && focused;

  const { refs, style, update } = useVirtualFloating({
    open,
    getBoundingClientRect: caretRect,
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [offset(18), flip({ padding: 12 }), shift({ padding: 12 })],
  });

  React.useEffect(() => { if (open) update?.(); }, [open, query, update]);
  React.useEffect(() => { setActiveIdx(0); }, [query]);
  // 슬래시 메뉴 열림/닫힘을 부모에 알림 → floating 포맷 바 숨김
  React.useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);

  // 열린 동안 현재(커서) 블록에 옅은 배경 표시
  React.useEffect(() => {
    if (!open) return;
    let dom: HTMLElement | null = null;
    try { const entry = editor.api.block(); if (entry) dom = editor.api.toDOMNode(entry[0]) as HTMLElement; } catch { /* ignore */ }
    if (!dom) return;
    dom.setAttribute("data-slash-active", "");
    return () => { try { dom?.removeAttribute("data-slash-active"); } catch { /* ignore */ } };
  }, [open, editor, blockText]);

  // "/query" 텍스트(블록 시작~커서) 삭제
  const deleteSlashText = React.useCallback(() => {
    const entry = editor.api.block();
    if (!entry || !editor.selection) return;
    const start = editor.api.start(entry[1]);
    if (!start) return;
    editor.tf.delete({ at: { anchor: start, focus: editor.selection.focus } });
  }, [editor]);

  const run = React.useCallback((cmd: Cmd) => {
    cancelRef.current = null; // 명령 선택 — 추가 블록 유지(취소 안 함)
    setManualOpen(false);
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
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setManualOpen(false); deleteSlashText(); setTimeout(() => editor.tf.focus(), 0); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, items, activeIdx, run, editor, deleteSlashText]);

  if (!open) return null;

  const menu = (
    // eslint-disable-next-line react-hooks/refs
    <div ref={refs.setFloating} className={styles.slashMenu} style={style} data-lenis-prevent onMouseDown={(e) => e.preventDefault()}>
      {groups.map((g) => (
        <div key={g.labelKey} className={styles.slashGroup}>
          <div className={styles.slashGroupLabel}>{t(`editor.${g.labelKey}`)}</div>
          {g.items.map((c) => {
            const i = items.indexOf(c);
            return (
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
            );
          })}
        </div>
      ))}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(menu, document.body) : null;
}
