"use client";

import { useMemo } from "react";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { LOCAL_FONTS } from "@/config/localFonts.generated";
import { mergeCustomFonts, type CustomFont } from "@/lib/customFonts";

/** 사이트에서 쓸 수 있는 커스텀 폰트 전체 — public/fonts(빌드 스캔) + 업로드(DB config). */
export function useCustomFonts(): CustomFont[] {
  const config = useSiteConfig();
  const uploaded = config.typography?.customFonts as CustomFont[] | undefined;
  /* `?? []` 를 useMemo 밖에 두면 customFonts 가 없을 때 렌더마다 새 빈 배열이 생겨
     deps 가 매번 달라진다 — 캐시가 한 번도 맞지 않는다. 폴백을 콜백 안으로 넣는다. */
  return useMemo(() => mergeCustomFonts(LOCAL_FONTS, uploaded ?? []), [uploaded]);
}
