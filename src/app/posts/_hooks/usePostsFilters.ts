"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { QUERY_PARAM } from "@/constants";
import { useSearchControls } from "@/hooks/useSearchControls";

/* 글 목록 필터 — 검색(어·범위·문법) · 카테고리(다중) · 태그(다중 OR) · 저자 · 시리즈.
   카테고리 · 태그 · 저자 · 시리즈는 URL 쿼리(?category=a,b · ?tag=x,y · ?author= · ?series=)로 초기화한다.
   *Key 는 정렬된 CSV — fetch 파라미터이자 effect 의존성(순서 무관 동일성). */
export function usePostsFilters({ allTags }: { allTags: { tag: string; count: number }[] }) {
  const { search, setSearch, searchType, setSearchType, syntaxMode, setSyntaxMode } =
    useSearchControls<"all" | "title" | "content">("all");
  // URL query (?tag=foo,bar / ?category=a,b CSV) 도착 시 초기값 sync — 다중 선택(OR)
  const urlSearchParams = useSearchParams();
  const [activeCategories, setActiveCategories] = useState<string[]>(() => {
    const raw = urlSearchParams?.get(QUERY_PARAM.category);
    return raw ? raw.split(",").map((c) => c.trim()).filter(Boolean) : [];
  });
  const activeCategoryKey = useMemo(
    () => [...activeCategories].sort().join(","),
    [activeCategories],
  );
  const [activeTags, setActiveTags] = useState<Set<string>>(() => {
    const raw = urlSearchParams?.get(QUERY_PARAM.tag);
    return new Set(
      raw
        ? raw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    );
  });
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
  const [activeAuthor, setActiveAuthor] = useState<string | null>(() => urlSearchParams?.get("author") ?? null);
  // /posts?series=<id> 로 진입 시(시리즈 카드 클릭) 해당 시리즈로 초기 필터
  const [activeSeries, setActiveSeries] = useState<string | null>(() => urlSearchParams?.get(QUERY_PARAM.series) ?? null);
  const toggleActiveSeries = useCallback((seriesId: string) => {
    setActiveSeries((prev) => (prev === seriesId ? null : seriesId));
  }, []);
  const hasActiveFilter = !!search || activeTags.size > 0 || !!activeSeries || activeCategories.length > 0;

  return {
    search, setSearch, searchType, setSearchType, syntaxMode, setSyntaxMode,
    activeCategories, setActiveCategories, activeCategoryKey,
    activeTags, activeTagsKey, toggleActiveTag, clearActiveTags,
    activeAuthor, setActiveAuthor,
    activeSeries, setActiveSeries, toggleActiveSeries,
    hasActiveFilter,
  };
}
