"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { FontFamily } from "@tiptap/extension-font-family";
import Youtube from "@tiptap/extension-youtube";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CharacterCount from "@tiptap/extension-character-count";
import { common, createLowlight } from "lowlight";
import { loadGoogleFont } from "@/lib/loadGoogleFont";
import { useTheme } from "@/providers/ThemeProvider";
import { useModalStore } from "@/stores/modalStore";
import Tooltip from "@/components/ui/Tooltip";
import styles from "./RichTextEditor.module.css";

// ── Embed / Link modal content ──
function EmbedModalContent({ onInsert }: { onInsert: (url: string) => void }) {
  const { closeModal } = useModalStore();
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  const submit = () => { if (url.trim()) { onInsert(url.trim()); closeModal(); } };
  return (
    <div className={styles.embedModalBody}>
      <p className={styles.embedModalDesc}>YouTube, Twitter/X, Instagram, Spotify, SoundCloud, Figma 등을 지원합니다.</p>
      <input ref={inputRef} type="url" className={styles.embedModalInput} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
      <div className={styles.embedModalActions}>
        <button type="button" className={styles.embedModalCancel} onClick={() => closeModal()}>취소</button>
        <button type="button" className={styles.embedModalConfirm} disabled={!url.trim()} onClick={submit}>삽입</button>
      </div>
    </div>
  );
}

function LinkModalContent({ onInsert }: { onInsert: (url: string) => void }) {
  const { closeModal } = useModalStore();
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  const submit = () => { if (url.trim()) { onInsert(url.trim()); closeModal(); } };
  return (
    <div className={styles.embedModalBody}>
      <p className={styles.embedModalDesc}>텍스트를 선택한 상태에서 삽입하면 해당 텍스트에 링크가 적용됩니다.</p>
      <input ref={inputRef} type="url" className={styles.embedModalInput} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
      <div className={styles.embedModalActions}>
        <button type="button" className={styles.embedModalCancel} onClick={() => closeModal()}>취소</button>
        <button type="button" className={styles.embedModalConfirm} disabled={!url.trim()} onClick={submit}>삽입</button>
      </div>
    </div>
  );
}

// ── Math modal ──
function MathModalContent({
  latex: initialLatex = "",
  mode: initialMode = "block",
  onInsert,
}: {
  latex?: string;
  mode?: "inline" | "block";
  onInsert: (latex: string, mode: "inline" | "block") => void;
}) {
  const { closeModal } = useModalStore();
  const [latex, setLatex] = useState(initialLatex);
  const [mode, setMode] = useState<"inline" | "block">(initialMode);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!previewRef.current) return;
    try {
      katex.render(latex || "f(x)", previewRef.current, {
        throwOnError: false,
        displayMode: mode === "block",
      });
    } catch {}
  }, [latex, mode]);

  const submit = () => {
    if (latex.trim()) { onInsert(latex.trim(), mode); closeModal(); }
  };

  return (
    <div className={styles.mathModalBody}>
      <div className={styles.mathModeRow}>
        <button type="button" className={`${styles.mathModeBtn} ${mode === "inline" ? styles.mathModeBtnActive : ""}`} onClick={() => setMode("inline")}>인라인</button>
        <button type="button" className={`${styles.mathModeBtn} ${mode === "block" ? styles.mathModeBtnActive : ""}`} onClick={() => setMode("block")}>블록</button>
      </div>
      <textarea
        className={styles.mathModalInput}
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        placeholder="\frac{a}{b} · \sum_{i=0}^{n} · \int_0^\infty"
        autoFocus
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
      />
      <div ref={previewRef} className={styles.mathPreview} />
      <div className={styles.embedModalActions}>
        <button type="button" className={styles.embedModalCancel} onClick={() => closeModal()}>취소</button>
        <button type="button" className={styles.embedModalConfirm} disabled={!latex.trim()} onClick={submit}>삽입</button>
      </div>
    </div>
  );
}

// ── Toolbar button with Tooltip ──
function TBtn({
  tooltip,
  active,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tooltip?: ReactNode; active?: boolean }) {
  const cls = [styles.toolbarBtn, active && styles.toolbarBtnActive, className]
    .filter(Boolean).join(" ");
  // onMouseDown에 preventDefault → 툴바 버튼 클릭 시 에디터 포커스/선택 유지
  const btn = (
    <button
      type="button"
      className={cls}
      onMouseDown={(e) => { e.preventDefault(); props.onMouseDown?.(e as React.MouseEvent<HTMLButtonElement>); }}
      {...props}
    >
      {children}
    </button>
  );
  if (!tooltip) return btn;
  return <Tooltip content={tooltip} delay={500} placement="top">{btn}</Tooltip>;
}

const lowlight = createLowlight(common);

// ── Custom font size extension ──
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize || null,
          renderHTML: (attrs) => {
            if (!attrs.fontSize) return {};
            return { style: `font-size: ${attrs.fontSize}` };
          },
        },
      },
    }];
  },
});

// ── Line height extension ──
const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el) => el.style.lineHeight || null,
          renderHTML: (attrs) => {
            if (!attrs.lineHeight) return {};
            return { style: `line-height: ${attrs.lineHeight}` };
          },
        },
      },
    }];
  },
});

// ── Letter spacing extension ──
const LetterSpacing = Extension.create({
  name: "letterSpacing",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        letterSpacing: {
          default: null,
          parseHTML: (el) => el.style.letterSpacing || null,
          renderHTML: (attrs) => {
            if (!attrs.letterSpacing) return {};
            return { style: `letter-spacing: ${attrs.letterSpacing}` };
          },
        },
      },
    }];
  },
});

// ── CustomImage: backward-compat for existing <img> without figure ──
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-width") || null,
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { "data-width": attrs.width, style: `width: ${attrs.width}` };
        },
      },
      dataAlign: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs) => ({ "data-align": attrs.dataAlign || "center" }),
      },
    };
  },
});

// ── Figure node: image + editable caption ──
function FigureView({ node, selected }: NodeViewProps) {
  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) || "";
  const width = node.attrs.width as string | null;
  const dataAlign = (node.attrs.dataAlign as string) || "center";

  return (
    <NodeViewWrapper
      as="figure"
      data-align={dataAlign}
      className={selected ? styles.figureSelected : ""}
    >
      <img
        src={src}
        alt={alt}
        data-align={dataAlign}
        style={width ? { width } : undefined}
      />
      <NodeViewContent as="div" className={styles.figCaption} />
    </NodeViewWrapper>
  );
}

const Figure = Node.create({
  name: "figure",
  group: "block",
  content: "inline*",
  draggable: true,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      width: { default: null },
      dataAlign: { default: "center" },
    };
  },

  parseHTML() {
    return [{
      tag: "figure",
      getAttrs: (node) => {
        const el = node as HTMLElement;
        const img = el.querySelector("img");
        if (!img) return false;
        return {
          src: img.getAttribute("src"),
          alt: img.getAttribute("alt"),
          width: img.getAttribute("data-width") || img.style.width || null,
          dataAlign:
            img.getAttribute("data-align") ||
            el.getAttribute("data-align") ||
            "center",
        };
      },
      contentElement: (node) => {
        const el = node as HTMLElement;
        return el.querySelector("figcaption") ?? el;
      },
    }];
  },

  renderHTML({ node }) {
    const src = node.attrs.src as string;
    const alt = (node.attrs.alt as string) ?? "";
    const width = node.attrs.width as string | null;
    const dataAlign = (node.attrs.dataAlign as string) ?? "center";
    const imgAttrs: Record<string, string> = { src, alt, "data-align": dataAlign };
    if (width) { imgAttrs.style = `width: ${width}`; imgAttrs["data-width"] = width; }
    return ["figure", { "data-align": dataAlign }, ["img", imgAttrs], ["figcaption", {}, 0]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },
});

// ── Shared extra attributes for table cells ──
function cellExtraAttrs() {
  return {
    background: {
      default: null,
      parseHTML: (el: Element) => (el as HTMLElement).style.backgroundColor || null,
      renderHTML: (attrs: Record<string, unknown>) =>
        attrs.background ? { style: `background-color: ${attrs.background}` } : {},
    },
    verticalAlign: {
      default: null,
      parseHTML: (el: Element) => (el as HTMLElement).style.verticalAlign || null,
      renderHTML: (attrs: Record<string, unknown>) =>
        attrs.verticalAlign ? { style: `vertical-align: ${attrs.verticalAlign}` } : {},
    },
    borderStyle: {
      default: null,
      parseHTML: (el: Element) => {
        const bs = (el as HTMLElement).style.borderStyle;
        return bs && bs !== "solid" ? bs : null;
      },
      renderHTML: (attrs: Record<string, unknown>) =>
        attrs.borderStyle ? { style: `border-style: ${attrs.borderStyle}` } : {},
    },
    borderWidth: {
      default: null,
      parseHTML: (el: Element) => {
        const bw = (el as HTMLElement).style.borderWidth;
        return bw && bw !== "1px" ? bw : null;
      },
      renderHTML: (attrs: Record<string, unknown>) => {
        if (attrs.borderWidth) return { style: `border-width: ${attrs.borderWidth}` };
        if (attrs.borderStyle === "double") return { style: "border-width: 3px" };
        return {};
      },
    },
    borderColor: {
      default: null,
      parseHTML: (el: Element) => (el as HTMLElement).style.borderColor || null,
      renderHTML: (attrs: Record<string, unknown>) =>
        attrs.borderColor ? { style: `border-color: ${attrs.borderColor}` } : {},
    },
    // "trbl" 각 문자 = 해당 방향 테두리 숨김 (hidden)
    borderHide: {
      default: null,
      parseHTML: (el: Element) => {
        const s = (el as HTMLElement).style;
        const sides: string[] = [];
        if (s.borderTopStyle === "hidden") sides.push("t");
        if (s.borderRightStyle === "hidden") sides.push("r");
        if (s.borderBottomStyle === "hidden") sides.push("b");
        if (s.borderLeftStyle === "hidden") sides.push("l");
        return sides.length > 0 ? sides.join("") : null;
      },
      renderHTML: (attrs: Record<string, unknown>) => {
        if (!attrs.borderHide) return {};
        const mask = attrs.borderHide as string;
        const parts: string[] = [];
        if (mask.includes("t")) parts.push("border-top-style: hidden");
        if (mask.includes("r")) parts.push("border-right-style: hidden");
        if (mask.includes("b")) parts.push("border-bottom-style: hidden");
        if (mask.includes("l")) parts.push("border-left-style: hidden");
        return { style: parts.join("; ") };
      },
    },
  };
}

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellExtraAttrs() };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellExtraAttrs() };
  },
});

// ── Custom TableRow with height attribute ──
const CustomTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      height: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.height || null,
        renderHTML: (attrs) => {
          if (!attrs.height) return {};
          return { style: `height: ${attrs.height}` };
        },
      },
    };
  },
});

// ── Math node views ──
function MathInlineView({ node, editor, getPos }: NodeViewProps) {
  const { openModal } = useModalStore();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    katex.render(node.attrs.latex || "\\square", ref.current, { throwOnError: false, displayMode: false });
  }, [node.attrs.latex]);

  return (
    <NodeViewWrapper
      as="span"
      className={styles.mathInline}
      onClick={() => {
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (pos === undefined) return;
        openModal(
          <MathModalContent
            latex={node.attrs.latex as string}
            mode="inline"
            onInsert={(latex) => {
              editor.chain().setNodeSelection(pos).command(({ tr, dispatch }) => {
                if (dispatch) tr.setNodeMarkup(pos, undefined, { latex });
                return true;
              }).run();
            }}
          />,
          { id: "math-edit", header: { title: "수식 편집" }, closeButton: true }
        );
      }}
    >
      <span ref={ref} />
    </NodeViewWrapper>
  );
}

function MathBlockView({ node, editor, getPos }: NodeViewProps) {
  const { openModal } = useModalStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    katex.render(node.attrs.latex || "f(x)", ref.current, { throwOnError: false, displayMode: true });
  }, [node.attrs.latex]);

  return (
    <NodeViewWrapper
      as="div"
      className={styles.mathBlock}
      onClick={() => {
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (pos === undefined) return;
        openModal(
          <MathModalContent
            latex={node.attrs.latex as string}
            mode="block"
            onInsert={(latex) => {
              editor.chain().setNodeSelection(pos).command(({ tr, dispatch }) => {
                if (dispatch) tr.setNodeMarkup(pos, undefined, { latex });
                return true;
              }).run();
            }}
          />,
          { id: "math-edit", header: { title: "수식 편집" }, closeButton: true }
        );
      }}
    >
      <div ref={ref} />
    </NodeViewWrapper>
  );
}

// ── Math TipTap extensions ──
const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-latex") ?? "",
        renderHTML: (attrs) => ({ "data-latex": attrs.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-type=math-inline]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "math-inline", "data-latex": node.attrs.latex })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathInlineView);
  },
});

const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-latex") ?? "",
        renderHTML: (attrs) => ({ "data-latex": attrs.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type=math-block]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "math-block", "data-latex": node.attrs.latex })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },
});

// ── SVG icons ──
function AlignIcon({ align }: { align: "left" | "center" | "right" | "justify" }) {
  return (
    <svg width="13" height="10" viewBox="0 0 13 10" fill="currentColor" aria-hidden="true">
      {align === "left" && <>
        <rect x="0" y="0" width="13" height="1.5" rx="0.75" />
        <rect x="0" y="4" width="8" height="1.5" rx="0.75" />
        <rect x="0" y="8" width="10" height="1.5" rx="0.75" />
      </>}
      {align === "center" && <>
        <rect x="0" y="0" width="13" height="1.5" rx="0.75" />
        <rect x="2.5" y="4" width="8" height="1.5" rx="0.75" />
        <rect x="1.5" y="8" width="10" height="1.5" rx="0.75" />
      </>}
      {align === "right" && <>
        <rect x="0" y="0" width="13" height="1.5" rx="0.75" />
        <rect x="5" y="4" width="8" height="1.5" rx="0.75" />
        <rect x="3" y="8" width="10" height="1.5" rx="0.75" />
      </>}
      {align === "justify" && <>
        <rect x="0" y="0" width="13" height="1.5" rx="0.75" />
        <rect x="0" y="4" width="13" height="1.5" rx="0.75" />
        <rect x="0" y="8" width="13" height="1.5" rx="0.75" />
      </>}
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <polyline points="9 12 12 15 20 7" />
    </svg>
  );
}

// ── Table toolbar icons ──
function TblRowBefore() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="8.5" width="13" height="6" rx="0.5"/>
      <line x1="1.5" y1="11.5" x2="14.5" y2="11.5"/>
      <line x1="8" y1="8.5" x2="8" y2="14.5"/>
      <line x1="8" y1="2" x2="8" y2="6.5"/>
      <polyline points="5.5,4.5 8,2 10.5,4.5"/>
    </svg>
  );
}

function TblRowAfter() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="6" rx="0.5"/>
      <line x1="1.5" y1="4.5" x2="14.5" y2="4.5"/>
      <line x1="8" y1="1.5" x2="8" y2="7.5"/>
      <line x1="8" y1="9.5" x2="8" y2="14"/>
      <polyline points="5.5,11.5 8,14 10.5,11.5"/>
    </svg>
  );
}

function TblRowRemove() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="5" width="13" height="6" rx="0.5"/>
      <line x1="1.5" y1="8" x2="14.5" y2="8"/>
      <line x1="8" y1="5" x2="8" y2="11"/>
      <line x1="5" y1="1.5" x2="11" y2="3.5"/>
      <line x1="11" y1="1.5" x2="5" y2="3.5"/>
    </svg>
  );
}

function TblColBefore() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8.5" y="1.5" width="6" height="13" rx="0.5"/>
      <line x1="11.5" y1="1.5" x2="11.5" y2="14.5"/>
      <line x1="8.5" y1="8" x2="14.5" y2="8"/>
      <line x1="2" y1="8" x2="6.5" y2="8"/>
      <polyline points="4.5,5.5 2,8 4.5,10.5"/>
    </svg>
  );
}

function TblColAfter() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="1.5" width="6" height="13" rx="0.5"/>
      <line x1="4.5" y1="1.5" x2="4.5" y2="14.5"/>
      <line x1="1.5" y1="8" x2="7.5" y2="8"/>
      <line x1="9.5" y1="8" x2="14" y2="8"/>
      <polyline points="11.5,5.5 14,8 11.5,10.5"/>
    </svg>
  );
}

function TblColRemove() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="1.5" width="6" height="13" rx="0.5"/>
      <line x1="8" y1="1.5" x2="8" y2="14.5"/>
      <line x1="5" y1="8" x2="11" y2="8"/>
      <line x1="1.5" y1="1.5" x2="3.5" y2="3.5"/>
      <line x1="3.5" y1="1.5" x2="1.5" y2="3.5"/>
    </svg>
  );
}

function TblMergeCells() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="5.5" height="10" rx="0.5"/>
      <rect x="9.5" y="3" width="5.5" height="10" rx="0.5"/>
      <polyline points="9,6 11.5,8 9,10"/>
      <polyline points="7,6 4.5,8 7,10"/>
    </svg>
  );
}

function TblSplitCell() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="14" height="10" rx="0.5"/>
      <line x1="8" y1="3" x2="8" y2="13"/>
      <polyline points="5.5,6 3,8 5.5,10"/>
      <polyline points="10.5,6 13,8 10.5,10"/>
    </svg>
  );
}

function TblAutoFit() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4.5" width="14" height="7" rx="0.5"/>
      <line x1="5.5" y1="4.5" x2="5.5" y2="11.5"/>
      <line x1="10.5" y1="4.5" x2="10.5" y2="11.5"/>
      <line x1="3" y1="2" x2="13" y2="2"/>
      <polyline points="1.5,3.5 3,2 4.5,3.5"/>
      <polyline points="11.5,3.5 13,2 14.5,3.5"/>
    </svg>
  );
}

function TblTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="2,4 14,4"/>
      <path d="M5.5,4V3C5.5,2.7 5.7,2.5 6,2.5h4C10.3,2.5 10.5,2.7 10.5,3V4"/>
      <path d="M3.5,4L4.5,13.5C4.5,13.8 4.7,14 5,14h6C11.3,14 11.5,13.8 11.5,13.5L12.5,4"/>
      <line x1="6.5" y1="7" x2="6.5" y2="11"/>
      <line x1="9.5" y1="7" x2="9.5" y2="11"/>
    </svg>
  );
}


function TblCellColorIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="0.5"/>
      <line x1="1" y1="7" x2="15" y2="7"/>
      <line x1="8" y1="1.5" x2="8" y2="14.5"/>
      <rect x="8.5" y="7.5" width="6" height="6" rx="0.3" fill="currentColor" fillOpacity="0.35" stroke="none"/>
    </svg>
  );
}

function TblEqualCols() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="0.5"/>
      <line x1="5.67" y1="1.5" x2="5.67" y2="14.5"/>
      <line x1="10.33" y1="1.5" x2="10.33" y2="14.5"/>
    </svg>
  );
}

function TblEqualRows() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="0.5"/>
      <line x1="1" y1="6" x2="15" y2="6"/>
      <line x1="1" y1="10.5" x2="15" y2="10.5"/>
    </svg>
  );
}

function TblZebra() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="2" width="14" height="12" rx="0.5"/>
      <rect x="1.75" y="6.25" width="12.5" height="3.5" fill="currentColor" fillOpacity="0.25" stroke="none"/>
      <line x1="1" y1="6" x2="15" y2="6"/>
      <line x1="1" y1="10" x2="15" y2="10"/>
    </svg>
  );
}

function TblResetFormat() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="14" height="10" rx="0.5"/>
      <line x1="1" y1="7.5" x2="15" y2="7.5"/>
      <line x1="7" y1="3" x2="7" y2="13"/>
      <line x1="9.5" y1="4.5" x2="13.5" y2="6.5" strokeWidth="1.2"/>
      <line x1="13.5" y1="4.5" x2="9.5" y2="6.5" strokeWidth="1.2"/>
    </svg>
  );
}

// Vertical align icons
function TblVAlignTop() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="0.5"/>
      <line x1="4" y1="4.5" x2="12" y2="4.5"/>
      <line x1="4" y1="7.5" x2="9" y2="7.5"/>
    </svg>
  );
}
function TblVAlignMiddle() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="0.5"/>
      <line x1="4" y1="6.5" x2="12" y2="6.5"/>
      <line x1="4" y1="9.5" x2="9" y2="9.5"/>
    </svg>
  );
}
function TblVAlignBottom() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="0.5"/>
      <line x1="4" y1="9" x2="12" y2="9"/>
      <line x1="4" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

// Border style icons
function TblBorderDash() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="0.5" strokeDasharray="3.5 2"/>
    </svg>
  );
}
function TblBorderDot() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="0.5" strokeDasharray="1 2.5"/>
    </svg>
  );
}
function TblBorderDouble() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="14" height="10" rx="0.5"/>
      <rect x="3" y="5" width="10" height="6" rx="0.3"/>
    </svg>
  );
}
function TblBorderSolid() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="0.5"/>
    </svg>
  );
}
function TblBorderNone() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="0.5" strokeDasharray="1.5 3" opacity="0.45"/>
      <line x1="4.5" y1="4.5" x2="11.5" y2="11.5" strokeWidth="1.3"/>
    </svg>
  );
}

// ── Border preset icon helper ──
// 2×2 미니 셀 그리드: 활성화 면은 불투명, 비활성화 면은 흐리게 표시
function BPresetIcon({ t, r, b, l, ih, iv }: { t?: boolean; r?: boolean; b?: boolean; l?: boolean; ih?: boolean; iv?: boolean }) {
  const on = 1;
  const off = 0.18;
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <line x1="1" y1="1"  x2="13" y2="1"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" opacity={t  ? on : off} />
      <line x1="13" y1="1" x2="13" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" opacity={r  ? on : off} />
      <line x1="1" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" opacity={b  ? on : off} />
      <line x1="1" y1="1"  x2="1"  y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" opacity={l  ? on : off} />
      <line x1="1" y1="6"  x2="13" y2="6"  stroke="currentColor" strokeWidth="0.9" strokeLinecap="square" opacity={ih ? on : off} />
      <line x1="7" y1="1"  x2="7"  y2="11" stroke="currentColor" strokeWidth="0.9" strokeLinecap="square" opacity={iv ? on : off} />
    </svg>
  );
}

// ── Constants ──
type FontEntry = { label: string; value: string; googleName?: string };
type FontGroup = { group: string; fonts: FontEntry[] };

const FONT_GROUPS: FontGroup[] = [
  {
    group: "Sans",
    fonts: [
      { label: "Inter", value: "'Inter', sans-serif", googleName: "Inter" },
      { label: "Space Grotesk", value: "'Space Grotesk', sans-serif", googleName: "Space Grotesk" },
      { label: "DM Sans", value: "'DM Sans', sans-serif", googleName: "DM Sans" },
      { label: "Poppins", value: "'Poppins', sans-serif", googleName: "Poppins" },
      { label: "Nunito", value: "'Nunito', sans-serif", googleName: "Nunito" },
    ],
  },
  {
    group: "Serif",
    fonts: [
      { label: "Instrument Serif", value: "'Instrument Serif', serif", googleName: "Instrument Serif" },
      { label: "Playfair Display", value: "'Playfair Display', serif", googleName: "Playfair Display" },
      { label: "Cormorant Garamond", value: "'Cormorant Garamond', serif", googleName: "Cormorant Garamond" },
      { label: "Lora", value: "'Lora', serif", googleName: "Lora" },
      { label: "EB Garamond", value: "'EB Garamond', serif", googleName: "EB Garamond" },
      { label: "Merriweather", value: "'Merriweather', serif", googleName: "Merriweather" },
    ],
  },
  {
    group: "Mono",
    fonts: [
      { label: "JetBrains Mono", value: "'JetBrains Mono', monospace", googleName: "JetBrains Mono" },
      { label: "Fira Code", value: "'Fira Code', monospace", googleName: "Fira Code" },
      { label: "Source Code Pro", value: "'Source Code Pro', monospace", googleName: "Source Code Pro" },
      { label: "IBM Plex Mono", value: "'IBM Plex Mono', monospace", googleName: "IBM Plex Mono" },
      { label: "DM Mono", value: "'DM Mono', monospace", googleName: "DM Mono" },
    ],
  },
  {
    group: "Korean Serif",
    fonts: [
      { label: "Noto Serif KR", value: "'Noto Serif KR', serif", googleName: "Noto Serif KR" },
      { label: "Nanum Myeongjo", value: "'Nanum Myeongjo', serif", googleName: "Nanum Myeongjo" },
      { label: "Gowun Batang", value: "'Gowun Batang', serif", googleName: "Gowun Batang" },
    ],
  },
  {
    group: "Korean Sans",
    fonts: [
      { label: "Noto Sans KR", value: "'Noto Sans KR', sans-serif", googleName: "Noto Sans KR" },
      { label: "Gothic A1", value: "'Gothic A1', sans-serif", googleName: "Gothic A1" },
      { label: "Nanum Gothic", value: "'Nanum Gothic', sans-serif", googleName: "Nanum Gothic" },
      { label: "Gowun Dodum", value: "'Gowun Dodum', sans-serif", googleName: "Gowun Dodum" },
    ],
  },
];

const FONT_FAMILIES_FLAT = FONT_GROUPS.flatMap((g) => g.fonts);
const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64, 72];
const LINE_HEIGHT_PRESETS = ["1", "1.2", "1.4", "1.5", "1.6", "1.65", "1.8", "2", "2.5"];
const LETTER_SPACING_PRESETS = ["-0.05em", "0em", "0.05em", "0.1em", "0.15em", "0.2em", "0.3em"];

const PRESET_COLORS = [
  "#000000", "#374151", "#6b7280", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
];

const TABLE_BG_PRESETS = [
  "#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff", "#fee2e2", "#f3f4f6",
];

/** 줄무늬 기본색 = 헤더 배경색(--bg-tertiary) */
const ZEBRA_COLOR_DEFAULT = "var(--bg-tertiary)";

// ── Embed helpers ──
function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/) ?? null;
  return m ? m[1] : null;
}

function isEmbeddableUrl(url: string): boolean {
  return /twitter\.com|x\.com|instagram\.com|facebook\.com|tiktok\.com|codepen\.io|codesandbox\.io|figma\.com|spotify\.com|soundcloud\.com/i.test(url);
}

function buildOEmbedHtml(url: string): string {
  if (/twitter\.com|x\.com/i.test(url)) {
    return `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`;
  }
  if (/instagram\.com/i.test(url)) {
    return `<blockquote class="instagram-media" data-instgrm-permalink="${url}"><a href="${url}"></a></blockquote><script async src="https://www.instagram.com/embed.js"></script>`;
  }
  if (/spotify\.com/i.test(url)) {
    const embedUrl = url.replace("open.spotify.com/", "open.spotify.com/embed/");
    return `<iframe src="${embedUrl}" width="100%" height="352" frameborder="0" allow="encrypted-media" loading="lazy"></iframe>`;
  }
  return `<iframe src="${url}" width="100%" height="400" frameborder="0" loading="lazy" allowfullscreen></iframe>`;
}

function doInsertEmbed(editor: Editor, url: string) {
  const ytId = getYouTubeId(url);
  if (ytId) { editor.chain().focus().setYoutubeVideo({ src: url }).run(); return; }
  if (isEmbeddableUrl(url)) { editor.chain().focus().insertContent(buildOEmbedHtml(url)).run(); return; }
  editor.chain().focus().insertContent(`<p><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>`).run();
}

// ── Component ──
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

export default function RichTextEditor({
  value,
  onChange,
  onImageUpload,
}: RichTextEditorProps) {
  const { theme } = useTheme();
  const { openModal } = useModalStore();
  const [isMac, setIsMac] = useState(false);
  useEffect(() => { setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)); }, []);
  const kb = (mac: string) => {
    if (isMac) return mac;
    return mac.replace(/⌘/g, "Ctrl+").replace(/⌥/g, "Alt+").replace(/⇧/g, "Shift+");
  };

  const editorWrapRef = useRef<HTMLDivElement>(null);
  const colIndicatorRef = useRef<HTMLDivElement>(null);
  const [rowHandles, setRowHandles] = useState<Array<{ left: number; top: number; width: number; rowPos: number; rowHeight: number }>>([]);
  const [tableHandles, setTableHandles] = useState<Array<{
    right: { x: number; top: number; height: number };
    bottom: { left: number; top: number; width: number };
  }>>([]);

  const [hasInteracted, setHasInteracted] = useState(false);
  const [, setTick] = useState(0);

  // Metric inline editing (double-click → input mode)
  const [editingMetric, setEditingMetric] = useState<"fs" | "lh" | "ls" | null>(null);
  const [metricInputVal, setMetricInputVal] = useState("");
  const metricInputRef = useRef<HTMLInputElement>(null);

  // Border dropdown
  const [borderDropOpen, setBorderDropOpen] = useState(false);
  const borderDropRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!borderDropOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!borderDropRef.current?.contains(e.target as HTMLElement)) setBorderDropOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [borderDropOpen]);

  // 외부(draft 복원 등) vs 내부(타이핑) value 변경 구분
  const prevValueRef = useRef(value);
  const isInternalUpdate = useRef(false);

  // extensions를 안정화 — 매 렌더마다 새 참조 생성 시 useEditor 내부에서
  // editor.setOptions() → view.updateState()가 호출되어 CellSelection 등이 리셋됨
  const extensions = useMemo(() => [
    StarterKit.configure({ codeBlock: false }),
    CustomImage,
    Figure,
    Link.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder: "Write your content..." }),
    CodeBlockLowlight.configure({ lowlight }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    FontFamily,
    FontSize,
    LineHeight,
    LetterSpacing,
    Underline,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Superscript,
    Subscript,
    Table.configure({ resizable: true, handleWidth: 6 }),
    CustomTableRow,
    CustomTableCell,
    CustomTableHeader,
    TaskList,
    TaskItem.configure({ nested: true }),
    CharacterCount,
    Youtube.configure({ inline: false, ccLanguage: "ko" }),
    MathInline,
    MathBlock,
  ], []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value,
    onUpdate: ({ editor: e }) => {
      isInternalUpdate.current = true; // 타이핑에 의한 변경 표시
      onChange(e.getHTML());
    },
    onSelectionUpdate: () => { setTick((t) => t + 1); },
    // deps에 더미값 — 빈 배열이면 매 렌더마다 setOptions() → view.updateState()가
    // 호출되어 CellSelection 등 커스텀 selection이 리셋됨 (tiptap #6024)
  }, [1]);

  // 외부에서 value가 바뀔 때(draft 복원, revert 등) 에디터 내용 동기화
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      // 타이핑으로 인한 변경 — 에디터가 이미 최신 상태이므로 setContent 불필요
      isInternalUpdate.current = false;
      prevValueRef.current = value;
      return;
    }
    if (value === prevValueRef.current) return;
    prevValueRef.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  const addImage = useCallback(async () => {
    if (!onImageUpload || !editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await onImageUpload(file);
      editor.chain().focus().insertContent({ type: "figure", attrs: { src: url }, content: [] }).run();
    };
    input.click();
  }, [editor, onImageUpload]);

  // Auto-fit: reset all column widths and row heights
  const autoFitTable = useCallback(() => {
    if (!editor) return;
    const { state, dispatch } = editor.view;
    const tr = state.tr;
    let changed = false;
    state.doc.descendants((node, pos) => {
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        if (node.attrs.colwidth) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, colwidth: null });
          changed = true;
        }
      }
      if (node.type.name === "tableRow") {
        if (node.attrs.height) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, height: null });
          changed = true;
        }
      }
    });
    if (changed) dispatch(tr);
  }, [editor]);

  // Equalize all column widths within the current table
  const equalizeColumnWidths = useCallback(() => {
    if (!editor) return;
    const { state } = editor;
    const { $from } = state.selection;
    let tablePos = -1;
    let tableNode = null;
    for (let d = $from.depth; d >= 0; d--) {
      if ($from.node(d).type.name === "table") {
        tablePos = $from.before(d);
        tableNode = $from.node(d);
        break;
      }
    }
    if (!tableNode || tablePos === -1) return;

    const firstRow = tableNode.firstChild;
    if (!firstRow) return;
    let colCount = 0;
    firstRow.forEach((cell) => { colCount += (cell.attrs.colspan as number) ?? 1; });
    if (colCount === 0) return;

    const wrapperDOM = editor.view.nodeDOM(tablePos) as HTMLElement;
    const tableEl = wrapperDOM?.tagName === "TABLE" ? wrapperDOM : wrapperDOM?.querySelector("table");
    const tableWidth = tableEl?.clientWidth ?? 600;
    const equalWidth = Math.floor(tableWidth / colCount);

    const { dispatch } = editor.view;
    const pmTr = state.tr;
    tableNode.descendants((cellNode, relPos) => {
      if (cellNode.type.name === "tableCell" || cellNode.type.name === "tableHeader") {
        const colspan = (cellNode.attrs.colspan as number) ?? 1;
        pmTr.setNodeMarkup(tablePos + 1 + relPos, undefined, {
          ...cellNode.attrs,
          colwidth: Array(colspan).fill(equalWidth),
        });
        return false;
      }
      return true;
    });
    dispatch(pmTr);
  }, [editor]);

  // Equalize all row heights within the current table (set to tallest row height)
  const equalizeRowHeights = useCallback(() => {
    if (!editor) return;
    const { state } = editor;
    const { $from } = state.selection;
    let tablePos = -1;
    let tableNode = null;
    for (let d = $from.depth; d >= 0; d--) {
      if ($from.node(d).type.name === "table") {
        tablePos = $from.before(d);
        tableNode = $from.node(d);
        break;
      }
    }
    if (!tableNode || tablePos === -1) return;

    const wrapperDOM = editor.view.nodeDOM(tablePos) as HTMLElement;
    const tableEl = wrapperDOM?.tagName === "TABLE" ? wrapperDOM : wrapperDOM?.querySelector("table");
    if (!tableEl) return;

    let maxH = 0;
    tableEl.querySelectorAll("tr").forEach((tr) => {
      maxH = Math.max(maxH, (tr as HTMLElement).offsetHeight);
    });
    if (maxH === 0) return;

    const { dispatch } = editor.view;
    const pmTr = state.tr;
    tableNode.descendants((rowNode, relPos) => {
      if (rowNode.type.name === "tableRow") {
        pmTr.setNodeMarkup(tablePos + 1 + relPos, undefined, {
          ...rowNode.attrs,
          height: `${maxH}px`,
        });
      }
      return true;
    });
    dispatch(pmTr);
  }, [editor]);

  // Reset all table formatting: clear cell backgrounds + colwidths + row heights
  const resetTableFormat = useCallback(() => {
    if (!editor) return;
    const { state, dispatch } = editor.view;
    const pmTr = state.tr;
    let changed = false;
    state.doc.descendants((node, pos) => {
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        if (node.attrs.background || node.attrs.colwidth || node.attrs.verticalAlign || node.attrs.borderStyle || node.attrs.borderHide || node.attrs.borderColor || node.attrs.borderWidth) {
          pmTr.setNodeMarkup(pos, undefined, { ...node.attrs, background: null, colwidth: null, verticalAlign: null, borderStyle: null, borderHide: null, borderColor: null, borderWidth: null });
          changed = true;
        }
      }
      if (node.type.name === "tableRow" && node.attrs.height) {
        pmTr.setNodeMarkup(pos, undefined, { ...node.attrs, height: null });
        changed = true;
      }
    });
    if (changed) dispatch(pmTr);
  }, [editor]);

  // Toggle zebra stripe: alternating row background on odd rows
  const toggleZebraStripe = useCallback(() => {
    if (!editor) return;
    const { state } = editor;
    const { $from } = state.selection;
    let tablePos = -1;
    let tableNode = null;
    for (let d = $from.depth; d >= 0; d--) {
      if ($from.node(d).type.name === "table") {
        tablePos = $from.before(d);
        tableNode = $from.node(d);
        break;
      }
    }
    if (!tableNode || tablePos === -1) return;

    // Detect current zebra state (check first odd-indexed row)
    let isZebra = false;
    let ri = 0;
    tableNode.forEach((row) => {
      if (ri === 1 && row.type.name === "tableRow") {
        row.forEach((cell) => {
          if (cell.attrs.background) isZebra = true;
        });
      }
      ri++;
    });

    const zebraColor = ZEBRA_COLOR_DEFAULT;
    const { dispatch } = editor.view;
    const pmTr = state.tr;

    let rowAbsPos = tablePos + 1;
    let rowIndex = 0;
    tableNode.forEach((rowNode) => {
      if (rowNode.type.name === "tableRow") {
        const targetColor = isZebra ? null : (rowIndex % 2 === 1 ? zebraColor : null);
        let cellAbsPos = rowAbsPos + 1;
        rowNode.forEach((cellNode) => {
          if (cellNode.type.name === "tableCell" || cellNode.type.name === "tableHeader") {
            pmTr.setNodeMarkup(cellAbsPos, undefined, { ...cellNode.attrs, background: targetColor });
          }
          cellAbsPos += cellNode.nodeSize;
        });
      }
      rowAbsPos += rowNode.nodeSize;
      rowIndex++;
    });
    dispatch(pmTr);
  }, [editor, theme]);


  // Row resize handles: sync bottom-edge positions on every transaction (same pattern as tableHandles)
  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const wrap = editorWrapRef.current;
      if (!wrap) return;
      const wrapRect = wrap.getBoundingClientRect();
      const handles: typeof rowHandles = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name !== "tableRow") return;
        const el = editor.view.nodeDOM(pos) as HTMLElement | null;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        handles.push({
          left: rect.left - wrapRect.left,
          top: rect.bottom - wrapRect.top,
          width: rect.width,
          rowPos: pos,
          rowHeight: rect.height,
        });
      });
      setRowHandles(handles);
    };
    editor.on("transaction", sync);
    sync();
    return () => { editor.off("transaction", sync); };
  }, [editor]);

  // Column resize: capture-phase interception of built-in plugin + custom drag + indicator
  // Capture phase prevents built-in handleMouseMove/handleMouseDown from firing,
  // which would dispatch setMeta transactions → updateColumns → cell height changes.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;
    const CZONE = 6;
    let dragging = false;

    // ── Indicator helpers ──
    const showIndicator = (cell: HTMLTableCellElement) => {
      const el = colIndicatorRef.current;
      const wrap = editorWrapRef.current;
      if (!el || !wrap) return;
      const table = cell.closest("table");
      if (!table) return;
      const ci = cell.cellIndex;
      const cellRect = cell.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const firstRow = table.querySelector("tr");
      const lastRow = table.querySelector("tr:last-child");
      if (!firstRow || !lastRow) return;
      const fc = firstRow.querySelectorAll("td, th")[ci] as HTMLElement | undefined;
      const lc = lastRow.querySelectorAll("td, th")[ci] as HTMLElement | undefined;
      if (!fc || !lc) return;
      const top = fc.getBoundingClientRect().top - wrapRect.top;
      const height = lc.getBoundingClientRect().bottom - fc.getBoundingClientRect().top;
      el.style.cssText = `display:block;left:${cellRect.right - wrapRect.left - 1}px;top:${top}px;height:${height}px`;
    };
    const hideIndicator = () => { const el = colIndicatorRef.current; if (el) el.style.display = "none"; };

    // ── Cell near border detection ──
    const getColCell = (e: MouseEvent): HTMLTableCellElement | null => {
      const cell = (e.target as HTMLElement).closest<HTMLTableCellElement>("td, th");
      if (!cell) return null;
      const rect = cell.getBoundingClientRect();
      const row = cell.closest("tr");
      if (!row) return null;
      const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>("td, th"));
      const ci = cells.indexOf(cell);
      if (rect.right - e.clientX <= CZONE && ci < cells.length - 1) return cell;
      if (e.clientX - rect.left <= CZONE && ci > 0) return cells[ci - 1];
      return null;
    };

    // ── Lock all columns to current rendered px widths ──
    // Uses posAtDOM(cellEl, 0) instead of nodeDOM(pos) — more reliable for <td>/<th> elements
    const lockAllColumns = (tableEl: HTMLTableElement) => {
      const { state, dispatch } = editor.view;
      const tr = state.tr;
      let changed = false;
      const cellEls = Array.from(tableEl.querySelectorAll<HTMLElement>("td, th"));
      for (const cellEl of cellEls) {
        try {
          const domPos = editor.view.posAtDOM(cellEl, 0);
          const $pos = state.doc.resolve(domPos);
          let cellPos = -1;
          for (let d = $pos.depth; d >= 0; d--) {
            const n = $pos.node(d);
            if (n.type.name === "tableCell" || n.type.name === "tableHeader") {
              cellPos = $pos.before(d); break;
            }
          }
          if (cellPos === -1) continue;
          const node = state.doc.nodeAt(cellPos);
          if (!node || node.attrs.colwidth?.length) continue;
          const w = Math.round(cellEl.getBoundingClientRect().width);
          if (w > 0) { tr.setNodeMarkup(cellPos, undefined, { ...node.attrs, colwidth: [w] }); changed = true; }
        } catch { /* skip cell if posAtDOM fails */ }
      }
      if (changed) dispatch(tr);
    };

    // ── Update only the dragged column (all rows, same colIdx) ──
    const updateColWidth = (tablePos: number, colIdx: number, width: number) => {
      const { state, dispatch } = editor.view;
      const tableNode = state.doc.nodeAt(tablePos);
      if (!tableNode) return;
      const tr = state.tr;
      tableNode.forEach((rowNode, rowOffset) => {
        if (rowNode.type.name !== "tableRow") return;
        const rowAbsPos = tablePos + 1 + rowOffset;
        rowNode.forEach((cellNode, cellOffset, cellIdx) => {
          if (cellIdx === colIdx) {
            const cellAbsPos = rowAbsPos + 1 + cellOffset;
            const fresh = state.doc.nodeAt(cellAbsPos);
            if (fresh) tr.setNodeMarkup(cellAbsPos, undefined, { ...fresh.attrs, colwidth: [Math.max(20, Math.round(width))] });
          }
        });
      });
      dispatch(tr);
    };

    // ── Capture-phase mousemove: built-in plugin 차단 + indicator ──
    // 핵심 원칙:
    //   드래그 중 → 표 안 전체 stopPropagation (높이 변화 방지, onMove는 document capture로 이미 실행됨)
    //   호버 중  → 컬럼 경계 6px 이내에서만 stopPropagation (셀 선택 drag는 허용해야 .selectedCell 동작)
    const onMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (dragging) {
        // 드래그 중: 표 안이면 전체 차단 (activeHandle 변화 방지)
        if (target.closest("table")) e.stopPropagation();
        return;
      }

      // 호버 중: 컬럼 경계 근처에서만 차단 (PM의 columnResizing 핸들러가 activeHandle을 변경하는 것 방지)
      const anyCell = target.closest<HTMLTableCellElement>("td, th");
      if (anyCell) {
        const rect = anyCell.getBoundingClientRect();
        const row = anyCell.closest("tr");
        const rowCells = row ? Array.from(row.querySelectorAll<HTMLTableCellElement>("td, th")) : [];
        const ci = rowCells.indexOf(anyCell);
        const nearRight = rect.right - e.clientX <= CZONE;
        const nearLeft = e.clientX - rect.left <= CZONE && ci > 0;
        if (nearRight || nearLeft) e.stopPropagation();
      }

      const cell = getColCell(e);
      if (cell) showIndicator(cell);
      else hideIndicator();
    };

    // ── Capture-phase mousedown: column resize ──
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      // ── Cell drag-select ──
      const colCell = getColCell(e);
      if (!colCell) {
        // 컬럼 리사이즈 영역이 아닌 일반 셀 클릭 — ProseMirror의 tableEditing 플러그인이
        // 네이티브로 드래그 셀 선택 + Shift 클릭을 처리하도록 이벤트를 그대로 통과시킨다.
        return;
      }

      const cell = colCell;

      const row = cell.closest("tr")!;
      const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>("td, th"));
      const colIdx = cells.indexOf(cell);
      const table = cell.closest<HTMLTableElement>("table");
      if (!table) return;

      // Find tablePos via posAtDOM on the <td> cell element (more reliable than <table> element)
      let tablePos = -1;
      try {
        const domPos = editor.view.posAtDOM(cell, 0);
        const $pos = editor.state.doc.resolve(domPos);
        for (let d = $pos.depth; d >= 0; d--) {
          if ($pos.node(d).type.name === "table") { tablePos = $pos.before(d); break; }
        }
      } catch { return; }
      if (tablePos === -1) return;

      // Capture startWidth BEFORE lockAllColumns replaces DOM elements
      const startX = e.clientX;
      const startWidth = Math.round(cell.getBoundingClientRect().width);

      // Capture indicator geometry before lockAllColumns (DOM replacement)
      const wrap = editorWrapRef.current;
      const cellRect = cell.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const wrapRect = wrap?.getBoundingClientRect();
      const indicatorTop = wrapRect ? tableRect.top - wrapRect.top : 0;
      const indicatorHeight = tableRect.height;
      // 드래그 시작 시점의 셀 오른쪽 엣지 위치 (wrap 기준)
      const initialCellRight = wrapRect ? cellRect.right - wrapRect.left : 0;

      e.preventDefault();
      e.stopPropagation(); // block built-in plugin's handleMouseDown
      dragging = true;
      editorWrapRef.current?.setAttribute("data-col-dragging", "true");

      lockAllColumns(table); // set explicit colwidth on all cells (DOM elements replaced after this)

      let raf = 0;
      const onMove = (ev: MouseEvent) => {
        // 실제 열 엣지 위치 기반 indicator — 최소 너비 클램프 반영
        const actualWidth = Math.max(20, startWidth + ev.clientX - startX);
        const indicatorLeft = initialCellRight + (actualWidth - startWidth);
        const el = colIndicatorRef.current;
        if (el) {
          el.style.cssText = `display:block;left:${indicatorLeft}px;top:${indicatorTop}px;height:${indicatorHeight}px`;
        }
        // 실시간 너비 업데이트
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          updateColWidth(tablePos, colIdx, actualWidth);
        });
      };
      const onUp = (ev: MouseEvent) => {
        document.removeEventListener("mousemove", onMove, true);
        document.removeEventListener("mouseup", onUp);
        cancelAnimationFrame(raf);
        dragging = false;
        editorWrapRef.current?.removeAttribute("data-col-dragging");
        hideIndicator();
        updateColWidth(tablePos, colIdx, Math.max(20, startWidth + ev.clientX - startX));
      };
      document.addEventListener("mousemove", onMove, true); // capture — document 최상위에서 먼저 실행, stopPropagation 영향 없음
      document.addEventListener("mouseup", onUp);
    };

    const onMouseLeave = () => { if (!dragging) hideIndicator(); };

    dom.addEventListener("mousemove", onMouseMove, true);  // capture — runs before built-in
    dom.addEventListener("mousedown", onMouseDown, true);  // capture — runs before built-in
    dom.addEventListener("mouseleave", onMouseLeave);
    return () => {
      dom.removeEventListener("mousemove", onMouseMove, true);
      dom.removeEventListener("mousedown", onMouseDown, true);
      dom.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [editor]);

  // Table-level resize handles: sync positions on every transaction
  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const wrap = editorWrapRef.current;
      if (!wrap) return;
      const wrapRect = wrap.getBoundingClientRect();
      const tables = editor.view.dom.querySelectorAll<HTMLElement>("table");
      const handles = Array.from(tables).map((table) => {
        const rect = table.getBoundingClientRect();
        return {
          right: { x: rect.right - wrapRect.left, top: rect.top - wrapRect.top, height: rect.height },
          bottom: { left: rect.left - wrapRect.left, top: rect.bottom - wrapRect.top, width: rect.width },
        };
      });
      setTableHandles(handles);
    };
    editor.on("transaction", sync);
    sync();
    return () => { editor.off("transaction", sync); };
  }, [editor]);

  // Cell attr → DOM sync: column-resizing plugin의 nodeView가 custom attrs를 DOM에 반영하지 않으므로
  // transaction마다 직접 td/th DOM 요소에 inline style 적용
  useEffect(() => {
    if (!editor) return;
    const syncCellAttrs = () => {
      // Sync tableRow height attr → DOM (ProseMirror re-renders wipe inline tr.style.height)
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name !== "tableRow") return;
        const el = editor.view.nodeDOM(pos);
        if (!(el instanceof HTMLElement)) return;
        if (node.attrs.height) el.style.height = node.attrs.height as string;
        else el.style.removeProperty("height");
      });

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") return;
        const el = editor.view.nodeDOM(pos);
        if (!(el instanceof HTMLElement)) return;

        // 매번 초기화 후 재적용 (shorthand이 longhand를 덮어쓰는 문제 방지)
        el.style.removeProperty("vertical-align");
        el.style.removeProperty("background-color");
        el.style.removeProperty("border-style");
        el.style.removeProperty("border-width");
        el.style.removeProperty("border-color");
        el.style.removeProperty("border-top-style");
        el.style.removeProperty("border-right-style");
        el.style.removeProperty("border-bottom-style");
        el.style.removeProperty("border-left-style");

        if (node.attrs.verticalAlign)
          el.style.verticalAlign = node.attrs.verticalAlign as string;
        if (node.attrs.background)
          el.style.backgroundColor = node.attrs.background as string;

        // border-style
        const bs = node.attrs.borderStyle as string | null;
        if (bs) el.style.borderStyle = bs;

        // border-width: explicit > double-default > none
        const bw = node.attrs.borderWidth as string | null;
        if (bw) {
          el.style.borderWidth = bw;
        } else if (bs === "double") {
          el.style.borderWidth = "3px";
        }

        // border-color
        if (node.attrs.borderColor)
          el.style.borderColor = node.attrs.borderColor as string;

        // border-hide (per-side hidden, applied last — overrides shorthand)
        const mask = typeof node.attrs.borderHide === "string" ? node.attrs.borderHide : "";
        for (const [ch, side] of [["t","top"],["r","right"],["b","bottom"],["l","left"]] as const) {
          if (mask.includes(ch))
            el.style.setProperty(`border-${side}-style`, "hidden");
        }
      });
    };
    editor.on("transaction", syncCellAttrs);
    // 초기 렌더 직후 한 번 동기화
    syncCellAttrs();
    return () => { editor.off("transaction", syncCellAttrs); };
  }, [editor]);

  // Focused cell indicator: 커서가 위치한 셀에 data-focused 속성 부여
  // nodeDOM 대신 domAtPos 사용 — 커서 위치의 DOM 노드를 확실히 가져옴
  useEffect(() => {
    if (!editor) return;
    let prevEl: HTMLElement | null = null;
    const sync = () => {
      if (prevEl) { prevEl.removeAttribute("data-focused"); prevEl = null; }
      const $from = editor.state.selection.$from;
      let inCell = false;
      for (let d = $from.depth; d >= 0; d--) {
        const n = $from.node(d);
        if (n.type.name === "tableCell" || n.type.name === "tableHeader") { inCell = true; break; }
      }
      if (!inCell) return;
      try {
        const { node } = editor.view.domAtPos($from.pos);
        const el = (node instanceof HTMLElement ? node : node.parentElement)?.closest<HTMLElement>("td, th");
        if (el) { el.setAttribute("data-focused", ""); prevEl = el; }
      } catch { /* ignore */ }
    };
    editor.on("transaction", sync);
    sync();
    return () => { editor.off("transaction", sync); };
  }, [editor]);

  const doInsertLink = useCallback((url: string) => {
    if (!editor || !url) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      editor.chain().focus().insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  // Table-level width resize: scale all columns proportionally
  const startTableWidthResize = useCallback((e: React.MouseEvent, idx: number) => {
    if (!editor) return;
    e.preventDefault();
    e.stopPropagation();

    const tables = editor.view.dom.querySelectorAll<HTMLTableElement>("table");
    const table = tables[idx];
    if (!table) return;

    const startX = e.clientX;
    const startWidth = table.getBoundingClientRect().width;

    // Snapshot original column widths from DOM (first row)
    const firstRow = table.querySelector("tr");
    const startColWidths: number[] = [];
    firstRow?.querySelectorAll<HTMLTableCellElement>("td, th").forEach((c) => {
      startColWidths.push(Math.round(c.getBoundingClientRect().width));
    });

    let raf = 0;
    const applyWidth = (clientX: number) => {
      const newWidth = Math.max(100, startWidth + clientX - startX);
      const ratio = newWidth / startWidth;
      const { state, dispatch } = editor.view;
      const tr = state.tr;
      state.doc.descendants((node, pos) => {
        if (node.type.name !== "tableRow") return;
        const rowEl = editor.view.nodeDOM(pos);
        if (!(rowEl instanceof HTMLElement) || !table.contains(rowEl)) return;
        let ci = 0;
        node.forEach((_, offset) => {
          const fresh = state.doc.nodeAt(pos + 1 + offset);
          if (fresh) {
            const origW = startColWidths[ci] ?? 60;
            tr.setNodeMarkup(pos + 1 + offset, undefined, { ...fresh.attrs, colwidth: [Math.max(20, Math.round(origW * ratio))] });
          }
          ci++;
        });
        return false;
      });
      dispatch(tr);
    };

    const onMove = (ev: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyWidth(ev.clientX));
    };
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      cancelAnimationFrame(raf);
      applyWidth(ev.clientX);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [editor]);

  // Row height resize: external handle drag (same pattern as startTableHeightResize)
  const startRowHeightResize = useCallback((e: React.MouseEvent, rowPos: number, startH: number) => {
    if (!editor) return;
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const applyHeight = (clientY: number) => {
      const newH = Math.max(24, Math.round(startH + clientY - startY));
      const { state, dispatch } = editor.view;
      const node = state.doc.nodeAt(rowPos);
      if (!node) return;
      const tr = state.tr;
      tr.setNodeMarkup(rowPos, undefined, { ...node.attrs, height: `${newH}px` });
      dispatch(tr);
    };

    let raf = 0;
    const onMove = (ev: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyHeight(ev.clientY));
    };
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      cancelAnimationFrame(raf);
      applyHeight(ev.clientY);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [editor]);

  // Table-level height resize: resize the last row
  const startTableHeightResize = useCallback((e: React.MouseEvent, idx: number) => {
    if (!editor) return;
    e.preventDefault();
    e.stopPropagation();

    const tables = editor.view.dom.querySelectorAll<HTMLTableElement>("table");
    const table = tables[idx];
    if (!table) return;

    const lastRowEl = table.querySelector("tr:last-child") as HTMLTableRowElement | null;
    if (!lastRowEl) return;

    // Find the ProseMirror position of the last row (stable across transactions)
    let lastRowPos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "tableRow") return;
      const el = editor.view.nodeDOM(pos);
      if (el instanceof HTMLElement && table.contains(el)) lastRowPos = pos;
    });
    if (lastRowPos === -1) return;

    const startY = e.clientY;
    const startH = lastRowEl.getBoundingClientRect().height;

    let raf = 0;
    const applyHeight = (clientY: number) => {
      const newH = Math.max(24, Math.round(startH + clientY - startY));
      const { state, dispatch } = editor.view;
      const fresh = state.doc.nodeAt(lastRowPos);
      if (!fresh) return;
      const tr = state.tr;
      tr.setNodeMarkup(lastRowPos, undefined, { ...fresh.attrs, height: `${newH}px` });
      dispatch(tr);
    };

    const onMove = (ev: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyHeight(ev.clientY));
    };
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      cancelAnimationFrame(raf);
      applyHeight(ev.clientY);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [editor]);

  if (!editor) return null;

  const enterEdit = (metric: "fs" | "lh" | "ls", startVal: string) => {
    setEditingMetric(metric);
    setMetricInputVal(startVal);
    setTimeout(() => { metricInputRef.current?.focus(); metricInputRef.current?.select(); }, 0);
  };

  const applyEdit = () => {
    if (!editingMetric) { setEditingMetric(null); return; }
    const v = metricInputVal.trim();
    if (editingMetric === "fs") {
      if (v) {
        const norm = /px$|em$|%$|rem$/.test(v) ? v : `${v}px`;
        editor.chain().focus().setMark("textStyle", { fontSize: norm }).run();
      } else {
        editor.chain().focus().setMark("textStyle", { fontSize: null }).run();
      }
    } else if (editingMetric === "lh") {
      const val = v || null;
      editor.chain().focus()
        .updateAttributes("paragraph", { lineHeight: val })
        .updateAttributes("heading", { lineHeight: val })
        .run();
    } else if (editingMetric === "ls") {
      if (v) {
        const norm = /em$|px$|%$/.test(v) ? v : `${v}em`;
        editor.chain().focus().setMark("textStyle", { letterSpacing: norm }).run();
      } else {
        editor.chain().focus().setMark("textStyle", { letterSpacing: null }).run();
      }
    }
    setEditingMetric(null);
  };

  const focused = hasInteracted || editor.isFocused;
  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    focused && editor.isActive(name, attrs);

  const isFigureActive = isActive("figure");
  const isImageActive = isActive("image");
  const isInTable = editor.isActive("table");

  const isZebraActive = (() => {
    if (!isInTable) return false;
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d >= 0; d--) {
      if ($from.node(d).type.name === "table") {
        let ri = 0;
        let found = false;
        $from.node(d).forEach((row) => {
          if (ri === 1 && row.type.name === "tableRow") {
            row.forEach((cell) => { if (cell.attrs.background) found = true; });
          }
          ri++;
        });
        return found;
      }
    }
    return false;
  })();

  // Font size
  const currentFontSize = (editor.getAttributes("textStyle").fontSize as string) ?? "";
  const currentFontSizeNum = currentFontSize.replace("px", "");

  // Line height
  const currentLineHeight = ((editor.getAttributes("paragraph").lineHeight || editor.getAttributes("heading").lineHeight) as string) ?? "";

  // Letter spacing
  const currentLetterSpacing = (editor.getAttributes("textStyle").letterSpacing as string) ?? "";

  // Header row / column active state — 첫 행/열이 th인지 여부로 판단
  const isHeaderRowActive = (() => {
    if (!isInTable) return false;
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d >= 0; d--) {
      if ($from.node(d).type.name === "table") {
        const firstRow = $from.node(d).firstChild;
        return firstRow?.firstChild?.type.name === "tableHeader";
      }
    }
    return false;
  })();

  const isHeaderColumnActive = (() => {
    if (!isInTable) return false;
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d >= 0; d--) {
      if ($from.node(d).type.name === "table") {
        const table = $from.node(d);
        if (!table.childCount) return false;
        let allHeaders = true;
        table.forEach((row) => {
          if (row.firstChild?.type.name !== "tableHeader") allHeaders = false;
        });
        return allHeaders;
      }
    }
    return false;
  })();

  // Current text align in cell (default: "left")
  const currentCellTextAlign = isInTable
    ? ((editor.getAttributes("paragraph").textAlign || editor.getAttributes("heading").textAlign) as string) ?? "left"
    : "left";

  // Current cell attrs
  const _tc = isInTable ? editor.getAttributes("tableCell") : {};
  const _th = isInTable ? editor.getAttributes("tableHeader") : {};
  const currentCellBg = ((_tc.background || _th.background) as string) ?? "";
  const currentCellVAlign = ((_tc.verticalAlign || _th.verticalAlign) as string) ?? "top"; // CSS default
  const currentCellBorderStyle = ((_tc.borderStyle || _th.borderStyle) as string) ?? "";
  const currentCellBorderHide = ((_tc.borderHide || _th.borderHide) as string) ?? "";
  const currentCellBorderColor = ((_tc.borderColor || _th.borderColor) as string) ?? "";
  const currentCellBorderWidth = ((_tc.borderWidth || _th.borderWidth) as string) ?? "";

  // Computed style fallbacks — editor.view.dom에서 읽어 항상 안정적인 기본값 제공
  const computedDefaults = (() => {
    try {
      const el = editor.view.dom as HTMLElement;
      const cs = window.getComputedStyle(el);
      const fsRaw = parseFloat(cs.fontSize);
      const lhRaw = parseFloat(cs.lineHeight);
      const lsStr = cs.letterSpacing;
      const lsPxRaw = parseFloat(lsStr);

      const fs = !isNaN(fsRaw) ? `${Math.round(fsRaw)}px` : "—";

      const lh = !isNaN(lhRaw) && !isNaN(fsRaw) && fsRaw > 0
        ? String(Math.round((lhRaw / fsRaw) * 100) / 100)
        : "LH";

      let ls: string;
      if (isNaN(lsPxRaw) || lsStr === "normal" || lsPxRaw === 0) {
        ls = "0em";
      } else if (!isNaN(fsRaw) && fsRaw > 0) {
        const lsEm = Math.round((lsPxRaw / fsRaw) * 1000) / 1000;
        ls = `${lsEm}em`;
      } else {
        ls = "0em";
      }

      return { fs, lh, ls };
    } catch {
      return { fs: "—", lh: "LH", ls: "LS" };
    }
  })();

  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const wordCount = editor.storage.characterCount?.words() ?? 0;

  return (
    <div ref={editorWrapRef} className={styles.wrapper} onClick={() => setHasInteracted(true)}>
      {/* Column resize indicator: always mounted, shown/hidden via direct DOM ref (no re-render) */}
      <div ref={colIndicatorRef} className={styles.colResizeIndicator} style={{ display: "none" }} />
      {/* Row resize handles: external divs at each row's bottom edge */}
      {rowHandles.map((h, idx) => (
        <div
          key={idx}
          className={styles.rowResizeHandle}
          style={{ left: h.left, top: h.top - 4, width: h.width }}
          onMouseDown={(e) => startRowHeightResize(e, h.rowPos, h.rowHeight)}
        />
      ))}
      {tableHandles.map((h, idx) => (
        <div key={idx}>
          <div
            className={styles.tableResizeRight}
            style={{ left: h.right.x, top: h.right.top, height: h.right.height }}
            onMouseDown={(e) => startTableWidthResize(e, idx)}
          />
          <div
            className={styles.tableResizeBottom}
            style={{ left: h.bottom.left, top: h.bottom.top - 4, width: h.bottom.width }}
            onMouseDown={(e) => startTableHeightResize(e, idx)}
          />
        </div>
      ))}
      <div className={styles.toolbar}>

        {/* ── Undo / Redo ── */}
        <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} tooltip={`실행 취소\n${kb("⌘Z")}`}>↩</TBtn>
        <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} tooltip={`다시 실행\n${kb("⌘⇧Z")}`}>↪</TBtn>

        <div className={styles.divider} />

        {/* ── Text formatting ── */}
        <TBtn active={isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} tooltip={`굵게\n${kb("⌘B")}`}>B</TBtn>
        <TBtn active={isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} style={{ fontStyle: "italic" }} tooltip={`기울임\n${kb("⌘I")}`}>I</TBtn>
        <TBtn active={isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} style={{ textDecoration: "underline" }} tooltip={`밑줄\n${kb("⌘U")}`}>U</TBtn>
        <TBtn active={isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} style={{ textDecoration: "line-through" }} tooltip="취소선">S</TBtn>
        <TBtn active={isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} tooltip={`인라인 코드\n${kb("⌘E")}`}>{"<>"}</TBtn>

        <div className={styles.divider} />

        {/* ── Superscript / Subscript ── */}
        <TBtn active={isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()} tooltip="위 첨자">x²</TBtn>
        <TBtn active={isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()} tooltip="아래 첨자">x₂</TBtn>

        <div className={styles.divider} />

        {/* ── Font family ── */}
        <div className={styles.selectWrap}>
          <select
            className={styles.fontSelect}
            value={FONT_FAMILIES_FLAT.find((f) => f.value && isActive("textStyle", { fontFamily: f.value }))?.value ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const entry = FONT_FAMILIES_FLAT.find((f) => f.value === val);
                if (entry?.googleName) loadGoogleFont(entry.googleName);
                editor.chain().focus().setFontFamily(val).run();
              } else {
                editor.chain().focus().unsetFontFamily().run();
              }
            }}
          >
            <option value="">Default</option>
            {FONT_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.fonts.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {/* ── Font size ── */}
        <div className={`${styles.selectWrap} ${editingMetric === "fs" ? styles.selectWrapEditing : ""}`}>
          {editingMetric === "fs" ? (
            <>
              <input
                ref={metricInputRef}
                type="text"
                list="fs-presets"
                className={`${styles.fontSelect} ${styles.fontSizeSelect} ${styles.metricInput}`}
                value={metricInputVal}
                onChange={(e) => setMetricInputVal(e.target.value)}
                onBlur={applyEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); applyEdit(); }
                  if (e.key === "Escape") { e.preventDefault(); setEditingMetric(null); }
                }}
                placeholder="px"
              />
              <datalist id="fs-presets">
                {FONT_SIZE_PRESETS.map((s) => <option key={s} value={`${s}px`} />)}
              </datalist>
            </>
          ) : (
            <select
              className={`${styles.fontSelect} ${styles.fontSizeSelect}`}
              value={currentFontSizeNum}
              onChange={(e) => {
                const val = e.target.value;
                if (val) editor.chain().focus().setMark("textStyle", { fontSize: `${val}px` }).run();
                else editor.chain().focus().setMark("textStyle", { fontSize: null }).run();
              }}
              onDoubleClick={() => enterEdit("fs", currentFontSizeNum ? `${currentFontSizeNum}px` : computedDefaults.fs)}
            >
              <option value="">{computedDefaults.fs}</option>
              {FONT_SIZE_PRESETS.map((s) => <option key={s} value={String(s)}>{s}px</option>)}
            </select>
          )}
        </div>

        {/* ── Line height ── */}
        <div className={`${styles.selectWrap} ${editingMetric === "lh" ? styles.selectWrapEditing : ""}`}>
          {editingMetric === "lh" ? (
            <>
              <input
                ref={metricInputRef}
                type="text"
                list="lh-presets"
                className={`${styles.fontSelect} ${styles.lhSelect} ${styles.metricInput}`}
                value={metricInputVal}
                onChange={(e) => setMetricInputVal(e.target.value)}
                onBlur={applyEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); applyEdit(); }
                  if (e.key === "Escape") { e.preventDefault(); setEditingMetric(null); }
                }}
                placeholder="LH"
              />
              <datalist id="lh-presets">
                {LINE_HEIGHT_PRESETS.map((v) => <option key={v} value={v} />)}
              </datalist>
            </>
          ) : (
            <select
              className={`${styles.fontSelect} ${styles.lhSelect}`}
              value={currentLineHeight || (LINE_HEIGHT_PRESETS.includes(computedDefaults.lh) ? computedDefaults.lh : "")}
              onChange={(e) => {
                const val = e.target.value || null;
                editor.chain().focus()
                  .updateAttributes("paragraph", { lineHeight: val })
                  .updateAttributes("heading", { lineHeight: val })
                  .run();
              }}
              onDoubleClick={() => enterEdit("lh", currentLineHeight || computedDefaults.lh)}
            >
              <option value="">{computedDefaults.lh}</option>
              {LINE_HEIGHT_PRESETS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
        </div>

        {/* ── Letter spacing ── */}
        <div className={`${styles.selectWrap} ${editingMetric === "ls" ? styles.selectWrapEditing : ""}`}>
          {editingMetric === "ls" ? (
            <>
              <input
                ref={metricInputRef}
                type="text"
                list="ls-presets"
                className={`${styles.fontSelect} ${styles.lsSelect} ${styles.metricInput}`}
                value={metricInputVal}
                onChange={(e) => setMetricInputVal(e.target.value)}
                onBlur={applyEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); applyEdit(); }
                  if (e.key === "Escape") { e.preventDefault(); setEditingMetric(null); }
                }}
                placeholder="em"
              />
              <datalist id="ls-presets">
                {LETTER_SPACING_PRESETS.map((v) => <option key={v} value={v} />)}
              </datalist>
            </>
          ) : (
            <select
              className={`${styles.fontSelect} ${styles.lsSelect}`}
              value={currentLetterSpacing || "0em"}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) editor.chain().focus().setMark("textStyle", { letterSpacing: null }).run();
                else editor.chain().focus().setMark("textStyle", { letterSpacing: val }).run();
              }}
              onDoubleClick={() => enterEdit("ls", currentLetterSpacing || "0em")}
            >
              <option value="">—</option>
              {LETTER_SPACING_PRESETS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
        </div>

        <div className={styles.divider} />

        {/* ── Text alignment ── */}
        {(["left", "center", "right", "justify"] as const).map((align) => {
          const alignLabels = { left: `왼쪽 정렬\n${kb("⌘⇧L")}`, center: `가운데 정렬\n${kb("⌘⇧E")}`, right: `오른쪽 정렬\n${kb("⌘⇧R")}`, justify: `양쪽 정렬\n${kb("⌘⇧J")}` };
          return (
            <TBtn
              key={align}
              active={focused && editor.isActive({ textAlign: align })}
              onClick={() => editor.chain().focus().setTextAlign(align).run()}
              tooltip={alignLabels[align]}
            >
              <AlignIcon align={align} />
            </TBtn>
          );
        })}

        <div className={styles.divider} />

        {/* ── Text color ── */}
        <div className={styles.colorGroup}>
          <span className={styles.colorLabel}>A</span>
          <div className={styles.colorIndicator} style={{ background: (editor.getAttributes("textStyle").color as string) ?? "var(--text-primary)" }} />
          <input type="color" className={styles.colorInput} value={(editor.getAttributes("textStyle").color as string) ?? "#000000"} onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} title="Text color" />
        </div>

        {/* ── Highlight color ── */}
        <div className={styles.colorGroup}>
          <span className={styles.colorLabel}>BG</span>
          <div className={styles.colorIndicator} style={{ background: (editor.getAttributes("highlight").color as string) ?? "transparent" }} />
          <input type="color" className={styles.colorInput} value={(editor.getAttributes("highlight").color as string) ?? "#ffff00"} onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} title="Highlight color" />
        </div>

        {/* ── Color presets ── */}
        <div className={styles.presetColors}>
          {PRESET_COLORS.map((color) => (
            <button key={color} type="button" className={styles.presetDot} style={{ background: color }} onClick={() => editor.chain().focus().setColor(color).run()} title={color} />
          ))}
        </div>

        {/* ── Clear formatting ── */}
        <TBtn onClick={() => editor.chain().focus().unsetColor().unsetHighlight().unsetFontFamily().unsetMark("textStyle").run()} tooltip="서식 초기화">Clear</TBtn>

        <div className={styles.divider} />

        {/* ── Headings ── */}
        <TBtn active={isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} tooltip={`제목 1\n${kb("⌘⌥1")}`}>H1</TBtn>
        <TBtn active={isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} tooltip={`제목 2\n${kb("⌘⌥2")}`}>H2</TBtn>
        <TBtn active={isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} tooltip={`제목 3\n${kb("⌘⌥3")}`}>H3</TBtn>

        <div className={styles.divider} />

        {/* ── Lists & blocks ── */}
        <TBtn active={isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} tooltip={`글머리 목록\n${kb("⌘⇧8")}`}>UL</TBtn>
        <TBtn active={isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} tooltip={`번호 목록\n${kb("⌘⇧7")}`}>OL</TBtn>
        <TBtn active={isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} tooltip="체크리스트">
          <ChecklistIcon />
        </TBtn>
        <TBtn active={isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} tooltip={`인용구\n${kb("⌘⇧B")}`}>Quote</TBtn>
        <TBtn active={isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} tooltip={`코드 블록\n${kb("⌘⌥C")}`}>Code</TBtn>

        <div className={styles.divider} />

        {/* ── Insert ── */}
        <TBtn onClick={() => openModal(<LinkModalContent onInsert={(url) => doInsertLink(url)} />, { id: "link-insert", header: { title: "링크 삽입" }, closeButton: true })} tooltip={`링크 삽입\n${kb("⌘K")}`}>Link</TBtn>
        <TBtn onClick={addImage} tooltip="이미지 삽입">Image</TBtn>
        <TBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} tooltip="표 삽입">Table</TBtn>
        <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} tooltip="구분선">HR</TBtn>
        <TBtn onClick={() => openModal(<EmbedModalContent onInsert={(url) => doInsertEmbed(editor, url)} />, { id: "embed-insert", header: { title: "URL 삽입" }, closeButton: true })} tooltip={"미디어 삽입\nYouTube · Spotify · X"}>Embed</TBtn>
        <TBtn
          tooltip={"수식 삽입 (LaTeX)\n⌘+Enter로 삽입"}
          onClick={() => openModal(
            <MathModalContent onInsert={(latex, mode) => {
              if (mode === "inline") {
                editor.chain().focus().insertContent({ type: "mathInline", attrs: { latex } }).run();
              } else {
                editor.chain().focus().insertContent({ type: "mathBlock", attrs: { latex } }).run();
              }
            }} />,
            { id: "math-insert", header: { title: "수식 삽입" }, closeButton: true }
          )}
        >∑</TBtn>


        {/* ── Figure controls ── */}
        {isFigureActive && (
          <>
            <div className={styles.divider} />
            {(["left", "center", "right"] as const).map((align) => (
              <button key={align} type="button" className={`${styles.imageBubbleBtn} ${editor.getAttributes("figure").dataAlign === align ? styles.imageBubbleBtnActive : ""}`} onClick={() => editor.chain().focus().updateAttributes("figure", { dataAlign: align }).run()}>
                {align === "left" ? "◧" : align === "center" ? "◻" : "◨"}
              </button>
            ))}
            <div className={styles.divider} />
            {["25%", "50%", "75%", "100%"].map((w) => (
              <button key={w} type="button" className={`${styles.imageBubbleBtn} ${editor.getAttributes("figure").width === w ? styles.imageBubbleBtnActive : ""}`} onClick={() => editor.chain().focus().updateAttributes("figure", { width: w }).run()}>{w}</button>
            ))}
          </>
        )}

        {/* ── Legacy image controls ── */}
        {isImageActive && (
          <>
            <div className={styles.divider} />
            {(["left", "center", "right"] as const).map((align) => (
              <button key={align} type="button" className={`${styles.imageBubbleBtn} ${editor.getAttributes("image").dataAlign === align ? styles.imageBubbleBtnActive : ""}`} onClick={() => editor.chain().focus().updateAttributes("image", { dataAlign: align }).run()}>
                {align === "left" ? "◧" : align === "center" ? "◻" : "◨"}
              </button>
            ))}
            <div className={styles.divider} />
            {["25%", "50%", "75%", "100%"].map((w) => (
              <button key={w} type="button" className={`${styles.imageBubbleBtn} ${editor.getAttributes("image").width === w ? styles.imageBubbleBtnActive : ""}`} onClick={() => editor.chain().focus().updateAttributes("image", { width: w }).run()}>{w}</button>
            ))}
          </>
        )}

      </div>



      {/* ── Editor area: tableToolbar + editor wrapped so toolbar is absolute overlay ── */}
      <div className={`${styles.editorContainer} ${isInTable ? styles.editorContainerActive : ""}`}>
      <div className={`${styles.tableToolbar} ${!isInTable ? styles.tableToolbarHidden : ""}`}>

          {/* 행 */}
          <div className={styles.tableGroup}>
            <span className={styles.tableGroupLabel}>행</span>
            <TBtn onClick={() => editor.chain().focus().addRowBefore().run()} tooltip="위에 행 추가"><TblRowBefore /></TBtn>
            <TBtn onClick={() => editor.chain().focus().addRowAfter().run()} tooltip="아래에 행 추가"><TblRowAfter /></TBtn>
            <TBtn onClick={() => editor.chain().focus().deleteRow().run()} tooltip="현재 행 삭제"><TblRowRemove /></TBtn>
          </div>

          {/* 열 */}
          <div className={styles.tableGroup}>
            <span className={styles.tableGroupLabel}>열</span>
            <TBtn onClick={() => editor.chain().focus().addColumnBefore().run()} tooltip="왼쪽에 열 추가"><TblColBefore /></TBtn>
            <TBtn onClick={() => editor.chain().focus().addColumnAfter().run()} tooltip="오른쪽에 열 추가"><TblColAfter /></TBtn>
            <TBtn onClick={() => editor.chain().focus().deleteColumn().run()} tooltip="현재 열 삭제"><TblColRemove /></TBtn>
          </div>

          {/* 셀 */}
          <div className={styles.tableGroup}>
            <span className={styles.tableGroupLabel}>셀</span>
            <TBtn onClick={() => editor.chain().focus().mergeCells().run()} tooltip={"셀 병합\n여러 셀 선택 후 클릭"}><TblMergeCells /></TBtn>
            <TBtn onClick={() => editor.chain().focus().splitCell().run()} tooltip="셀 분리"><TblSplitCell /></TBtn>
          </div>

          {/* 헤더 */}
          <div className={styles.tableGroup}>
            <span className={styles.tableGroupLabel}>헤더</span>
            <TBtn active={isHeaderRowActive} onClick={() => editor.chain().focus().toggleHeaderRow().run()} tooltip="헤더 행 토글">행</TBtn>
            <TBtn active={isHeaderColumnActive} onClick={() => editor.chain().focus().toggleHeaderColumn().run()} tooltip="헤더 열 토글">열</TBtn>
          </div>

          {/* 균등/자동 맞춤 */}
          <div className={styles.tableGroup}>
            <span className={styles.tableGroupLabel}>맞춤</span>
            <TBtn onClick={equalizeColumnWidths} tooltip="열 너비 균등"><TblEqualCols /></TBtn>
            <TBtn onClick={equalizeRowHeights} tooltip="행 높이 균등"><TblEqualRows /></TBtn>
            <TBtn onClick={autoFitTable} tooltip="너비·높이 초기화"><TblAutoFit /></TBtn>
          </div>

          {/* 스타일 */}
          <div className={styles.tableGroup}>
            <span className={styles.tableGroupLabel}>스타일</span>
            <TBtn active={isZebraActive} onClick={toggleZebraStripe} tooltip={"줄무늬 행\n짝수 행 배경색 교차"}><TblZebra /></TBtn>
            <TBtn onClick={resetTableFormat} tooltip={"표 서식 초기화\n배경색·크기 모두 제거"}><TblResetFormat /></TBtn>
          </div>

          {/* 수직 정렬 */}
          <div className={styles.tableGroup}>
            <span className={styles.tableGroupLabel}>수직</span>
            <TBtn active={currentCellVAlign === "top"} onClick={() => editor.chain().focus().setCellAttribute("verticalAlign", currentCellVAlign === "top" ? null : "top").run()} tooltip="위쪽 정렬"><TblVAlignTop /></TBtn>
            <TBtn active={currentCellVAlign === "middle"} onClick={() => editor.chain().focus().setCellAttribute("verticalAlign", currentCellVAlign === "middle" ? null : "middle").run()} tooltip="가운데 정렬"><TblVAlignMiddle /></TBtn>
            <TBtn active={currentCellVAlign === "bottom"} onClick={() => editor.chain().focus().setCellAttribute("verticalAlign", currentCellVAlign === "bottom" ? null : "bottom").run()} tooltip="아래쪽 정렬"><TblVAlignBottom /></TBtn>
          </div>

          {/* 수평 정렬 */}
          <div className={styles.tableGroup}>
            <span className={styles.tableGroupLabel}>수평</span>
            {(["left", "center", "right"] as const).map((align) => (
              <TBtn key={align} active={currentCellTextAlign === align} onClick={() => editor.chain().focus().setTextAlign(align).run()} tooltip={{ left: "왼쪽", center: "가운데", right: "오른쪽" }[align]}>
                <AlignIcon align={align} />
              </TBtn>
            ))}
          </div>

          {/* ── 테두리 드롭다운 ── */}
          <div className={styles.borderDropWrap} ref={borderDropRef}>
            <TBtn
              active={borderDropOpen}
              tooltip="테두리 설정"
              onClick={() => setBorderDropOpen((v) => !v)}
              style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              {/* 2×2 테이블 그리드 아이콘 */}
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" aria-hidden="true">
                <rect x="1" y="1" width="12" height="12" rx="0.5" />
                <line x1="7" y1="1" x2="7" y2="13" />
                <line x1="1" y1="7" x2="13" y2="7" />
              </svg>
              <svg
                width="6" height="10" viewBox="0 0 6 10"
                fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ opacity: 0.6 }}
                className={[styles.borderDropArrow, borderDropOpen && styles.borderDropArrowOpen].filter(Boolean).join(" ")}
              >
                <polyline points="1,1 5,5 1,9" />
              </svg>
            </TBtn>

            <div
              className={[styles.borderDropPanel, borderDropOpen && styles.borderDropPanelOpen].filter(Boolean).join(" ")}
              onMouseDown={(e) => e.preventDefault()}
              aria-hidden={!borderDropOpen}
            >
                <div className={styles.borderDropInner}>
                  {/* 3×3 프리셋 그리드 */}
                  <div className={styles.borderPresetGrid}>
                    {([
                      { icon: <BPresetIcon t r b l ih iv />, label: "전체 테두리",       hide: null   },
                      { icon: <BPresetIcon />,               label: "선 없음",           hide: "trbl" },
                      { icon: <BPresetIcon t r b l />,       label: "바깥쪽 테두리",      hide: null   },
                      { icon: <BPresetIcon t />,             label: "위 테두리만",        hide: "rbl"  },
                      { icon: <BPresetIcon b />,             label: "아래 테두리만",       hide: "trl"  },
                      { icon: <BPresetIcon l />,             label: "왼쪽 테두리만",       hide: "trb"  },
                      { icon: <BPresetIcon r />,             label: "오른쪽 테두리만",     hide: "tbl"  },
                      { icon: <BPresetIcon t b />,           label: "위+아래 테두리",      hide: "rl"   },
                      { icon: <BPresetIcon l r />,           label: "왼쪽+오른쪽 테두리",  hide: "tb"   },
                    ] as { icon: React.ReactNode; label: string; hide: string | null }[]).map(({ icon, label, hide }) => {
                      const isActive = hide === null
                        ? currentCellBorderHide === ""
                        : currentCellBorderHide === hide;
                      return (
                        <TBtn
                          key={label}
                          active={isActive}
                          tooltip={label}
                          className={styles.borderPresetBtn}
                          onClick={() => { editor.chain().focus().setCellAttribute("borderHide", hide).run(); }}
                        >
                          {icon}
                        </TBtn>
                      );
                    })}
                  </div>

                  {/* 우측: 스타일 + 굵기 + 색 */}
                  <div className={styles.borderControls}>
                    {/* 선 종류 */}
                    <p className={styles.borderControlLabel}>선 종류</p>
                    <div className={styles.borderStyleRow}>
                      {([
                        { val: null,     tip: "실선 (기본)", icon: <TblBorderSolid /> },
                        { val: "dashed", tip: "파선",        icon: <TblBorderDash /> },
                        { val: "dotted", tip: "점선",        icon: <TblBorderDot /> },
                        { val: "double", tip: "이중선",      icon: <TblBorderDouble /> },
                        { val: "hidden", tip: "선 없음",     icon: <TblBorderNone /> },
                      ] as { val: string | null; tip: string; icon: React.ReactNode }[]).map(({ val, tip, icon }) => (
                        <TBtn
                          key={tip}
                          active={val === null ? !currentCellBorderStyle : currentCellBorderStyle === val}
                          tooltip={tip}
                          onClick={() => editor.chain().focus().setCellAttribute("borderStyle", val).run()}
                        >
                          {icon}
                        </TBtn>
                      ))}
                    </div>

                    {/* 굵기 */}
                    <p className={styles.borderControlLabel}>굵기</p>
                    <div className={styles.borderWidthRow}>
                      {(["1px", "2px", "3px", "4px"] as const).map((w) => (
                        <TBtn
                          key={w}
                          active={(currentCellBorderWidth || "1px") === w}
                          tooltip={w}
                          onClick={() => editor.chain().focus().setCellAttribute("borderWidth", w === "1px" ? null : w).run()}
                        >
                          {w}
                        </TBtn>
                      ))}
                    </div>

                    {/* 색 */}
                    <p className={styles.borderControlLabel}>색</p>
                    <div className={styles.borderColorRow}>
                      <div className={styles.colorGroup} style={{ padding: "2px 4px" }}>
                        <div
                          className={styles.colorIndicator}
                          style={{ width: 16, height: 16, borderRadius: 3, background: currentCellBorderColor || "var(--border-default-color)", border: "1px solid var(--border-light-color)" }}
                        />
                        <input
                          type="color"
                          className={styles.colorInput}
                          value={currentCellBorderColor || "#888888"}
                          onChange={(e) => editor.chain().focus().setCellAttribute("borderColor", e.target.value).run()}
                          title="테두리 색"
                        />
                      </div>
                      <span className={styles.borderColorValue}>{currentCellBorderColor || "기본"}</span>
                      {currentCellBorderColor && (
                        <TBtn onClick={() => editor.chain().focus().setCellAttribute("borderColor", null).run()} tooltip="색 초기화">×</TBtn>
                      )}
                    </div>
                  </div>
                </div>
            </div>
          </div>

          <div className={styles.divider} />

          {/* 셀 배경색 */}
          <div className={styles.colorGroup} title="셀 배경색">
            <TblCellColorIcon />
            <div
              className={styles.colorIndicator}
              style={{
                background: currentCellBg || "transparent",
                border: currentCellBg ? "none" : "1px solid var(--border-light-color)",
              }}
            />
            <input
              type="color"
              className={styles.colorInput}
              value={currentCellBg || "#ffffff"}
              onChange={(e) => editor.chain().focus().setCellAttribute("background", e.target.value).run()}
              title="셀 배경색"
            />
          </div>
          {currentCellBg && (
            <TBtn onClick={() => editor.chain().focus().setCellAttribute("background", null).run()} tooltip="배경색 제거">×</TBtn>
          )}
          <div className={styles.presetColors}>
            {TABLE_BG_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={`${styles.presetDot} ${currentCellBg === color ? styles.presetDotActive : ""}`}
                style={{ background: color }}
                onClick={() => editor.chain().focus().setCellAttribute("background", color).run()}
                title={color}
              />
            ))}
          </div>

          <div className={styles.divider} />

          <TBtn className={styles.tableDangerBtn} onClick={() => editor.chain().focus().deleteTable().run()} tooltip="표 삭제"><TblTrash /></TBtn>
        </div>

      <div className={styles.editor} data-lenis-prevent>
        <EditorContent editor={editor} />
      </div>

      </div>{/* editorContainer */}

      <div className={styles.statusBar}>
        <span>{charCount.toLocaleString()}자</span>
        <span>·</span>
        <span>{wordCount.toLocaleString()}단어</span>
      </div>

    </div>
  );
}
