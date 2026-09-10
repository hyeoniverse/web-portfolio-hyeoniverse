"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, Shuffle, ChevronLeft, ChevronRight } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Tooltip from "@/components/ui/Tooltip";
import { EMOJI_CATEGORIES, ICON_CATEGORIES, EMOJI_KEYWORDS, iconSvgInner } from "../emojiData";
import { EMOJI_KO } from "../emojiKo";
import { emojiMeta } from "./emojiMeta";
import { resizeEmojiImage } from "./resizeEmojiImage";
import { UploadTab } from "./UploadTab";
import { EmojiIcon } from "./EmojiIcon";
import styles from "./EmojiPicker.module.css";
import Pressable from "@/components/ui/Pressable";
import { usePortalContainer } from "@/components/ui/portalContainer";

export { EmojiIcon } from "./EmojiIcon";

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  /** 현재 선택된 값 (제거 버튼 표시 여부) */
  currentValue?: string;
  /** 이미지를 영구 저장소에 업로드하는 함수 */
  onImageUpload?: (file: File) => Promise<string>;
  /** 트리거 요소 rect 반환 함수. 지정 시 body 로 portal + fixed 로 그 아래에 렌더(에디터 stacking/overflow 탈출,
   *  뒤 요소 클릭 통과 방지) + 스크롤 따라 위치 갱신. 미지정 시 부모 기준 absolute(legacy). */
  getAnchorRect?: () => DOMRect | null;
}

const STORAGE_KEY = "custom-emojis";
const RECENT_KEY = "recent-emojis";
const MAX_RECENT = 24;

export default function EmojiPicker({ open, onClose, onSelect, currentValue, onImageUpload, getAnchorRect }: EmojiPickerProps) {
  const { language } = useLanguage();
  /* 모달 안에서 열렸으면 모달이 자기 portal layer 를 여기로 내려 준다. 밖이면 null. */
  const portalContainer = usePortalContainer();
  const ref = useRef<HTMLDivElement>(null);
  // portal 모드 위치 (getAnchorRect 지정 시) — 열림/스크롤/리사이즈마다 갱신
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open || !getAnchorRect) return;
    const W = 340, H = 420, gap = 6;
    const compute = () => {
      const r = getAnchorRect();
      if (!r) return;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8));
      let top = r.bottom + gap;
      if (top + H > window.innerHeight - 8) top = Math.max(8, r.top - H - gap); // 아래 공간 부족 시 위로
      setPos({ top, left });
    };
    compute();
    const onScroll = () => compute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, getAnchorRect]);
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

  // 커스텀(업로드) 이모지 — 서버(custom_emojis) 동기화, localStorage 는 오프라인 캐시/즉시표시용.
  type CustomEmoji = { id?: string; name: string; src: string };
  const [customs, setCustoms] = useState<CustomEmoji[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const cacheCustoms = useCallback((list: CustomEmoji[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* quota/disabled */ }
  }, []);

  // 열릴 때 서버 목록으로 동기화 (실패 시 로컬 캐시 유지 — 오프라인/비로그인).
  //   ── 보완: 서버에 아직 없는 로컬 업로드(동기화 기능 추가 전 업로드분·POST 실패분)를 보존/재등록 ──
  //   과거엔 서버 목록으로 통째로 교체(+캐시 덮어쓰기)해서 그런 항목이 커스텀 섹션에서 사라지고
  //   최근사용에만 남아 삭제가 불가능했음. 이제 로컬 캐시 + 최근사용(img:) 에서 서버에 없는 src 를 모아
  //   지금 서버에 백필(POST)하고, 실패해도 로컬로 병합해 커스텀 섹션에 노출(삭제 가능)한다.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/custom-emojis");
        if (!res.ok) return; // 비로그인/오프라인 → 로컬 캐시 유지
        const rows = (await res.json()) as CustomEmoji[];
        if (cancelled || !Array.isArray(rows)) return;

        const serverSrcs = new Set(rows.map((r) => r.src));
        // 로컬 캐시 + 최근사용(img:) 에서 서버에 없는 src 수집 (state 대신 localStorage 직접 읽어 deps 회피)
        const readLS = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
        const localCache = readLS<CustomEmoji>(STORAGE_KEY);
        const recentImgSrcs = readLS<string>(RECENT_KEY).filter((v) => typeof v === "string" && v.startsWith("img:")).map((v) => v.slice(4));
        const seenPending = new Set<string>();
        const pending: CustomEmoji[] = [];
        for (const c of localCache) {
          if (c?.src && !serverSrcs.has(c.src) && !seenPending.has(c.src)) { seenPending.add(c.src); pending.push({ name: c.name || "", src: c.src }); }
        }
        for (const src of recentImgSrcs) {
          if (src && !serverSrcs.has(src) && !seenPending.has(src)) { seenPending.add(src); pending.push({ name: "", src }); }
        }

        // 백필 — 서버에 없는 것들을 지금 등록. 성공 시 id 부여, 실패해도 로컬 항목으로 유지.
        const reconciled: CustomEmoji[] = [];
        for (const p of pending) {
          try {
            const r = await fetch("/api/custom-emojis", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: p.name, src: p.src }),
            });
            reconciled.push(r.ok ? ((await r.json()) as CustomEmoji) : p);
          } catch { reconciled.push(p); }
        }
        if (cancelled) return;

        // 병합 — 방금 백필분(최신) + 서버 목록, src 중복 제거
        const seen = new Set<string>();
        const merged = [...reconciled, ...rows].filter((c) => {
          if (!c?.src || seen.has(c.src)) return false;
          seen.add(c.src);
          return true;
        });
        setCustoms(merged);
        cacheCustoms(merged);
      } catch { /* 네트워크 실패 → 캐시 유지 */ }
    })();
    return () => { cancelled = true; };
  }, [open, cacheCustoms]);

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

  // 바깥 클릭 — 닫기만 하고 그 클릭이 뒤 요소까지 활성화되지 않게 capture 단계에서 차단(modal 처럼)
  useEffect(() => {
    if (!open) return;
    let closing = false;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closing = true;
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (closing) {
        e.preventDefault();
        e.stopPropagation();
        closing = false;
      }
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [open, onClose]);

  // 파일 드래그 중 페이지(브라우저 native autoscroll) 차단 — window dragover/drop preventDefault
  useEffect(() => {
    if (!open || !onImageUpload) return;
    const prevent = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, [open, onImageUpload]);

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

  // 이모지 메타(emoji-mart 영어 이름·키워드) — lazy 메모이즈
  const META = useMemo(() => emojiMeta(), []);
  // 검색 대상 텍스트: 영어 이름·키워드(색/모양/종류) + 한국어 키워드 + 자체 키워드
  const searchText = useCallback((e: string) => {
    const m = META[e];
    const ko = EMOJI_KO[e];
    return [m?.name, m?.kw, EMOJI_KEYWORDS[e], ko?.n, ko?.k].filter(Boolean).join(" ").toLowerCase();
  }, [META]);
  // 이모지 이름 (툴팁) — 한국어면 한국어 이름 우선
  const emojiName = useCallback((e: string) => {
    const ko = EMOJI_KO[e];
    const en = META[e]?.name;
    return language === "ko" ? (ko?.n || en || "") : (en || ko?.n || "");
  }, [META, language]);

  // 검색 필터 (이름 + 키워드(영/한) + 카테고리명 + 이모지 자체)
  const filteredEmojis = useMemo(() => {
    if (!query) return EMOJI_CATEGORIES;
    const q = query.toLowerCase();
    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter((e) => {
        if (searchText(e).includes(q)) return true;
        if (cat.label.ko.includes(q) || cat.label.en.toLowerCase().includes(q)) return true;
        return e.includes(query);
      }),
    })).filter((cat) => cat.emojis.length > 0);
  }, [query, searchText]);
  // 검색 시 결과 있는 카테고리만 활성 (카테고리바는 계속 표시)
  const activeEmojiCats = useMemo(() => new Set(filteredEmojis.map((c) => c.id)), [filteredEmojis]);

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
  const activeIconCats = useMemo(() => new Set(filteredIconCats.map((c) => c.id)), [filteredIconCats]);

  // 업로드
  const handleUpload = useCallback(async (file: File) => {
    if (!onImageUpload) return;
    setUploadError("");
    setUploading(true);
    try {
      const resized = await resizeEmojiImage(file);
      const url = await onImageUpload(resized);
      const name = file.name.replace(/\.\w+$/, "");
      // 서버에 기록 추가 (동기화). 실패해도 로컬로 표시는 유지.
      let entry: CustomEmoji = { name, src: url };
      try {
        const res = await fetch("/api/custom-emojis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, src: url }),
        });
        if (res.ok) entry = (await res.json()) as CustomEmoji;
      } catch { /* 서버 실패 → 로컬만 */ }
      setCustoms((prev) => {
        const next = [entry, ...prev]; // 최신 업로드가 앞에
        cacheCustoms(next);
        return next;
      });
      handleSelect(`img:${url}`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }, [onImageUpload, handleSelect, cacheCustoms]);

  if (!open) return null;

  const t = (ko: string, en: string) => language === "ko" ? ko : en;

  // 커스텀(업로드) 아이콘 기록 삭제 — 서버 + state + 캐시 + 최근사용
  const removeCustom = (idx: number) => {
    const target = customs[idx];
    setCustoms((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      cacheCustoms(next);
      return next;
    });
    // 최근사용에서도 같은 이미지 제거 — 삭제 후 깨진 이미지가 남거나, 동기화 시 다시 백필돼 되살아나는 것 방지
    if (target?.src) {
      const val = `img:${target.src}`;
      setRecent((prev) => {
        const next = prev.filter((v) => v !== val);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* noop */ }
        return next;
      });
    }
    if (target?.id) fetch(`/api/custom-emojis/${target.id}`, { method: "DELETE" }).catch(() => { /* noop */ });
  };

  const EmojiBtn = ({ val, onDelete }: { val: string; onDelete?: () => void }) => {
    const btn = (
      <Pressable
        className={`${styles.cell} ${styles.emojiCell}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleSelect(val)}
      >
        <EmojiIcon value={val} size={22} />
      </Pressable>
    );
    // 커스텀 이미지(img:)는 이름 없음 → 그대로. 이모지는 이름 툴팁.
    const name = val.startsWith("img:") ? "" : emojiName(val);
    const inner = name ? <Tooltip content={name} placement="top" delay={300}>{btn}</Tooltip> : btn;
    if (!onDelete) return inner;
    // 삭제 가능(커스텀) — hover 시 × 노출
    return (
      <span className={styles.emojiCellWrap}>
        {inner}
        <Pressable
          className={styles.emojiDelBtn}
          aria-label={t("삭제", "Delete")}
          title={t("기록에서 삭제", "Remove from history")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >×</Pressable>
      </span>
    );
  };

  const node = (
    <div
      ref={ref}
      contentEditable={false}
      className={`${styles.picker} ${getAnchorRect ? styles.fixed : styles.absolute}`}
      style={getAnchorRect ? { left: pos?.left ?? -9999, top: pos?.top ?? -9999 } : undefined}
      onMouseDown={(e) => {
        e.stopPropagation(); // 뒤 에디터로 클릭 전파 차단 (겹친 요소 동시 클릭 방지)
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
      }}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      data-lenis-prevent
      data-emoji-picker
    >
      {/* 탭 헤더 */}
      <div className={styles.tabHeader}>
        {([
          { id: "emoji" as const, label: t("이모지", "Emoji") },
          { id: "icon" as const, label: t("아이콘", "Icon") },
          { id: "upload" as const, label: t("업로드", "Upload") },
        ]).map((tb) => (
          <Pressable
            key={tb.id}
            type="button"
            data-tab={tb.id}
            className={`${styles.tab} ${tab === tb.id ? styles.active : ""}`}
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
          </Pressable>
        ))}
        {/* 제거 — 우상단 */}
        {currentValue && (
          <Pressable
            className={styles.removeBtn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onSelect(""); onClose(); }}
          >
            {t("제거", "Remove")}
          </Pressable>
        )}
        {/* 슬라이딩 indicator */}
        <div data-indicator ref={indicatorRef} className={styles.indicator} />
      </div>

      {/* 이모지 / 아이콘 탭 */}
      {(tab === "emoji" || tab === "icon") && (
        <>
          {/* 검색 + 셔플 */}
          <div className={styles.searchRow}>
            <div className={styles.searchBox}>
              <Search size={14} stroke="var(--text-muted)" />
              <input
                type="text"
                className={styles.searchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("필터", "Filter")}
              />
              {query && (
                <Pressable className={styles.clearBtn}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery("")}>×</Pressable>
              )}
            </div>
            {/* 셔플 버튼 (랜덤 1개 바로 적용) */}
            <Pressable
              className={styles.shuffleBtn}
              onMouseDown={(e) => e.preventDefault()}
              onClick={doShuffle}
              title={t("랜덤", "Random")}
            >
              <Shuffle size={14} />
            </Pressable>
          </div>

          {/* 그리드 */}
          <div ref={gridRef} className={styles.grid} data-lenis-prevent>
            {tab === "emoji" && (
              <>
                {/* 최근 사용 */}
                {!query && recent.length > 0 && (
                  <div>
                    <div className={styles.sectionLabel}>{t("최근 사용", "Recent")}</div>
                    <div className={styles.itemRow}>
                      {recent.map((em, i) => <EmojiBtn key={`r-${i}`} val={em} />)}
                    </div>
                  </div>
                )}
                {/* 커스텀 이모지 */}
                {!query && customs.length > 0 && (
                  <div>
                    <div className={styles.sectionLabel}>{t("커스텀", "Custom")}</div>
                    <div className={styles.itemRow}>
                      {customs.map((c, i) => <EmojiBtn key={`c-${i}`} val={`img:${c.src}`} onDelete={() => removeCustom(i)} />)}
                    </div>
                  </div>
                )}
                {/* 카테고리별 */}
                {filteredEmojis.map((cat) => (
                  <div key={cat.id} data-cat={cat.id}>
                    <div className={styles.sectionLabel}>{language === "ko" ? cat.label.ko : cat.label.en}</div>
                    <div className={styles.itemRow}>
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
                    <div className={styles.sectionLabel}>{language === "ko" ? cat.label.ko : cat.label.en}</div>
                    <div className={styles.itemRow}>
                      {cat.icons.map((ic) => (
                        <Tooltip key={ic.id} content={ic.label} placement="top" delay={300}>
                          <Pressable
                            className={`${styles.cell} ${styles.iconCell}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(`icon:${ic.id}`)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              dangerouslySetInnerHTML={{ __html: iconSvgInner(ic) }} />
                          </Pressable>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* 하단 카테고리 바 (이모지 탭) — 검색 중에도 표시, 결과 있는 카테고리만 활성 */}
          {tab === "emoji" && (
            <div className={styles.catBar}>
              {EMOJI_CATEGORIES.map((cat) => {
                const active = activeEmojiCats.has(cat.id);
                return (
                  <Tooltip key={cat.id} content={language === "ko" ? cat.label.ko : cat.label.en} placement="top" delay={200}>
                    <Pressable
                      className={`${styles.catBtn} ${active ? "" : styles.inactive}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { if (active) scrollToCategory(cat.id); }}
                    >
                      {cat.emojis[0]}
                    </Pressable>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* 하단 카테고리 바 (아이콘 탭) — 좌우 스크롤. 검색 중에도 표시 */}
          {tab === "icon" && (() => {
            const iconBarRef = React.createRef<HTMLDivElement>();
            const scroll = (dir: number) => {
              iconBarRef.current?.scrollBy({ left: dir * 80, behavior: "smooth" });
            };
            return (
              <div className={styles.catBarScroll}>
                <Pressable
                  className={styles.scrollBtn}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => scroll(-1)}
                ><ChevronLeft size={12} /></Pressable>
                <div ref={iconBarRef} className={styles.catScrollInner}>
                  {ICON_CATEGORIES.map((cat) => {
                    const active = activeIconCats.has(cat.id);
                    return (
                    <Tooltip key={cat.id} content={language === "ko" ? cat.label.ko : cat.label.en} placement="top" delay={200}>
                      <Pressable
                        className={`${styles.catBtn} ${styles.catBtnIcon} ${active ? "" : styles.inactive}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { if (active) scrollToCategory(cat.id, "icon"); }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          dangerouslySetInnerHTML={{ __html: iconSvgInner(cat.icons[0]) }} />
                      </Pressable>
                    </Tooltip>
                    );
                  })}
                </div>
                <Pressable
                  className={styles.scrollBtn}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => scroll(1)}
                ><ChevronRight size={12} /></Pressable>
              </div>
            );
          })()}
        </>
      )}

      {/* 업로드 탭 */}
      {tab === "upload" && (
        <UploadTab
          uploading={uploading}
          uploadError={uploadError}
          onImageUpload={onImageUpload}
          onUpload={handleUpload}
          t={t}
        />
      )}
    </div>
  );

  /* 모달 안에서 열면 모달이 넘겨주는 portal layer 로, 밖이면 body 로 보낸다.
     Popover·Select·Tooltip 이 쓰는 통로와 같다. 이렇게 해야 z 를 최상단으로 올리지 않고도
     모달 위에 뜬다 — 최상단으로 올리면 이번엔 전역 nav 를 덮는다. */
  return getAnchorRect ? createPortal(node, portalContainer ?? document.body) : node;
}
