"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
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
  /** 보조 메타 (날짜·카테고리 등) */
  getMeta?: (item: T) => string;
  /** 썸네일 URL */
  getThumb?: (item: T) => string | undefined;
  /** 항목별 상태 라벨 (예: 초안) — 칩에 표시 */
  getStatus?: (item: T) => "draft" | "published" | undefined;
  /** 트리거 placeholder (검색 X, 단순 안내 텍스트) */
  searchPlaceholder?: string;
  /** 검색 input placeholder (dropdown 안에서) */
  searchInputPlaceholder?: string;
  emptyText?: string;
  noResultsText?: string;
}

/**
 * 다중 선택 picker (dropdown 방식).
 * - 칩 영역(선택된 항목) + 트리거 버튼 + 드롭다운(미선택 항목 목록)
 * - 검색 없음 — 사용자는 dropdown 에서 클릭으로 선택
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
  searchInputPlaceholder,
  emptyText,
  noResultsText,
}: RelationPickerProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  /** 미선택 항목 + 검색 필터 (title + meta) */
  const candidates = useMemo(() => {
    const base = items.filter((it) => !selectedIds.includes(getId(it)));
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((it) => {
      const hay = `${getTitle(it)} ${getMeta?.(it) ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, selectedIds, query, getId, getTitle, getMeta]);

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

  // 드롭다운 열릴 때 검색창 포커스, 닫힐 때 query 초기화
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

  const add = (id: string) => {
    if (selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
    setQuery("");
  };

  const remove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
  };

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={`${styles.inputArea} ${open ? styles.inputAreaOpen : ""}`}>
        <div className={styles.inputAreaTop}>
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
          {/* 트리거 = 검색창. 닫힘: placeholder "관련글 연결" 표시 + chevron / 열림: 검색 input 으로 동작 + Search 아이콘 */}
          <div className={styles.trigger} onClick={() => { setOpen(true); searchRef.current?.focus(); }}>
            {open && (
              <Search size={14} strokeWidth={1.8} className={styles.triggerIcon} aria-hidden />
            )}
            <input
              ref={searchRef}
              type="text"
              className={styles.triggerInput}
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
              placeholder={open
                ? (searchInputPlaceholder || "Search...")
                : (selected.length === 0
                    ? (searchPlaceholder || "Select...")
                    : (candidates.length === 0 ? (noResultsText || "No more items") : (searchPlaceholder || "+ Add")))}
              aria-expanded={open}
              aria-haspopup="listbox"
              readOnly={!open && candidates.length === 0 && selected.length > 0}
            />
            {!open && (
              <ChevronDown size={14} strokeWidth={2} className={styles.triggerArrow} />
            )}
          </div>
        </div>

        {/* 항상 렌더 — 닫힘 시 CSS 로 숨김. 열림 시 radius transition 먼저, 그 후 expand */}
        <div className={styles.inputAreaExpand} role="listbox" aria-hidden={!open}>
          <div className={styles.dropdownList}>
            {candidates.length === 0 ? (
              <div className={styles.noResults}>{noResultsText || "No matches"}</div>
            ) : (
              candidates.map((it) => {
                const id = getId(it);
                const status = getStatus?.(it);
                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    className={styles.option}
                    onClick={() => add(id)}
                    tabIndex={open ? 0 : -1}
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
        </div>
      </div>

      {selected.length === 0 && !open && emptyText && (
        <p className={styles.empty}>{emptyText}</p>
      )}
    </div>
  );
}
