"use client";

import { useCallback, useEffect, useState } from "react";

export type HistorySource = "ai" | "unsplash" | "preset";

export interface HistoryItem {
  url: string;
  source: HistorySource;
  /** AI: prompt / Unsplash: photographer / Preset: preset name */
  meta: string;
  ts: number;
}

interface ServerRow {
  id: string;
  url: string;
  source: HistorySource;
  meta: string;
  created_at: string;
}

const API = "/api/admin/cover-history";

/**
 * Cover image picker 의 통합 이력 — preset / unsplash / AI 가 공통으로 사용.
 * 서버(Supabase) 저장 — admin user 별 격리, 다른 기기에서도 동일 이력.
 * 네트워크 실패 시 로컬 state 만 갱신해 UI 끊기지 않게 graceful degradation.
 */
export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 초기 로드
  useEffect(() => {
    let cancelled = false;
    fetch(API)
      .then((r) => r.json())
      .then((d: { history?: ServerRow[] }) => {
        if (cancelled) return;
        const rows = (d.history ?? []).map((r) => ({
          url: r.url,
          source: r.source,
          meta: r.meta ?? "",
          ts: new Date(r.created_at).getTime(),
        }));
        setHistory(rows);
      })
      .catch(() => { /* offline / unauth — 빈 list 유지 */ });
    return () => { cancelled = true; };
  }, []);

  const add = useCallback((item: Omit<HistoryItem, "ts">) => {
    // optimistic 로컬 갱신 (latency 가림) + 서버 upsert
    setHistory((prev) => {
      const without = prev.filter((h) => h.url !== item.url);
      return [{ ...item, ts: Date.now() }, ...without];
    });
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }).catch(() => { /* 서버 실패해도 로컬 상태는 유지 */ });
  }, []);

  const remove = useCallback((url: string) => {
    setHistory((prev) => prev.filter((h) => h.url !== url));
    fetch(`${API}?url=${encodeURIComponent(url)}`, { method: "DELETE" })
      .catch(() => { /* swallow */ });
  }, []);

  return { history, add, remove };
}
