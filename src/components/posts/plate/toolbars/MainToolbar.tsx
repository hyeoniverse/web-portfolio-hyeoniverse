"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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

export default React.memo(function MainToolbar({
  editor, isMac,
  showLinkInput, onToggleLinkInput,
  showEmbedInput, onToggleEmbedInput,
  htmlMode, onToggleHtmlMode,
  onAddImage, onInsertMath,
}: MainToolbarProps) {
  const { t } = useLanguage();
  const [colorMode, setColorMode] = useState<"text" | "bg" | null>(null);
  const recentColorsRef = useRef<string[]>([]);

  // 색상 팔레트 바깥 클릭 시 닫기
  useEffect(() => {
    if (!colorMode) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-color-section]")) {
        setColorMode(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [colorMode]);

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

      {/* Color mode toggle + palette */}
      <div data-color-section style={{ display: "flex", alignItems: "center" }}>
        <TBtn
          active={colorMode === "text"}
          onClick={() => setColorMode(colorMode === "text" ? null : "text")}
          tooltip={t("editor.textColor")}
        >
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 11 }}>A</span>
            <span style={{ width: 12, height: 3, borderRadius: 1, background: currentColor || "var(--text-primary)" }} />
          </span>
        </TBtn>
        <TBtn
          active={colorMode === "bg"}
          onClick={() => setColorMode(colorMode === "bg" ? null : "bg")}
          tooltip={t("editor.bgColor")}
        >
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 11 }}>BG</span>
            <span style={{ width: 12, height: 3, borderRadius: 1, background: currentBgColor || "transparent", border: !currentBgColor ? "1px solid var(--border-light-color)" : undefined }} />
          </span>
        </TBtn>

        {/* 프리셋 — colorMode 선택 시에만 표시 */}
        {colorMode && (() => {
          const activeColor = colorMode === "text" ? currentColor : currentBgColor;
          const apply = (color: string) => {
            if (colorMode === "text") editor.tf.addMarks({ color });
            else editor.tf.addMarks({ backgroundColor: color });
            if (!ALL_PRESETS.has(color)) {
              const list = recentColorsRef.current;
              const idx = list.indexOf(color);
              if (idx !== -1) list.splice(idx, 1);
              list.unshift(color);
              if (list.length > MAX_RECENT) list.pop();
            }
          };
          const isLight = (c: string) => c === "#ffffff" || c === "#d1d5db" || PASTEL_COLORS.includes(c);
          const dot = (c: string) => (
            <Tooltip key={c} content={c} delay={200} placement="top">
              <button type="button" className={`${styles.presetDot} ${activeColor === c ? styles.presetDotActive : ""}`} style={{ background: c, border: isLight(c) ? "1px solid var(--border-light-color)" : undefined }} onClick={() => apply(c)} />
            </Tooltip>
          );
          return (
            <div className={styles.colorSection}>
              {BASE_COLORS.map(dot)}
              <div className={styles.divider} />
              {VIVID_COLORS.map(dot)}
              <div className={styles.divider} />
              {PASTEL_COLORS.map(dot)}
              {recentColorsRef.current.length > 0 && (
                <>
                  <div className={styles.divider} />
                  {recentColorsRef.current.map(dot)}
                </>
              )}
              {/* 컬러피커 */}
              <div className={styles.divider} />
              <div className={styles.colorGroup}>
                <div className={styles.colorIndicator} style={{ width: 14, height: 14, borderRadius: "50%", background: activeColor || "var(--bg-primary)", border: "1px solid var(--border-light-color)" }} />
                <input type="color" className={styles.colorInput} value={activeColor || "#000000"} onChange={(e) => apply(e.target.value)} title={colorMode === "text" ? t("editor.textColor") : t("editor.bgColor")} />
              </div>
              {/* 제거 */}
              {activeColor && (
                <Tooltip content={colorMode === "text" ? t("editor.removeColor") : t("editor.removeBgColor")} delay={200} placement="top">
                  <button type="button" className={styles.presetDotClear} onClick={() => { if (colorMode === "text") editor.tf.removeMarks(["color"]); else editor.tf.removeMarks(["backgroundColor"]); }}>×</button>
                </Tooltip>
              )}
            </div>
          );
        })()}
      </div>

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
