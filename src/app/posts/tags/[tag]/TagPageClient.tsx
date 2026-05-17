"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Hash } from "lucide-react";
import type { Post } from "@/types/post";
import type { TagPageData } from "@/lib/posts";
import PostCard from "../../_components/PostCard";
import SortGroup from "@/components/ui/SortGroup";
import Select from "@/components/ui/Select";
import styles from "./TagPage.module.css";

type Sort = "newest" | "popular" | "title";

interface Props {
  tag: string;
  initialData: TagPageData;
}

const PER_PAGE_OPTIONS = [
  { value: "10", label: "10개씩" },
  { value: "20", label: "20개씩" },
  { value: "50", label: "50개씩" },
];

export default function TagPageClient({ tag, initialData }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialData.perPage);
  const [sort, setSort] = useState<Sort>("newest");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);

  // 같은 sort 다시 클릭 → dir toggle, 다른 sort → default desc
  const handleSortChange = (v: Sort) => {
    if (v === sort) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(v);
      setSortDir("desc");
    }
    setPage(1);
  };

  // sort/page/perPage 변경 시 fetch
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tag,
        sort,
        sortDir,
        page: String(page),
        limit: String(perPage),
      });
      const res = await fetch(`/api/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch {
      // noop
    }
    setLoading(false);
  }, [tag, sort, sortDir, page, perPage]);

  // initial data 외 변경 시만 fetch
  const isInitial =
    page === 1 && sort === "newest" && sortDir === "desc" && perPage === initialData.perPage;
  useEffect(() => {
    if (isInitial) return;
    fetchPosts();
  }, [fetchPosts, isInitial]);

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className={styles.container}>
      {/* Hero — title + count + related tags 통합 */}
      <header className={styles.hero}>
        {/* Top row: TAG badge 좌측, Sort + perPage 우측 */}
        <div className={styles.heroTopRow}>
          <div className={styles.heroBadge}>
            <Hash size={18} strokeWidth={1.8} />
            <span>TAG</span>
          </div>
          <div className={styles.toolbar}>
            <SortGroup<Sort>
              items={[
                { value: "newest", label: "최신순" },
                { value: "popular", label: "인기순" },
                { value: "title", label: "제목순" },
              ]}
              value={sort}
              onChange={handleSortChange}
              sortDir={sortDir}
            />
            <Select
              className={styles.perPageSelect}
              value={String(perPage)}
              options={PER_PAGE_OPTIONS}
              onChange={(v) => { setPerPage(Number(v)); setPage(1); }}
            />
          </div>
        </div>
        <h1 className={styles.heroTitle}>{tag}</h1>
        {initialData.description && (
          <p className={styles.heroDescription}>{initialData.description}</p>
        )}
        <p className={styles.heroMeta}>
          <strong>{initialData.totalCount.toLocaleString()}</strong>개의 게시물
        </p>
        {initialData.relatedTags.length > 0 && (
          <div className={styles.relatedRow}>
            <span className={styles.relatedLabel}>관련 태그</span>
            <div className={styles.relatedTags}>
              {initialData.relatedTags.map(({ tag: rt, count }) => (
                <Link
                  key={rt}
                  href={`/posts/tags/${encodeURIComponent(rt)}`}
                  className={styles.relatedTag}
                  title={`${count}개 게시물`}
                >
                  #{rt}
                  <span className={styles.relatedTagCount}>{count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Grid */}
      <div className={`${styles.grid} ${loading ? styles.gridLoading : ""}`}>
        {posts.map((p) => (
          <PostCard key={p.id} post={p} variant="standard" />
        ))}
      </div>

      {/* Pagination — 항상 표시 (1페이지여도) */}
      <div className={styles.pagination}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className={styles.pageBtn}
          aria-label="이전"
        >
          <ChevronLeft size={16} />
        </button>
        {pageNumbers.map((p, i) =>
          p === -1 ? (
            <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className={styles.pageBtn}
          aria-label="다음"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/** pagination — 현재 페이지 주변 + 처음/마지막 + ellipsis */
function getPageNumbers(current: number, total: number): number[] {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: number[] = [1];
  if (current > 3) pages.push(-1);
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push(-1);
  pages.push(total);
  return pages;
}
