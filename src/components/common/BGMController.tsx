"use client";

import { useBGM } from "@/hooks/useBGM";
import { useSiteConfig } from "@/providers/SiteConfigProvider";

export default function BGMController() {
  const siteConfig = useSiteConfig();
  useBGM(siteConfig.bgm.url);
  return null;
}
