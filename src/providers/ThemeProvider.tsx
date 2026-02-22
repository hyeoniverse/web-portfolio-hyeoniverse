"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useSiteConfig } from "./SiteConfigProvider";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// siteConfig 기본값 — 변경이 없으면 CSS 토큰 유지 (오버라이드 안 함)
const DEFAULTS = {
  accentColor: "#d40063",
  lightBg: "#f5f5f0",
  lightText: "#1a1a1a",
  darkBg: "#0a0a0a",
  darkText: "#f5f5f0",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const siteConfig = useSiteConfig();
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const isFirstThemeRef = useRef(true);

  // localStorage 또는 시스템 설정에서 테마 초기화
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) {
      setThemeState(stored);
    } else {
      // 시스템 설정 확인
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setThemeState(prefersDark ? "dark" : "light");
    }
  }, []);

  // 문서에 테마 적용
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    if (isFirstThemeRef.current) {
      // 초기 로드: transition 없이 즉시 적용
      isFirstThemeRef.current = false;
      root.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
      applyThemeColors(root, theme, siteConfig.theme);
      return;
    }

    // 테마 전환: transition을 일시적으로 활성화 (350ms)
    root.setAttribute("data-theme-transitioning", "");
    void root.offsetHeight; // reflow 강제 → transition 등록 보장
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    applyThemeColors(root, theme, siteConfig.theme);

    const timer = setTimeout(() => {
      root.removeAttribute("data-theme-transitioning");
    }, 350);

    return () => clearTimeout(timer);
  }, [theme, mounted, siteConfig.theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** 사이트 설정에서 지정한 테마 색상을 CSS 변수로 주입 */
function applyThemeColors(
  root: HTMLElement,
  theme: Theme,
  colors: typeof DEFAULTS,
) {
  // accent — 기본값과 다를 때만 오버라이드
  if (colors.accentColor && colors.accentColor !== DEFAULTS.accentColor) {
    root.style.setProperty("--color-accent", colors.accentColor);
  } else {
    root.style.removeProperty("--color-accent");
  }

  // 배경/텍스트 — 테마별 분기
  if (theme === "light") {
    setOrRemove(root, "--bg-primary", colors.lightBg, DEFAULTS.lightBg);
    setOrRemove(root, "--text-primary", colors.lightText, DEFAULTS.lightText);
  } else {
    setOrRemove(root, "--bg-primary", colors.darkBg, DEFAULTS.darkBg);
    setOrRemove(root, "--text-primary", colors.darkText, DEFAULTS.darkText);
  }
}

function setOrRemove(
  el: HTMLElement,
  prop: string,
  value: string | undefined,
  defaultValue: string,
) {
  if (value && value !== defaultValue) {
    el.style.setProperty(prop, value);
  } else {
    el.style.removeProperty(prop);
  }
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
