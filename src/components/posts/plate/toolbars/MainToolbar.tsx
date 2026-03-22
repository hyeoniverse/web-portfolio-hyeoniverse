"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { setAlign, setLineHeight } from "@platejs/basic-styles";
import { insertTable } from "@platejs/table";
import { toggleCodeBlock } from "@platejs/code-block";
import { toggleList, someList, someTodoList } from "@platejs/list";
import { indent, outdent } from "@platejs/indent";
import { useLanguage } from "@/providers/LanguageProvider";
import Tooltip from "@/components/ui/Tooltip";
import { loadGoogleFont, validateGoogleFont } from "@/lib/loadGoogleFont";
import TBtn from "../TBtn";
import { MessageSquareQuote, ChevronRight } from "lucide-react";
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
}

// ── Font Picker (검색 + Google Fonts) ──
function FontPicker({ value, onChange, preferEn }: { value: string; onChange: (val: string, googleName?: string) => void; preferEn?: boolean }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [googleResult, setGoogleResult] = useState<{ name: string; valid: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const listRef = useRef<HTMLDivElement>(null);

  // 검색어 변경 시 Google Fonts 검증 (debounce)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q || FONT_FAMILIES_FLAT.some((f) => f.label.toLowerCase().includes(q.toLowerCase()))) {
      setGoogleResult(null);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const valid = await validateGoogleFont(q);
      setGoogleResult({ name: q, valid });
      setLoading(false);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // value → 실제 매칭되는 font entry의 value (따옴표 차이 보정)
  const matchedValue = (() => {
    if (!value) return "";
    if (FONT_FAMILIES_FLAT.some((f) => f.value === value)) return value;
    const normalized = value.replace(/["']/g, "").split(",")[0].trim();
    const byName = FONT_FAMILIES_FLAT.find((f) => f.label.toLowerCase() === normalized.toLowerCase());
    return byName ? byName.value : "";
  })();

  const currentLabel = (() => {
    if (!value) return "Default";
    if (matchedValue) {
      const font = FONT_FAMILIES_FLAT.find((f) => f.value === matchedValue);
      return font ? font.label : "Default";
    }
    const normalized = value.replace(/["']/g, "").split(",")[0].trim();
    return normalized || "Default";
  })();

  // 영문 우선이면 영문 그룹을 한글 그룹 앞으로
  const orderedGroups = (() => {
    if (!preferEn) return FONT_GROUPS;
    const ko = ["Sans (한글)", "Serif (한글)", "Display (한글)"];
    const before = FONT_GROUPS.filter((g) => !ko.includes(g.group));
    const after = FONT_GROUPS.filter((g) => ko.includes(g.group));
    return [...before, ...after];
  })();

  const filtered = query.trim()
    ? orderedGroups.map((g) => ({
        ...g,
        fonts: g.fonts.filter((f) => f.label.toLowerCase().includes(query.toLowerCase())),
      })).filter((g) => g.fonts.length > 0)
    : orderedGroups;

  const [dropOffset, setDropOffset] = useState(0);
  const dropRef = useRef<HTMLDivElement>(null);

  // 열릴 때 현재 선택 항목 위치로 드롭다운 이동 (paint 전에 측정)
  useLayoutEffect(() => {
    if (!open) { setDropOffset(0); return; }
    const drop = dropRef.current;
    const list = listRef.current;
    if (!drop) return;
    const active = drop.querySelector("[data-active]") as HTMLElement | null;
    if (!active) { setDropOffset(0); return; }
    // 1. 스크롤로 활성 항목을 리스트 중앙에
    if (list) {
      const activeInList = active.offsetTop - list.offsetTop;
      list.scrollTop = Math.max(0, activeInList - list.clientHeight / 2 + active.offsetHeight / 2);
    }
    // 2. 스크롤 후 위치 측정
    const dropRect = drop.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    let offset = activeRect.top - dropRect.top;
    // 3. viewport 밖으로 나가지 않게 제한
    const wrapRect = wrapRef.current?.getBoundingClientRect();
    if (wrapRect) {
      offset = Math.min(offset, Math.max(0, wrapRect.top - 8));
      const dropBottom = wrapRect.top - offset + dropRect.height;
      if (dropBottom > window.innerHeight - 8) offset += dropBottom - (window.innerHeight - 8);
    }
    setDropOffset(Math.max(0, offset));
  }, [open]);

  const selectFont = (val: string, googleName?: string) => {
    onChange(val, googleName);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex", alignItems: "flex-start" }}>
      <div className={styles.selectWrap}>
        <button
          type="button"
          className={styles.fontSelect}
          style={{ width: 120, textAlign: "left", cursor: "pointer" }}
          onMouseDown={(e) => { e.preventDefault(); setOpen(!open); setTimeout(() => inputRef.current?.focus(), 30); }}
        >
          {currentLabel}
        </button>
      </div>
      {open && (
        <div ref={dropRef} style={{
          position: "absolute", top: -dropOffset, left: 0, zIndex: 100,
          width: 220,
          background: "rgba(255, 255, 255, 0.5)",
          WebkitBackdropFilter: "blur(4px)",
          backdropFilter: "blur(4px)",
          border: "1px solid var(--border-default-color, #c0c0c0)", borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          padding: "2px 0",
          fontFamily: "var(--font-space-grotesk)", fontSize: 13, color: "var(--text-primary)",
        }}>
          {/* 검색 입력 */}
          <div style={{ padding: "4px 8px", borderBottom: "1px solid var(--border-light-color)" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("editor.fontSearch")}
              style={{
                width: "100%", border: "none", outline: "none",
                fontSize: 13, fontFamily: "inherit",
                background: "transparent", color: "var(--text-primary)", padding: "2px 0",
              }}
            />
          </div>
          {/* 폰트 목록 */}
          <div ref={listRef} data-lenis-prevent style={{ maxHeight: 280, overflowY: "auto", padding: "4px 0" }}>
            {/* Default 옵션 */}
            {!query && (() => {
              const isDefault = !matchedValue && !value;
              return (
              <div
                onMouseDown={(e) => { e.preventDefault(); selectFont(""); }}
                {...(isDefault ? { "data-active": "" } : {})}
                style={{
                  padding: "2px 8px", cursor: "default",
                  background: isDefault ? "#1E90FF" : undefined,
                  color: isDefault ? "#fff" : undefined,
                  borderRadius: 8, margin: "1px 4px",
                }}
                onMouseEnter={(e) => { if (!isDefault) { e.currentTarget.style.background = "#1E90FF"; e.currentTarget.style.color = "#fff"; } }}
                onMouseLeave={(e) => { if (!isDefault) { e.currentTarget.style.background = ""; e.currentTarget.style.color = ""; } }}
              >
                {isDefault ? "✓ " : ""}Default
              </div>
              );
            })()}
            {filtered.map((g) => (
              <div key={g.group}>
                <div style={{ padding: "4px 8px 2px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{g.group}</div>
                {g.fonts.map((f) => {
                  const active = matchedValue === f.value;
                  return (
                  <div
                    key={f.value}
                    onMouseDown={(e) => { e.preventDefault(); selectFont(f.value, f.googleName); }}
                    {...(active ? { "data-active": "" } : {})}
                    style={{
                      padding: "2px 8px", cursor: "default",
                      fontFamily: f.value,
                      background: active ? "#1E90FF" : undefined,
                      color: active ? "#fff" : undefined,
                      borderRadius: 8, margin: "1px 4px",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) { e.currentTarget.style.background = "#1E90FF"; e.currentTarget.style.color = "#fff"; }
                      if (f.googleName) loadGoogleFont(f.googleName);
                    }}
                    onMouseLeave={(e) => {
                      if (!active) { e.currentTarget.style.background = ""; e.currentTarget.style.color = ""; }
                    }}
                  >
                    {active ? "✓ " : ""}{f.label}
                  </div>
                  );
                })}
              </div>
            ))}
            {/* Google Fonts 검색 결과 */}
            {query.trim() && !loading && googleResult && (
              <div style={{ borderTop: "1px solid var(--border-light-color)", padding: "2px 0" }}>
                <div style={{ padding: "4px 8px 2px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Google Fonts</div>
                {googleResult.valid ? (
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const name = googleResult.name;
                      selectFont(`'${name}', sans-serif`, name);
                    }}
                    onMouseEnter={(e) => { loadGoogleFont(googleResult.name); e.currentTarget.style.background = "#1E90FF"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = ""; }}
                    style={{ padding: "2px 8px", cursor: "default", fontFamily: `'${googleResult.name}', sans-serif`, borderRadius: 2 }}
                  >
                    {googleResult.name} ✓
                  </div>
                ) : (
                  <div style={{ padding: "2px 8px", color: "var(--text-muted)" }}>
                    &quot;{googleResult.name}&quot; {t("editor.fontNotFound")}
                  </div>
                )}
              </div>
            )}
            {query.trim() && loading && (
              <div style={{ padding: "4px 12px", fontSize: 10, color: "var(--text-muted)" }}>...</div>
            )}
            {query.trim() && filtered.length === 0 && !googleResult && !loading && (
              <div style={{ padding: "4px 12px", fontSize: 10, color: "var(--text-muted)" }}>{t("editor.fontNoResult")}</div>
            )}
          </div>
          {/* Google Fonts 새 창 열기 */}
          <div style={{ borderTop: "1px solid var(--border-light-color)", padding: "4px 8px" }}>
            <a
              href="https://fonts.google.com"
              target="_blank"
              rel="noopener noreferrer"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11, color: "var(--text-muted)", textDecoration: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Google Fonts
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

const MAX_RECENT = 5;
const ALL_PRESETS = new Set([...BASE_COLORS, ...VIVID_COLORS, ...PASTEL_COLORS]);

export default React.memo(function MainToolbar({
  editor, isMac, postLang,
  showLinkInput, onToggleLinkInput,
  showEmbedInput, onToggleEmbedInput,
  htmlMode, onToggleHtmlMode,
  onAddImage, onAddFile, onAddAudio, onInsertMath,
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
      <TBtn onClick={() => editor.undo()} disabled={!canUndo} tooltip={`${t("editor.undo")}\n${kb("⌘Z")}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 105.64-11.36L1 10" /></svg>
      </TBtn>
      <TBtn onClick={() => editor.redo()} disabled={!canRedo} tooltip={`${t("editor.redo")}\n${kb("⌘⇧Z")}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-5.64-11.36L23 10" /></svg>
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
      <FontPicker
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
      <TBtn onClick={onAddFile} tooltip={t("editor.insertFile")}>File</TBtn>
      <TBtn onClick={onAddAudio} tooltip={t("editor.insertAudio")}>Audio</TBtn>
      <TBtn onClick={() => { editor.tf.withMerging(() => { insertTable(editor, { colCount: 3, rowCount: 3, header: true }); }); }} tooltip={t("editor.insertTable")}>Table</TBtn>
      {([2, 3, 4] as const).map((cols) => (
        <TBtn
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
