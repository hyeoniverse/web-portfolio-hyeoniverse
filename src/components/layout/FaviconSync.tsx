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

/* 설정을 저장한 시각. 저장한 그 탭은 새로고침 전이라 서버 버전(version)이 아직 예전 값이므로, 이 값으로 바로 갈아탄다.
   이 브라우저에 남겨, 아직 예전 화면을 들고 있는 다른 탭도 다음에 아이콘을 다시 걸 때 따라오게 한다 */
const VERSION_KEY = "favicon:v";

function readSaved(): string {
  try {
    return localStorage.getItem(VERSION_KEY) ?? "";
  } catch {
    // 사생활 보호 창·저장소 차단 — 서버 버전만 쓴다
    return "";
  }
}

/** version — 서버가 브랜드 설정으로 만든 값(layout). 설정이 바뀌면 모든 방문자의 아이콘 주소가 바뀐다(#1253 이전에는
 *  저장한 관리자 브라우저만 바뀌고, 다른 방문자는 캐시가 끝날 때까지 예전 아이콘을 봤다) */
export default function FaviconSync({ version }: { version: string }) {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const applyFavicon = (saved: string = readSaved()) => {
      const variant = mq.matches ? "dark" : "light";
      const href = `/api/favicon?variant=${variant}&v=${version}${saved ? `-${saved}` : ""}`;
      /* 서버 HTML 의 PNG 링크(metadata.icons — 사파리용)는 Next 가 관리하므로 건드리지 않고, 내가 넣은 것만 바꾼다.
         나중에 붙은 링크를 쓰는 브라우저(크롬 · 파이어폭스)는 이 SVG 를 쓴다 */
      let link = document.head.querySelector<HTMLLinkElement>("link[data-favicon-sync]");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/svg+xml";
        link.dataset.faviconSync = "";
        document.head.appendChild(link);
      }
      link.href = href;
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
  }, [version]);

  return null;
}
