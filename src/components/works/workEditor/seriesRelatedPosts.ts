/**
 * 관련 시리즈를 새로 연결하면 그 시리즈의 글을 관련 글에 더한다 — 시리즈 순서대로, 이미 있는 글은 건너뛴다.
 * 시리즈를 빼도 관련 글은 그대로 둔다(따로 고른 글일 수 있다).
 */
export function addSeriesPosts(
  relatedPostIds: string[],
  prevSeriesIds: string[],
  nextSeriesIds: string[],
  posts: Array<{ id: string; series_id?: string | null; series_order?: number | null }>,
): string[] {
  const added = nextSeriesIds.filter((id) => !prevSeriesIds.includes(id));
  if (added.length === 0) return relatedPostIds;
  const next = [...relatedPostIds];
  for (const seriesId of added) {
    const inSeries = posts
      .filter((p) => p.series_id === seriesId)
      .sort((a, b) => (a.series_order ?? 0) - (b.series_order ?? 0));
    for (const p of inSeries) if (!next.includes(p.id)) next.push(p.id);
  }
  return next;
}
