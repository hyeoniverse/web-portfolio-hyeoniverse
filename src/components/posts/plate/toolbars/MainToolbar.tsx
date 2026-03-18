"use client";

import React, { useCallback, useRef } from "react";
import { setAlign, setLineHeight } from "@platejs/basic-styles";
import { insertTable } from "@platejs/table";
import { toggleCodeBlock } from "@platejs/code-block";
import { toggleList, someList, someTodoList } from "@platejs/list";
import { indent, outdent } from "@platejs/indent";
import { useLanguage } from "@/providers/LanguageProvider";
import Tooltip from "@/components/ui/Tooltip";
import { loadGoogleFont } from "@/lib/loadGoogleFont";
import TBtn from "../TBtn";
import { AlignIcon } from "../icons";
import {
  FONT_GROUPS,
  FONT_FAMILIES_FLAT,
  FONT_SIZE_PRESETS,
  LINE_HEIGHT_PRESETS,
  LETTER_SPACING_PRESETS,
  BASE_COLORS,
  VIVID_COLORS,
  PASTEL_COLORS,
} from "../constants";
import {
  useEditorMarks,
  useBlockInfo,
  useComputedStyle,
  resolvedFontSize,
  resolvedLineHeight,
} from "../hooks";
import styles from "../../RichTextEditor.module.css";

export interface MainToolbarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
  isMac: boolean;
  /** 에디터 변경마다 증가 — React.memo 리렌더 트리거 */
  tick?: number;
  // link / embed input toggle
  showLinkInput: boolean;
  onToggleLinkInput: () => void;
  showEmbedInput: boolean;
  onToggleEmbedInput: () => void;
  // html
  htmlMode: boolean;
  onToggleHtmlMode: () => void;
  // actions
  onAddImage: () => void;
  onInsertMath: () => void;
}

const MAX_RECENT = 5;
const ALL_PRESETS = new Set([...BASE_COLORS, ...VIVID_COLORS, ...PASTEL_COLORS]);

function ColorPalette({
  label, currentColor, onApply, onRemove, recentRef, removeTooltip, pickerTitle,
}: {
  label: string;
  currentColor: string;
  onApply: (color: string) => void;
  onRemove: () => void;
  recentRef: React.RefObject<string[]>;
  removeTooltip: string;
  pickerTitle: string;
}) {
  const applyColor = (color: string) => {
    onApply(color);
    // 프리셋에 없는 색만 최근 사용에 추가
    if (!ALL_PRESETS.has(color)) {
      const list = recentRef.current!;
      const idx = list.indexOf(color);
      if (idx !== -1) list.splice(idx, 1);
      list.unshift(color);
      if (list.length > MAX_RECENT) list.pop();
    }
  };

  const dot = (color: string, active: boolean, light?: boolean) => (
    <Tooltip key={color} content={color} delay={200} placement="top">
      <button
        type="button"
        className={`${styles.presetDot} ${active ? styles.presetDotActive : ""}`}
        style={{ background: color, border: light ? "1px solid var(--border-light-color)" : undefined }}
        onClick={() => applyColor(color)}
      />
    </Tooltip>
  );

  const isLight = (c: string) => c === "#ffffff" || c === "#d1d5db" || PASTEL_COLORS.includes(c);

  return (
    <div className={styles.colorSection}>
      {/* 라벨 + 현재색 인디케이터 + 피커 */}
      <div className={styles.colorGroup}>
        <span className={styles.colorLabel}>{label}</span>
        <div className={styles.colorIndicator} style={{ background: currentColor || (label === "BG" ? "transparent" : "var(--text-primary)"), border: !currentColor && label === "BG" ? "1px solid var(--border-light-color)" : undefined }} />
        <input
          type="color"
          className={styles.colorInput}
          value={currentColor || (label === "BG" ? "#ffff00" : "#000000")}
          onChange={(e) => applyColor(e.target.value)}
          title={pickerTitle}
        />
      </div>
      <div className={styles.divider} />
      {/* 기본 */}
      {BASE_COLORS.map((c) => dot(c, currentColor === c, isLight(c)))}
      <div className={styles.divider} />
      {/* 비비드 */}
      {VIVID_COLORS.map((c) => dot(c, currentColor === c))}
      <div className={styles.divider} />
      {/* 파스텔 */}
      {PASTEL_COLORS.map((c) => dot(c, currentColor === c, true))}
      {/* 최근 사용 */}
      {recentRef.current!.length > 0 && (
        <>
          <div className={styles.divider} />
          {recentRef.current!.map((c) => dot(c, currentColor === c, isLight(c)))}
        </>
      )}
      {/* 제거 */}
      {currentColor && (
        <Tooltip content={removeTooltip} delay={200} placement="top">
          <button type="button" className={styles.presetDotClear} onClick={onRemove}>×</button>
        </Tooltip>
      )}
    </div>
  );
}

export default React.memo(function MainToolbar({
  editor, isMac,
  showLinkInput, onToggleLinkInput,
  showEmbedInput, onToggleEmbedInput,
  htmlMode, onToggleHtmlMode,
  onAddImage, onInsertMath,
}: MainToolbarProps) {
  const { t } = useLanguage();
  const recentTextColorsRef = useRef<string[]>([]);
  const recentBgColorsRef = useRef<string[]>([]);

  // ── Keyboard shortcut label ──
  const kb = useCallback((mac: string) => {
    if (isMac) return mac;
    return mac.replace(/⌘/g, "Ctrl+").replace(/⌥/g, "Alt+").replace(/⇧/g, "Shift+");
  }, [isMac]);

  // ── Derived editor state ──
  const { hasMark, color: currentColor, bgColor: currentBgColor, fontFamily: currentFontFamily, fontSize: markFontSize, letterSpacing: currentLetterSpacing } = useEditorMarks(editor);
  const { blockType, align: currentAlign, lineHeight: blockLineHeight } = useBlockInfo(editor);
  const computed = useComputedStyle();
  const currentFontSize = resolvedFontSize(markFontSize, computed);
  const currentFontSizeNum = currentFontSize.replace("px", "");
  const currentLineHeight = resolvedLineHeight(blockLineHeight, computed);

  // ── List active state ──
  let isUL = false, isOL = false, isTodo = false;
  try { isUL = someList(editor, "disc"); } catch { /* ignore */ }
  try { isOL = someList(editor, "decimal"); } catch { /* ignore */ }
  try { isTodo = someTodoList(editor); } catch { /* ignore */ }

  // ── Undo/Redo ──
  const canUndo = (editor.history?.undos?.length ?? 0) > 0;
  const canRedo = (editor.history?.redos?.length ?? 0) > 0;

  return (
    <div className={styles.toolbar}>
      {/* Undo / Redo */}
      <TBtn onClick={() => editor.undo()} disabled={!canUndo} tooltip={`${t("editor.undo")}\n${kb("⌘Z")}`}>↩</TBtn>
      <TBtn onClick={() => editor.redo()} disabled={!canRedo} tooltip={`${t("editor.redo")}\n${kb("⌘⇧Z")}`}>↪</TBtn>
      <div className={styles.divider} />

      {/* Text formatting */}
      <TBtn active={hasMark("bold")} onClick={() => editor.tf.toggleMark("bold")} tooltip={`${t("editor.bold")}\n${kb("⌘B")}`}>B</TBtn>
      <TBtn active={hasMark("italic")} onClick={() => editor.tf.toggleMark("italic")} style={{ fontStyle: "italic" }} tooltip={`${t("editor.italic")}\n${kb("⌘I")}`}>I</TBtn>
      <TBtn active={hasMark("underline")} onClick={() => editor.tf.toggleMark("underline")} style={{ textDecoration: "underline" }} tooltip={`${t("editor.underline")}\n${kb("⌘U")}`}>U</TBtn>
      <TBtn active={hasMark("strikethrough")} onClick={() => editor.tf.toggleMark("strikethrough")} style={{ textDecoration: "line-through" }} tooltip={t("editor.strikethrough")}>S</TBtn>
      <TBtn active={hasMark("code")} onClick={() => editor.tf.toggleMark("code")} tooltip={`${t("editor.inlineCode")}\n${kb("⌘E")}`}>{"<>"}</TBtn>
      <div className={styles.divider} />

      {/* Superscript / Subscript */}
      <TBtn active={hasMark("superscript")} onClick={() => editor.tf.toggleMark("superscript")} tooltip={t("editor.superscript")}>x²</TBtn>
      <TBtn active={hasMark("subscript")} onClick={() => editor.tf.toggleMark("subscript")} tooltip={t("editor.subscript")}>x₂</TBtn>
      <div className={styles.divider} />

      {/* Font family */}
      <div className={styles.selectWrap}>
        <select
          className={styles.fontSelect}
          value={FONT_FAMILIES_FLAT.find((f) => f.value === currentFontFamily)?.value ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              const entry = FONT_FAMILIES_FLAT.find((f) => f.value === val);
              if (entry?.googleName) loadGoogleFont(entry.googleName);
              editor.tf.addMarks({ fontFamily: val });
            } else {
              editor.tf.removeMarks(["fontFamily"]);
            }
            setTimeout(() => editor.tf.focus(), 0);
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

      {/* Font size */}
      <div className={styles.selectWrap}>
        <select
          className={`${styles.fontSelect} ${styles.fontSizeSelect}`}
          value={currentFontSizeNum}
          onChange={(e) => {
            const val = e.target.value;
            if (val) editor.tf.addMarks({ fontSize: `${val}px` });
            else editor.tf.removeMarks(["fontSize"]);
            setTimeout(() => editor.tf.focus(), 0);
          }}
        >
          {!currentFontSizeNum && <option value="">{t("editor.fontSize")}</option>}
          {FONT_SIZE_PRESETS.map((s) => <option key={s} value={String(s)}>{s}px</option>)}
        </select>
      </div>

      {/* Line height */}
      <div className={styles.selectWrap}>
        <select
          className={`${styles.fontSelect} ${styles.lhSelect}`}
          value={currentLineHeight}
          onChange={(e) => {
            const val = e.target.value || undefined;
            setLineHeight(editor, val ? Number(val) : 0);
            setTimeout(() => editor.tf.focus(), 0);
          }}
        >
          {!currentLineHeight && <option value="">{t("editor.lineHeight")}</option>}
          {LINE_HEIGHT_PRESETS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Letter spacing */}
      <div className={styles.selectWrap}>
        <select
          className={`${styles.fontSelect} ${styles.lsSelect}`}
          value={currentLetterSpacing || "0em"}
          onChange={(e) => {
            const val = e.target.value;
            if (!val || val === "0em") editor.tf.removeMarks(["letterSpacing"]);
            else editor.tf.addMarks({ letterSpacing: val });
            setTimeout(() => editor.tf.focus(), 0);
          }}
        >
          {!currentLetterSpacing && <option value="">{t("editor.letterSpacing")}</option>}
          {LETTER_SPACING_PRESETS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className={styles.divider} />

      {/* Text alignment */}
      {(["left", "center", "right", "justify"] as const).map((align) => {
        const alignLabels = { left: `${t("editor.alignLeft")}\n${kb("⌘⇧L")}`, center: `${t("editor.alignCenter")}\n${kb("⌘⇧E")}`, right: `${t("editor.alignRight")}\n${kb("⌘⇧R")}`, justify: `${t("editor.alignJustify")}\n${kb("⌘⇧J")}` };
        return (
          <TBtn key={align} active={currentAlign === align} onClick={() => setAlign(editor, align)} tooltip={alignLabels[align]}>
            <AlignIcon align={align} />
          </TBtn>
        );
      })}
      <div className={styles.divider} />

      {/* Text color */}
      <ColorPalette
        label="A"
        currentColor={currentColor}
        onApply={(c) => editor.tf.addMarks({ color: c })}
        onRemove={() => editor.tf.removeMarks(["color"])}
        recentRef={recentTextColorsRef}
        removeTooltip={t("editor.removeColor")}
        pickerTitle={t("editor.textColor")}
      />

      {/* BG color */}
      <ColorPalette
        label="BG"
        currentColor={currentBgColor}
        onApply={(c) => editor.tf.addMarks({ backgroundColor: c })}
        onRemove={() => editor.tf.removeMarks(["backgroundColor"])}
        recentRef={recentBgColorsRef}
        removeTooltip={t("editor.removeBgColor")}
        pickerTitle={t("editor.bgColor")}
      />

      {/* Clear formatting */}
      <TBtn
        onClick={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const m = (editor as any).getMarks();
          if (m) {
            const keys = Object.keys(m);
            if (keys.length > 0) editor.tf.removeMarks(keys);
          }
        }}
        tooltip={t("editor.clearFormat")}
      >
        Clear
      </TBtn>
      <div className={styles.divider} />

      {/* Headings */}
      <TBtn active={blockType === "h1"} onClick={() => editor.tf.toggleBlock("h1")} tooltip={`${t("editor.heading1")}\n${kb("⌘⌥1")}`}>H1</TBtn>
      <TBtn active={blockType === "h2"} onClick={() => editor.tf.toggleBlock("h2")} tooltip={`${t("editor.heading2")}\n${kb("⌘⌥2")}`}>H2</TBtn>
      <TBtn active={blockType === "h3"} onClick={() => editor.tf.toggleBlock("h3")} tooltip={`${t("editor.heading3")}\n${kb("⌘⌥3")}`}>H3</TBtn>
      <div className={styles.divider} />

      {/* Lists & blocks */}
      <div className={styles.selectWrap}>
        <select className={styles.fontSelect} style={{ width: 76 }} value={isUL ? "disc" : ""} onChange={(e) => { if (e.target.value) toggleList(editor, { listStyleType: e.target.value }); setTimeout(() => editor.tf.focus(), 0); }}>
          <option value="">● UL</option>
          <option value="disc">{`● ${t("editor.ulDisc")}`}</option>
          <option value="circle">{`○ ${t("editor.ulCircle")}`}</option>
          <option value="square">{`■ ${t("editor.ulSquare")}`}</option>
          <option value="'- '">{`– ${t("editor.ulDash")}`}</option>
          <option value="'✓ '">{`✓ ${t("editor.ulCheck")}`}</option>
          <option value="'→ '">{`→ ${t("editor.ulArrow")}`}</option>
          <option value="'★ '">{`★ ${t("editor.ulStar")}`}</option>
          <option value="disclosure-open">{`▽ ${t("editor.ulTriOpen")}`}</option>
          <option value="disclosure-closed">{`▷ ${t("editor.ulTriClosed")}`}</option>
        </select>
      </div>
      <div className={styles.selectWrap}>
        <select className={styles.fontSelect} style={{ width: 82 }} value={isOL ? "decimal" : ""} onChange={(e) => { if (e.target.value) toggleList(editor, { listStyleType: e.target.value }); setTimeout(() => editor.tf.focus(), 0); }}>
          <option value="">1. OL</option>
          <option value="decimal">1, 2, 3</option>
          <option value="decimal-leading-zero">01, 02, 03</option>
          <option value="lower-alpha">a, b, c</option>
          <option value="upper-alpha">A, B, C</option>
          <option value="lower-roman">i, ii, iii</option>
          <option value="upper-roman">I, II, III</option>
          <option value="lower-greek">α, β, γ</option>
          <option value="korean-hangul-formal">가, 나, 다</option>
          <option value="cjk-ideographic">一, 二, 三</option>
        </select>
      </div>
      <TBtn active={isTodo} onClick={() => {
        const entry = editor.api.block();
        if (!entry) return;
        const [node, path] = entry;
        const el = node as Record<string, unknown>;
        if (Object.hasOwn(el, "checked")) {
          editor.tf.unsetNodes(["checked", "listStyleType"], { at: path });
        } else {
          editor.tf.setNodes({ checked: false, listStyleType: "todo" }, { at: path });
        }
      }} tooltip={t("editor.todoList")}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1.5" y="1.5" width="13" height="13" rx="2" />
          <polyline points="4.5 8.5 7 11 11.5 5.5" />
        </svg>
      </TBtn>
      <TBtn active={blockType === "blockquote"} onClick={() => editor.tf.toggleBlock("blockquote")} tooltip={`${t("editor.blockquote")}\n${kb("⌘⇧B")}`}>Quote</TBtn>
      <TBtn active={blockType === "code_block"} onClick={() => toggleCodeBlock(editor)} tooltip={`${t("editor.codeBlock")}\n${kb("⌘⌥C")}`}>Code</TBtn>
      <div className={styles.divider} />

      {/* 들여쓰기 */}
      <TBtn onClick={() => indent(editor)} tooltip={`${t("editor.indent")} (Tab)`}>→|</TBtn>
      <TBtn onClick={() => outdent(editor)} tooltip={`${t("editor.outdent")} (Shift+Tab)`}>|←</TBtn>
      <div className={styles.divider} />

      {/* Insert */}
      <TBtn
        active={showLinkInput}
        onClick={onToggleLinkInput}
        tooltip={`${t("editor.insertLink")}\n${kb("⌘K")}`}
      >
        Link
      </TBtn>
      <TBtn onClick={onAddImage} tooltip={t("editor.insertImage")}>Image</TBtn>
      <TBtn onClick={() => { editor.tf.withMerging(() => { insertTable(editor, { colCount: 3, rowCount: 3, header: true }); }); }} tooltip={t("editor.insertTable")}>Table</TBtn>
      <TBtn onClick={() => editor.tf.insertNodes({ type: "hr", children: [{ text: "" }] })} tooltip={t("editor.insertHr")}>HR</TBtn>
      <TBtn
        active={showEmbedInput}
        onClick={onToggleEmbedInput}
        tooltip={`${t("editor.insertEmbed")}\nYouTube · Spotify · X`}
      >
        Embed
      </TBtn>
      <TBtn tooltip={t("editor.insertMath")} onClick={onInsertMath}>∑</TBtn>
      <div className={styles.divider} />

      <TBtn
        active={htmlMode}
        onClick={onToggleHtmlMode}
        tooltip={htmlMode ? t("editor.htmlToRich") : t("editor.htmlSource")}
      >
        {"</>"}
      </TBtn>
    </div>
  );
});
