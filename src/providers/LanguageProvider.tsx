"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import ko from "@/locales/ko.json";
import en from "@/locales/en.json";
import type { Language } from "@/types";
import { getServerSiteLangSnapshot, getSiteLangSnapshot, primeSiteUi, selectSiteLang, serverSnapshotFor, setSiteDefaultLang, subscribeSiteLang, type SiteLangSnapshot } from "@/lib/siteLang";
import { baseLanguageOf, isForeignSiteLanguage, normalizeSiteLanguage } from "@/lib/siteLanguage";

export type { Language };

/** 번역 함수 시그니처 — t/tAlt 및 t 를 prop 으로 받는 컴포넌트 공용 */
export type TFunction = (key: string) => string;

type TranslationValue = string | { [key: string]: TranslationValue };
export type Translations = { [key: string]: TranslationValue };

/**
 * 공개 번역만 정적으로 싣는다.
 *
 * `admin.*` 키가 사전의 66%(ko 32.8 / en 41.6 kB)를 차지하는데 방문자는 한 글자도 쓰지 않는다.
 * 별도 파일(`*.admin.json`)로 떼어 admin 영역에서만 동적으로 불러온다 —
 * `AdminTranslationsGate` 참고.
 *
 * `editor.*` 는 분리하지 않는다. ShareButton·FontPicker 등 공개 컴포넌트도 쓴다.
 */
const translations: Record<Language, Translations> = { ko, en };

interface LanguageControls {
  toggleLanguage: () => void;
  setLanguage: (language: Language) => void;
  /** 지연 로드한 사전을 병합한다 (admin 번역 등). 같은 키는 나중 것이 이긴다. */
  addTranslations: (extra: Record<Language, Translations>) => void;
}

/* context 값에는 현재 언어를 넣지 않는다(#929). 저장값·브라우저 언어는 마운트 뒤에야 알 수 있는데, 그때 context 값이 바뀌면
   아직 하이드레이션 전인 페이지 경계(상세의 loading.tsx)를 React 가 서버 HTML 과 맞춰 볼 수 없어 새로 그린다. 언어는 구독으로
   받는다 — useSyncExternalStore 는 늦게 하이드레이션되는 경계에서도 서버 값(ko)으로 맞춘 뒤 바꾼다 */
interface LanguageContextType extends LanguageControls {
  subscribe: (onChange: () => void) => () => void;
  getLanguage: () => Language;
  /** 서버 · 하이드레이션 때 그리는 언어 — 사이트 기본 언어가 ko 면 ko, 아니면 en(#1406) */
  getServerLanguage: () => Language;
  /** 사이트 기본 언어가 ko · en 밖이면 그 코드(ja 등) — ko 자리를 그 언어가 대신한다. 아니면 null */
  nativeLang?: string | null;
  /** 서버 · 하이드레이션 때의 사이트 언어 — 기본 언어 화면 글이 미리 번역돼 있으면 그 언어로 그린다 */
  getServerSiteSnapshot?: () => SiteLangSnapshot;
  /** 정적 사전 + 지연 로드분 */
  dict: Record<Language, Translations>;
  /** 사이트 내용 글(tx — 홈 글 · 카테고리 · 태그)을 다른 언어로 바꿀지 — 관리 화면(AdminDictProvider)은 false(원문을 보고 고친다) */
  contentOverlay?: boolean;
}

function getNestedValue(obj: Translations, path: string): string {
  const keys = path.split(".");
  let value: TranslationValue = obj;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return path;
    }
  }

  return typeof value === "string" ? value : path;
}

function applyLangToDom(lang: Language, persist = true) {
  if (persist) localStorage.setItem("language", lang);
  document.documentElement.setAttribute("lang", lang);
}

/* SSR / 프로바이더 누락(레이아웃 revalidate 도중 등) 상황에서도 안전하게 동작하도록
   ko 기준 기본값 제공 — SiteConfigProvider 와 동일한 방어적 패턴 */
const defaultContextValue: LanguageContextType = {
  toggleLanguage: () => {},
  setLanguage: () => {},
  addTranslations: () => {},
  subscribe: () => () => {},
  getLanguage: () => "ko",
  getServerLanguage: () => "ko",
  dict: translations,
};

/* export: AdminDictProvider 가 이 context 를 읽어 dict 만 admin 사전으로 덮어 다시 provide 한다.
   (언어 스토어·컨트롤은 그대로 재사용 — 언어 토글이 어긋나지 않게) */
export const LanguageContext = createContext<LanguageContextType>(defaultContextValue);
export type { LanguageContextType };

/* ── Provider ── */

export function LanguageProvider({
  children,
  siteLanguage = "ko",
  defaultUi = null,
}: {
  children: React.ReactNode;
  /** 사이트 기본 언어(site.config metadata.defaultLanguage) — ko · en 또는 번역 언어 코드 */
  siteLanguage?: string;
  /** 기본 언어(ko · en 밖)의 화면 글 — 설정 저장 때 미리 번역해 둔 것(lib/api/defaultLangUi). 없으면 서버는 영어로 그린다 */
  defaultUi?: Record<string, string> | null;
}) {
  /* 사이트 기본 언어 — ko · en 밖(ja 등)이면 ko 자리를 그 언어가 대신한다. 글은 ko 칸(그 언어의 원문)을 그대로,
     화면 글은 영어 사전 위에 그 언어의 기계 번역을 건다(lib/siteLang).
     첫 렌더에 알려 둬야 저장소가 처음 언어를 정할 때 쓴다. 설정이 바뀌면(관리자 저장) 아래 effect 가 다시 알린다 */
  const baseLanguage = baseLanguageOf(siteLanguage);
  useState(() => setSiteDefaultLang(siteLanguage));
  useEffect(() => { setSiteDefaultLang(siteLanguage); }, [siteLanguage]);

  const nativeLang = isForeignSiteLanguage(siteLanguage) ? normalizeSiteLanguage(siteLanguage) : null;
  /* 기본 언어 화면 글이 미리 번역돼 있으면 서버도 그 언어(ko 자리)로 그린다 — 브라우저 메모리에도 넣어 다시 받지 않는다 */
  const serverNative = nativeLang && defaultUi ? nativeLang : null;
  useState(() => { if (serverNative && defaultUi) primeSiteUi(serverNative, defaultUi); });
  const serverSite = useMemo(
    () => (serverNative && defaultUi ? serverSnapshotFor(serverNative, defaultUi) : getServerSiteLangSnapshot()),
    [serverNative, defaultUi],
  );
  const getServerSiteSnapshot = useCallback(() => serverSite, [serverSite]);
  const serverLanguage: Language = serverNative ? "ko" : baseLanguage;
  const getServerLanguage = useCallback(() => serverLanguage, [serverLanguage]);
  // 언어 저장소 — 서버와 첫 렌더(hydration)는 서버가 그린 언어로 맞춘다
  const languageRef = useRef<Language>(serverLanguage);
  const listenersRef = useRef(new Set<() => void>());
  const subscribe = useCallback((onChange: () => void) => {
    const listeners = listenersRef.current;
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
  }, []);
  const getLanguage = useCallback(() => languageRef.current, []);
  const applyLanguage = useCallback((next: Language, persist: boolean) => {
    applyLangToDom(next, persist);
    if (languageRef.current === next) return;
    languageRef.current = next;
    listenersRef.current.forEach((notify) => notify());
  }, []);
  /* 기본 언어가 ko · en 밖이면 ko 자리 = 그 언어 — 고르면 사이트 언어도 맞춘다(ko → 그 언어, en → 번역 끔) */
  const setLanguage = useCallback((next: Language) => {
    applyLanguage(next, true);
    if (nativeLang) selectSiteLang(next === "ko" ? nativeLang : null);
  }, [applyLanguage, nativeLang]);
  const toggleLanguage = useCallback(() => {
    setLanguage(languageRef.current === "ko" ? "en" : "ko");
  }, [setLanguage]);

  /* 지연 로드된 사전(admin 등). 정적 사전 위에 얹는다. */
  const [extra, setExtra] = useState<Record<Language, Translations> | null>(null);

  const addTranslations = useCallback((next: Record<Language, Translations>) => {
    setExtra((prev) =>
      prev
        ? { ko: { ...prev.ko, ...next.ko }, en: { ...prev.en, ...next.en } }
        : next,
    );
  }, []);

  /* 조회용 사전 — 정적 + 지연 로드분 */
  const dict = useMemo<Record<Language, Translations>>(
    () =>
      extra
        ? { ko: { ...translations.ko, ...extra.ko }, en: { ...translations.en, ...extra.en } }
        : translations,
    [extra],
  );

  /* 마운트 시 저장값 › 브라우저 언어(ko · en) › 사이트 기본 언어. 구독한 소비자만 다시 그리고 context 값은 그대로다.
     저장값이 없으면 고른 것으로 남기지 않는다 — 기본 언어를 바꾸면 고른 적 없는 방문자에게 새 기본값이 걸리게.
     기본 언어가 ko · en 밖이면 브라우저 언어를 보지 않는다 — ko 자리(그 언어)가 기본이다. 실제 언어는 사이트 언어에서 정한다(useLanguage) */
  const foreignDefault = !!nativeLang;
  useEffect(() => {
    const stored = localStorage.getItem("language") as Language | null;
    if (stored === "ko" || stored === "en") {
      applyLanguage(stored, true);
      return;
    }
    const browser = navigator.language?.toLowerCase() ?? "";
    const target: Language = foreignDefault
      ? "ko"
      : browser.startsWith("en")
        ? "en"
        : browser.startsWith("ko")
          ? "ko"
          : baseLanguage;
    applyLanguage(target, false);
  }, [applyLanguage, baseLanguage, foreignDefault]);

  // 사전이 늘 때(admin 번역 지연 로드)만 바뀐다
  const value = useMemo(
    () => ({ toggleLanguage, setLanguage, addTranslations, subscribe, getLanguage, getServerLanguage, nativeLang, getServerSiteSnapshot, dict }),
    [toggleLanguage, setLanguage, addTranslations, subscribe, getLanguage, getServerLanguage, nativeLang, getServerSiteSnapshot, dict]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageControls & {
  language: Language;
  /** 사이트에 걸린 다른 언어(ko · en 밖) — 없으면 null. 걸려 있으면 language 는 늘 "en" 이다 */
  foreignLang: string | null;
  t: TFunction;
  tAlt: TFunction;
  tLang: (key: string, lang: Language) => string;
  /** 사이트 내용 글(설정 · DB 에서 온 원문 — 홈 글 · 카테고리 · 태그)을 걸린 다른 언어로. 번역이 없거나 다른 언어가 꺼져 있으면 원문 */
  tx: (text: string) => string;
  /** 날짜 · 숫자를 쓸 언어 — 다른 언어가 걸려 있으면 그 언어(ja 등), 아니면 ko-KR · en-US */
  dateLocale: string;
  /** ko 자리의 이름 — 사이트 기본 언어가 ko · en 밖이면 그 코드(JA 등), 아니면 KO */
  koLabel: string;
} {
  const { subscribe, getLanguage, getServerLanguage, nativeLang = null, getServerSiteSnapshot = getServerSiteLangSnapshot, dict, contentOverlay = true, ...controls } = useContext(LanguageContext);
  const savedLanguage = useSyncExternalStore(subscribe, getLanguage, getServerLanguage);
  /* 다른 언어(ko · en 밖)가 걸려 있으면 화면의 기본 언어는 영어 — 번역되지 않은 글(language === "ko" ? … 분기,
     <T ko en>, 상세의 viewLang)이 한국어로 섞여 나오지 않게. 저장된 ko/en 선택은 건드리지 않아 번역을 끄면 돌아온다.
     화면 글 번역이 왔으면 그것, 번역에 빠진 글(받지 못한 · 깨진 자리표시)은 영어 사전.
     서버 · 하이드레이션 때는 늘 꺼진 상태라 ko/en 으로 먼저 그린다.
     관리 화면은 관리자 사전 번역(adminUi)도 얹는다 — 받기 전에는 관리자 글만 영어 */
  const site = useSyncExternalStore(subscribeSiteLang, getSiteLangSnapshot, getServerSiteSnapshot);
  /* 사이트 기본 언어(ko · en 밖)가 걸린 것은 번역이 아니라 ko 자리 — 글은 ko 칸(원문) 그대로, 화면 글만 그 언어로 */
  const native = !!nativeLang && site.lang === nativeLang;
  const foreignLang = native ? null : site.lang;
  /* 기본 언어가 ko · en 밖이면 언어는 사이트 언어로 정한다 — 그 언어면 ko 자리, 아니면 en(번역 끔 · 다른 언어) */
  const language: Language = native ? "ko" : foreignLang || nativeLang ? "en" : savedLanguage;
  const overlayOn = !!foreignLang || native;
  const overlay = useMemo(
    () => (!overlayOn ? null : site.adminUi ? { ...site.ui, ...site.adminUi } : site.ui),
    [overlayOn, site.ui, site.adminUi],
  );
  const t = useCallback(
    /* ko 자리가 다른 언어면 바탕 사전은 영어 — 번역을 받기 전에 한국어가 보이지 않게 */
    (key: string) => (overlay ? overlay[key] ?? getNestedValue(dict.en, key) : getNestedValue(dict[native ? "en" : language], key)),
    [dict, language, overlay, native],
  );
  /* 반대 언어 말풍선 — 다른 언어로 볼 때는 한국어를 꺼내 보이지 않는다(같은 글을 돌려주면 T 가 말풍선을 생략한다) */
  const tAlt = useCallback(
    (key: string) =>
      foreignLang || (nativeLang && !native)
        ? t(key)
        : getNestedValue(dict[language === "ko" ? "en" : "ko"], key),
    [dict, language, foreignLang, nativeLang, native, t],
  );
  const tLang = useCallback((key: string, lang: Language) => getNestedValue(dict[lang], key), [dict]);
  const content = foreignLang && contentOverlay ? site.content : null;
  /* 원문의 앞뒤 공백은 번역에 그대로 붙인다 — 조각으로 이어 붙이는 글(About 첫 화면 소개 등)의 띄어쓰기가 사라지지 않게 */
  const tx = useCallback((text: string) => {
    if (!content || !text) return text;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
    const hit = m ? content[m[2]] : undefined;
    return hit && m ? m[1] + hit + m[3] : text;
  }, [content]);
  const dateLocale = foreignLang ?? (native && nativeLang ? nativeLang : language === "ko" ? "ko-KR" : "en-US");
  const koLabel = nativeLang ? nativeLang.toUpperCase() : "KO";
  return { language, foreignLang, t, tAlt, tLang, tx, dateLocale, koLabel, ...controls };
}
