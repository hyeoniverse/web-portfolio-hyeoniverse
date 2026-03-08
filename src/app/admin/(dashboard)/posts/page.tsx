"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import type { Post, Series } from "@/types/post";
import { formatPostTitle } from "@/utils/post";
import { useCategories, translateCategory } from "@/hooks/useCategories";
import Select from "@/components/ui/Select";
import AdminListShell, {
  adminShellStyles as shell,
} from "@/components/admin/AdminListShell";
import AdminTable, {
  usePublishChanges,
  adminTableStyles as ts,
  type AdminTableColumn,
} from "@/components/admin/AdminTable/AdminTable";
import styles from "./AdminPosts.module.css";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

/* ── Isolated tooltip to prevent parent re-renders from reaching AdminTable ── */
function PreviewTooltip({
  post,
  pos,
  imgError,
  onImgError,
  onDismiss,
  onNavigate,
}: {
  post: Post | null;
  pos: { top: number; left: number };
  imgError: boolean;
  onImgError: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  if (!post) return null;
  return (
    <>
      <div className={shell.previewBackdrop} onClick={onDismiss} />
      <div
        className={shell.previewTooltip}
        style={{ top: pos.top, left: pos.left }}
        onClick={onNavigate}
      >
        {post.cover_image && (
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
                src={post.cover_image}
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
          <p className={shell.previewTitle}>{formatPostTitle(post)}</p>
          {post.excerpt && (
            <p className={shell.previewExcerpt}>{post.excerpt}</p>
          )}
          {post.tags.length > 0 && (
            <div className={shell.previewTags}>
              {post.tags.map((tag) => (
                <span key={tag} className={shell.previewTag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminPostsPage() {
  const { t, language } = useLanguage();
  const siteConf = useSiteConfig();
  const router = useRouter();
  const categories = useCategories();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saving, setSaving] = useState(false);

  /* Filters & sort */
  const [sort, setSort] = useState("newest");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSeries, setFilterSeries] = useState("");
  const [perPage, setPerPage] = useState(siteConf.posts.adminPerPage ?? 20);
  const hasFilters = sort !== "newest" || filterCategory !== "" || filterSeries !== "";

  /* Publish changes */
  const { publishOverrides, toggle, setAll, reset, toChanges, hasChanges } =
    usePublishChanges<Post>();

  /* Preview tooltip — use refs + minimal state to avoid re-rendering AdminTable */
  const hoveredPostRef = useRef<Post | null>(null);
  const [tooltipKey, setTooltipKey] = useState(0);
  const tooltipPosRef = useRef({ top: 0, left: 0 });
  const imgErrorRef = useRef(false);

  /* Series */
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [seriesOpen, setSeriesOpen] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      all: "true",
      page: String(page),
      limit: String(perPage),
      sort,
    });
    if (filterCategory) params.set("category", filterCategory);
    if (filterSeries) params.set("series_id", filterSeries);
    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, perPage, sort, filterCategory, filterSeries]);

  const fetchSeries = useCallback(async () => {
    const res = await fetch("/api/series?all=true");
    const data = await res.json();
    setSeriesList(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchSeries();
  }, [fetchPosts, fetchSeries]);

  /* ── Handlers ── */
  const handleDelete = async (id: string) => {
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    fetchPosts();
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    await Promise.all(
      toChanges().map((c) =>
        fetch(`/api/posts/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published: c.published }),
        }),
      ),
    );
    reset();
    setSaving(false);
    fetchPosts();
  };

  const handleDeleteSeries = async (s: Series) => {
    if (
      !confirm(`"${s.title}" — ${t("admin.posts.seriesDeleteConfirm")}`)
    )
      return;
    await fetch(`/api/series/${s.id}`, { method: "DELETE" });
    fetchSeries();
  };

  const canHover = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    canHover.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => { canHover.current = e.matches; };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const calcTooltipPos = (el: HTMLElement, post: Post) => {
    const rect = el.getBoundingClientRect();
    const tooltipWidth = 280;
    const hasImage = !!post.cover_image;
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

  const showTooltip = useCallback((post: Post, el: HTMLElement) => {
    hoveredPostRef.current = post;
    tooltipPosRef.current = calcTooltipPos(el, post);
    imgErrorRef.current = false;
    setTooltipKey((k) => k + 1);
  }, []);

  const hideTooltip = useCallback(() => {
    if (!hoveredPostRef.current) return;
    hoveredPostRef.current = null;
    setTooltipKey((k) => k + 1);
  }, []);

  const handleRowHover = useCallback((post: Post, e: React.MouseEvent) => {
    if (!canHover.current) return;
    showTooltip(post, e.currentTarget as HTMLElement);
  }, [showTooltip]);

  const handleRowLeave = useCallback(() => {
    if (!canHover.current) return;
    hideTooltip();
  }, [hideTooltip]);

  const handleRowClick = useCallback((post: Post, e: React.MouseEvent) => {
    if (canHover.current) {
      router.push(`/admin/posts/${post.id}/edit`);
      return;
    }
    /* Touch: first tap → preview, second tap → navigate */
    if (hoveredPostRef.current?.id === post.id) {
      hideTooltip();
      router.push(`/admin/posts/${post.id}/edit`);
      return;
    }
    showTooltip(post, e.currentTarget as HTMLElement);
  }, [router, showTooltip, hideTooltip]);

  /* ── Table columns ── */
  const columns: AdminTableColumn<Post>[] = useMemo(
    () => [
      {
        key: "thumb",
        label: t("admin.posts.tableThumb"),
        className: ts.colThumbWrap,
        render: (post) => (
          <div className={ts.colThumb}>
            {post.cover_image ? (
              <Image
                src={post.cover_image}
                alt=""
                fill
                sizes="48px"
                className={ts.thumbImg}
                unoptimized
              />
            ) : (
              <div className={ts.thumbPlaceholder}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
          </div>
        ),
        skeletonWidth: "48px",
      },
      {
        key: "title",
        label: t("admin.posts.tableTitle"),
        className: ts.colTitle,
        render: (post) => formatPostTitle(post) || t("admin.posts.untitled"),
        skeletonWidth: "75%",
      },
      {
        key: "date",
        label: t("admin.posts.tableDate"),
        className: ts.colMeta,
        render: (post) => new Date(post.created_at).toLocaleDateString(),
        skeletonWidth: "80px",
      },
      {
        key: "views",
        label: t("admin.posts.tableViews"),
        className: ts.colMono,
        render: (post) => String(post.view_count),
        skeletonWidth: "30px",
      },
    ],
    [t],
  );

  const labels = useMemo(
    () => ({
      edit: t("admin.posts.edit"),
      delete: t("admin.posts.delete"),
      deleteConfirm: t("admin.posts.deleteConfirm"),
      deleteConfirmInput: t("admin.posts.deleteConfirmInput"),
      cancel: t("admin.posts.cancel"),
      actions: t("admin.posts.tableActions"),
      publishLabel: t("admin.posts.publishLabel"),
      publishedTooltip: t("admin.posts.publishedTooltip"),
      unpublishedTooltip: t("admin.posts.unpublishedTooltip"),
    }),
    [t],
  );

  /* ── Series Section ── */
  const seriesSection = (
    <div className={styles.seriesSection}>
      <button
        type="button"
        className={styles.seriesToggle}
        onClick={() => setSeriesOpen((v) => !v)}
      >
        <span>
          <T k="admin.posts.series" /> ({seriesList.length})
        </span>
        <svg
          className={`${styles.seriesToggleIcon} ${seriesOpen ? styles.seriesToggleOpen : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {seriesOpen && (
        <>
          <ul className={styles.seriesList}>
            {seriesList.map((s) => (
              <li key={s.id} className={styles.seriesRow}>
                <span className={styles.seriesRowThumb}>
                  {s.cover_image ? (
                    <Image src={s.cover_image} alt="" width={96} height={56} unoptimized className={styles.seriesRowImg} />
                  ) : (
                    <span className={styles.seriesRowNoImg}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </span>
                  )}
                </span>
                <a
                  href={`/admin/settings?tab=content&sub=posts&series=${s.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.seriesRowLink}
                >
                  <span className={styles.seriesRowTitle}>
                    {s.title || <T k="admin.posts.untitled" />}
                  </span>
                  <span className={styles.seriesRowMeta}>
                    {s.category && (
                      <span className={styles.seriesRowCat}>{s.category}</span>
                    )}
                    <span>{s.post_count ?? 0} <T k="admin.posts.postsCount" /></span>
                    <span
                      className={`${styles.statusBadge} ${s.published ? styles.published : styles.draft}`}
                    >
                      {s.published ? <T k="admin.posts.published" /> : <T k="admin.posts.draft" />}
                    </span>
                  </span>
                </a>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteSeries(s)}
                >
                  <T k="admin.posts.delete" />
                </button>
              </li>
            ))}
          </ul>
          <a
            href="/admin/settings?tab=content&sub=posts"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.seriesNewBtn}
          >
            <T k="admin.posts.newSeries" />
          </a>
        </>
      )}

    </div>
  );

  return (
    <AdminListShell
      title={t("admin.posts.title")}
      newHref="/admin/posts/new"
      newLabel={t("admin.posts.newPost")}
      saving={saving}
      hasChanges={hasChanges}
      onSave={handleSave}
      saveCount={publishOverrides.size}
      saveLabel={t("admin.posts.save")}
      beforeTable={!loading ? seriesSection : undefined}
    >
      {/* Filter bar */}
      <div className={shell.filterBar}>
        <Select
          value={sort}
          options={[
            { value: "newest", label: t("admin.posts.sortNewest") },
            { value: "oldest", label: t("admin.posts.sortOldest") },
            { value: "popular", label: t("admin.posts.sortPopular") },
          ]}
          onChange={(v) => { setSort(v); setPage(1); }}
          className={shell.filterItem}
        />
        <Select
          value={filterCategory}
          options={[
            { value: "", label: t("admin.posts.allCategories") },
            ...categories.map((c) => ({
              value: c.ko,
              label: translateCategory(c.ko, language),
            })),
          ]}
          onChange={(v) => { setFilterCategory(v); setPage(1); }}
          className={shell.filterItem}
        />
        <Select
          value={filterSeries}
          options={[
            { value: "", label: t("admin.posts.allSeries") },
            ...seriesList.map((s) => ({
              value: s.id,
              label: s.title,
            })),
          ]}
          onChange={(v) => { setFilterSeries(v); setPage(1); }}
          className={shell.filterItem}
        />
        {hasFilters && (
          <button
            className={shell.filterReset}
            onClick={() => { setSort("newest"); setFilterCategory(""); setFilterSeries(""); setPage(1); }}
          >
            {t("admin.posts.resetFilters")}
          </button>
        )}
        <Select
          value={String(perPage)}
          options={PAGE_SIZE_OPTIONS}
          onChange={(v) => { setPerPage(Number(v)); setPage(1); }}
          className={shell.filterPageSize}
        />
      </div>

      <AdminTable<Post>
        items={posts}
        columns={columns}
        editBasePath="/admin/posts"
        getTitle={(p) => formatPostTitle(p) || t("admin.posts.untitled")}
        publishOverrides={publishOverrides}
        onPublishToggle={toggle}
        onPublishAll={setAll}
        onDelete={handleDelete}
        gridTemplate="40px 80px 1fr 80px 80px 140px"
        showRowNumbers
        getRowLabel={(p) => p.post_number ?? "—"}
        loading={loading}
        emptyMessage={t("admin.posts.noPostsYet")}
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
        post={hoveredPostRef.current}
        pos={tooltipPosRef.current}
        imgError={imgErrorRef.current}
        onImgError={() => { imgErrorRef.current = true; setTooltipKey((k) => k + 1); }}
        onDismiss={hideTooltip}
        onNavigate={() => {
          const post = hoveredPostRef.current;
          if (post) {
            hideTooltip();
            router.push(`/admin/posts/${post.id}/edit`);
          }
        }}
      />

    </AdminListShell>
  );
}
