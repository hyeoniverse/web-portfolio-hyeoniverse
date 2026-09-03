"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import { useStickyFilterBar } from "@/hooks/useStickyFilterBar";
import type { Post } from "@/types/post";
import type { InitialPostsData } from "@/lib/posts";
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
import PostsGrid, { type PostsLayout } from "./_components/PostsGrid/PostsGrid";
import TimelineIndex from "./_components/TimelineIndex";
import { useTimeline } from "./_hooks/useTimeline";
import { usePostsQuery } from "./_hooks/usePostsQuery";
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

interface PostsClientProps {
  initialData: InitialPostsData;
  /** history 모드 — /posts/history 전용. timeline 레이아웃 강제 + 필터/배너/시리즈/사이드바 숨김. */
  history?: boolean;
  /** 전체 아카이브 유효일 문자열(최신순) — 왼쪽 월 인덱스에 로드 여부와 무관하게 모든 월 표시 (history 전용). */
  archiveMonths?: string[];
}

export default function PostsClient({ initialData, history = false, archiveMonths }: PostsClientProps) {
  const { setInfinite, lenis, stop, start } = useLenis();
  const { t, language } = useLanguage();
  const siteConf = useSiteConfig();
  // 목록 카드 레이아웃 (설정) — magazine(기본)/grid/list/compact/masonry/featured. timeline 은 /posts/history 전용.
  const configLayout = (["magazine", "grid", "list", "compact", "masonry", "featured"].includes(siteConf.posts.layout)
    ? siteConf.posts.layout
    : "magazine");
  const postsLayout = (history ? "timeline" : configLayout) as PostsLayout;
  // 글 목록 쿼리 — 필터(검색·카테고리·태그·저자·시리즈) · 정렬 · 페이지 · fetch · URL 동기화
  const {
    posts, loading, facetTags, perPage, setPerPage, page, setPage, totalPages,
    search, setSearch, searchType, setSearchType, syntaxMode, setSyntaxMode,
    activeCategories, setActiveCategories, activeCategoryKey,
    activeTags, activeTagsKey, toggleActiveTag, clearActiveTags,
    activeAuthor, setActiveAuthor, activeSeries, setActiveSeries, toggleActiveSeries, hasActiveFilter,
    sortBy, sortDir, popularSort, setPopularSort, handleSortChange, shuffle, resetSort,
  } = usePostsQuery({ initialData, postsLayout, defaultPerPage: siteConf.posts.perPage ?? 10 });
  const [pinnedPosts] = useState<Post[]>(initialData.pinnedPosts);
  const [allTags] = useState(initialData.allTags);
  const [extraCategories] = useState(initialData.extraCategories);
  // 작성자 — 2명 이상일 때만 필터/정렬 노출(1명이면 옵션이 무의미). 카드 표시는 무조건.
  const authors = siteConf.authors ?? [];
  const multiAuthor = authors.length >= 2;
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [popularIds] = useState<Set<string>>(new Set(initialData.popularIds));
  const [showTags, setShowTags] = useState(false);
  const [catExpanded, setCatExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
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

  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  }, []);

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
              onSeriesClick={toggleActiveSeries}
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
                    onChange={handleSortChange}
                    sortDir={sortBy !== "popular" && sortBy !== "random" ? sortDir : undefined}
                    subValue={popularSort}
                    onSubChange={setPopularSort}
                    subVariant="nested"
                    onBack={resetSort}
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
                        onClick={shuffle}
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
              <PostsGrid
                posts={posts}
                loading={loading}
                perPage={perPage}
                activeSeries={activeSeries}
                postsLayout={postsLayout}
                popularIds={popularIds}
                imgErrors={imgErrors}
                onImgError={handleImgError}
                monthKey={monthKey}
                monthLabel={monthLabel}
                aside={
                  postsLayout === "timeline" ? (
                    <TimelineIndex groups={timelineIndexGroups} activeMonthKey={activeMonthKey} onJump={scrollToMonth} />
                  ) : null
                }
              />

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
