"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_ACCESS_CHANGED } from "@/lib/adminAccess";

/**
 * admin 화면의 세션 동기화.
 *
 * 1. 로그아웃 — 다른 탭에서 로그아웃(또는 세션 종료)하면 이 탭도 즉시 로그인 페이지로 이동.
 *    Supabase 는 onAuthStateChange 를 탭 간 broadcast 하므로, 어느 탭에서 signOut 해도
 *    열려있는 모든 admin 탭이 SIGNED_OUT 을 받아 자동 로그아웃된다. (수동 새로고침 불필요)
 *
 * 2. 권한 변경 — 소유자가 다른 계정의 권한 레벨을 바꾸면, 그 계정의 브라우저가 들고 있는
 *    세션에는 예전 권한이 남아 화면이 뒤처진다. 서버는 요청마다 getUser() 로 현재 값을
 *    확인하므로 허용되지 않는 작업은 어차피 거부되지만, 메뉴는 계속 옛 권한을 그린다.
 *    권한을 바꾼 서버가 대상 계정 채널로 broadcast 를 쏘고, 받은 쪽이 세션을 새로 고친다.
 *    (권한을 바꾸는 쪽과 영향을 받는 쪽이 다른 사용자라 요청-응답으로는 전달할 수 없다)
 */
export default function AdminAuthSync() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/admin/login");
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase.channel(`perm:${user.id}`);
      channel
        .on("broadcast", { event: "changed" }, async () => {
          // 새 권한이 담긴 토큰을 다시 받아 화면을 그 값에 맞춘다.
          await supabase.auth.refreshSession();
          router.refresh();
          // 네비게이션의 관리자 메뉴·알림 종도 새 권한으로 다시 거른다(#883)
          window.dispatchEvent(new Event(ADMIN_ACCESS_CHANGED));
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
