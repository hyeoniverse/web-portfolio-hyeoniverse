"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseLikeToggleOptions {
  /** like 카운트·상태 조회 + 토글에 사용할 베이스 URL. 예: `/api/posts/${id}/like` */
  endpoint: string | null;
}

interface UseLikeToggleResult {
  count: number;
  liked: boolean;
  busy: boolean;
  toggle: () => void;
}

/**
 * post/work like 카운트 + 토글 — Optimistic UI (SNS 표준 패턴).
 *
 * - mount 시 endpoint GET 으로 초기값 fetch
 * - toggle() 은 즉시 UI 변경 + 백그라운드 sync. disabled / inFlight 차단 없음 → 빠른 연속 toggle 가능.
 * - 진행 중인 request 가 있으면 AbortController 로 cancel 후 새 request — last-write-wins.
 * - busy state 는 wave animation 시각화용. UI 차단 X.
 * - endpoint 가 null 이면 fetch 없이 idle 상태 유지
 */
export function useLikeToggle({ endpoint }: UseLikeToggleOptions): UseLikeToggleResult {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!endpoint) return;
    const ac = new AbortController();
    fetch(endpoint, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        setCount(d.count ?? 0);
        setLiked(d.liked ?? false);
      })
      .catch(() => {});
    return () => ac.abort();
  }, [endpoint]);

  const toggle = useCallback(() => {
    if (!endpoint) return;

    // 즉시 UI 변경 (낙관적)
    setLiked((prev) => !prev);
    setCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    setBusy(true);

    // 이전 pending request cancel — race condition 방지
    pendingRef.current?.abort();
    const ac = new AbortController();
    pendingRef.current = ac;

    fetch(endpoint, { method: "POST", signal: ac.signal })
      .then((r) => r.json())
      .then((data) => {
        // 이 응답이 가장 최신 request 인 경우만 적용 (cancel 안 된 경우)
        if (pendingRef.current === ac) {
          setCount(data.count);
          setLiked(data.liked);
          setBusy(false);
          pendingRef.current = null;
        }
      })
      .catch(() => {
        // abort 된 경우 — 새 toggle 이 이미 진행 중이라 busy 유지. network error 면 busy 종료
        if (pendingRef.current === ac) {
          setBusy(false);
          pendingRef.current = null;
        }
      });
  }, [endpoint, liked]);

  return { count, liked, busy, toggle };
}
