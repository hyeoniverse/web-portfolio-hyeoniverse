"use client";

// ── 경량 CodeMirror 6 에디터 (srcdoc 러너용) ── html/css/js 언어 + 앱 토큰 테마.
import { type CSSProperties, useEffect, useRef } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, highlightSpecialChars } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle, indentUnit } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { tags as t } from "@lezer/highlight";

export type CmLang = "html" | "css" | "javascript";

const languageExt = (lang: CmLang) =>
  lang === "html" ? html() : lang === "css" ? css() : javascript();

// 앱 CSS 토큰 기반 테마 — 자동 라이트/다크
const theme = EditorView.theme({
  "&": { color: "var(--text-primary)", backgroundColor: "transparent", height: "100%" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-mono), monospace", fontSize: "var(--pg-cm-font, 13px)", lineHeight: "1.65" },
  ".cm-content": { caretColor: "var(--text-accent)", padding: "8px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--text-accent)" },
  ".cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--color-accent-alpha-20)",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--color-accent-alpha-30)",
  },
  ".cm-gutters": { backgroundColor: "transparent", color: "var(--text-muted)", border: "none" },
  // 반투명이어야 한다 — 솔리드면 select-all 시 커서가 놓인 마지막(활성) 줄에서 활성줄 배경이
  // 그 아래 그려지는 선택 레이어(.cm-selectionBackground)를 덮어 "마지막 줄만 하이라이트 안 됨"으로 보인다.
  // 아주 옅게(alpha-5) — 현재 줄 표시는 은은하게만.
  ".cm-activeLine": { backgroundColor: "var(--color-neutral-alpha-5)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--text-secondary)" },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "var(--bg-accent-subtle)", outline: "1px solid var(--border-default-color)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-light-color)",
    borderRadius: "var(--radius-md)", color: "var(--text-primary)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--bg-accent-subtle)", color: "var(--text-primary)",
  },
});

const highlight = HighlightStyle.define([
  { tag: t.comment, color: "var(--text-muted)", fontStyle: "italic" },
  { tag: [t.keyword, t.moduleKeyword, t.controlKeyword, t.operatorKeyword], color: "var(--text-accent)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--text-success)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--text-warning)" },
  { tag: [t.propertyName, t.definition(t.propertyName)], color: "var(--text-info)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--text-info)" },
  { tag: [t.tagName, t.angleBracket], color: "var(--text-accent)" },
  { tag: [t.attributeName], color: "var(--text-warning)" },
  { tag: [t.className, t.typeName], color: "var(--text-info)" },
  { tag: [t.variableName, t.punctuation], color: "var(--text-primary)" },
]);

const langCompartment = new Compartment();

export default function CodeMirrorEditor({ value, language, onChange, readOnly, fontSize = 13 }: {
  value: string;
  language: CmLang;
  onChange?: (code: string) => void;
  readOnly?: boolean;
  fontSize?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  // 최초 1회 EditorView 생성
  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          indentUnit.of("  "),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          highlightActiveLine(),
          syntaxHighlighting(highlight, { fallback: true }),
          langCompartment.of(languageExt(language)),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
          theme,
          EditorView.editable.of(!readOnly),
          EditorState.readOnly.of(!!readOnly),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cb.current?.(u.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 언어 변경(탭 전환) — 리컴파일
  useEffect(() => {
    viewRef.current?.dispatch({ effects: langCompartment.reconfigure(languageExt(language)) });
  }, [language]);

  // 외부에서 value 가 바뀌면(탭 전환 등) 문서 교체 — 내부 편집과 동일하면 skip
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={hostRef} style={{ height: "100%", overflow: "hidden", "--pg-cm-font": `${fontSize}px` } as CSSProperties} data-lenis-prevent />;
}
