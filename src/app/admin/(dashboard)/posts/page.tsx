"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Post, Series } from "@/types/post";
import { formatPostTitle } from "@/utils/post";
import AdminListShell, {
  adminShellStyles as shell,
} from "@/components/admin/AdminListShell";
import AdminTable, {
  usePublishChanges,
  adminTableStyles as ts,
  type AdminTableColumn,
} from "@/components/admin/AdminTable/AdminTable";
import SeriesEditorModal from "@/components/posts/SeriesEditorModal";
import { useCategories } from "@/hooks/useCategories";
import styles from "./AdminPosts.module.css";

const POSTS_PER_PAGE = 20;

export default function AdminPostsPage() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saving, setSaving] = useState(false);

  /* Publish changes */
  const { publishOverrides, toggle, setAll, reset, toChanges, hasChanges } =
    usePublishChanges<Post>();

  /* Preview tooltip */
  const [hoveredPost, setHoveredPost] = useState<Post | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [imgError, setImgError] = useState(false);

  /* Series */
  const categories = useCategories();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null | undefined>(undefined);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      all: "true",
      page: String(page),
      limit: String(POSTS_PER_PAGE),
    });
    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page]);

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

  const handleRowHover = (post: Post, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tooltipWidth = 280;
    const hasImage = !!post.cover_image;
    const tooltipHeight = hasImage ? 260 : 120;
    const gap = 8;
    const rawLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const left = Math.max(
      8,
      Math.min(rawLeft, window.innerWidth - tooltipWidth - 8),
    );
    const spaceAbove = rect.top;
    const top =
      spaceAbove > tooltipHeight + gap
        ? rect.top - tooltipHeight - gap
        : rect.bottom + gap;
    setTooltipPos({ top, left });
    setImgError(false);
    setHoveredPost(post);
  };

  /* ── Table columns ── */
  const columns: AdminTableColumn<Post>[] = useMemo(
    () => [
      {
        key: "thumb",
        label: "",
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
        key: "status",
        label: t("admin.posts.tableStatus"),
        render: (_post, published) => (
          <span
            className={`${ts.statusBadge} ${published ? ts.published : ts.draft}`}
          >
            {published
              ? t("admin.posts.published")
              : t("admin.posts.draft")}
          </span>
        ),
        skeletonWidth: "60px",
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
      actions: t("admin.posts.tableActions"),
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
          {t("admin.posts.series")} ({seriesList.length})
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
          <div className={styles.seriesGrid}>
            {seriesList.map((s) => (
              <div
                key={s.id}
                className={styles.seriesCard}
                data-clickable="true"
                onClick={() => setEditingSeries(s)}
              >
                {s.cover_image && (
                  <div className={styles.seriesCardThumb}>
                    <Image
                      src={s.cover_image}
                      alt=""
                      width={240}
                      height={80}
                      unoptimized
                      className={styles.seriesCardImg}
                    />
                  </div>
                )}
                <div className={styles.seriesCardBody}>
                  <p className={styles.seriesCardTitle}>
                    {s.title || t("admin.posts.untitled")}
                  </p>
                  <div className={styles.seriesCardMeta}>
                    {s.category && (
                      <span className={styles.seriesCardCat}>
                        {s.category}
                      </span>
                    )}
                    <span>
                      {s.post_count ?? 0} {t("admin.posts.postsCount")}
                    </span>
                    <span
                      className={`${styles.statusBadge} ${s.published ? styles.published : styles.draft}`}
                    >
                      {s.published
                        ? t("admin.posts.published")
                        : t("admin.posts.draft")}
                    </span>
                  </div>
                </div>
                <div className={styles.seriesCardActions}>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSeries(s);
                    }}
                  >
                    {t("admin.posts.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={styles.seriesNewBtn}
            onClick={() => setEditingSeries(null)}
          >
            {t("admin.posts.newSeries")}
          </button>
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
      beforeTable={seriesSection}
    >
      <AdminTable<Post>
        items={posts}
        columns={columns}
        editBasePath="/admin/posts"
        getTitle={(p) => formatPostTitle(p) || t("admin.posts.untitled")}
        publishOverrides={publishOverrides}
        onPublishToggle={toggle}
        onPublishAll={setAll}
        onDelete={handleDelete}
        gridTemplate="40px 60px 1fr 100px 80px 80px 140px"
        loading={loading}
        emptyMessage={t("admin.posts.noPostsYet")}
        labels={labels}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowHover={handleRowHover}
        onRowLeave={() => setHoveredPost(null)}
      >
        {/* Hover preview tooltip */}
        {hoveredPost && (
          <div
            className={shell.previewTooltip}
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            {hoveredPost.cover_image && (
              <div className={shell.previewImage}>
                {imgError ? (
                  <div className={shell.previewPlaceholder}>
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                ) : (
                  <Image
                    src={hoveredPost.cover_image}
                    alt=""
                    width={280}
                    height={140}
                    className={shell.previewImg}
                    unoptimized
                    onError={() => setImgError(true)}
                  />
                )}
              </div>
            )}
            <div className={shell.previewBody}>
              <p className={shell.previewTitle}>{formatPostTitle(hoveredPost)}</p>
              {hoveredPost.excerpt && (
                <p className={shell.previewExcerpt}>
                  {hoveredPost.excerpt}
                </p>
              )}
              {hoveredPost.tags.length > 0 && (
                <div className={shell.previewTags}>
                  {hoveredPost.tags.map((tag) => (
                    <span key={tag} className={shell.previewTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminTable>

      {editingSeries !== undefined && (
        <SeriesEditorModal
          series={editingSeries}
          categories={categories}
          onSave={() => {
            setEditingSeries(undefined);
            fetchSeries();
          }}
          onClose={() => setEditingSeries(undefined)}
        />
      )}
    </AdminListShell>
  );
}
