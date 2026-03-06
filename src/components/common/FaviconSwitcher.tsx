"use client";

import { useEffect } from "react";
import { useSiteConfig } from "@/providers/SiteConfigProvider";

export default function FaviconSwitcher() {
  const siteConfig = useSiteConfig();
  const { logoShortUrl, logoShortDarkUrl } = siteConfig.brand;

  useEffect(() => {
    function updateFavicon() {
      const favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) return;

      const isDark = document.documentElement.getAttribute("data-theme") === "dark";

      const customFavicon = isDark
        ? (logoShortDarkUrl || logoShortUrl)
        : logoShortUrl;

      const href = customFavicon || (isDark ? "/favicon-dark.ico" : "/favicon-light.ico");
      favicon.setAttribute("href", href);
    }

    const observer = new MutationObserver(updateFavicon);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // 초기 실행
    updateFavicon();

    return () => observer.disconnect();
  }, [logoShortUrl, logoShortDarkUrl]);

  return null;
}
