import type { SiteConfigData } from "@/config/site.config";
import { deepEqual } from "@/lib/settingsDelta";

/* delta 저장 형식을 다루는 순수 헬퍼는 `@/lib/settingsDelta` 로 옮겼다 —
   동기화 스크립트(scripts/sync-about.ts)와 API 도 같은 규칙으로 조립해야 해서다.
   설정 화면 쪽 import 경로를 바꾸지 않도록 여기서 그대로 재수출한다. */
export {
  deepEqual,
  getByPath,
  setByPath,
  deepMerge,
  computeDelta,
  filterOrphanedKeys,
  extractDefaults,
  isDeltaFormat,
} from "@/lib/settingsDelta";

export const TAB_IDS = ["general", "content", "appearance", "services", "account"] as const;

export const TAB_CONFIG_KEYS: Record<string, (keyof SiteConfigData)[]> = {
  general: ["personal", "contact", "metadata", "bgm"],
  /* brand 는 외관 탭(BrandSection)으로 옮겨져 content 에서 뺐다 — 양쪽에 두면 충돌 패널이
     콘텐츠>HOME 에 뜨고, 콘텐츠 탭 저장이 브랜드 변경까지 스냅샷해 덮어쓴다 */
  content: ["hero", "home3d", "homeIntro", "services", "marquee", "cta", "loading", "footer", "posts", "works", "profile", "about", "socialLinks"],
  appearance: ["theme", "typography", "datePickerStyle", "brand"],
  services: ["emailService", "aiCover", "aiSummary", "recaptcha", "translation", "tts", "commentEmailNotify", "comments", "media"],
};

export type TabId = (typeof TAB_IDS)[number];

export interface ThemePreset {
  name: string;
  theme: Omit<SiteConfigData["theme"], "presets">;
}

/**
 * 기본 제공 테마 — 강조색이 서로 겹치지 않게 색상환을 고르게 나눴다 (강조색끼리 CIELAB ΔE 20 이상).
 *
 * 강조색은 선명한 그대로 둔다. 파스텔 강조색이 배경 위 글자로 쓰일 때 묻히는 문제는 프리셋 값이 아니라
 * ThemeProvider 가 --text-accent 를 배경 대비 4.5 가 되도록 명도만 옮겨 해결한다 (readableAccent).
 * 기본 텍스트는 라이트·다크 모두 배경 대비 7 이상 (themePresets.test.ts 가 검사).
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "Default",
    theme: { accentColor: "#d40063", lightBg: "#f5f5f0", lightText: "#1a1a1a", darkBg: "#0a0a0a", darkText: "#f5f5f0" },
  },
  // Warm — 빨강·주황·모래·노랑
  {
    name: "Meadow",
    theme: { accentColor: "#bc4749", lightBg: "#f2e8cf", lightText: "#2a4e30", darkBg: "#141f12", darkText: "#a7c957" },
  },
  {
    name: "Azure",
    theme: { accentColor: "#ff6b35", lightBg: "#efefd0", lightText: "#004e89", darkBg: "#0a1a2e", darkText: "#f7c59f" },
  },
  {
    name: "Sand",
    theme: { accentColor: "#d8a48f", lightBg: "#efebce", lightText: "#3e3c28", darkBg: "#18170e", darkText: "#d6ce93" },
  },
  {
    name: "Honey",
    theme: { accentColor: "#f6bd60", lightBg: "#f7ede2", lightText: "#3d2e1e", darkBg: "#1c130e", darkText: "#f5cac3" },
  },
  // Green — 연두·숲·청록
  {
    name: "Lime",
    theme: { accentColor: "#7cb518", lightBg: "#f4f7e6", lightText: "#243010", darkBg: "#11160a", darkText: "#dff0b8" },
  },
  {
    name: "Forest",
    theme: { accentColor: "#588157", lightBg: "#dad7cd", lightText: "#2a4035", darkBg: "#1a2e1f", darkText: "#b0be97" },
  },
  {
    name: "Dusk",
    theme: { accentColor: "#2a9d8f", lightBg: "#ffe5d4", lightText: "#3d2b33", darkBg: "#101c16", darkText: "#efc7c2" },
  },
  // Blue — 하늘·파랑·남색
  {
    name: "Arctic",
    theme: { accentColor: "#5fa8d3", lightBg: "#cae9ff", lightText: "#1b4965", darkBg: "#0c1e2e", darkText: "#bee9e8" },
  },
  {
    name: "Baltic",
    theme: { accentColor: "#1c5d99", lightBg: "#ffffff", lightText: "#222222", darkBg: "#222222", darkText: "#bbcde5" },
  },
  {
    name: "Indigo",
    theme: { accentColor: "#4f5de6", lightBg: "#eceefe", lightText: "#1e1f4a", darkBg: "#0e0f24", darkText: "#c9cbff" },
  },
  // Purple · Pink — 보라·자주·분홍
  {
    name: "Lavender",
    theme: { accentColor: "#a06cd5", lightBg: "#f3ecfb", lightText: "#2e1f45", darkBg: "#150f1f", darkText: "#e2cff7" },
  },
  {
    name: "Orchid",
    theme: { accentColor: "#d946ef", lightBg: "#fdeefe", lightText: "#3d1240", darkBg: "#1a0a1c", darkText: "#f7c6fb" },
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

export const CONTENT_SUBTABS = ["home", "profile", "about", "works", "posts", "calendars"] as const;
export type ContentSubTab = (typeof CONTENT_SUBTABS)[number];

/** content 탭 내 siteConfig 키 → sub-tab 매핑 */
const CONTENT_SUBTAB_KEYS: Record<ContentSubTab, (keyof SiteConfigData)[]> = {
  home: ["hero", "home3d", "homeIntro", "services", "marquee", "cta", "loading", "footer", "socialLinks"],
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

/* eslint-disable @typescript-eslint/no-explicit-any */
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

/* eslint-enable @typescript-eslint/no-explicit-any */
