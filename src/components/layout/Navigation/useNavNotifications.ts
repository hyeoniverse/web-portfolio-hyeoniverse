"use client";

import { useState, useEffect, useCallback } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { hasAuthCookie } from "@/lib/supabase/hasAuthCookie";
/* 로그인 여부를 알아야 알림을 받아 온다. Supabase 클라이언트는 첫 화면에 필요하지 않아
   실제로 쓸 때 불러온다. */
const loadSupabaseClient = () => import("@/lib/supabase/client").then((m) => m.createClient());

/** 네비게이션 알림 버튼이 쓰는 값. 목록·읽지 않은 수·드롭다운 열림 상태. */
export type NavNotif = {
  id: string; type: string; title: string; message: string;
  metadata: Record<string, string>; read: boolean; created_at: string;
};

/**
 * 네비게이션의 알림 영역.
 *
 * 로그인한 사람이 있으면 60초마다 알림을 다시 받아 오고, 드롭다운의 열림 상태를 든다.
 * 위치 · 바깥 클릭 · Esc 닫기 · 터치 기기의 아래 시트는 공용 Popover 가 맡는다.
 *
 * @param pathname 페이지가 바뀌면 드롭다운을 닫는다.
 * @param enabled 알림을 볼 수 있는 권한인가(관리자 이상, #883). 아니면 받아 오지 않는다.
 */
export function useNavNotifications(pathname: string, enabled: boolean) {
  const [adminEmail, setAdminEmail] = useState("");
  /* 로그인 흔적(쿠키)이 있을 때 실제 세션을 확인했는가 — 확인 전에는 adminEmail 이 비어 있어도 로그아웃이라고
     단정할 수 없다(서랍의 Login 이 로그인한 사람에게 잠깐 보이지 않게). 쿠키가 없으면 확인할 것도 없다 */
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    // 로그인 흔적이 없으면 Supabase 클라이언트(313 KiB)를 받지 않는다 — 알림도 관리자 것이다.
    if (!hasAuthCookie()) return;
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;
    loadSupabaseClient().then((supabase) => {
      supabase.auth.getUser().then(({ data }) => {
        if (cancelled) return;
        setAdminEmail(data.user?.email ?? "");
        setAuthChecked(true);
      });
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setAdminEmail(session?.user?.email ?? "");
      });
      // unmount 가 promise resolve 보다 먼저 일어났다면 즉시 정리
      if (cancelled) sub.unsubscribe();
      else subscription = sub;
    });
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  // Notification 상태 — admin 로그인 시 60s 폴링. 드롭다운에서 미리보기 표시.
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs] = useState<NavNotif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  // 한 번 +5 펼치고 접을 수 있는 toggle (option B) — 5 ↔ 10
  const [notifExpanded, setNotifExpanded] = useState(false);

  // 드롭다운 닫힐 때 expanded 리셋
  const notifOpenChanged = useDepsChanged([notifOpen]);
  if (notifOpenChanged && !notifOpen) setNotifExpanded(false);

  const fetchNotifs = useCallback(() => {
    fetch("/api/admin/notifications")
      .then(async (r) => {
        if (!r.ok) { setNotifs([]); setUnreadCount(0); return; }
        const d = await r.json() as { unreadCount?: number; notifications?: NavNotif[] };
        setNotifs(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      })
      .catch(() => { setNotifs([]); setUnreadCount(0); });
  }, []);

  // 로그인 상태면 어느 페이지든 60s 간격 polling — 알림 버튼이 모든 페이지에 노출되므로 데이터 최신화 필요.
  // pathname 을 deps 에서 뺌 → 라우트 이동마다 추가 fetch 하지 않음.
  useEffect(() => {
    if (!adminEmail || !enabled) { setUnreadCount(0); setNotifs([]); return; }
    fetchNotifs();
    const id = window.setInterval(fetchNotifs, 60_000);
    return () => { window.clearInterval(id); };
  }, [adminEmail, enabled, fetchNotifs]);

  // pathname 변경 시 드롭다운 닫기 + refetch (알림 페이지에서 읽음 처리됐을 수 있음)
  const pathnameChanged = useDepsChanged([pathname]);
  if (pathnameChanged) setNotifOpen(false);

  return {
    adminEmail,
    authChecked,
    unreadCount,
    notifs,
    notifOpen,
    setNotifOpen,
    notifExpanded,
    setNotifExpanded,
    fetchNotifs,
  };
}
