"use client";

import { useState, useEffect, useCallback } from "react";

export type PostsSortBy = "date" | "popular" | "title" | "random" | "author";
export type PopularSort = "score" | "views" | "comments" | "likes";

/* 글 목록 정렬 — 기준(sortBy) · 방향 · popular 세부 메트릭 · random seed 와 API 용 sort 값.
   툴바가 부르는 동작: handleSortChange(같은 기준이면 방향 토글, 다른 기준이면 기본 방향) · shuffle(random + 새 seed) · resetSort. */
export function usePostsSort({ timeline }: { timeline: boolean }) {
  const [sortBy, setSortBy] = useState<PostsSortBy>(
    "date",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // 타임라인 레이아웃은 월 그룹 마커라 시간순만 유효 — 다른 정렬이면 date 로 강제(마커 깨짐 방지).
  useEffect(() => {
    if (timeline && sortBy !== "date") setSortBy("date");
  }, [timeline, sortBy]);
  // popular 그룹 안 세부 메트릭 — 종합 / 조회 / 댓글 / 좋아요
  const [popularSort, setPopularSort] = useState<PopularSort>("score");
  const [randomSeed, setRandomSeed] = useState(() =>
    Math.floor(Math.random() * 1e9),
  );
  // API 호환 — sortBy=popular 면 popularSort 메트릭 매핑 (score/views/likes/comments)
  const sort:
    | "newest"
    | "oldest"
    | "popular"
    | "title"
    | "random"
    | "author"
    | "views"
    | "likes"
    | "comments" =
    sortBy === "popular"
      ? popularSort === "score"
        ? "popular"
        : popularSort
      : sortBy === "title"
        ? "title"
        : sortBy === "author"
          ? "author"
          : sortBy === "random"
            ? "random"
            : sortDir === "desc"
              ? "newest"
              : "oldest";

  const handleSortChange = useCallback((v: Exclude<PostsSortBy, "random">) => {
    if (sortBy === v) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(v);
      setSortDir(v === "title" || v === "author" ? "asc" : "desc");
    }
  }, [sortBy]);
  const shuffle = useCallback(() => {
    if (sortBy === "random") {
      setRandomSeed(Math.floor(Math.random() * 1e9));
    } else {
      setSortBy("random");
      setRandomSeed(Math.floor(Math.random() * 1e9));
    }
  }, [sortBy]);
  const resetSort = useCallback(() => {
    setSortBy("date");
    setSortDir("desc");
  }, []);

  return { sortBy, sortDir, popularSort, setPopularSort, randomSeed, sort, handleSortChange, shuffle, resetSort };
}
