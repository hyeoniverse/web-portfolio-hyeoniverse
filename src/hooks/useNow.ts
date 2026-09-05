"use client";

import { useEffect, useState } from "react";

/**
 * 현재 시각(ms)을 렌더에서 안전하게 읽는다.
 *
 * 렌더 본문에서 `Date.now()` 를 부르면 같은 입력에 매번 다른 값이 나와 렌더가 순수하지 않게
 * 되고(react-hooks/purity), 서버가 그린 HTML 과 클라이언트 첫 렌더가 어긋난다.
 * 여기서는 지연 초기화로 마운트 때 한 번 읽고, 이후 주기적으로만 갱신한다.
 *
 * @param intervalMs 갱신 주기. 기본 1분 — 이 값을 쓰는 표시가 전부 분 단위라 그보다 자주
 *                   깨울 이유가 없다. 0 이하를 주면 갱신하지 않고 마운트 시각에 고정한다.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (intervalMs <= 0) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
