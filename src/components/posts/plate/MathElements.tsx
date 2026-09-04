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
import { _mathSymbolInsert, _mathEditingSet, _mathDeleteNode, _mathToggleMode } from "./utils";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import { BlockTailClickZone } from "./elements";
import base from "../RichTextEditor.module.css";
import math from "../EditorMath.module.css";
const styles = { ...base, ...math };
import Pressable from "@/components/ui/Pressable";

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
  onToggle,
  inline,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  draft: string;
  onUpdate: (val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onToggle: () => void;
  /** true 면 portal/positioning 없이 블록 안에 그대로 렌더 */
  inline?: boolean;
}) {
  const { t } = useLanguage();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
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

    const panelW = panelRef.current?.offsetWidth || 620;
    const panelH = panelRef.current?.offsetHeight || 200;
    let left = rect.left;
    if (left < 8) left = 8;
    if (left + panelW > window.innerWidth - 8) left = window.innerWidth - 8 - panelW;

    // 하단에 공간이 있는지 판단 (에디터 영역 또는 뷰포트 기준)
    const bottomBound = editorEl
      ? Math.min(editorEl.getBoundingClientRect().bottom, window.innerHeight)
      : window.innerHeight;
    const spaceBelow = bottomBound - rect.bottom;
    const spaceAbove = rect.top - (editorEl ? editorEl.getBoundingClientRect().top : 0);

    let top: number;
    if (spaceBelow >= panelH + 6) {
      // 아래에 공간 충분 → 아래 배치
      top = rect.bottom + window.scrollY + 6;
    } else if (spaceAbove >= panelH + 6) {
      // 위에 공간 충분 → 위 배치
      top = rect.top + window.scrollY - panelH - 6;
    } else {
      // 양쪽 다 부족 → 위에 배치 (잘리더라도)
      top = rect.top + window.scrollY - panelH - 6;
    }

    // 에디터 영역 안에 clamp
    if (editorEl) {
      const editorRect = editorEl.getBoundingClientRect();
      const editorBottom = editorRect.bottom + window.scrollY;
      const editorTop = editorRect.top + window.scrollY;
      if (top + panelH > editorBottom) top = editorBottom - panelH - 16;
      if (top < editorTop) top = editorTop + 16;
    }
    setPos({ top, left });
  }, [anchorRef]);

  // anchor 위치가 안정화되면 위치 계산 (inline 은 positioning 불필요)
  React.useEffect(() => {
    if (inline) return;
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
    _mathToggleMode.current = onToggle;
    _mathEditingSet.current?.(true);
    return () => {
      _mathSymbolInsert.current = null;
      _mathDeleteNode.current = null;
      _mathToggleMode.current = null;
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
  }, [draft, t]);

  // split 미리보기 — draft 를 KaTeX 로 실시간 렌더 (블록·인라인 공통)
  React.useEffect(() => {
    if (!previewRef.current) return;
    try { katex.render(draft, previewRef.current, { displayMode: true, throwOnError: false }); }
    catch { /* noop */ }
  }, [draft]);

  if (!inline && !pos) return null;

  const content = (
    <div
      ref={panelRef}
      data-math-panel=""
      className={`${styles.mathFloating} ${styles.mathFloatingSplit}${inline ? ` ${styles.mathFloatingInline}` : ""}${texError ? ` ${styles.mathPreviewError}` : ""}`}
      style={inline ? undefined : { top: pos!.top, left: pos!.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className={styles.mathFloatingInput}
        onClick={() => inputRef.current?.focus()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
          {texError ? (
            <span style={{
              fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-error, #e05252)",
              lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap", flex: 1, minWidth: 0,
            }}>
              ⚠ {texError}
            </span>
          ) : <span className="spacer" />}
          <div className={styles.mathFloatingCapsule} style={{ position: "static" }}>
            <Pressable noTapScale className={styles.mathCapsuleCancel} onClick={onCancel}>{t("editor.mathCancel")}</Pressable>
            <Pressable noTapScale className={styles.mathCapsuleConfirm} onClick={onConfirm} disabled={!draft.trim()}>{t("editor.mathConfirm")}</Pressable>
          </div>
        </div>
        <textarea
          ref={inputRef}
          style={{
            width: "100%", border: "none", outline: "none", resize: "vertical",
            background: "transparent", color: "inherit", fontFamily: "inherit",
            fontSize: "inherit", lineHeight: "inherit", padding: 0, minHeight: 60,
          }}
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
      <div className={styles.mathFloatingPreview}>
        {draft.trim()
          ? <div ref={previewRef} />
          : <span className={styles.mathFloatingPreviewEmpty}>{t("editor.mathPlaceholder")}</span>}
      </div>
    </div>
  );

  return inline ? content : ReactDOM.createPortal(content, document.body);
}

// ── Math equation 엘리먼트 (KaTeX 렌더링 + 인라인/블록 토글) ──
function MathToggleButton({ isBlock, onToggle }: { isBlock: boolean; onToggle: () => void }) {
  const { t } = useLanguage();
  const [justClicked, setJustClicked] = React.useState(false);
  const current = isBlock ? t("editor.mathBlock") : t("editor.mathInline");
  const alt = isBlock ? t("editor.mathInline") : t("editor.mathBlock");
  return (
    <Pressable noTapScale
      contentEditable={false}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        setJustClicked(true);
        onToggle();
      }}
      onMouseLeave={() => setJustClicked(false)}
      className={`${styles.codeWrapToggle} math-mode-toggle${justClicked ? " just-clicked" : ""}`}
      style={isBlock ? { position: "absolute", top: 8, right: 8 } : { top: -20, right: 0 }}
    >
      <span className="toggle-label-default">{current}</span>
      <span className="toggle-label-hover">{alt}</span>
    </Pressable>
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
  // 빈 수식 자동 편집은 "새로 삽입"(에디터 포커스 상태)일 때만 — 저장된 빈 수식이 로드 시
  // focus 없이 편집 bar 를 띄우는 문제 방지.
  const [editing, setEditing] = React.useState(() => !tex && editor.api.isFocused());
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
  const { blockDragProps, isDragging: dragReady } = useBlockDrag(elPath);

  return (
    <BlockDropZone path={elPath} style={{ margin: "var(--prose-block-gap) 0" }}>
    <div {...blockDragProps} style={{ cursor: "default" }}>
    <PlateElement {...props} as="div"
      style={{
        ...props.style, position: "relative", textAlign: "center",
        background: "var(--bg-tertiary)", borderRadius: "var(--radius-2xl)",
        padding: "var(--spacing-sm) var(--spacing-md)",
      }}
      className="math-element-wrap"
    >
      {/* katex 뷰는 항상 마운트(useEquationElement 렌더 대상 유지) — 편집 중엔 숨김만 */}
      <div ref={wrapRef} contentEditable={false} onClick={() => { if (!dragReady && !editing) startEdit(); }}
        style={{ display: editing ? "none" : "flex", cursor: "pointer", minHeight: 40, alignItems: "center", justifyContent: "center", position: "relative" }}
      >
        <div ref={katexRef} />
        {!tex && <span style={{ color: "var(--text-tertiary)", fontSize: 14, fontStyle: "italic" }}>{t("editor.mathEmptyBlock")}</span>}
      </div>
      {editing && (
        // 팝업 대신 블록 안에서 인라인 split (입력 | 미리보기)
        <MathFloatingEdit inline anchorRef={wrapRef} inputRef={inputRef} draft={draft} onUpdate={updateDraft} onConfirm={confirmEdit} onCancel={cancelEdit} onDelete={deleteNode} onToggle={toggleMode} />
      )}
      {!editing && <MathToggleButton isBlock onToggle={toggleMode} />}
      {props.children}
    </PlateElement>
    </div>
    <BlockTailClickZone path={elPath} />
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
      style={{
        ...props.style, position: "relative", background: "var(--bg-tertiary)",
        ...(editing
          ? { display: "block", padding: "var(--spacing-sm) var(--spacing-md)", borderRadius: "var(--radius-2xl)" }
          : { display: "inline-flex", alignItems: "center", verticalAlign: "middle", padding: "4px 10px", minWidth: 60, minHeight: 32, borderRadius: "var(--radius-sm, 4px)" }),
      }}
      className="math-element-wrap"
    >
      {/* katex 뷰는 항상 마운트 — 편집 중엔 숨김만 (편집 종료 후 즉시 재표시) */}
      <span ref={wrapRef} contentEditable={false} className="math-katex-content" onClick={() => { if (!editing) startEdit(); }}
        style={{ display: editing ? "none" : "inline-flex", cursor: "pointer", minHeight: 24, alignItems: "center" }}
      >
        <span ref={katexRef} />
        {!tex && <span style={{ color: "var(--text-tertiary)", fontSize: 13, fontStyle: "italic" }}>{t("editor.mathEmptyInline")}</span>}
      </span>
      {/* 팝업 대신 블록과 동일한 인라인 split 에디터 */}
      {editing && <MathFloatingEdit inline anchorRef={wrapRef} inputRef={inputRef} draft={draft} onUpdate={updateDraft} onConfirm={confirmEdit} onCancel={cancelEdit} onDelete={deleteNode} onToggle={toggleMode} />}
      {!editing && <MathToggleButton isBlock={false} onToggle={toggleMode} />}
      {props.children}
    </PlateElement>
  );
}
