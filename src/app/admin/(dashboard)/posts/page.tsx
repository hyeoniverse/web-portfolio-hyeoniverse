"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import type { Post, Series } from "@/types/post";
import { formatPostTitle } from "@/utils/post";
import { useCategories, translateCategory } from "@/hooks/useCategories";
import { usePreviewTooltip } from "@/hooks/usePreviewTooltip";
import Select from "@/components/ui/Select";
import AdminListShell, {
  adminShellStyles as shell,
} from "@/components/admin/AdminListShell";
import AdminTable, {
  adminTableStyles as ts,
  type AdminTableColumn,
} from "@/components/admin/AdminTable/AdminTable";
import Checkbox from "@/components/ui/Checkbox";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import SubTable, { subTableStyles as st, type SubTableColumn } from "@/components/admin/SubTable/SubTable";
import SearchCapsule from "@/components/admin/SearchCapsule/SearchCapsule";
import { presets } from "@/components/posts/CoverImagePicker/presets";
import styles from "./AdminPosts.module.css";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

function PurgeModal({ title, onConfirm }: { title: string; onConfirm: () => void }) {
  const { t } = useLanguage();
  const { closeAll } = useModalStore();
  const [input, setInput] = useState("");
  const valid = input === title;
  return (
    <div className={styles.seriesDeleteModal}>
      <p className={styles.seriesDeleteHint}>{t("admin.posts.trashPurgeHint")}</p>
      <input
        className={styles.seriesDeleteInput}
        type="text"
        placeholder={title}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && valid) { closeAll(); onConfirm(); } }}
      />
      <div className={styles.seriesDeleteActions}>
        <button className={styles.seriesDeleteCancel} onClick={closeAll}>{t("admin.posts.cancel")}</button>
        <button className={styles.seriesDeleteConfirm} disabled={!valid} onClick={() => { closeAll(); onConfirm(); }}>{t("admin.posts.trashPurge")}</button>
      </div>
    </div>
  );
}

function SeriesDeleteModal({ series, deletePostsRef, onConfirm }: {
  series: Series;
  deletePostsRef: { current: boolean };
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  const [withPosts, setWithPosts] = useState(false);
  const [input, setInput] = useState("");
  const { closeAll } = useModalStore();
  const valid = input === series.title;

  return (
    <div className={styles.seriesDeleteModal}>
      <p className={styles.seriesDeleteHint}>{t("admin.posts.seriesDeleteHint")}</p>
      <label className={styles.seriesDeleteCheck}>
        <Checkbox checked={withPosts} onChange={(v) => { setWithPosts(v); deletePostsRef.current = v; }} shape="square" />
        {t("admin.posts.seriesDeleteWithPosts")}
      </label>
      <input
        className={styles.seriesDeleteInput}
        type="text"
        placeholder={series.title}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && valid) { closeAll(); onConfirm(); } }}
      />
      <div className={styles.seriesDeleteActions}>
        <button className={styles.seriesDeleteCancel} onClick={closeAll}>{t("admin.posts.cancel")}</button>
        <button className={styles.seriesDeleteConfirm} disabled={!valid} onClick={() => { closeAll(); onConfirm(); }}>{t("admin.posts.delete")}</button>
      </div>
    </div>
  );
}


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
        <div className={shell.previewImage}>
          {post.cover_image && !imgError ? (
            <Image
              src={post.cover_image}
              alt=""
              width={280}
              height={140}
              className={shell.previewImg}
              unoptimized
              onError={onImgError}
            />
          ) : (
            <div className={shell.previewPlaceholder}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
        </div>
        <div className={shell.previewBody}>
          <p className={shell.previewTitle}>{formatPostTitle(post)}</p>
          <p className={shell.previewExcerpt} style={!post.excerpt ? { color: "var(--text-muted)", fontStyle: "italic" } : undefined}>{post.excerpt || "내용 없음"}</p>
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
  const searchParams = useSearchParams();
  const restoredId = searchParams.get("restored");
  const categories = useCategories();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* Filters & sort */
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSeries, setFilterSeries] = useState("");
  const [perPage, setPerPage] = useState(siteConf.posts.adminPerPage ?? 20);
  const hasFilters = sort !== "newest" || filterCategory !== "" || filterSeries !== "" || search;


  /* Preview tooltip */
  const {
    hoveredRef: hoveredPostRef,
    tooltipKey,
    tooltipPosRef,
    imgErrorRef,
    handleRowHover,
    handleRowLeave,
    handleRowClick,
    handleImgError,
    hideTooltip,
  } = usePreviewTooltip<Post>("/admin/posts");

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
  const [seriesSelected, setSeriesSelected] = useState<Set<string>>(new Set());

  /* Trash */
  const [trashPosts, setTrashPosts] = useState<Post[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashSelected, setTrashSelected] = useState<Set<string>>(new Set());
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

  const { openModal, closeAll } = useModalStore();

  // frontmatter 파싱
  const parseMdFile = (raw: string, fileName: string) => {
    let text = raw;
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
    const title = (meta.title as string) || fileName.replace(/\.md$/, "");
    const slug = ((meta.slug as string) || title).toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");
    const body: Record<string, unknown> = {
      title, slug, content: text, content_type: "markdown", published: false,
    };
    body.category = (meta.category as string) || "기타";
    if (meta.tags) body.tags = Array.isArray(meta.tags) ? meta.tags : [meta.tags];
    if (meta.excerpt) body.excerpt = meta.excerpt;
    if (meta.cover_image) body.cover_image = meta.cover_image;
    if (meta.date) {
      const d = new Date(meta.date as string);
      if (!isNaN(d.getTime())) body.created_at = d.toISOString();
    }
    return body;
  };

  // 프리셋 커버 렌더링 → 업로드 → URL 반환
  const uploadRandomCover = useCallback(async (): Promise<string | null> => {
    try {
      const preset = presets[Math.floor(Math.random() * presets.length)];
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      preset.render(ctx, 1200, 630);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return null;
      const formData = new FormData();
      formData.append("file", new File([blob], `cover-${preset.id}.png`, { type: "image/png" }));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url ?? null;
    } catch {
      return null;
    }
  }, []);

  // 포스트 일괄 생성
  const createPosts = useCallback(async (posts: Record<string, unknown>[]) => {
    setUploading(true);
    let created = 0;
    for (const body of posts) {
      if (!body.cover_image) {
        const url = await uploadRandomCover();
        if (url) body.cover_image = url;
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) created++;
    }
    setUploading(false);
    if (created > 0) fetchPosts();
  }, [fetchPosts, uploadRandomCover]);

  // 새 카테고리를 site_config에 추가
  const addNewCategories = useCallback(async (newCats: string[]) => {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) return;
    const { config } = await res.json();
    const existing = (config.posts?.categories ?? []) as { ko: string; en: string }[];
    const updated = [...existing, ...newCats.map((c) => ({ ko: c, en: c }))];
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: { ...config, posts: { ...config.posts, categories: updated } } }),
    });
  }, []);

  const handleMdUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 파일 파싱
    const parsed: Record<string, unknown>[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".md")) continue;
      const raw = await file.text();
      parsed.push(parseMdFile(raw, file.name));
    }
    if (mdInputRef.current) mdInputRef.current.value = "";
    if (parsed.length === 0) return;

    // 새 카테고리 확인
    const existingCats = new Set(categories.map((c) => c.ko));
    const newCats = [...new Set(parsed.map((p) => p.category as string).filter((c) => c && !existingCats.has(c)))];

    const doCreate = async () => {
      if (newCats.length > 0) await addNewCategories(newCats);
      await createPosts(parsed);
    };

    if (newCats.length > 0) {
      openModal(
        <ModalConfirm
          desc={`${t("admin.posts.newCategoriesFound")}\n\n${newCats.map((c) => `• ${c}`).join("\n")}\n\n${t("admin.posts.newCategoriesConfirm")}`}
          cancelText={t("admin.posts.cancel")}
          confirmText={t("admin.posts.createAndUpload")}
          onConfirm={() => { closeAll(); doCreate(); }}
          onCancel={() => closeAll()}
        />,
        { header: { title: t("admin.posts.newCategories") }, closeButton: true, width: "400px" },
      );
    } else {
      doCreate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, fetchPosts, openModal, closeAll, addNewCategories, createPosts, t]);

  const fetchTrash = useCallback(async () => {
    setTrashLoading(true);
    const res = await fetch("/api/posts?trash=true&limit=100");
    const data = await res.json();
    setTrashPosts(data.posts ?? []);
    setTrashLoading(false);
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

  const handlePurge = (id: string, title: string) => {
    openModal(
      <PurgeModal title={title} onConfirm={async () => { await fetch(`/api/posts/${id}/purge`, { method: "DELETE" }); fetchTrash(); }} />,
      { id: "purge-confirm", header: { title: `"${title}"` }, closeButton: true, width: "400px" },
    );
  };


  const handleDeleteSeries = (s: Series) => {
    const deletePostsRef = { current: false };
    openModal(
      <SeriesDeleteModal
        series={s}
        deletePostsRef={deletePostsRef}
        onConfirm={async () => {
          await fetch(`/api/series/${s.id}${deletePostsRef.current ? "?deletePosts=true" : ""}`, { method: "DELETE" });
          fetchSeries();
          fetchPosts();
          if (trashOpen) fetchTrash();
        }}
      />,
      { id: "series-delete", header: { title: `"${s.title}"` }, closeButton: true, width: "400px" },
    );
  };


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

  const trashIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );

  const trashColumns: SubTableColumn<Post>[] = useMemo(() => [
    {
      key: "num",
      label: "#",
      className: st.colMeta,
      render: (post) => <span>{post.post_number ?? "—"}</span>,
      skeletonWidth: "24px",
    },
    {
      key: "thumb",
      label: t("admin.posts.tableThumb"),
      className: st.colThumbWrap,
      render: (post) => (
        <div className={st.colThumb}>
          {post.cover_image ? (
            <Image src={post.cover_image} alt="" fill sizes="48px" className={st.thumbImg} unoptimized />
          ) : (
            <div className={st.thumbPlaceholder}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
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
      className: st.colTitle,
      render: (post) => formatPostTitle(post) || t("admin.posts.untitled"),
      skeletonWidth: "60%",
    },
    {
      key: "daysLeft",
      label: t("admin.posts.trashDaysLeftLabel"),
      className: st.colMeta,
      render: (post) => {
        const daysLeft = getDaysLeft(post.deleted_at!);
        return (
          <span className={st.colDaysLeft}>
            <span className={daysLeft <= 7 ? st.accentText : ""}>{daysLeft}<T k="admin.posts.trashDaysLeftUnit" /></span>
            <span className={st.colDaysSub}><T k="admin.posts.trashAutoDeleteShort" /></span>
          </span>
        );
      },
    },
    {
      key: "actions",
      label: t("admin.posts.actions"),
      className: st.colActions,
      render: (post) => (
        <>
          <button type="button" className={st.actionBtn} onClick={() => handleRestore(post.id)}>
            <T k="admin.posts.trashRestore" />
          </button>
          <button type="button" className={st.dangerBtn} onClick={() => handlePurge(post.id, formatPostTitle(post) || t("admin.posts.untitled"))}>
            <T k="admin.posts.trashPurge" />
          </button>
        </>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t]);

  const trashSection = (
    <div className={styles.trashSection}>
      <SubTable<Post>
        icon={trashIcon}
        title={<T k="admin.posts.trash" />}
        count={trashPosts.length}
        hint={<T k="admin.posts.trashAutoDelete" />}
        open={trashOpen}
        onToggle={() => { if (!trashOpen) fetchTrash(); setTrashOpen((v) => !v); }}
        allItems={filteredTrash}
        columns={trashColumns}
        gridTemplate="28px 64px 1fr 200px 160px"
        selected={trashSelected}
        onSelectChange={setTrashSelected}
        bulkActions={[
          {
            label: <T k="admin.posts.trashRestore" />,
            disabled: busy,
            onClick: async () => {
              setBusy(true);
              for (const id of trashSelected) await handleRestore(id);
              setTrashSelected(new Set());
              setBusy(false);
            },
          },
          {
            label: <T k="admin.posts.trashPurge" />,
            disabled: busy,
            onClick: () => {
              openModal(
                <ModalConfirm
                  desc={`${trashSelected.size}개 항목을 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
                  cancelText={t("admin.posts.cancel")}
                  confirmText={t("admin.posts.trashPurge")}
                  onConfirm={async () => {
                    setBusy(true);
                    for (const id of trashSelected) await fetch(`/api/posts/${id}/purge`, { method: "DELETE" });
                    await fetchTrash();
                    setTrashSelected(new Set());
                    setBusy(false);
                  }}
                />,
                { id: "bulk-purge", header: { title: t("admin.posts.trashPurge") }, closeButton: true, width: "400px" },
              );
            },
          },
        ]}
        page={trashPage}
        perPage={trashPerPage}
        onPageChange={setTrashPage}
        emptyMessage={t("admin.posts.trashEmpty")}
        loading={trashLoading}
        onRowHover={handleRowHover}
        onRowLeave={handleRowLeave}
        onRowClick={(post) => {
          hideTooltip();
          sessionStorage.setItem("post-preview", JSON.stringify({
            title: formatPostTitle(post) || t("admin.posts.untitled"),
            content: post.content || "",
            content_type: post.content_type || "markdown",
            cover_image: post.cover_image || "",
            excerpt: post.excerpt || "",
            tags: post.tags || [],
            _trashId: post.id,
          }));
          window.open("/admin/posts/preview", "_blank");
        }}
        filterBar={
          <div className={styles.subFilterBar}>
            <Select
              value={String(trashPerPage)}
              options={[{ value: "10", label: "10" }, { value: "20", label: "20" }, { value: "50", label: "50" }]}
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
            <SearchCapsule
              searchType={trashSearchType}
              searchTypeOptions={[
                { value: "all", label: t("admin.posts.searchAll") },
                { value: "title", label: t("admin.posts.searchTitle") },
                { value: "content", label: t("admin.posts.searchContent") },
              ]}
              onSearchTypeChange={(v) => setTrashSearchType(v as "all" | "title" | "content")}
              search={trashSearch}
              onSearchChange={setTrashSearch}
              placeholder={t("admin.posts.trashSearch")}
            />
          </div>
        }
      />
    </div>
  );

  /* ── Series Section ── */
  const seriesColumns: SubTableColumn<Series>[] = useMemo(() => [
    {
      key: "thumb",
      label: t("admin.posts.tableThumb"),
      className: st.colThumbWrap,
      render: (s) => (
        <div className={st.colThumb}>
          {s.cover_image ? (
            <Image src={s.cover_image} alt="" fill sizes="48px" unoptimized className={st.thumbImg} />
          ) : (
            <div className={st.thumbPlaceholder}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
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
      className: st.colTitle,
      render: (s) => (
        <a
          href={`/admin/settings?tab=content&sub=posts&series=${s.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.seriesRowLink}
        >
          {s.title || t("admin.posts.untitled")}
        </a>
      ),
      skeletonWidth: "60%",
    },
    {
      key: "category",
      label: t("admin.posts.tableCategory"),
      className: st.colMeta,
      render: (s) => s.category ? <span className={styles.seriesRowCat}>{s.category}</span> : <span>—</span>,
    },
    {
      key: "count",
      label: t("admin.posts.tablePostCount"),
      className: st.colMeta,
      render: (s) => <span>{s.post_count ?? 0}</span>,
    },
    {
      key: "status",
      label: t("admin.posts.tableStatus"),
      className: st.colMeta,
      render: (s) => (
        <span className={`${st.statusBadge} ${s.published ? st.published : st.draft}`}>
          {s.published ? <T k="admin.posts.published" /> : <T k="admin.posts.draft" />}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("admin.posts.actions"),
      className: st.colActions,
      render: (s) => (
        <>
          <a
            href={`/admin/settings?tab=content&sub=posts&series=${s.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={st.actionBtn}
          >
            <T k="admin.posts.edit" />
          </a>
          <button type="button" className={st.dangerBtn} onClick={() => handleDeleteSeries(s)}>
            <T k="admin.posts.delete" />
          </button>
        </>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t]);

  const seriesSection = (
    <div className={styles.seriesSection}>
      <SubTable<Series>
        title={<T k="admin.posts.series" />}
        count={seriesList.length}
        open={seriesOpen}
        onToggle={() => setSeriesOpen((v) => !v)}
        headerExtra={
          <a href="/admin/settings?tab=content&sub=posts" target="_blank" rel="noopener noreferrer" className={styles.seriesNewBtn}>
            <T k="admin.posts.newSeries" />
          </a>
        }
        allItems={filteredSeries}
        columns={seriesColumns}
        gridTemplate="92px 1fr 80px 60px 60px 160px"
        selected={seriesSelected}
        onSelectChange={setSeriesSelected}
        bulkActions={[
          {
            label: t("admin.posts.delete"),
            disabled: busy,
            onClick: () => {
              const ids = [...seriesSelected];
              openModal(
                <ModalConfirm
                  desc={`${ids.length}개 시리즈를 삭제합니다.`}
                  cancelText={t("admin.posts.cancel")}
                  confirmText={t("admin.posts.delete")}
                  onConfirm={async () => {
                    setBusy(true);
                    for (const id of ids) await fetch(`/api/series/${id}`, { method: "DELETE" });
                    await fetchSeries();
                    setSeriesSelected(new Set());
                    setBusy(false);
                  }}
                />,
                { id: "bulk-series-delete", header: { title: t("admin.posts.delete") }, closeButton: true, width: "400px" },
              );
            },
          },
        ]}
        page={seriesPage}
        perPage={seriesPerPage}
        onPageChange={setSeriesPage}
        emptyMessage={t("admin.posts.noSeriesYet")}
        loading={seriesLoading}
        filterBar={
          <div className={styles.subFilterBar}>
            <Select
              value={String(seriesPerPage)}
              options={[{ value: "5", label: "5" }, { value: "10", label: "10" }, { value: "20", label: "20" }]}
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
            <SearchCapsule
              searchType={seriesSearchType}
              searchTypeOptions={[
                { value: "all", label: t("admin.posts.searchAll") },
                { value: "title", label: t("admin.posts.searchTitle") },
                { value: "content", label: t("admin.posts.searchContent") },
              ]}
              onSearchTypeChange={(v) => setSeriesSearchType(v as "all" | "title" | "content")}
              search={seriesSearch}
              onSearchChange={setSeriesSearch}
              placeholder={t("admin.posts.seriesSearch")}
            />
          </div>
        }
      />
    </div>
  );

  return (
    <div style={{ position: "relative" }}>
    {busy && <div className={styles.busyOverlay}><span className={styles.busySpinner} /></div>}
    <AdminListShell
      title={t("admin.posts.title")}
      newHref="/admin/posts/new"
      newLabel={t("admin.posts.newPost")}
      headerExtra={
        <>
          <input ref={mdInputRef} type="file" accept=".md" multiple hidden onChange={handleMdUpload} />
          <button
            className={shell.helpBtn}
            title={t("admin.posts.uploadGuide")}
            onClick={() => {
              openModal(
                <div className={styles.uploadGuide}>
                  <h4>기본 사용법</h4>
                  <p><code>.md</code> 파일을 선택하면 각 파일이 <strong>비공개 초안</strong>으로 생성됩니다. 여러 파일을 한번에 선택할 수 있습니다.</p>
                  <ul>
                    <li>파일명이 포스트 제목으로 사용됩니다 (확장자 제외)</li>
                    <li>파일 내용이 마크다운 콘텐츠로 들어갑니다</li>
                    <li>발행 상태는 <strong>비공개(draft)</strong>로 설정됩니다</li>
                  </ul>

                  <h4>Frontmatter</h4>
                  <p>파일 상단에 YAML frontmatter를 작성하면 메타데이터가 자동 반영됩니다.</p>
                  <table>
                    <thead><tr><th>필드</th><th>타입</th><th>설명</th><th>기본값</th></tr></thead>
                    <tbody>
                      <tr><td><code>title</code></td><td>string</td><td>포스트 제목</td><td>파일명</td></tr>
                      <tr><td><code>slug</code></td><td>string</td><td>URL 슬러그</td><td>제목에서 자동 생성</td></tr>
                      <tr><td><code>category</code></td><td>string</td><td>카테고리</td><td>기타</td></tr>
                      <tr><td><code>tags</code></td><td>string[]</td><td>태그 목록 (예: [React, Next.js])</td><td>없음</td></tr>
                      <tr><td><code>excerpt</code></td><td>string</td><td>요약/발췌문</td><td>없음</td></tr>
                      <tr><td><code>cover_image</code></td><td>string</td><td>커버 이미지 URL</td><td>없음</td></tr>
                      <tr><td><code>date</code></td><td>string</td><td>작성일 (ISO 8601 또는 YYYY-MM-DD)</td><td>업로드 시점</td></tr>
                    </tbody>
                  </table>

                  <h4>예시 — 전체 형식</h4>
                  <pre><code>{`---
title: Next.js 15 마이그레이션 가이드
slug: nextjs-15-migration
category: Development
tags: [Next.js, React, Migration]
date: 2024-03-15
excerpt: Next.js 14에서 15로 마이그레이션 정리
---

## 개요

본문 내용...`}</code></pre>

                  <h4>날짜/태그 작성법</h4>
                  <pre><code>{`# 날짜
date: 2024-03-15
date: 2024-03-15T14:30:00+09:00

# 태그 — 배열 또는 단일
tags: [React, Next.js, TypeScript]
tags: React`}</code></pre>

                  <h4>GitHub Pages 마이그레이션</h4>
                  <p>Jekyll/Hugo 등 기존 블로그의 <code>_posts/</code> 디렉토리에서 <code>.md</code> 파일을 선택하면 <code>title</code>, <code>tags</code>, <code>categories</code> 필드가 자동 인식됩니다.</p>
                  <p className={styles.uploadGuideNote}>등록되지 않은 카테고리는 생성 여부를 확인합니다. Jekyll의 layout, permalink 등 미지원 필드는 무시됩니다.</p>
                </div>,
                { header: { title: t("admin.posts.uploadGuide") }, closeButton: true, width: "560px" },
              );
            }}
          >
            ?
          </button>
          <div className={shell.btnGroup}>
            <button className={shell.newBtn} onClick={() => mdInputRef.current?.click()} disabled={uploading} style={uploading ? { opacity: 0.5 } : undefined}>
              {uploading ? "..." : t("admin.posts.uploadMd")}
            </button>
            <a href="/admin/posts/new" className={shell.newBtn}>
              {t("admin.posts.newPost")}
            </a>
          </div>
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
        <SearchCapsule
          searchType={searchType}
          searchTypeOptions={[
            { value: "all", label: t("admin.posts.searchAll") },
            { value: "title", label: t("admin.posts.searchTitle") },
            { value: "content", label: t("admin.posts.searchContent") },
          ]}
          onSearchTypeChange={(v) => { setSearchType(v); setPage(1); }}
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          placeholder={t("admin.posts.search")}
        />
      </div>

      <AdminTable<Post>
        items={posts}
        columns={columns}
        editBasePath="/admin/posts"
        getTitle={(p) => formatPostTitle(p) || t("admin.posts.untitled")}
        onDelete={handleDelete}
        onBulkDelete={async (ids) => {
          setBusy(true);
          for (const id of ids) await fetch(`/api/posts/${id}`, { method: "DELETE" });
          await fetchPosts();
          if (trashOpen) await fetchTrash();
          setBusy(false);
        }}
        onBulkPublish={async (ids, published) => {
          setBusy(true);
          await Promise.all(ids.map((id) =>
            fetch(`/api/posts/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ published }),
            })
          ));
          await fetchPosts();
          setBusy(false);
        }}
        gridTemplate="64px 1fr 100px 100px 160px"
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
        highlightId={restoredId}
      />

      {/* Hover / Tap preview tooltip — reads from refs, keyed by tooltipKey */}
      <PreviewTooltip
        key={tooltipKey}
        post={hoveredPostRef.current}
        pos={tooltipPosRef.current}
        imgError={imgErrorRef.current}
        onImgError={handleImgError}
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
    </div>
  );
}
