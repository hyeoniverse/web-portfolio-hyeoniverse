"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  startTransition,
} from "react";
import ko from "@/locales/ko.json";
import en from "@/locales/en.json";

export type Language = "ko" | "en";

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

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  tAlt: (key: string) => string;
  tLang: (key: string, lang: Language) => string;
  /** 지연 로드한 사전을 병합한다 (admin 번역 등). 같은 키는 나중 것이 이긴다. */
  addTranslations: (extra: Record<Language, Translations>) => void;
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
  language: "ko",
  toggleLanguage: () => {},
  setLanguage: () => {},
  t: (key) => getNestedValue(translations.ko, key),
  tAlt: (key) => getNestedValue(translations.en, key),
  tLang: (key, lang) => getNestedValue(translations[lang], key),
  addTranslations: () => {},
};

const LanguageContext = createContext<LanguageContextType>(defaultContextValue);

/* ── Provider ── */

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // useState("ko"): 첫 렌더(hydration)에서 항상 "ko" → 서버 HTML과 일치 보장
  // HMR 시에는 state가 보존되지만, HMR은 hydration이 아니므로 문제없음
  const [language, setLanguageState] = useState<Language>("ko");

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

  // 마운트 시 localStorage/브라우저 언어 감지
  // startTransition: Next.js App Router가 페이지 컨텐츠를 내부 Suspense로 감싸므로,
  // layout effect가 페이지 hydration보다 먼저 실행될 수 있음.
  // startTransition으로 감싸면 React가 hydration 완료 후에 언어 전환을 적용.
  useEffect(() => {
    const stored = localStorage.getItem("language") as Language | null;
    const target: Language =
      stored === "ko" || stored === "en"
        ? stored
        : navigator.language?.startsWith("en")
          ? "en"
          : "ko";

    if (target !== "ko") {
      startTransition(() => {
        setLanguageState(target);
      });
    }
    applyLangToDom(target);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === "ko" ? "en" : "ko";
      applyLangToDom(next);
      return next;
    });
  }, []);

  const setLanguage = useCallback((newLanguage: Language) => {
    setLanguageState(newLanguage);
    applyLangToDom(newLanguage);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(dict[language], key);
    },
    [language, dict]
  );

  const tAlt = useCallback(
    (key: string): string => {
      const altLanguage = language === "ko" ? "en" : "ko";
      return getNestedValue(dict[altLanguage], key);
    },
    [language, dict]
  );

  const tLang = useCallback(
    (key: string, lang: Language): string => {
      return getNestedValue(dict[lang], key);
    },
    [dict]
  );

  const value = useMemo(
    () => ({ language, toggleLanguage, setLanguage, t, tAlt, tLang, addTranslations }),
    [language, toggleLanguage, setLanguage, t, tAlt, tLang, addTranslations]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
