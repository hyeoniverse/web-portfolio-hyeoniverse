"use client";

import { useEffect, useRef, useState } from "react";
import { hasAuthCookie } from "@/lib/supabase/hasAuthCookie";
import { ADMIN_ACCESS_CHANGED, type AdminAccess } from "@/lib/adminAccess";

/**
 * 로그인한 계정의 권한 — 네비게이션이 관리자 메뉴와 알림 종을 거르는 데 쓴다(#883).
 *
 * 로그인 흔적(쿠키)이 있을 때만 /api/admin/me 를 부른다. 공개 화면에서는 모를 때 한 번만 부르고,
 * 관리자 화면으로 옮길 때마다 다시 확인해 같은 탭에서 다른 계정으로 로그인해도 메뉴가 따라온다.
 * 권한이 바뀌었다는 이벤트(AdminAuthSync)를 받아도 다시 확인한다. 모르는 동안은 null 이다.
 */
export function useAdminAccess(pathname: string): AdminAccess | null {
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [changes, setChanges] = useState(0);
  const knownRef = useRef(false);

  useEffect(() => {
    const onChanged = () => {
      knownRef.current = false;
      setChanges((n) => n + 1);
    };
    window.addEventListener(ADMIN_ACCESS_CHANGED, onChanged);
    return () => window.removeEventListener(ADMIN_ACCESS_CHANGED, onChanged);
  }, []);

  useEffect(() => {
    if (!hasAuthCookie()) return;
    if (knownRef.current && !pathname.startsWith("/admin")) return;
    let alive = true;
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me: { isOwner?: boolean; level?: number | null } | null) => {
        if (!alive) return;
        knownRef.current = !!me;
        setAccess(me ? { isOwner: !!me.isOwner, level: me.isOwner ? Number.POSITIVE_INFINITY : (me.level ?? 0) } : null);
      })
      .catch(() => { /* 확인하지 못하면 지금 값을 둔다 */ });
    return () => { alive = false; };
  }, [pathname, changes]);

  return access;
}
