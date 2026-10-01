import { useState } from "react";

/* 라이브러리 목록의 쪽 나누기 — 목록은 한 번에 받고(행 수가 적다) 화면에만 한 쪽씩 그린다.
   걸러서 쪽 수가 줄면 마지막 쪽으로 맞춘다. 검색을 바꿀 때는 부르는 쪽에서 setPage(1). */
export function usePagedList<T>(list: T[] | null, size: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil((list?.length ?? 0) / size));
  const current = Math.min(page, totalPages);
  const slice = list ? list.slice((current - 1) * size, current * size) : null;
  return { page: current, setPage, totalPages, slice };
}
