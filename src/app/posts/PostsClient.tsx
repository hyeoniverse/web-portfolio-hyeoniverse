"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import type { Post, Series } from "@/types/post";
import type { InitialPostsData } from "@/lib/posts";
import PostCard from "./_components/PostCard";
import CategoryNav from "./_components/CategoryNav";
import SeriesCard from "./_components/SeriesCard";
import PostsBanner from "./_components/PostsBanner/PostsBanner";
import PopularPosts from "./_components/PopularPosts";
import RecentComments from "./_components/RecentComments";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./Posts.module.css";

const POSTS_PER_PAGE = 12;

interface PostsClientProps {
  initialData: InitialPostsData;
}

export default function PostsClient({ initialData }: PostsClientProps) {
  const { setInfinite, lenis, stop, start } = useLenis();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [pinnedPosts] = useState<Post[]>(initialData.pinnedPosts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [allTags] = useState(initialData.allTags);
  const [extraCategories] = useState(initialData.extraCategories);
  const [sort, setSort] = useState<"newest" | "oldest" | "popular">("newest");
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [seriesList, setSeriesList] = useState<Series[]>(initialData.seriesList);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [popularIds] = useState<Set<string>>(new Set(initialData.popularIds));
  const [showTags, setShowTags] = useState(false);
  const [catExpanded, setCatExpanded] = useState(false);
  const [showAllSeries, setShowAllSeries] = useState(false);
  const [isInitial, setIsInitial] = useState(true);
  const [isStuck, setIsStuck] = useState(false);
  const [barHidden, setBarHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollCooldown = useRef(false);

  useEffect(() => setMounted(true), []);

  // Detect if filterBar is in sticky (stuck) state
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const stuck = !entry.isIntersecting;
        setIsStuck(stuck);
        if (!stuck) setBarHidden(false);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Apply blur to content area when expanded in stuck state (same technique as ContactDrawer)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const shouldBlur = isStuck && (showTags || catExpanded);
    if (shouldBlur) {
      el.style.filter = "blur(6px)";
      el.style.transition = "filter 0.3s ease";
    } else {
      el.style.filter = "";
      // keep transition so the un-blur also animates
      setTimeout(() => { el.style.transition = ""; }, 300);
    }
  }, [isStuck, showTags, catExpanded]);

  // Cooldown: skip scroll-collapse briefly after expanding tags/categories
  useEffect(() => {
    if (!showTags && !catExpanded) return;
    scrollCooldown.current = true;
    const id = setTimeout(() => { scrollCooldown.current = false; }, 400);
    return () => clearTimeout(id);
  }, [showTags, catExpanded]);

  // Scroll-down: hide bar + collapse expansions / Scroll-up: show bar
  useEffect(() => {
    const threshold = 8;
    const handleScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;
      if (scrollCooldown.current) return;
      if (delta > threshold && isStuck) {
        setBarHidden(true);
        setCatExpanded(false);
        setShowTags(false);
      } else if (delta < -threshold && isStuck) {
        setBarHidden(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isStuck]);

  // Close tags on scroll — ignore layout-shift scroll, only close on real user scroll
  useEffect(() => {
    if (!showTags) return;
    let startY = -1;
    const armTimer = setTimeout(() => {
      startY = window.scrollY;
    }, 300);
    const handleScroll = () => {
      if (startY < 0) return;
      if (Math.abs(window.scrollY - startY) > 30) {
        setShowTags(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(armTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [showTags]);

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

  // Fetch series when category changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    fetch(`/api/series?${params}`)
      .then((res) => res.json())
      .then((data) => setSeriesList(Array.isArray(data) ? data : []));
  }, [activeCategory]);

  // Fetch posts when filters change (skip initial — we have SSR data)
  useEffect(() => {
    if (isInitial) {
      setIsInitial(false);
      return;
    }
    const debounce = setTimeout(fetchPosts, 300);
    return () => clearTimeout(debounce);
  }, [fetchPosts, isInitial]);

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
  const showBanner = pinnedPosts.length > 0 && page === 1 && !hasFilter;

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
        <h1 className={styles.title}>Posts.</h1>
        <p className={styles.subtitle}>
          {t("postsPage.subtitle")}
        </p>
      </motion.div>

      {/* ── Banner Slider ── */}
      {showBanner && (
        <motion.div
          className={styles.bannerSlider}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <PostsBanner
            posts={pinnedPosts}
            imgErrors={imgErrors}
            onImgError={handleImgError}
          />
        </motion.div>
      )}

      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} style={{ height: 0 }} />

      {/* Backdrop blur — portal to body to avoid stacking context issues */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isStuck && (showTags || catExpanded) && (
              <motion.div
                className={styles.filterBackdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => { setShowTags(false); setCatExpanded(false); }}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* ── Filter Bar (Category tabs + Search + Sort) ── */}
      <motion.div
        className={`${styles.filterBar} ${barHidden ? styles.filterBarHidden : ""}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className={styles.filterBarTop}>
          <CategoryNav
            extraCategories={extraCategories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            expanded={catExpanded}
            onExpandChange={setCatExpanded}
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
                placeholder={t("postsPage.searchPlaceholder")}
              />
            </div>

            {allTags.length > 0 && (
              <button
                className={`${styles.tagToggleBtn} ${showTags ? styles.tagToggleBtnOpen : ""}`}
                onClick={() => setShowTags((v) => !v)}
                data-clickable="true"
              >
                {t("postsPage.tags")}
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

            <div className={styles.sortGroup}>
              {([
                { value: "newest", label: t("postsPage.sortNewest") },
                { value: "oldest", label: t("postsPage.sortOldest") },
                { value: "popular", label: t("postsPage.sortPopular") },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.sortBtn} ${sort === opt.value ? styles.sortBtnActive : ""}`}
                  onClick={() => setSort(opt.value as typeof sort)}
                  data-clickable="true"
                >
                  {sort === opt.value && (
                    <motion.span
                      className={styles.sortIndicator}
                      layoutId="sortIndicator"
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    />
                  )}
                  <span className={styles.sortBtnText}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showTags && allTags.length > 0 && (
            <motion.div
              className={isStuck ? styles.tagDropdown : styles.tagInline}
              initial={isStuck ? { opacity: 0, y: -8 } : { height: 0, opacity: 0 }}
              animate={isStuck ? { opacity: 1, y: 0 } : { height: "auto", opacity: 1 }}
              exit={isStuck ? { opacity: 0, y: -8 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className={styles.tagRow}>
                <button
                  className={`${styles.tagBtn} ${!activeTag ? styles.tagBtnActive : ""}`}
                  onClick={() => setActiveTag(null)}
                  data-clickable="true"
                >
                  {t("postsPage.allTags")}
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Content Area (2-column) ── */}
      <div ref={contentRef} className={styles.contentArea}>
        <div className={styles.mainColumn}>
          {/* Series Row */}
          {!loading && (
            <div className={styles.seriesSection}>
              <div className={styles.seriesLabel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                </svg>
                {t("postsPage.series")}
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
                      {showAllSeries ? t("postsPage.close") : `+${seriesList.length - SERIES_LIMIT}`}
                    </button>
                  )}
                </div>
              ) : (
                <p className={styles.seriesEmpty}>
                  {activeCategory
                    ? `${t("postsPage.noSeriesYet")} — ${activeCategory}`
                    : t("postsPage.noSeriesYet")}
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
          ) : posts.length === 0 && !showBanner ? (
            <div className={styles.emptyState}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <p className={styles.emptyTitle}>
                {search
                  ? `${t("postsPage.noResultsFor")} "${search}"`
                  : activeTag
                    ? `${t("postsPage.noPostsTagged")} "${activeTag}"`
                    : activeSeries && activeSeriesTitle
                      ? `${t("postsPage.noPostsInSeries")} "${activeSeriesTitle}"`
                      : activeCategory
                        ? `${t("postsPage.noPostsInCategory")} ${activeCategory}`
                        : t("postsPage.noPostsYet")}
              </p>
              {(search || activeTag || activeSeries || activeCategory) && (
                <button
                  className={styles.emptyResetBtn}
                  onClick={() => { setSearch(""); setActiveTag(null); setActiveSeries(null); setActiveCategory(null); }}
                  data-clickable="true"
                >
                  {t("postsPage.clearFilters")}
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
                {t("postsPage.posts")}
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
                      isHot={popularIds.has(post.id)}
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
