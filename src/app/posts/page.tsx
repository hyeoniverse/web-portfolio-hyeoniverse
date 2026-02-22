"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import type { Post } from "@/types/post";
import PostCard from "./_components/PostCard";
import CategoryNav from "./_components/CategoryNav";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import styles from "./Posts.module.css";

const STAGGER_DELAY = 0.06;
const POSTS_PER_PAGE = 12;

export default function PostsPage() {
  const { setInfinite, lenis, stop, start } = useLenis();
  const [posts, setPosts] = useState<Post[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<"newest" | "oldest" | "popular">("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [showTags, setShowTags] = useState(false);

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
    params.set("pinned", "false");
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(POSTS_PER_PAGE));

    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [search, activeCategory, activeTag, sort, page]);

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
          Array.from(tagCounts.keys()).sort(
            (a, b) => (tagCounts.get(b) ?? 0) - (tagCounts.get(a) ?? 0)
          )
        );
        setExtraCategories(Array.from(categorySet));
      });

    fetch("/api/posts?pinned=true&limit=10")
      .then((res) => res.json())
      .then((data) => setPinnedPosts(data.posts ?? []));
  }, []);

  useEffect(() => {
    const debounce = setTimeout(fetchPosts, 300);
    return () => clearTimeout(debounce);
  }, [fetchPosts]);

  useEffect(() => {
    setPage(1);
  }, [search, activeCategory, activeTag, sort]);

  const handleImgError = useCallback((id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  }, []);

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

      {/* ── Category Nav ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <CategoryNav
          extraCategories={extraCategories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </motion.div>

      {/* ── Toolbar: Search + Tags + Sort ── */}
      <motion.div
        className={styles.toolbar}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className={styles.toolbarTop}>
          <div className={styles.searchWrap}>
            <svg
              className={styles.searchIcon}
              width="16"
              height="16"
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
              placeholder="Search posts..."
            />
          </div>

          <div className={styles.toolbarRight}>
            {allTags.length > 0 && (
              <button
                className={`${styles.tagToggleBtn} ${showTags ? styles.tagToggleBtnOpen : ""}`}
                onClick={() => setShowTags((v) => !v)}
                data-clickable="true"
              >
                Tags
                <svg
                  width="12"
                  height="12"
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

            <div className={styles.sortWrap}>
              {([
                { value: "newest" as const, label: "Latest" },
                { value: "oldest" as const, label: "Oldest" },
                { value: "popular" as const, label: "Popular" },
              ]).map(({ value, label }) => (
                <button
                  key={value}
                  className={`${styles.sortBtn} ${sort === value ? styles.sortBtnActive : ""}`}
                  onClick={() => setSort(value)}
                  data-clickable="true"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tag filter row */}
        {showTags && allTags.length > 0 && (
          <div className={styles.tagRow}>
            <button
              className={`${styles.tagBtn} ${!activeTag ? styles.tagBtnActive : ""}`}
              onClick={() => setActiveTag(null)}
              data-clickable="true"
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`${styles.tagBtn} ${activeTag === tag ? styles.tagBtnActive : ""}`}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                data-clickable="true"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Content ── */}
      {/* Pinned section — 항상 표시, 리스트와 별개 */}
      {pinnedPosts.length > 0 && page === 1 && !loading && (
        <motion.div
          className={styles.pinnedSection}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className={styles.pinnedLabel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M16 2l-4 4-6-2-2 10 6-2 2 10 4-4 6 2 2-10-6 2-2-10z" />
            </svg>
            Pinned
          </div>
          <div className={`${styles.pinnedGrid} ${pinnedPosts.length === 1 ? styles.pinnedSingle : ""}`}>
            {pinnedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                variant={pinnedPosts.length === 1 ? "featured" : "standard"}
                onImgError={handleImgError}
                imgError={imgErrors.has(post.id)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {loading ? (
        <PostsSkeleton />
      ) : posts.length === 0 ? (
        <p className={styles.statusText}>No posts found</p>
      ) : (
        <>
          {/* Regular grid */}
          {posts.length > 0 && (
            <div className={styles.grid}>
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.25 + i * STAGGER_DELAY,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <PostCard
                    post={post}
                    onImgError={handleImgError}
                    imgError={imgErrors.has(post.id)}
                  />
                </motion.div>
              ))}
            </div>
          )}

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
      )}
    </div>
  );
}

/* ── Skeleton ── */
function PostsSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className={styles.skeletonCard}>
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
