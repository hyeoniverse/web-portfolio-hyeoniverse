"use client";

import { useState, useEffect, useRef, type DependencyList } from "react";

/* 페이지 · perPage — 필터/정렬(resetOn)이나 perPage 가 바뀌면 1페이지로 되돌린다.
   holdReset 이 true 인 동안과 false 로 바뀌는 커밋에서는 되돌리지 않는다. 글 목록은 마운트 직후 주소의 필터와 ?page= 를 한 번에
   넣는데, 그 필터 변경이 함께 넣은 쪽 번호를 지우지 않게 한다.
   동기적으로 같은 이벤트 안에서 리셋해야 하는 곳(태그 페이지의 정렬 클릭 — 효과로 늦추면 fetch 가 두 번 나간다)은
   resetOn 대신 setPage(1) 을 직접 부른다. */
export function usePageControls({
  defaultPerPage,
  resetOn,
  holdReset = false,
}: {
  defaultPerPage: number;
  resetOn: DependencyList;
  holdReset?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);
  // 잠겨 있으면 되돌리지 않는다. 마운트 커밋은 되돌릴 것이 없어 잠근 채 시작하고, 아래 효과가 같은 커밋에서 이 효과 다음에 돌며 푼다
  const armedRef = useRef(false);
  useEffect(() => {
    if (!armedRef.current) return;
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...resetOn, perPage]);
  useEffect(() => {
    armedRef.current = !holdReset;
  }, [holdReset]);
  return { page, setPage, perPage, setPerPage };
}
