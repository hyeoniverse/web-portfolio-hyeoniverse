"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Trash2 } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import type { BilingualCategory } from "@/types/common";
import type { Series } from "@/types/post";
import T from "@/components/ui/T";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import SeriesInlineEditor from "./SeriesInlineEditor";
import SeriesDeleteModal from "./SeriesDeleteModal";
import styles from "../Settings.module.css";

/* ── SeriesManager ── */

interface SeriesManagerProps {
  categories: BilingualCategory[];
}

export default function SeriesManager({ categories }: SeriesManagerProps) {
  const { t } = useLanguage();
  const { openModal, closeAll } = useModalStore();
  const searchParams = useSearchParams();
  const targetSeriesId = searchParams.get("series");
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const closingTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [page, setPage] = useState(0);
  const newFormRef = useRef<HTMLDivElement>(null);
  const seriesRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const didScrollRef = useRef(false);
  const PAGE_SIZE = 5;

  const collapseId = useCallback((id: string | null) => {
    if (!id) { setExpandedId(null); return; }
    setClosingId(id);
    setExpandedId(null);
    if (closingTimer.current) clearTimeout(closingTimer.current);
    closingTimer.current = setTimeout(() => setClosingId(null), 600);
  }, []);

  const fetchSeries = useCallback(async () => {
    try {
      const res = await fetch("/api/series?all=true");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSeriesList(list);
      setPage((prev) => {
        const maxPage = Math.max(0, Math.ceil(list.length / PAGE_SIZE) - 1);
        return prev > maxPage ? maxPage : prev;
      });
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  /* URL에 ?series=ID가 있으면 해당 시리즈 페이지로 이동 + 펼치기 + 스크롤 */
  useEffect(() => {
    if (!targetSeriesId || loading || seriesList.length === 0 || didScrollRef.current) return;
    const idx = seriesList.findIndex((s) => s.id === targetSeriesId);
    if (idx === -1) return;
    const targetPage = Math.floor(idx / PAGE_SIZE);
    setPage(targetPage);
    setExpandedId(targetSeriesId);
    didScrollRef.current = true;
    requestAnimationFrame(() => {
      const el = seriesRefs.current.get(targetSeriesId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [targetSeriesId, loading, seriesList]);

  const totalPages = Math.ceil(seriesList.length / PAGE_SIZE);
  const pagedList = useMemo(
    () => seriesList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [seriesList, page],
  );

  if (loading) return (
    <div className={styles.seriesList}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.seriesItem} style={{ padding: "var(--spacing-sm) var(--spacing-md)" }}>
          <SkeletonLine width="60%" height={14} />
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.seriesList}>
      {pagedList.map((s) => {
        const expanded = expandedId === s.id;
        return (
          <div
            key={s.id}
            ref={(el) => { if (el) seriesRefs.current.set(s.id, el); else seriesRefs.current.delete(s.id); }}
            className={styles.seriesCard}
          >
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
              <ChevronDown className={`${styles.seriesChevron} ${expanded ? styles.seriesChevronOpen : ""}`} size={14} />
            </button>
            {expanded && (
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
            )}
            <div className={`${styles.seriesCardCollapse} ${expanded ? styles.seriesCardCollapseOpen : ""}`}>
              <div>
                {(expanded || closingId === s.id) && (
                  <SeriesInlineEditor
                    series={s}
                    categories={categories}
                    onSave={() => { collapseId(s.id); fetchSeries(); }}
                    onCancel={() => collapseId(s.id)}
                    onCoverChange={(url) => {
                      setSeriesList((prev) => prev.map((item) => item.id === s.id ? { ...item, cover_image: url } : item));
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className={styles.seriesPagination}>
          <button
            type="button"
            className={styles.seriesPageBtn}
            disabled={page === 0}
            onClick={() => { setPage((p) => p - 1); setExpandedId(null); }}
          >
            &lsaquo;
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.seriesPageBtn} ${i === page ? styles.seriesPageBtnActive : ""}`}
              onClick={() => { setPage(i); setExpandedId(null); }}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            className={styles.seriesPageBtn}
            disabled={page === totalPages - 1}
            onClick={() => { setPage((p) => p + 1); setExpandedId(null); }}
          >
            &rsaquo;
          </button>
        </div>
      )}

      {creatingNew && (
        <div ref={newFormRef}>
          <SeriesInlineEditor
            series={null}
            categories={categories}
            onSave={() => { setCreatingNew(false); fetchSeries(); }}
            onCancel={() => setCreatingNew(false)}
          />
        </div>
      )}
      {!creatingNew && (
        <button
          type="button"
          className={styles.profileAddBtn}
          onClick={() => {
            setCreatingNew(true);
            setExpandedId(null);
            requestAnimationFrame(() => {
              newFormRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            });
          }}
        >
          <T k="admin.posts.newSeries" />
        </button>
      )}
    </div>
  );
}
