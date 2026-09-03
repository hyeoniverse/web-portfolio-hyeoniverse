"use client";

import { useState, useEffect, useRef, type DependencyList } from "react";

/* 페이지 · perPage — 필터/정렬(resetOn)이나 perPage 가 바뀌면 1페이지로 되돌린다.
   skipFirstReset: URL ?page= 으로 초기화한 값을 첫 mount 의 리셋이 지우지 않게 한다(posts 목록).
   동기적으로 같은 이벤트 안에서 리셋해야 하는 곳(태그 페이지의 정렬 클릭 — 효과로 늦추면 fetch 가 두 번 나간다)은
   resetOn 대신 setPage(1) 을 직접 부른다. */
export function usePageControls({
  defaultPerPage,
  initialPage = 1,
  resetOn,
  skipFirstReset = false,
}: {
  defaultPerPage: number;
  initialPage?: number | (() => number);
  resetOn: DependencyList;
  skipFirstReset?: boolean;
}) {
  const [page, setPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(defaultPerPage);
  const firstRef = useRef(true);
  useEffect(() => {
    if (skipFirstReset && firstRef.current) { firstRef.current = false; return; }
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...resetOn, perPage]);
  return { page, setPage, perPage, setPerPage };
}
