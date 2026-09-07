"use client";

import { useEffect, useState } from "react";
import { hasAuthCookie } from "@/lib/supabase/hasAuthCookie";

/* Supabase 브라우저 클라이언트는 313 KiB 다. 위에서 정적으로 들여오면 이 훅을 쓰는 모든
   화면의 첫 묶음에 그만큼이 실린다. 실제로 필요할 때만 받도록 동적으로 들여온다. */
const loadSupabaseClient = () => import("@/lib/supabase/client").then((m) => m.createClient());

/**
 * Supabase 세션을 client side 에서 폴링/구독해 boolean 으로 노출.
 *
 * - `subscribe: false` (default) — 마운트 시점에 단일 체크. 페이지 진입 후 admin 만 보이는 UI 토글에 충분.
 * - `subscribe: true` — onAuthStateChange 구독까지. 댓글 영역처럼 사용자가 다른 탭에서 로그인·로그아웃 했을 때 실시간 반영이 필요한 곳에서 사용.
 *
 * unmount 후 setState 호출 방지 (cancelled flag) + subscription cleanup 까지 책임짐.
 */
export function useIsAuthenticated(options: { subscribe?: boolean } = {}): boolean {
  const { subscribe = false } = options;
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    /* 로그인 흔적이 없으면 클라이언트를 받지 않는다 — 답이 false 로 정해져 있다.
       다른 탭에서 로그인하는 경우를 봐야 하는 곳(subscribe)은 그대로 받는다. */
    if (!subscribe && !hasAuthCookie()) return;

    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;

    loadSupabaseClient().then((supabase) => {
      if (cancelled) return;

      supabase.auth.getSession().then(({ data }) => {
        if (!cancelled) setIsAuthenticated(!!data.session?.user);
      });

      if (subscribe) {
        const sub = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setIsAuthenticated(!!session?.user);
        });
        // 받아 오는 사이에 unmount 됐다면 즉시 정리한다.
        if (cancelled) sub.data.subscription.unsubscribe();
        else subscription = sub.data.subscription;
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [subscribe]);

  return isAuthenticated;
}
