"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ABOUT_TEXT_DEFAULTS, applyAboutTexts, type AboutTexts } from "@/app/about/_data/texts";
import type { SiteConfigData } from "@/config/site.config";

type AboutConfig = SiteConfigData["about"];

/* /about 패널 내용. 모든 페이지에 싣는 사이트 설정에서는 빠져 있어(config/siteWideConfig.ts, #944) 이 페이지만 따로 받는다.
   SiteConfigProvider 처럼 기본값을 두지 않는다 — 밖에서 쓰면 조용히 정적 폴백으로 그리는 대신 바로 드러난다 */
const AboutConfigContext = createContext<AboutConfig | null>(null);
/* 장마다의 글 — 코드 기본값(_data/*)에 관리자가 고친 글(about.texts)을 겹친 것. 밖에서는 기본값 그대로 */
const AboutTextsContext = createContext<AboutTexts>(ABOUT_TEXT_DEFAULTS);

export function AboutConfigProvider({ about, children }: { about: AboutConfig; children: ReactNode }) {
  const texts = useMemo(() => applyAboutTexts(about.texts), [about.texts]);
  return (
    <AboutConfigContext.Provider value={about}>
      <AboutTextsContext.Provider value={texts}>{children}</AboutTextsContext.Provider>
    </AboutConfigContext.Provider>
  );
}

export function useAboutConfig(): AboutConfig {
  const about = useContext(AboutConfigContext);
  if (!about) throw new Error("useAboutConfig must be used within an AboutConfigProvider");
  return about;
}

export function useAboutText(): AboutTexts {
  return useContext(AboutTextsContext);
}
