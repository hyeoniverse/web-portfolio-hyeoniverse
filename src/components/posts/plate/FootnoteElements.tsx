"use client";

import React, { useState, useRef, useEffect } from "react";
import { PlateElement, type PlateElementProps, useEditorRef } from "platejs/react";
import styles from "../RichTextEditor.module.css";

/**
 * 각주 참조 (인라인) — 본문 안 위첨자 [1]
 * node: { type: "footnote_ref", footnoteId: "1", children: [{ text: "" }] }
 */
export function FootnoteRefElement(props: PlateElementProps) {
  const { element } = props;
  const el = element as unknown as { footnoteId?: string };
  const id = el.footnoteId || "?";
  const editor = useEditorRef();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(id);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const handleClick = () => {
    if (editing) return;
    const container = document.querySelector(`[data-footnote-content="${id}"]`);
    if (container) container.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(true);
    setDraft(id);
  };

  const commitEdit = (moveCursor?: boolean) => {
    const newId = draft.trim();
    if (!newId || newId === id) { setEditing(false); setDraft(id); }
    else {
      const refPath = editor.api.findPath(element);
      if (refPath) editor.tf.setNodes({ footnoteId: newId }, { at: refPath });
      for (const [, contentPath] of editor.api.nodes({
        at: [],
        match: (n) => (n as Record<string, unknown>).type === "footnote_content" && (n as Record<string, unknown>).footnoteId === id,
      })) {
        editor.tf.setNodes({ footnoteId: newId }, { at: contentPath });
      }
      setEditing(false);
    }
    if (moveCursor) {
      requestAnimationFrame(() => {
        const refPath = editor.api.findPath(element);
        if (refPath) {
          const after = editor.api.after(refPath);
          if (after) editor.tf.select(after);
          editor.tf.focus();
        }
      });
    }
  };

  return (
    <PlateElement {...props} as="span">
      <span contentEditable={false} style={{ userSelect: "none" }}>
        {editing ? (
          <sup className={styles.footnoteRef}>
            [<input
              ref={inputRef}
              className={styles.footnoteEditInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commitEdit()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); commitEdit(true); }
                else if (e.key === "ArrowLeft") { e.preventDefault(); commitEdit(); requestAnimationFrame(() => { const p = editor.api.findPath(element); if (p) { const before = editor.api.before(p); if (before) editor.tf.select(before); editor.tf.focus(); } }); }
                else if (e.key === "Escape") { setEditing(false); setDraft(id); }
              }}
            />]
          </sup>
        ) : (
          <sup className={styles.footnoteRef} data-footnote-ref={id} onClick={handleClick} onDoubleClick={handleDoubleClick}>
            [{id}]
          </sup>
        )}
      </span>
      {props.children}
    </PlateElement>
  );
}

/**
 * 각주 내용 (블록) — 문서 하단 각주 정의
 * node: { type: "footnote_content", footnoteId: "1", children: [{ text: "각주 설명" }] }
 */
export function FootnoteContentElement(props: PlateElementProps) {
  const { element, children, attributes } = props;
  const el = element as unknown as { footnoteId?: string };
  const id = el.footnoteId || "?";
  const editor = useEditorRef();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(id);
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commitEdit = () => {
    const newId = draft.trim();
    if (!newId || newId === id) { setEditing(false); setDraft(id); return; }
    const contentPath = editor.api.findPath(element);
    if (contentPath) editor.tf.setNodes({ footnoteId: newId }, { at: contentPath });
    for (const [, refPath] of editor.api.nodes({
      at: [],
      match: (n) => (n as Record<string, unknown>).type === "footnote_ref" && (n as Record<string, unknown>).footnoteId === id,
    })) {
      editor.tf.setNodes({ footnoteId: newId }, { at: refPath });
    }
    setEditing(false);
  };

  const handleIdClick = () => {
    if (clickTimer.current) return;
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      const ref = document.querySelector(`[data-footnote-ref="${id}"]`);
      if (ref) ref.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  const handleIdDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
    setEditing(true);
    setDraft(id);
  };

  return (
    <div
      {...attributes}
      className={styles.footnoteContent}
      data-footnote-content={id}
    >
      <span
        className={styles.footnoteContentId}
        contentEditable={false}
      >
        {editing ? (
          <>
            [<input
              ref={inputRef}
              className={styles.footnoteEditInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commitEdit()}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") { setEditing(false); setDraft(id); } }}
            />]
          </>
        ) : (
          <span onClick={handleIdClick} onDoubleClick={handleIdDoubleClick}>
            [{id}]
          </span>
        )}
      </span>
      <div className={styles.footnoteContentBody}>{children}</div>
    </div>
  );
}
