"use client";

import { useEffect } from "react";
import { useTheme } from "@/providers/ThemeProvider";

/** site theme 에 따라 favicon swap — <link media> 가 cross-browser 신뢰 안 되니 JS 로 직접 교체.
 *  light theme → /api/favicon?variant=light (bg = darkBg, page 와 반대)
 *  dark theme → /api/favicon?variant=dark (bg = lightBg, page 와 반대) */
export default function FaviconSync() {
  const { theme } = useTheme();

  useEffect(() => {
    const variant = theme === "dark" ? "dark" : "light";
    // 캐시 우회 — 변경마다 ts query 추가
    const href = `/api/favicon?variant=${variant}&t=${Date.now()}`;

    // 기존 icon link 모두 제거 후 새로 추가
    const existing = document.querySelectorAll('link[rel="icon"]');
    existing.forEach((l) => l.remove());

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = href;
    document.head.appendChild(link);
  }, [theme]);

  return null;
}
