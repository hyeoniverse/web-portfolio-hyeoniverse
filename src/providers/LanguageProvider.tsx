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
import { getServerSiteLangSnapshot, getSiteLangSnapshot, subscribeSiteLang } from "@/lib/siteLang";

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

function applyLangToDom(lang: Language) {
  localStorage.setItem("language", lang);
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
  dict: translations,
};

/* export: AdminDictProvider 가 이 context 를 읽어 dict 만 admin 사전으로 덮어 다시 provide 한다.
   (언어 스토어·컨트롤은 그대로 재사용 — 언어 토글이 어긋나지 않게) */
export const LanguageContext = createContext<LanguageContextType>(defaultContextValue);
export type { LanguageContextType };

/* ── Provider ── */

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // 언어 저장소 — 서버와 첫 렌더(hydration)는 늘 "ko" 로 그려 서버 HTML 과 맞춘다
  const languageRef = useRef<Language>("ko");
  const listenersRef = useRef(new Set<() => void>());
  const subscribe = useCallback((onChange: () => void) => {
    const listeners = listenersRef.current;
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
  }, []);
  const getLanguage = useCallback(() => languageRef.current, []);
  const setLanguage = useCallback((next: Language) => {
    applyLangToDom(next);
    if (languageRef.current === next) return;
    languageRef.current = next;
    listenersRef.current.forEach((notify) => notify());
  }, []);
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

  // 마운트 시 localStorage/브라우저 언어 감지. 구독한 소비자만 다시 그리고 context 값은 그대로다
  useEffect(() => {
    const stored = localStorage.getItem("language") as Language | null;
    const target: Language =
      stored === "ko" || stored === "en"
        ? stored
        : navigator.language?.startsWith("en")
          ? "en"
          : "ko";
    setLanguage(target);
  }, [setLanguage]);

  // 사전이 늘 때(admin 번역 지연 로드)만 바뀐다
  const value = useMemo(
    () => ({ toggleLanguage, setLanguage, addTranslations, subscribe, getLanguage, dict }),
    [toggleLanguage, setLanguage, addTranslations, subscribe, getLanguage, dict]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

const getServerLanguage = (): Language => "ko";

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
} {
  const { subscribe, getLanguage, dict, contentOverlay = true, ...controls } = useContext(LanguageContext);
  const savedLanguage = useSyncExternalStore(subscribe, getLanguage, getServerLanguage);
  /* 다른 언어(ko · en 밖)가 걸려 있으면 화면의 기본 언어는 영어 — 번역되지 않은 글(language === "ko" ? … 분기,
     <T ko en>, 상세의 viewLang)이 한국어로 섞여 나오지 않게. 저장된 ko/en 선택은 건드리지 않아 번역을 끄면 돌아온다.
     화면 글 번역이 왔으면 그것, 번역에 빠진 글(받지 못한 · 깨진 자리표시)은 영어 사전.
     서버 · 하이드레이션 때는 늘 꺼진 상태라 ko/en 으로 먼저 그린다.
     관리 화면은 관리자 사전 번역(adminUi)도 얹는다 — 받기 전에는 관리자 글만 영어 */
  const site = useSyncExternalStore(subscribeSiteLang, getSiteLangSnapshot, getServerSiteLangSnapshot);
  const foreignLang = site.lang;
  const language: Language = foreignLang ? "en" : savedLanguage;
  const overlay = useMemo(
    () => (!foreignLang ? null : site.adminUi ? { ...site.ui, ...site.adminUi } : site.ui),
    [foreignLang, site.ui, site.adminUi],
  );
  const t = useCallback(
    (key: string) => (overlay ? overlay[key] ?? getNestedValue(dict.en, key) : getNestedValue(dict[language], key)),
    [dict, language, overlay],
  );
  /* 반대 언어 말풍선 — 다른 언어로 볼 때는 한국어를 꺼내 보이지 않는다(같은 글을 돌려주면 T 가 말풍선을 생략한다) */
  const tAlt = useCallback(
    (key: string) => (foreignLang ? t(key) : getNestedValue(dict[language === "ko" ? "en" : "ko"], key)),
    [dict, language, foreignLang, t],
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
  const dateLocale = foreignLang ?? (language === "ko" ? "ko-KR" : "en-US");
  return { language, foreignLang, t, tAlt, tLang, tx, dateLocale, ...controls };
}
