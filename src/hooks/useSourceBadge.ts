import { useCallback } from "react";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { sourceBadgeOf } from "@/lib/siteLanguage";

/** ko 자리 배지(토글 · 편집 칸) — 사이트 기본 언어가 ko · en 밖이면 그 언어 코드(JA 등), 아니면 KO(#1406) */
export function useSourceBadge(): string {
  return sourceBadgeOf(useSiteConfig().metadata.defaultLanguage);
}

/** 언어 칸 배지 함수 — ko 칸은 useSourceBadge 와 같고(JA 등), en 칸은 EN */
export function useLangBadge(): (lang: "ko" | "en") => string {
  const src = useSourceBadge();
  return useCallback((lang) => (lang === "ko" ? src : "EN"), [src]);
}
