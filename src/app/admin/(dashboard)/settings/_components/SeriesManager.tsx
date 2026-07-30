"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SortDirection } from "@/types";
import { useSearchParams } from "next/navigation";
import { ChevronRight, GripVertical, Trash2, Eye, EyeOff, Plus } from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import type { BilingualCategory } from "@/types/common";
import type { Series } from "@/types/post";
import T from "@/components/ui/T";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Tooltip from "@/components/ui/Tooltip";
import EditableRowNumber from "@/components/admin/AdminTable/EditableRowNumber";
import { Filter, ChevronDown } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import SeriesInlineEditor, { type SeriesInlineEditorHandle } from "./SeriesInlineEditor";
import { Switch } from "@/components/ui/Switch";
import SeriesDeleteModal from "./SeriesDeleteModal";
import styles from "./SeriesManager.module.css";
import shared from "../Settings.module.css";

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
  const targetSeriesId = searchParams.get("series");
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const closingTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [page, setPage] = useState(0);
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
    { value: "default" as const, label: "사용자 정의순" },
    { value: "newest" as const, label: "최신순" },
    { value: "title" as const, label: "제목순" },
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
    for (let i = lo; i <= hi; i++) {
      await fetch(`/api/series/${next[i].id}?skipShift=true`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: next[i].sort_order }),
      });
    }
  };

  const collapseId = useCallback((id: string | null) => {
    if (!id) { setExpandedId(null); return; }
    setClosingId(id);
    setExpandedId(null);
    if (closingTimer.current) clearTimeout(closingTimer.current);
    closingTimer.current = setTimeout(() => setClosingId(null), 600);
  }, []);

  /* search debounce — 300ms */
  useEffect(() => {
    const tid = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(tid);
  }, [search]);

  /* search/searchType/sort/filter 변경 시 page 0 으로 리셋 */
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, searchType, sortBy, sortDir, publishFilter, descFilter]);

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
        params.set("q", debouncedSearch);
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
          <Button
            variant={filterExpanded || activeFilterCount > 0 ? "primary" : "outline"}
            size="sm"
            icon={<Filter size={12} />}
            onClick={() => setFilterExpanded((e) => !e)}
          >
            필터{activeFilterCount > 0 && ` (${activeFilterCount})`}
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
            size="sm"
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
              size="sm"
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
                  <span className={shared.tagDescFilterGroupLabel}>발행</span>
                  <Button
                    variant={publishFilter === "published" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setPublishFilter((p) => p === "published" ? "all" : "published")}
                  >발행</Button>
                  <Button
                    variant={publishFilter === "draft" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setPublishFilter((p) => p === "draft" ? "all" : "draft")}
                  >미발행</Button>
                </div>
                <div className={shared.tagDescFilterGroup}>
                  <span className={shared.tagDescFilterGroupLabel}>설명</span>
                  <Button
                    variant={descFilter === "with" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setDescFilter((d) => d === "with" ? "all" : "with")}
                  >설명 있음</Button>
                  <Button
                    variant={descFilter === "without" ? "primary" : "outline"}
                    size="md"
                    onClick={() => setDescFilter((d) => d === "without" ? "all" : "without")}
                  >설명 없음</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); setArmedId(null); }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdx !== null) handleReorder(dragIdx, idx);
                setDragIdx(null);
                setOverIdx(null);
                setArmedId(null);
              }}
            >
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
                onClick={() => expanded ? collapseId(s.id) : setExpandedId(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    expanded ? collapseId(s.id) : setExpandedId(s.id);
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
                          value={s.sort_order}
                          min={1}
                          max={total}
                          onSave={async (n) => {
                            if (n === s.sort_order) return;
                            try {
                              await fetch(`/api/series/${s.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ sort_order: n }),
                              });
                              fetchSeries();
                            } catch { /* ignore */ }
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
                            await fetch(`/api/series/${s.id}${deletePosts ? "?deletePosts=true" : ""}`, { method: "DELETE" });
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
                {/* 발행 배지 — chevron 바로 앞. 펼침/접기와 무관하게 우측 anchor 유지 (delete 가 좌측에 삽입돼도 position 불변). */}
                <Tooltip content={s.published ? "클릭해서 발행 해제" : "클릭해서 발행"}>
                  <Button
                    variant={s.published ? "primary" : "subtle"}
                    tone={s.published ? "success" : "default"}
                    size="xs"
                    icon={s.published ? <Eye size={10} strokeWidth={2.2} /> : <EyeOff size={10} strokeWidth={2.2} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextPub = !s.published;
                      if (expanded) {
                        setExpandedPublished(nextPub);
                        expandedEditorRef.current?.setPublished(nextPub);
                      }
                      setSeriesList((prev) => prev.map((item) => item.id === s.id ? { ...item, published: nextPub } : item));
                      fetch(`/api/series/${s.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ published: nextPub }),
                      }).catch(() => {
                        setSeriesList((prev) => prev.map((item) => item.id === s.id ? { ...item, published: s.published } : item));
                      });
                    }}
                  >
                    {s.published ? <T k="admin.posts.published" /> : <T k="admin.posts.draft" />}
                  </Button>
                </Tooltip>
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
        onChange={(p) => { setPage(p - 1); setExpandedId(null); }}
        size="sm"
      />

      <div
        ref={newFormRef}
        className={`${shared.newSeriesShell} ${creatingNew ? shared.newSeriesShellOpen : ""}`}
      >
        <div className={shared.newSeriesShellHead}>
          <button
            type="button"
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
          </button>
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
