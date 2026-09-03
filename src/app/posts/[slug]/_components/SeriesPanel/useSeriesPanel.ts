"use client";

import { useState, useEffect, useCallback } from "react";
import type { Post, Series } from "@/types/post";

export type SeriesPanelPost = Pick<Post, "id" | "title" | "slug" | "series_order" | "title_en" | "cover_image" | "created_at" | "excerpt" | "excerpt_en" | "tags" | "category">;
export type SeriesPanelData = Series & { posts: SeriesPanelPost[] };
export type SeriesPreview = { post: SeriesPanelPost; top: number; left: number };

/* 글 상세의 시리즈 패널 — 시리즈 fetch(`/api/series/<id>`), 목록 펼침, 항목 hover 미리보기 좌표, 현재/이전/다음 글.
   미리보기(SeriesPreviewTooltip)는 position: fixed 라 DetailLayout 밖에서 렌더해야 하므로 state 는 부모(PostDetailClient)가 이 훅으로 들고
   SeriesPanel(박스)과 SeriesPreviewTooltip 둘에 나눠 준다. */
export function useSeriesPanel({ postId, seriesId }: { postId: string; seriesId: string | null | undefined }) {
  const [seriesData, setSeriesData] = useState<SeriesPanelData | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<SeriesPreview | null>(null);

  useEffect(() => {
    if (!seriesId) return;
    const ac = new AbortController();
    fetch(`/api/series/${seriesId}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => setSeriesData(d))
      .catch(() => {});
    return () => ac.abort();
  }, [postId, seriesId]);

  const seriesPosts = seriesData?.posts ?? [];
  const currentIdx = seriesPosts.findIndex((p) => p.id === postId);
  const prev = currentIdx > 0 ? seriesPosts[currentIdx - 1] : null;
  const next = currentIdx < seriesPosts.length - 1 ? seriesPosts[currentIdx + 1] : null;

  const toggleOpen = useCallback(() => setOpen((v) => !v), []);
  const onHover = useCallback((sp: SeriesPanelPost, e: React.MouseEvent) => {
    if (sp.id === postId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tooltipW = 240;
    const tooltipH = 200;
    const gap = 8;
    // 가로: 항목 중앙 기준, 뷰포트 안에 clamp
    const rawLeft = rect.left + rect.width / 2 - tooltipW / 2;
    const left = Math.max(gap, Math.min(rawLeft, window.innerWidth - tooltipW - gap));
    // 세로: 위에 공간 있으면 위, 없으면 아래
    const top = rect.top > tooltipH + gap
      ? rect.top - tooltipH - gap
      : rect.bottom + gap;
    setPreview({ post: sp, top, left });
  }, [postId]);
  const onLeave = useCallback(() => {
    setPreview(null);
  }, []);

  return { seriesData, seriesPosts, currentIdx, prev, next, open, toggleOpen, preview, onHover, onLeave };
}
