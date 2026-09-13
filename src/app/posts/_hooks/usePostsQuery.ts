"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { SEARCH_DEBOUNCE_MS, QUERY_PARAM } from "@/constants";
import type { Post } from "@/types/post";
import type { InitialPostsData } from "@/lib/posts";
import { usePostsFilters } from "./usePostsFilters";
import { usePostsSort } from "./usePostsSort";
import { LIST_PENDING_ATTR, listPointsAway } from "./postsListUrl";
import { usePageControls } from "@/hooks/usePageControls";

/** usePostsQuery 반환값 — 툴바 · 필터바 · 빈 상태가 이 하나를 받는다 */
export type PostsQuery = ReturnType<typeof usePostsQuery>;

/* 글 목록 쿼리 — 필터(usePostsFilters) + 정렬(usePostsSort) + 페이지/perPage 를 합쳐 /api/posts 를 받는다.
   서버가 미리 그린 기본 목록(initialData, 필터 없는 1쪽)으로 시작하고, 마운트 직후 주소의 필터와 ?page= 를 상태로 옮긴다.
   주소가 기본 목록과 다를 때만 그때 받고, 그 뒤로는 필터·정렬이 바뀌면 debounce 뒤 다시 받으며 page 를 1 로 되돌린다.
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
  const { search, searchType, syntaxMode, activeCategoryKey, activeTagsKey, activeSeries, activeAuthor, applyUrlParams } = filters;
  const sortState = usePostsSort({ timeline: postsLayout === "timeline" });
  const { sort, sortDir, randomSeed } = sortState;

  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [loading, setLoading] = useState(false);
  // faceted 태그 — 현재 필터(카테고리·태그·시리즈·검색)에 매칭되는 글들의 태그+개수.
  // /api/posts 응답의 facets 로 갱신 (무필터 초기값은 전체 allTags).
  const [facetTags, setFacetTags] = useState<{ tag: string; count: number }[]>(
    () => initialData.allTags.map((t) => ({ tag: t.tag, count: t.count })),
  );
  // 주소 쿼리를 상태로 옮겼는가. 옮기기 전에는 쪽 번호를 되돌리지도, 주소에 쓰지도, 다시 받지도 않는다
  const [urlApplied, setUrlApplied] = useState(false);
  // 필터·정렬이 바뀌면 page 를 1 로. 주소의 필터와 ?page= 를 함께 옮기는 커밋은 되돌리지 않는다
  const { page, setPage, perPage, setPerPage } = usePageControls({
    defaultPerPage,
    resetOn: [search, searchType, activeCategoryKey, activeTagsKey, activeSeries, sort, sortDir],
    holdReset: !urlApplied,
  });
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  // 주소를 옮긴 직후의 첫 요청 — 기본 목록과 같은 주소면 미리 그린 목록이 곧 그 결과라 건너뛰고("skip"), 다른 주소면
  // 목록을 가린 채 기다리므로 debounce 없이 바로 받는다("now")
  const urlFetchRef = useRef<"skip" | "now" | null>(null);

  /* 주소 쿼리 → 상태. 첫 렌더는 미리 그린 HTML 과 같아야 해서 기본값으로 그리고, 페인트 전에 옮긴다. 기본 목록과 다른 주소면
     거른 목록이 올 때까지 목록을 가린다. 첫 로드에서는 목록보다 앞의 스크립트가 이미 표시를 붙였고, 페이지 이동으로 들어오면
     그 스크립트가 돌지 않아 여기서 붙인다 */
  useLayoutEffect(() => {
    const { search: query } = window.location;
    const params = new URLSearchParams(query);
    applyUrlParams(params);
    const urlPage = Number(params.get(QUERY_PARAM.page));
    if (Number.isInteger(urlPage) && urlPage > 1) setPage(urlPage);
    const pointsAway = listPointsAway(query);
    urlFetchRef.current = pointsAway ? "now" : "skip";
    if (pointsAway) document.documentElement.setAttribute(LIST_PENDING_ATTR, "");
    setUrlApplied(true);
    return () => document.documentElement.removeAttribute(LIST_PENDING_ATTR);
  }, [applyUrlParams, setPage]);

  // page 변경 시 URL 동기화 — replace 로 history 누적 방지. page=1 일 땐 param 제거(깔끔)
  useEffect(() => {
    if (!urlApplied) return;
    const url = new URL(window.location.href);
    if (page > 1) url.searchParams.set(QUERY_PARAM.page, String(page));
    else url.searchParams.delete(QUERY_PARAM.page);
    window.history.replaceState(null, "", url.toString());
  }, [page, urlApplied]);

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
      document.documentElement.removeAttribute(LIST_PENDING_ATTR);
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setLoading(false);
      document.documentElement.removeAttribute(LIST_PENDING_ATTR);
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

  // 필터·정렬·쪽이 바뀌면 debounce 뒤 다시 받는다. 주소를 옮기기 전에는 받지 않는다
  useEffect(() => {
    if (!urlApplied) return;
    const urlFetch = urlFetchRef.current;
    urlFetchRef.current = null;
    if (urlFetch === "skip") return;
    setLoading(true);
    const debounce = setTimeout(fetchPosts, urlFetch === "now" ? 0 : SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounce);
  }, [fetchPosts, urlApplied]);

  return { ...filters, ...sortState, posts, loading, facetTags, perPage, setPerPage, page, setPage, totalPages };
}
