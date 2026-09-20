"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { SEARCH_DEBOUNCE_MS, QUERY_PARAM } from "@/constants";
import type { SortDirection } from "@/types";
import { useSearchParams } from "next/navigation";
import { ChevronRight, GripVertical, Trash2, Plus } from "@/components/icons";
import { motion, LayoutGroup } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import type { BilingualCategory } from "@/types/common";
import type { Series } from "@/types/post";
import T from "@/components/ui/T";
import StatusBadge from "@/components/ui/StatusBadge/StatusBadge";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SegmentedControl from "@/components/ui/SegmentedControl";
import EditableRowNumber from "@/components/admin/AdminTable/EditableRowNumber";
import { Filter, ChevronDown } from "@/components/icons";
import { AnimatePresence } from "framer-motion";
import SeriesInlineEditor, { type SeriesInlineEditorHandle } from "./SeriesInlineEditor";
import { Switch } from "@/components/ui/Switch";
import SeriesDeleteModal from "./SeriesDeleteModal";
import Checkbox from "@/components/ui/Checkbox";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { subTableStyles as subTable } from "@/components/admin/SubTable/SubTable";
import { fillTemplate } from "@/utils/format";
import { sendAction, sendActions } from "@/lib/sendAction";
import styles from "./SeriesManager.module.css";
import shared from "../Settings.module.css";
import Pressable from "@/components/ui/Pressable";

/* ── SeriesManager ── */

interface SeriesManagerProps {
  categories: BilingualCategory[];
  /** 섹션 타이틀 — 헤더 row 에 SearchCapsule 과 같은 라인으로 표시 */
  title?: string;
}

const PAGE_SIZE = 5;

export default function SeriesManager({ categories, title }: SeriesManagerProps) {
  const { t } = useLanguage();
  const { openModal, closeAll } = useModalStore();
  const searchParams = useSearchParams();
  const targetSeriesId = searchParams.get(QUERY_PARAM.series);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const closingTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [page, setPage] = useState(0);
  /* 일괄 처리용 선택 — 카드마다 체크박스, 쪽/조건이 바뀌면 비운다 */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  /* 끄는 동안 일괄 바의 열림을 붙잡아 둔 값(끌지 않을 때는 null).
     끄는 도중에 바가 열리거나 닫히면 그만큼 목록이 오르내려 커서 밑의 카드가 바뀐다. */
  const [frozenBulkBarOpen, setFrozenBulkBarOpen] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchType, setSearchType] = useState<"all" | "title" | "desc">("all");
  /* 정렬 + 필터 — 태그/카테고리 패턴과 일관 */
  type SortBy = "default" | "newest" | "title";
  type PublishFilter = "all" | "published" | "draft";
  type DescFilter = "all" | "with" | "without";
  const [sortBy, setSortBy] = useState<SortBy>("default");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all");
  const [descFilter, setDescFilter] = useState<DescFilter>("all");
  const [filterExpanded, setFilterExpanded] = useState(false);

  const activeFilterCount = (publishFilter !== "all" ? 1 : 0) + (descFilter !== "all" ? 1 : 0);

  const handleSortByChange = (next: SortBy) => {
    if (next === sortBy) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(next);
      setSortDir(next === "newest" ? "desc" : "asc");
    }
  };

  const sortItems = [
    { value: "default" as const, label: t("admin.settings.taxonomy.sortCustom") },
    { value: "newest" as const, label: t("admin.settings.seriesEditor.sortNewest") },
    { value: "title" as const, label: t("admin.settings.seriesEditor.sortTitle") },
  ];
  const newFormRef = useRef<HTMLDivElement>(null);
  const seriesRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const didScrollRef = useRef(false);
  const newEditorRef = useRef<SeriesInlineEditorHandle>(null);
  const [newEditorPublished, setNewEditorPublished] = useState(true);
  const [newEditorSaving, setNewEditorSaving] = useState(false);
  const expandedEditorRef = useRef<SeriesInlineEditorHandle>(null);
  const [_expandedPublished, setExpandedPublished] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  // grip handle 을 mousedown 했을 때만 카드의 draggable 이 켜짐 — 다른 영역 클릭으로는 드래그 시작 X
  const [armedId, setArmedId] = useState<string | null>(null);

  /* 카드를 펼칠 때의 글 수를 적어 둔다 — 저장하지 않고 접으면 이 값으로 되돌린다 */
  const countSnapshot = useRef<Map<string, number>>(new Map());

  const applyPostCount = useCallback((id: string, count: number) => {
    setSeriesList((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx === -1 || prev[idx].post_count === count) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], post_count: count };
      return next;
    });
  }, []);

  const expandCard = useCallback((item: Series) => {
    countSnapshot.current.set(item.id, item.post_count ?? 0);
    setExpandedId(item.id);
  }, []);

  const collapseId = useCallback((id: string | null) => {
    if (!id) { setExpandedId(null); return; }
    /* 편집 중에 앞당겨 바꿔 둔 글 수를 원래대로 — 저장했다면 뒤이은 fetchSeries 가 다시 덮는다 */
    const snapshot = countSnapshot.current.get(id);
    countSnapshot.current.delete(id);
    if (snapshot !== undefined) {
      setSeriesList((prev) => prev.map((item) => (
        item.id === id && item.post_count !== snapshot ? { ...item, post_count: snapshot } : item
      )));
    }
    setClosingId(id);
    setExpandedId(null);
    if (closingTimer.current) clearTimeout(closingTimer.current);
    closingTimer.current = setTimeout(() => setClosingId(null), 600);
  }, []);

  /* search debounce — 300ms */
  useEffect(() => {
    const tid = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(tid);
  }, [search]);

  /* search/searchType/sort/filter 변경 시 page 0 으로 리셋 */
  const filtersChanged = useDepsChanged([debouncedSearch, searchType, sortBy, sortDir, publishFilter, descFilter]);
  if (filtersChanged) { setPage(0); setSelected(new Set()); }

  const fetchSeries = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      // 발행 필터: published 만 → all 미지정 (published=true 만), 그 외 → all=true
      if (publishFilter !== "published") params.set("all", "true");
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      if (debouncedSearch) {
        params.set(QUERY_PARAM.q, debouncedSearch);
        params.set("searchType", searchType);
      }
      const res = await fetch(`/api/series?${params}`);
      const data = await res.json();
      let items = Array.isArray(data?.items) ? data.items : [];
      // draft 필터는 client side — published=false 인 것만
      if (publishFilter === "draft") items = items.filter((s: Series) => !s.published);
      // 설명 있음/없음 client filter
      if (descFilter !== "all") {
        items = items.filter((s: Series) => {
          const hasDesc = !!(s.description?.trim() || s.description_en?.trim());
          return descFilter === "with" ? hasDesc : !hasDesc;
        });
      }
      setSeriesList(items);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, debouncedSearch, searchType, sortBy, sortDir, publishFilter, descFilter]);

  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  useEffect(() => {
    const onMouseUp = () => { selectDragStart.current = null; setFrozenBulkBarOpen(null); };
    /* 끄는 동안 카드 글자가 잡히지 않게 — mousedown 을 막으면 체크박스 클릭까지 죽는다 */
    const onSelectStart = (e: Event) => { if (selectDragStart.current !== null) e.preventDefault(); };
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectstart", onSelectStart);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectstart", onSelectStart);
    };
  }, []);

  /* ── 일괄 처리 ── */
  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  /* 드래그로 여러 개 — 누른 카드에서 시작해 지나는 카드까지 한 번에 켜거나 끈다(글 추가 목록과 같은 방식) */
  const selectDragStart = useRef<number | null>(null);
  const selectDragAdding = useRef(true);
  /* 누른 뒤 실제로 끌어서 범위를 칠했는지 — 칠했다면 이어 오는 click 의 토글은 흘려보낸다 */
  const selectDragMoved = useRef(false);

  const extendSelectDrag = (idx: number) => {
    const start = selectDragStart.current;
    if (start === null || start === idx) return;
    const lo = Math.min(start, idx);
    const hi = Math.max(start, idx);
    selectDragMoved.current = true;
    setSelected((prev) => {
      const next = new Set(prev);
      for (let i = lo; i <= hi; i++) {
        const id = seriesList[i]?.id;
        if (!id) continue;
        if (selectDragAdding.current) next.add(id); else next.delete(id);
      }
      return next;
    });
  };

  const allSelected = seriesList.length > 0 && seriesList.every((item) => selected.has(item.id));
  const someSelected = seriesList.some((item) => selected.has(item.id)) && !allSelected;
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(seriesList.map((item) => item.id)));

  const bulkPublish = async (published: boolean) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(true);
    const done = await sendActions(
      ids.map((id) => ({
        input: `/api/series/${id}`,
        init: { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published }) },
      })),
      t, t("admin.common.publishFailed"),
    );
    setBulkBusy(false);
    setSelected(new Set());
    if (done > 0) fetchSeries();
  };

  const bulkDelete = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    openModal(
      <ModalConfirm
        desc={fillTemplate(t("admin.posts.seriesBulkDeleteConfirm"), { count: ids.length })}
        confirmText={t("admin.posts.delete")}
        danger
        onConfirm={async () => {
          setBulkBusy(true);
          const done = await sendActions(
            ids.map((id) => ({ input: `/api/series/${id}`, init: { method: "DELETE" } })),
            t, t("admin.common.deleteFailed"),
          );
          setBulkBusy(false);
          setSelected(new Set());
          if (done > 0) { collapseId(expandedId); fetchSeries(); }
        }}
      />,
      { id: "series-bulk-delete", header: { title: t("admin.posts.delete") }, closeButton: true, width: "400px" },
    );
  };

  const handleReorder = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const reordered = [...seriesList];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    const sortOrders = seriesList.slice(lo, hi + 1).map((s) => s.sort_order);
    const next = reordered.map((s, idx) => {
      if (idx >= lo && idx <= hi) {
        return { ...s, sort_order: sortOrders[idx - lo] };
      }
      return s;
    });
    setSeriesList(next);
    // skipShift=true — 클라이언트가 직접 정렬 관리
    const changed = next.slice(lo, hi + 1);
    const saved = await sendActions(
      changed.map((s) => ({
        input: `/api/series/${s.id}?skipShift=true`,
        init: { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: s.sort_order }) },
      })),
      t, t("admin.common.reorderFailed"), { sequential: true },
    );
    /* 하나라도 실패하면 먼저 바꿔 둔 화면 순서가 서버와 어긋나므로 다시 불러온다(#868) */
    if (saved < changed.length) fetchSeries();
  };

  /* URL ?series=ID — findPage 로 해당 페이지를 알아낸 뒤 이동 */
  useEffect(() => {
    if (!targetSeriesId || didScrollRef.current) return;
    didScrollRef.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/series?findPage=${targetSeriesId}&limit=${PAGE_SIZE}`);
        const data = await res.json();
        const targetPage = typeof data?.page === "number" ? data.page : 0;
        setPage(targetPage);
        setExpandedId(targetSeriesId);
        // 데이터 fetch 후 스크롤 (페이지 변경 후 다음 frame)
        setTimeout(() => {
          const el = seriesRefs.current.get(targetSeriesId);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 250);
      } catch { /* ignore */ }
    })();
  }, [targetSeriesId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  /* 끄는 동안에는 시작할 때의 상태를 유지 — 끝나면 선택 개수를 따른다 */
  const bulkBarOpen = frozenBulkBarOpen ?? selected.size > 0;

  return (
    <div className={styles.seriesList}>
      {title && (
        <div className={shared.sectionTitleRow}>
          <h2 className={shared.sectionTitle}>{title}</h2>
        </div>
      )}
      {/* Toolbar 묶음 — filterRow + drawer (태그/카테고리와 동일 패턴) */}
      <div className={shared.tagDescToolbarWrap}>
        <div className={shared.tagDescFilterRow}>
          {seriesList.length > 0 && (
            <span className={styles.seriesSelectAll} title={t("admin.common.selectAll")}>
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleSelectAll}
                shape="square"
              />
            </span>
          )}
          <Button
            variant={filterExpanded || activeFilterCount > 0 ? "primary" : "outline"}
            size="md"
            icon={<Filter size={12} />}
            onClick={() => setFilterExpanded((e) => !e)}
          >
            {t("admin.settings.taxonomy.filter")}{activeFilterCount > 0 && ` (${activeFilterCount})`}
            <ChevronDown
              size={12}
              style={{
                marginLeft: 2,
                transform: filterExpanded ? "rotate(180deg)" : undefined,
                transition: "transform 0.2s",
              }}
            />
          </Button>
          <SegmentedControl
            items={sortItems}
            value={sortBy}
            onChange={handleSortByChange}
            sortDir={sortDir}
          />
          <div className={shared.tagDescSearchEnd}>
            <SearchCapsule
              typeSelector={{
                value: searchType,
                options: [
                  { value: "all", label: t("admin.posts.searchTitleDesc") },
                  { value: "title", label: t("admin.posts.searchTitle") },
                  { value: "desc", label: t("admin.posts.searchDesc") },
                ],
                onChange: (v) => setSearchType(v as "all" | "title" | "desc"),
              }}
              search={search}
              onSearchChange={setSearch}
              placeholder={t("admin.posts.seriesSearch")}
              align="left"
            />
          </div>
        </div>
        <AnimatePresence initial={false}>
          {filterExpanded && (
            <motion.div
              key="series-filter-drawer"
              className={shared.tagDescFilterDrawerWrap}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className={shared.tagDescFilterDrawer}>
                <div className={shared.tagDescFilterGroup}>
                  <span className={shared.tagDescFilterGroupLabel}>{t("admin.settings.seriesEditor.status")}</span>
                  <Button
                    variant={publishFilter === "published" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setPublishFilter((p) => p === "published" ? "all" : "published")}
                  >{t("admin.posts.published")}</Button>
                  <Button
                    variant={publishFilter === "draft" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setPublishFilter((p) => p === "draft" ? "all" : "draft")}
                  >{t("admin.posts.draft")}</Button>
                </div>
                <div className={shared.tagDescFilterGroup}>
                  <span className={shared.tagDescFilterGroupLabel}>{t("admin.settings.description")}</span>
                  <Button
                    variant={descFilter === "with" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setDescFilter((d) => d === "with" ? "all" : "with")}
                  >{t("admin.settings.taxonomy.hasDesc")}</Button>
                  <Button
                    variant={descFilter === "without" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setDescFilter((d) => d === "without" ? "all" : "without")}
                  >{t("admin.settings.taxonomy.noDesc")}</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 고른 카드에 한 번에 — 글 목록 화면의 표와 같은 일괄 바.
          끌어서 고르는 동안에는 열지 않는다(열리면 목록이 내려가 커서 밑 카드가 바뀐다). */}
      <div className={`${subTable.bulkBar} ${bulkBarOpen ? subTable.bulkBarOpen : ""}`}>
        <span>{fillTemplate(t("admin.common.selectedCount"), { count: selected.size })}</span>
        <Button variant="outline" size="xs" disabled={bulkBusy} onClick={() => bulkPublish(true)}>
          {t("admin.posts.publish")}
        </Button>
        <Button variant="outline" size="xs" disabled={bulkBusy} onClick={() => bulkPublish(false)}>
          {t("admin.posts.unpublish")}
        </Button>
        <Button variant="outline" size="xs" disabled={bulkBusy} onClick={bulkDelete}>
          {t("admin.posts.delete")}
        </Button>
        <Pressable
          className={subTable.bulkCancel}
          onClick={() => setSelected(new Set())}
          aria-label={t("admin.posts.seriesModal.cancel")}
        >
          ✕
        </Pressable>
      </div>

      {loading ? (
        <>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.seriesItem} style={{ padding: "var(--spacing-sm) var(--spacing-md)" }}>
              <SkeletonLine width="60%" height={14} />
            </div>
          ))}
        </>
      ) : seriesList.length === 0 ? (
        <p className={shared.sectionHint} style={{ padding: "var(--spacing-md)", textAlign: "center" }}>
          {debouncedSearch
            ? t("admin.posts.searchNoResult")
            : t("admin.posts.seriesEmpty")}
        </p>
      ) : (
        <LayoutGroup>
        {seriesList.map((s, idx) => {
          const expanded = expandedId === s.id;
          const isDragging = dragIdx === idx;
          const dropClass =
            overIdx === idx && dragIdx !== null && dragIdx !== idx
              ? dragIdx < idx ? styles.seriesCardDropBelow : styles.seriesCardDropAbove
              : "";
          return (
            <motion.div
              key={s.id}
              layout
              transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.6 }}
              ref={(el) => { if (el) seriesRefs.current.set(s.id, el); else seriesRefs.current.delete(s.id); }}
              className={`${styles.seriesCard} ${isDragging ? styles.seriesCardDragging : ""} ${dropClass}`}
              // grip handle 이 mousedown 으로 armed 했을 때만 카드 draggable 활성화 → 핸들 외 영역은 드래그 시작 X
              draggable={!expanded && armedId === s.id}
              // motion.div 의 onDragStart 등은 framer drag 시스템 타입이라 HTML5 drag prop 과 충돌 → cast 로 우회
              onDragStart={((e: React.DragEvent<HTMLDivElement>) => {
                if (expanded) { e.preventDefault(); return; }
                setDragIdx(idx);
                e.dataTransfer.effectAllowed = "move";
              }) as unknown as React.ComponentProps<typeof motion.div>["onDragStart"]}
              onDragOver={(e) => {
                if (dragIdx === null) return;
                e.preventDefault();
                setOverIdx(idx);
              }}
              onDragLeave={() => { /* handled by next over */ }}
              onMouseEnter={() => extendSelectDrag(idx)}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); setArmedId(null); }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdx !== null) handleReorder(dragIdx, idx);
                setDragIdx(null);
                setOverIdx(null);
                setArmedId(null);
              }}
            >
              {/* 일괄 처리용 선택 — 핸들 앞. 누른 채로 위아래로 끌면 지나는 카드까지 함께 켜진다 */}
              <span
                className={styles.seriesCardCheck}
                onMouseDown={(e) => {
                  /* 여기서는 범위의 시작만 잡는다 — 켜고 끄는 건 이어 오는 click(onChange)이 한 번만 한다 */
                  if (e.button !== 0) return;
                  selectDragStart.current = idx;
                  selectDragAdding.current = !selected.has(s.id);
                  selectDragMoved.current = false;
                  setFrozenBulkBarOpen(selected.size > 0);
                }}
                onMouseEnter={() => extendSelectDrag(idx)}
              >
                <Checkbox
                  className={styles.seriesCheckAlign}
                  checked={selected.has(s.id)}
                  onChange={() => {
                    /* 끌어서 이미 칠했으면 그 끝에 오는 click 은 무시한다 — 안 그러면 되돌아간다 */
                    if (selectDragMoved.current) { selectDragMoved.current = false; return; }
                    toggleSelect(s.id);
                  }}
                  shape="square"
                />
              </span>
              <span
                className={styles.seriesCardHandle}
                onMouseDown={(e) => { e.stopPropagation(); if (!expanded) setArmedId(s.id); }}
                onMouseUp={() => { if (armedId === s.id) setArmedId(null); }}
                aria-label="Drag to reorder"
                title="Drag to reorder"
                data-cursor="grab"
              >
                <GripVertical size={16} strokeWidth={1.8} />
              </span>
              {/* button 안에 button 중첩 금지 (HTML invalid) — div + role="button" 으로 변경 */}
              <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                className={`${styles.seriesCardHead} ${expanded ? styles.seriesCardHeadExpanded : ""} ${s.cover_image ? styles.seriesCardHeadCover : ""}`}
                style={s.cover_image ? { backgroundImage: `url(${s.cover_image})` } : undefined}
                onClick={() => expanded ? collapseId(s.id) : expandCard(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (expanded) collapseId(s.id);
                    else expandCard(s);
                  }
                }}
              >
                {s.cover_image && <span className={styles.seriesCardOverlay} />}
                <div className={styles.seriesCardInfo}>
                  <div className={styles.seriesCardNameRow}>
                    <p className={styles.seriesCardName}>
                      <span
                        className={shared.seriesCardOrderPrefix}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        #
                        <EditableRowNumber
                          inline
                          value={s.sort_order}
                          min={1}
                          max={total}
                          onSave={async (n) => {
                            if (n === s.sort_order) return;
                            const res = await sendAction(`/api/series/${s.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ sort_order: n }),
                            }, t, t("admin.common.reorderFailed"));
                            if (res) fetchSeries();
                          }}
                        />
                        _
                      </span>
                      {s.title || <T k="admin.posts.untitled" />}
                    </p>
                  </div>
                  <div className={styles.seriesCardMeta}>
                    {s.category && <span className={styles.seriesBadgeCat}>{s.category}</span>}
                    <span>{s.post_count ?? 0} <T k="admin.posts.postsCount" /></span>
                  </div>
                </div>
                {/* 펼친 상태 — 삭제 버튼을 publish badge 의 왼쪽에 (info ↔ publish 사이) 삽입.
                   publish/chevron 우측 anchor 가 유지되어 펼치기/접기 시 publish 위치 흔들림 없음.
                   클릭 전파 차단 (parent role=button 의 expand/collapse 트리거 방지). */}
                {expanded && (
                  <Button
                    variant="primary"
                    size="xs"
                    className={styles.seriesCardDeleteBtn}
                    icon={<Trash2 size={12} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(
                        <SeriesDeleteModal
                          series={s}
                          onConfirm={async (deletePosts) => {
                            closeAll();
                            const res = await sendAction(`/api/series/${s.id}${deletePosts ? "?deletePosts=true" : ""}`, { method: "DELETE" }, t, t("admin.common.deleteFailed"));
                            if (!res) return;
                            collapseId(s.id);
                            fetchSeries();
                          }}
                          onCancel={closeAll}
                        />,
                        { id: "series-delete", header: { title: `"${s.title}"` }, closeButton: true, width: "400px" },
                      );
                    }}
                  >
                    {t("admin.posts.delete")}
                  </Button>
                )}
                {/* 발행 배지 — chevron 바로 앞. 클릭하면 발행/해제 토글. admin 목록과 같은 공통 StatusBadge 규격. */}
                <StatusBadge
                  variant={s.published ? "published" : "draft"}
                  className={s.published ? styles.seriesCardBadgeOn : styles.seriesCardBadgeOff}
                  title={s.published ? t("admin.settings.seriesEditor.unpublishHint") : t("admin.settings.seriesEditor.publishHint")}
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextPub = !s.published;
                    if (expanded) {
                      setExpandedPublished(nextPub);
                      expandedEditorRef.current?.setPublished(nextPub);
                    }
                    setSeriesList((prev) => prev.map((item) => item.id === s.id ? { ...item, published: nextPub } : item));
                    /* 거절돼도 되돌린다 — 예전에는 요청이 끊길 때만 되돌리고 알리지 않았다(#868) */
                    void sendAction(`/api/series/${s.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ published: nextPub }),
                    }, t, t("admin.common.publishFailed")).then((res) => {
                      if (res) return;
                      setSeriesList((prev) => prev.map((item) => item.id === s.id ? { ...item, published: s.published } : item));
                      if (expanded) {
                        setExpandedPublished(s.published);
                        expandedEditorRef.current?.setPublished(s.published);
                      }
                    });
                  }}
                >
                  {s.published ? <T k="admin.posts.published" /> : <T k="admin.posts.draft" />}
                </StatusBadge>
                <ChevronRight className={`${styles.seriesChevron} ${expanded ? styles.seriesChevronOpen : ""}`} size={14} />
              </div>
              <div className={`${styles.seriesCardCollapse} ${expanded ? styles.seriesCardCollapseOpen : ""}`}>
                <div>
                  {(expanded || closingId === s.id) && (
                    <SeriesInlineEditor
                      ref={expanded ? expandedEditorRef : undefined}
                      series={s}
                      categories={categories}
                      onSave={() => { collapseId(s.id); fetchSeries(); }}
                      onCancel={() => collapseId(s.id)}
                      onCoverChange={(url) => {
                        setSeriesList((prev) => prev.map((item) => item.id === s.id ? { ...item, cover_image: url } : item));
                      }}
                      /* 접히는 중인 카드는 빼 둔다 — 되돌린 글 수를 다시 덮어쓴다 */
                      onPostCountChange={expanded ? (n) => applyPostCount(s.id, n) : undefined}
                      hideInlinePublishToggle
                      onFormStateChange={(state) => {
                        if (expanded) setExpandedPublished(state.published);
                      }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        </LayoutGroup>
      )}

      <Pagination
        page={page + 1}
        totalPages={totalPages}
        onChange={(p) => { setPage(p - 1); setExpandedId(null); setSelected(new Set()); }}
        size="sm"
      />

      <div
        ref={newFormRef}
        className={`${shared.newSeriesShell} ${creatingNew ? shared.newSeriesShellOpen : ""}`}
      >
        <div className={shared.newSeriesShellHead}>
          <Pressable
            className={shared.newSeriesShellTitle}
            onClick={!creatingNew ? () => {
              setCreatingNew(true);
              setExpandedId(null);
              requestAnimationFrame(() => {
                newFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              });
            } : undefined}
            disabled={creatingNew}
          >
            <span className={shared.newSeriesShellPlus} aria-hidden="true"><Plus size={14} strokeWidth={2.2} /></span>
            <T k="admin.posts.seriesModal.newTitle" />
          </Pressable>
          <div className={shared.newSeriesShellActions}>
            <Button variant="outline" size="sm" onClick={() => setCreatingNew(false)} soundDisabled>
              <T k="admin.posts.seriesModal.cancel" />
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => newEditorRef.current?.save()}
              disabled={newEditorSaving}
              loading={newEditorSaving}
              soundDisabled
            >
              <T k="admin.posts.seriesModal.create" />
            </Button>
            <span className={styles.newSeriesShellDivider} aria-hidden="true" />
            <div className={shared.publishToggle}>
              <span key={newEditorPublished ? "pub" : "draft"} className={shared.publishLabel}>
                {newEditorPublished ? t("admin.posts.seriesModal.publishedLabel") : t("admin.posts.seriesModal.draftLabel")}
              </span>
              <Switch
                size="md"
                checked={newEditorPublished}
                onCheckedChange={(v) => {
                  setNewEditorPublished(v);
                  newEditorRef.current?.setPublished(v);
                }}
              />
            </div>
          </div>
        </div>
        <div>
          <SeriesInlineEditor
            ref={newEditorRef}
            series={null}
            categories={categories}
            onSave={() => { setCreatingNew(false); fetchSeries(); }}
            onCancel={() => setCreatingNew(false)}
            bare
            hideStandaloneHeader
            hideBottomActions
            totalCount={total}
            onFormStateChange={(s) => {
              setNewEditorPublished(s.published);
              setNewEditorSaving(s.saving);
            }}
          />
        </div>
      </div>
    </div>
  );
}
