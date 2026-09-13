"use client";

import { useState, useMemo, useCallback } from "react";
import { QUERY_PARAM } from "@/constants";
import { useSearchControls } from "@/hooks/useSearchControls";

/** "a, b,,c" → ["a", "b", "c"] */
const splitCsv = (raw: string | null) => (raw ?? "").split(",").map((v) => v.trim()).filter(Boolean);

/* 글 목록 필터 — 검색(어·범위·문법) · 카테고리(다중) · 태그(다중 OR) · 저자 · 시리즈.
   필터 없이 시작한다. 미리 그린 HTML 이 필터 없는 목록이라 첫 렌더도 같아야 하고, 주소 쿼리(?category=a,b · ?tag=x,y ·
   ?author= · ?series= · ?q=)는 마운트 직후 usePostsQuery 가 applyUrlParams 로 옮긴다.
   *Key 는 정렬된 CSV — fetch 파라미터이자 effect 의존성(순서 무관 동일성). */
export function usePostsFilters({ allTags }: { allTags: { tag: string; count: number }[] }) {
  const { search, setSearch, searchType, setSearchType, syntaxMode, setSyntaxMode } =
    useSearchControls<"all" | "title" | "content">("all");
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const activeCategoryKey = useMemo(
    () => [...activeCategories].sort().join(","),
    [activeCategories],
  );
  const [activeTags, setActiveTags] = useState<Set<string>>(() => new Set());
  const activeTagsKey = useMemo(
    () => Array.from(activeTags).sort().join(","),
    [activeTags],
  );
  const toggleActiveTag = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      // 모든 태그가 선택되면 = 필터 없음 → 클리어(전체)
      const all = allTags;
      if (all.length > 0 && all.every((t) => next.has(t.tag))) return new Set();
      return next;
    });
  }, [allTags]);
  const clearActiveTags = useCallback(() => setActiveTags(new Set()), []);
  const [activeAuthor, setActiveAuthor] = useState<string | null>(null);
  // /posts?series=<id> 로 진입하면(시리즈 카드 클릭) 해당 시리즈로 거른다
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const toggleActiveSeries = useCallback((seriesId: string) => {
    setActiveSeries((prev) => (prev === seriesId ? null : seriesId));
  }, []);
  const hasActiveFilter = !!search || activeTags.size > 0 || !!activeSeries || activeCategories.length > 0;

  /** 주소 쿼리를 필터로 옮긴다. 주소에 없는 필터는 건드리지 않는다 */
  const applyUrlParams = useCallback((params: URLSearchParams) => {
    const categories = splitCsv(params.get(QUERY_PARAM.category));
    if (categories.length) setActiveCategories(categories);
    const tags = splitCsv(params.get(QUERY_PARAM.tag));
    if (tags.length) setActiveTags(new Set(tags));
    const author = params.get(QUERY_PARAM.author);
    if (author) setActiveAuthor(author);
    const series = params.get(QUERY_PARAM.series);
    if (series) setActiveSeries(series);
    const q = params.get(QUERY_PARAM.q);
    if (q) setSearch(q);
  }, [setSearch]);

  return {
    search, setSearch, searchType, setSearchType, syntaxMode, setSyntaxMode,
    activeCategories, setActiveCategories, activeCategoryKey,
    activeTags, activeTagsKey, toggleActiveTag, clearActiveTags,
    activeAuthor, setActiveAuthor,
    activeSeries, setActiveSeries, toggleActiveSeries,
    hasActiveFilter, applyUrlParams,
  };
}
