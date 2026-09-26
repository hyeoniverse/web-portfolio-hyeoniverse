"use client";

import { useEffect } from "react";

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

  return null;
}
