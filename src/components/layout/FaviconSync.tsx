"use client";

import { useEffect } from "react";
import { useTheme } from "@/providers/ThemeProvider";

/** site theme 에 따라 favicon swap — <link media> 가 cross-browser 신뢰 안 되니 JS 로 직접 교체.
 *  light theme → /api/favicon?variant=light (bg = darkBg, page 와 반대)
 *  dark theme → /api/favicon?variant=dark (bg = lightBg, page 와 반대) */
/** 설정 저장 후 이 이벤트를 dispatch 하면 favicon 을 즉시 다시 불러온다 (새로고침 없이 최신 반영). */
export const FAVICON_REFRESH_EVENT = "favicon:refresh";

export default function FaviconSync() {
  const { theme } = useTheme();

  useEffect(() => {
    const applyFavicon = () => {
      const variant = theme === "dark" ? "dark" : "light";
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
    // 설정 저장 시 발생하는 이벤트에도 반응 → 탭 아이콘 즉시 갱신
    window.addEventListener(FAVICON_REFRESH_EVENT, applyFavicon);
    return () => window.removeEventListener(FAVICON_REFRESH_EVENT, applyFavicon);
  }, [theme]);

  return null;
}
