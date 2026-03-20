"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import Tooltip from "@/components/ui/Tooltip";
import { EMOJI_CATEGORIES, SVG_ICONS, ICON_CATEGORIES, EMOJI_KEYWORDS } from "./emojiData";

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  /** 현재 선택된 값 (제거 버튼 표시 여부) */
  currentValue?: string;
  /** 이미지를 영구 저장소에 업로드하는 함수 */
  onImageUpload?: (file: File) => Promise<string>;
}

const STORAGE_KEY = "custom-emojis";
const RECENT_KEY = "recent-emojis";
const MAX_RECENT = 24;

// 이미지 크기 제한
const EMOJI_MIN = 16;
const EMOJI_MAX = 256;
const EMOJI_RECOMMENDED = 128;

function resizeEmojiImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      if (width < EMOJI_MIN || height < EMOJI_MIN) {
        reject(new Error(`최소 ${EMOJI_MIN}×${EMOJI_MIN}px`));
        return;
      }
      if (width > EMOJI_MAX || height > EMOJI_MAX) {
        const scale = EMOJI_RECOMMENDED / Math.max(width, height);
        const w = Math.round(width * scale);
        const h = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("리사이즈 실패")); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".png"), { type: "image/png" }));
        }, "image/png");
      } else {
        resolve(file);
      }
    };
    img.onerror = () => reject(new Error("잘못된 이미지"));
    img.src = URL.createObjectURL(file);
  });
}

export default function EmojiPicker({ open, onClose, onSelect, currentValue, onImageUpload }: EmojiPickerProps) {
  const { language } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"emoji" | "icon" | "upload">("emoji");
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // 최근 사용
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });

  // 커스텀 이모지
  const [customs, setCustoms] = useState<{ name: string; src: string }[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });

  const addRecent = useCallback((val: string) => {
    setRecent((prev) => {
      const next = [val, ...prev.filter((v) => v !== val)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleSelect = useCallback((val: string) => {
    addRecent(val);
    onSelect(val);
    onClose();
  }, [addRecent, onSelect, onClose]);

  // 바깥 클릭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // 열릴 때 초기화
  useEffect(() => {
    if (open) { setQuery(""); setUploadError(""); }
  }, [open]);

  // 탭 변경 시 indicator 위치 갱신
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const el = indicatorRef.current;
      const activeBtn = el?.parentElement?.querySelector(`[data-tab="${tab}"]`) as HTMLElement;
      if (el && activeBtn) {
        el.style.left = `${activeBtn.offsetLeft}px`;
        el.style.width = `${activeBtn.offsetWidth}px`;
        el.style.opacity = "1";
      }
    });
  }, [tab, open]);

  // 검색 필터 (키워드 + 카테고리명 + 이모지 자체)
  const filteredEmojis = useMemo(() => {
    if (!query) return EMOJI_CATEGORIES;
    const q = query.toLowerCase();
    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter((e) => {
        const kw = EMOJI_KEYWORDS[e];
        if (kw && kw.toLowerCase().includes(q)) return true;
        if (cat.label.ko.includes(q) || cat.label.en.toLowerCase().includes(q)) return true;
        return e.includes(query);
      }),
    })).filter((cat) => cat.emojis.length > 0);
  }, [query]);

  // 셔플 — 랜덤 1개 바로 적용
  const doShuffle = useCallback(() => {
    const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    const picked = all[Math.floor(Math.random() * all.length)];
    handleSelect(picked);
  }, [handleSelect]);

  // 카테고리 스크롤 이동
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollToCategory = useCallback((catId: string, type: "emoji" | "icon" = "emoji") => {
    const attr = type === "icon" ? `data-icon-cat` : `data-cat`;
    const el = gridRef.current?.querySelector(`[${attr}="${catId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const filteredIconCats = useMemo(() => {
    if (!query) return ICON_CATEGORIES;
    const q = query.toLowerCase();
    return ICON_CATEGORIES.map((cat) => ({
      ...cat,
      icons: cat.icons.filter((ic) =>
        ic.label.toLowerCase().includes(q) ||
        ic.id.toLowerCase().includes(q) ||
        (ic.kw && ic.kw.toLowerCase().includes(q)) ||
        cat.label.en.toLowerCase().includes(q) ||
        cat.label.ko.includes(q)
      ),
    })).filter((cat) => cat.icons.length > 0);
  }, [query]);

  // 업로드
  const handleUpload = useCallback(async (file: File) => {
    if (!onImageUpload) return;
    setUploadError("");
    setUploading(true);
    try {
      const resized = await resizeEmojiImage(file);
      const url = await onImageUpload(resized);
      const entry = { name: file.name.replace(/\.\w+$/, ""), src: url };
      setCustoms((prev) => {
        const next = [...prev, entry];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      handleSelect(`img:${url}`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }, [onImageUpload, handleSelect]);

  if (!open) return null;

  const t = (ko: string, en: string) => language === "ko" ? ko : en;

  const EmojiBtn = ({ val }: { val: string }) => (
    <button
      type="button"
      style={{
        width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, border: "none", cursor: "pointer", borderRadius: "50%",
        background: "transparent", padding: 0,
      }}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      onClick={() => handleSelect(val)}
    >
      <EmojiIcon value={val} size={22} />
    </button>
  );

  return (
    <div
      ref={ref}
      contentEditable={false}
      onMouseDown={(e) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
      }}
      onWheel={(e) => e.stopPropagation()}
      data-lenis-prevent
      style={{
        position: "absolute", top: -4, left: 40, zIndex: 10,
        width: 340,
        background: "var(--bg-primary)",
        border: "1px solid var(--border-light-color)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column",
        maxHeight: 420,
        overflow: "hidden",
      }}
    >
      {/* 탭 헤더 */}
      <div style={{
        display: "flex", alignItems: "center",
        borderBottom: "1px solid var(--border-light-color)",
        padding: "0 4px",
        flexShrink: 0,
        position: "relative",
      }}>
        {([
          { id: "emoji" as const, label: t("이모지", "Emoji") },
          { id: "icon" as const, label: t("아이콘", "Icon") },
          { id: "upload" as const, label: t("업로드", "Upload") },
        ]).map((tb) => (
          <button
            key={tb.id}
            type="button"
            data-tab={tb.id}
            style={{
              padding: "8px 12px", border: "none", cursor: "pointer",
              background: "transparent",
              color: tab === tb.id ? "var(--text-primary)" : "var(--text-muted)",
              fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 500,
              borderBottom: "2px solid transparent",
              marginBottom: -1,
              transition: "color 0.15s",
            }}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={(e) => {
              const ind = indicatorRef.current;
              if (ind) {
                ind.style.left = `${e.currentTarget.offsetLeft}px`;
                ind.style.width = `${e.currentTarget.offsetWidth}px`;
                // 현재 탭이 아닌 곳에 hover해도 opacity 유지
              }
            }}
            onMouseLeave={() => {
              const ind = indicatorRef.current;
              const activeBtn = ind?.parentElement?.querySelector(`[data-tab="${tab}"]`) as HTMLElement;
              if (ind && activeBtn) {
                ind.style.left = `${activeBtn.offsetLeft}px`;
                ind.style.width = `${activeBtn.offsetWidth}px`;
                ind.style.opacity = "1";
              }
            }}
            onClick={() => setTab(tb.id)}
          >
            {tb.label}
          </button>
        ))}
        {/* 제거 — 우상단 */}
        {currentValue && (
          <button
            type="button"
            style={{
              marginLeft: "auto", padding: "4px 8px", border: "none", cursor: "pointer",
              background: "transparent", color: "var(--color-error, #e05252)",
              fontFamily: "var(--font-space-grotesk)", fontSize: 11, fontWeight: 500,
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onSelect(""); onClose(); }}
          >
            {t("제거", "Remove")}
          </button>
        )}
        {/* 슬라이딩 indicator */}
        <div
          data-indicator
          ref={indicatorRef}
          style={{
            position: "absolute", bottom: 0, height: 2,
            background: "var(--text-primary)",
            borderRadius: 1,
            transition: "left 0.2s ease-out, width 0.2s ease-out, opacity 0.15s",
          }}
        />
      </div>

      {/* 이모지 / 아이콘 탭 */}
      {(tab === "emoji" || tab === "icon") && (
        <>
          {/* 검색 + 셔플 */}
          <div style={{ padding: "8px 10px 4px", flexShrink: 0, display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 6,
              border: "1px solid var(--border-light-color)", borderRadius: "var(--radius-capsule)",
              padding: "5px 10px",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("필터", "Filter")}
                style={{
                  flex: 1, border: "none", outline: "none", background: "transparent",
                  fontFamily: "var(--font-space-grotesk)", fontSize: 13, color: "var(--text-primary)",
                }}
              />
              {query && (
                <button type="button" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, padding: 0 }}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery("")}>×</button>
              )}
            </div>
            {/* 셔플 버튼 (랜덤 1개 바로 적용) */}
            <button
              type="button"
              style={{
                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid var(--border-light-color)", borderRadius: "var(--radius-sm)",
                background: "transparent", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0,
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={doShuffle}
              title={t("랜덤", "Random")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>

          {/* 그리드 */}
          <div ref={gridRef} style={{ flex: 1, overflowY: "auto", padding: "4px 8px 8px", scrollbarWidth: "thin" }} data-lenis-prevent>
            {tab === "emoji" && (
              <>
                {/* 최근 사용 */}
                {!query && recent.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: "6px 4px 2px", fontFamily: "var(--font-space-grotesk)" }}>
                      {t("최근 사용", "Recent")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {recent.map((em, i) => <EmojiBtn key={`r-${i}`} val={em} />)}
                    </div>
                  </div>
                )}
                {/* 커스텀 이모지 */}
                {!query && customs.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: "6px 4px 2px", fontFamily: "var(--font-space-grotesk)" }}>
                      {t("커스텀", "Custom")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {customs.map((c, i) => <EmojiBtn key={`c-${i}`} val={`img:${c.src}`} />)}
                    </div>
                  </div>
                )}
                {/* 카테고리별 */}
                {filteredEmojis.map((cat) => (
                  <div key={cat.id} data-cat={cat.id}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: "6px 4px 2px", fontFamily: "var(--font-space-grotesk)" }}>
                      {language === "ko" ? cat.label.ko : cat.label.en}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {cat.emojis.map((em) => <EmojiBtn key={em} val={em} />)}
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === "icon" && (
              <>
                {filteredIconCats.map((cat) => (
                  <div key={cat.id} data-icon-cat={cat.id}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: "6px 4px 2px", fontFamily: "var(--font-space-grotesk)" }}>
                      {language === "ko" ? cat.label.ko : cat.label.en}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {cat.icons.map((ic) => (
                        <Tooltip key={ic.id} content={ic.label} placement="top" delay={300}>
                          <button
                            type="button"
                            style={{
                              width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                              border: "none", cursor: "pointer", borderRadius: "50%",
                              background: "transparent", padding: 0, color: "var(--text-primary)",
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            onClick={() => handleSelect(`icon:${ic.id}`)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d={ic.path} />
                            </svg>
                          </button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* 하단 카테고리 바 (이모지 탭) */}
          {tab === "emoji" && !query && (
            <div style={{
              display: "flex", justifyContent: "center", gap: 2, padding: "4px 6px",
              borderTop: "1px solid var(--border-light-color)", flexShrink: 0,
            }}>
              {EMOJI_CATEGORIES.map((cat) => (
                <Tooltip key={cat.id} content={language === "ko" ? cat.label.ko : cat.label.en} placement="top" delay={200}>
                  <button
                    type="button"
                    style={{
                      width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, border: "none", cursor: "pointer", borderRadius: "50%",
                      background: "transparent", padding: 0,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    onClick={() => scrollToCategory(cat.id)}
                  >
                    {cat.emojis[0]}
                  </button>
                </Tooltip>
              ))}
            </div>
          )}

          {/* 하단 카테고리 바 (아이콘 탭) — 좌우 스크롤 */}
          {tab === "icon" && !query && (() => {
            const iconBarRef = React.createRef<HTMLDivElement>();
            const scroll = (dir: number) => {
              iconBarRef.current?.scrollBy({ left: dir * 80, behavior: "smooth" });
            };
            return (
              <div style={{
                display: "flex", alignItems: "center",
                borderTop: "1px solid var(--border-light-color)", flexShrink: 0,
              }}>
                <button
                  type="button"
                  style={{
                    width: 20, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                    border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)",
                    flexShrink: 0, fontSize: 12,
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                  onClick={() => scroll(-1)}
                ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
                <div
                  ref={iconBarRef}
                  style={{
                    flex: 1, display: "flex", gap: 2, padding: "4px 2px",
                    overflowX: "auto", scrollbarWidth: "none",
                  }}
                >
                  {ICON_CATEGORIES.map((cat) => (
                    <Tooltip key={cat.id} content={language === "ko" ? cat.label.ko : cat.label.en} placement="top" delay={200}>
                      <button
                        type="button"
                        style={{
                          width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                          border: "none", cursor: "pointer", borderRadius: "50%",
                          background: "transparent", padding: 0, color: "var(--text-muted)", flexShrink: 0,
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        onClick={() => scrollToCategory(cat.id, "icon")}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={cat.icons[0].path} />
                        </svg>
                      </button>
                    </Tooltip>
                  ))}
                </div>
                <button
                  type="button"
                  style={{
                    width: 20, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                    border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)",
                    flexShrink: 0, fontSize: 12,
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                  onClick={() => scroll(1)}
                ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
              </div>
            );
          })()}
        </>
      )}

      {/* 업로드 탭 */}
      {tab === "upload" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 16px 12px", gap: 8 }}>
          <button
            type="button"
            disabled={uploading || !onImageUpload}
            style={{
              width: "100%", padding: "18px 16px",
              border: "1px solid var(--border-light-color)", borderRadius: "var(--radius-md)",
              background: "var(--bg-tertiary)", cursor: uploading ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              color: "var(--text-secondary)", fontSize: 13, fontFamily: "var(--font-space-grotesk)",
              opacity: uploading ? 0.5 : 1,
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
            {uploading ? t("업로드 중...", "Uploading...") : t("이미지 업로드", "Upload Image")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await handleUpload(file);
              e.target.value = "";
            }}
          />
          <span style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.4 }}>
            {t(
              `권장 ${EMOJI_RECOMMENDED}×${EMOJI_RECOMMENDED}px · 최소 ${EMOJI_MIN} · 최대 ${EMOJI_MAX}px`,
              `${EMOJI_RECOMMENDED}×${EMOJI_RECOMMENDED}px recommended · ${EMOJI_MIN}–${EMOJI_MAX}px`
            )}
            <br />
            {t("또는 ⌘+V로 이미지나 링크를 붙여넣으세요.", "Or paste image/link with ⌘+V.")}
          </span>
          {uploadError && (
            <span style={{ fontSize: 11, color: "var(--color-error, #e05252)", textAlign: "center" }}>{uploadError}</span>
          )}
          {/* 취소 / 저장 */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: 4 }}>
            <button
              type="button"
              style={{
                border: "none", background: "transparent", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 13, fontFamily: "var(--font-space-grotesk)",
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClose}
            >
              {t("취소", "Cancel")}
            </button>
            {currentValue && (
              <button
                type="button"
                style={{
                  border: "none", background: "transparent", cursor: "pointer",
                  color: "var(--color-error, #e05252)", fontSize: 13, fontFamily: "var(--font-space-grotesk)",
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onSelect(""); onClose(); }}
              >
                {t("제거", "Remove")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 이모지 값(native / img:url / icon:id)을 렌더링 */
export function EmojiIcon({ value, size = 20 }: { value: string; size?: number }) {
  if (value.startsWith("img:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value.slice(4)} alt="" style={{ width: size, height: size, objectFit: "contain", borderRadius: 2 }} />
    );
  }
  if (value.startsWith("icon:")) {
    const ic = SVG_ICONS.find((i) => i.id === value.slice(5));
    if (ic) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={ic.path} />
        </svg>
      );
    }
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{value}</span>;
}
