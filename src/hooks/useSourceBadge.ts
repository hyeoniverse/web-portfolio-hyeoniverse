import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { sourceBadgeOf } from "@/lib/siteLanguage";

/** 관리자 편집 화면의 원문 칸(ko) 배지 — 사이트 기본 언어가 ko · en 밖이면 그 언어 코드(JA 등), 아니면 KO(#1406) */
export function useSourceBadge(): string {
  return sourceBadgeOf(useSiteConfig().metadata.siteLanguage);
}
