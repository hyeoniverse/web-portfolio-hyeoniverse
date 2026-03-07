import type { SiteConfigData } from "@/config/site.config";

/** 키 순서 무관 deep 비교 (JSON.stringify는 키 순서에 의존하므로 대체) */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object") {
    const ka = Object.keys(a as Record<string, unknown>);
    const kb = Object.keys(b as Record<string, unknown>);
    if (ka.length !== kb.length) return false;
    return ka.every((k) =>
      deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    );
  }
  return false;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export const TAB_IDS = ["general", "content", "appearance", "services", "account"] as const;

export const TAB_CONFIG_KEYS: Record<string, (keyof SiteConfigData)[]> = {
  general: ["personal", "brand", "contact", "metadata", "footer", "bgm"],
  content: ["brand", "hero", "homeAbout", "services", "marquee", "cta", "loading", "posts", "works", "profile", "about", "social", "socialLinks"],
  appearance: ["theme", "typography", "datePickerStyle"],
  services: ["emailService", "aiCover", "recaptcha", "translation", "commentEmailNotify"],
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

/**
 * siteConfig conflict path → 해당 탭 매핑
 */
export function getTabForConfigPath(path: string): TabId {
  const topKey = path.split(".")[0] as keyof SiteConfigData;
  for (const [tab, keys] of Object.entries(TAB_CONFIG_KEYS)) {
    if (keys.includes(topKey)) return tab as TabId;
  }
  return "general";
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

/**
 * siteConfig 기본값과 현재 config를 비교하여 변경된 키만 추출 (delta)
 */
export function computeDelta(current: any, defaults: any): any {
  const delta: any = {};
  for (const key of Object.keys(current)) {
    const cur = current[key];
    const def = defaults[key];
    if (
      cur !== null &&
      typeof cur === "object" &&
      !Array.isArray(cur) &&
      def !== null &&
      typeof def === "object" &&
      !Array.isArray(def)
    ) {
      const sub = computeDelta(cur, def);
      if (Object.keys(sub).length > 0) delta[key] = sub;
    } else if (!deepEqual(cur, def)) {
      delta[key] = cur;
    }
  }
  return delta;
}

/**
 * delta 키에 대해 siteConfig 기본값의 스냅샷 추출
 */
export function extractDefaults(delta: any, defaults: any): any {
  const snapshot: any = {};
  for (const key of Object.keys(delta)) {
    const d = delta[key];
    const def = defaults[key];
    if (
      d !== null &&
      typeof d === "object" &&
      !Array.isArray(d) &&
      def !== null &&
      typeof def === "object" &&
      !Array.isArray(def)
    ) {
      snapshot[key] = extractDefaults(d, def);
    } else {
      snapshot[key] = def;
    }
  }
  return snapshot;
}

export type ContentSubTab = "home" | "profile" | "works" | "posts";

/** content 탭 내 siteConfig 키 → sub-tab 매핑 */
export const CONTENT_SUBTAB_KEYS: Record<ContentSubTab, (keyof SiteConfigData)[]> = {
  home: ["brand", "hero", "homeAbout", "services", "marquee", "cta", "loading", "social", "socialLinks"],
  profile: ["profile", "about"],
  works: ["works"],
  posts: ["posts"],
};

/** siteConfig 키 → content sub-tab */
export function getContentSubTabForKey(topKey: string): ContentSubTab {
  for (const [sub, keys] of Object.entries(CONTENT_SUBTAB_KEYS)) {
    if ((keys as string[]).includes(topKey)) return sub as ContentSubTab;
  }
  return "home";
}

export interface ConfigConflict {
  path: string;
  dbValue: any;
  codeDefault: any;
  oldDefault: any;
  source?: "siteConfig" | "profile";
  tab?: string;
  subTab?: string;
}

/**
 * 충돌 감지: delta에 있는 키 중 siteConfig 기본값이 저장 이후 변경된 것을 찾음
 */
export function detectConflicts(
  delta: any,
  savedDefaults: any,
  currentDefaults: any,
  prefix = ""
): ConfigConflict[] {
  const conflicts: ConfigConflict[] = [];
  if (!savedDefaults) return conflicts;

  for (const key of Object.keys(delta)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const d = delta[key];
    const saved = savedDefaults[key];
    const current = currentDefaults?.[key];

    if (
      d !== null &&
      typeof d === "object" &&
      !Array.isArray(d) &&
      saved !== null &&
      typeof saved === "object" &&
      !Array.isArray(saved)
    ) {
      conflicts.push(...detectConflicts(d, saved, current, path));
    } else if (
      saved !== undefined &&
      !deepEqual(saved, current)
    ) {
      conflicts.push({ path, dbValue: d, codeDefault: current, oldDefault: saved });
    }
  }
  return conflicts;
}

/**
 * DB config가 새 delta 형식인지 확인
 */
export function isDeltaFormat(config: any): config is { delta: any; savedDefaults: any } {
  return config && typeof config.delta === "object" && config.delta !== null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
