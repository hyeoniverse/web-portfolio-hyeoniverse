"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteConfigData } from "@/config/site.config";

type AboutConfig = SiteConfigData["about"];

/* /about 패널 내용. 모든 페이지에 싣는 사이트 설정에서는 빠져 있어(config/siteWideConfig.ts, #944) 이 페이지만 따로 받는다.
   SiteConfigProvider 처럼 기본값을 두지 않는다 — 밖에서 쓰면 조용히 정적 폴백으로 그리는 대신 바로 드러난다 */
const AboutConfigContext = createContext<AboutConfig | null>(null);

export function AboutConfigProvider({ about, children }: { about: AboutConfig; children: ReactNode }) {
  return <AboutConfigContext.Provider value={about}>{children}</AboutConfigContext.Provider>;
}

export function useAboutConfig(): AboutConfig {
  const about = useContext(AboutConfigContext);
  if (!about) throw new Error("useAboutConfig must be used within an AboutConfigProvider");
  return about;
}
