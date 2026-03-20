"use client";

import { useCallback, useRef, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import MarkdownRenderer from "./MarkdownRenderer";
import styles from "./MarkdownEditor.module.css";

/** 마크다운 본문에서 이미지 URL 추출 */
export function extractMarkdownImages(md: string): string[] {
  const urls: string[] = [];
  const re = /!\[.*?\]\((.*?)\)/g;
  let m;
  while ((m = re.exec(md)) !== null) {
    if (m[1]) urls.push(m[1]);
  }
  return urls;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  compact?: boolean;
  editLabel?: string;
  previewLabel?: string;
  showHelp?: boolean;
}

const MD_HELP = [
  { syntax: "# H1 / ## H2 / ### H3", desc: { ko: "제목", en: "Heading" } },
  { syntax: "**bold**", desc: { ko: "굵게", en: "Bold" } },
  { syntax: "*italic*", desc: { ko: "기울임", en: "Italic" } },
  { syntax: "~~strike~~", desc: { ko: "취소선", en: "Strikethrough" } },
  { syntax: "`code`", desc: { ko: "인라인 코드", en: "Inline code" } },
  { syntax: "```lang\\ncode\\n```", desc: { ko: "코드 블록", en: "Code block" } },
  { syntax: "> quote", desc: { ko: "인용문", en: "Blockquote" } },
  { syntax: "- item / 1. item", desc: { ko: "목록", en: "List" } },
  { syntax: "[text](url)", desc: { ko: "링크", en: "Link" } },
  { syntax: "![alt](url)", desc: { ko: "이미지", en: "Image" } },
  { syntax: "---", desc: { ko: "구분선", en: "Horizontal rule" } },
  { syntax: "| A | B |\\n|---|---|", desc: { ko: "표", en: "Table" } },
];

export default function MarkdownEditor({
  value,
  onChange,
  onImageUpload,
  compact,
  editLabel,
  previewLabel,
  showHelp: showHelpProp,
}: MarkdownEditorProps) {
  const { language } = useLanguage();
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const showHelp = showHelpProp ?? false;
  const [_uploading, setUploading] = useState(false);

  /** 현재 커서 위치에 텍스트 삽입 */
  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current;
    if (!ta) { onChange(value + text); return; }
    const pos = ta.selectionStart;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const next = `${before}${text}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = pos + text.length;
      ta.focus();
    });
  }, [value, onChange]);

  /** 선택 텍스트를 prefix/suffix로 감싸기 (선택 없으면 placeholder 삽입) */
  const wrapSelection = useCallback((prefix: string, suffix: string, placeholder: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const text = selected || placeholder;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = `${before}${prefix}${text}${suffix}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      // 선택 없었으면 placeholder를 선택 상태로
      if (!selected) {
        ta.selectionStart = start + prefix.length;
        ta.selectionEnd = start + prefix.length + placeholder.length;
      } else {
        ta.selectionStart = start;
        ta.selectionEnd = start + prefix.length + text.length + suffix.length;
      }
      ta.focus();
    });
  }, [value, onChange]);

  /** 줄 시작에 prefix 삽입 */
  const insertLinePrefix = useCallback((prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
    const before = value.slice(0, lineStart);
    const after = value.slice(lineStart);
    const next = `${before}${prefix}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = pos + prefix.length;
      ta.focus();
    });
  }, [value, onChange]);

  /** 이미지 업로드 → 마크다운 삽입 */
  const uploadAndInsert = useCallback(async (file: File) => {
    if (!onImageUpload) return;
    setUploading(true);
    try {
      const url = await onImageUpload(file);
      insertAtCursor(`![image](${url})\n`);
    } finally { setUploading(false); }
  }, [onImageUpload, insertAtCursor]);

  const handleEditorScroll = useCallback(
    (e: React.UIEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      const preview = previewRef.current;
      if (!preview) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;
      const ratio = el.scrollTop / maxScroll;
      preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
    },
    []
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!onImageUpload) return;
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await uploadAndInsert(file);
          break;
        }
      }
    },
    [onImageUpload, uploadAndInsert]
  );

  /** 드래그앤드롭 이미지 */
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLTextAreaElement>) => {
      if (!onImageUpload) return;
      const files = e.dataTransfer.files;
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          e.preventDefault();
          await uploadAndInsert(file);
          break;
        }
      }
    },
    [onImageUpload, uploadAndInsert]
  );

  return (
    <div className={`${styles.outer} ${compact ? styles.compact : ""}`}>
      {showHelp && (
        <div className={styles.helpPanel} data-lenis-prevent>
          <div className={styles.helpGrid}>
            {MD_HELP.map((h) => (
              <div key={h.syntax} className={styles.helpRow}>
                <code className={styles.helpSyntax}>{h.syntax}</code>
                <span className={styles.helpDesc}>{language === "ko" ? h.desc.ko : h.desc.en}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={styles.toolbar}>
        <button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("# ")} title="H1">H1</button>
        <button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("## ")} title="H2">H2</button>
        <button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("### ")} title="H3">H3</button>
        <div className={styles.tbDivider} />
        <button type="button" className={styles.tbBtn} onClick={() => wrapSelection("**", "**", "bold")} title="Bold"><strong>B</strong></button>
        <button type="button" className={styles.tbBtn} onClick={() => wrapSelection("*", "*", "italic")} title="Italic"><em>I</em></button>
        <button type="button" className={styles.tbBtn} onClick={() => wrapSelection("~~", "~~", "text")} title="Strikethrough"><s>S</s></button>
        <button type="button" className={styles.tbBtn} onClick={() => wrapSelection("`", "`", "code")} title="Inline Code">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </button>
        <div className={styles.tbDivider} />
        <button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("> ")} title="Blockquote">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>
        </button>
        <button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("- ")} title="Unordered List">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
        </button>
        <button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("1. ")} title="Ordered List">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text><text x="2" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text><text x="2" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text></svg>
        </button>
        <button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("- [ ] ")} title="Todo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>
        </button>
        <div className={styles.tbDivider} />
        <button type="button" className={styles.tbBtn} onClick={() => wrapSelection("[", "](url)", "link text")} title="Link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        </button>
        <button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n![image](url)\n")} title="Image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        </button>
        <button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n```\ncode\n```\n")} title="Code Block">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="16" y2="14"/></svg>
        </button>
        <button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n---\n")} title="Horizontal Rule">HR</button>
        <button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n| Col 1 | Col 2 | Col 3 |\n| --- | --- | --- |\n| | | |\n")} title="Table">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </button>
      </div>
      <div className={styles.panelTabs}>
        <span className={styles.panelTab}>{editLabel ?? "Editor"}</span>
        <span className={styles.panelTab}>{previewLabel ?? "Preview"}</span>
      </div>
      <div className={styles.wrapper}>
        <div className={styles.editorPane}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            data-lenis-prevent
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleEditorScroll}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            placeholder="Write your content in Markdown..."
            spellCheck={false}
          />
        </div>
        <div className={styles.previewPane}>
          <div ref={previewRef} className={styles.preview} data-lenis-prevent>
            {value ? (
              <MarkdownRenderer content={value} />
            ) : (
              <span className={styles.emptyPreview}>Preview will appear here</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
