"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "search-history:";
const DEFAULT_LIMIT = 10;

/** localStorage 기반 검색어 이력 — key 단위로 분리. */
export function useSearchHistory(key: string, limit: number = DEFAULT_LIMIT) {
  const [items, setItems] = useState<string[]>([]);

  /* 최초 로드 */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter((s): s is string => typeof s === "string"));
      }
    } catch { /* swallow */ }
  }, [key]);

  const persist = useCallback((next: string[]) => {
    setItems(next);
    if (typeof window === "undefined") return;
    try { localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(next)); }
    catch { /* swallow (quota etc.) */ }
  }, [key]);

  /** 새 검색어 추가 — 빈 문자열 무시, 중복 제거 후 맨 앞으로. limit 초과 시 마지막 제거. */
  const add = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setItems((prev) => {
      const filtered = prev.filter((s) => s !== trimmed);
      const next = [trimmed, ...filtered].slice(0, limit);
      if (typeof window !== "undefined") {
        try { localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(next)); }
        catch { /* swallow */ }
      }
      return next;
    });
  }, [key, limit]);

  const remove = useCallback((q: string) => {
    setItems((prev) => {
      const next = prev.filter((s) => s !== q);
      if (typeof window !== "undefined") {
        try { localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(next)); }
        catch { /* swallow */ }
      }
      return next;
    });
  }, [key]);

  const clear = useCallback(() => persist([]), [persist]);

  return { items, add, remove, clear };
}
