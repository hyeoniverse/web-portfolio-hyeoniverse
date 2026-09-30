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
 * 기본 제공 테마 — 색상환을 한 바퀴 돌며 강조색이 서로 겹치지 않게 골랐다 (강조색끼리 CIELAB ΔE 25 이상).
 *
 * 모든 프리셋이 지키는 대비 (themePresets.test.ts 가 검사한다):
 * - 기본 텍스트: 배경 대비 10 이상 (라이트·다크)
 * - 강조색: 라이트 배경 대비 4.5 이상, 강조색 위 흰 글자 4.5 이상
 *   다크에서는 ThemeProvider 가 배경 대비 4.5 가 될 때까지 밝혀 쓴다 (readableAccent)
 * - 강조색과 기본 텍스트가 한눈에 구분될 것 (ΔE 30 이상) — 링크가 본문처럼 보이지 않게
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "Default",
    theme: { accentColor: "#d40063", lightBg: "#f5f5f0", lightText: "#1a1a1a", darkBg: "#0a0a0a", darkText: "#f5f5f0" },
  },
  // Warm — 주황·갈색·노랑
  {
    name: "Coral",
    theme: { accentColor: "#c2410c", lightBg: "#fbf1e6", lightText: "#2e1a10", darkBg: "#1a110b", darkText: "#f6e1cf" },
  },
  {
    name: "Cocoa",
    theme: { accentColor: "#8f3b2e", lightBg: "#f3e9e4", lightText: "#2b1d15", darkBg: "#18110d", darkText: "#eadbcd" },
  },
  {
    name: "Honey",
    theme: { accentColor: "#8a6200", lightBg: "#fbf6dc", lightText: "#2e2310", darkBg: "#1a150a", darkText: "#f5e6c4" },
  },
  // Green — 올리브·숲·청록
  {
    name: "Harvest",
    theme: { accentColor: "#5d6b00", lightBg: "#f1f2dc", lightText: "#262a12", darkBg: "#14160b", darkText: "#e6e8c8" },
  },
  {
    name: "Forest",
    theme: { accentColor: "#2a7340", lightBg: "#e9efe6", lightText: "#15261a", darkBg: "#0d1610", darkText: "#d6e6d6" },
  },
  {
    name: "Dusk",
    theme: { accentColor: "#0f766e", lightBg: "#fdeee4", lightText: "#2d2226", darkBg: "#0f1716", darkText: "#f1dcd6" },
  },
  // Blue — 하늘·파랑·남색
  {
    name: "Arctic",
    theme: { accentColor: "#0369a1", lightBg: "#e8f4fb", lightText: "#0f2e40", darkBg: "#0a1822", darkText: "#d4ecf5" },
  },
  {
    name: "Baltic",
    theme: { accentColor: "#2563eb", lightBg: "#ffffff", lightText: "#1f2328", darkBg: "#1b1d21", darkText: "#d8e2f0" },
  },
  {
    name: "Indigo",
    theme: { accentColor: "#312e81", lightBg: "#eeeff9", lightText: "#1c1c3a", darkBg: "#0f0f1f", darkText: "#dcdcf5" },
  },
  // Purple — 보라·자주
  {
    name: "Lavender",
    theme: { accentColor: "#9333ea", lightBg: "#f6effb", lightText: "#25183a", darkBg: "#140f1d", darkText: "#e6dcf5" },
  },
  {
    name: "Orchid",
    theme: { accentColor: "#a21caf", lightBg: "#fbeef8", lightText: "#33122e", darkBg: "#1a0c18", darkText: "#f5dcef" },
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
