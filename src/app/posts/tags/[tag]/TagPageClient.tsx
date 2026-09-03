"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchControls } from "@/hooks/useSearchControls";
import { useSortToggle } from "@/hooks/useSortToggle";
import { usePageControls } from "@/hooks/usePageControls";
import { QUERY_PARAM } from "@/constants";
import type { Post } from "@/types/post";
import type { TagPageData, AllTagsData } from "@/lib/posts";
import { useLenis } from "@/providers/LenisProvider";
import { useStickyFilterBar } from "@/hooks/useStickyFilterBar";
import PostCard from "../../_components/PostCard";
import TagPageToolbar, { type TagSort } from "./_components/TagPageToolbar";
import RelatedTagsPanel from "./_components/RelatedTagsPanel";
import TagWorksSection from "./_components/TagWorksSection";
import Pagination from "@/components/ui/Pagination";
import { parseSearchQuery, matchesQuery } from "@/lib/searchQuery";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import styles from "./TagPage.module.css";

interface Props {
  tag: string;
  initialData: TagPageData;
  allTags: AllTagsData["tags"];
}

export default function TagPageClient({ tag, initialData, allTags }: Props) {
  const { setInfinite } = useLenis();
  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const { sortBy: sort, sortDir, handleSortChange: toggleSort } = useSortToggle<TagSort>("newest", "desc");
  const [loading, setLoading] = useState(false);
  const searchControls = useSearchControls<"all" | "title" | "content">("all");
  const { search, searchType, syntaxMode } = searchControls;
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

  // extraTags 정렬+CSV — Set 자체는 deps 비교 안 됨, key 로 변환
  const extraTagsKey = useMemo(
    () => Array.from(extraTags).sort().join(","),
    [extraTags],
  );

  // page · perPage — extraTags 가 바뀌면 1페이지로(totalPages 재계산). 정렬·perPage 클릭은 같은 이벤트에서 setPage(1)
  const { page, setPage, perPage, setPerPage } = usePageControls({ defaultPerPage: initialData.perPage, resetOn: [extraTagsKey] });

  // Sticky filter bar — 공통 hook
  const { sentinelRef, filterBarRef, isStuck, barHidden } = useStickyFilterBar();

  // Lenis infinite scroll 끄기 — 이 페이지에선 자연스러운 끝(페이지네이션) 도달 필요
  useEffect(() => {
    setInfinite(false);
  }, [setInfinite]);

  // 같은 sort 다시 클릭 → dir toggle, 다른 sort → default desc. page 리셋은 같은 이벤트에서(효과로 늦추면 fetch 두 번)
  const handleSortChange = (v: TagSort) => {
    toggleSort(v);
    setPage(1);
  };

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
        params.set(QUERY_PARAM.tag, tag);
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
    if (isInitial) {
      // 초기 파라미터로 복귀(전체 클릭 / 태그 해제 / 다중선택 off) 시 SSR 초기 데이터 복원 —
      // 안 하면 이전 교집합 결과가 그대로 남음. 마운트 시엔 이미 같은 값이라 no-op.
      setPosts(initialData.posts);
      setTotalPages(initialData.totalPages);
      return;
    }
    fetchPosts();
  }, [fetchPosts, isInitial, initialData]);

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

      {/* heroTopRow — 뒤로 · TAG 배지 · 정렬 · perPage · 검색. sticky, scroll-down 시 hide */}
      <TagPageToolbar
        ref={filterBarRef}
        isStuck={isStuck}
        barHidden={barHidden}
        sort={sort}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        perPage={perPage}
        onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
        searchControls={searchControls}
        hasResults={filteredPosts.length > 0}
      />

      {/* Hero — title + count + related tags */}
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>{tag}</h1>
        {initialData.description && (
          <p className={styles.heroDescription}>{initialData.description}</p>
        )}
        <p className={styles.heroMeta}>
          <strong>{initialData.totalCount.toLocaleString()}</strong>개의 게시물
        </p>
        <RelatedTagsPanel
          tag={tag}
          relatedTags={initialData.relatedTags}
          allTags={allTags}
          selectMode={selectMode}
          onToggleSelectMode={toggleSelectMode}
          extraTags={extraTags}
          onToggleExtraTag={toggleExtraTag}
          onClearExtraTags={() => setExtraTags(new Set())}
        />
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

      {/* 통합 태그 — 같은 기술(tech)을 쓴 작업물. tags↔tech 공유 어휘. */}
      <TagWorksSection works={initialData.works} />
    </div>
    </SearchHighlightProvider>
  );
}
