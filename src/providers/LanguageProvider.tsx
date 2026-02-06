"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
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
  tAlt: (key: string) => string; // Translation in alternate language
  tLang: (key: string, lang: Language) => string; // Translation in specific language
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

/**
 * Get nested value from object using dot notation
 * e.g., "hero.headline1" -> translations.hero.headline1
 */
function getNestedValue(obj: Translations, path: string): string {
  const keys = path.split(".");
  let value: TranslationValue = obj;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return path; // Return key if not found
    }
  }

  return typeof value === "string" ? value : path;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ko");
  const [mounted, setMounted] = useState(false);

  // Initialize language from localStorage or browser preference
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("language") as Language | null;
    if (stored && (stored === "ko" || stored === "en")) {
      setLanguageState(stored);
    } else {
      // Check browser language preference
      const browserLang = navigator.language || navigator.languages?.[0];
      if (browserLang?.startsWith("en")) {
        setLanguageState("en");
      }
      // Default remains "ko" for Korean or unknown languages
    }
  }, []);

  // Apply language to document
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("lang", language);
    localStorage.setItem("language", language);
  }, [language, mounted]);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === "ko" ? "en" : "ko"));
  }, []);

  const setLanguage = useCallback((newLanguage: Language) => {
    setLanguageState(newLanguage);
  }, []);

  // Translation function
  const t = useCallback(
    (key: string): string => {
      return getNestedValue(translations[language], key);
    },
    [language]
  );

  // Translation in alternate language
  const tAlt = useCallback(
    (key: string): string => {
      const altLanguage = language === "ko" ? "en" : "ko";
      return getNestedValue(translations[altLanguage], key);
    },
    [language]
  );

  // Translation in specific language
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
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
