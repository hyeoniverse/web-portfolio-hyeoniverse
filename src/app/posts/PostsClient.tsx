"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import { type CardType, getCardType } from "@/data/postsBentoTemplates";
import { SEARCH_DEBOUNCE_MS, QUERY_PARAM } from "@/constants";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import { useStickyFilterBar } from "@/hooks/useStickyFilterBar";
import type { Post } from "@/types/post";
import type { InitialPostsData } from "@/lib/posts";
import PostCard from "./_components/PostCard";
import PostsSubnav from "./_components/PostsSubnav";
import ScrollButtons from "@/components/ui/ScrollButtons/ScrollButtons";
import PostsFilterBar from "./_components/PostsFilterBar/PostsFilterBar";
import SeriesSection from "./_components/SeriesSection/SeriesSection";
import PostsBanner from "./_components/PostsBanner/PostsBanner";
import TagCloud3D from "./_components/TagCloud3D";
import PopularPosts from "./_components/PopularPosts";
import RandomPosts from "./_components/RandomPosts";
import RecentComments from "./_components/RecentComments";
import PostsSidebar from "./_components/PostsSidebar";
import PostsSkeletonCards from "./_components/PostsSkeletonCards";
import TimelineIndex from "./_components/TimelineIndex";
import TimelineMotionItem from "./_components/TimelineMotionItem";
import { useMasonryRowSpans } from "./_hooks/useMasonryRowSpans";
import { useTimeline } from "./_hooks/useTimeline";
import SegmentedControl from "@/components/ui/SegmentedControl";
import {
  LayoutGrid,
  Shuffle,
  Sparkles,
  List,
  History as HistoryIcon,
  SearchEmptyIcon,
} from "@/components/icons";
import PageTitle from "@/components/ui/PageTitle";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import Select from "@/components/ui/Select";
import styles from "./Posts.module.css";
import Pressable from "@/components/ui/Pressable";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10개씩" },
  { value: "20", label: "20개씩" },
  { value: "50", label: "50개씩" },
];

// Bento variants — 1-col (square/portrait/standard) + 2-col span (wide/banner).
// 그리드는 auto-fit 으로 col 수가 viewport 따라 변동 (각 col 약 220-300px 고정) → wide 도 절대 폭이 일정.

/* 태그 dropdown letter filter — 공통 LetterFilter 컴포넌트 사용 (constants/util import). */

interface PostsClientProps {
  initialData: InitialPostsData;
  /** history 모드 — /posts/history 전용. timeline 레이아웃 강제 + 필터/배너/시리즈/사이드바 숨김. */
  history?: boolean;
  /** 전체 아카이브 유효일 문자열(최신순) — 왼쪽 월 인덱스에 로드 여부와 무관하게 모든 월 표시 (history 전용). */
  archiveMonths?: string[];
}

export default function PostsClient({ initialData, history = false, archiveMonths }: PostsClientProps) {
  const { setInfinite, lenis, stop, start } = useLenis();
  // 타임라인 지그재그 단일컬럼 전환(640px) — 리빌 x 이동 on/off 판단용
  const { isMobile: tlSingleCol } = useIsMobile(640);
  const { t, language } = useLanguage();
  const siteConf = useSiteConfig();
  // 목록 카드 레이아웃 (설정) — magazine(기본)/grid/list/compact/masonry/featured. timeline 은 /posts/history 전용.
  const configLayout = (["magazine", "grid", "list", "compact", "masonry", "featured"].includes(siteConf.posts.layout)
    ? siteConf.posts.layout
    : "magazine");
  const postsLayout = (history ? "timeline" : configLayout) as "magazine" | "grid" | "list" | "compact" | "masonry" | "timeline" | "featured";
  // magazine 만 grid-auto-rows:1px 위 JS row-span(사이즈 변주 packing) 사용, 나머지는 미사용
  const usesRowSpan = postsLayout === "magazine";
  const layoutClass =
    postsLayout === "grid" ? styles.gridUniform
      : postsLayout === "list" ? styles.gridList
        : postsLayout === "compact" ? styles.gridCompact
          : postsLayout === "masonry" ? styles.gridMasonry
            : postsLayout === "timeline" ? styles.gridTimeline
              : postsLayout === "featured" ? styles.gridFeatured
                : ""; // magazine = base .grid
  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [pinnedPosts] = useState<Post[]>(initialData.pinnedPosts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<"all" | "title" | "content">(
    "all",
  );
  const [syntaxMode, setSyntaxMode] = useState<"prefix" | "regex">("prefix");
  // URL query (?tag=foo,bar / ?category=a,b CSV) 도착 시 초기값 sync — 다중 선택(OR)
  const urlSearchParams = useSearchParams();
  const [activeCategories, setActiveCategories] = useState<string[]>(() => {
    const raw = urlSearchParams?.get(QUERY_PARAM.category);
    return raw ? raw.split(",").map((c) => c.trim()).filter(Boolean) : [];
  });
  const activeCategoryKey = useMemo(
    () => [...activeCategories].sort().join(","),
    [activeCategories],
  );
  const [activeTags, setActiveTags] = useState<Set<string>>(() => {
    const raw = urlSearchParams?.get(QUERY_PARAM.tag);
    return new Set(
      raw
        ? raw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    );
  });
  const activeTagsKey = useMemo(
    () => Array.from(activeTags).sort().join(","),
    [activeTags],
  );
  const toggleActiveTag = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      // 모든 태그가 선택되면 = 필터 없음 → 클리어(전체)
      const all = initialData.allTags;
      if (all.length > 0 && all.every((t) => next.has(t.tag))) return new Set();
      return next;
    });
  }, [initialData.allTags]);
  const clearActiveTags = useCallback(() => setActiveTags(new Set()), []);
  const [allTags] = useState(initialData.allTags);
  // faceted 태그 — 현재 필터(카테고리·태그·시리즈·검색)에 매칭되는 글들의 태그+개수.
  // /api/posts 응답의 facets 로 갱신 (무필터 초기값은 전체 allTags).
  const [facetTags, setFacetTags] = useState<{ tag: string; count: number }[]>(
    () => initialData.allTags.map((t) => ({ tag: t.tag, count: t.count })),
  );
  const [extraCategories] = useState(initialData.extraCategories);
  const [sortBy, setSortBy] = useState<"date" | "popular" | "title" | "random" | "author">(
    "date",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // 작성자 — 2명 이상일 때만 필터/정렬 노출(1명이면 옵션이 무의미). 카드 표시는 무조건.
  const authors = siteConf.authors ?? [];
  const multiAuthor = authors.length >= 2;
  const [activeAuthor, setActiveAuthor] = useState<string | null>(() => urlSearchParams?.get("author") ?? null);
  // 타임라인 레이아웃은 월 그룹 마커라 시간순만 유효 — 다른 정렬이면 date 로 강제(마커 깨짐 방지).
  useEffect(() => {
    if (postsLayout === "timeline" && sortBy !== "date") setSortBy("date");
  }, [postsLayout, sortBy]);
  // popular 그룹 안 세부 메트릭 — 종합 / 조회 / 댓글 / 좋아요
  const [popularSort, setPopularSort] = useState<
    "score" | "views" | "comments" | "likes"
  >("score");
  const [randomSeed, setRandomSeed] = useState(() =>
    Math.floor(Math.random() * 1e9),
  );
  // API 호환 — sortBy=popular 면 popularSort 메트릭 매핑 (score/views/likes/comments)
  const sort:
    | "newest"
    | "oldest"
    | "popular"
    | "title"
    | "random"
    | "author"
    | "views"
    | "likes"
    | "comments" =
    sortBy === "popular"
      ? popularSort === "score"
        ? "popular"
        : popularSort
      : sortBy === "title"
        ? "title"
        : sortBy === "author"
          ? "author"
          : sortBy === "random"
            ? "random"
            : sortDir === "desc"
              ? "newest"
              : "oldest";
  const [perPage, setPerPage] = useState(siteConf.posts.perPage ?? 10);
  // /posts?series=<id> 로 진입 시(시리즈 카드 클릭) 해당 시리즈로 초기 필터
  const [activeSeries, setActiveSeries] = useState<string | null>(() => urlSearchParams?.get(QUERY_PARAM.series) ?? null);
  // 초기 page 값 URL 의 ?page= 에서 읽음 — 새로고침해도 같은 페이지 유지
  const [page, setPage] = useState(() => {
    const p = Number(urlSearchParams?.get(QUERY_PARAM.page));
    return Number.isFinite(p) && p >= 1 ? p : 1;
  });
  const [totalPages, setTotalPages] = useState(initialData.totalPages);

  // page 변경 시 URL 동기화 — replace 로 history 누적 방지. page=1 일 땐 param 제거(깔끔)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (page > 1) url.searchParams.set(QUERY_PARAM.page, String(page));
    else url.searchParams.delete(QUERY_PARAM.page);
    window.history.replaceState(null, "", url.toString());
  }, [page]);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [popularIds] = useState<Set<string>>(new Set(initialData.popularIds));
  const [showTags, setShowTags] = useState(false);
  const [catExpanded, setCatExpanded] = useState(false);
  const [isInitial, setIsInitial] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollCooldown = useRef(false);

  // Sticky filter bar — 공통 hook. cooldownRef 로 expand 직후 layout shift scroll 흡수
  const { sentinelRef, filterBarRef, isStuck, barHidden } = useStickyFilterBar({
    cooldownRef: scrollCooldown,
  });

  // tags/categories close-on-scroll 은 별도 effect 에서 처리 (threshold 큼) — bar hide 와는 분리

  // Apply blur to content area when expanded in stuck state (same technique as ContactDrawer)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const shouldBlur = isStuck && (showTags || catExpanded);
    if (shouldBlur) {
      el.style.filter = "blur(12px)";
      el.style.transition = "filter 0.3s ease";
    } else {
      el.style.filter = "";
      // keep transition so the un-blur also animates
      setTimeout(() => {
        el.style.transition = "";
      }, 300);
    }
  }, [isStuck, showTags, catExpanded]);

  // Cooldown: skip scroll-collapse briefly after expanding tags/categories
  useEffect(() => {
    if (!showTags && !catExpanded) return;
    scrollCooldown.current = true;
    const id = setTimeout(() => {
      scrollCooldown.current = false;
    }, 400);
    return () => clearTimeout(id);
  }, [showTags, catExpanded]);

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);

    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [setInfinite, lenis, stop, start]);

  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) {
      params.set("search", search);
      params.set("searchType", searchType);
      params.set("syntaxMode", syntaxMode);
    }
    if (activeCategoryKey) params.set(QUERY_PARAM.category, activeCategoryKey);
    if (activeTagsKey) params.set("tags", activeTagsKey);
    if (activeSeries) params.set("series_id", activeSeries);
    if (activeAuthor) params.set("author", activeAuthor);
    params.set(QUERY_PARAM.sort, sort);
    params.set("sortDir", sortDir);
    if (sort === "random") params.set("seed", String(randomSeed));
    params.set(QUERY_PARAM.page, String(page));
    params.set(QUERY_PARAM.limit, String(perPage));

    // 이전 pending 요청 cancel — 빠른 sort/필터 변경 시 race condition + 중복 카드 방지
    fetchAbortRef.current?.abort();
    const ac = new AbortController();
    fetchAbortRef.current = ac;

    try {
      const res = await fetch(`/api/posts?${params}`, { signal: ac.signal });
      const data = await res.json();
      // 응답 도착 시점에 이미 새 요청이 시작됐다면 무시 (stale write 방지)
      if (fetchAbortRef.current !== ac) return;
      const incoming = (data.posts ?? []) as Post[];
      // 타임라인(히스토리)은 무한 스크롤 — page>1 이면 이어붙임(중복 id 제거). 그 외엔 교체(페이지네이션).
      setPosts((prev) => {
        if (!(postsLayout === "timeline" && page > 1)) return incoming;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...incoming.filter((p) => !seen.has(p.id))];
      });
      setTotalPages(data.totalPages ?? 1);
      if (Array.isArray(data.facets)) setFacetTags(data.facets);
      setLoading(false);
      fetchAbortRef.current = null;
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setLoading(false);
    }
  }, [
    search,
    searchType,
    syntaxMode,
    activeCategoryKey,
    activeTagsKey,
    activeSeries,
    activeAuthor,
    sort,
    sortDir,
    randomSeed,
    page,
    perPage,
    postsLayout,
  ]);

  // 타임라인(history) — 월 인덱스 · 월 점프 · 무한 스크롤 sentinel · scroll-spy. monthKey/monthLabel 은 그리드 월 마커용.
  const {
    indexGroups: timelineIndexGroups,
    activeMonthKey,
    scrollToMonth,
    sentinelRef: timelineSentinelRef,
    monthKey,
    monthLabel,
  } = useTimeline({
    enabled: postsLayout === "timeline",
    history,
    archiveMonths,
    posts,
    page,
    totalPages,
    loading,
    setPage,
  });

  // Fetch posts when filters change (skip initial if page=1 — SSR 데이터가 page 1).
  // URL ?page=N (N>1) 으로 진입 시 SSR 데이터 없으므로 초기 mount 에도 fetch 필요.
  useEffect(() => {
    if (isInitial) {
      setIsInitial(false);
      // SSR initialData 는 필터 미적용 목록 — URL 로 필터(시리즈/태그)가 걸린 채 진입하면
      // page 1 이어도 다시 fetch 해야 필터가 반영됨.
      const hasUrlFilter = !!activeSeries || activeTags.size > 0 || activeCategories.length > 0;
      if (page === 1 && !hasUrlFilter) return; // SSR 와 동일(무필터 page 1) → 재요청 불필요
    }
    setLoading(true);
    const debounce = setTimeout(fetchPosts, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPosts, isInitial]);

  // 필터 변경 시 page 리셋 — 단, 첫 mount 는 skip (URL ?page= 으로 초기화된 값 보존)
  const filterChangeRef = useRef(false);
  useEffect(() => {
    if (!filterChangeRef.current) { filterChangeRef.current = true; return; }
    setPage(1);
  }, [
    search,
    searchType,
    activeCategoryKey,
    activeTagsKey,
    activeSeries,
    sort,
    sortDir,
  ]);

  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  }, []);

  // Bento masonry row-span — 시리즈 timeline 모드는 flex 레이아웃이라 패스
  useMasonryRowSpans(gridRef, !activeSeries && usesRowSpan, [posts, loading]);

  const handleSeriesClick = useCallback((seriesId: string) => {
    setActiveSeries((prev) => (prev === seriesId ? null : seriesId));
  }, []);

  const hasActiveFilter = !!search || activeTags.size > 0 || !!activeSeries || activeCategories.length > 0;
  // banner 는 pinned 글 있으면 항상 표시 (필터/검색/페이지네이션 무관)
  const showBanner = pinnedPosts.length >= 1;

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5, -1, totalPages];
    if (page >= totalPages - 2)
      return [
        1,
        -1,
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, -1, page - 1, page, page + 1, -1, totalPages];
  }, [page, totalPages]);

  return (
    <SearchHighlightProvider query={search} mode={syntaxMode}>
    <div className={`${styles.page} ${history ? styles.historyMode : ""}`}>
      {loading && <div className={styles.topProgress} aria-hidden />}
      {/* history: 위/아래 스크롤 버튼 (긴 아카이브 이동) */}
      {history && <ScrollButtons />}
      {/* ── Posts 계열 브라우즈 서브네비 (All/Series/Tags/History) ── */}
      <PostsSubnav />
      {/* ── Header ── */}
      <div className={styles.header}>
        {history ? (
          <>
            <PageTitle icon={<HistoryIcon size={40} strokeWidth={1.6} aria-hidden />}>
              History.
            </PageTitle>
            <p className={styles.subtitle}>시간순으로 쌓인 모든 기록.</p>
          </>
        ) : (
          <>
            <PageTitle icon={<LayoutGrid size={40} strokeWidth={1.6} aria-hidden />}>
              Posts.
            </PageTitle>
            <p className={styles.subtitle}>
              <T k="postsPage.subtitle" />
            </p>
          </>
        )}
      </div>

      {/* ── Banner Slider ── (history 모드 제외) */}
      {!history && showBanner && (
        <div className={styles.bannerSlider}>
          <PostsBanner
            posts={pinnedPosts}
            imgErrors={imgErrors}
            onImgError={handleImgError}
          />
        </div>
      )}

      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} style={{ height: 0 }} />

      {/* Backdrop — close tags/categories on outside click */}
      <AnimatePresence>
        {isStuck && (showTags || catExpanded) && (
          <motion.div
            className={styles.filterBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setShowTags(false);
              setCatExpanded(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Filter Bar (검색 + 전체태그 토글 + 카테고리 + 태그 패널) — history 모드에선 렌더하지 않음.
          sticky 판정·백드롭·본문 blur 는 여기(부모)에 남는다: barHidden 은 사이드바도 쓰고 blur 는 contentArea 에 건다. ── */}
      {!history && (
        <PostsFilterBar
          ref={filterBarRef}
          isStuck={isStuck}
          barHidden={barHidden}
          showTags={showTags}
          onShowTagsChange={setShowTags}
          catExpanded={catExpanded}
          onCatExpandedChange={setCatExpanded}
          search={search}
          onSearchChange={setSearch}
          searchType={searchType}
          onSearchTypeChange={setSearchType}
          onSyntaxModeChange={setSyntaxMode}
          hasResults={posts.length > 0}
          extraCategories={extraCategories}
          activeCategories={activeCategories}
          onCategoriesChange={setActiveCategories}
          allTags={allTags}
          activeTags={activeTags}
          onToggleTag={toggleActiveTag}
          onClearTags={clearActiveTags}
        />
      )}

      {/* ── Content Area (2-column) ── */}
      <div ref={contentRef} className={styles.contentArea}>
        <div className={styles.mainColumn}>
          {/* Series Row — posts loading 과 무관하게 항상 표시. history 모드는 렌더하지 않음 (사이드바와 같은 방식.
              예전엔 CSS 로 숨겨 안 보이는 row 가 마운트 직후 다음 페이지 fetch 를 했다) */}
          {!history && (
            <SeriesSection
              initialList={initialData.seriesList}
              initialTotal={initialData.seriesTotal}
              perPage={initialData.seriesPerPage}
              activeCategoryKey={activeCategoryKey}
              activeTagsKey={activeTagsKey}
              activeSeries={activeSeries}
              onSeriesClick={handleSeriesClick}
            />
          )}

          {/* Posts — sectionHeader 는 빈 상태에서도 항상 노출 (sort / perPage 등 컨트롤 접근 유지) */}
          <>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderMain}>
                <span className={styles.sectionHeaderTitle}>
                  <LayoutGrid size={14} />
                  <span className={styles.sectionHeaderText}>
                    <T k="postsPage.posts" tooltip={t("postsPage.postsTooltip")} />
                  </span>
                </span>
              </div>
                <div className={styles.sortWrap}>
                  {/* 작성자 필터 — 저자 2명 이상일 때만. 레이아웃 무관하게 필터로 동작. */}
                  {multiAuthor && (
                    <Select
                      value={activeAuthor ?? ""}
                      options={[{ value: "", label: language === "ko" ? "작성자 전체" : "All authors" }, ...authors.map((a) => ({ value: a.id, label: a.name }))]}
                      size="sm"
                      onChange={(v) => { setActiveAuthor(v || null); setPage(1); }}
                    />
                  )}
                  {/* sort + shuffle 한 묶음 — shuffle 은 sort 의 random 변형 (오른쪽 인접). */}
                  <SegmentedControl<"date" | "popular" | "title" | "author", "score" | "views" | "comments" | "likes">
                    size="sm"
                    className={styles.seriesSegmented}
                    items={
                      /* 타임라인은 월 그룹이라 날짜순만 유효 → date(newest/oldest 토글)만 노출 */
                      postsLayout === "timeline"
                        ? [{ value: "date", label: <T k="postsPage.sortDate" tooltip={t("postsPage.sortDateTooltip")} /> }]
                        : [
                            { value: "date", label: <T k="postsPage.sortDate" tooltip={t("postsPage.sortDateTooltip")} /> },
                            {
                              value: "popular",
                              label: <T k="postsPage.sortPopular" tooltip={t("postsPage.sortPopularTooltip")} />,
                              subItems: [
                                { value: "score", label: <T k="postsPage.popularScore" /> },
                                { value: "views", label: <T k="postsPage.popularViews" /> },
                                { value: "comments", label: <T k="postsPage.popularComments" /> },
                                { value: "likes", label: <T k="postsPage.popularLikes" /> },
                              ],
                            },
                            { value: "title", label: <T k="postsPage.sortTitle" tooltip={t("postsPage.sortTitleTooltip")} /> },
                            // 저자 정렬 — 2명 이상일 때만
                            ...(multiAuthor ? [{ value: "author" as const, label: language === "ko" ? "저자" : "Author" }] : []),
                          ]
                    }
                    value={(postsLayout === "timeline" || sortBy === "random" ? "date" : sortBy) as "date" | "popular" | "title" | "author"}
                    onChange={(v) => {
                      if (sortBy === v) {
                        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
                      } else {
                        setSortBy(v);
                        setSortDir(v === "title" || v === "author" ? "asc" : "desc");
                      }
                    }}
                    sortDir={sortBy !== "popular" && sortBy !== "random" ? sortDir : undefined}
                    subValue={popularSort}
                    onSubChange={setPopularSort}
                    subVariant="nested"
                    onBack={() => {
                      setSortBy("date");
                      setSortDir("desc");
                    }}
                  />
                  {/* 타임라인에선 랜덤 정렬도 무의미 → shuffle 숨김 */}
                  {postsLayout !== "timeline" && (
                    <Tooltip
                      content={
                        <>
                          <div>{t("postsPage.sortRandom")}</div>
                          <div>{t("postsPage.sortRandomTooltip")}</div>
                        </>
                      }
                    >
                      <Button
                        variant={sortBy === "random" ? "primary" : "outline"}
                        shape="circle"
                        size="sm"
                        icon={<Shuffle size={12} />}
                        onClick={() => {
                          if (sortBy === "random") {
                            setRandomSeed(Math.floor(Math.random() * 1e9));
                          } else {
                            setSortBy("random");
                            setRandomSeed(Math.floor(Math.random() * 1e9));
                          }
                        }}
                        aria-label={t("postsPage.sortRandom")}
                        className={styles.shuffleBtn}
                      />
                    </Tooltip>
                  )}
                </div>
                {/* 페이지당 개수 select — 가장 오른쪽 (margin-left: auto). shuffle/sort 와 분리.
                   history(timeline)는 무한스크롤이라 페이지 개념이 없어 숨김. */}
                {postsLayout !== "timeline" && (
                  <div className={styles.pageSizeGroup}>
                    <List size={14} strokeWidth={1.8} className={styles.pageSizeIcon} aria-hidden />
                    <Select
                      value={String(perPage)}
                      options={PAGE_SIZE_OPTIONS}
                      size="sm"
                      onChange={(v) => {
                        setPerPage(Number(v));
                        setPage(1);
                      }}
                      className={styles.pageSizeSelect}
                    />
                  </div>
                )}
              </div>
              {!loading && posts.length === 0 ? (
                activeSeries ? (
                  /* 시리즈 선택 + posts 0개 — "Coming Soon" 톤. 시리즈가 존재하지만 콘텐츠 준비중인 케이스. */
                  <div className={`${styles.emptyState} ${styles.emptyStateComingSoon}`}>
                    <span className={styles.comingSoonIconWrap} aria-hidden>
                      <Sparkles size={28} className={styles.comingSoonIconA} />
                      <Sparkles size={16} className={styles.comingSoonIconB} />
                      <Sparkles size={12} className={styles.comingSoonIconC} />
                    </span>
                    <p className={styles.comingSoonTitle}>{t("postsPage.comingSoon")}</p>
                    <p className={styles.comingSoonSub}>
                      {t("postsPage.noPostsInSeriesYet")} {t("postsPage.comingSoonSub")}
                    </p>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setActiveSeries(null)}
                    >
                      <T k="postsPage.clearSeries" />
                    </Button>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <SearchEmptyIcon />
                    <p className={styles.emptyTitle}>{t("postsPage.noPostsYet")}</p>
                    {(search ||
                      activeTags.size > 0 ||
                      activeCategories.length > 0) && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setSearch("");
                          setSearchType("all");
                          clearActiveTags();
                          setActiveCategories([]);
                        }}
                      >
                        <T
                          k="postsPage.clearFilters"
                          tooltip={t("postsPage.clearFiltersTooltip")}
                        />
                      </Button>
                    )}
                  </div>
                )
              ) : (
                <>
              <div className={`${styles.gridWrap} ${postsLayout === "timeline" ? styles.gridWrapTimeline : ""}`}>
              {postsLayout === "timeline" && (
                <TimelineIndex groups={timelineIndexGroups} activeMonthKey={activeMonthKey} onJump={scrollToMonth} />
              )}
              <div
                ref={gridRef}
                className={`${styles.grid} ${activeSeries ? styles.gridSeries : layoutClass} ${loading ? styles.gridLoading : ""}`}
              >
                {posts.length === 0 ? (
                  <PostsSkeletonCards
                    count={perPage}
                    activeSeries={!!activeSeries}
                    bento={postsLayout === "magazine"}
                    compactLayout={postsLayout === "compact"}
                  />
                ) : (
                  (() => {
                    // magazine 만 사이즈 변주(wide/banner/square/portrait). grid·list·compact 는 균일 카드.
                    const variants: CardType[] = posts.map((_, i) =>
                      activeSeries || postsLayout !== "magazine" ? "standard" : getCardType(i),
                    );
                    return posts.map((post, idx) => {
                      const type: CardType = variants[idx];
                      // featured — 첫 카드만 대형 hero. masonry/timeline 은 균일 표준 카드.
                      const isFeaturedHero =
                        !activeSeries && postsLayout === "featured" && idx === 0;
                      const cls =
                        !activeSeries && (type === "wide" || type === "banner")
                          ? styles.gridWide
                          : "";
                      // timeline — 월(연-월) 이 이전 카드와 다르면 앞에 날짜 마커 삽입
                      const timelineMarker =
                        !activeSeries &&
                        postsLayout === "timeline" &&
                        monthKey(post) !== (idx > 0 ? monthKey(posts[idx - 1]) : "")
                          ? monthLabel(post)
                          : null;
                      // 시리즈 필터링 시 — DB 의 series_order 값이 비연속/중복일 수 있어 sort 후 idx+1 로 1-based 일관 표시
                      const stepNumber = activeSeries
                        ? String(idx + 1).padStart(2, "0")
                        : null;
                      const isTimeline = !activeSeries && postsLayout === "timeline";
                      // 지그재그 — 인덱스로 좌/우 교차 (마커가 껴도 idx 기준이라 일관)
                      const tlSide: "left" | "right" = idx % 2 === 0 ? "left" : "right";
                      const tlSideClass = isTimeline
                        ? tlSide === "left"
                          ? styles.gridItemTlLeft
                          : styles.gridItemTlRight
                        : "";
                      const itemClassName = `${styles.gridItem} ${cls} ${isFeaturedHero ? styles.gridFeaturedHero : ""} ${activeSeries ? styles.seriesStep : ""} ${tlSideClass}`;
                      const cardInner = (
                        <>
                          {stepNumber && (
                            <div
                              className={styles.seriesStepNumber}
                              aria-hidden="true"
                            >
                              {stepNumber}
                            </div>
                          )}
                          <div
                            className={
                              activeSeries ? styles.seriesStepBody : ""
                            }
                          >
                            <PostCard
                              post={post}
                              variant={isFeaturedHero ? "featured" : "standard"}
                              layout={activeSeries ? undefined : postsLayout}
                              banner={!activeSeries && type === "banner"}
                              square={!activeSeries && type === "square"}
                              portrait={!activeSeries && type === "portrait"}
                              compact={!!activeSeries}
                              isHot={popularIds.has(post.id)}
                              onImgError={handleImgError}
                              imgError={imgErrors.has(post.id)}
                            />
                          </div>
                        </>
                      );
                      // 타임라인 리빌은 framer useScroll 로 스크롤 진행에 비례(TimelineMotionItem). 그 외는 plain div.
                      const cardEl = isTimeline ? (
                        <TimelineMotionItem
                          key={post.id}
                          side={tlSide}
                          disableX={tlSingleCol}
                          className={itemClassName}
                        >
                          {cardInner}
                        </TimelineMotionItem>
                      ) : (
                        <div key={post.id} className={itemClassName}>
                          {cardInner}
                        </div>
                      );
                      return timelineMarker ? (
                        <Fragment key={post.id}>
                          <motion.div
                            id={`tl-m-${monthKey(post)}`}
                            className={styles.timelineMarker}
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "0px 0px -6% 0px" }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <span className={styles.timelineMarkerLabel}>{timelineMarker}</span>
                          </motion.div>
                          {cardEl}
                        </Fragment>
                      ) : (
                        cardEl
                      );
                    });
                  })()
                )}
              </div>
              </div>{/* /gridWrap */}

              {/* 타임라인 무한 스크롤 sentinel — 다음 page 자동 로드 */}
              {postsLayout === "timeline" && page < totalPages && (
                <div ref={timelineSentinelRef} className={styles.timelineSentinel} aria-hidden="true" />
              )}

              {/* Pagination — 타임라인(무한스크롤) 제외 */}
              {postsLayout !== "timeline" && totalPages > 1 && (
                <div className={styles.pagination}>
                  <Pressable
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className={styles.pageBtn}
                    data-clickable="true"
                  >
                    &larr;
                  </Pressable>
                  {pageNumbers.map((p, i) =>
                    p === -1 ? (
                      <span key={`ellipsis-${i}`} className={styles.ellipsis}>
                        &hellip;
                      </span>
                    ) : (
                      <Pressable
                        key={p}
                        onClick={() => setPage(p)}
                        className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
                        data-clickable="true"
                      >
                        {p}
                      </Pressable>
                    ),
                  )}
                  <Pressable
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className={styles.pageBtn}
                    data-clickable="true"
                  >
                    &rarr;
                  </Pressable>
                </div>
              )}
                </>
              )}
          </>
        </div>

        {/* ── Sidebar ── history 모드는 렌더하지 않음 (필터바·배너와 같은 방식. 예전엔 CSS 로 숨겨
            사이드바 위젯 3개가 안 보이는 채로 fetch 했다) */}
        {!history && (
          <PostsSidebar barHidden={barHidden}>
            {/* 태그 — label 헤더는 그대로, 필터링 중일 땐 sphere 대신 chip(개수 명시)로.
                tags 는 필터 중이면 facet(결과 반영)로 전달. 클릭 시 태그 토글(OR) 필터. */}
            <TagCloud3D
              tags={hasActiveFilter ? facetTags : allTags}
              activeTags={activeTags}
              // 평소 sphere 는 태그 페이지로 이동(기존), 필터 중 chip 은 토글(OR)로 필터 조정
              onTagClick={hasActiveFilter ? toggleActiveTag : undefined}
              asChips={hasActiveFilter}
            />
            <PopularPosts />
            <RandomPosts />
            <RecentComments />
          </PostsSidebar>
        )}
      </div>
    </div>
    </SearchHighlightProvider>
  );
}
