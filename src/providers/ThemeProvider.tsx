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
import { loadGoogleFont } from "@/lib/loadGoogleFont";

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

interface TypographyConfig {
  headingFont: string;
  bodyFont: string;
  monoFont: string;
}

/** font display name → CSS font-family string (empty = use preloaded default) */
const HEADING_FONTS: Record<string, string> = {
  "Instrument Serif": "",
  "Noto Serif KR": '"Noto Serif KR", serif',
  "Nanum Myeongjo": '"Nanum Myeongjo", serif',
  "Gowun Batang": '"Gowun Batang", serif',
  "Hahmlet": '"Hahmlet", serif',
  "Playfair Display": '"Playfair Display", serif',
  "Cormorant Garamond": '"Cormorant Garamond", serif',
  "Lora": '"Lora", serif',
  "EB Garamond": '"EB Garamond", serif',
  "Merriweather": '"Merriweather", serif',
};

const BODY_FONTS: Record<string, string> = {
  "Space Grotesk": "",
  "Noto Sans KR": '"Noto Sans KR", sans-serif',
  "Gothic A1": '"Gothic A1", sans-serif',
  "IBM Plex Sans KR": '"IBM Plex Sans KR", sans-serif',
  "Nanum Gothic": '"Nanum Gothic", sans-serif',
  "Gowun Dodum": '"Gowun Dodum", sans-serif',
  "Inter": '"Inter", sans-serif',
  "DM Sans": '"DM Sans", sans-serif',
  "Poppins": '"Poppins", sans-serif',
  "Nunito": '"Nunito", sans-serif',
};

const MONO_FONTS: Record<string, string> = {
  "JetBrains Mono": "",
  "Fira Code": '"Fira Code", monospace',
  "Source Code Pro": '"Source Code Pro", monospace',
  "IBM Plex Mono": '"IBM Plex Mono", monospace',
  "Roboto Mono": '"Roboto Mono", monospace',
  "Inconsolata": '"Inconsolata", monospace',
  "Nanum Gothic Coding": '"Nanum Gothic Coding", monospace',
  "Ubuntu Mono": '"Ubuntu Mono", monospace',
  "DM Mono": '"DM Mono", monospace',
  "Courier Prime": '"Courier Prime", monospace',
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
      applyFontOverrides(root, siteConfig.typography);
      return;
    }

    // 테마 전환: transition을 일시적으로 활성화 (350ms)
    root.setAttribute("data-theme-transitioning", "");
    void root.offsetHeight; // reflow 강제 → transition 등록 보장
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    applyThemeColors(root, theme, siteConfig.theme);
    applyFontOverrides(root, siteConfig.typography);

    const timer = setTimeout(() => {
      root.removeAttribute("data-theme-transitioning");
    }, 350);

    return () => clearTimeout(timer);
  }, [theme, mounted, siteConfig.theme, siteConfig.typography]);

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

/** hex → [r, g, b] */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** accent 관련 CSS 변수를 모두 세팅 (alpha, dark, light 포함) */
const ACCENT_ALPHAS = [1, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];
const ACCENT_LIGHT_ALPHAS = [40, 60, 70, 90];

function applyAccentAll(root: HTMLElement, hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  const [r, g, b] = rgb;

  root.style.setProperty("--color-accent", hex);

  // alpha variants
  for (const a of ACCENT_ALPHAS) {
    root.style.setProperty(
      `--color-accent-alpha-${a}`,
      `rgba(${r}, ${g}, ${b}, ${a / 100})`,
    );
  }

  // darker variant (~20% darker)
  root.style.setProperty(
    "--color-accent-dark",
    `rgb(${Math.round(r * 0.78)}, ${Math.round(g * 0.78)}, ${Math.round(b * 0.78)})`,
  );

  // lighter variant (~40% toward white)
  const lr = Math.min(255, Math.round(r + (255 - r) * 0.4));
  const lg = Math.min(255, Math.round(g + (255 - g) * 0.4));
  const lb = Math.min(255, Math.round(b + (255 - b) * 0.4));
  root.style.setProperty("--color-accent-light", `rgb(${lr}, ${lg}, ${lb})`);

  for (const a of ACCENT_LIGHT_ALPHAS) {
    root.style.setProperty(
      `--color-accent-light-alpha-${a}`,
      `rgba(${lr}, ${lg}, ${lb}, ${a / 100})`,
    );
  }
}

function removeAccentAll(root: HTMLElement) {
  root.style.removeProperty("--color-accent");
  root.style.removeProperty("--color-accent-dark");
  root.style.removeProperty("--color-accent-light");
  for (const a of ACCENT_ALPHAS) {
    root.style.removeProperty(`--color-accent-alpha-${a}`);
  }
  for (const a of ACCENT_LIGHT_ALPHAS) {
    root.style.removeProperty(`--color-accent-light-alpha-${a}`);
  }
}

/** 사이트 설정에서 지정한 테마 색상을 CSS 변수로 주입 */
function applyThemeColors(
  root: HTMLElement,
  theme: Theme,
  colors: typeof DEFAULTS,
) {
  // accent — 기본값과 다를 때만 오버라이드 (alpha, dark, light 전부)
  if (colors.accentColor && colors.accentColor !== DEFAULTS.accentColor) {
    applyAccentAll(root, colors.accentColor);
  } else {
    removeAccentAll(root);
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

/** 사이트 설정에서 지정한 폰트를 CSS 변수로 주입 */
function applyFontOverrides(
  root: HTMLElement,
  typography: TypographyConfig | undefined,
) {
  if (!typography) return;

  applyFont(root, "--font-instrument", typography.headingFont, HEADING_FONTS, "serif");
  applyFont(root, "--font-space-grotesk", typography.bodyFont, BODY_FONTS, "sans-serif");
  applyFont(root, "--font-mono", typography.monoFont, MONO_FONTS, "monospace");
}

function applyFont(
  root: HTMLElement,
  cssVar: string,
  fontName: string,
  lookup: Record<string, string>,
  fallback: string,
) {
  const mapped = lookup[fontName];
  if (mapped !== undefined) {
    // 프리셋 폰트: 빈 문자열이면 기본값 복원, 아니면 오버라이드
    if (mapped) {
      root.style.setProperty(cssVar, mapped);
    } else {
      root.style.removeProperty(cssVar);
    }
  } else if (fontName) {
    // 커스텀 폰트: Google Fonts에서 동적 로드 후 CSS var 주입
    loadGoogleFont(fontName);
    root.style.setProperty(cssVar, `"${fontName}", ${fallback}`);
  } else {
    root.style.removeProperty(cssVar);
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
