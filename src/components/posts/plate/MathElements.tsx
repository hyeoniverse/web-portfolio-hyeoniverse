import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
} from "platejs/react";
import { useEquationElement } from "@platejs/math/react";
import katex from "katex";
import { useLanguage } from "@/providers/LanguageProvider";
import { localizeKatexErrors } from "../renderMathNodes";
import { _mathSymbolInsert, _mathEditingSet, _mathDeleteNode } from "./utils";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import styles from "../RichTextEditor.module.css";

// ── 수식 편집 floating 패널 (블록/인라인 공통) ──
// Portal로 body에 렌더 → anchorRef 기준 아래에 띄움
function MathFloatingEdit({
  anchorRef,
  inputRef,
  draft,
  onUpdate,
  onConfirm,
  onCancel,
  onDelete,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  draft: string;
  onUpdate: (val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  const update = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    // 블록 수식은 PlateElement(data-slate-node) 기준, 인라인은 anchor 기준
    const slateNode = anchor.closest("[data-slate-node]") as HTMLElement | null;
    const refEl = slateNode && slateNode.contains(anchor) && slateNode !== anchor ? slateNode : anchor;
    const rect = refEl.getBoundingClientRect();

    // 에디터 영역 밖이면 숨김 (스크롤로 벗어난 경우)
    const editorEl = anchor.closest("[data-slate-editor]") as HTMLElement | null;
    if (editorEl) {
      const editorRect = editorEl.getBoundingClientRect();
      if (rect.bottom < editorRect.top || rect.top > editorRect.bottom) {
        setPos(null);
        return;
      }
    }

    const panelW = 420;
    let left = rect.left;
    if (left < 8) left = 8;
    if (left + panelW > window.innerWidth - 8) left = window.innerWidth - 8 - panelW;
    setPos({ top: rect.bottom + window.scrollY + 6, left });
  }, [anchorRef]);

  // anchor 위치가 안정화되면 위치 계산
  React.useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    // ResizeObserver로 anchor 크기/위치 변경 감지
    const ro = new ResizeObserver(update);
    ro.observe(anchor);

    // 에디터 스크롤 컨테이너 감시
    const editorEl = anchor.closest("[data-slate-editor]") as HTMLElement | null;
    const scrollParent = editorEl?.closest("[style*='overflow'], [class*='editor']") as HTMLElement | null;
    if (scrollParent) scrollParent.addEventListener("scroll", update);

    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      if (scrollParent) scrollParent.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [update, anchorRef]);

  // 외부 클릭 시 확정(confirm) — 툴바 심볼 버튼 클릭은 제외
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      // 툴바 심볼 영역 클릭이면 무시
      const target = e.target as HTMLElement;
      if (target.closest("[data-math-symbols]")) return;
      onConfirm();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [anchorRef, onConfirm]);

  // 에디터에 심볼 삽입 콜백 등록
  const insertSymbolRef = React.useRef((latex: string) => {
    const ta = inputRef.current;
    if (!ta) { onUpdate(draft + latex); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = draft.slice(0, start) + latex + draft.slice(end);
    onUpdate(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + latex.length;
      ta.setSelectionRange(cursor, cursor);
    });
  });
  // ref 최신 값 유지
  insertSymbolRef.current = (latex: string) => {
    const ta = inputRef.current;
    if (!ta) { onUpdate(draft + latex); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = draft.slice(0, start) + latex + draft.slice(end);
    onUpdate(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + latex.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  React.useEffect(() => {
    _mathSymbolInsert.current = (latex: string) => insertSymbolRef.current(latex);
    _mathDeleteNode.current = onDelete;
    _mathEditingSet.current?.(true);
    return () => {
      _mathSymbolInsert.current = null;
      _mathDeleteNode.current = null;
      _mathEditingSet.current?.(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // LaTeX 에러 감지
  const texError = React.useMemo(() => {
    if (!draft.trim()) return null;
    try {
      katex.renderToString(draft, { throwOnError: true, displayMode: true });
      return null;
    } catch (e) {
      const msg = (e as Error).message ?? "";
      const cleaned = msg.replace(/^KaTeX parse error:\s*/i, "");
      if (/undefined control sequence/i.test(msg)) {
        const cmd = msg.match(/\\[a-zA-Z]+/)?.[0] ?? "";
        return `${t("editor.mathErrUnknownCmd")} ${cmd}`;
      }
      if (/expected/i.test(msg)) {
        const what = cleaned.match(/Expected\s+'?(.+?)'?(?:,| at|$)/i)?.[1] ?? "";
        return what ? `'${what}' ${t("editor.mathErrExpected")}` : t("editor.mathErrSyntax");
      }
      if (/missing/i.test(msg)) {
        return cleaned.replace(/Missing/i, t("editor.mathErrMissing")).replace(/,\s*got .+$/, "") || t("editor.mathErrGeneric");
      }
      if (/double superscript/i.test(msg)) return t("editor.mathErrDoubleSup");
      if (/double subscript/i.test(msg)) return t("editor.mathErrDoubleSub");
      if (/extra/i.test(msg)) return cleaned.replace(/^Extra\s*/i, `${t("editor.mathErrExtra")} `) || t("editor.mathErrGeneric");
      return cleaned || t("editor.mathErrGeneric");
    }
  }, [draft]);

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div
      ref={panelRef}
      className={`${styles.mathFloating}${texError ? ` ${styles.mathPreviewError}` : ""}`}
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ position: "relative" }}>
        <div className={styles.mathFloatingCapsule}>
          <button type="button" className={styles.mathCapsuleCancel} onClick={onCancel}>{t("editor.mathCancel")}</button>
          <button type="button" className={styles.mathCapsuleConfirm} onClick={onConfirm} disabled={!draft.trim()}>{t("editor.mathConfirm")}</button>
        </div>
        <textarea
          ref={inputRef}
          className={styles.mathFloatingInput}
          value={draft}
          onChange={(e) => onUpdate(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onConfirm(); }
            if (e.key === "Escape") { onCancel(); }
          }}
          rows={3}
          placeholder={t("editor.mathPlaceholder")}
        />
      </div>
      {texError && (
        <div style={{
          fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-error, #e05252)",
          padding: "2px 4px", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          ⚠ {texError}
        </div>
      )}
    </div>,
    document.body,
  );
}

// ── Math equation 엘리먼트 (KaTeX 렌더링 + 인라인/블록 토글) ──
function MathToggleButton({ isBlock, onToggle }: { isBlock: boolean; onToggle: () => void }) {
  const { t } = useLanguage();
  const [justClicked, setJustClicked] = React.useState(false);
  const current = isBlock ? t("editor.mathBlock") : t("editor.mathInline");
  const alt = isBlock ? t("editor.mathInline") : t("editor.mathBlock");
  return (
    <button
      type="button"
      contentEditable={false}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        setJustClicked(true);
        onToggle();
      }}
      onMouseLeave={() => setJustClicked(false)}
      className={`${styles.codeWrapToggle} math-mode-toggle${justClicked ? " just-clicked" : ""}`}
      style={isBlock ? undefined : { top: -20, right: 0 }}
    >
      <span className="toggle-label-default">{current}</span>
      <span className="toggle-label-hover">{alt}</span>
    </button>
  );
}

export function EquationElement(props: PlateElementProps) {
  const { t } = useLanguage();
  const katexRef = React.useRef<HTMLDivElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const editor = useEditorRef();
  const element = props.element as Record<string, unknown>;
  const tex = String(element.texExpression ?? "");
  const [editing, setEditing] = React.useState(!tex);
  const [draft, setDraft] = React.useState(tex);
  const originalRef = React.useRef(tex);

  useEquationElement({ element: element as never, katexRef, options: { displayMode: true, throwOnError: false } });

  React.useEffect(() => {
    const el = katexRef.current;
    if (!el) return;
    requestAnimationFrame(() => localizeKatexErrors(el));
  });

  // 새로 삽입된 빈 수식은 자동 포커스
  React.useEffect(() => {
    if (!tex) requestAnimationFrame(() => inputRef.current?.focus());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = () => {
    originalRef.current = tex;
    setDraft(tex);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // 실시간 반영
  const updateDraft = (val: string) => {
    setDraft(val);
    const path = editor.api.findPath(props.element);
    if (path) editor.tf.setNodes({ texExpression: val }, { at: path });
  };

  const confirmEdit = () => {
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(originalRef.current);
    const path = editor.api.findPath(props.element);
    if (path) editor.tf.setNodes({ texExpression: originalRef.current }, { at: path });
  };

  const deleteNode = () => {
    const path = editor.api.findPath(props.element);
    if (path) editor.tf.removeNodes({ at: path });
  };

  const toggleMode = () => {
    const path = editor.api.findPath(props.element);
    if (!path) return;
    editor.tf.withoutNormalizing(() => {
      editor.tf.removeNodes({ at: path });
      editor.tf.insertNodes(
        {
          type: "p",
          children: [
            { text: "" },
            { type: "inline_equation", texExpression: tex, children: [{ text: "" }] },
            { text: "" },
          ],
        },
        { at: path },
      );
    });
  };

  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);

  return (
    <BlockDropZone path={elPath}>
    <div {...blockDragProps} style={{ cursor: "default" }}>
    <PlateElement {...props} as="div"
      style={{
        ...props.style, textAlign: "center", margin: "var(--spacing-md, 16px) 0",
        background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)",
        padding: "var(--spacing-sm) var(--spacing-md)",
      }}
      className="math-element-wrap"
    >
      <div ref={wrapRef} contentEditable={false} onClick={startEdit}
        style={{ cursor: "pointer", minHeight: 32, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
      >
        <div ref={katexRef} />
        {!tex && <span style={{ color: "var(--text-tertiary)", fontSize: 14, fontStyle: "italic" }}>{t("editor.mathEmptyBlock")}</span>}
      </div>
      {editing && <MathFloatingEdit anchorRef={wrapRef} inputRef={inputRef} draft={draft} onUpdate={updateDraft} onConfirm={confirmEdit} onCancel={cancelEdit} onDelete={deleteNode} />}
      <MathToggleButton isBlock onToggle={toggleMode} />
      {props.children}
    </PlateElement>
    </div>
    </BlockDropZone>
  );
}

export function InlineEquationElement(props: PlateElementProps) {
  const { t } = useLanguage();
  const katexRef = React.useRef<HTMLDivElement>(null);
  const wrapRef = React.useRef<HTMLSpanElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const editor = useEditorRef();
  const element = props.element as Record<string, unknown>;
  const tex = String(element.texExpression ?? "");
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(tex);
  const originalRef = React.useRef(tex);

  useEquationElement({ element: element as never, katexRef, options: { displayMode: false, throwOnError: false } });

  React.useEffect(() => {
    const el = katexRef.current;
    if (!el) return;
    requestAnimationFrame(() => localizeKatexErrors(el));
  });

  // 마운트 시 접히는 애니메이션: 에디터 너비 → 실제 너비
  useEffect(() => {
    const el = katexRef.current;
    if (!el) return;
    const editorEl = el.closest("[data-slate-editor]") as HTMLElement | null;
    const startWidth = editorEl?.offsetWidth ?? 600;
    const naturalWidth = el.offsetWidth;
    if (startWidth <= naturalWidth) return;
    el.animate(
      [
        { width: `${startWidth}px`, offset: 0 },
        { width: `${naturalWidth}px`, offset: 1 },
      ],
      { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  }, []);

  const startEdit = () => {
    originalRef.current = tex;
    setDraft(tex);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const updateDraft = (val: string) => {
    setDraft(val);
    const path = editor.api.findPath(props.element);
    if (path) editor.tf.setNodes({ texExpression: val }, { at: path });
  };

  const confirmEdit = () => {
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(originalRef.current);
    const path = editor.api.findPath(props.element);
    if (path) editor.tf.setNodes({ texExpression: originalRef.current }, { at: path });
  };

  const deleteNode = () => {
    const path = editor.api.findPath(props.element);
    if (path) editor.tf.removeNodes({ at: path });
  };

  const toggleMode = () => {
    const path = editor.api.findPath(props.element);
    if (!path) return;
    const parentPath = path.slice(0, -1);
    editor.tf.withoutNormalizing(() => {
      editor.tf.removeNodes({ at: parentPath });
      editor.tf.insertNodes(
        { type: "equation", texExpression: tex, children: [{ text: "" }] },
        { at: parentPath },
      );
    });
  };
  return (
    <PlateElement {...props} as="span"
      style={{ ...props.style, position: "relative", padding: "0 2px" }}
      className="math-element-wrap"
    >
      <span ref={wrapRef} contentEditable={false} className="math-katex-content" onClick={startEdit}
        style={{ cursor: "pointer", minHeight: 18, display: "inline-flex", alignItems: "center" }}
      >
        <span ref={katexRef} />
        {!tex && <span style={{ color: "var(--text-tertiary)", fontSize: 13, fontStyle: "italic" }}>{t("editor.mathEmptyInline")}</span>}
      </span>
      {editing && <MathFloatingEdit anchorRef={wrapRef} inputRef={inputRef} draft={draft} onUpdate={updateDraft} onConfirm={confirmEdit} onCancel={cancelEdit} onDelete={deleteNode} />}
      <MathToggleButton isBlock={false} onToggle={toggleMode} />
      {props.children}
    </PlateElement>
  );
}
