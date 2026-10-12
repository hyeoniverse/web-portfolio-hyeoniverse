"use client";

import { useEffect, useRef } from "react";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import { createPageViewTracker } from "@/lib/pageViewTracker";

const SESSION_KEY = "pageViewSession";

export default function VisitTracker() {
  useEffect(() => {
    // 랜딩 경로·쿼리(UTM)를 함께 보낸다 — 추가 요청 없이 기존 호출에 실어 보내는 것이라
    // 방문자 쪽 비용은 그대로다. 마운트는 하드 로드당 1회라 이 값이 곧 랜딩 페이지다.
    fetch("/api/visits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: window.location.pathname,
        search: window.location.search,
      }),
    }).catch(() => {});
  }, []);

  usePageViews();

  return null;
}

/**
 * 페이지 조회 · 머문 시간(#1399) — 방문 기록(위)은 하드 로드에 한 번이라 사이트 안에서 옮긴 페이지를 못 셌다.
 * 주소가 바뀔 때마다 조회를 기록하고, 떠날 때(다른 페이지 · 탭 숨김 · 탭 닫기) 보인 채 있었던 시간을 보낸다.
 * 세션 id 는 이 브라우저의 임의 값이라 사람을 식별하지 않는다. 저장소를 못 쓰면 조회마다 새 세션이 된다.
 */
function usePageViews() {
  const pathname = useRoutePathname();
  const trackerRef = useRef<ReturnType<typeof createPageViewTracker> | null>(null);

  useEffect(() => {
    const tracker = createPageViewTracker({
      record: (path, session) =>
        fetch("/api/page-views", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path, session }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { id?: unknown } | null) => (typeof d?.id === "string" ? d.id : null)),
      beacon: (id, ms) => {
        const body = new Blob([JSON.stringify({ id, ms })], { type: "application/json" });
        if (!navigator.sendBeacon?.("/api/page-views/duration", body)) {
          fetch("/api/page-views/duration", { method: "POST", body, keepalive: true }).catch(() => {});
        }
      },
      now: () => Date.now(),
      isVisible: () => document.visibilityState === "visible",
      loadSession: () => {
        try {
          const v = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as { id?: unknown; at?: unknown } | null;
          return typeof v?.id === "string" && typeof v.at === "number" ? { id: v.id, at: v.at } : null;
        } catch {
          return null;
        }
      },
      saveSession: (s) => {
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* 저장 못 하면 다음 조회가 새 세션 */ }
      },
      newId: () => crypto.randomUUID(),
    });
    trackerRef.current = tracker;

    const onVisibility = () => (document.visibilityState === "hidden" ? tracker.hide() : tracker.show());
    const onPageHide = () => tracker.leave();
    /* 뒤로 가기 캐시(bfcache)에서 돌아오면 다시 잰다 */
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) tracker.show(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      tracker.leave();
      trackerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (pathname) trackerRef.current?.view(pathname);
  }, [pathname]);
}
