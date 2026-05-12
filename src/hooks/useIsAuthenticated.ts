"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
    const supabase = createClient();
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setIsAuthenticated(!!data.session?.user);
    });

    if (subscribe) {
      const sub = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setIsAuthenticated(!!session?.user);
      });
      subscription = sub.data.subscription;
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [subscribe]);

  return isAuthenticated;
}
