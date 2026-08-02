"use client";

import { useMemo } from "react";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { LOCAL_FONTS } from "@/config/localFonts.generated";
import { mergeCustomFonts, type CustomFont } from "@/lib/customFonts";

/** 사이트에서 쓸 수 있는 커스텀 폰트 전체 — public/fonts(빌드 스캔) + 업로드(DB config). */
export function useCustomFonts(): CustomFont[] {
  const config = useSiteConfig();
  const uploaded = (config.typography?.customFonts ?? []) as CustomFont[];
  return useMemo(() => mergeCustomFonts(LOCAL_FONTS, uploaded), [uploaded]);
}
