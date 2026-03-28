"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import MarkdownRenderer from "./MarkdownRenderer";
import Tooltip from "@/components/ui/Tooltip";
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
  { syntax: "- [ ] / - [x]", desc: { ko: "체크리스트", en: "Checklist" } },
  { syntax: "[text](url)", desc: { ko: "링크", en: "Link" } },
  { syntax: "![alt](url)", desc: { ko: "이미지", en: "Image" } },
  { syntax: "---", desc: { ko: "구분선", en: "Horizontal rule" } },
  { syntax: "| A | B |\\n|---|---|", desc: { ko: "표", en: "Table" } },
  { syntax: "[^1] / [^1]: text", desc: { ko: "각주", en: "Footnote" } },
  { syntax: "$E=mc^2$ / $$...$$", desc: { ko: "수식 (KaTeX)", en: "Math (KaTeX)" } },
  { syntax: "> [!NOTE] / [!TIP]", desc: { ko: "알림 블록", en: "Alert block" } },
  { syntax: "<br>", desc: { ko: "줄바꿈", en: "Line break" } },
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
  const [tableGrid, setTableGrid] = useState(false);
  const [tableHover, setTableHover] = useState({ cols: 0, rows: 0 });
  const tableRef = useRef<HTMLDivElement>(null);

  // 테이블 그리드 바깥 클릭 닫기
  useEffect(() => {
    if (!tableGrid) return;
    const handler = (e: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) setTableGrid(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tableGrid]);

  const insertTable = useCallback((cols: number, rows: number) => {
    const header = `| ${Array.from({ length: cols }, (_, i) => `Col ${i + 1}`).join(" | ")} |`;
    const divider = `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`;
    const body = Array.from({ length: rows }, () => `| ${Array.from({ length: cols }, () => " ").join(" | ")} |`).join("\n");
    insertAtCursor(`\n${header}\n${divider}\n${body}\n\n`);
    setTableGrid(false);
  }, [insertAtCursor]);

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
      <div className={`${styles.helpPanel} ${showHelp ? styles.helpPanelOpen : ""}`} data-lenis-prevent>
        <div className={styles.helpGrid}>
          {MD_HELP.map((h) => (
            <div key={h.syntax} className={styles.helpRow}>
              <span className={styles.helpDesc}>{language === "ko" ? h.desc.ko : h.desc.en}</span>
              <code className={styles.helpSyntax}>{h.syntax}</code>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.toolbar}>
        <Tooltip content={language === "ko" ? "제목 1" : "Heading 1"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("# ")}>H1</button></Tooltip>
        <Tooltip content={language === "ko" ? "제목 2" : "Heading 2"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("## ")}>H2</button></Tooltip>
        <Tooltip content={language === "ko" ? "제목 3" : "Heading 3"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("### ")}>H3</button></Tooltip>
        <div className={styles.tbDivider} />
        <Tooltip content={language === "ko" ? "굵게" : "Bold"}><button type="button" className={styles.tbBtn} onClick={() => wrapSelection("**", "**", "bold")}><strong>B</strong></button></Tooltip>
        <Tooltip content={language === "ko" ? "기울임" : "Italic"}><button type="button" className={styles.tbBtn} onClick={() => wrapSelection("*", "*", "italic")}><em>I</em></button></Tooltip>
        <Tooltip content={language === "ko" ? "취소선" : "Strikethrough"}><button type="button" className={styles.tbBtn} onClick={() => wrapSelection("~~", "~~", "text")}><s>S</s></button></Tooltip>
        <Tooltip content={language === "ko" ? "인라인 코드" : "Inline Code"}><button type="button" className={styles.tbBtn} onClick={() => wrapSelection("`", "`", "code")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "코드 블록" : "Code Block"}><button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n```\ncode\n```\n")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
        </button></Tooltip>
        <div className={styles.tbDivider} />
        <Tooltip content={language === "ko" ? "인용문" : "Blockquote"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("> ")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "순서 없는 목록" : "Unordered List"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("- ")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "순서 있는 목록" : "Ordered List"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("1. ")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text><text x="2" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text><text x="2" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text></svg>
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "체크리스트" : "Checklist"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("- [ ] ")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>
        </button></Tooltip>
        <div className={styles.tbDivider} />
        <Tooltip content={language === "ko" ? "링크" : "Link"}><button type="button" className={styles.tbBtn} onClick={() => wrapSelection("[", "](url)", "link text")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "이미지" : "Image"}><button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n![image](url)\n")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "구분선" : "Horizontal Rule"}><button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n---\n")}>HR</button></Tooltip>
        <div className={styles.tbTableWrap} ref={tableRef}>
          <Tooltip content={language === "ko" ? "표" : "Table"}><button type="button" className={styles.tbBtn} onClick={() => setTableGrid(!tableGrid)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
          </button></Tooltip>
          {tableGrid && (
            <div className={styles.tbTableGrid}>
              {Array.from({ length: 6 }, (_, r) => (
                <div key={r} className={styles.tbTableRow}>
                  {Array.from({ length: 8 }, (_, c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.tbTableCell} ${c < tableHover.cols && r < tableHover.rows ? styles.tbTableCellActive : ""}`}
                      onMouseEnter={() => setTableHover({ cols: c + 1, rows: r + 1 })}
                      onClick={() => insertTable(c + 1, r + 1)}
                    />
                  ))}
                </div>
              ))}
              <div className={styles.tbTableLabel}>{tableHover.cols > 0 ? `${tableHover.cols} × ${tableHover.rows}` : "Select size"}</div>
            </div>
          )}
        </div>
        <div className={styles.tbDivider} />
        <Tooltip content={language === "ko" ? "인라인 수식" : "Inline Math"}><button type="button" className={styles.tbBtn} onClick={() => wrapSelection("$", "$", "E=mc^2")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><text x="7" y="17" fontSize="14" fill="currentColor" stroke="none" fontFamily="serif" fontStyle="italic">π</text></svg>
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "수식 블록" : "Math Block"}><button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n$$\nx^2 + y^2 = z^2\n$$\n")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><text x="6" y="17" fontSize="13" fill="currentColor" stroke="none" fontFamily="serif" fontStyle="italic">∑</text></svg>
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "각주" : "Footnote"}><button type="button" className={styles.tbBtn} onClick={() => {
          const fnLabel = language === "ko" ? "각주 내용" : "Describe here";
          const existing = (value.match(/\[\^(\d+)\]/g) ?? []).map((m) => parseInt(m.replace(/\D/g, "")));
          const nextNum = existing.length ? Math.max(...existing) + 1 : 1;
          const ta = textareaRef.current;
          if (!ta) return;
          const pos = ta.selectionStart;
          const before = value.slice(0, pos);
          const after = value.slice(pos);
          const refText = `[^${nextNum}]`;
          const defText = `\n[^${nextNum}]: ${fnLabel}`;
          onChange(`${before}${refText}${after}${defText}\n`);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = pos + refText.length;
            ta.focus();
          });
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20"/><text x="9" y="15" fontSize="10" fill="currentColor" stroke="none" fontFamily="serif">1</text></svg>
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "알림 블록" : "Alert Block"}><button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n> [!NOTE]\n> ")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </button></Tooltip>
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
          <div ref={previewRef} className={styles.preview} data-lenis-prevent onClick={(e) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest("a[href^='#']") as HTMLAnchorElement | null;
            if (!anchor) return;
            e.preventDefault();
            const id = decodeURIComponent(anchor.getAttribute("href")!.slice(1));
            const el = previewRef.current?.querySelector(`#${CSS.escape(id)}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }}>
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
