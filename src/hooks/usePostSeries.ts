import { useState, useEffect, useCallback } from "react";
import type { Series } from "@/types/post";

interface SeriesPost {
  id: string;
  title: string;
  series_order: number;
}

export function usePostSeries(
  seriesId: string | null | undefined,
  isEdit: boolean,
  postId?: string,
  onAutoOrder?: (order: number) => void,
) {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [seriesPosts, setSeriesPosts] = useState<SeriesPost[]>([]);
  const [seriesPostsLoading, setSeriesPostsLoading] = useState(false);

  const refetchSeries = useCallback(async () => {
    const res = await fetch("/api/series?all=true");
    const data = await res.json();
    setSeriesList(Array.isArray(data) ? data : []);
  }, []);

  // Fetch all series on mount
  useEffect(() => {
    refetchSeries();
  }, [refetchSeries]);

  // Fetch posts for selected series + auto-set order
  useEffect(() => {
    if (!seriesId) {
      setSeriesPosts([]);
      setSeriesPostsLoading(false);
      return;
    }
    setSeriesPostsLoading(true);
    fetch(`/api/series/${seriesId}`)
      .then((res) => res.json())
      .then((data) => {
        const posts = (data.posts ?? []) as SeriesPost[];
        setSeriesPosts(posts);
        // 새 글이면 마지막 순서 +1
        if (onAutoOrder && (!isEdit || !posts.some((p) => p.id === postId))) {
          const maxOrder = posts.reduce((max, p) => Math.max(max, p.series_order ?? 0), 0);
          onAutoOrder(maxOrder + 1);
        }
      })
      .finally(() => setSeriesPostsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId]);

  return { seriesList, seriesPosts, setSeriesPosts, seriesPostsLoading, refetchSeries };
}
