"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import type { Post, Series } from "@/types/post";
import PostCard from "./_components/PostCard";
import CategoryNav from "./_components/CategoryNav";
import SeriesCard from "./_components/SeriesCard";
import PopularPosts from "./_components/PopularPosts";
import RecentComments from "./_components/RecentComments";
import Carousel from "@/components/ui/Carousel/Carousel";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import Select from "@/components/ui/Select";
import styles from "./Posts.module.css";

const POSTS_PER_PAGE = 12;

export default function PostsPage() {
  const { setInfinite, lenis, stop, start } = useLenis();
  const [posts, setPosts] = useState<Post[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([]);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<"newest" | "oldest" | "popular">("newest");
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [showTags, setShowTags] = useState(false);
  const [showAllSeries, setShowAllSeries] = useState(false);

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
      setInfinite(true);
    };
  }, [setInfinite, lenis, stop, start]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeCategory) params.set("category", activeCategory);
    if (activeTag) params.set("tag", activeTag);
    if (activeSeries) params.set("series_id", activeSeries);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(POSTS_PER_PAGE));

    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [search, activeCategory, activeTag, activeSeries, sort, page]);

  // Fetch all tags + extra categories + pinned posts
  useEffect(() => {
    fetch("/api/posts?limit=100")
      .then((res) => res.json())
      .then((data) => {
        const tagCounts = new Map<string, number>();
        const categorySet = new Set<string>();
        (data.posts ?? []).forEach((p: Post) => {
          p.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1));
          if (p.category) categorySet.add(p.category);
        });
        setAllTags(
          Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => ({ tag, count }))
        );
        setExtraCategories(Array.from(categorySet));
      });

    fetch("/api/posts?pinned=true&limit=10")
      .then((res) => res.json())
      .then((data) => setPinnedPosts(data.posts ?? []));
  }, []);

  // Fetch series — 카테고리 연동
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    fetch(`/api/series?${params}`)
      .then((res) => res.json())
      .then((data) => setSeriesList(Array.isArray(data) ? data : []));
  }, [activeCategory]);

  useEffect(() => {
    const debounce = setTimeout(fetchPosts, 300);
    return () => clearTimeout(debounce);
  }, [fetchPosts]);

  useEffect(() => {
    setPage(1);
  }, [search, activeCategory, activeTag, activeSeries, sort]);

  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  }, []);

  const handleSeriesClick = useCallback((seriesId: string) => {
    setActiveSeries((prev) => (prev === seriesId ? null : seriesId));
  }, []);

  const clearSeriesFilter = useCallback(() => {
    setActiveSeries(null);
  }, []);

  const activeSeriesTitle = useMemo(() => {
    if (!activeSeries) return null;
    return seriesList.find((s) => s.id === activeSeries)?.title ?? null;
  }, [activeSeries, seriesList]);

  const SERIES_LIMIT = 4;
  const visibleSeries = showAllSeries ? seriesList : seriesList.slice(0, SERIES_LIMIT);
  const hasMoreSeries = seriesList.length > SERIES_LIMIT;

  const hasFilter = !!search || !!activeTag || !!activeSeries;
  const showPinned = pinnedPosts.length > 0 && page === 1 && !loading && !hasFilter;

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5, -1, totalPages];
    if (page >= totalPages - 2)
      return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, -1, page - 1, page, page + 1, -1, totalPages];
  }, [page, totalPages]);

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 className={styles.title}>Blog.</h1>
        <p className={styles.subtitle}>
          Thoughts, tutorials, and behind-the-scenes notes
        </p>
      </motion.div>

      {/* ── Featured Carousel (pinned posts) ── */}
      {loading && page === 1 && !hasFilter && (
        <div className={styles.pinnedSection}>
          <HeroSkeleton />
        </div>
      )}
      {showPinned && pinnedPosts.length > 0 && (
        <motion.div
          className={styles.pinnedSection}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className={styles.pinnedBannerLabel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
            </svg>
            Pinned
            <span className={styles.postsCount}>{pinnedPosts.length}</span>
          </div>
          <Carousel
            autoPlay
            interval={6000}
            pauseOnHover
            showArrows={pinnedPosts.length > 1}
            showDots={pinnedPosts.length > 1}
            height={480}
          >
            {pinnedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                variant="hero"
                onImgError={handleImgError}
                imgError={imgErrors.has(post.id)}
              />
            ))}
          </Carousel>
        </motion.div>
      )}

      {/* ── Filter Bar (Category tabs + Search + Sort) ── */}
      <motion.div
        className={styles.filterBar}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className={styles.filterBarTop}>
          <CategoryNav
            extraCategories={extraCategories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          <div className={styles.filterBarRight}>
            <div className={styles.searchWrap}>
              <svg
                className={styles.searchIcon}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className={styles.searchInput}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
              />
            </div>

            {allTags.length > 0 && (
              <button
                className={`${styles.tagToggleBtn} ${showTags ? styles.tagToggleBtnOpen : ""}`}
                onClick={() => setShowTags((v) => !v)}
                data-clickable="true"
              >
                Tags
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}

            <Select
              value={sort}
              options={[
                { value: "newest", label: "Latest" },
                { value: "oldest", label: "Oldest" },
                { value: "popular", label: "Popular" },
              ]}
              onChange={(v) => setSort(v as typeof sort)}
              className={styles.sortSelect}
            />
          </div>
        </div>

        {showTags && allTags.length > 0 && (
          <div className={styles.tagRow}>
            <button
              className={`${styles.tagBtn} ${!activeTag ? styles.tagBtnActive : ""}`}
              onClick={() => setActiveTag(null)}
              data-clickable="true"
            >
              All
            </button>
            {allTags.map(({ tag, count }) => (
              <button
                key={tag}
                className={`${styles.tagBtn} ${activeTag === tag ? styles.tagBtnActive : ""}`}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                data-clickable="true"
              >
                {tag}
                <span className={styles.tagCount}>{count}</span>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Content Area (2-column) ── */}
      <div className={styles.contentArea}>
        <div className={styles.mainColumn}>
          {/* Series Row */}
          {!loading && (
            <div className={styles.seriesSection}>
              <div className={styles.seriesLabel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                </svg>
                Series
                {activeCategory && (
                  <span className={styles.seriesCategoryTag}>{activeCategory}</span>
                )}
              </div>
              {seriesList.length > 0 ? (
                <div className={styles.seriesRow}>
                  {visibleSeries.map((series) => (
                    <SeriesCard
                      key={series.id}
                      series={series}
                      onClick={handleSeriesClick}
                      active={activeSeries === series.id}
                    />
                  ))}
                  {hasMoreSeries && (
                    <button
                      className={styles.seriesMoreBtn}
                      onClick={() => setShowAllSeries((v) => !v)}
                      data-clickable="true"
                    >
                      {showAllSeries ? "Close" : `+${seriesList.length - SERIES_LIMIT}`}
                    </button>
                  )}
                </div>
              ) : (
                <p className={styles.seriesEmpty}>
                  {activeCategory
                    ? `No series in ${activeCategory}`
                    : "No series yet"}
                </p>
              )}
            </div>
          )}

          {/* Series filter chip */}
          {activeSeries && activeSeriesTitle && (
            <div className={styles.seriesChip}>
              <span>Series: {activeSeriesTitle}</span>
              <button
                className={styles.seriesChipClose}
                onClick={clearSeriesFilter}
                data-clickable="true"
              >
                &times;
              </button>
            </div>
          )}

          {/* Posts */}
          {loading ? (
            <PostsSkeleton />
          ) : posts.length === 0 && !showPinned ? (
            <div className={styles.emptyState}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <p className={styles.emptyTitle}>
                {search
                  ? `No results for "${search}"`
                  : activeTag
                    ? `No posts tagged "${activeTag}"`
                    : activeSeries && activeSeriesTitle
                      ? `No posts in "${activeSeriesTitle}"`
                      : activeCategory
                        ? `No posts in ${activeCategory}`
                        : "No posts yet"}
              </p>
              {(search || activeTag || activeSeries || activeCategory) && (
                <button
                  className={styles.emptyResetBtn}
                  onClick={() => { setSearch(""); setActiveTag(null); setActiveSeries(null); setActiveCategory(null); }}
                  data-clickable="true"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className={styles.postsLabel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                Posts
                <span className={styles.postsCount}>{posts.length}</span>
              </div>
              <div className={styles.grid}>
                {posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{
                      duration: 0.5,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                    style={
                      i === 0 || (i === posts.length - 1 && (posts.length - 1) % 2 === 1)
                        ? { gridColumn: "1 / -1" }
                        : undefined
                    }
                  >
                    <PostCard
                      post={post}
                      variant={i === 0 ? "featured" : "standard"}
                      onImgError={handleImgError}
                      imgError={imgErrors.has(post.id)}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className={styles.pageBtn}
                    data-clickable="true"
                  >
                    &larr;
                  </button>
                  {pageNumbers.map((p, i) =>
                    p === -1 ? (
                      <span key={`ellipsis-${i}`} className={styles.ellipsis}>
                        &hellip;
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
                        data-clickable="true"
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className={styles.pageBtn}
                    data-clickable="true"
                  >
                    &rarr;
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <PopularPosts />
          <RecentComments />
        </aside>
      </div>
    </div>
  );
}

/* ── Skeleton ── */
function HeroSkeleton() {
  return (
    <div className={styles.skeletonHero}>
      <div className={styles.skeletonHeroBody}>
        <SkeletonLine width={80} height={14} />
        <SkeletonLine width="80%" height={32} />
        <SkeletonLine width="100%" height={16} />
        <SkeletonLine width="40%" height={12} />
      </div>
    </div>
  );
}

function PostsSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={styles.skeletonCard} style={i === 0 ? { gridColumn: "1 / -1" } : undefined}>
          <Skeleton height={0} borderRadius="0" />
          <div className={styles.skeletonCardBody}>
            <SkeletonLine width={60} height={14} />
            <SkeletonLine width="90%" height={20} />
            <SkeletonLine width="100%" />
            <SkeletonLine width="40%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}
