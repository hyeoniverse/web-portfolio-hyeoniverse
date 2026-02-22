"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useLenis } from "@/providers/LenisProvider";
import type { Post } from "@/types/post";
import styles from "./AdminPosts.module.css";

const POSTS_PER_PAGE = 20;

export default function AdminPostsPage() {
  const { setInfinite, lenis, stop, start } = useLenis();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
        <p className={styles.loading}>Loading...</p>
      ) : posts.length === 0 ? (
        <p className={styles.empty}>No posts yet</p>
      ) : (
        <>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span className={styles.colTitle}>Title</span>
              <span className={styles.colStatus}>Status</span>
              <span className={styles.colDate}>Date</span>
              <span className={styles.colViews}>Views</span>
              <span className={styles.colActions}>Actions</span>
            </div>

            {posts.map((post) => (
              <div key={post.id} className={styles.row}>
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
