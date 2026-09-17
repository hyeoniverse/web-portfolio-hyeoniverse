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

/* 마지막으로 설정을 저장한 시각. 주소에 붙여 캐시를 가른다(#1048).
   예전에는 매번 `t=Date.now()` 를 붙여서, 페이지를 열 때마다 favicon 라우트가 돌고 설정을
   조회했다. 그렇다고 그냥 떼면 저장해도 예전 아이콘이 캐시에서 계속 나온다. 그래서 저장했을
   때만 값을 바꾸고 그 값을 이 브라우저에 남겨 둔다 — 다음에 열 때도 바뀐 주소를 계속 쓴다.
   저장 이력이 없는 방문자는 값 없는 깨끗한 주소를 받아 캐시가 그대로 먹는다. */
const VERSION_KEY = "favicon:v";

function readVersion(): string {
  try {
    return localStorage.getItem(VERSION_KEY) ?? "";
  } catch {
    // 사생활 보호 창·저장소 차단 — 버전 없이 간다(캐시가 조금 늦게 갱신될 뿐)
    return "";
  }
}

export default function FaviconSync() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const applyFavicon = (version: string = readVersion()) => {
      const variant = mq.matches ? "dark" : "light";
      const href = `/api/favicon?variant=${variant}${version ? `&v=${version}` : ""}`;
      document.querySelectorAll('link[rel="icon"]').forEach((l) => l.remove());
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = href;
      document.head.appendChild(link);
    };

    /** 설정을 저장했다 — 새 주소로 갈아탄다. 저장소에 못 적더라도 이번 적용은 새 값으로 간다 */
    const refresh = () => {
      const next = String(Date.now());
      try {
        localStorage.setItem(VERSION_KEY, next);
      } catch {
        // 사생활 보호 창 등 — 이 탭에서는 바뀌고, 다음에 열 때 예전 주소로 돌아갈 뿐이다
      }
      applyFavicon(next);
    };

    /* 이벤트 객체가 version 자리로 들어가지 않게 감싼다 */
    const onSchemeChange = () => applyFavicon();

    applyFavicon();
    // OS 색상 설정 변경 시 즉시 반영 + 설정 저장 이벤트에도 반응
    mq.addEventListener("change", onSchemeChange);
    window.addEventListener(FAVICON_REFRESH_EVENT, refresh);
    return () => {
      mq.removeEventListener("change", onSchemeChange);
      window.removeEventListener(FAVICON_REFRESH_EVENT, refresh);
    };
  }, []);

  return null;
}
