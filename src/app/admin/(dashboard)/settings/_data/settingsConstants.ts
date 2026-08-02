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
  general: ["personal", "contact", "metadata", "bgm"],
  content: ["brand", "hero", "home3d", "homeIntro", "services", "marquee", "cta", "loading", "footer", "posts", "works", "profile", "about", "socialLinks"],
  appearance: ["theme", "typography", "datePickerStyle", "brand"],
  services: ["emailService", "aiCover", "aiSummary", "recaptcha", "translation", "commentEmailNotify", "comments", "media"],
};

export type TabId = (typeof TAB_IDS)[number];

export interface ThemePreset {
  name: string;
  theme: Omit<SiteConfigData["theme"], "presets">;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "Default",
    theme: { accentColor: "#d40063", lightBg: "#f5f5f0", lightText: "#1a1a1a", darkBg: "#0a0a0a", darkText: "#f5f5f0" },
  },
  // Reds
  {
    name: "Meadow",
    theme: { accentColor: "#bc4749", lightBg: "#f2e8cf", lightText: "#2a4e30", darkBg: "#141f12", darkText: "#a7c957" },
  },
  {
    name: "Coral",
    theme: { accentColor: "#fe5f55", lightBg: "#eef5db", lightText: "#3d2a1a", darkBg: "#1a130c", darkText: "#c7efcf" },
  },
  // Oranges
  {
    name: "Azure",
    theme: { accentColor: "#ff6b35", lightBg: "#efefd0", lightText: "#004e89", darkBg: "#0a1a2e", darkText: "#f7c59f" },
  },
  {
    name: "Sand",
    theme: { accentColor: "#d8a48f", lightBg: "#efebce", lightText: "#3e3c28", darkBg: "#18170e", darkText: "#d6ce93" },
  },
  {
    name: "Harvest",
    theme: { accentColor: "#dda15e", lightBg: "#fefae0", lightText: "#283618", darkBg: "#1a1e0e", darkText: "#fefae0" },
  },
  {
    name: "Honey",
    theme: { accentColor: "#f6bd60", lightBg: "#f7ede2", lightText: "#3d2e1e", darkBg: "#1c130e", darkText: "#f5cac3" },
  },
  // Greens
  {
    name: "Forest",
    theme: { accentColor: "#588157", lightBg: "#dad7cd", lightText: "#2a4035", darkBg: "#1a2e1f", darkText: "#b0be97" },
  },
  {
    name: "Rosewood",
    theme: { accentColor: "#57886c", lightBg: "#f8c7cc", lightText: "#0e0f19", darkBg: "#0e0f19", darkText: "#81a684" },
  },
  {
    name: "Dusk",
    theme: { accentColor: "#68a691", lightBg: "#ffe5d4", lightText: "#3d2b33", darkBg: "#101c16", darkText: "#efc7c2" },
  },
  // Blues
  {
    name: "Arctic",
    theme: { accentColor: "#5fa8d3", lightBg: "#cae9ff", lightText: "#1b4965", darkBg: "#0c1e2e", darkText: "#bee9e8" },
  },
  {
    name: "Baltic",
    theme: { accentColor: "#1c5d99", lightBg: "#ffffff", lightText: "#222222", darkBg: "#222222", darkText: "#bbcde5" },
  },
  {
    name: "Sorbet",
    theme: { accentColor: "#79addc", lightBg: "#fcf5c7", lightText: "#2a4a5e", darkBg: "#0e1e2c", darkText: "#ffc09f" },
  },
  // Pinks
  {
    name: "Tropica",
    theme: { accentColor: "#f75590", lightBg: "#fce4d8", lightText: "#4a1530", darkBg: "#1a0a14", darkText: "#b5f8fe" },
  },
  {
    name: "Petal",
    theme: { accentColor: "#fb6f92", lightBg: "#ffe5ec", lightText: "#5c1a30", darkBg: "#1a0810", darkText: "#ffc2d1" },
  },
];

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
/** dot-notation path 로 nested 값 읽기 ("personal.name", "contact.email") */
export function getByPath(obj: any, path: string): unknown {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/** dot-notation path 로 nested 값 설정 (immutable copy 반환) */
export function setByPath<T>(obj: T, path: string, value: unknown): T {
  const parts = path.split(".");
  const next: any = Array.isArray(obj) ? [...(obj as any[])] : { ...(obj as any) };
  let cur = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    cur[k] = cur[k] != null && typeof cur[k] === "object" ? (Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] }) : {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
  return next as T;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
    if (!(key in (defaults ?? {}))) continue; // skip orphaned keys removed from siteConfig
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
 * DB에서 불러온 delta에서 현재 siteConfig에 없는 키를 제거
 */
export function filterOrphanedKeys(delta: any, defaults: any): any {
  if (!delta || typeof delta !== "object" || Array.isArray(delta)) return delta;
  const filtered: any = {};
  for (const key of Object.keys(delta)) {
    if (!(key in (defaults ?? {}))) continue;
    const val = delta[key];
    const def = defaults[key];
    if (val !== null && typeof val === "object" && !Array.isArray(val) &&
        def !== null && typeof def === "object" && !Array.isArray(def)) {
      filtered[key] = filterOrphanedKeys(val, def);
    } else {
      filtered[key] = val;
    }
  }
  return filtered;
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

/** content 탭 서브탭 순서 — 사이드 nav / 모바일 nav / URL 동기화에서 공용 */
export const CONTENT_SUBTABS = ["home", "profile", "about", "works", "posts", "calendars"] as const;
export type ContentSubTab = (typeof CONTENT_SUBTABS)[number];

/** content 탭 내 siteConfig 키 → sub-tab 매핑 */
const CONTENT_SUBTAB_KEYS: Record<ContentSubTab, (keyof SiteConfigData)[]> = {
  home: ["brand", "hero", "home3d", "homeIntro", "services", "marquee", "cta", "loading", "footer", "socialLinks"],
  profile: ["profile"],
  about: ["about"],
  works: ["works"],
  posts: ["posts"],
  calendars: [],
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
