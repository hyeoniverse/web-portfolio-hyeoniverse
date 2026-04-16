"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import Select from "@/components/ui/Select";
import styles from "./Posts.module.css";

function SidebarWrap({ barHidden, children }: { barHidden: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanUp(el.scrollTop > 4);
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [check]);

  return (
    <div className={`${styles.sidebarWrap} ${barHidden ? styles.sidebarUp : ""}`}>
      {canUp && (
        <div className={styles.sidebarFadeTop}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </div>
      )}
      <aside ref={ref} className={styles.sidebar} data-lenis-prevent>
        {children}
      </aside>
      {canDown && (
        <div className={styles.sidebarFadeBottom}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

interface PostsClientProps {
  initialData: InitialPostsData;
}

export default function PostsClient({ initialData }: PostsClientProps) {
  const { setInfinite, lenis, stop, start } = useLenis();
  const { t } = useLanguage();
  const siteConf = useSiteConfig();
  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [pinnedPosts] = useState<Post[]>(initialData.pinnedPosts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<"all" | "title" | "content">("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [allTags] = useState(initialData.allTags);
  const [extraCategories] = useState(initialData.extraCategories);
  const [sort, setSort] = useState<"newest" | "oldest" | "popular">("newest");
  const [hoveredSort, setHoveredSort] = useState<string | null>(null);
  const [perPage, setPerPage] = useState(siteConf.posts.perPage ?? 10);
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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollCooldown = useRef(false);
  const isStuckRef = useRef(false);

  // Detect if filterBar is in sticky (stuck) state
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const stuck = !entry.isIntersecting;
        isStuckRef.current = stuck;
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
    const threshold = 3;
    let accumulated = 0;
    const triggerDist = 15;
    const handleScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;
      if (scrollCooldown.current) return;
      if (!isStuckRef.current) {
        accumulated = 0;
        return;
      }
      // 방향 전환 시 누적값 리셋
      if ((accumulated > 0 && delta < -threshold) || (accumulated < 0 && delta > threshold)) {
        accumulated = 0;
      }
      accumulated += delta;
      if (accumulated > triggerDist) {
        setBarHidden(true);
        setCatExpanded(false);
        setShowTags(false);
        accumulated = 0;
      } else if (accumulated < -triggerDist) {
        setBarHidden(false);
        accumulated = 0;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []); // no deps — uses refs only

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
    if (search) {
      params.set("search", search);
      params.set("searchType", searchType);
    }
    if (activeCategory) params.set("category", activeCategory);
    if (activeTag) params.set("tag", activeTag);
    if (activeSeries) params.set("series_id", activeSeries);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(perPage));

    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [search, searchType, activeCategory, activeTag, activeSeries, sort, page, perPage]);

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
  }, [search, searchType, activeCategory, activeTag, activeSeries, sort]);

  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  }, []);

  const handleSeriesClick = useCallback((seriesId: string) => {
    setActiveSeries((prev) => (prev === seriesId ? null : seriesId));
  }, []);


  const activeSeriesTitle = useMemo(() => {
    if (!activeSeries) return null;
    return seriesList.find((s) => s.id === activeSeries)?.title ?? null;
  }, [activeSeries, seriesList]);

  const SERIES_LIMIT = 4;
  const visibleSeries = showAllSeries ? seriesList : seriesList.slice(0, SERIES_LIMIT);
  const hasMoreSeries = seriesList.length > SERIES_LIMIT;

  const showBanner = pinnedPosts.length >= 1 && page === 1;

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
      <div className={styles.header}>
        <h1 className={styles.title}>Posts.</h1>
        <p className={styles.subtitle}>
          <T k="postsPage.subtitle" />
        </p>
      </div>

      {/* ── Banner Slider ── */}
      {showBanner && (
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
            onClick={() => { setShowTags(false); setCatExpanded(false); }}
          />
        )}
      </AnimatePresence>

      {/* ── Filter Bar (Category tabs + Search + Sort) ── */}
      <div
        className={`${styles.filterBar} ${barHidden ? styles.filterBarHidden : ""}`}
      >
        <div className={styles.filterBarTop}>
          <CategoryNav
            extraCategories={extraCategories}
            activeCategory={activeCategory}
            onCategoryChange={(cat) => { setActiveCategory(cat); setCatExpanded(false); }}
            expanded={catExpanded}
            onExpandChange={(v) => { setCatExpanded(v); if (v) setShowTags(false); }}
          />

          <AnimatePresence>
          {!catExpanded && (
            <motion.div
              className={styles.filterBarRight}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto", overflow: "visible" }}
              exit={{ opacity: 0, width: 0, overflow: "hidden" }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ overflow: "hidden" }}
            >
            <div className={styles.searchCapsule}>
              <Select
                value={searchType}
                options={[
                  { value: "all", label: t("postsPage.searchAll") },
                  { value: "title", label: t("postsPage.searchTitle") },
                  { value: "content", label: t("postsPage.searchContent") },
                ]}
                onChange={(v) => setSearchType(v as "all" | "title" | "content")}
                className={styles.searchTypeSelect}
              />
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
                <T k="postsPage.tags" />
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

            <div className={styles.sortGroup} onMouseLeave={() => setHoveredSort(null)}>
              {([
                { value: "newest", label: t("postsPage.sortNewest") },
                { value: "oldest", label: t("postsPage.sortOldest") },
                { value: "popular", label: t("postsPage.sortPopular") },
              ] as const).map((opt) => {
                const indicatorTarget = hoveredSort ?? sort;
                const showIndicator = opt.value === indicatorTarget;
                const isActive = opt.value === sort && !hoveredSort;
                return (
                  <button
                    key={opt.value}
                    className={`${styles.sortBtn} ${isActive ? styles.sortBtnActive : ""}`}
                    onClick={() => setSort(opt.value as typeof sort)}
                    onMouseEnter={() => setHoveredSort(opt.value)}
                    data-clickable="true"
                  >
                    {showIndicator && (
                      <motion.span
                        className={`${styles.sortIndicator} ${isActive ? styles.sortIndicatorActive : ""}`}
                        layoutId="sortIndicator"
                        transition={{ type: "spring", stiffness: 500, damping: 32 }}
                      />
                    )}
                    <span className={styles.sortBtnText}>{opt.label}</span>
                  </button>
                );
              })}
            </div>

          </motion.div>
          )}
          </AnimatePresence>
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
                  <T k="postsPage.allTags" />
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
      </div>

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
                <T k="postsPage.series" />
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
                      {showAllSeries ? <T k="postsPage.close" /> : `+${seriesList.length - SERIES_LIMIT}`}
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
                  onClick={() => { setSearch(""); setSearchType("all"); setActiveTag(null); setActiveSeries(null); setActiveCategory(null); }}
                  data-clickable="true"
                >
                  <T k="postsPage.clearFilters" />
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
                <T k="postsPage.posts" />
                <Select
                  value={String(perPage)}
                  options={PAGE_SIZE_OPTIONS}
                  onChange={(v) => { setPerPage(Number(v)); setPage(1); }}
                  className={styles.pageSizeSelect}
                />
              </div>
              <div className={styles.grid}>
                {posts.map((post) => (
                  <div key={post.id}>
                    <PostCard
                      post={post}
                      variant="standard"
                      isHot={popularIds.has(post.id)}
                      onImgError={handleImgError}
                      imgError={imgErrors.has(post.id)}
                    />
                  </div>
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
        <SidebarWrap barHidden={barHidden}>
          <PopularPosts />
          <RecentComments />
        </SidebarWrap>
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
