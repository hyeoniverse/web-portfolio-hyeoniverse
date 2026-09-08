"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import { useStickyFilterBar } from "@/hooks/useStickyFilterBar";
import type { InitialPostsData } from "@/lib/posts";
import ScrollButtons from "@/components/ui/ScrollButtons/ScrollButtons";
import PostsFilterBar from "./_components/PostsFilterBar/PostsFilterBar";
import SeriesSection from "./_components/SeriesSection/SeriesSection";
import TagCloud3D from "./_components/TagCloud3D";
import PopularPosts from "./_components/PopularPosts";
import RandomPosts from "./_components/RandomPosts";
import RecentComments from "./_components/RecentComments";
import PostsSidebar from "./_components/PostsSidebar";
import PostsGrid, { type PostsLayout } from "./_components/PostsGrid/PostsGrid";
import PostsToolbar from "./_components/PostsToolbar/PostsToolbar";
import PostsEmptyState from "./_components/PostsEmptyState/PostsEmptyState";
import PostsPagination from "./_components/PostsPagination/PostsPagination";
import TimelineIndex from "./_components/TimelineIndex";
import { useTimeline } from "./_hooks/useTimeline";
import { usePostsQuery } from "./_hooks/usePostsQuery";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./Posts.module.css";

interface PostsClientProps {
  initialData: InitialPostsData;
  /** history 모드 — /posts/history 전용. timeline 레이아웃 강제 + 필터/배너/시리즈/사이드바 숨김. */
  history?: boolean;
  /** 전체 아카이브 유효일 문자열(최신순) — 왼쪽 월 인덱스에 로드 여부와 무관하게 모든 월 표시 (history 전용). */
  archiveMonths?: string[];
}

export default function PostsClient({ initialData, history = false, archiveMonths }: PostsClientProps) {
  const { setInfinite, lenis, stop, start } = useLenis();
  const siteConf = useSiteConfig();
  // 목록 카드 레이아웃 (설정) — magazine(기본)/grid/list/compact/masonry/featured. timeline 은 /posts/history 전용.
  const configLayout = (["magazine", "grid", "list", "compact", "masonry", "featured"].includes(siteConf.posts.layout)
    ? siteConf.posts.layout
    : "magazine");
  const postsLayout = (history ? "timeline" : configLayout) as PostsLayout;
  // 글 목록 쿼리 — 필터(검색·카테고리·태그·저자·시리즈) · 정렬 · 페이지 · fetch · URL 동기화
  const query = usePostsQuery({ initialData, postsLayout, defaultPerPage: siteConf.posts.perPage ?? 10 });
  const {
    posts, loading, facetTags, perPage, page, setPage, totalPages, search, syntaxMode,
    activeCategoryKey, activeTagsKey, activeTags, toggleActiveTag, activeSeries, toggleActiveSeries, hasActiveFilter,
  } = query;
  const [allTags] = useState(initialData.allTags);
  const [extraCategories] = useState(initialData.extraCategories);
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

  return (
    <SearchHighlightProvider query={search} mode={syntaxMode}>
    <>
      {loading && <div className={styles.topProgress} aria-hidden />}
      {/* history: 위/아래 스크롤 버튼 (긴 아카이브 이동) */}
      {history && <ScrollButtons />}

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
          extraCategories={extraCategories}
          allTags={allTags}
          query={query}
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
            <PostsToolbar query={query} timeline={postsLayout === "timeline"} />
              {!loading && posts.length === 0 ? (
                <PostsEmptyState query={query} />
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
                <PostsPagination page={page} totalPages={totalPages} onPageChange={setPage} />
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
    </>
    </SearchHighlightProvider>
  );
}
