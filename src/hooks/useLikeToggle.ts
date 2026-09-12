"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import { CodedError, errorText } from "@/lib/apiError";
import { tryRequest } from "@/lib/sendAction";

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
 * - 마지막 요청이 실패하면 마지막으로 확인한 서버 값으로 되돌리고 알린다(#868). 예전에는 실패 응답의
 *   본문(`{ error }`)을 그대로 반영해 숫자 자리에 "undefined" 가 보였다
 */
export function useLikeToggle({ endpoint }: UseLikeToggleOptions): UseLikeToggleResult {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<AbortController | null>(null);
  /** 서버가 마지막으로 알려 준 값 — 실패하면 여기로 되돌린다 */
  const confirmedRef = useRef({ count: 0, liked: false });
  const { t } = useLanguage();

  useEffect(() => {
    if (!endpoint) return;
    const ac = new AbortController();
    fetch(endpoint, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        confirmedRef.current = { count: d.count ?? 0, liked: d.liked ?? false };
        setCount(confirmedRef.current.count);
        setLiked(confirmedRef.current.liked);
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

    void tryRequest(endpoint, { method: "POST", signal: ac.signal }).then(async (res) => {
      // 새 toggle 이 이 요청을 취소하고 이어받았으면 아무것도 하지 않는다 — busy 도 새 요청이 끝낸다
      if (pendingRef.current !== ac) return;
      pendingRef.current = null;
      setBusy(false);
      if (res instanceof CodedError) {
        setCount(confirmedRef.current.count);
        setLiked(confirmedRef.current.liked);
        showToast(errorText(res, t, t("common.likeFailed")), "error");
        return;
      }
      const data = await res.json().catch(() => null);
      if (typeof data?.count === "number" && typeof data?.liked === "boolean") {
        confirmedRef.current = { count: data.count, liked: data.liked };
        setCount(data.count);
        setLiked(data.liked);
      }
    });
  }, [endpoint, liked, t]);

  return { count, liked, busy, toggle };
}
