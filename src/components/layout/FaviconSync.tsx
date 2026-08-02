"use client";

import { useEffect } from "react";

/** favicon 은 브라우저(OS) 색상 설정(prefers-color-scheme)을 따른다 — 사이트 테마와 독립.
 *  브라우저 탭 배경색이 OS 설정에 따라 달라지므로, favicon 도 거기 맞춰야 탭에서 잘 보인다.
 *  (site theme 를 따르면, 라이트 브라우저에서 사이트만 다크로 토글했을 때 탭 배경과 안 맞아 안 보임)
 *
 *  <link media> · SVG @media 는 cross-browser 신뢰가 낮아, 지금처럼 JS 로 직접 스왑한다.
 *    prefers dark  → /api/favicon?variant=dark
 *    prefers light → /api/favicon?variant=light */
/** 설정 저장 후 이 이벤트를 dispatch 하면 favicon 을 즉시 다시 불러온다 (새로고침 없이 최신 반영). */
export const FAVICON_REFRESH_EVENT = "favicon:refresh";

export default function FaviconSync() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const applyFavicon = () => {
      const variant = mq.matches ? "dark" : "light";
      // 캐시 우회 — 매번 ts query 로 새 SVG 강제 (route 가 DB config 를 읽으므로 저장 직후 최신 반영)
      const href = `/api/favicon?variant=${variant}&t=${Date.now()}`;
      document.querySelectorAll('link[rel="icon"]').forEach((l) => l.remove());
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = href;
      document.head.appendChild(link);
    };

    applyFavicon();
    // OS 색상 설정 변경 시 즉시 반영 + 설정 저장 이벤트에도 반응
    mq.addEventListener("change", applyFavicon);
    window.addEventListener(FAVICON_REFRESH_EVENT, applyFavicon);
    return () => {
      mq.removeEventListener("change", applyFavicon);
      window.removeEventListener(FAVICON_REFRESH_EVENT, applyFavicon);
    };
  }, []);

  return null;
}
