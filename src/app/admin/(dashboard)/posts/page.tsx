"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLenis } from "@/providers/LenisProvider";
import type { Post } from "@/types/post";
import { SkeletonLine } from "@/components/ui/Skeleton";
import styles from "./AdminPosts.module.css";

const POSTS_PER_PAGE = 20;

export default function AdminPostsPage() {
  const { setInfinite, lenis, stop, start } = useLenis();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hoveredPost, setHoveredPost] = useState<Post | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [imgError, setImgError] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

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
    const params = new URLSearchParams({
      all: "true",
      page: String(page),
      limit: String(POSTS_PER_PAGE),
    });
    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 삭제하시겠습니까?`)) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    fetchPosts();
  };

  const handleTogglePublish = async (post: Post) => {
    await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !post.published }),
    });
    fetchPosts();
  };

  const handleRowHover = (post: Post, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tooltipWidth = 280;
    const hasImage = !!post.cover_image;
    const tooltipHeight = hasImage ? 260 : 120;
    const gap = 8;

    // 수평: row 중앙 정렬, 화면 밖 나가지 않도록 clamp
    const rawLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - tooltipWidth - 8));

    // 수직: 위쪽 공간 충분하면 위에, 아니면 아래에
    const spaceAbove = rect.top;
    const top = spaceAbove > tooltipHeight + gap
      ? rect.top - tooltipHeight - gap
      : rect.bottom + gap;

    setTooltipPos({ top, left });
    setImgError(false);
    setHoveredPost(post);
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5, -1, totalPages];
    if (page >= totalPages - 2)
      return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, -1, page - 1, page, page + 1, -1, totalPages];
  }, [page, totalPages]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Posts</h1>
        <Link href="/admin/posts/new" className={styles.newBtn}>
          New Post
        </Link>
      </div>

      {loading ? (
        <AdminPostsSkeleton />
      ) : posts.length === 0 ? (
        <p className={styles.empty}>No posts yet</p>
      ) : (
        <>
          <div className={styles.table} ref={tableRef}>
            <div className={styles.tableHeader}>
              <span className={styles.colTitle}>Title</span>
              <span className={styles.colStatus}>Status</span>
              <span className={styles.colDate}>Date</span>
              <span className={styles.colViews}>Views</span>
              <span className={styles.colActions}>Actions</span>
            </div>

            {posts.map((post) => (
              <div
                key={post.id}
                className={styles.row}
                onMouseEnter={(e) => handleRowHover(post, e)}
                onMouseLeave={() => setHoveredPost(null)}
              >
                <span className={styles.colTitle}>
                  <Link href={`/admin/posts/${post.id}/edit`} className={styles.postLink}>
                    {post.title || "Untitled"}
                  </Link>
                </span>
                <span className={styles.colStatus}>
                  <button
                    className={`${styles.statusBadge} ${post.published ? styles.published : styles.draft}`}
                    onClick={() => handleTogglePublish(post)}
                  >
                    {post.published ? "Published" : "Draft"}
                  </button>
                </span>
                <span className={styles.colDate}>
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
                <span className={styles.colViews}>{post.view_count}</span>
                <span className={styles.colActions}>
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className={styles.actionBtn}
                  >
                    Edit
                  </Link>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(post.id, post.title)}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>

          {/* Hover preview tooltip */}
          {hoveredPost && (
            <div
              className={styles.previewTooltip}
              style={{ top: tooltipPos.top, left: tooltipPos.left }}
            >
              {hoveredPost.cover_image && (
                <div className={styles.previewImage}>
                  {imgError ? (
                    <div className={styles.previewPlaceholder}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  ) : (
                    <Image
                      src={hoveredPost.cover_image}
                      alt=""
                      width={280}
                      height={140}
                      className={styles.previewImg}
                      unoptimized
                      onError={() => setImgError(true)}
                    />
                  )}
                </div>
              )}
              <div className={styles.previewBody}>
                <p className={styles.previewTitle}>{hoveredPost.title}</p>
                {hoveredPost.excerpt && (
                  <p className={styles.previewExcerpt}>{hoveredPost.excerpt}</p>
                )}
                {hoveredPost.tags.length > 0 && (
                  <div className={styles.previewTags}>
                    {hoveredPost.tags.map((tag) => (
                      <span key={tag} className={styles.previewTag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className={styles.pageBtn}
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
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
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

/* ── Skeleton ── */
const SKELETON_ROWS = 6;

function AdminPostsSkeleton() {
  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        <span className={styles.colTitle}>Title</span>
        <span className={styles.colStatus}>Status</span>
        <span className={styles.colDate}>Date</span>
        <span className={styles.colViews}>Views</span>
        <span className={styles.colActions}>Actions</span>
      </div>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} className={styles.row} style={{ pointerEvents: "none" }}>
          <span className={styles.colTitle}>
            <SkeletonLine width={`${60 + Math.random() * 30}%`} />
          </span>
          <span className={styles.colStatus}>
            <SkeletonLine width="60px" />
          </span>
          <span className={styles.colDate}>
            <SkeletonLine width="80px" />
          </span>
          <span className={styles.colViews}>
            <SkeletonLine width="30px" />
          </span>
          <span className={styles.colActions}>
            <SkeletonLine width="90px" />
          </span>
        </div>
      ))}
    </div>
  );
}
