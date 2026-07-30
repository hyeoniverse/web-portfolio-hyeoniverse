"use client";

import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * admin 에서 지정한 패널 표시 제목(panelTitles[key][language]) 을 반환.
 * 미설정 시 undefined → 각 패널의 기본 제목(하드코딩/로케일) 을 그대로 사용.
 */
export function usePanelTitle(key: string): string | undefined {
  const cfg = useSiteConfig();
  const { language } = useLanguage();
  const titles = cfg.about.panelTitles;
  const v = titles?.[key]?.[language];
  return v && v.trim() ? v : undefined;
}
