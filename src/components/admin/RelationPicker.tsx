"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import styles from "./RelationPicker.module.css";

interface RelationPickerProps<T> {
  /** 선택 가능한 전체 항목 */
  items: T[];
  /** 현재 선택된 ID 목록 */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** 항목에서 ID 추출 */
  getId: (item: T) => string;
  /** 항목 표시명 */
  getTitle: (item: T) => string;
  /** 보조 메타 (날짜·카테고리 등) — 검색에도 포함 */
  getMeta?: (item: T) => string;
  /** 썸네일 URL */
  getThumb?: (item: T) => string | undefined;
  /** 항목별 상태 라벨 (예: 초안) — 칩에 표시 */
  getStatus?: (item: T) => "draft" | "published" | undefined;
  searchPlaceholder?: string;
  emptyText?: string;
  noResultsText?: string;
}

/**
 * Notion-style 다중 선택 picker.
 * - 칩 영역(선택된 항목) + 검색 입력 + 드롭다운(추가 가능 항목)
 * - 검색은 title + meta 기준 ilike-style (대소문자 무시)
 * - 키보드: 입력 중 ↓/↑ 로 드롭다운 항목 이동, Enter로 선택, Backspace 로 마지막 칩 제거
 */
export default function RelationPicker<T>({
  items,
  selectedIds,
  onChange,
  getId,
  getTitle,
  getMeta,
  getThumb,
  getStatus,
  searchPlaceholder,
  emptyText,
  noResultsText,
}: RelationPickerProps<T>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** id로 빠르게 lookup */
  const itemMap = useMemo(() => {
    const m = new Map<string, T>();
    for (const it of items) m.set(getId(it), it);
    return m;
  }, [items, getId]);

  const selected = useMemo(
    () => selectedIds.map((id) => itemMap.get(id)).filter((x): x is T => !!x),
    [selectedIds, itemMap],
  );

  /** 미선택 항목 + 검색 필터 */
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((it) => !selectedIds.includes(getId(it)))
      .filter((it) => {
        if (!q) return true;
        const hay = `${getTitle(it)} ${getMeta?.(it) ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
  }, [items, selectedIds, query, getId, getTitle, getMeta]);

  // activeIdx 가 후보 범위 벗어나지 않게 보정
  useEffect(() => {
    if (activeIdx >= candidates.length) setActiveIdx(0);
  }, [activeIdx, candidates.length]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const add = (id: string) => {
    if (selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
    setQuery("");
    setActiveIdx(0);
    inputRef.current?.focus();
  };

  const remove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, candidates.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && candidates[activeIdx]) {
        e.preventDefault();
        add(getId(candidates[activeIdx]));
      }
    } else if (e.key === "Backspace" && !query && selectedIds.length > 0) {
      remove(selectedIds[selectedIds.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.inputArea} onClick={() => inputRef.current?.focus()}>
        {selected.map((it) => {
          const id = getId(it);
          const status = getStatus?.(it);
          return (
            <span key={id} className={`${styles.chip} ${status === "draft" ? styles.chipDraft : ""}`}>
              {getThumb?.(it) && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={getThumb(it)} alt="" className={styles.chipThumb} />
              )}
              <span className={styles.chipLabel}>{getTitle(it)}</span>
              <button
                type="button"
                className={styles.chipRemove}
                onClick={(e) => { e.stopPropagation(); remove(id); }}
                aria-label="Remove"
              >
                ✕
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? (searchPlaceholder || "Search...") : ""}
        />
      </div>

      {selected.length === 0 && !open && emptyText && (
        <p className={styles.empty}>{emptyText}</p>
      )}

      {open && (
        <div className={styles.dropdown}>
          {candidates.length === 0 ? (
            <div className={styles.noResults}>{noResultsText || "No matches"}</div>
          ) : (
            candidates.slice(0, 30).map((it, idx) => {
              const id = getId(it);
              const status = getStatus?.(it);
              return (
                <button
                  key={id}
                  type="button"
                  className={`${styles.option} ${idx === activeIdx ? styles.optionActive : ""}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => add(id)}
                >
                  {getThumb?.(it) && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={getThumb(it)} alt="" className={styles.optionThumb} />
                  )}
                  <span className={styles.optionTitle}>{getTitle(it)}</span>
                  {getMeta && (
                    <span className={styles.optionMeta}>{getMeta(it)}</span>
                  )}
                  {status === "draft" && (
                    <span className={styles.statusDraft}>Draft</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
