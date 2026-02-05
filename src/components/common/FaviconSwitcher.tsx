"use client";

import { useEffect } from "react";

export default function FaviconSwitcher() {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const html = document.documentElement;
      const favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) return;

      const theme = html.getAttribute("data-theme");
      if (theme === "dark") {
        favicon.setAttribute("href", "/favicon-dark.ico");
      } else {
        favicon.setAttribute("href", "/favicon-light.ico");
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // 초기 실행
    const html = document.documentElement;
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      const theme = html.getAttribute("data-theme");
      favicon.setAttribute(
        "href",
        theme === "dark" ? "/favicon-dark.ico" : "/favicon-light.ico"
      );
    }

    return () => observer.disconnect();
  }, []);

  return null;
}
