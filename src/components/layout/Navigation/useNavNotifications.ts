"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { hasAuthCookie } from "@/lib/supabase/hasAuthCookie";
/* 로그인 여부를 알아야 알림을 받아 온다. Supabase 클라이언트는 첫 화면에 필요하지 않아
   실제로 쓸 때 불러온다. */
const loadSupabaseClient = () => import("@/lib/supabase/client").then((m) => m.createClient());

/** 네비게이션 알림 버튼이 쓰는 값. 목록·읽지 않은 수·드롭다운 열림 상태와 그 위치. */
export type NavNotif = {
  id: string; type: string; title: string; message: string;
  metadata: Record<string, string>; read: boolean; created_at: string;
};

/**
 * 네비게이션의 알림 영역.
 *
 * 로그인한 사람이 있으면 60초마다 알림을 다시 받아 오고, 드롭다운의 열림·위치·바깥 클릭
 * 닫기를 함께 다룬다. Navigation 본체에 상태 여섯 개와 처리 일곱 개가 이 목적으로만
 * 들어 있었다.
 *
 * @param pathname 페이지가 바뀌면 드롭다운을 닫는다.
 * @param enabled 알림을 볼 수 있는 권한인가(관리자 이상, #883). 아니면 받아 오지 않는다.
 */
export function useNavNotifications(pathname: string, enabled: boolean) {
  const [adminEmail, setAdminEmail] = useState("");
  useEffect(() => {
    // 로그인 흔적이 없으면 Supabase 클라이언트(313 KiB)를 받지 않는다 — 알림도 관리자 것이다.
    if (!hasAuthCookie()) return;
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;
    loadSupabaseClient().then((supabase) => {
      supabase.auth.getUser().then(({ data }) => {
        if (!cancelled) setAdminEmail(data.user?.email ?? "");
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
  const notifWrapRef = useRef<HTMLButtonElement | null>(null);

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

  // 포털 dropdown 위치 — trigger 의 viewport 좌표를 기준으로 계산
  const notifDropdownRef = useRef<HTMLDivElement | null>(null);
  const [notifPos, setNotifPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const updateNotifPos = useCallback(() => {
    const el = notifWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // 트리거 우측 정렬 — top: trigger bottom + 8gap, right: viewport - trigger right
    setNotifPos({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
  }, []);

  useLayoutEffect(() => {
    if (!notifOpen) return;
    updateNotifPos();
  }, [notifOpen, updateNotifPos]);

  useEffect(() => {
    if (!notifOpen) return;
    const onUpdate = () => updateNotifPos();
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
    };
  }, [notifOpen, updateNotifPos]);

  // 드롭다운 외부 클릭 / Escape 시 닫기 — trigger + portal dropdown 둘 다 확인
  useEffect(() => {
    if (!notifOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const trigger = notifWrapRef.current;
      const dropdown = notifDropdownRef.current;
      const target = e.target as Node;
      if (trigger?.contains(target)) return;
      if (dropdown?.contains(target)) return;
      setNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNotifOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen]);

  // pathname 변경 시 드롭다운 닫기 + refetch (알림 페이지에서 읽음 처리됐을 수 있음)
  const pathnameChanged = useDepsChanged([pathname]);
  if (pathnameChanged) setNotifOpen(false);

  return {
    adminEmail,
    unreadCount,
    notifs,
    notifOpen,
    setNotifOpen,
    notifExpanded,
    setNotifExpanded,
    notifWrapRef,
    notifDropdownRef,
    notifPos,
    fetchNotifs,
  };
}
