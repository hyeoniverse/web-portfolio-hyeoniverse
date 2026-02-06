"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

type Language = "ko" | "en";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ko");
  const [mounted, setMounted] = useState(false);

  // Initialize language from localStorage or browser preference
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("language") as Language | null;
    if (stored) {
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

  return (
    <LanguageContext.Provider
      value={{ language, toggleLanguage, setLanguage }}
    >
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
