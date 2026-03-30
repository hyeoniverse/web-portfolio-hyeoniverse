"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import type { Work } from "@/types/work";
import Select from "@/components/ui/Select";
import AdminListShell, {
  adminShellStyles as shell,
} from "@/components/admin/AdminListShell";
import T from "@/components/ui/T";
import AdminTable, {
  adminTableStyles as ts,
  type AdminTableColumn,
} from "@/components/admin/AdminTable/AdminTable";
import styles from "./AdminWorks.module.css";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

const ChevronFirst = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>;
const ChevronPrev = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
const ChevronNext = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
const ChevronLast = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>;

/* ── Isolated tooltip to prevent parent re-renders from reaching AdminTable ── */
function PreviewTooltip({
  work,
  pos,
  imgError,
  onImgError,
  onDismiss,
  onNavigate,
}: {
  work: Work | null;
  pos: { top: number; left: number };
  imgError: boolean;
  onImgError: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  if (!work) return null;
  return (
    <>
      <div className={shell.previewBackdrop} onClick={onDismiss} />
      <div
        className={shell.previewTooltip}
        style={{ top: pos.top, left: pos.left }}
        onClick={onNavigate}
      >
        {work.image && (
          <div className={shell.previewImage}>
            {imgError ? (
              <div className={shell.previewPlaceholder}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            ) : (
              <Image
                src={work.image}
                alt=""
                width={280}
                height={140}
                className={shell.previewImg}
                unoptimized
                onError={onImgError}
              />
            )}
          </div>
        )}
        <div className={shell.previewBody}>
          <p className={shell.previewTitle}>{work.title}</p>
          {work.subtitle_ko && (
            <p className={shell.previewExcerpt}>{work.subtitle_ko}</p>
          )}
          {work.tech.length > 0 && (
            <div className={shell.previewTags}>
              {work.tech.map((tag) => (
                <span key={tag} className={shell.previewTag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminWorksPage() {
  const { t, language } = useLanguage();
  const siteConf = useSiteConfig();
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* Filters & sort */
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [sort, setSort] = useState("order");
  const [filterYear, setFilterYear] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [perPage, setPerPage] = useState(siteConf.works.adminPerPage ?? 20);
  const hasFilters = sort !== "order" || filterYear !== "" || filterCategory !== "" || search;

  /* Trash */
  const [trashWorks, setTrashWorks] = useState<Work[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashSearch, setTrashSearch] = useState("");
  const [trashSearchType, setTrashSearchType] = useState<"all" | "title" | "content">("all");
  const [trashSort, setTrashSort] = useState<"newest" | "oldest">("newest");
  const [trashPage, setTrashPage] = useState(1);
  const [trashPerPage, setTrashPerPage] = useState(10);

  /* Preview tooltip — use refs + minimal state to avoid re-rendering AdminTable */
  const hoveredWorkRef = useRef<Work | null>(null);
  const [tooltipKey, setTooltipKey] = useState(0);
  const tooltipPosRef = useRef({ top: 0, left: 0 });
  const imgErrorRef = useRef(false);

  /* Derived filter options from data */
  const yearOptions = useMemo(() => {
    const years = [...new Set(works.map((w) => w.year).filter(Boolean))];
    years.sort((a, b) => b.localeCompare(a));
    return years;
  }, [works]);

  const categoryOptions = useMemo(() => {
    const cats = new Map<string, string>();
    for (const w of works) {
      if (w.category_ko) cats.set(w.category_ko, w.category_en || w.category_ko);
    }
    return [...cats.entries()];
  }, [works]);

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      all: "true",
      page: String(page),
      limit: String(perPage),
      sort,
    });
    if (filterCategory) params.set("category", filterCategory);
    if (filterYear) params.set("year", filterYear);
    if (search) {
      params.set("search", search);
      params.set("searchType", searchType);
    }
    const res = await fetch(`/api/works?${params}`);
    const data = await res.json();
    setWorks(data.works ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, perPage, sort, filterCategory, filterYear, search, searchType]);

  const fetchTrash = useCallback(async () => {
    const res = await fetch("/api/works?trash=true&limit=100");
    const data = await res.json();
    setTrashWorks(data.works ?? []);
  }, []);

  useEffect(() => {
    fetchWorks();
    fetchTrash();
  }, [fetchWorks, fetchTrash]);

  /* ── Filtered trash ── */
  const filteredTrash = useMemo(() => {
    let list = [...trashWorks];
    if (trashSearch) {
      const q = trashSearch.toLowerCase();
      list = list.filter((w) => {
        const title = (w.title || "").toLowerCase();
        const content = ((w.content_ko || "") + " " + (w.content_en || "")).toLowerCase();
        if (trashSearchType === "title") return title.includes(q);
        if (trashSearchType === "content") return content.includes(q);
        return title.includes(q) || content.includes(q);
      });
    }
    list.sort((a, b) => {
      const da = new Date(a.deleted_at!).getTime();
      const db = new Date(b.deleted_at!).getTime();
      return trashSort === "newest" ? db - da : da - db;
    });
    return list;
  }, [trashWorks, trashSearch, trashSearchType, trashSort]);

  useEffect(() => { setTrashPage(1); }, [trashSearch, trashSearchType, trashSort]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/works/${id}`, { method: "DELETE" });
    fetchWorks();
    if (trashOpen) fetchTrash();
  };

  const handleRestore = async (id: string) => {
    await fetch(`/api/works/${id}/restore`, { method: "POST" });
    fetchTrash();
    fetchWorks();
  };

  const handlePurge = async (id: string, title: string) => {
    if (!confirm(`"${title}" — ${t("admin.works.trashPurgeConfirm")}`)) return;
    await fetch(`/api/works/${id}/purge`, { method: "DELETE" });
    fetchTrash();
  };

  const handleDragReorder = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;

    const next = [...works];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setWorks(next);

    // Redistribute sort_order values in the affected range
    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    const sortOrders = works
      .slice(lo, hi + 1)
      .map((w) => w.sort_order)
      .sort((a, b) => a - b);

    await Promise.all(
      next.slice(lo, hi + 1).map((w, i) =>
        fetch(`/api/works/${w.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: sortOrders[i] }),
        }),
      ),
    );

    fetchWorks();
  };


  const canHover = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    canHover.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => { canHover.current = e.matches; };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const calcTooltipPos = (el: HTMLElement, work: Work) => {
    const rect = el.getBoundingClientRect();
    const tooltipWidth = 280;
    const hasImage = !!work.image;
    const tooltipHeight = hasImage ? 260 : 120;
    const gap = 8;
    const rawLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - tooltipWidth - 8));
    const spaceAbove = rect.top;
    const top = spaceAbove > tooltipHeight + gap
      ? rect.top - tooltipHeight - gap
      : rect.bottom + gap;
    return { top, left };
  };

  const showTooltip = useCallback((work: Work, el: HTMLElement) => {
    hoveredWorkRef.current = work;
    tooltipPosRef.current = calcTooltipPos(el, work);
    imgErrorRef.current = false;
    setTooltipKey((k) => k + 1);
  }, []);

  const hideTooltip = useCallback(() => {
    if (!hoveredWorkRef.current) return;
    hoveredWorkRef.current = null;
    setTooltipKey((k) => k + 1);
  }, []);

  const handleRowHover = useCallback((work: Work, e: React.MouseEvent) => {
    if (!canHover.current) return;
    showTooltip(work, e.currentTarget as HTMLElement);
  }, [showTooltip]);

  const handleRowLeave = useCallback(() => {
    if (!canHover.current) return;
    hideTooltip();
  }, [hideTooltip]);

  const handleRowClick = useCallback((work: Work, e: React.MouseEvent) => {
    if (canHover.current) {
      router.push(`/admin/works/${work.id}/edit`);
      return;
    }
    /* Touch: first tap → preview, second tap → navigate */
    if (hoveredWorkRef.current?.id === work.id) {
      hideTooltip();
      router.push(`/admin/works/${work.id}/edit`);
      return;
    }
    showTooltip(work, e.currentTarget as HTMLElement);
  }, [router, showTooltip, hideTooltip]);

  const columns: AdminTableColumn<Work>[] = useMemo(
    () => [
      {
        key: "thumb",
        label: t("admin.works.tableThumb"),
        className: ts.colThumbWrap,
        render: (work) => (
          <div className={ts.colThumb}>
            {work.image ? (
              <Image
                src={work.image}
                alt=""
                fill
                sizes="48px"
                className={ts.thumbImg}
                unoptimized
              />
            ) : (
              <div className={ts.thumbPlaceholder}>—</div>
            )}
          </div>
        ),
        skeletonWidth: "48px",
      },
      {
        key: "title",
        label: t("admin.works.tableTitle"),
        className: ts.colTitle,
        render: (work) => work.title || t("admin.works.untitled"),
        skeletonWidth: "65%",
      },
      {
        key: "year",
        label: t("admin.works.tableYear"),
        className: ts.colMono,
        render: (work) => work.year,
        skeletonWidth: "40px",
      },
    ],
    [t],
  );

  const labels = useMemo(
    () => ({
      edit: t("admin.works.edit"),
      delete: t("admin.works.delete"),
      deleteConfirm: t("admin.works.deleteConfirm"),
      deleteConfirmInput: t("admin.works.deleteConfirmInput"),
      cancel: t("admin.works.cancel"),
      actions: t("admin.works.tableActions"),
      publishLabel: t("admin.works.publishLabel"),
      publishedTooltip: t("admin.works.publishedTooltip"),
      unpublishedTooltip: t("admin.works.unpublishedTooltip"),
    }),
    [t],
  );

  /* ── Trash Section ── */
  const TRASH_RETENTION_DAYS = 30;
  const getDaysLeft = (deletedAt: string) => {
    const deleted = new Date(deletedAt).getTime();
    const expiresAt = deleted + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
  };

  const trashSection = (
    <div className={styles.trashSection}>
      <button
        type="button"
        className={styles.trashToggle}
        onClick={() => {
          if (!trashOpen) fetchTrash();
          setTrashOpen((v) => !v);
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
        <span>
          <T k="admin.works.trash" />
          {trashWorks.length > 0 && ` (${trashWorks.length})`}
        </span>
        <svg
          className={`${styles.trashToggleIcon} ${trashOpen ? styles.trashToggleOpen : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span className={styles.trashHint}><T k="admin.works.trashAutoDelete" /></span>
      </button>

      <div className={`${styles.trashContent} ${trashOpen ? styles.trashContentOpen : ""}`}>
        <div>
        <div className={styles.subFilterBar}>
          <Select
            value={String(trashPerPage)}
            options={[
              { value: "10", label: "10" },
              { value: "20", label: "20" },
              { value: "50", label: "50" },
            ]}
            onChange={(v) => { setTrashPerPage(Number(v)); setTrashPage(1); }}
            className={styles.subPageSize}
          />
          <Select
            value={trashSort}
            options={[
              { value: "newest", label: t("admin.works.sortNewestDeleted") },
              { value: "oldest", label: t("admin.works.sortOldestDeleted") },
            ]}
            onChange={(v) => setTrashSort(v as "newest" | "oldest")}
            className={styles.subFilterSelect}
          />
          <div className={`${styles.searchGroup} ${styles.searchGroupRight}`}>
            <Select
              value={trashSearchType}
              options={[
                { value: "all", label: t("admin.works.searchAll") },
                { value: "title", label: t("admin.works.searchTitle") },
                { value: "content", label: t("admin.works.searchContent") },
              ]}
              onChange={(v) => setTrashSearchType(v as "all" | "title" | "content")}
              className={styles.subFilterSelect}
            />
            <input
              type="text"
              placeholder={t("admin.works.trashSearch")}
              value={trashSearch}
              onChange={(e) => setTrashSearch(e.target.value)}
              className={styles.subFilterInput}
            />
          </div>
        </div>
        {filteredTrash.length === 0 ? (
          <p className={styles.trashEmpty}><T k="admin.works.trashEmpty" /></p>
        ) : (
          <ul className={styles.trashList}>
            {filteredTrash.slice((trashPage - 1) * trashPerPage, trashPage * trashPerPage).map((work) => {
              const daysLeft = work.deleted_at ? getDaysLeft(work.deleted_at) : 30;
              const title = work.title || t("admin.works.untitled");
              return (
                <li key={work.id} className={styles.trashRow}>
                  <span className={styles.trashTitle}>{title}</span>
                  <span className={styles.trashMeta}>
                    <span className={daysLeft <= 7 ? styles.trashDaysLeft : ""}>
                      {daysLeft}
                    </span>
                    {" "}<T k="admin.works.trashDaysLeft" />
                  </span>
                  <button
                    type="button"
                    className={styles.trashRestoreBtn}
                    onClick={() => handleRestore(work.id)}
                  >
                    <T k="admin.works.trashRestore" />
                  </button>
                  <button
                    type="button"
                    className={styles.trashPurgeBtn}
                    onClick={() => handlePurge(work.id, title)}
                  >
                    <T k="admin.works.trashPurge" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {(() => {
          const tp = Math.max(1, Math.ceil(filteredTrash.length / trashPerPage));
          return (
            <div className={styles.trashPaging}>
              <button type="button" className={styles.trashPageBtn} disabled={trashPage <= 1} onClick={() => setTrashPage(1)}><ChevronFirst /></button>
              <button type="button" className={styles.trashPageBtn} disabled={trashPage <= 1} onClick={() => setTrashPage((p) => p - 1)}><ChevronPrev /></button>
              <span className={`${styles.trashPageBtn} ${styles.trashPageBtnActive}`}>{trashPage}</span>
              <button type="button" className={styles.trashPageBtn} disabled={trashPage >= tp} onClick={() => setTrashPage((p) => p + 1)}><ChevronNext /></button>
              <button type="button" className={styles.trashPageBtn} disabled={trashPage >= tp} onClick={() => setTrashPage(tp)}><ChevronLast /></button>
            </div>
          );
        })()}
        </div>
      </div>
    </div>
  );

  return (
    <AdminListShell
      title={t("admin.works.title")}
      newHref="/admin/works/new"
      newLabel={t("admin.works.newWork")}
      afterTable={trashSection}
    >
      {/* Filter bar */}
      <div className={shell.filterBar}>
        <div className={styles.searchGroup}>
          <Select
            value={searchType}
            options={[
              { value: "all", label: t("admin.works.searchAll") },
              { value: "title", label: t("admin.works.searchTitle") },
              { value: "content", label: t("admin.works.searchContent") },
            ]}
            onChange={(v) => { setSearchType(v); setPage(1); }}
            className={styles.searchTypeSelect}
          />
          <input
            type="text"
            placeholder={t("admin.works.search")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={styles.searchInput}
          />
        </div>
        <Select
          value={sort}
          options={[
            { value: "order", label: t("admin.works.sortOrder") },
            { value: "newest", label: t("admin.works.sortNewest") },
            { value: "oldest", label: t("admin.works.sortOldest") },
            { value: "name", label: t("admin.works.sortName") },
          ]}
          onChange={(v) => { setSort(v); setPage(1); }}
          className={shell.filterItem}
        />
        {yearOptions.length > 1 && (
          <Select
            value={filterYear}
            options={[
              { value: "", label: t("admin.works.allYears") },
              ...yearOptions.map((y) => ({ value: y, label: y })),
            ]}
            onChange={(v) => { setFilterYear(v); setPage(1); }}
            className={shell.filterItem}
          />
        )}
        {categoryOptions.length > 1 && (
          <Select
            value={filterCategory}
            options={[
              { value: "", label: t("admin.works.allCategories") },
              ...categoryOptions.map(([ko, en]) => ({
                value: ko,
                label: language === "en" ? en : ko,
              })),
            ]}
            onChange={(v) => { setFilterCategory(v); setPage(1); }}
            className={shell.filterItem}
          />
        )}
        {hasFilters && (
          <button
            className={shell.filterReset}
            onClick={() => { setSearch(""); setSearchType("all"); setSort("order"); setFilterYear(""); setFilterCategory(""); setPage(1); }}
          >
            {t("admin.works.resetFilters")}
          </button>
        )}
        <Select
          value={String(perPage)}
          options={PAGE_SIZE_OPTIONS}
          onChange={(v) => { setPerPage(Number(v)); setPage(1); }}
          className={shell.filterPageSize}
        />
      </div>

      <AdminTable<Work>
        items={works}
        columns={columns}
        editBasePath="/admin/works"
        getTitle={(w) => w.title || t("admin.works.untitled")}
        onDelete={handleDelete}
        onBulkPublish={async (ids, published) => {
          await Promise.all(ids.map((id) =>
            fetch(`/api/works/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ published }),
            })
          ));
          fetchWorks();
        }}
        onReorder={sort === "order" && !filterYear && !filterCategory ? handleDragReorder : undefined}
        gridTemplate="40px 80px 1fr 80px 140px"
        showRowNumbers
        getRowLabel={(w) => w.number || "—"}
        loading={loading}
        emptyMessage={t("admin.works.noWorksYet")}
        skeletonRows={4}
        labels={labels}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowHover={handleRowHover}
        onRowLeave={handleRowLeave}
        onRowClick={handleRowClick}
      />

      {/* Hover / Tap preview tooltip — reads from refs, keyed by tooltipKey */}
      <PreviewTooltip
        key={tooltipKey}
        work={hoveredWorkRef.current}
        pos={tooltipPosRef.current}
        imgError={imgErrorRef.current}
        onImgError={() => { imgErrorRef.current = true; setTooltipKey((k) => k + 1); }}
        onDismiss={hideTooltip}
        onNavigate={() => {
          const work = hoveredWorkRef.current;
          if (work) {
            hideTooltip();
            router.push(`/admin/works/${work.id}/edit`);
          }
        }}
      />

    </AdminListShell>
  );
}
