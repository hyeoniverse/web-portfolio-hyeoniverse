"use client";

import { useEffect, useState } from "react";

/** 입력을 멈추고 이만큼 지나면 묻는다(ms) */
const DEBOUNCE_MS = 250;

/**
 * 휴지통 검색 — 검색어에 맞는 항목의 id 만 서버에 물어 받는다. 검색어가 비었으면 `null`.
 *
 * 휴지통 목록은 본문 없이 받는다(본문이 목록 전송량의 대부분이었다). 그래서 "내용" 검색은 브라우저에서
 * 거를 수 없고, 목록 API 에 search·searchType 을 붙여 서버가 본문까지 거르게 한다. 목록 자체(개수·정렬·쪽)는
 * 그대로 두고 id 로만 거르므로, 머리줄의 휴지통 개수는 검색 중에도 전체 개수를 보인다.
 *
 * 받아 오는 동안에는 직전 결과를 그대로 쓴다 — 글자마다 목록이 비었다 찼다 하지 않게.
 */
export function useTrashSearchIds(
  endpoint: "/api/posts" | "/api/works",
  search: string,
  searchType: "all" | "title" | "content",
  /** 휴지통이 바뀌면(복구·삭제) 다시 묻도록 넘기는 값 */
  version: unknown,
): Set<string> | null {
  const query = search.trim();
  const [ids, setIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!query) return;
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ trash: "true", limit: "100", search: query, searchType });
      fetch(`${endpoint}?${params}`, { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { posts?: { id: string }[]; works?: { id: string }[] } | null) => {
          if (!d) return;
          const rows = d.posts ?? d.works ?? [];
          setIds(new Set(rows.map((r) => r.id)));
        })
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [endpoint, query, searchType, version]);

  if (!query) return null;
  /* 첫 결과가 오기 전에는 거르지 않는다(null) — 빈 목록을 보였다가 채우면 깜빡인다 */
  return ids;
}
