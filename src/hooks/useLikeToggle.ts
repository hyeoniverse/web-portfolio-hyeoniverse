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
  toggle: () => Promise<void>;
}

/**
 * post/work like 카운트 + 토글 — 두 컴포넌트가 동일 패턴(낙관적 update + likeRef 디바운스 + busy state)을
 * 복붙하고 있던 걸 한 곳으로.
 *
 * - mount 시 endpoint GET 으로 초기값 fetch
 * - toggle() 은 progress 중 재호출을 likeRef 로 차단, 낙관적 변경 후 응답 데이터로 정합성 보정
 * - endpoint 가 null 이면 fetch 없이 idle 상태 유지
 */
export function useLikeToggle({ endpoint }: UseLikeToggleOptions): UseLikeToggleResult {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!endpoint) return;
    let cancelled = false;
    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setCount(d.count ?? 0);
        setLiked(d.liked ?? false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const toggle = useCallback(async () => {
    if (!endpoint || inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    // 낙관적 update
    setLiked((prev) => !prev);
    setCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      setCount(data.count);
      setLiked(data.liked);
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }, [endpoint, liked]);

  return { count, liked, busy, toggle };
}
