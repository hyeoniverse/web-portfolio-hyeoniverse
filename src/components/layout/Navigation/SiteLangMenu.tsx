"use client";

import ContentLangMenu from "@/components/ui/ContentLangMenu";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteLang } from "@/providers/SiteTranslationProvider";
import { selectSiteLang } from "@/lib/siteLang";
import { fillTemplate } from "@/utils/format";
import { findTranslationLanguage } from "@/lib/translationLanguages";
import { cn } from "@/utils/cn";
import styles from "./Navigation.module.css";

/**
 * 내비게이션의 🌐 — 사이트 전체를 다른 언어(ko · en 밖)로 보기. KO/EN 단추 바로 왼쪽에 선다.
 * 메뉴는 상세 화면의 "다른 언어로 읽기"(ContentLangMenu)를 그대로 쓰고, 언어 상태도 같다(lib/siteLang) —
 * 여기서 고르면 상세 본문까지, 상세에서 고르면 여기까지 바뀐다.
 * 켜져 있으면 단추에 언어 코드가 붙고, 누르면 메뉴 없이 원문으로 돌아간다. 화면 글을 받아 오는 동안은 점이 움직인다.
 */
export default function SiteLangMenu() {
  const { t } = useLanguage();
  const site = useSiteLang();
  const name = site.lang ? findTranslationLanguage(site.lang)?.native ?? site.lang : "";
  return (
    <ContentLangMenu
      value={site.lang}
      onChange={selectSiteLang}
      busy={site.uiStatus === "loading"}
      triggerClassName={cn(styles.actionBtn, styles.siteLangBtn)}
      triggerActiveClassName={styles.siteLangActive}
      tooltipPlacement="bottom"
      labels={{
        open: t("contentTranslate.siteMenuLabel"),
        off: fillTemplate(t("contentTranslate.siteTurnOff"), { lang: name }),
      }}
    />
  );
}
