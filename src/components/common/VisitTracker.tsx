"use client";

import { useEffect, useRef } from "react";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import { createPageViewTracker } from "@/lib/pageViewTracker";

const SESSION_KEY = "pageViewSession";
/* 방문자 id — 신규 · 재방문을 가른다. 세션과 달리 기한 없이 남는다(사람을 식별하지 않는 임의 값) */
const VISITOR_KEY = "pageViewVisitor";

function visitorId(): string | null {
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return null;
  }
}

export default function VisitTracker() {
  usePageViews();
  return null;
}

/**
 * 사이트의 조회 기록(#1399) — 방문 · 방문자 · 유입 · 기기 · 페이지 조회 · 머문 시간 · 글 · 작업물 조회수가 전부 이 기록에서 나온다.
 * 주소가 바뀔 때마다(사이트 안 이동 포함) 조회를 기록하고, 떠날 때(다른 페이지 · 탭 숨김 · 탭 닫기) 보인 채 있었던 시간을 보낸다.
 * 유입 경로(document.referrer)와 쿼리(UTM)도 실어 보낸다 — 서버는 방문의 첫 조회에만 담는다.
 * 세션 · 방문자 id 는 이 브라우저의 임의 값이라 사람을 식별하지 않는다. 저장소를 못 쓰면 조회마다 새 세션이 된다.
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
          body: JSON.stringify({
            path,
            session,
            visitor: visitorId(),
            referrer: document.referrer,
            search: window.location.search,
          }),
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
