"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QUERY_PARAM } from "@/constants";
import type { Series } from "@/types/post";

export type SeriesSortBy = "default" | "newest" | "title" | "random";

/* 시리즈 목록 fetch — 카테고리/태그 필터나 정렬이 바뀌면 다시 받고(첫 마운트는 SSR 목록 유지),
   가로 스크롤이 끝에 닿으면(loadMore) 다음 페이지를 이어붙인다. random 은 client-side 셔플이라 API 엔 default 로 보낸다. */
export function useSeriesFeed({
  initialList,
  initialTotal,
  perPage,
  activeCategoryKey,
  activeTagsKey,
}: {
  initialList: Series[];
  initialTotal: number;
  perPage: number;
  activeCategoryKey: string | null;
  activeTagsKey: string | null;
}) {
  const [seriesList, setSeriesList] = useState<Series[]>(initialList);
  const [seriesPage, setSeriesPage] = useState(0);
  const [seriesTotal, setSeriesTotal] = useState(initialTotal);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesSortBy, setSeriesSortBy] = useState<SeriesSortBy>("default");
  const [seriesSortDir, setSeriesSortDir] = useState<"asc" | "desc">("asc");

  // 시리즈 fetch 공통 파라미터 빌더
  const buildSeriesParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      if (activeCategoryKey) params.set(QUERY_PARAM.category, activeCategoryKey);
      if (activeTagsKey) params.set("tags", activeTagsKey);
      params.set(QUERY_PARAM.page, String(page));
      params.set(QUERY_PARAM.limit, String(perPage));
      // random 은 client-side 셔플이라 API 에 안 보냄 — default 와 같이 처리
      if (seriesSortBy !== "default" && seriesSortBy !== "random") {
        params.set("sortBy", seriesSortBy);
        params.set("sortDir", seriesSortDir);
      }
      return params;
    },
    [activeCategoryKey, activeTagsKey, perPage, seriesSortBy, seriesSortDir],
  );

  // Fetch series when category/sort changes — initial mount 은 skip (SSR 의 auto_cover_url 보존)
  const isFirstSeriesFetch = useRef(true);
  useEffect(() => {
    if (isFirstSeriesFetch.current) {
      isFirstSeriesFetch.current = false;
      return;
    }
    fetch(`/api/series?${buildSeriesParams(0)}`)
      .then((res) => res.json())
      .then((data) => {
        setSeriesList(Array.isArray(data?.items) ? data.items : []);
        setSeriesTotal(typeof data?.total === "number" ? data.total : 0);
        setSeriesPage(0);
      });
  }, [buildSeriesParams]);

  // 시리즈 추가 페이지 로드 — 가로 스크롤이 끝에 다다르면 호출
  const loadMoreSeries = useCallback(async () => {
    if (seriesLoading) return;
    if (seriesList.length >= seriesTotal) return;
    setSeriesLoading(true);
    try {
      const nextPage = seriesPage + 1;
      const res = await fetch(`/api/series?${buildSeriesParams(nextPage)}`);
      const data = await res.json();
      const items: Series[] = Array.isArray(data?.items) ? data.items : [];
      setSeriesList((prev) => {
        // 중복 방지 (Strict Mode 대응)
        const seen = new Set(prev.map((s) => s.id));
        const merged = [...prev, ...items.filter((s) => !seen.has(s.id))];
        return merged;
      });
      if (typeof data?.total === "number") setSeriesTotal(data.total);
      setSeriesPage(nextPage);
    } finally {
      setSeriesLoading(false);
    }
  }, [
    seriesLoading,
    seriesList.length,
    seriesTotal,
    seriesPage,
    buildSeriesParams,
  ]);

  // 정렬 버튼 클릭 — 같은 기준 누르면 방향 토글, 다른 기준이면 기본 방향으로 전환
  const handleSeriesSortClick = useCallback(
    (by: SeriesSortBy) => {
      if (seriesSortBy === by) {
        setSeriesSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSeriesSortBy(by);
        // newest 의 직관적 기본은 desc (최신이 먼저), title/default 는 asc
        setSeriesSortDir(by === "newest" ? "desc" : "asc");
      }
    },
    [seriesSortBy],
  );

  return { seriesList, seriesSortBy, setSeriesSortBy, seriesSortDir, handleSeriesSortClick, loadMoreSeries };
}
