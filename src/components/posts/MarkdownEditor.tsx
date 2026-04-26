"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Undo2,
  Redo2,
  Code,
  Quote,
  List,
  ListOrdered,
  SquareCheck,
  Link,
  ImageIcon,
  Table,
  Info,
} from "lucide-react";
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

  // Undo/Redo
  const historyRef = useRef<string[]>([value]);
  const historyIdxRef = useRef(0);
  const skipHistoryRef = useRef(false);

  useEffect(() => {
    if (skipHistoryRef.current) { skipHistoryRef.current = false; return; }
    const h = historyRef.current;
    const idx = historyIdxRef.current;
    // 현재 위치 이후 히스토리 자르고 새 값 추가
    if (value !== h[idx]) {
      historyRef.current = [...h.slice(0, idx + 1), value].slice(-100);
      historyIdxRef.current = historyRef.current.length - 1;
    }
  }, [value]);

  const undo = useCallback(() => {
    const idx = historyIdxRef.current;
    if (idx <= 0) return;
    historyIdxRef.current = idx - 1;
    skipHistoryRef.current = true;
    onChange(historyRef.current[idx - 1]);
  }, [onChange]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    const idx = historyIdxRef.current;
    if (idx >= h.length - 1) return;
    historyIdxRef.current = idx + 1;
    skipHistoryRef.current = true;
    onChange(h[idx + 1]);
  }, [onChange]);

  // 테이블 그리드 바깥 클릭 닫기
  useEffect(() => {
    if (!tableGrid) return;
    const handler = (e: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) setTableGrid(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tableGrid]);

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

  const insertTable = useCallback((cols: number, rows: number) => {
    const header = `| ${Array.from({ length: cols }, (_, i) => `Col ${i + 1}`).join(" | ")} |`;
    const divider = `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`;
    const body = Array.from({ length: rows }, () => `| ${Array.from({ length: cols }, () => " ").join(" | ")} |`).join("\n");
    insertAtCursor(`\n${header}\n${divider}\n${body}\n\n`);
    setTableGrid(false);
  }, [insertAtCursor]);

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

  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  return (
    <div className={`${styles.outer} ${compact ? styles.compact : ""}`} data-mobile-tab={mobileTab}>
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
        <Tooltip content={language === "ko" ? "실행 취소" : "Undo"}><button type="button" className={styles.tbBtn} onClick={undo}>
          <Undo2 size={14} />
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "다시 실행" : "Redo"}><button type="button" className={styles.tbBtn} onClick={redo}>
          <Redo2 size={14} />
        </button></Tooltip>
        <div className={styles.tbDivider} />
        <Tooltip content={language === "ko" ? "제목 1" : "Heading 1"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("# ")}>H1</button></Tooltip>
        <Tooltip content={language === "ko" ? "제목 2" : "Heading 2"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("## ")}>H2</button></Tooltip>
        <Tooltip content={language === "ko" ? "제목 3" : "Heading 3"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("### ")}>H3</button></Tooltip>
        <div className={styles.tbDivider} />
        <Tooltip content={language === "ko" ? "굵게" : "Bold"}><button type="button" className={styles.tbBtn} onClick={() => wrapSelection("**", "**", "bold")}><strong>B</strong></button></Tooltip>
        <Tooltip content={language === "ko" ? "기울임" : "Italic"}><button type="button" className={styles.tbBtn} onClick={() => wrapSelection("*", "*", "italic")}><em>I</em></button></Tooltip>
        <Tooltip content={language === "ko" ? "취소선" : "Strikethrough"}><button type="button" className={styles.tbBtn} onClick={() => wrapSelection("~~", "~~", "text")}><s>S</s></button></Tooltip>
        <Tooltip content={language === "ko" ? "인라인 코드" : "Inline Code"}><button type="button" className={styles.tbBtn} onClick={() => wrapSelection("`", "`", "code")}>
          <Code size={14} />
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "코드 블록" : "Code Block"}><button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n```\ncode\n```\n")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
        </button></Tooltip>
        <div className={styles.tbDivider} />
        <Tooltip content={language === "ko" ? "인용문" : "Blockquote"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("> ")}>
          <Quote size={14} />
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "순서 없는 목록" : "Unordered List"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("- ")}>
          <List size={14} />
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "순서 있는 목록" : "Ordered List"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("1. ")}>
          <ListOrdered size={14} />
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "체크리스트" : "Checklist"}><button type="button" className={styles.tbBtn} onClick={() => insertLinePrefix("- [ ] ")}>
          <SquareCheck size={14} />
        </button></Tooltip>
        <div className={styles.tbDivider} />
        <Tooltip content={language === "ko" ? "링크" : "Link"}><button type="button" className={styles.tbBtn} onClick={() => wrapSelection("[", "](url)", "link text")}>
          <Link size={14} />
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "이미지" : "Image"}><button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n![image](url)\n")}>
          <ImageIcon size={14} />
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "구분선" : "Horizontal Rule"}><button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n---\n")}>HR</button></Tooltip>
        <div className={styles.tbTableWrap} ref={tableRef}>
          <Tooltip content={language === "ko" ? "표" : "Table"}><button type="button" className={styles.tbBtn} onClick={() => setTableGrid(!tableGrid)}>
            <Table size={14} />
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
          const defText = `\n\n[^${nextNum}]: ${fnLabel}`;
          const trimmedAfter = after.replace(/\n+$/, "");
          onChange(`${before}${refText}${trimmedAfter}${defText}\n`);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = pos + refText.length;
            ta.focus();
          });
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20"/><text x="9" y="15" fontSize="10" fill="currentColor" stroke="none" fontFamily="serif">1</text></svg>
        </button></Tooltip>
        <Tooltip content={language === "ko" ? "알림 블록" : "Alert Block"}><button type="button" className={styles.tbBtn} onClick={() => insertAtCursor("\n> [!NOTE]\n> ")}>
          <Info size={14} />
        </button></Tooltip>
      </div>
      <div className={styles.panelTabs}>
        <button type="button" className={`${styles.panelTab} ${mobileTab === "edit" ? styles.panelTabActive : ""}`} onClick={() => setMobileTab("edit")}>{editLabel ?? "Editor"}</button>
        <button type="button" className={`${styles.panelTab} ${mobileTab === "preview" ? styles.panelTabActive : ""}`} onClick={() => setMobileTab("preview")}>{previewLabel ?? "Preview"}</button>
      </div>
      <div className={styles.wrapper}>
        <div className={styles.editorPane}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            data-lenis-prevent
            value={value}
            onChange={(e) => {
              let val = e.target.value;
              // 고아 각주 정의 자동 정리: 참조 [^N]이 없는 정의 [^N]: 삭제
              const refs = new Set((val.match(/\[\^(\d+)\](?!:)/g) ?? []).map((m) => m.replace(/\D/g, "")));
              val = val.replace(/\n\[\^(\d+)\]:.*$/gm, (line, num) => refs.has(num) ? line : "");
              // 고아 각주 참조 자동 정리: 정의 [^N]: 이 없는 참조 [^N] 삭제
              const defs = new Set((val.match(/\[\^(\d+)\]:/g) ?? []).map((m) => m.replace(/\D/g, "")));
              val = val.replace(/\[\^(\d+)\](?!:)/g, (match, num) => defs.has(num) ? match : "");
              // 끝에 빈 줄 정리
              val = val.replace(/\n{3,}$/g, "\n\n");
              onChange(val);
            }}
            onScroll={handleEditorScroll}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "z") {
                e.preventDefault();
                if (e.shiftKey) redo(); else undo();
              }
            }}
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
