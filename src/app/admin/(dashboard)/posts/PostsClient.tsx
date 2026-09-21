"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { LocalizedText } from "@/types/common";
import type { GithubImportResponse } from "@/types";
import { QUERY_PARAM } from "@/constants";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import { Upload, Plus, Download } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import Button from "@/components/ui/Button";
import ButtonGroup from "@/components/ui/ButtonGroup";
import HelpButton from "@/components/ui/HelpButton";
import type { Post, Series } from "@/types/post";
import { formatPostTitle } from "@/utils/post";
import { downloadBlob, downloadFiles } from "@/utils/download";
import { useCategories } from "@/hooks/useCategories";
import { flattenCategories, toCategoryOptions } from "@/lib/categoryTree";
import { usePreviewTooltip } from "@/hooks/usePreviewTooltip";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useMyRole } from "@/hooks/useMyRole";
import AdminListShell, {
  adminShellStyles as shell,
} from "@/components/admin/AdminListShell";
import AdminTable from "@/components/admin/AdminTable/AdminTable";
import StickyGlassBar from "@/components/admin/StickyGlassBar/StickyGlassBar";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { parseMdPost } from "@/utils/mdParser";
import { uploadRandomCover } from "@/utils/uploadRandomCover";
import { sendAction, sendActions, notifyFailures, tryRequest } from "@/lib/sendAction";
import { CodedError } from "@/lib/apiError";
import SeriesPanel from "./_components/SeriesPanel";
import TrashPanel from "./_components/TrashPanel";
import { searchTypeOptions, pageSizeOptions } from "./_components/subTableControls";
import PreviewTooltip from "./_components/PreviewTooltip";
import { createPostColumns } from "./_columns";
import styles from "./AdminPosts.module.css";

/* 클릭 시에만 뜨는 모달들 — 초기 번들에서 빼고 열릴 때 받는다 */
const AccessRequestModal = dynamic(() => import("@/components/admin/AccessRequestModal"));
const BulkCategoryModal = dynamic(() => import("@/components/admin/BulkCategoryModal"));
const MarkdownUploadGuide = dynamic(() => import("./_components/MarkdownUploadGuide"));
import Pressable from "@/components/ui/Pressable";

const PAGE_SIZE_OPTIONS = pageSizeOptions(10, 20, 50, 100);

interface PostsClientProps {
  /* 서버가 미리 그려 내려보낸 기본 뷰(필터 없음·최신순) 1페이지. 첫 조회를 건너뛰는 근거다. */
  initialPosts: Post[];
  initialTotalPages: number;
  initialPerPage: number;
}

export default function PostsClient({ initialPosts, initialTotalPages, initialPerPage }: PostsClientProps) {
  const { t, language } = useLanguage();
  const siteConf = useSiteConfig();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restoredId = searchParams.get("restored");
  const categories = useCategories();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  /* 제목 옆에 붙는 전체 개수 — 목록 응답이 세어 준다 */
  const [totalCount, setTotalCount] = useState(0);

  /* Filters & sort */
  const [search, setSearch] = useState("");
  /* 입력은 즉시 반영하되 조회는 디바운스한다 — 안 그러면 키 한 번마다 /api/posts 가 나간다 */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);
  const [searchType, setSearchType] = useState("all");
  const [syntaxMode, setSyntaxMode] = useState<"prefix" | "regex">("prefix");
  const [sort, setSort] = useState("newest");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSeries, setFilterSeries] = useState("");
  /* 작성자 필터. "__mine" 은 내 저자 프로필로 치환한다 — 자기 id 를 몰라도 고를 수 있게. */
  const [filterAuthor, setFilterAuthor] = useState("");
  /* 저자 목록은 이미 병합된 설정에서 읽는다.
     /api/admin/settings 는 저장된 원본({delta, savedDefaults})을 그대로 돌려줘서
     site.config 의 기본 저자(소유자)가 들어 있지 않다 — 그걸로 채우면 소유자가 빠진다. */
  const authors = useMemo(
    () => (siteConf.authors ?? []).map((a) => ({ id: a.id, name: a.name || a.id })),
    [siteConf.authors],
  );
  /* 초기값은 서버가 그 값으로 1페이지를 조회해 넘겨준 것과 같다 — SSR 데이터와 화면이 어긋나지 않게 prop 으로 받는다. */
  const [perPage, setPerPage] = useState(initialPerPage);
  const hasFilters = sort !== "newest" || filterCategory !== "" || filterSeries !== "" || filterAuthor !== "" || search;


  /* Preview tooltip */
  const {
    tooltip,
    handleRowHover,
    handleRowLeave,
    handleRowClick,
    handleImgError,
    hideTooltip,
  } = usePreviewTooltip<Post>("/admin/posts");

  /* 저자 등급은 자기 글만 다룰 수 있다 — 서버의 canEditPost·posts_admin_* 정책과 같은 규칙이다.
     여기서 거르는 것은 표시용이고, 인가 자체는 서버와 정책이 한다. */
  const myRole = useMyRole();
  const canEdit = (p: Post) => myRole.canEditPost(p.author_ids);

  /* 편집할 수 없는 글로 들어가면 편집기가 403 화면을 띄운다. 들어가기 전에 이유를 알린다. */
  const guardedRowClick = (p: Post, e: React.MouseEvent) => {
    if (guardWritable([p])) handleRowClick(p, e);
  };

  /**
   * 권한이 없는 글이 대상에 섞여 있으면 작업을 멈추고 이유를 알린다.
   *
   * 서버가 막고 있으므로 그냥 보내도 데이터는 안전하다. 다만 일괄 작업은 항목마다 따로 요청이
   * 나가서, 막힌 것만 조용히 빠지고 화면은 성공한 것처럼 보인다. 무엇이 왜 안 됐는지
   * 알 수 없는 상태가 되므로 보내기 전에 세운다.
   *
   * @returns 진행해도 되면 true
   */
  const guardWritable = (targets: Post[]): boolean => {
    if (myRole.loading) return false;
    const blocked = targets.filter((p) => !canEdit(p));
    if (blocked.length === 0) return true;
    openDeniedModal(blocked);
    return false;
  };

  /** 권한 없음 안내 — 소유자에게 요청까지 여기서 보낼 수 있다. */
  const openDeniedModal = (blocked: Post[]) => {
    openModal(
      <AccessRequestModal
        targets={blocked.map((p) => ({ id: p.id, title: formatPostTitle(p) || t("admin.posts.untitled") }))}
      />,
      { id: "no-permission", header: { title: t("admin.posts.noPermissionTitle") }, closeButton: true, width: "440px" },
    );
  };

  /* handleTogglePublished 는 useCallback 이라 guardWritable 을 의존성에 넣으면 매 렌더 재생성된다.
     ref 로 최신 함수만 참조한다. */
  const guardWritableRef = useRef<(post: Post) => boolean>(() => false);
  /* 쓰기는 렌더가 끝난 뒤에 한다 — 렌더 중에 ref 를 건드리면 동시 렌더에서 값이 엇갈린다. */
  useEffect(() => {
    guardWritableRef.current = (post) => guardWritable([post]);
  });

  /** id 목록을 현재 목록/휴지통에서 Post 로 되돌린다 — 일괄 작업이 id 만 넘기기 때문. */
  const postsByIds = (ids: string[]): Post[] => {
    return ids.map((id) => posts.find((p) => p.id === id)).filter((p): p is Post => Boolean(p));
  };

  /* Series */
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);

  /* Trash */
  const [trashPosts, setTrashPosts] = useState<Post[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  /* 실제 쿼리에 쓰는 author 값. myRole.authorId 는 "__mine" 필터일 때만 쓰이므로,
     기본(filterAuthor="") 로드에서 role 이 늦게 와도 fetchPosts 가 재실행되지 않게 이 값만 의존한다.
     (전엔 myRole.authorId 를 직접 의존해, 안 쓰이는데도 role 로드 시 목록이 한 번 더 fetch 됐다) */
  const effectiveAuthor = filterAuthor === "__mine" ? (myRole.authorId ?? "") : filterAuthor;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      all: "true",
      page: String(page),
      limit: String(perPage),
      sort,
    });
    if (filterCategory) params.set(QUERY_PARAM.category, filterCategory);
    if (filterSeries) params.set("series_id", filterSeries);
    if (effectiveAuthor) params.set("author", effectiveAuthor);
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
      params.set("searchType", searchType);
      params.set("syntaxMode", syntaxMode);
    }
    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotalPages(data.totalPages ?? 1);
    setTotalCount(data.total ?? data.posts?.length ?? 0);
    setLoading(false);
  }, [page, perPage, sort, filterCategory, filterSeries, effectiveAuthor, debouncedSearch, searchType, syntaxMode]);

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
    for (const body of posts) {
      if (!body.cover_image) {
        const url = await uploadRandomCover();
        if (url) body.cover_image = url;
      }
    }
    /* 예전처럼 하나씩 차례로 만든다. 만들지 못한 파일은 알림으로 알린다(#868) */
    const created = await sendActions(
      posts.map((body) => ({ input: "/api/posts", init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } })),
      t, t("admin.common.importFailed"), { sequential: true },
    );
    setUploading(false);
    if (created > 0) fetchPosts();
  }, [fetchPosts, t]);

  // 새 카테고리를 site_config에 추가
  const addNewCategories = useCallback(async (newCats: string[]) => {
    const res = await sendAction("/api/admin/settings", undefined, t, t("admin.common.categoryAddFailed"));
    if (!res) return;
    const { config } = await res.json();
    const existing = (config.posts?.categories ?? []) as LocalizedText[];
    const updated = [...existing, ...newCats.map((c) => ({ ko: c, en: c }))];
    await sendAction("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: { ...config, posts: { ...config.posts, categories: updated } } }),
    }, t, t("admin.common.categoryAddFailed"));
  }, [t]);

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

  /* 전체 내보내기는 막지 않는다 — 서버가 세션 클라이언트로 조회하므로 볼 수 있는 글만 나간다. */
  const handleExportAll = useCallback(async () => {
    setExporting(true);
    try {
      const res = await sendAction("/api/posts/export?all=true", undefined, t, t("admin.common.exportFailed"));
      if (!res) return;
      const { files } = await res.json() as GithubImportResponse;
      await downloadFiles(files);
    } finally {
      setExporting(false);
    }
  }, [t]);

  const fetchTrash = useCallback(async () => {
    setTrashLoading(true);
    const res = await fetch("/api/posts?trash=true&limit=100");
    const data = await res.json();
    setTrashPosts(data.posts ?? []);
    setTrashLoading(false);
  }, []);

  /* 개수는 펼치기 전에도 보여야 한다 — 접힌 머리줄에 "휴지통 N" 으로 찍힌다. 예전에는 펼칠 때만
     불러서 열기 전에는 늘 비어 보였다(작업물 목록은 처음부터 부른다).
     여기서는 목록만 채운다 — 불러오는 표시는 펼칠 때만 쓰므로 건드리지 않는다 */
  useEffect(() => {
    let alive = true;
    fetch("/api/posts?trash=true&limit=100")
      .then((r) => r.json())
      .then((d) => { if (alive) setTrashPosts(d.posts ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  /* 시리즈는 검색·필터와 무관하다 — 목록 조회에 묶으면 키 입력마다 함께 다시 불린다.
     같은 effect 안에서 ref 로 한 번만 부른다(effect 를 쪼개지 않아 불필요한 리렌더도 없다). */
  const seriesLoadedRef = useRef(false);
  /* 첫 조회는 서버가 이미 initialPosts 로 그려 내려보냈으니 건너뛴다. 이후 필터·정렬·페이지가
     바뀌어 fetchPosts 정체성이 달라질 때만 다시 부른다(기본 뷰에선 role 이 늦게 와도 안 바뀐다). */
  const skipFirstFetch = useRef(true);
  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
    } else {
      fetchPosts();
    }
    if (!seriesLoadedRef.current) { seriesLoadedRef.current = true; fetchSeries(); }
  }, [fetchPosts, fetchSeries]);



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
      if (!(await sendAction(`/api/posts/${id}`, { method: "DELETE" }, t, t("admin.common.deleteFailed")))) return;
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





  /* ── Table columns ── */
  // 상태 배지 클릭 → 발행/미발행 토글 (낙관적 업데이트, 실패 시 롤백)
  const handleTogglePublished = useCallback(async (post: Post) => {
    const next = !post.published;
    if (!guardWritableRef.current(post)) return;
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, published: next } : p)));
    const res = await sendAction(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: next }),
    }, t, t("admin.common.publishFailed"));
    if (!res) setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, published: post.published } : p)));
  }, [t]);

  const columns = useMemo(() => createPostColumns(t, handleTogglePublished), [t, handleTogglePublished]);

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
      noPermission: t("admin.posts.noPermissionRow"),
    }),
    [t],
  );



  // 시리즈/휴지통 섹션은 posts loading 과 무관(자체 loading 스켈레톤 보유) → AdminListShell 에 항상 렌더한다.
  // (예전엔 !loading 조건으로 가려서, perPage 변경 등 메인 테이블 reload 시 펼쳐진 섹션이 사라져 레이아웃이 크게 점프했다)

  return (
    <SearchHighlightProvider query={search} mode={syntaxMode}>
    <div style={{ position: "relative" }}>
    {busy && <div className={styles.busyOverlay}><span className={styles.busySpinner} /></div>}
    <AdminListShell
      title={`${t("admin.posts.title")} (${totalCount})`}
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
                <MarkdownUploadGuide />,
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
      beforeTable={
        <SeriesPanel
          seriesList={seriesList}
          loading={seriesLoading}
          busy={busy}
          setBusy={setBusy}
          onRefresh={fetchSeries}
          onDeleted={() => {
            fetchSeries();
            fetchPosts();
            if (trashOpen) fetchTrash();
          }}
        />
      }
      afterTable={
        <TrashPanel
          posts={trashPosts}
          loading={trashLoading}
          open={trashOpen}
          onToggle={() => { if (!trashOpen) fetchTrash(); setTrashOpen((v) => !v); }}
          busy={busy}
          setBusy={setBusy}
          onRefresh={fetchTrash}
          onRestored={() => { fetchTrash(); fetchPosts(); }}
          onRowHover={handleRowHover}
          onRowLeave={handleRowLeave}
          hideTooltip={hideTooltip}
        />
      }
    >
      {/* Filter bar — sort + filters + perPage 좌측, 검색은 우측 끝 (margin-left:auto) */}
      <StickyGlassBar className={shell.filterBar}>
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
        <Select
          value={filterAuthor}
          options={[
            { value: "", label: t("admin.posts.allAuthors") },
            { value: "__mine", label: t("admin.posts.myPosts") },
            ...authors.map((a) => ({ value: a.id, label: a.name })),
          ]}
          onChange={(v) => { setFilterAuthor(v); setPage(1); }}
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
          <Pressable
            className={shell.filterReset}
            onClick={() => { setSearch(""); setSearchType("all"); setSort("newest"); setFilterCategory(""); setFilterSeries(""); setFilterAuthor(""); setPage(1); }}
          >
            {t("admin.posts.resetFilters")}
          </Pressable>
        )}
        <SearchCapsule
          typeSelector={{
            value: searchType,
            options: searchTypeOptions(t),
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
      </StickyGlassBar>

      <AdminTable<Post>
        items={posts}
        columns={columns}
        editBasePath="/admin/posts"
        getTitle={(p) => formatPostTitle(p) || t("admin.posts.untitled")}
        onDelete={async (id) => {
          if (!guardWritable(postsByIds([id]))) return;
          await handleDelete(id);
        }}
        onBulkExport={async (ids) => {
          if (!guardWritable(postsByIds(ids))) return;
          const failures: CodedError[] = [];
          for (const id of ids) {
            const res = await tryRequest(`/api/posts/export?id=${id}`);
            if (res instanceof CodedError) {
              failures.push(res);
              continue;
            }
            const text = await res.text();
            const disposition = res.headers.get("Content-Disposition") ?? "";
            const match = disposition.match(/filename="(.+)"/);
            const fileName = match?.[1] ?? `${id}.md`;
            downloadBlob(text, fileName);
            await new Promise((r) => setTimeout(r, 100));
          }
          notifyFailures(failures, ids.length, t, t("admin.common.exportFailed"));
        }}
        onBulkDelete={async (ids) => {
          if (!guardWritable(postsByIds(ids))) return;
          setBusy(true);
          await sendActions(ids.map((id) => ({ input: `/api/posts/${id}`, init: { method: "DELETE" } })), t, t("admin.common.deleteFailed"));
          await fetchPosts();
          if (trashOpen) await fetchTrash();
          setBusy(false);
        }}
        onBulkPublish={async (ids, published) => {
          if (!guardWritable(postsByIds(ids))) return;
          setBusy(true);
          await sendActions(
            ids.map((id) => ({ input: `/api/posts/${id}`, init: { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published }) } })),
            t, t("admin.common.publishFailed"),
          );
          await fetchPosts();
          setBusy(false);
        }}
        extraBulkActions={[
          {
            label: t("admin.common.changeCategory"),
            disabled: busy,
            onClick: (ids) => {
              if (!guardWritable(postsByIds(ids))) return;
              openModal(
                <BulkCategoryModal
                  count={ids.length}
                  categories={categories}
                  onConfirm={async (cat) => {
                    setBusy(true);
                    await sendActions(
                      ids.map((id) => ({ input: `/api/posts/${id}`, init: { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: cat?.ko ?? null }) } })),
                      t, t("admin.common.categoryFailed"),
                    );
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
        onRowClick={guardedRowClick}
        rowDisabled={(p: Post) => !canEdit(p)}
        onDenied={(p: Post) => openDeniedModal([p])}
        highlightId={restoredId}
        footerExtra={
          <Button variant="ghost" size="xs" title={t("admin.posts.exportMdAll")} onClick={handleExportAll} disabled={exporting} soundDisabled icon={<Download size={14} />}>
            {exporting ? "..." : t("admin.posts.exportMdAll")}
          </Button>
        }
      />

      {/* Hover / Tap preview tooltip — key 가 바뀔 때마다 새로 그린다 */}
      <PreviewTooltip
        key={tooltip.key}
        post={tooltip.item}
        pos={tooltip.pos}
        imgError={tooltip.imgError}
        onImgError={handleImgError}
        onDismiss={hideTooltip}
        onNavigate={() => {
          const post = tooltip.item;
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
