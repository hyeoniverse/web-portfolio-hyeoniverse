"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SEARCH_DEBOUNCE_MS, QUERY_PARAM } from "@/constants";
import type { Post } from "@/types/post";
import type { InitialPostsData } from "@/lib/posts";
import { usePostsFilters } from "./usePostsFilters";
import { usePostsSort } from "./usePostsSort";

/** usePostsQuery 반환값 — 툴바 · 필터바 · 빈 상태가 이 하나를 받는다 */
export type PostsQuery = ReturnType<typeof usePostsQuery>;

/* 글 목록 쿼리 — 필터(usePostsFilters) + 정렬(usePostsSort) + 페이지/perPage 를 합쳐 /api/posts 를 받는다.
   SSR initialData 로 시작하고, 필터·정렬이 바뀌면 debounce 뒤 다시 받으며 page 를 1 로 되돌린다(첫 mount 는 URL ?page= 보존).
   타임라인(무한 스크롤)은 page>1 을 이어붙이고, 그 외는 교체. page 는 URL ?page= 와 동기화한다. */
export function usePostsQuery({
  initialData,
  postsLayout,
  defaultPerPage,
}: {
  initialData: InitialPostsData;
  postsLayout: string;
  defaultPerPage: number;
}) {
  const filters = usePostsFilters({ allTags: initialData.allTags });
  const { search, searchType, syntaxMode, activeCategoryKey, activeTagsKey, activeSeries, activeAuthor, activeTags, activeCategories } = filters;
  const sortState = usePostsSort({ timeline: postsLayout === "timeline" });
  const { sort, sortDir, randomSeed } = sortState;

  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [loading, setLoading] = useState(false);
  // faceted 태그 — 현재 필터(카테고리·태그·시리즈·검색)에 매칭되는 글들의 태그+개수.
  // /api/posts 응답의 facets 로 갱신 (무필터 초기값은 전체 allTags).
  const [facetTags, setFacetTags] = useState<{ tag: string; count: number }[]>(
    () => initialData.allTags.map((t) => ({ tag: t.tag, count: t.count })),
  );
  const [perPage, setPerPage] = useState(defaultPerPage);
  const urlSearchParams = useSearchParams();
  // 초기 page 값 URL 의 ?page= 에서 읽음 — 새로고침해도 같은 페이지 유지
  const [page, setPage] = useState(() => {
    const p = Number(urlSearchParams?.get(QUERY_PARAM.page));
    return Number.isFinite(p) && p >= 1 ? p : 1;
  });
  const [totalPages, setTotalPages] = useState(initialData.totalPages);

  // page 변경 시 URL 동기화 — replace 로 history 누적 방지. page=1 일 땐 param 제거(깔끔)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (page > 1) url.searchParams.set(QUERY_PARAM.page, String(page));
    else url.searchParams.delete(QUERY_PARAM.page);
    window.history.replaceState(null, "", url.toString());
  }, [page]);
  const [isInitial, setIsInitial] = useState(true);

  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) {
      params.set("search", search);
      params.set("searchType", searchType);
      params.set("syntaxMode", syntaxMode);
    }
    if (activeCategoryKey) params.set(QUERY_PARAM.category, activeCategoryKey);
    if (activeTagsKey) params.set("tags", activeTagsKey);
    if (activeSeries) params.set("series_id", activeSeries);
    if (activeAuthor) params.set("author", activeAuthor);
    params.set(QUERY_PARAM.sort, sort);
    params.set("sortDir", sortDir);
    if (sort === "random") params.set("seed", String(randomSeed));
    params.set(QUERY_PARAM.page, String(page));
    params.set(QUERY_PARAM.limit, String(perPage));

    // 이전 pending 요청 cancel — 빠른 sort/필터 변경 시 race condition + 중복 카드 방지
    fetchAbortRef.current?.abort();
    const ac = new AbortController();
    fetchAbortRef.current = ac;

    try {
      const res = await fetch(`/api/posts?${params}`, { signal: ac.signal });
      const data = await res.json();
      // 응답 도착 시점에 이미 새 요청이 시작됐다면 무시 (stale write 방지)
      if (fetchAbortRef.current !== ac) return;
      const incoming = (data.posts ?? []) as Post[];
      // 타임라인(히스토리)은 무한 스크롤 — page>1 이면 이어붙임(중복 id 제거). 그 외엔 교체(페이지네이션).
      setPosts((prev) => {
        if (!(postsLayout === "timeline" && page > 1)) return incoming;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...incoming.filter((p) => !seen.has(p.id))];
      });
      setTotalPages(data.totalPages ?? 1);
      if (Array.isArray(data.facets)) setFacetTags(data.facets);
      setLoading(false);
      fetchAbortRef.current = null;
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setLoading(false);
    }
  }, [
    search,
    searchType,
    syntaxMode,
    activeCategoryKey,
    activeTagsKey,
    activeSeries,
    activeAuthor,
    sort,
    sortDir,
    randomSeed,
    page,
    perPage,
    postsLayout,
  ]);

  // Fetch posts when filters change (skip initial if page=1 — SSR 데이터가 page 1).
  // URL ?page=N (N>1) 으로 진입 시 SSR 데이터 없으므로 초기 mount 에도 fetch 필요.
  useEffect(() => {
    if (isInitial) {
      setIsInitial(false);
      // SSR initialData 는 필터 미적용 목록 — URL 로 필터(시리즈/태그)가 걸린 채 진입하면
      // page 1 이어도 다시 fetch 해야 필터가 반영됨.
      const hasUrlFilter = !!activeSeries || activeTags.size > 0 || activeCategories.length > 0;
      if (page === 1 && !hasUrlFilter) return; // SSR 와 동일(무필터 page 1) → 재요청 불필요
    }
    setLoading(true);
    const debounce = setTimeout(fetchPosts, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPosts, isInitial]);

  // 필터 변경 시 page 리셋 — 단, 첫 mount 는 skip (URL ?page= 으로 초기화된 값 보존)
  const filterChangeRef = useRef(false);
  useEffect(() => {
    if (!filterChangeRef.current) { filterChangeRef.current = true; return; }
    setPage(1);
  }, [
    search,
    searchType,
    activeCategoryKey,
    activeTagsKey,
    activeSeries,
    sort,
    sortDir,
  ]);

  return { ...filters, ...sortState, posts, loading, facetTags, perPage, setPerPage, page, setPage, totalPages };
}
