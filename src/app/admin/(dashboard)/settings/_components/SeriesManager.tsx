"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, GripVertical, Trash2 } from "lucide-react";
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
import SeriesInlineEditor, { type SeriesInlineEditorHandle } from "./SeriesInlineEditor";
import Toggle from "@/components/ui/Toggle";
import SeriesDeleteModal from "./SeriesDeleteModal";
import styles from "../Settings.module.css";

/* ── SeriesManager ── */

interface SeriesManagerProps {
  categories: BilingualCategory[];
}

const PAGE_SIZE = 5;

export default function SeriesManager({ categories }: SeriesManagerProps) {
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
  const [searchType, setSearchType] = useState<"all" | "title">("all");
  const newFormRef = useRef<HTMLDivElement>(null);
  const seriesRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const didScrollRef = useRef(false);
  const newEditorRef = useRef<SeriesInlineEditorHandle>(null);
  const [newEditorPublished, setNewEditorPublished] = useState(true);
  const [newEditorSaving, setNewEditorSaving] = useState(false);
  const expandedEditorRef = useRef<SeriesInlineEditorHandle>(null);
  const [expandedPublished, setExpandedPublished] = useState(true);
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

  /* search/searchType 변경 시 page 0 으로 리셋 */
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, searchType]);

  const fetchSeries = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        all: "true",
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) {
        params.set("q", debouncedSearch);
        params.set("searchType", searchType);
      }
      const res = await fetch(`/api/series?${params}`);
      const data = await res.json();
      setSeriesList(Array.isArray(data?.items) ? data.items : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, debouncedSearch, searchType]);

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
      <SearchCapsule
        searchType={searchType}
        searchTypeOptions={[
          { value: "all", label: t("admin.posts.searchAll") },
          { value: "title", label: t("admin.posts.searchTitle") },
        ]}
        onSearchTypeChange={(v) => setSearchType(v as "all" | "title")}
        search={search}
        onSearchChange={setSearch}
        placeholder={t("admin.posts.seriesSearch")}
      />

      {loading ? (
        <>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.seriesItem} style={{ padding: "var(--spacing-sm) var(--spacing-md)" }}>
              <SkeletonLine width="60%" height={14} />
            </div>
          ))}
        </>
      ) : seriesList.length === 0 ? (
        <p className={styles.sectionHint} style={{ padding: "var(--spacing-md)", textAlign: "center" }}>
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
              <button
                type="button"
                className={`${styles.seriesCardHead} ${expanded ? styles.seriesCardHeadExpanded : ""} ${s.cover_image ? styles.seriesCardHeadCover : ""}`}
                style={s.cover_image ? { backgroundImage: `url(${s.cover_image})` } : undefined}
                onClick={() => expanded ? collapseId(s.id) : setExpandedId(s.id)}
              >
                {s.cover_image && <span className={styles.seriesCardOverlay} />}
                <div className={styles.seriesCardInfo}>
                  <p className={styles.seriesCardName}>{s.title || <T k="admin.posts.untitled" />}</p>
                  <div className={styles.seriesCardMeta}>
                    {s.category && <span className={styles.seriesBadgeCat}>{s.category}</span>}
                    <span>{s.post_count ?? 0} <T k="admin.posts.postsCount" /></span>
                    <span className={`${styles.seriesBadge} ${s.published ? styles.seriesBadgePublished : styles.seriesBadgeDraft}`}>
                      {s.published ? <T k="admin.posts.published" /> : <T k="admin.posts.draft" />}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`${styles.seriesChevron} ${expanded ? styles.seriesChevronOpen : ""}`} size={14} />
              </button>
              {expanded && (
                <div className={styles.seriesCardHeadActions}>
                  <Button
                    variant="primary"
                    size="xs"
                    className={styles.seriesCardDeleteBtn}
                    icon={<Trash2 size={12} />}
                    onClick={() => {
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
                  <span className={styles.newSeriesShellDivider} aria-hidden="true" />
                  <div className={styles.publishToggle}>
                    <span key={expandedPublished ? "pub" : "draft"} className={styles.publishLabel}>
                      {expandedPublished ? t("admin.posts.seriesModal.publishedLabel") : t("admin.posts.seriesModal.draftLabel")}
                    </span>
                    <Toggle
                      checked={expandedPublished}
                      onChange={(v) => {
                        setExpandedPublished(v);
                        expandedEditorRef.current?.setPublished(v);
                      }}
                    />
                  </div>
                </div>
              )}
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

      <div
        ref={newFormRef}
        className={`${styles.newSeriesShell} ${creatingNew ? styles.newSeriesShellOpen : ""}`}
      >
        <div className={styles.newSeriesShellHead}>
          <button
            type="button"
            className={styles.newSeriesShellTitle}
            onClick={!creatingNew ? () => {
              setCreatingNew(true);
              setExpandedId(null);
              requestAnimationFrame(() => {
                newFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              });
            } : undefined}
            disabled={creatingNew}
          >
            <span className={styles.newSeriesShellPlus} aria-hidden="true">+ </span>
            <T k="admin.posts.seriesModal.newTitle" />
          </button>
          <div className={styles.newSeriesShellActions}>
            <Button variant="outline" size="xs" onClick={() => setCreatingNew(false)} soundDisabled>
              <T k="admin.posts.seriesModal.cancel" />
            </Button>
            <Button
              variant="primary"
              size="xs"
              onClick={() => newEditorRef.current?.save()}
              disabled={newEditorSaving}
              loading={newEditorSaving}
              soundDisabled
            >
              <T k="admin.posts.seriesModal.create" />
            </Button>
            <span className={styles.newSeriesShellDivider} aria-hidden="true" />
            <div className={styles.publishToggle}>
              <span key={newEditorPublished ? "pub" : "draft"} className={styles.publishLabel}>
                {newEditorPublished ? t("admin.posts.seriesModal.publishedLabel") : t("admin.posts.seriesModal.draftLabel")}
              </span>
              <Toggle
                checked={newEditorPublished}
                onChange={(v) => {
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
            onFormStateChange={(s) => {
              setNewEditorPublished(s.published);
              setNewEditorSaving(s.saving);
            }}
          />
        </div>
      </div>

      <Pagination
        page={page + 1}
        totalPages={totalPages}
        onChange={(p) => { setPage(p - 1); setExpandedId(null); }}
      />
    </div>
  );
}
