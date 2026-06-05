"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { setAlign, setLineHeight } from "@platejs/basic-styles";
import { insertTable } from "@platejs/table";
import { toggleCodeBlock } from "@platejs/code-block";
import { toggleList, someList, someTodoList } from "@platejs/list";
import { indent, outdent } from "@platejs/indent";
import { useLanguage } from "@/providers/LanguageProvider";
import Tooltip from "@/components/ui/Tooltip";
import _Select from "@/components/ui/Select";
import ColorPicker from "@/components/ui/ColorPicker";
import FontPicker from "@/components/ui/FontPicker";
import { loadGoogleFont } from "@/lib/loadGoogleFont";
import TBtn from "../TBtn";
import { MessageSquareQuote, ChevronRight, Undo2, Redo2, SquareCheck } from "lucide-react";
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

interface MainToolbarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
  isMac: boolean;
  /** 에디터 변경마다 증가 — React.memo 리렌더 트리거 */
  tick?: number;
  /** 게시물 작성 언어 (폰트 그룹 정렬) */
  postLang?: "ko" | "en";
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
  onAddFile: () => void;
  onAddAudio: () => void;
  onInsertMath: () => void;
  mathEditing?: boolean;
}


// ── Editor 용 FontPicker wrapper — 공통 FontPicker 위에 editor 특유의 normalize/Default 처리 ──
function EditorFontPicker({ value, onChange, preferEn }: { value: string; onChange: (val: string, googleName?: string) => void; preferEn?: boolean }) {
  // editor 는 "Default" (빈 값) 옵션을 그룹 최상단에 prepend. 나머지는 FONT_GROUPS 그대로.
  const groups = [
    { group: "", fonts: [{ label: "Default", value: "" }] },
    ...FONT_GROUPS,
  ];

  // editor 값은 CSS font-family string (따옴표 등 표기 차이 있을 수 있음) — 정규화해서 매칭
  const resolveMatch = (v: string) => {
    if (!v) return "";
    if (FONT_FAMILIES_FLAT.some((f) => f.value === v)) return v;
    const normalized = v.replace(/["']/g, "").split(",")[0].trim();
    const byName = FONT_FAMILIES_FLAT.find((f) => f.label.toLowerCase() === normalized.toLowerCase());
    return byName ? byName.value : "";
  };

  const renderValue = () => {
    if (!value) return "Default";
    const matched = resolveMatch(value);
    if (matched) {
      const font = FONT_FAMILIES_FLAT.find((f) => f.value === matched);
      return font ? font.label : "Default";
    }
    const normalized = value.replace(/["']/g, "").split(",")[0].trim();
    return normalized || "Default";
  };

  return (
    <FontPicker
      value={value}
      onChange={onChange}
      groups={groups}
      preferEn={preferEn}
      triggerClassName={styles.fontPickerSelect}
      dropdownClassName={styles.fontPickerDropdown}
      renderValue={renderValue}
      resolveMatch={(v) => resolveMatch(v)}
      toGoogleValue={(name) => `'${name}', sans-serif`}
    />
  );
}

const MAX_RECENT = 5;
const ALL_PRESETS = new Set([...BASE_COLORS, ...VIVID_COLORS, ...PASTEL_COLORS]);

export default React.memo(function MainToolbar({
  editor, isMac, postLang,
  showLinkInput, onToggleLinkInput,
  showEmbedInput, onToggleEmbedInput,
  htmlMode, onToggleHtmlMode,
  onAddImage, onAddFile, onAddAudio, onInsertMath, mathEditing,
}: MainToolbarProps) {
  const { t, language } = useLanguage();
  const preferEn = language === "en" || postLang === "en";
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
  const { hasMark, color: currentColor, bgColor: currentBgColor, fontFamily: markFontFamily, fontSize: markFontSize, letterSpacing: currentLetterSpacing } = useEditorMarks(editor);
  const { blockType, align: currentAlign, lineHeight: blockLineHeight } = useBlockInfo(editor);
  const computed = useComputedStyle();
  // mark가 없으면 computed에서 실제 렌더링 폰트 읽기
  const currentFontFamily = markFontFamily || (computed?.fontFamily ?? "");
  const currentFontSize = resolvedFontSize(markFontSize, computed);
  const currentFontSizeNum = currentFontSize.replace("px", "");
  const currentLineHeight = resolvedLineHeight(blockLineHeight, computed);

  const [fontSizeInput, setFontSizeInput] = useState(false);
  const [fontSizeVal, setFontSizeVal] = useState("");
  const [lhInput, setLhInput] = useState(false);
  const [lhVal, setLhVal] = useState("");

  // document keydown으로 값 입력 (에디터 focus 유지 → selection 보존)
  useEffect(() => {
    if (!fontSizeInput && !lhInput) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (fontSizeInput) {
          const n = Number(fontSizeVal);
          if (fontSizeVal && !isNaN(n) && n >= 1 && n <= 200) editor.tf.addMarks({ fontSize: `${n}px` });
          setFontSizeInput(false);
        }
        if (lhInput) {
          const n = Number(lhVal);
          if (lhVal && !isNaN(n) && n >= 0.5 && n <= 5) setLineHeight(editor, n);
          setLhInput(false);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setFontSizeInput(false);
        setLhInput(false);
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        if (fontSizeInput) setFontSizeVal((p) => p.slice(0, -1));
        if (lhInput) setLhVal((p) => p.slice(0, -1));
        return;
      }
      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        if (fontSizeInput) setFontSizeVal((p) => p + e.key);
        if (lhInput) setLhVal((p) => p + e.key);
        return;
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [fontSizeInput, lhInput, fontSizeVal, lhVal, editor]);

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
      <TBtn square onClick={() => editor.undo()} disabled={!canUndo} tooltip={`${t("editor.undo")}\n${kb("⌘Z")}`}>
        <Undo2 size={14} />
      </TBtn>
      <TBtn square onClick={() => editor.redo()} disabled={!canRedo} tooltip={`${t("editor.redo")}\n${kb("⌘⇧Z")}`}>
        <Redo2 size={14} />
      </TBtn>
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

      {/* Text formatting */}
      <TBtn active={hasMark("bold")} onClick={() => editor.tf.toggleMark("bold")} tooltip={`${t("editor.bold")}\n${kb("⌘B")}`}>B</TBtn>
      <TBtn active={hasMark("italic")} onClick={() => editor.tf.toggleMark("italic")} style={{ fontStyle: "italic" }} tooltip={`${t("editor.italic")}\n${kb("⌘I")}`}>I</TBtn>
      <TBtn active={hasMark("underline")} onClick={() => editor.tf.toggleMark("underline")} style={{ textDecoration: "underline" }} tooltip={`${t("editor.underline")}\n${kb("⌘U")}`}>U</TBtn>
      <TBtn active={hasMark("strikethrough")} onClick={() => editor.tf.toggleMark("strikethrough")} style={{ textDecoration: "line-through" }} tooltip={t("editor.strikethrough")}>S</TBtn>
      <TBtn active={hasMark("code")} onClick={() => editor.tf.toggleMark("code")} tooltip={`${t("editor.inlineCode")}\n${kb("⌘E")}`}>{"<>"}</TBtn>
      <TBtn active={hasMark("kbd")} onClick={() => editor.tf.toggleMark("kbd")} tooltip="Kbd">
        <span style={{ fontSize: 9, padding: "1px 3px", border: "var(--border-light)", borderRadius: 3 }}>⌘</span>
      </TBtn>
      <div className={styles.divider} />

      {/* Superscript / Subscript */}
      <TBtn active={hasMark("superscript")} onClick={() => editor.tf.toggleMark("superscript")} tooltip={t("editor.superscript")}>x²</TBtn>
      <TBtn active={hasMark("subscript")} onClick={() => editor.tf.toggleMark("subscript")} tooltip={t("editor.subscript")}>x₂</TBtn>
      <div className={styles.divider} />

      {/* Font family — 검색 가능 드롭다운 */}
      <EditorFontPicker
        value={currentFontFamily || ""}
        preferEn={preferEn}
        onChange={(val, googleName) => {
          if (val) {
            if (googleName) loadGoogleFont(googleName);
            editor.tf.addMarks({ fontFamily: val });
          } else {
            editor.tf.removeMarks(["fontFamily"]);
          }
          setTimeout(() => editor.tf.focus(), 0);
        }}
      />

      {/* Font size */}
      <div className={styles.selectWrap}>
        {fontSizeInput ? (
          <div
            className={`${styles.fontSelect} ${styles.fontSizeSelect} ${styles.toolbarInlineInput}`}
          >
            {fontSizeVal || <span style={{ opacity: 0.4 }}>px</span>}
            <span className={styles.inlineCursor} />
          </div>
        ) : (
          <select
            className={`${styles.fontSelect} ${styles.fontSizeSelect}`}
            value={currentFontSizeNum}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__custom__") {
                setFontSizeVal(currentFontSizeNum || "");
                setFontSizeInput(true);
                return;
              }
              if (val) editor.tf.addMarks({ fontSize: `${val}px` });
              else editor.tf.removeMarks(["fontSize"]);
              setTimeout(() => editor.tf.focus(), 0);
            }}
          >
            {!currentFontSizeNum && <option value="">{t("editor.fontSize")}</option>}
            {currentFontSizeNum && !FONT_SIZE_PRESETS.includes(Number(currentFontSizeNum)) && (
              <option value={currentFontSizeNum}>{currentFontSizeNum}px</option>
            )}
            {FONT_SIZE_PRESETS.map((s) => <option key={s} value={String(s)}>{s}px</option>)}
            <option value="__custom__">{t("editor.customInput")}</option>
          </select>
        )}
      </div>

      {/* Line height */}
      <div className={styles.selectWrap}>
        {lhInput ? (
          <div
            className={`${styles.fontSelect} ${styles.lhSelect} ${styles.toolbarInlineInput}`}
          >
            {lhVal || <span style={{ opacity: 0.4 }}>1.6</span>}
            <span className={styles.inlineCursor} />
          </div>
        ) : (
          <select
            className={`${styles.fontSelect} ${styles.lhSelect}`}
            value={currentLineHeight}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__custom__") {
                setLhVal(currentLineHeight || "");
                setLhInput(true);
                return;
              }
              setLineHeight(editor, val ? Number(val) : 0);
              setTimeout(() => editor.tf.focus(), 0);
            }}
          >
            {!currentLineHeight && <option value="">{t("editor.lineHeight")}</option>}
            {currentLineHeight && !LINE_HEIGHT_PRESETS.includes(currentLineHeight) && (
              <option value={currentLineHeight}>{currentLineHeight}</option>
            )}
            {LINE_HEIGHT_PRESETS.map((v) => <option key={v} value={v}>{v}</option>)}
            <option value="__custom__">{t("editor.customInput")}</option>
          </select>
        )}
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
          <TBtn square key={align} active={currentAlign === align} onClick={() => setAlign(editor, align)} tooltip={alignLabels[align]}>
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
            <span style={{ width: 12, height: 3, borderRadius: "var(--radius-capsule)", background: currentColor || "var(--text-primary)", boxShadow: "inset 0 0 0 0.5px var(--text-muted)" }} />
          </span>
        </TBtn>
        <TBtn
          active={colorMode === "bg"}
          onClick={() => setColorMode(colorMode === "bg" ? null : "bg")}
          tooltip={t("editor.bgColor")}
        >
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 11 }}>BG</span>
            <span style={{
              width: 12, height: 3, borderRadius: "var(--radius-capsule)",
              background: currentBgColor || "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 4px 4px",
              boxShadow: "inset 0 0 0 0.5px var(--text-muted)",
            }} />
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
                <ColorPicker value={activeColor || "#000000"} onChange={(c) => apply(c.oklch)} triggerClassName={styles.colorInput} />
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
      <TBtn square active={isTodo} onClick={() => {
        const entry = editor.api.block();
        if (!entry) return;
        const [node, path] = entry;
        const el = node as Record<string, unknown>;
        if (Object.hasOwn(el, "checked")) {
          // todo → 일반 블록
          editor.tf.unsetNodes(["checked", "listStyleType"], { at: path });
        } else {
          // 기존 리스트(disc/decimal 등)면 먼저 해제
          if (el.listStyleType && el.listStyleType !== "todo") {
            editor.tf.unsetNodes(["listStyleType", "indent"], { at: path });
          }
          editor.tf.setNodes({ checked: false, listStyleType: "todo" }, { at: path });
        }
      }} tooltip={t("editor.todoList")}>
        <SquareCheck size={14} strokeWidth={1.5} />
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
      <TBtn onClick={onAddFile} tooltip={t("editor.insertFile")}>File</TBtn>
      <TBtn onClick={onAddAudio} tooltip={t("editor.insertAudio")}>Audio</TBtn>
      <TBtn active={blockType === "table"} onClick={() => { editor.tf.withMerging(() => { insertTable(editor, { colCount: 3, rowCount: 3, header: true }); }); }} tooltip={t("editor.insertTable")}>Table</TBtn>
      {([2, 3, 4] as const).map((cols) => (
        <TBtn
          square
          key={cols}
          tooltip={`${cols}${t("editor.columns")}`}
          onClick={() => {
            // 현재 커서가 column_group 안에 있으면 열 개수 변경
            try {
              const colGroupEntry = editor.api.above({ match: { type: "column_group" } });
              if (colGroupEntry) {
                const [groupNode, groupPath] = colGroupEntry;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const currentChildren = (groupNode as any).children || [];
                const currentCount = currentChildren.length;
                if (currentCount === cols) return; // 같으면 무시
                editor.tf.withoutNormalizing(() => {
                  if (cols > currentCount) {
                    for (let i = currentCount; i < cols; i++) {
                      const w = i < cols - 1 ? Math.floor(100 / cols) : 100 - Math.floor(100 / cols) * (cols - 1);
                      editor.tf.insertNodes(
                        { type: "column", width: `${w}%`, children: [{ type: "p", children: [{ text: "" }] }] },
                        { at: [...groupPath, i] }
                      );
                    }
                  } else {
                    for (let i = currentCount - 1; i >= cols; i--) {
                      editor.tf.removeNodes({ at: [...groupPath, i] });
                    }
                  }
                  for (let i = 0; i < cols; i++) {
                    const w = i < cols - 1 ? Math.floor(100 / cols) : 100 - Math.floor(100 / cols) * (cols - 1);
                    editor.tf.setNodes({ width: `${w}%` }, { at: [...groupPath, i] });
                  }
                });
                return;
              }
            } catch { /* ignore */ }
            // 새 열블록 삽입
            const colChildren = Array.from({ length: cols }, (_, i) => ({
              type: "column",
              width: `${i < cols - 1 ? Math.floor(100 / cols) : 100 - Math.floor(100 / cols) * (cols - 1)}%`,
              children: [{ type: "p", children: [{ text: "" }] }],
            }));
            const node = { type: "column_group", children: colChildren };
            const sel = editor.selection;
            const insertAt = sel ? [sel.anchor.path[0] + 1] : [editor.children.length];
            editor.tf.insertNodes(node, { at: insertAt });
            setTimeout(() => editor.tf.focus(), 0);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            {cols === 2 && <><rect x="1" y="2" width="6" height="12" rx="1" /><rect x="9" y="2" width="6" height="12" rx="1" /></>}
            {cols === 3 && <><rect x="0.5" y="2" width="4" height="12" rx="1" /><rect x="6" y="2" width="4" height="12" rx="1" /><rect x="11.5" y="2" width="4" height="12" rx="1" /></>}
            {cols === 4 && <><rect x="0.5" y="2" width="3" height="12" rx="0.5" /><rect x="4.5" y="2" width="3" height="12" rx="0.5" /><rect x="8.5" y="2" width="3" height="12" rx="0.5" /><rect x="12.5" y="2" width="3" height="12" rx="0.5" /></>}
          </svg>
        </TBtn>
      ))}
      <TBtn onClick={() => editor.tf.insertNodes({ type: "hr", children: [{ text: "" }] })} tooltip={t("editor.insertHr")}>HR</TBtn>
      <TBtn
        square
        onClick={() => {
          const node = { type: "callout", bg: "var(--bg-tertiary)", icon: "💡", children: [{ type: "p", children: [{ text: "" }] }] };
          const sel = editor.selection;
          const insertAt = sel ? [sel.anchor.path[0] + 1] : [editor.children.length];
          editor.tf.insertNodes(node, { at: insertAt });
          setTimeout(() => editor.tf.focus(), 0);
        }}
        tooltip={t("editor.insertCallout")}
      >
        <MessageSquareQuote size={14} />
      </TBtn>
      <TBtn
        square
        onClick={() => {
          const node = {
            type: "toggle", open: true,
            children: [
              { type: "p", children: [{ text: "" }] },
              { type: "p", children: [{ text: "" }] },
            ],
          };
          const sel = editor.selection;
          const insertAt = sel ? [sel.anchor.path[0] + 1] : [editor.children.length];
          editor.tf.insertNodes(node, { at: insertAt });
          setTimeout(() => {
            editor.tf.select({ anchor: { path: [...insertAt, 0, 0], offset: 0 }, focus: { path: [...insertAt, 0, 0], offset: 0 } });
            editor.tf.focus();
          }, 0);
        }}
        tooltip={t("editor.insertToggle")}
      >
        <ChevronRight size={14} />
      </TBtn>
      <TBtn
        active={showEmbedInput}
        onClick={onToggleEmbedInput}
        tooltip={`${t("editor.insertEmbed")}\nYouTube · Spotify · X`}
      >
        Embed
      </TBtn>
      <TBtn active={mathEditing} tooltip={t("editor.insertMath")} onClick={onInsertMath}>∑</TBtn>
      <TBtn square tooltip={language === "ko" ? "각주" : "Footnote"} onClick={() => {
        // 현재 각주 번호 계산
        const existing = Array.from(editor.api.nodes({
          at: [],
          match: (n: Record<string, unknown>) => n.type === "footnote_ref",
        }));
        const nextId = String(existing.length + 1);
        // 커서 위치에 참조 삽입
        editor.tf.insertNodes({
          type: "footnote_ref",
          footnoteId: nextId,
          children: [{ text: "" }],
        }, { at: editor.selection ?? undefined });
        // void 뒤로 커서 이동
        editor.tf.move({ unit: "offset" });
        // 문서 끝에 각주 내용 블록 추가
        const lastPath = [editor.children.length];
        editor.tf.insertNodes({
          type: "footnote_content",
          footnoteId: nextId,
          children: [{ text: language === "ko" ? "각주 내용" : "Footnote text" }],
        }, { at: lastPath });
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20"/><text x="9" y="15" fontSize="10" fill="currentColor" stroke="none" fontFamily="serif">1</text></svg>
      </TBtn>
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
