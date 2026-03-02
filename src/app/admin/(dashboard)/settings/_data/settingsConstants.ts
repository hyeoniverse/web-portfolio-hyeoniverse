import type { SiteConfigData } from "@/config/site.config";

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export const TAB_IDS = ["general", "content", "appearance", "services", "account"] as const;

export const TAB_CONFIG_KEYS: Record<string, (keyof SiteConfigData)[]> = {
  general: ["personal", "brand", "contact", "social", "metadata"],
  content: ["hero", "homeAbout", "services", "marquee", "cta", "footer", "loading", "posts", "works", "profile", "about"],
  appearance: ["theme", "typography"],
  services: ["emailService", "aiCover", "recaptcha", "translation"],
};

export type TabId = (typeof TAB_IDS)[number];

export const THEME_PRESETS: { name: string; theme: SiteConfigData["theme"] }[] = [
  {
    name: "Default",
    theme: { accentColor: "#d40063", lightBg: "#f5f5f0", lightText: "#1a1a1a", darkBg: "#0a0a0a", darkText: "#f5f5f0" },
  },
  {
    name: "Baltic",
    theme: { accentColor: "#1c5d99", lightBg: "#ffffff", lightText: "#222222", darkBg: "#222222", darkText: "#bbcde5" },
  },
  {
    name: "Harvest",
    theme: { accentColor: "#dda15e", lightBg: "#fefae0", lightText: "#283618", darkBg: "#1a1e0e", darkText: "#fefae0" },
  },
  {
    name: "Sorbet",
    theme: { accentColor: "#79addc", lightBg: "#fcf5c7", lightText: "#2a4a5e", darkBg: "#0e1e2c", darkText: "#ffc09f" },
  },
  {
    name: "Coral",
    theme: { accentColor: "#fe5f55", lightBg: "#eef5db", lightText: "#3d2a1a", darkBg: "#1a130c", darkText: "#c7efcf" },
  },
  {
    name: "Honey",
    theme: { accentColor: "#f6bd60", lightBg: "#f7ede2", lightText: "#3d2e1e", darkBg: "#1c130e", darkText: "#f5cac3" },
  },
  {
    name: "Petal",
    theme: { accentColor: "#fb6f92", lightBg: "#ffe5ec", lightText: "#5c1a30", darkBg: "#1a0810", darkText: "#ffc2d1" },
  },
  {
    name: "Azure",
    theme: { accentColor: "#ff6b35", lightBg: "#efefd0", lightText: "#004e89", darkBg: "#0a1a2e", darkText: "#f7c59f" },
  },
  {
    name: "Blush",
    theme: { accentColor: "#f4acb7", lightBg: "#ffe5d9", lightText: "#5a3340", darkBg: "#1a0e14", darkText: "#d8e2dc" },
  },
  {
    name: "Dusk",
    theme: { accentColor: "#68a691", lightBg: "#ffe5d4", lightText: "#3d2b33", darkBg: "#101c16", darkText: "#efc7c2" },
  },
  {
    name: "Tropica",
    theme: { accentColor: "#f75590", lightBg: "#fce4d8", lightText: "#4a1530", darkBg: "#1a0a14", darkText: "#b5f8fe" },
  },
  {
    name: "Sand",
    theme: { accentColor: "#d8a48f", lightBg: "#efebce", lightText: "#3e3c28", darkBg: "#18170e", darkText: "#d6ce93" },
  },
  {
    name: "Meadow",
    theme: { accentColor: "#bc4749", lightBg: "#f2e8cf", lightText: "#2a4e30", darkBg: "#141f12", darkText: "#a7c957" },
  },
  {
    name: "Arctic",
    theme: { accentColor: "#5fa8d3", lightBg: "#cae9ff", lightText: "#1b4965", darkBg: "#0c1e2e", darkText: "#bee9e8" },
  },
  {
    name: "Forest",
    theme: { accentColor: "#588157", lightBg: "#dad7cd", lightText: "#2a4035", darkBg: "#1a2e1f", darkText: "#b0be97" },
  },
  {
    name: "Rosewood",
    theme: { accentColor: "#57886c", lightBg: "#f8c7cc", lightText: "#0e0f19", darkBg: "#0e0f19", darkText: "#81a684" },
  },
];

/** font display name -> CSS variable for preview rendering */
export const FONT_CSS_VARS: Record<string, string> = {
  "Instrument Serif": "var(--font-instrument)",
  "Noto Serif KR": "var(--font-noto-serif-kr)",
  "Nanum Myeongjo": "var(--font-nanum-myeongjo)",
  "Gowun Batang": "var(--font-gowun-batang)",
  "Hahmlet": "var(--font-hahmlet)",
  "Space Grotesk": "var(--font-space-grotesk)",
  "Noto Sans KR": "var(--font-noto-sans-kr)",
  "Gothic A1": "var(--font-gothic-a1)",
  "IBM Plex Sans KR": "var(--font-ibm-plex-sans-kr)",
  "Gowun Dodum": "var(--font-gowun-dodum)",
  "Nanum Gothic": "var(--font-nanum-gothic)",
  "JetBrains Mono": "var(--font-jetbrains)",
  "Fira Code": "var(--font-fira-code)",
  "Source Code Pro": "var(--font-source-code-pro)",
  "IBM Plex Mono": "var(--font-ibm-plex-mono)",
  "Roboto Mono": "var(--font-roboto-mono)",
  "Inconsolata": "var(--font-inconsolata)",
  "Nanum Gothic Coding": "var(--font-nanum-gothic-coding)",
  "Playfair Display": "var(--font-playfair)",
  "Cormorant Garamond": "var(--font-cormorant)",
  "Lora": "var(--font-lora)",
  "EB Garamond": "var(--font-eb-garamond)",
  "Merriweather": "var(--font-merriweather)",
  "Inter": "var(--font-inter)",
  "DM Sans": "var(--font-dm-sans)",
  "Poppins": "var(--font-poppins)",
  "Nunito": "var(--font-nunito)",
  "Ubuntu Mono": "var(--font-ubuntu-mono)",
  "DM Mono": "var(--font-dm-mono)",
  "Courier Prime": "var(--font-courier-prime)",
};

/** preset -> CSS var, custom -> font name as-is */
export function getFontFamily(name: string) {
  return FONT_CSS_VARS[name] ?? `"${name}", sans-serif`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: DeepPartial<T>
): T {
  const result = { ...target } as any;
  for (const key of Object.keys(source)) {
    const val = (source as any)[key];
    if (val === undefined || val === null) continue;
    if (
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
