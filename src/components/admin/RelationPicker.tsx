"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { ChevronRight, GripVertical, ImageIcon, Search } from "@/components/icons";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";
import CloseButton from "@/components/ui/CloseButton";
import styles from "./RelationPicker.module.css";
import Pressable from "@/components/ui/Pressable";

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
  /** 입력창 닫힘 시 안내 placeholder (예: "관련글 연결") */
  searchPlaceholder?: string;
  /** 검색 input placeholder (열림 시) */
  searchInputPlaceholder?: string;
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
  noResultsText,
}: RelationPickerProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [thumbErrors, setThumbErrors] = useState<Set<string>>(new Set());
  // 드래그 정렬 — drag 중인 chip 의 id 와 hover 중인 chip 의 id.
  // ref 는 closure 우회용 (drop handler 에서 stale state 회피)
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const markThumbError = (id: string) =>
    setThumbErrors((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

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
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);
  const openChanged = useDepsChanged([open]);
  if (openChanged && !open) setQuery("");

  const add = (id: string) => {
    if (selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
    setQuery("");
  };

  const remove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
  };

  // 닫힘 시 안내 — 후보 0 일 때만 noResultsText (선택 가능 없음을 명시), 그 외엔 단순 "+" 안내
  const closedPlaceholder = candidates.length === 0 && selected.length > 0
    ? (noResultsText || "No more items")
    : (searchPlaceholder || "+ Add");

  return (
    <div ref={wrapRef} className={styles.wrap}>
      {/* 입력 영역 — chip 없이 검색 input 만 (selected 는 아래 chipRow 에 별도 표시) */}
      <div className={`${styles.inputArea} ${open ? styles.inputAreaOpen : ""}`}>
        <div className={styles.inputAreaTop}>
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
              placeholder={open ? (searchInputPlaceholder || "Search...") : closedPlaceholder}
              aria-haspopup="listbox"
              readOnly={!open && candidates.length === 0 && selected.length > 0}
            />
            <Pressable
              className={`${styles.triggerArrow} ${open ? styles.triggerArrowOpen : ""}`}
              onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
              aria-label={open ? "Close" : "Open"}
              aria-expanded={open}
              tabIndex={-1}
            >
              <ChevronRight size={14} strokeWidth={2} />
            </Pressable>
          </div>
        </div>

        {/* 항상 렌더 — 닫힘 시 CSS 로 숨김. 열림 시 radius transition 먼저, 그 후 expand */}
        <div className={styles.inputAreaExpand} role="listbox" aria-hidden={!open} data-lenis-prevent>
          <div className={styles.dropdownList}>
            {candidates.length === 0 ? (
              <div className={styles.noResults}>{noResultsText || "No matches"}</div>
            ) : (
              candidates.map((it, idx) => {
                const id = getId(it);
                const status = getStatus?.(it);
                const thumb = getThumb?.(it);
                const thumbBroken = !!thumb && thumbErrors.has(`opt:${id}`);
                return (
                  <Pressable
                    key={id}
                    role="option"
                    aria-selected="false"
                    className={styles.option}
                    onClick={() => add(id)}
                    tabIndex={open ? 0 : -1}
                  >
                    <span className={styles.optionIndex}>#{idx + 1}</span>
                    {thumb && !thumbBroken ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={thumb}
                        alt=""
                        className={styles.optionThumb}
                        onError={() => markThumbError(`opt:${id}`)}
                      />
                    ) : thumb ? (
                      <span className={styles.optionThumbPlaceholder} aria-hidden>
                        <ImageIcon size={14} strokeWidth={1.5} />
                      </span>
                    ) : null}
                    <span className={styles.optionTitle}>
                      <span className={styles.optionTitleText}>{getTitle(it)}</span>
                      {status === "draft" && (
                        <span className={styles.statusDraft}>Draft</span>
                      )}
                    </span>
                    {getMeta && (
                      <span className={styles.optionMeta}>{getMeta(it)}</span>
                    )}
                  </Pressable>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 선택된 항목 — input 과 별도 row 로 표시. 좌측 grip 핸들로 드래그 정렬 가능.
          motion.span + layout prop 으로 순서 변경 시 FLIP 애니메이션 자동 적용 */}
      {selected.length > 0 && (
        <LayoutGroup>
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.6 }}
            className={styles.chipRow}
          >
            <AnimatePresence initial={false}>
            {selected.map((it, idx) => {
              const id = getId(it);
              const status = getStatus?.(it);
              const thumb = getThumb?.(it);
              const thumbBroken = !!thumb && thumbErrors.has(`chip:${id}`);
              const chipIndex = idx + 1;
              const isDragging = dragId === id;
              // 삽입 위치 = drag 방향에 따라 target chip 의 왼쪽 / 오른쪽
              // dragIdx > targetIdx → 우→좌 이동, target 앞에 삽입 → 왼쪽 indicator
              // dragIdx < targetIdx → 좌→우 이동, target 뒤에 삽입 → 오른쪽 indicator
              const dragIdx = dragId ? selectedIds.indexOf(dragId) : -1;
              const targetIdx = selectedIds.indexOf(id);
              const showInsertBefore = dragOverId === id && dragId !== null && dragId !== id && dragIdx > targetIdx;
              const showInsertAfter = dragOverId === id && dragId !== null && dragId !== id && dragIdx < targetIdx;
              return (
                <motion.span
                  key={id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.6 }}
                  className={`${styles.chip} ${status === "draft" ? styles.chipDraft : ""} ${isDragging ? styles.chipDragging : ""} ${showInsertBefore ? styles.chipInsertBefore : ""} ${showInsertAfter ? styles.chipInsertAfter : ""}`}
                  // pointer-based drag 가 좌표에서 chip 찾을 때 사용
                  data-chip-id={id}
                >
                  <span
                    className={styles.chipHandle}
                    // pointer 기반 드래그 — HTML5 drag-and-drop 의 long-press 요구 / 양방향 비대칭 등 회피.
                    // pointerdown 시점부터 document 레벨로 move/up 추적해 즉시 드래그 시작
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const sourceId = id;
                      dragIdRef.current = sourceId;
                      setDragId(sourceId);
                      let lastTargetId: string | null = null;

                      const onMove = (ev: PointerEvent) => {
                        const elem = document.elementFromPoint(ev.clientX, ev.clientY);
                        const chipEl = elem?.closest("[data-chip-id]") as HTMLElement | null;
                        const tId = chipEl?.getAttribute("data-chip-id") ?? null;
                        if (tId && tId !== sourceId && tId !== lastTargetId) {
                          lastTargetId = tId;
                          setDragOverId(tId);
                        }
                      };

                      const onUp = (ev: PointerEvent) => {
                        document.removeEventListener("pointermove", onMove);
                        document.removeEventListener("pointerup", onUp);
                        document.removeEventListener("pointercancel", onUp);
                        dragIdRef.current = null;
                        setDragId(null);
                        setDragOverId(null);
                        // pointerup 좌표에서 target 찾기 — lastTargetId fallback
                        const elem = document.elementFromPoint(ev.clientX, ev.clientY);
                        const chipEl = elem?.closest("[data-chip-id]") as HTMLElement | null;
                        const to = chipEl?.getAttribute("data-chip-id") ?? lastTargetId;
                        if (!to || to === sourceId) return;
                        const next = [...selectedIds];
                        const fromIdx = next.indexOf(sourceId);
                        const toIdx = next.indexOf(to);
                        if (fromIdx < 0 || toIdx < 0) return;
                        next.splice(fromIdx, 1);
                        next.splice(toIdx, 0, sourceId);
                        onChange(next);
                      };

                      document.addEventListener("pointermove", onMove);
                      document.addEventListener("pointerup", onUp);
                      document.addEventListener("pointercancel", onUp);
                    }}
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                    data-cursor="grab"
                  >
                    <GripVertical size={12} strokeWidth={1.8} />
                  </span>
                  <span className={styles.chipIndex}>#{chipIndex}</span>
                  {thumb && !thumbBroken ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumb}
                      alt=""
                      className={styles.chipThumb}
                      onError={() => markThumbError(`chip:${id}`)}
                    />
                  ) : thumb ? (
                    <span className={styles.chipThumbPlaceholder} aria-hidden>
                      <ImageIcon size={10} strokeWidth={1.6} />
                    </span>
                  ) : null}
                  <span className={styles.chipLabel}>
                    <span className={styles.chipLabelText}>{getTitle(it)}</span>
                    {status === "draft" && (
                      <span className={styles.statusDraft}>Draft</span>
                    )}
                  </span>
                  <CloseButton
                    size="sm"
                    className={styles.chipRemove}
                    onClick={(e) => { e.stopPropagation(); remove(id); }}
                    ariaLabel="Remove"
                  />
                </motion.span>
              );
            })}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      )}

    </div>
  );
}
