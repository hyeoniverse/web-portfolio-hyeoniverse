"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { Hash } from "lucide-react";
import type { Post } from "@/types/post";
import type { TagPageData } from "@/lib/posts";
import { useLenis } from "@/providers/LenisProvider";
import PostCard from "../../_components/PostCard";
import SortGroup from "@/components/ui/SortGroup";
import Select from "@/components/ui/Select";
import Tooltip from "@/components/ui/Tooltip";
import Pagination from "@/components/ui/Pagination";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import TagPill from "@/components/ui/TagPill";
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
  const { setInfinite } = useLenis();
  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialData.perPage);
  const [sort, setSort] = useState<Sort>("newest");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // ── Sticky filter bar (heroTopRow) — posts 페이지와 동일 패턴 ──
  const [isStuck, setIsStuck] = useState(false);
  const [barHidden, setBarHidden] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const isStuckRef = useRef(false);
  const lastScrollY = useRef(0);

  // Lenis infinite scroll 끄기 — 이 페이지에선 자연스러운 끝(페이지네이션) 도달 필요
  useEffect(() => {
    setInfinite(false);
    return () => setInfinite(true);
  }, [setInfinite]);

  // sentinel 이 stickyTop 라인을 넘는 순간 = stuck
  useEffect(() => {
    const el = sentinelRef.current;
    const fb = filterBarRef.current;
    if (!el || !fb) return;
    let observer: IntersectionObserver | null = null;
    const setup = () => {
      observer?.disconnect();
      const stickyTop = parseFloat(window.getComputedStyle(fb).top) || 0;
      observer = new IntersectionObserver(
        ([entry]) => {
          const stuck = !entry.isIntersecting;
          isStuckRef.current = stuck;
          setIsStuck(stuck);
          if (!stuck) setBarHidden(false);
        },
        { rootMargin: `-${stickyTop + 1}px 0px 0px 0px`, threshold: 0 },
      );
      observer.observe(el);
    };
    setup();
    window.addEventListener("resize", setup);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", setup);
    };
  }, []);

  // scroll-down → bar hide / scroll-up → show (stuck 일 때만)
  useEffect(() => {
    const threshold = 3;
    let accumulated = 0;
    const triggerDist = 15;
    const handleScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;
      if (!isStuckRef.current) { accumulated = 0; return; }
      if ((accumulated > 0 && delta < -threshold) || (accumulated < 0 && delta > threshold)) accumulated = 0;
      accumulated += delta;
      if (accumulated > triggerDist) { setBarHidden(true); accumulated = 0; }
      else if (accumulated < -triggerDist) { setBarHidden(false); accumulated = 0; }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  // 검색 — 현재 로드된 페이지 posts 안에서 title/title_en 매칭 (간단 client-side filter)
  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => {
      const ko = p.title?.toLowerCase() ?? "";
      const en = p.title_en?.toLowerCase() ?? "";
      return ko.includes(q) || en.includes(q);
    });
  }, [posts, search]);

  return (
    <div className={styles.container}>
      {/* Sticky 감지용 sentinel — heroTopRow 바로 위에 0-height 로 두고
         viewport top 라인을 넘는 순간 stuck = true */}
      <div ref={sentinelRef} style={{ height: 0 }} />

      {/* heroTopRow — TAG badge · 검색 · sort · perPage. position: sticky.
         scroll-down 시 hide, scroll-up 시 show */}
      <div
        ref={filterBarRef}
        className={`${styles.heroTopRow} ${isStuck ? styles.heroTopRowStuck : ""} ${barHidden ? styles.heroTopRowHidden : ""}`}
      >
        <Link href="/posts/tags" className={styles.heroBadge} title="전체 태그 보기">
          <Hash size={18} strokeWidth={1.8} />
          <span>TAG</span>
        </Link>
        <div className={styles.toolbar}>
          <SearchCapsule
            search={search}
            onSearchChange={setSearch}
            placeholder="이 태그 안에서 검색…"
            className={styles.heroSearch}
          />
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

      {/* Hero — title + count + related tags */}
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>{tag}</h1>
        {initialData.description && (
          <p className={styles.heroDescription}>{initialData.description}</p>
        )}
        <p className={styles.heroMeta}>
          <strong>{initialData.totalCount.toLocaleString()}</strong>개의 게시물
        </p>
        {initialData.relatedTags.length > 0 && (
          <div className={styles.relatedRow}>
            <Tooltip
              placement="top"
              delay={200}
              content={
                <div className={styles.relatedLabelTooltip}>
                  <div className={styles.relatedLabelTooltipMain}>Related Tags</div>
                  <div className={styles.relatedLabelTooltipDesc}>
                    이 태그와 같은 게시물에 함께 쓰인 다른 태그 — 같이 등장한 빈도순 정렬
                  </div>
                </div>
              }
            >
              <span className={styles.relatedLabel}>관련 태그</span>
            </Tooltip>
            <div className={styles.relatedTags}>
              {initialData.relatedTags.map(({ tag: rt, count }) => (
                <TagPill key={rt} tag={rt} count={count} />
              ))}
            </div>
          </div>
        )}

      </header>

      {/* Grid */}
      <div className={`${styles.grid} ${loading ? styles.gridLoading : ""}`}>
        {filteredPosts.map((p) => (
          <PostCard key={p.id} post={p} variant="standard" />
        ))}
      </div>

      {/* Pagination — 항상 표시 (1페이지여도) */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
        className={styles.pagination}
      />
    </div>
  );
}
