"use client";

// ── 편집 presence ── 같은 글을 다른 기기/탭에서 편집 중인 세션 수를 Supabase Realtime 로 감지.
// 소프트 경고용(비차단). 충돌 자체는 서버 낙관적 버전 체크가 막는다.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** postId 에 대해 "나 말고" 동시 편집 중인 세션 수. enabled=false 면 항상 0. */
export function usePostPresence(postId: string | undefined, enabled = true): number {
  const [others, setOthers] = useState(0);

  useEffect(() => {
    if (!postId || !enabled) return;

    const supabase = createClient();
    const sessionId = crypto.randomUUID(); // 이 탭/세션 고유 — presence key
    const channel = supabase.channel(`post-edit:${postId}`, {
      config: { presence: { key: sessionId } },
    });

    const sync = () => {
      const state = channel.presenceState();
      setOthers(Object.keys(state).filter((k) => k !== sessionId).length);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track({ at: Date.now() });
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [postId, enabled]);

  return others;
}
