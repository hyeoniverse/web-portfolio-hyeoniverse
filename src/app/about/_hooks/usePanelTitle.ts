"use client";

import { useAboutConfig } from "../_components/AboutConfig";
import { useLanguage } from "@/providers/LanguageProvider";
import { aboutPanelTitle } from "@/data/about/panels";

/**
 * 패널에 찍을 제목.
 *
 * 관리자에서 지정한 제목(`about.panelTitles[key][language]`)이 있으면 그것을, 없으면
 * `@/data/about/panels` 의 기본값을 돌려준다. 호출하는 쪽은 기본 제목을 알 필요가 없다 —
 * 전에는 패널마다 `titleOverride ?? "Overview."` 처럼 적어 두어, 이름을 바꿀 때 한 곳을
 * 놓치면 화면마다 다른 이름이 나왔다.
 */
export function usePanelTitle(key: string): string {
  const about = useAboutConfig();
  const { language } = useLanguage();
  return aboutPanelTitle(key, about.panelTitles?.[key]?.[language]);
}
