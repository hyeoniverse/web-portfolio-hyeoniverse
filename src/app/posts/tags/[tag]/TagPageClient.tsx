"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Hash } from "lucide-react";
import type { Post } from "@/types/post";
import type { TagPageData } from "@/lib/posts";
import { useLenis } from "@/providers/LenisProvider";
import { useStickyFilterBar } from "@/hooks/useStickyFilterBar";
import PostCard from "../../_components/PostCard";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import Tooltip from "@/components/ui/Tooltip";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { parseSearchQuery, matchesQuery, type SyntaxMode } from "@/lib/searchQuery";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
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
  const [searchType, setSearchType] = useState<"all" | "title" | "content">("all");
  const [syntaxMode, setSyntaxMode] = useState<SyntaxMode>("prefix");
  // 추가 태그 필터 — selectMode 켤 때 관련 태그 클릭으로 토글. client-side 교집합 필터.
  const [extraTags, setExtraTags] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const toggleExtraTag = (t: string) => {
    setExtraTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };
  const toggleSelectMode = () => {
    setSelectMode((m) => {
      if (m) setExtraTags(new Set()); // 끄면 선택 클리어
      return !m;
    });
  };

  // Sticky filter bar — 공통 hook
  const { sentinelRef, filterBarRef, isStuck, barHidden } = useStickyFilterBar();

  // Lenis infinite scroll 끄기 — 이 페이지에선 자연스러운 끝(페이지네이션) 도달 필요
  useEffect(() => {
    setInfinite(false);
  }, [setInfinite]);

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

  // extraTags 정렬+CSV — Set 자체는 deps 비교 안 됨, key 로 변환
  const extraTagsKey = useMemo(
    () => Array.from(extraTags).sort().join(","),
    [extraTags],
  );

  // sort/page/perPage/extraTags 변경 시 fetch. 다중 태그면 tags= CSV 사용 (교집합)
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sort,
        sortDir,
        page: String(page),
        limit: String(perPage),
      });
      if (extraTagsKey) {
        params.set("tags", `${tag},${extraTagsKey}`);
      } else {
        params.set("tag", tag);
      }
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
  }, [tag, sort, sortDir, page, perPage, extraTagsKey]);

  // initial data 외 변경 시만 fetch (extraTags 도 0 일 때만 initial)
  const isInitial =
    page === 1 && sort === "newest" && sortDir === "desc" && perPage === initialData.perPage && extraTagsKey === "";
  useEffect(() => {
    if (isInitial) return;
    fetchPosts();
  }, [fetchPosts, isInitial]);

  // extraTags 변경 시 page 1 로 reset (totalPages 재계산 위해)
  useEffect(() => {
    setPage(1);
  }, [extraTagsKey]);

  // 검색 client-side filter (다중 태그 교집합은 서버가 처리)
  const filteredPosts = useMemo(() => {
    const q = search.trim();
    if (!q) return posts;
    const parsed = parseSearchQuery(q, syntaxMode);
    const titleHaystack = (p: Post) => [p.title, p.title_en].filter(Boolean).join("\n");
    const contentHaystack = (p: Post) => [p.content, p.content_en, p.excerpt, p.excerpt_en].filter(Boolean).join("\n");
    return posts.filter((p) => {
      if (searchType === "title") return matchesQuery(titleHaystack(p), parsed);
      if (searchType === "content") return matchesQuery(contentHaystack(p), parsed);
      return matchesQuery(`${titleHaystack(p)}\n${contentHaystack(p)}`, parsed);
    });
  }, [posts, search, searchType, syntaxMode]);

  return (
    <SearchHighlightProvider query={search} mode={syntaxMode}>
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
          <div className={styles.toolbarLeft}>
            <SegmentedControl<Sort>
              items={[
                { value: "newest", label: "최신순" },
                { value: "popular", label: "인기순" },
                { value: "title", label: "제목순" },
              ]}
              value={sort}
              onChange={handleSortChange}
              sortDir={sortDir}
            />
          </div>
          <SearchCapsule
            search={search}
            onSearchChange={setSearch}
            align="right"
            placeholder="이 태그 안에서 검색…"
            className={styles.heroSearch}
            routeParam="q"
            hasResults={filteredPosts.length > 0}
            onSearchOptionsChange={(opts) => setSyntaxMode(opts.syntaxMode)}
            typeSelector={{
              value: searchType,
              options: [
                { value: "all", label: "제목+내용" },
                { value: "title", label: "제목" },
                { value: "content", label: "내용" },
              ],
              onChange: (v) => setSearchType(v as "all" | "title" | "content"),
            }}
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
            <div className={styles.relatedHeader}>
              <Tooltip
                placement="top"
                delay={200}
                content={
                  <div className={styles.relatedLabelTooltip}>
                    <div className={styles.relatedLabelTooltipMain}>Related Tags</div>
                    <div className={styles.relatedLabelTooltipDesc}>
                      이 태그와 같은 게시물에 함께 쓰인 다른 태그 — 같이 등장한 빈도순 정렬.
                      &lsquo;다중 선택&rsquo; 켜면 클릭으로 추가 필터, 끄면 클릭으로 해당 태그 페이지 이동.
                    </div>
                  </div>
                }
              >
                <span className={styles.relatedLabel}>관련 태그</span>
              </Tooltip>
              <Button
                variant="outline"
                size="2xs"
                active={selectMode}
                className={styles.selectModeBtn}
                onClick={toggleSelectMode}
                title={selectMode ? "다중 선택 끄기" : "다중 선택 켜기 — 여러 태그로 추가 필터"}
              >
                다중 선택
              </Button>
            </div>
            <div className={styles.relatedTags}>
              {initialData.relatedTags.map(({ tag: rt, count }) => {
                const active = extraTags.has(rt);
                const inner = (
                  <>
                    <span>#{rt}</span>
                    <span className={styles.relatedPillCount}>{count}</span>
                  </>
                );
                if (selectMode) {
                  return (
                    <button
                      key={rt}
                      type="button"
                      className={`${styles.relatedPill} ${styles.relatedPillSelectable} ${active ? styles.relatedPillActive : ""}`}
                      onClick={() => toggleExtraTag(rt)}
                    >
                      {inner}
                    </button>
                  );
                }
                return (
                  <Link
                    key={rt}
                    href={`/posts/tags/${encodeURIComponent(rt)}`}
                    className={styles.relatedPill}
                  >
                    {inner}
                  </Link>
                );
              })}
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
    </SearchHighlightProvider>
  );
}
