"use client";

import { useState, useCallback } from "react";

/* 정렬 기준 + 방향 — 같은 기준을 다시 고르면 방향 토글, 다른 기준이면 그 기준의 기본 방향으로.
   기본 방향은 호출부가 기준별로 정한다(제목·저자는 asc, 나머지 desc 처럼). */
export function useSortToggle<T extends string>(
  defaultBy: T,
  defaultDir: "asc" | "desc",
  dirFor: (by: T) => "asc" | "desc" = () => defaultDir,
) {
  const [sortBy, setSortBy] = useState<T>(defaultBy);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultDir);
  const handleSortChange = useCallback((by: T) => {
    if (sortBy === by) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(by);
      setSortDir(dirFor(by));
    }
  }, [sortBy, dirFor]);
  return { sortBy, setSortBy, sortDir, setSortDir, handleSortChange };
}
