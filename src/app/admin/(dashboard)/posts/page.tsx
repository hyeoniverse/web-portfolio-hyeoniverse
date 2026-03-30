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
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
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

const ChevronFirst = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>;
const ChevronPrev = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
const ChevronNext = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
const ChevronLast = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>;

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
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSeries, setFilterSeries] = useState("");
  const [perPage, setPerPage] = useState(siteConf.posts.adminPerPage ?? 20);
  const hasFilters = sort !== "newest" || filterCategory !== "" || filterSeries !== "" || search;

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
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [seriesPage, setSeriesPage] = useState(1);
  const [seriesSearch, setSeriesSearch] = useState("");
  const [seriesSearchType, setSeriesSearchType] = useState<"all" | "title" | "content">("all");
  const [seriesSort, setSeriesSort] = useState<"newest" | "oldest" | "name">("newest");
  const [seriesFilter, setSeriesFilter] = useState<"" | "published" | "draft">("");
  const [seriesPerPage, setSeriesPerPage] = useState(5);

  /* Trash */
  const [trashPosts, setTrashPosts] = useState<Post[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashSearch, setTrashSearch] = useState("");
  const [trashSearchType, setTrashSearchType] = useState<"all" | "title" | "content">("all");
  const [trashSort, setTrashSort] = useState<"newest" | "oldest">("newest");
  const [trashPage, setTrashPage] = useState(1);
  const [trashPerPage, setTrashPerPage] = useState(10);

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
    if (search) {
      params.set("search", search);
      params.set("searchType", searchType);
    }
    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, perPage, sort, filterCategory, filterSeries, search, searchType]);

  const fetchSeries = useCallback(async () => {
    setSeriesLoading(true);
    const res = await fetch("/api/series?all=true");
    const data = await res.json();
    setSeriesList(Array.isArray(data) ? data : []);
    setSeriesLoading(false);
  }, []);

  const mdInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleMdUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    let created = 0;
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".md")) continue;
      let text = await file.text();

      // frontmatter 파싱 (--- ... ---)
      const meta: Record<string, string | string[]> = {};
      const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?/);
      if (fmMatch) {
        text = text.slice(fmMatch[0].length);
        for (const line of fmMatch[1].split("\n")) {
          const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
          if (!kv) continue;
          const [, key, val] = kv;
          if (val.startsWith("[") && val.endsWith("]")) {
            meta[key] = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
          } else {
            meta[key] = val.trim().replace(/^["']|["']$/g, "");
          }
        }
      }

      const title = (meta.title as string) || file.name.replace(/\.md$/, "");
      const slug = ((meta.slug as string) || title).toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");

      const body: Record<string, unknown> = {
        title,
        slug,
        content: text,
        content_type: "markdown",
        published: false,
      };
      body.category = (meta.category as string) || categories[0] || "";
      if (meta.tags) body.tags = Array.isArray(meta.tags) ? meta.tags : [meta.tags];
      if (meta.excerpt) body.excerpt = meta.excerpt;
      if (meta.cover_image) body.cover_image = meta.cover_image;
      if (meta.date) {
        const d = new Date(meta.date as string);
        if (!isNaN(d.getTime())) body.created_at = d.toISOString();
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) created++;
    }
    if (mdInputRef.current) mdInputRef.current.value = "";
    setUploading(false);
    if (created > 0) fetchPosts();
  }, [fetchPosts]);

  const fetchTrash = useCallback(async () => {
    const res = await fetch("/api/posts?trash=true&limit=100");
    const data = await res.json();
    setTrashPosts(data.posts ?? []);
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchSeries();
  }, [fetchPosts, fetchSeries]);

  /* ── Filtered series ── */
  const filteredSeries = useMemo(() => {
    let list = [...seriesList];
    if (seriesSearch) {
      const q = seriesSearch.toLowerCase();
      list = list.filter((s) => {
        const title = (s.title + " " + (s.title_en || "")).toLowerCase();
        const desc = (s.description + " " + (s.description_en || "")).toLowerCase();
        if (seriesSearchType === "title") return title.includes(q);
        if (seriesSearchType === "content") return desc.includes(q);
        return title.includes(q) || desc.includes(q);
      });
    }
    if (seriesFilter === "published") list = list.filter((s) => s.published);
    if (seriesFilter === "draft") list = list.filter((s) => !s.published);
    if (seriesSort === "newest") list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (seriesSort === "oldest") list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (seriesSort === "name") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [seriesList, seriesSearch, seriesSearchType, seriesSort, seriesFilter]);

  useEffect(() => { setSeriesPage(1); }, [seriesSearch, seriesSearchType, seriesSort, seriesFilter]);

  /* ── Filtered trash ── */
  const filteredTrash = useMemo(() => {
    let list = [...trashPosts];
    if (trashSearch) {
      const q = trashSearch.toLowerCase();
      list = list.filter((p) => {
        const title = (formatPostTitle(p) || "").toLowerCase();
        const content = ((p.content || "") + " " + (p.content_en || "")).toLowerCase();
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
  }, [trashPosts, trashSearch, trashSearchType, trashSort]);

  useEffect(() => { setTrashPage(1); }, [trashSearch, trashSearchType, trashSort]);

  /* ── Handlers ── */
  const handleDelete = async (id: string) => {
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    fetchPosts();
    if (trashOpen) fetchTrash();
  };

  const handleRestore = async (id: string) => {
    await fetch(`/api/posts/${id}/restore`, { method: "POST" });
    fetchTrash();
    fetchPosts();
  };

  const handlePurge = async (id: string, title: string) => {
    if (!confirm(`"${title}" — ${t("admin.posts.trashPurgeConfirm")}`)) return;
    await fetch(`/api/posts/${id}/purge`, { method: "DELETE" });
    fetchTrash();
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
          <T k="admin.posts.trash" />
          {trashPosts.length > 0 && ` (${trashPosts.length})`}
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
        <span className={styles.trashHint}><T k="admin.posts.trashAutoDelete" /></span>
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
              { value: "newest", label: t("admin.posts.sortNewestDeleted") },
              { value: "oldest", label: t("admin.posts.sortOldestDeleted") },
            ]}
            onChange={(v) => setTrashSort(v as "newest" | "oldest")}
            className={styles.subFilterSelect}
          />
          <div className={`${styles.searchGroup} ${styles.searchGroupRight}`}>
            <Select
              value={trashSearchType}
              options={[
                { value: "all", label: t("admin.posts.searchAll") },
                { value: "title", label: t("admin.posts.searchTitle") },
                { value: "content", label: t("admin.posts.searchContent") },
              ]}
              onChange={(v) => setTrashSearchType(v as "all" | "title" | "content")}
              className={styles.subFilterSelect}
            />
            <input
              type="text"
              placeholder={t("admin.posts.trashSearch")}
              value={trashSearch}
              onChange={(e) => setTrashSearch(e.target.value)}
              className={styles.subFilterInput}
            />
          </div>
        </div>
        {filteredTrash.length === 0 ? (
          <p className={styles.trashEmpty}><T k="admin.posts.trashEmpty" /></p>
        ) : (
          <ul className={styles.trashList}>
            {filteredTrash.slice((trashPage - 1) * trashPerPage, trashPage * trashPerPage).map((post) => {
              const daysLeft = getDaysLeft(post.deleted_at!);
              const title = formatPostTitle(post) || t("admin.posts.untitled");
              return (
                <li key={post.id} className={styles.trashRow}>
                  <span className={styles.trashTitle}>{title}</span>
                  <span className={styles.trashMeta}>
                    <span className={daysLeft <= 7 ? styles.trashDaysLeft : ""}>
                      {daysLeft}
                    </span>
                    {" "}<T k="admin.posts.trashDaysLeft" />
                  </span>
                  <button
                    type="button"
                    className={styles.trashRestoreBtn}
                    onClick={() => handleRestore(post.id)}
                  >
                    <T k="admin.posts.trashRestore" />
                  </button>
                  <button
                    type="button"
                    className={styles.trashPurgeBtn}
                    onClick={() => handlePurge(post.id, title)}
                  >
                    <T k="admin.posts.trashPurge" />
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

  /* ── Series Section ── */
  const seriesSection = (
    <div className={styles.seriesSection}>
      <div className={styles.seriesHeader}>
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
        <a
          href="/admin/settings?tab=content&sub=posts"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.seriesNewBtn}
        >
          <T k="admin.posts.newSeries" />
        </a>
      </div>

      <div className={`${styles.trashContent} ${seriesOpen ? styles.trashContentOpen : ""}`}>
        <div>
        <div className={styles.subFilterBar}>
          <Select
            value={String(seriesPerPage)}
            options={[
              { value: "5", label: "5" },
              { value: "10", label: "10" },
              { value: "20", label: "20" },
            ]}
            onChange={(v) => { setSeriesPerPage(Number(v)); setSeriesPage(1); }}
            className={styles.subPageSize}
          />
          <Select
            value={seriesSort}
            options={[
              { value: "newest", label: t("admin.posts.sortNewest") },
              { value: "oldest", label: t("admin.posts.sortOldest") },
              { value: "name", label: t("admin.posts.sortName") },
            ]}
            onChange={(v) => setSeriesSort(v as "newest" | "oldest" | "name")}
            className={styles.subFilterSelect}
          />
          <Select
            value={seriesFilter}
            options={[
              { value: "", label: t("admin.posts.filterAll") },
              { value: "published", label: t("admin.posts.filterPublished") },
              { value: "draft", label: t("admin.posts.filterDraft") },
            ]}
            onChange={(v) => setSeriesFilter(v as "" | "published" | "draft")}
            className={styles.subFilterSelect}
          />
          <div className={`${styles.searchGroup} ${styles.searchGroupRight}`}>
            <Select
              value={seriesSearchType}
              options={[
                { value: "all", label: t("admin.posts.searchAll") },
                { value: "title", label: t("admin.posts.searchTitle") },
                { value: "content", label: t("admin.posts.searchContent") },
              ]}
              onChange={(v) => setSeriesSearchType(v as "all" | "title" | "content")}
              className={styles.subFilterSelect}
            />
            <input
              type="text"
              placeholder={t("admin.posts.seriesSearch")}
              value={seriesSearch}
              onChange={(e) => setSeriesSearch(e.target.value)}
              className={styles.subFilterInput}
            />
          </div>
        </div>
        {seriesLoading ? (
          <ul className={styles.seriesList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className={styles.seriesRow}>
                <span className={styles.seriesRowThumb}>
                  <Skeleton width={96} height={56} borderRadius="var(--radius-sm)" />
                </span>
                <span className={styles.seriesRowLink} style={{ flex: 1, gap: "var(--spacing-2xs)", display: "flex", flexDirection: "column" }}>
                  <SkeletonLine width="60%" height={14} />
                  <SkeletonLine width="40%" height={12} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
        <ul className={styles.seriesList}>
          {filteredSeries.slice((seriesPage - 1) * seriesPerPage, seriesPage * seriesPerPage).map((s) => (
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
        )}
        {(() => {
          const tp = Math.max(1, Math.ceil(filteredSeries.length / seriesPerPage));
          return (
            <div className={styles.seriesPaging}>
              <button type="button" className={styles.seriesPageBtn} disabled={seriesPage <= 1} onClick={() => setSeriesPage(1)}><ChevronFirst /></button>
              <button type="button" className={styles.seriesPageBtn} disabled={seriesPage <= 1} onClick={() => setSeriesPage((p) => p - 1)}><ChevronPrev /></button>
              <span className={`${styles.seriesPageBtn} ${styles.seriesPageBtnActive}`}>{seriesPage}</span>
              <button type="button" className={styles.seriesPageBtn} disabled={seriesPage >= tp} onClick={() => setSeriesPage((p) => p + 1)}><ChevronNext /></button>
              <button type="button" className={styles.seriesPageBtn} disabled={seriesPage >= tp} onClick={() => setSeriesPage(tp)}><ChevronLast /></button>
            </div>
          );
        })()}
        </div>
      </div>

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
      headerExtra={
        <>
          <input ref={mdInputRef} type="file" accept=".md" multiple hidden onChange={handleMdUpload} />
          <button className={shell.newBtn} onClick={() => mdInputRef.current?.click()} disabled={uploading}>
            {uploading ? "..." : t("admin.posts.uploadMd")}
          </button>
        </>
      }
      beforeTable={!loading ? seriesSection : undefined}
      afterTable={!loading ? trashSection : undefined}
    >
      {/* Filter bar */}
      <div className={shell.filterBar}>
        <Select
          value={String(perPage)}
          options={PAGE_SIZE_OPTIONS}
          onChange={(v) => { setPerPage(Number(v)); setPage(1); }}
          className={`${shell.filterPageSize} ${styles.filterPageSizeLeft}`}
        />
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
            onClick={() => { setSearch(""); setSearchType("all"); setSort("newest"); setFilterCategory(""); setFilterSeries(""); setPage(1); }}
          >
            {t("admin.posts.resetFilters")}
          </button>
        )}
        <div className={`${styles.searchGroup} ${styles.searchGroupRight}`}>
          <Select
            value={searchType}
            options={[
              { value: "all", label: t("admin.posts.searchAll") },
              { value: "title", label: t("admin.posts.searchTitle") },
              { value: "content", label: t("admin.posts.searchContent") },
            ]}
            onChange={(v) => { setSearchType(v); setPage(1); }}
            className={styles.searchTypeSelect}
          />
          <input
            type="text"
            placeholder={t("admin.posts.search")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={styles.searchInput}
          />
        </div>
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
