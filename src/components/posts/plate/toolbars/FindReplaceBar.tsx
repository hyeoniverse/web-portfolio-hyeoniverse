"use client";

// ── Find & Replace Bar ──
// Cmd/Ctrl+F 로 열리는 찾기/바꾸기 바. 입력 시 FindReplacePlugin.search 옵션을 갱신해
// 매치를 하이라이트하고, ↵/Shift+↵ 또는 ↑/↓ 로 매치 이동, 바꾸기/모두 바꾸기 지원.

import * as React from "react";
import { useEditorRef } from "platejs/react";
import { FindReplacePlugin } from "@platejs/find-replace";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "../../RichTextEditor.module.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Range = { anchor: { path: number[]; offset: number }; focus: { path: number[]; offset: number } };

function findRanges(editor: any, query: string): Range[] {
  const ranges: Range[] = [];
  if (!query) return ranges;
  const q = query.toLowerCase();
  for (const [node, path] of editor.api.nodes({ at: [], match: (n: any) => typeof n.text === "string" })) {
    const text = (node.text as string).toLowerCase();
    let idx = text.indexOf(q);
    while (idx !== -1) {
      ranges.push({ anchor: { path, offset: idx }, focus: { path, offset: idx + q.length } });
      idx = text.indexOf(q, idx + q.length);
    }
  }
  return ranges;
}

export default function FindReplaceBar() {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [replaceText, setReplaceText] = React.useState("");
  const [count, setCount] = React.useState(0);
  const [current, setCurrent] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const applySearch = React.useCallback((q: string) => {
    editor.setOption(FindReplacePlugin, "search", q);
    editor.api.redecorate?.(); // 하이라이트 데코레이션 갱신
    setCount(findRanges(editor, q).length);
    setCurrent(0);
  }, [editor]);

  // Cmd/Ctrl+F → 열기
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  const close = React.useCallback(() => {
    setOpen(false);
    editor.setOption(FindReplacePlugin, "search", "");
    editor.api.redecorate?.();
  }, [editor]);

  // 매치로 스크롤 (find 입력 포커스 유지 — 선택 변경 없이 DOM 스크롤만)
  const goTo = React.useCallback((idx: number) => {
    const ranges = findRanges(editor, query);
    if (!ranges.length) return;
    const n = ((idx % ranges.length) + ranges.length) % ranges.length;
    setCurrent(n);
    try {
      const domRange = editor.api.toDOMRange(ranges[n]);
      const el = domRange?.startContainer?.parentElement;
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch {
      /* ignore */
    }
  }, [editor, query]);

  const replaceCurrent = React.useCallback(() => {
    const ranges = findRanges(editor, query);
    if (!ranges.length) return;
    const r = ranges[Math.min(current, ranges.length - 1)];
    editor.tf.select(r);
    editor.tf.insertText(replaceText);
    setTimeout(() => applySearch(query), 0);
  }, [editor, query, replaceText, current, applySearch]);

  const replaceAll = React.useCallback(() => {
    const ranges = findRanges(editor, query).reverse(); // 뒤에서부터 → 앞 offset 보존
    if (!ranges.length) return;
    editor.tf.withoutNormalizing(() => {
      for (const r of ranges) {
        editor.tf.select(r);
        editor.tf.insertText(replaceText);
      }
    });
    setTimeout(() => applySearch(query), 0);
  }, [editor, query, replaceText, applySearch]);

  if (!open) return null;

  return (
    <div className={styles.findBar} onMouseDown={(e) => e.stopPropagation()}>
      <div className={styles.findRow}>
        <input
          ref={inputRef}
          className={styles.findInput}
          value={query}
          placeholder={t("editor.find")}
          onChange={(e) => { setQuery(e.target.value); applySearch(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); goTo(e.shiftKey ? current - 1 : current + 1); }
            else if (e.key === "Escape") { e.preventDefault(); close(); }
          }}
        />
        <span className={styles.findCount}>{count ? `${Math.min(current + 1, count)}/${count}` : "0/0"}</span>
        <button type="button" className={styles.findBtn} onClick={() => goTo(current - 1)} aria-label="prev">↑</button>
        <button type="button" className={styles.findBtn} onClick={() => goTo(current + 1)} aria-label="next">↓</button>
        <button type="button" className={styles.findBtn} onClick={close} aria-label="close">✕</button>
      </div>
      <div className={styles.findRow}>
        <input
          className={styles.findInput}
          value={replaceText}
          placeholder={t("editor.replace")}
          onChange={(e) => setReplaceText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); replaceCurrent(); } else if (e.key === "Escape") { e.preventDefault(); close(); } }}
        />
        <button type="button" className={styles.findTextBtn} onClick={replaceCurrent}>{t("editor.replace")}</button>
        <button type="button" className={styles.findTextBtn} onClick={replaceAll}>{t("editor.replaceAll")}</button>
      </div>
    </div>
  );
}
