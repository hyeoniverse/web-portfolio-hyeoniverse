"use client";

import { useEffect, useSyncExternalStore } from "react";
import { showToast } from "@/stores/toastStore";
import { fillTemplate } from "@/utils/format";
import { findTranslationLanguage } from "@/lib/translationLanguages";
import { SiteTranslatingStatus } from "@/components/ui/ContentTranslateBanner";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import {
  ensureSiteContent,
  getSiteDefaultLang,
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
 * 사이트 전체 번역의 연결부 — 그리는 것은 번역 중 안내 한 줄뿐. 루트 레이아웃의 LanguageProvider 안에 둔다.
 *   - 번역이 꺼진 사이트(설정)에서는 언어를 걸지 않는다. 관리 화면(/admin)도 같은 언어 — 화면 글만 번역(AdminDictProvider)
 *   - 화면 글 번역은 t() 가 화면에 그리는 글만 그때그때 묻는다(lib/siteLang · 메모리 + localStorage)
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
    setSiteLangEnabled(configEnabled);
  }, [configEnabled]);

  /* 사이트 내용 글(홈 글 · 카테고리 · 태그 · 프로필) — 언어마다 이번 방문에 한 번. About 글은 About 화면에 왔을 때만.
     화면을 옮길 때마다 부르지만 이미 받았으면 바로 돌아온다 — 실패했던 것만 그때 다시 묻는다 */
  const onAbout = pathname === "/about" || pathname.startsWith("/about/");
  /* 사이트 기본 언어(ko · en 밖)면 내용 글은 이미 그 언어의 원문 — 번역을 받지 않는다(#1406) */
  const contentLang = site.lang && site.lang !== getSiteDefaultLang() ? site.lang : null;
  useEffect(() => {
    /* 관리 화면은 내용 글을 원문으로 보인다 — 받지 않는다 */
    if (contentLang && !isAdmin) void ensureSiteContent(contentLang);
  }, [contentLang, pathname, isAdmin]);
  useEffect(() => {
    if (contentLang && onAbout) void ensureSiteContent(contentLang, "about");
  }, [contentLang, onAbout, pathname]);

  /* 기계 번역 안내 — 화면 글이 바뀐 뒤(그 언어로 읽히게), 언어마다 한 번. 사이트 기본 언어는 안내하지 않는다(#1406) */
  /* 안내 글은 그 문장의 번역이 온 뒤에 띄운다 — 화면 글은 보이는 것만 받아 와서, 먼저 띄우면 영어로 굳는다.
     그리는 동안 t() 를 불러 둬야 그 문장을 묻는다 */
  const noticeText = t("contentTranslate.siteNotice");
  /* 한국어로 보기는 화면 글이 한국어 사전이라 기다릴 번역이 없다 — 내용 글만 기계 번역이므로 안내는 띄운다 */
  const uiReady = !!(site.lang && (site.lang === "ko" || site.ui?.["contentTranslate.siteNotice"]) && site.lang !== getSiteDefaultLang());
  useEffect(() => {
    if (!uiReady || !site.lang) return;
    const key = `siteTranslateNotice:${site.lang}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* 저장소를 못 쓰면 기억하지 못한 채 띄운다 */ }
    /* 언어 이름은 그 언어로 쓴 이름(日本語) — 안내 글이 그 언어로 번역돼 있다 */
    showToast(fillTemplate(noticeText, { lang: findTranslationLanguage(site.lang)?.native ?? site.lang }), "info", 6000);
  }, [uiReady, site.lang, noticeText]);

  /* 화면 글이 그 언어로 바뀐 뒤에 바꾼다 — 받기 전(또는 실패)에는 화면이 아직 ko/en 이다 */
  const shownLang = site.lang && (site.ui || site.lang === "ko") ? site.lang : language;
  useEffect(() => {
    document.documentElement.setAttribute("lang", shownLang);
  }, [shownLang]);

  /* 화면 글을 받는 동안 — 영어가 그대로 드러나 보이지 않게 상세 번역과 같은 효과(흐리게 숨 쉬기 + 번역 중 안내).
     관리 화면은 관리자 사전 번역까지 받을 때까지 */
  const translating = !!site.lang && (site.uiStatus === "loading" || (isAdmin && site.adminUiLoading));
  useEffect(() => {
    const el = document.documentElement;
    if (translating) el.setAttribute("data-site-translating", "");
    else el.removeAttribute("data-site-translating");
  }, [translating]);

  return translating && site.lang ? <SiteTranslatingStatus lang={site.lang} /> : null;
}
