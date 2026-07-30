"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { GithubImportResponse } from "@/types";
import { PREVIEW_KEY } from "@/constants";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import { Trash2, Upload, Plus, Download } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import ButtonGroup from "@/components/ui/ButtonGroup";
import HelpButton from "@/components/ui/HelpButton";
import type { Post, Series } from "@/types/post";
import { formatPostTitle } from "@/utils/post";
import { getTrashDaysLeft } from "@/utils/trash";
import { downloadBlob, downloadFiles } from "@/utils/download";
import { useCategories } from "@/hooks/useCategories";
import { flattenCategories, toCategoryOptions } from "@/lib/categoryTree";
import { usePreviewTooltip } from "@/hooks/usePreviewTooltip";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import AdminListShell, {
  adminShellStyles as shell,
} from "@/components/admin/AdminListShell";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import BulkCategoryModal from "@/components/admin/BulkCategoryModal";
import SubTable from "@/components/admin/SubTable/SubTable";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { parseMdPost } from "@/utils/mdParser";
import { uploadRandomCover } from "@/utils/uploadRandomCover";
import { PurgeModal, SeriesDeleteModal } from "./_components/PostModals";
import PreviewTooltip from "./_components/PreviewTooltip";
import { createPostColumns, createTrashColumns, createSeriesColumns } from "./_columns";
import styles from "./AdminPosts.module.css";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

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
  const [syntaxMode, setSyntaxMode] = useState<"prefix" | "regex">("prefix");
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
  const [seriesSort, setSeriesSort] = useState<"order" | "newest" | "oldest" | "name">("order");
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
      params.set("syntaxMode", syntaxMode);
    }
    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, perPage, sort, filterCategory, filterSeries, search, searchType, syntaxMode]);

  const fetchSeries = useCallback(async () => {
    setSeriesLoading(true);
    const res = await fetch("/api/series?all=true");
    const data = await res.json();
    setSeriesList(Array.isArray(data) ? data : []);
    setSeriesLoading(false);
  }, []);

  const mdInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { openModal, closeAll } = useModalStore();


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
  }, [fetchPosts]);

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
      parsed.push(parseMdPost(raw, file.name));
    }
    if (mdInputRef.current) mdInputRef.current.value = "";
    if (parsed.length === 0) return;

    // 새 카테고리 확인 — 트리 flatten (대분류/소분류 모두 기존으로 인식, 잘못된 신규 추가 방지)
    const existingCats = new Set(
      flattenCategories(categories).flatMap((c) => [c.ko, c.en]),
    );
    const newCats = [...new Set(parsed.map((p) => p.category as string).filter((c) => c && !existingCats.has(c)))];

    const doCreate = async () => {
      if (newCats.length > 0) await addNewCategories(newCats);
      await createPosts(parsed);
    };

    if (newCats.length > 0) {
      openModal(
        <ModalConfirm
          desc={`${t("admin.posts.newCategoriesFound")}\n\n${newCats.map((c) => `• ${c}`).join("\n")}\n\n${t("admin.posts.newCategoriesConfirm")}`}
          confirmText={t("admin.posts.createAndUpload")}
          onConfirm={() => { closeAll(); doCreate(); }}
        />,
        { header: { title: t("admin.posts.newCategories") }, closeButton: true, width: "400px" },
      );
    } else {
      doCreate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, fetchPosts, openModal, closeAll, addNewCategories, createPosts, t]);

  const handleExportAll = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/posts/export?all=true");
      if (!res.ok) return;
      const { files } = await res.json() as GithubImportResponse;
      await downloadFiles(files);
    } finally {
      setExporting(false);
    }
  }, []);

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
    if (seriesSort === "order") list.sort((a, b) => a.sort_order - b.sort_order);
    else if (seriesSort === "newest") list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
  // 인기글 — score top 5 (view + like*3 + comments*5). lib/popularity 단일 소스.
  // mount 시 fetch + 삭제 후 갱신.
  const [popularIds, setPopularIds] = useState<Set<string>>(new Set());
  const fetchPopularIds = useCallback(async () => {
    const res = await fetch("/api/posts/popular-ids?limit=5");
    if (!res.ok) return;
    const { ids } = await res.json();
    setPopularIds(new Set(ids ?? []));
  }, []);
  useEffect(() => { fetchPopularIds(); }, [fetchPopularIds]);

  const handleDelete = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    const doDelete = async () => {
      await fetch(`/api/posts/${id}`, { method: "DELETE" });
      fetchPosts();
      if (trashOpen) fetchTrash();
      fetchPopularIds();
    };
    if (popularIds.has(id)) {
      openModal(
        <ModalConfirm
          desc={t("admin.posts.popularDeleteDesc")
            .replace("{{views}}", String(post?.view_count ?? 0))
            .replace("{{likes}}", String(post?.like_count ?? 0))}
          confirmText={t("admin.posts.delete")}
          danger
          onConfirm={doDelete}
        />,
        { id: "popular-delete-confirm", header: { title: t("admin.posts.popularDeleteTitle") }, closeButton: true, width: "440px" },
      );
      return;
    }
    await doDelete();
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

  // 휴지통 보관 +30일 연장
  const handleExtend = async (id: string) => {
    await fetch(`/api/posts/${id}/extend-retention`, { method: "POST" });
    fetchTrash();
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
  const columns = useMemo(() => createPostColumns(t), [t]);

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
      exportItem: t("admin.posts.exportMd"),
    }),
    [t],
  );

  /* ── Trash Section ── */
  const trashIcon = <Trash2 size={13} />;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trashColumns = useMemo(() => createTrashColumns(t, getTrashDaysLeft, handleRestore, handlePurge, handleExtend), [t]);

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
        gridTemplate="28px 64px 1fr 200px 180px"
        selected={trashSelected}
        onSelectChange={setTrashSelected}
        bulkActions={[
          {
            label: <T k="admin.posts.trashRestore" />,
            disabled: busy,
            onClick: async () => {
              setBusy(true);
              await Promise.all([...trashSelected].map((id) => handleRestore(id)));
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
                  desc={t("admin.posts.trashPurgeConfirmBulk").replace("{{count}}", String(trashSelected.size))}
                  confirmText={t("admin.posts.trashPurge")}
                  onConfirm={async () => {
                    setBusy(true);
                    await Promise.all(
                      [...trashSelected].map((id) =>
                        fetch(`/api/posts/${id}/purge`, { method: "DELETE" }),
                      ),
                    );
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
          sessionStorage.setItem(PREVIEW_KEY.post, JSON.stringify({
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
          <div className={shell.filterBar}>
            <SegmentedControl
              items={[{ value: "date", label: t("admin.posts.sortDeletedAt") }]}
              value="date"
              sortDir={trashSort === "oldest" ? "asc" : "desc"}
              onChange={() => setTrashSort((p) => p === "newest" ? "oldest" : "newest")}
            />
            <SearchCapsule
              typeSelector={{
                value: trashSearchType,
                options: [
                  { value: "all", label: t("admin.posts.searchAll") },
                  { value: "title", label: t("admin.posts.searchTitle") },
                  { value: "content", label: t("admin.posts.searchContent") },
                ],
                onChange: (v) => setTrashSearchType(v as "all" | "title" | "content"),
              }}
              search={trashSearch}
              onSearchChange={setTrashSearch}
              placeholder={t("admin.posts.trashSearch")}
              className={shell.filterSearch}
            />
            <Select
              value={String(trashPerPage)}
              options={[{ value: "10", label: "10" }, { value: "20", label: "20" }, { value: "50", label: "50" }]}
              onChange={(v) => { setTrashPerPage(Number(v)); setTrashPage(1); }}
              className={shell.filterPageSize}
            />
          </div>
        }
      />
    </div>
  );

  /* ── Series Section ── */
  const handleExportSeries = useCallback(async (seriesId: string) => {
    const res = await fetch(`/api/posts/export?series_id=${seriesId}`);
    if (!res.ok) return;
    const { files } = await res.json() as GithubImportResponse;
    await downloadFiles(files);
  }, []);

  // 순서 인라인 편집 — order 정렬 + 검색/필터 없을 때만 (그 외엔 표시 순번이 sort_order 와 어긋나 혼란)
  const seriesReorder = useMemo(
    () =>
      seriesSort === "order" && !seriesSearch && seriesFilter === ""
        ? async (s: Series, newOrder: number) => {
            if (newOrder === s.sort_order) return;
            await fetch(`/api/series/${s.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sort_order: newOrder }),
            });
            await fetchSeries();
          }
        : undefined,
    [seriesSort, seriesSearch, seriesFilter, fetchSeries],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seriesColumns = useMemo(() => createSeriesColumns(t, handleDeleteSeries, handleExportSeries, language, categories, seriesReorder, seriesList.length), [t, language, categories, seriesReorder, seriesList.length]);

  // 시리즈/휴지통 섹션은 posts loading 과 무관(자체 loading 스켈레톤 보유) → AdminListShell 에 항상 렌더한다.
  // (예전엔 !loading 조건으로 가려서, perPage 변경 등 메인 테이블 reload 시 펼쳐진 섹션이 사라져 레이아웃이 크게 점프했다)
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
        gridTemplate="28px 64px 1fr 80px 60px 80px 180px"
        selected={seriesSelected}
        onSelectChange={setSeriesSelected}
        bulkActions={[
          {
            label: t("admin.posts.exportMd"),
            disabled: busy,
            onClick: async () => {
              const ids = [...seriesSelected];
              for (const sid of ids) {
                const res = await fetch(`/api/posts/export?series_id=${sid}`);
                if (!res.ok) continue;
                const { files } = await res.json() as GithubImportResponse;
                await downloadFiles(files);
              }
            },
          },
          {
            label: t("admin.posts.delete"),
            disabled: busy,
            onClick: () => {
              const ids = [...seriesSelected];
              openModal(
                <ModalConfirm
                  desc={t("admin.posts.seriesBulkDeleteConfirm").replace("{{count}}", String(ids.length))}
                  confirmText={t("admin.posts.delete")}
                  onConfirm={async () => {
                    setBusy(true);
                    await Promise.all(ids.map((id) => fetch(`/api/series/${id}`, { method: "DELETE" })));
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
          <div className={shell.filterBar}>
            <SegmentedControl
              items={[
                { value: "order", label: t("admin.posts.sortOrder") },
                { value: "date", label: t("admin.posts.sortDate") },
                { value: "name", label: t("admin.posts.sortName") },
              ]}
              value={seriesSort === "name" ? "name" : seriesSort === "order" ? "order" : "date"}
              sortDir={seriesSort === "oldest" ? "asc" : "desc"}
              onChange={(v) => {
                if (v === "order") setSeriesSort("order");
                else if (v === "name") setSeriesSort("name");
                else if (seriesSort === "newest") setSeriesSort("oldest");
                else if (seriesSort === "oldest") setSeriesSort("newest");
                else setSeriesSort("newest");
              }}
            />
            <Select
              value={seriesFilter}
              options={[
                { value: "", label: t("admin.posts.filterAll") },
                { value: "published", label: t("admin.posts.filterPublished") },
                { value: "draft", label: t("admin.posts.filterDraft") },
              ]}
              onChange={(v) => setSeriesFilter(v as "" | "published" | "draft")}
              className={shell.filterItem}
            />
            <SearchCapsule
              typeSelector={{
                value: seriesSearchType,
                options: [
                  { value: "all", label: t("admin.posts.searchAll") },
                  { value: "title", label: t("admin.posts.searchTitle") },
                  { value: "content", label: t("admin.posts.searchContent") },
                ],
                onChange: (v) => setSeriesSearchType(v as "all" | "title" | "content"),
              }}
              search={seriesSearch}
              onSearchChange={setSeriesSearch}
              placeholder={t("admin.posts.seriesSearch")}
              className={shell.filterSearch}
            />
            <Select
              value={String(seriesPerPage)}
              options={[{ value: "5", label: "5" }, { value: "10", label: "10" }, { value: "20", label: "20" }]}
              onChange={(v) => { setSeriesPerPage(Number(v)); setSeriesPage(1); }}
              className={shell.filterPageSize}
            />
          </div>
        }
      />
    </div>
  );

  return (
    <SearchHighlightProvider query={search} mode={syntaxMode}>
    <div style={{ position: "relative" }}>
    {busy && <div className={styles.busyOverlay}><span className={styles.busySpinner} /></div>}
    <AdminListShell
      title={t("admin.posts.title")}
      newHref="/admin/posts/new"
      newLabel={t("admin.posts.newPost")}
      headerExtra={
        <>
          <input ref={mdInputRef} type="file" accept=".md" multiple hidden onChange={handleMdUpload} />
          <HelpButton
            title={t("admin.posts.uploadGuide")}
            aria-label={t("admin.posts.uploadGuide")}
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
          />
          <ButtonGroup>
            <Button variant="outline" size="xs" title={t("admin.posts.uploadMd")} onClick={() => mdInputRef.current?.click()} disabled={uploading} soundDisabled icon={<Upload size={14} />}>
              {uploading ? "..." : t("admin.posts.uploadMd")}
            </Button>
            <Button variant="primary" size="xs" title={t("admin.posts.newPost")} href="/admin/posts/new" soundDisabled icon={<Plus size={14} strokeWidth={1.5} />}>
              {t("admin.posts.newPost")}
            </Button>
          </ButtonGroup>
        </>
      }
      beforeTable={seriesSection}
      afterTable={trashSection}
    >
      {/* Filter bar — sort + filters + perPage 좌측, 검색은 우측 끝 (margin-left:auto) */}
      <div className={shell.filterBar}>
        <SegmentedControl
          items={[
            { value: "date", label: t("admin.posts.sortDate") },
            { value: "popular", label: t("admin.posts.sortPopular") },
          ]}
          value={sort === "popular" ? "popular" : "date"}
          sortDir={sort === "oldest" ? "asc" : "desc"}
          onChange={(v) => {
            if (v === "date") {
              if (sort === "newest") setSort("oldest");
              else if (sort === "oldest") setSort("newest");
              else setSort("newest");
            } else {
              setSort("popular");
            }
            setPage(1);
          }}
        />
        <Select
          value={filterCategory}
          options={[
            { value: "", label: t("admin.posts.allCategories") },
            ...toCategoryOptions(categories, language === "ko" ? "ko" : "en"),
          ]}
          onChange={(v) => { setFilterCategory(v); setPage(1); }}
          className={shell.filterItem}
        />
        <div className={shell.filterItem}>
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
            width="full"
          />
        </div>
        {hasFilters && (
          <button
            className={shell.filterReset}
            onClick={() => { setSearch(""); setSearchType("all"); setSort("newest"); setFilterCategory(""); setFilterSeries(""); setPage(1); }}
          >
            {t("admin.posts.resetFilters")}
          </button>
        )}
        <SearchCapsule
          typeSelector={{
            value: searchType,
            options: [
              { value: "all", label: t("admin.posts.searchAll") },
              { value: "title", label: t("admin.posts.searchTitle") },
              { value: "content", label: t("admin.posts.searchContent") },
            ],
            onChange: (v) => { setSearchType(v); setPage(1); },
          }}
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          placeholder={t("admin.posts.search")}
          align="left"
          className={shell.filterSearch}
          onSearchOptionsChange={(opts) => setSyntaxMode(opts.syntaxMode)}
        />
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
        onDelete={handleDelete}
        onBulkExport={async (ids) => {
          for (const id of ids) {
            const res = await fetch(`/api/posts/export?id=${id}`);
            if (!res.ok) continue;
            const text = await res.text();
            const disposition = res.headers.get("Content-Disposition") ?? "";
            const match = disposition.match(/filename="(.+)"/);
            const fileName = match?.[1] ?? `${id}.md`;
            downloadBlob(text, fileName);
            await new Promise((r) => setTimeout(r, 100));
          }
        }}
        onBulkDelete={async (ids) => {
          setBusy(true);
          await Promise.all(ids.map((id) => fetch(`/api/posts/${id}`, { method: "DELETE" })));
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
        extraBulkActions={[
          {
            label: t("admin.common.changeCategory"),
            disabled: busy,
            onClick: (ids) => {
              openModal(
                <BulkCategoryModal
                  count={ids.length}
                  categories={categories}
                  onConfirm={async (cat) => {
                    setBusy(true);
                    await Promise.all(ids.map((id) =>
                      fetch(`/api/posts/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ category: cat?.ko ?? null }),
                      })
                    ));
                    await fetchPosts();
                    setBusy(false);
                  }}
                />,
                { id: "bulk-category", header: { title: t("admin.common.changeCategory") }, closeButton: true, width: "400px" },
              );
            },
          },
        ]}
        gridTemplate="64px 1fr 40px 100px 60px 80px 180px"
        showRowNumbers
        getRowLabel={(p) => p.post_number ?? "—"}
        loading={loading}
        skeletonRows={perPage}
        emptyMessage={t("admin.posts.noPostsYet")}
        labels={labels}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowHover={handleRowHover}
        onRowLeave={handleRowLeave}
        onRowClick={handleRowClick}
        highlightId={restoredId}
        footerExtra={
          <Button variant="ghost" size="xs" title={t("admin.posts.exportMdAll")} onClick={handleExportAll} disabled={exporting} soundDisabled icon={<Download size={14} />}>
            {exporting ? "..." : t("admin.posts.exportMdAll")}
          </Button>
        }
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
    </SearchHighlightProvider>
  );
}
