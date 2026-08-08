"use client";

import React, { useCallback, useEffect, useState } from "react";
import { setAlign, setLineHeight } from "@platejs/basic-styles";
import { insertTable } from "@platejs/table";
import { toggleCodeBlock } from "@platejs/code-block";
import { insertToc } from "@platejs/toc";
import { toggleList, someList, someTodoList } from "@platejs/list";
import { indent, outdent } from "@platejs/indent";
import { useLanguage } from "@/providers/LanguageProvider";
import Tooltip from "@/components/ui/Tooltip";
import Select from "@/components/ui/Select";
import ColorPicker from "@/components/ui/ColorPicker";
import FontPicker from "@/components/ui/FontPicker";
import { loadGoogleFont } from "@/lib/loadGoogleFont";
import TBtn from "../TBtn";
import { useRecentColors } from "../useRecentColors";
import { MessageSquareQuote, ChevronRight, Undo2, Redo2, SquareCheck, LayoutPanelTop, Vote, Shapes, SquareCode, Workflow, CalendarDays, ListTree, FileText, ColumnLayoutIcon, FootnoteIcon, Highlighter, Smile, Palette } from "@/components/icons";
import { genPollId } from "../PollElements";
import { DEFAULT_CALLOUT } from "../calloutTypes";
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
import { _imageUploadFn, _uploadErrorFn, _postLinkTrigger, _emojiPickerTrigger } from "../utils";
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
      size="sm"
      triggerClassName={styles.fontPickerSelect}
      dropdownClassName={styles.fontPickerDropdown}
      renderValue={renderValue}
      resolveMatch={(v) => resolveMatch(v)}
      toGoogleValue={(name) => `'${name}', sans-serif`}
    />
  );
}

const ALL_PRESETS = new Set([...BASE_COLORS, ...VIVID_COLORS, ...PASTEL_COLORS]);

export default React.memo(function MainToolbar({
  editor, isMac, postLang,
  showLinkInput, onToggleLinkInput,
  showEmbedInput, onToggleEmbedInput,
  onAddImage, onAddFile, onAddAudio, onInsertMath, mathEditing,
}: MainToolbarProps) {
  const { t, language } = useLanguage();
  const preferEn = language === "en" || postLang === "en";
  const [colorMode, setColorMode] = useState<"text" | "bg" | null>(null);
  // 색상 칩 삽입용 — 픽커에서 고른 hex 를 팝오버 닫힐 때 1회 삽입 (댓글 편집기와 동일 패턴).
  const [colorChipVal, setColorChipVal] = useState("#3b82f6");
  const colorChipPickedRef = React.useRef<string | null>(null);
  const colorChipWasOpenRef = React.useRef(false);
  // 최근색 — 공통 useRecentColors hook. 저장은 ColorPicker onChangeComplete(드래그 뗄 때)에서만.
  const recentTextColor = useRecentColors("text-mark");
  const recentBgColor = useRecentColors("bg-mark");

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
  // resolvedLineHeight 반환타입은 string 이지만, setLineHeight 가 숫자를 저장해 노드 lineHeight 가
  // 런타임엔 number(예: 1.6). 문자열 프리셋과 비교/렌더가 어긋나 중복 key 가 나므로 String 으로 정규화.
  const currentLineHeight = String(resolvedLineHeight(blockLineHeight, computed));

  // ── List active state ──
  let isUL = false, isOL = false, isTodo = false;
  try { isUL = someList(editor, "disc"); } catch { /* ignore */ }
  try { isOL = someList(editor, "decimal"); } catch { /* ignore */ }
  try { isTodo = someTodoList(editor); } catch { /* ignore */ }

  // ── Undo/Redo ──
  const canUndo = (editor.history?.undos?.length ?? 0) > 0;
  const canRedo = (editor.history?.redos?.length ?? 0) > 0;

  return (
    <div className={styles.toolbar} data-editor-toolbar>
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

      {/* Superscript / Subscript / Highlight */}
      <TBtn active={hasMark("superscript")} onClick={() => editor.tf.toggleMark("superscript")} tooltip={t("editor.superscript")}>x²</TBtn>
      <TBtn active={hasMark("subscript")} onClick={() => editor.tf.toggleMark("subscript")} tooltip={t("editor.subscript")}>x₂</TBtn>
      <TBtn active={hasMark("highlight")} onClick={() => editor.tf.toggleMark("highlight")} tooltip={t("editor.highlight")}>
        <Highlighter size={14} />
      </TBtn>

      {/* Color mode toggle + palette — 문자 서식 그룹 (글자색 A / 배경색 BG) */}
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
          const recentColors = colorMode === "bg" ? recentBgColor : recentTextColor;
          const apply = (color: string) => {
            if (colorMode === "text") editor.tf.addMarks({ color });
            else editor.tf.addMarks({ backgroundColor: color });
          };
          // 최근색 저장 — 프리셋 제외, commit(드래그 뗄 때) 시점에만
          const saveRecent = (color: string) => { if (!ALL_PRESETS.has(color)) recentColors.addColor(color); };
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
              {recentColors.colors.length > 0 && (
                <>
                  <div className={styles.divider} />
                  {recentColors.colors.map(dot)}
                </>
              )}
              {/* 컬러피커 */}
              <div className={styles.divider} />
              <div className={styles.colorGroup}>
                <div className={styles.colorIndicator} style={{ width: 14, height: 14, borderRadius: "50%", background: activeColor || "var(--bg-primary)", border: "1px solid var(--border-light-color)" }} />
                <ColorPicker value={activeColor || "#000000"} onChange={(c) => apply(c.oklch)} onChangeComplete={(c) => { apply(c.oklch); saveRecent(c.oklch); }} triggerClassName={styles.colorInput} />
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
      {/* 색상 칩 — #hex 를 인라인 code 로 삽입 → 리더에서 applyColorSwatches 가 색 스와치 칩으로 렌더 (댓글 편집기와 동일) */}
      <ColorPicker
        value={colorChipVal}
        defaultFormat="hex"
        onChange={(c) => { setColorChipVal(c.hex); colorChipPickedRef.current = c.hex; }}
      >
        {({ open, toggle }) => {
          if (open) {
            colorChipWasOpenRef.current = true;
          } else if (colorChipWasOpenRef.current) {
            colorChipWasOpenRef.current = false;
            const picked = colorChipPickedRef.current;
            colorChipPickedRef.current = null;
            // 렌더 중 부모 setState 금지 → microtask 로 미뤄 삽입
            if (picked) void Promise.resolve().then(() => {
              editor.tf.focus();
              // code 마크를 켠 상태로 hex 삽입 → 인라인 code(#hex)로 들어감. 이후 입력엔 안 이어지게 해제.
              editor.tf.addMarks({ code: true });
              editor.tf.insertText(picked);
              editor.tf.removeMarks(["code"]);
            });
          }
          return (
            <TBtn tooltip={language === "ko" ? "색상 칩 (#hex)" : "Color chip (#hex)"} onMouseDown={(e) => e.preventDefault()} onClick={toggle}>
              <Palette size={14} />
            </TBtn>
          );
        }}
      </ColorPicker>
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
      <Select
        value={currentFontSizeNum}
        options={[
          ...(currentFontSizeNum && !FONT_SIZE_PRESETS.includes(Number(currentFontSizeNum))
            ? [{ value: currentFontSizeNum, label: `${currentFontSizeNum}px` }]
            : []),
          ...FONT_SIZE_PRESETS.map((s) => ({ value: String(s), label: `${s}px` })),
        ]}
        onChange={(val) => {
          if (val) editor.tf.addMarks({ fontSize: `${val}px` });
          else editor.tf.removeMarks(["fontSize"]);
          setTimeout(() => editor.tf.focus(), 0);
        }}
        size="sm"
        width="max"
        preserveFocus
        placeholder={t("editor.fontSize")}
        editable
        editableInputProps={{ maxLength: 3, placeholder: "px", sanitize: (raw) => raw.replace(/[^0-9]/g, "") }}
      />

      {/* Line height */}
      <Select
        value={currentLineHeight}
        options={[
          ...(currentLineHeight && !LINE_HEIGHT_PRESETS.map(String).includes(currentLineHeight)
            ? [{ value: currentLineHeight, label: currentLineHeight }]
            : []),
          ...LINE_HEIGHT_PRESETS.map((v) => ({ value: String(v), label: String(v) })),
        ]}
        onChange={(val) => {
          setLineHeight(editor, Number(val) || 0);
          setTimeout(() => editor.tf.focus(), 0);
        }}
        size="sm"
        width="max"
        preserveFocus
        placeholder={t("editor.lineHeight")}
        editable
        editableInputProps={{ maxLength: 4, placeholder: "1.6", sanitize: (raw) => raw.replace(/[^0-9.]/g, "") }}
      />

      {/* Letter spacing */}
      <Select
        value={currentLetterSpacing || "0em"}
        options={[
          ...(currentLetterSpacing && !LETTER_SPACING_PRESETS.includes(currentLetterSpacing)
            ? [{ value: currentLetterSpacing, label: currentLetterSpacing }]
            : []),
          ...LETTER_SPACING_PRESETS.map((v) => ({ value: v, label: v })),
        ]}
        onChange={(val) => {
          const v = (val ?? "").trim();
          // 직접 입력은 숫자만 들어오므로 단위 없으면 em 을 붙임. 프리셋 선택은 이미 "0.05em" 형태.
          if (!v || v === "0" || v === "0em") editor.tf.removeMarks(["letterSpacing"]);
          else editor.tf.addMarks({ letterSpacing: /[a-z%]$/i.test(v) ? v : `${v}em` });
          setTimeout(() => editor.tf.focus(), 0);
        }}
        size="sm"
        width="max"
        preserveFocus
        placeholder={t("editor.letterSpacing")}
        editable
        editableInputProps={{ maxLength: 6, placeholder: "0em", sanitize: (raw) => raw.replace(/[^0-9.-]/g, "") }}
      />
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
      {/* 들여쓰기 — 문단 그룹 */}
      <TBtn onClick={() => indent(editor)} tooltip={`${t("editor.indent")} (Tab)`}>→|</TBtn>
      <TBtn onClick={() => outdent(editor)} tooltip={`${t("editor.outdent")} (Shift+Tab)`}>|←</TBtn>
      <div className={styles.divider} />

      {/* Headings */}
      <TBtn active={blockType === "h1"} onClick={() => editor.tf.toggleBlock("h1")} tooltip={`${t("editor.heading1")}\n${kb("⌘⌥1")}`}>H1</TBtn>
      <TBtn active={blockType === "h2"} onClick={() => editor.tf.toggleBlock("h2")} tooltip={`${t("editor.heading2")}\n${kb("⌘⌥2")}`}>H2</TBtn>
      <TBtn active={blockType === "h3"} onClick={() => editor.tf.toggleBlock("h3")} tooltip={`${t("editor.heading3")}\n${kb("⌘⌥3")}`}>H3</TBtn>
      <div className={styles.divider} />

      {/* Lists & blocks */}
      <Select
        value={isUL ? "disc" : ""}
        options={[
          { value: "disc", label: `● ${t("editor.ulDisc")}` },
          { value: "circle", label: `○ ${t("editor.ulCircle")}` },
          { value: "square", label: `■ ${t("editor.ulSquare")}` },
          { value: "'- '", label: `– ${t("editor.ulDash")}` },
          { value: "'✓ '", label: `✓ ${t("editor.ulCheck")}` },
          { value: "'→ '", label: `→ ${t("editor.ulArrow")}` },
          { value: "'★ '", label: `★ ${t("editor.ulStar")}` },
          { value: "disclosure-open", label: `▽ ${t("editor.ulTriOpen")}` },
          { value: "disclosure-closed", label: `▷ ${t("editor.ulTriClosed")}` },
        ]}
        onChange={(val) => { if (val) toggleList(editor, { listStyleType: val }); setTimeout(() => editor.tf.focus(), 0); }}
        size="sm"
        width="max"
        preserveFocus
        placeholder="● UL"
      />
      <Select
        value={isOL ? "decimal" : ""}
        options={[
          { value: "decimal", label: "1, 2, 3" },
          { value: "decimal-leading-zero", label: "01, 02, 03" },
          { value: "lower-alpha", label: "a, b, c" },
          { value: "upper-alpha", label: "A, B, C" },
          { value: "lower-roman", label: "i, ii, iii" },
          { value: "upper-roman", label: "I, II, III" },
          { value: "lower-greek", label: "α, β, γ" },
          { value: "korean-hangul-formal", label: "가, 나, 다" },
          { value: "cjk-ideographic", label: "一, 二, 三" },
        ]}
        onChange={(val) => { if (val) toggleList(editor, { listStyleType: val }); setTimeout(() => editor.tf.focus(), 0); }}
        size="sm"
        width="max"
        preserveFocus
        placeholder="1. OL"
      />
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

      {/* Insert */}
      <TBtn
        active={showLinkInput}
        onClick={onToggleLinkInput}
        tooltip={`${t("editor.insertLink")}\n${kb("⌘K")}`}
      >
        Link
      </TBtn>
      <TBtn onClick={onAddImage} tooltip={t("editor.insertImage")}>Image</TBtn>
      <TBtn onClick={() => {
        // 동영상 파일 업로드 → media_embed(video url) 삽입 (SlashMenu 와 동일)
        const fn = _imageUploadFn.current;
        if (!fn) return;
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "video/*";
        input.onchange = async () => {
          const f = input.files?.[0];
          if (!f) return;
          try { const url = await fn(f); if (url) editor.tf.insertNodes({ type: "media_embed", url, children: [{ text: "" }] }); } catch (err) { _uploadErrorFn.current?.(err); }
        };
        input.click();
      }} tooltip={t("editor.insertVideo")}>Video</TBtn>
      <TBtn onClick={onAddFile} tooltip={t("editor.insertFile")}>File</TBtn>
      <TBtn onClick={onAddAudio} tooltip={t("editor.insertAudio")}>Audio</TBtn>
      <div className={styles.divider} />
      {/* 삽입 · 구조 — 표/레이아웃/블록 */}
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
          <ColumnLayoutIcon cols={cols} />
        </TBtn>
      ))}
      <TBtn onClick={() => editor.tf.insertNodes({ type: "hr", children: [{ text: "" }] })} tooltip={t("editor.insertHr")}>HR</TBtn>
      <TBtn
        square
        onClick={() => {
          const node = { type: "callout", bg: DEFAULT_CALLOUT.bg, icon: DEFAULT_CALLOUT.icon, children: [{ type: "p", children: [{ text: "" }] }] };
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
        square
        tooltip={t("editor.insertTabs")}
        onClick={() => {
          const node = {
            type: "tabs", activeTab: 0,
            children: [
              { type: "tab_panel", label: "Tab 1", children: [{ type: "p", children: [{ text: "" }] }] },
              { type: "tab_panel", label: "Tab 2", children: [{ type: "p", children: [{ text: "" }] }] },
            ],
          };
          const sel = editor.selection;
          const insertAt = sel ? [sel.anchor.path[0] + 1] : [editor.children.length];
          editor.tf.insertNodes(node, { at: insertAt });
          setTimeout(() => editor.tf.focus(), 0);
        }}
      >
        <LayoutPanelTop size={14} />
      </TBtn>
      <div className={styles.divider} />
      {/* 삽입 · 기타 — 이모지/폴/캘린더/글링크/다이어그램/임베드/수식/각주 (아이콘 인서트 묶음) */}
      <TBtn square onClick={() => _emojiPickerTrigger.current?.()} tooltip={t("editor.insertEmoji")}><Smile size={14} /></TBtn>
      <TBtn
        square
        tooltip={t("editor.insertPoll")}
        onClick={() => {
          const node = {
            type: "poll", pollId: genPollId(), multiple: false,
            options: [
              { optionId: genPollId(), label: "항목 1" },
              { optionId: genPollId(), label: "항목 2" },
            ],
            children: [{ text: "" }],
          };
          const sel = editor.selection;
          const insertAt = sel ? [sel.anchor.path[0] + 1] : [editor.children.length];
          editor.tf.insertNodes(node, { at: insertAt });
          setTimeout(() => editor.tf.focus(), 0);
        }}
      >
        <Vote size={14} />
      </TBtn>
      <TBtn
        square
        tooltip={t("editor.insertCalendar")}
        onClick={() => {
          const sel = editor.selection;
          const insertAt = sel ? [sel.anchor.path[0] + 1] : [editor.children.length];
          editor.tf.insertNodes({ type: "calendar", children: [{ text: "" }] }, { at: insertAt });
          setTimeout(() => editor.tf.focus(), 0);
        }}
      >
        <CalendarDays size={14} />
      </TBtn>
      <TBtn
        square
        tooltip={t("editor.insertPostLink")}
        onClick={() => { _postLinkTrigger.current?.(); }}
      >
        <FileText size={14} />
      </TBtn>
      <TBtn
        square
        tooltip={t("editor.insertDiagram")}
        onClick={() => {
          const sel = editor.selection;
          const insertAt = sel ? [sel.anchor.path[0] + 1] : [editor.children.length];
          editor.tf.insertNodes({ type: "diagram", data: { nodes: [], edges: [] }, children: [{ text: "" }] }, { at: insertAt });
          setTimeout(() => editor.tf.focus(), 0);
        }}
      >
        <Shapes size={14} />
      </TBtn>
      <TBtn
        square
        tooltip={t("editor.mermaid")}
        onClick={() => {
          editor.tf.insertNodes({
            // graphView:"split" = "다이어그램을 직접 추가했다"는 의도 표시.
            // 이게 없으면(=코드블록에 mermaid 를 쓴 경우) 코드만 보인다.
            type: "code_block", lang: "mermaid", graphView: "split",
            children: [
              { type: "code_line", children: [{ text: "graph TD" }] },
              { type: "code_line", children: [{ text: "  A[Start] --> B[End]" }] },
            ],
          });
          setTimeout(() => editor.tf.focus(), 0);
        }}
      >
        <Workflow size={14} />
      </TBtn>
      <TBtn
        square
        tooltip={t("editor.insertPlayground")}
        onClick={() => {
          const sel = editor.selection;
          const insertAt = sel ? [sel.anchor.path[0] + 1] : [editor.children.length];
          editor.tf.insertNodes({ type: "playground", data: { template: "", files: {} }, children: [{ text: "" }] }, { at: insertAt });
          setTimeout(() => editor.tf.focus(), 0);
        }}
      >
        <SquareCode size={14} />
      </TBtn>
      <TBtn square tooltip={t("editor.toc")} onClick={() => { insertToc(editor); setTimeout(() => editor.tf.focus(), 0); }}>
        <ListTree size={14} />
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
        <FootnoteIcon />
      </TBtn>
    </div>
  );
});
