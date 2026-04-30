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
type Translations = { [key: string]: TranslationValue };

const translations: Record<Language, Translations> = { ko, en };

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  tAlt: (key: string) => string;
  tLang: (key: string, lang: Language) => string;
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
};

const LanguageContext = createContext<LanguageContextType>(defaultContextValue);

/* ── Provider ── */

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // useState("ko"): 첫 렌더(hydration)에서 항상 "ko" → 서버 HTML과 일치 보장
  // HMR 시에는 state가 보존되지만, HMR은 hydration이 아니므로 문제없음
  const [language, setLanguageState] = useState<Language>("ko");

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
      return getNestedValue(translations[language], key);
    },
    [language]
  );

  const tAlt = useCallback(
    (key: string): string => {
      const altLanguage = language === "ko" ? "en" : "ko";
      return getNestedValue(translations[altLanguage], key);
    },
    [language]
  );

  const tLang = useCallback((key: string, lang: Language): string => {
    return getNestedValue(translations[lang], key);
  }, []);

  const value = useMemo(
    () => ({ language, toggleLanguage, setLanguage, t, tAlt, tLang }),
    [language, toggleLanguage, setLanguage, t, tAlt, tLang]
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
