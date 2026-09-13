"use client";
import { hexToRgb, lerpRgb, rgbHex } from "@/utils/color";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useSiteConfig } from "./SiteConfigProvider";
import { loadGoogleFont } from "@/lib/loadGoogleFont";
import { LOCAL_FONTS } from "@/config/localFonts.generated";
import type { CustomFont } from "@/lib/customFonts";

type ResolvedTheme = "light" | "dark";

interface ThemeControls {
  toggleTheme: () => void;
  setTheme: (theme: ResolvedTheme) => void;
}

/* context 값에는 테마를 넣지 않는다(#929). 저장값·시스템 설정은 마운트 뒤에야 알 수 있는데, 그때 context 값이 바뀌면 아직
   하이드레이션 전인 페이지 경계(상세의 loading.tsx)를 React 가 서버 HTML 과 맞춰 볼 수 없어 새로 그린다. 테마는 구독으로
   받는다 — useSyncExternalStore 는 늦게 하이드레이션되는 경계에서도 서버 값(dark)으로 맞춘 뒤 바꾼다 */
interface ThemeContextType extends ThemeControls {
  subscribe: (onChange: () => void) => () => void;
  getTheme: () => ResolvedTheme;
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
  customFonts?: CustomFont[];
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
  // 테마 저장소 — 서버와 첫 렌더는 dark 로 그린다
  const themeRef = useRef<ResolvedTheme>("dark");
  const listenersRef = useRef(new Set<() => void>());
  const subscribe = useCallback((onChange: () => void) => {
    const listeners = listenersRef.current;
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
  }, []);
  const getTheme = useCallback(() => themeRef.current, []);
  const setTheme = useCallback((next: ResolvedTheme) => {
    if (themeRef.current === next) return;
    themeRef.current = next;
    listenersRef.current.forEach((notify) => notify());
  }, []);
  const toggleTheme = useCallback(() => {
    setTheme(themeRef.current === "dark" ? "light" : "dark");
  }, [setTheme]);
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  const isFirstThemeRef = useRef(true);

  // localStorage 또는 시스템 설정에서 테마 초기화. 화면 테마(data-theme)는 여기서 바로 칠하고, 색·글꼴 덮어쓰기는 아래 효과가
  // 이어서 한다. 아래 효과보다 먼저 선언해 같은 커밋에서 먼저 돈다
  useEffect(() => {
    const stored = localStorage.getItem("theme") as ResolvedTheme | null;
    const initial: ResolvedTheme = stored
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", initial);
    setTheme(initial);
  }, [setTheme]);

  // 문서에 테마 적용
  useEffect(() => {
    // 렌더된 테마가 저장소와 다르면 곧 다시 그려진다. 첫 커밋에서 기본값(dark)으로 저장값을 덮지 않게 그때 쓴다
    if (theme !== themeRef.current) return;

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
  }, [theme, siteConfig.theme, siteConfig.typography]);

  // 한 번 만든 값을 끝까지 쓴다 — 테마가 바뀌어도 context 값은 그대로다
  const value = useMemo(() => ({ toggleTheme, setTheme, subscribe, getTheme }), [toggleTheme, setTheme, subscribe, getTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
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

/** neutral scale 동적 생성: bg(neutral-50)와 text(neutral-900) 사이를 보간 */
const NEUTRAL_STOPS = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 999] as const;
const MID_BLENDS: [number, number][] = [
  [100, 0.05], [200, 0.12], [300, 0.22], [400, 0.33],
  [500, 0.46], [600, 0.65], [700, 0.80], [800, 0.92],
];
const NEUTRAL_ALPHA_STEPS = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];



function applyNeutralScale(root: HTMLElement, bgHex: string, textHex: string) {
  const bg = hexToRgb(bgHex);
  const text = hexToRgb(textHex);
  if (!bg || !text) return;
  const black: [number, number, number] = [0, 0, 0];

  root.style.setProperty("--color-neutral-0", "#ffffff");
  root.style.setProperty("--color-neutral-50", bgHex);

  for (const [n, t] of MID_BLENDS) {
    root.style.setProperty(`--color-neutral-${n}`, rgbHex(lerpRgb(bg, text, t)));
  }

  root.style.setProperty("--color-neutral-900", textHex);
  root.style.setProperty("--color-neutral-950", rgbHex(lerpRgb(text, black, 0.3)));
  root.style.setProperty("--color-neutral-999", "#000000");

  // neutral-alpha: text 컬러 기반
  for (const a of NEUTRAL_ALPHA_STEPS) {
    root.style.setProperty(
      `--color-neutral-alpha-${a}`,
      `rgba(${text[0]}, ${text[1]}, ${text[2]}, ${a / 100})`,
    );
  }
  // inverse-alpha: bg 컬러 기반
  for (const a of NEUTRAL_ALPHA_STEPS) {
    root.style.setProperty(
      `--color-inverse-alpha-${a}`,
      `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, ${a / 100})`,
    );
  }
}

function removeNeutralScale(root: HTMLElement) {
  for (const n of NEUTRAL_STOPS) {
    root.style.removeProperty(`--color-neutral-${n}`);
  }
  for (const a of NEUTRAL_ALPHA_STEPS) {
    root.style.removeProperty(`--color-neutral-alpha-${a}`);
    root.style.removeProperty(`--color-inverse-alpha-${a}`);
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
  theme: ResolvedTheme,
  colors: typeof DEFAULTS,
) {
  // accent — 기본값과 다를 때만 오버라이드 (alpha, dark, light 전부)
  if (colors.accentColor && colors.accentColor !== DEFAULTS.accentColor) {
    applyAccentAll(root, colors.accentColor);
  } else {
    removeAccentAll(root);
  }

  // 배경/텍스트 + neutral scale — 테마별 분기
  if (theme === "light") {
    setOrRemove(root, "--bg-primary", colors.lightBg, DEFAULTS.lightBg);
    setOrRemove(root, "--text-primary", colors.lightText, DEFAULTS.lightText);
    if (colors.lightBg !== DEFAULTS.lightBg || colors.lightText !== DEFAULTS.lightText) {
      applyNeutralScale(root, colors.lightBg, colors.lightText);
    } else {
      removeNeutralScale(root);
    }
  } else {
    setOrRemove(root, "--bg-primary", colors.darkBg, DEFAULTS.darkBg);
    setOrRemove(root, "--text-primary", colors.darkText, DEFAULTS.darkText);
    if (colors.darkBg !== DEFAULTS.darkBg || colors.darkText !== DEFAULTS.darkText) {
      applyNeutralScale(root, colors.darkBg, colors.darkText);
    } else {
      removeNeutralScale(root);
    }
  }
}

/** 사이트 설정에서 지정한 폰트를 CSS 변수로 주입 */
function applyFontOverrides(
  root: HTMLElement,
  typography: TypographyConfig | undefined,
) {
  if (!typography) return;

  // 업로드/로컬 커스텀 폰트 이름 — 이건 Google 이 아니라 @font-face(CustomFontsLoader)로 주입되므로
  // loadGoogleFont(404 유발) 를 건너뛴다.
  const customSet = new Set<string>([
    ...LOCAL_FONTS.map((f) => f.name),
    ...(typography.customFonts ?? []).map((f) => f.name),
  ]);

  applyFont(root, "--font-instrument", typography.headingFont, HEADING_FONTS, "serif", customSet);
  applyFont(root, "--font-space-grotesk", typography.bodyFont, BODY_FONTS, "sans-serif", customSet);
  applyFont(root, "--font-mono", typography.monoFont, MONO_FONTS, "monospace", customSet);
}

function applyFont(
  root: HTMLElement,
  cssVar: string,
  fontName: string,
  lookup: Record<string, string>,
  fallback: string,
  customSet: Set<string>,
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
    // 커스텀 폰트: 업로드/로컬(@font-face)이면 그대로, 그 외엔 Google Fonts 동적 로드
    if (!customSet.has(fontName)) loadGoogleFont(fontName);
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

const getServerTheme = (): ResolvedTheme => "dark";

export function useTheme(): ThemeControls & { theme: ResolvedTheme } {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  const { subscribe, getTheme, ...controls } = context;
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  return { theme, ...controls };
}
