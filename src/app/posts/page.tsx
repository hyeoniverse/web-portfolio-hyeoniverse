"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLenis } from "@/providers/LenisProvider";
import type { Post } from "@/types/post";
import styles from "./Posts.module.css";

const STAGGER_DELAY = 0.06;
const POSTS_PER_PAGE = 12;

export default function PostsPage() {
  const { setInfinite, lenis, stop, start } = useLenis();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [sort, setSort] = useState<"newest" | "oldest" | "popular">("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

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
    if (activeTag) params.set("tag", activeTag);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(POSTS_PER_PAGE));

    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [search, activeTag, sort, page]);

  useEffect(() => {
    fetch("/api/posts?limit=100")
      .then((res) => res.json())
      .then((data) => {
        const tags = new Set<string>();
        (data.posts ?? []).forEach((p: Post) =>
          p.tags.forEach((t) => tags.add(t))
        );
        setAllTags(Array.from(tags).sort());
      });
  }, []);

  useEffect(() => {
    const debounce = setTimeout(fetchPosts, 300);
    return () => clearTimeout(debounce);
  }, [fetchPosts]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, activeTag, sort]);

  const featured = page === 1 ? posts[0] : null;
  const rest = page === 1 ? posts.slice(1) : posts;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const readTime = (content: string) =>
    Math.max(1, Math.ceil(content.length / 1000));

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
        <h1 className={styles.title}>Posts</h1>
        <p className={styles.subtitle}>
          Thoughts, tutorials, and behind-the-scenes notes
        </p>
      </motion.div>

      {/* ── Search + Filters ── */}
      <motion.div
        className={styles.filters}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      >
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

        <div className={styles.filterBar}>
          {allTags.length > 0 && (
            <div className={styles.tagList}>
              <button
                className={`${styles.tagBtn} ${!activeTag ? styles.tagBtnActive : ""}`}
                onClick={() => setActiveTag(null)}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`${styles.tagBtn} ${activeTag === tag ? styles.tagBtnActive : ""}`}
                  onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
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
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Content ── */}
      {loading ? (
        <p className={styles.statusText}>Loading...</p>
      ) : posts.length === 0 ? (
        <p className={styles.statusText}>No posts found</p>
      ) : (
        <>
          <div className={styles.content}>
            {/* Featured post */}
            {featured && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Link href={`/posts/${featured.slug}`} className={styles.featured}>
                  {featured.cover_image && !imgErrors.has(featured.id) ? (
                    <div className={styles.featuredImageWrap}>
                      <img
                        src={featured.cover_image}
                        alt={featured.title}
                        className={styles.featuredImage}
                        onError={() => setImgErrors(prev => new Set(prev).add(featured.id))}
                      />
                      <div className={styles.featuredOverlay} />
                    </div>
                  ) : (
                    <div className={styles.featuredPlaceholder}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}

                  <div className={styles.featuredBody}>
                    <div className={styles.featuredMeta}>
                      <span>{formatDate(featured.created_at)}</span>
                      <span className={styles.dot}>&middot;</span>
                      <span>{readTime(featured.content)} min read</span>
                      {featured.view_count > 0 && (
                        <>
                          <span className={styles.dot}>&middot;</span>
                          <span>{featured.view_count} views</span>
                        </>
                      )}
                    </div>
                    <h2 className={styles.featuredTitle}>{featured.title}</h2>
                    {featured.excerpt && (
                      <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
                    )}
                    {featured.tags.length > 0 && (
                      <div className={styles.featuredTags}>
                        {featured.tags.map((tag) => (
                          <span key={tag} className={styles.tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Divider */}
            {rest.length > 0 && featured && <div className={styles.divider} />}

            {/* Post list */}
            {rest.length > 0 && (
              <div className={styles.list}>
                {rest.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.3 + i * STAGGER_DELAY,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  >
                    <Link
                      href={`/posts/${post.slug}`}
                      className={styles.listItem}
                    >
                      <div className={styles.listLeft}>
                        <div className={styles.listMeta}>
                          <span>{formatDate(post.created_at)}</span>
                          <span className={styles.dot}>&middot;</span>
                          <span>{readTime(post.content)} min</span>
                        </div>
                        <h3 className={styles.listTitle}>{post.title}</h3>
                        {post.excerpt && (
                          <p className={styles.listExcerpt}>{post.excerpt}</p>
                        )}
                        {post.tags.length > 0 && (
                          <div className={styles.listTags}>
                            {post.tags.map((tag) => (
                              <span key={tag} className={styles.tag}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {post.cover_image && (
                        <div className={styles.listThumb}>
                          {!imgErrors.has(post.id) ? (
                            <img
                              src={post.cover_image}
                              alt={post.title}
                              className={styles.listThumbImg}
                              onError={() => setImgErrors(prev => new Set(prev).add(post.id))}
                            />
                          ) : (
                            <div className={styles.imgPlaceholder}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                          )}
                        </div>
                      )}

                      <svg
                        className={styles.listArrow}
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className={styles.pageBtn}
              >
                &larr;
              </button>
              {pageNumbers.map((p, i) =>
                p === -1 ? (
                  <span key={`ellipsis-${i}`} className={styles.ellipsis}>&hellip;</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className={styles.pageBtn}
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
