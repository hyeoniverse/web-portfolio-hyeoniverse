"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 다른 탭에서 로그아웃(또는 세션 종료)하면 이 탭도 즉시 로그인 페이지로 이동.
 * Supabase 는 onAuthStateChange 를 탭 간 broadcast 하므로, 어느 탭에서 signOut 해도
 * 열려있는 모든 admin 탭이 SIGNED_OUT 을 받아 자동 로그아웃된다. (수동 새로고침 불필요)
 */
export default function AdminAuthSync() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/admin/login");
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);
  return null;
}
