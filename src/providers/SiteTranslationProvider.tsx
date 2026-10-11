"use client";

import { useEffect, useSyncExternalStore } from "react";
import { showToast } from "@/stores/toastStore";
import { fillTemplate } from "@/utils/format";
import { findTranslationLanguage } from "@/lib/translationLanguages";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import {
  ensureSiteUi,
  getServerSiteLangSnapshot,
  getSiteLangSnapshot,
  setSiteLangEnabled,
  subscribeSiteLang,
} from "@/lib/siteLang";

/** 사이트의 "다른 언어" 상태(lib/siteLang)를 바로 쓰는 훅 — 메뉴 · 안내 · 상세 번역이 같은 값을 본다 */
export function useSiteLang() {
  return useSyncExternalStore(subscribeSiteLang, getSiteLangSnapshot, getServerSiteLangSnapshot);
}

/**
 * 사이트 전체 번역의 연결부 — 그리는 것은 없다. 루트 레이아웃의 LanguageProvider 안에 둔다.
 *   - 번역이 꺼진 사이트(설정) · 관리 화면(/admin)에서는 언어를 걸지 않는다 — 관리 화면은 늘 ko/en
 *   - 걸린 언어의 화면 글 번역을 한 번 받아 둔다(메모리 + localStorage, lib/siteLang)
 *   - 그 언어의 화면 글이 처음 걸릴 때 "기계 번역" 안내를 토스트로 한 번(언어마다, 탭을 닫을 때까지) — 늘 보이는 표시는
 *     내비게이션 🌐 단추의 언어 코드다. 푸터는 홈 · 작업물 · 소개 화면에서 숨으므로 안내 자리로 쓰지 않는다
 *   - <html lang> 을 지금 보이는 언어로 — 다른 언어의 화면 글이 걸리면 그 코드, 아니면 ko/en(LanguageProvider 가 쓰던 값)
 */
export default function SiteTranslationProvider() {
  const siteConfig = useSiteConfig();
  const pathname = useRoutePathname() ?? "";
  const { language, t } = useLanguage();
  const site = useSiteLang();

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const configEnabled = siteConfig?.translation?.enabled !== false;
  useEffect(() => {
    setSiteLangEnabled(configEnabled && !isAdmin);
  }, [configEnabled, isAdmin]);

  useEffect(() => {
    if (site.lang && site.uiStatus === "idle") void ensureSiteUi(site.lang);
  }, [site.lang, site.uiStatus]);

  /* 기계 번역 안내 — 화면 글이 바뀐 뒤(그 언어로 읽히게), 언어마다 한 번 */
  const uiReady = !!(site.lang && site.ui);
  useEffect(() => {
    if (!uiReady || !site.lang) return;
    const key = `siteTranslateNotice:${site.lang}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* 저장소를 못 쓰면 기억하지 못한 채 띄운다 */ }
    /* 언어 이름은 그 언어로 쓴 이름(日本語) — 안내 글이 그 언어로 번역돼 있다 */
    showToast(fillTemplate(t("contentTranslate.siteNotice"), { lang: findTranslationLanguage(site.lang)?.native ?? site.lang }), "info", 6000);
  }, [uiReady, site.lang, t]);

  /* 화면 글이 그 언어로 바뀐 뒤에 바꾼다 — 받기 전(또는 실패)에는 화면이 아직 ko/en 이다 */
  const shownLang = site.lang && site.ui ? site.lang : language;
  useEffect(() => {
    document.documentElement.setAttribute("lang", shownLang);
  }, [shownLang]);

  return null;
}
