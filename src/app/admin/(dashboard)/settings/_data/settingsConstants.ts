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
 * 기본 제공 테마.
 *
 * 강조색끼리 CIELAB ΔE 20 이상 떨어지게 둔다 — 예전엔 Arctic·Sorbet(7), Forest·Rosewood(9) 처럼
 * 거의 같은 색이 있어서, 각 테마의 성격은 두고 강조색만 색상·명도를 조금씩 옮겼다.
 * 강조색은 선명한 그대로 쓰고, 글자로 쓰일 때 묻히는 문제는 ThemeProvider 가 --text-accent 를
 * 배경 대비 4.5 가 되도록 명도만 옮겨 해결한다 (readableAccent). 검사는 themePresets.test.ts.
 *
 * 순서는 Default 다음부터 강조색 색상환 순서(빨강 → 주황·노랑 → 초록 → 파랑 → 보라·분홍),
 * 색이 거의 없는 Slate 는 맨 뒤. 설정 화면과 디자인 시스템이 이 순서대로 보여 준다.
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "Default",
    theme: { accentColor: "#d40063", lightBg: "#f5f5f0", lightText: "#1a1a1a", darkBg: "#0a0a0a", darkText: "#f5f5f0" },
  },
  // Reds
  {
    name: "Ruby",
    theme: { accentColor: "#9d0208", lightBg: "#fbeaea", lightText: "#3b0a0a", darkBg: "#150404", darkText: "#f4c7c7" },
  },
  {
    name: "Meadow",
    theme: { accentColor: "#bc4749", lightBg: "#f2e8cf", lightText: "#2a4e30", darkBg: "#141f12", darkText: "#a7c957" },
  },
  {
    name: "Coral",
    theme: { accentColor: "#fe5f55", lightBg: "#eef5db", lightText: "#3d2a1a", darkBg: "#1a130c", darkText: "#c7efcf" },
  },
  // Oranges · Yellows
  {
    name: "Azure",
    theme: { accentColor: "#fd6b1d", lightBg: "#efefd0", lightText: "#004e89", darkBg: "#0a1a2e", darkText: "#f7c59f" },
  },
  {
    name: "Sand",
    theme: { accentColor: "#e0af9c", lightBg: "#efebce", lightText: "#3e3c28", darkBg: "#18170e", darkText: "#d6ce93" },
  },
  {
    name: "Harvest",
    theme: { accentColor: "#ce965c", lightBg: "#fefae0", lightText: "#283618", darkBg: "#1a1e0e", darkText: "#fefae0" },
  },
  {
    name: "Honey",
    theme: { accentColor: "#fbc45d", lightBg: "#f7ede2", lightText: "#3d2e1e", darkBg: "#1c130e", darkText: "#f5cac3" },
  },
  // Greens
  {
    name: "Forest",
    theme: { accentColor: "#4d753d", lightBg: "#dad7cd", lightText: "#2a4035", darkBg: "#1a2e1f", darkText: "#b0be97" },
  },
  {
    name: "Rosewood",
    theme: { accentColor: "#57806d", lightBg: "#f8c7cc", lightText: "#0e0f19", darkBg: "#0e0f19", darkText: "#81a684" },
  },
  {
    name: "Dusk",
    theme: { accentColor: "#6abaa3", lightBg: "#ffe5d4", lightText: "#3d2b33", darkBg: "#101c16", darkText: "#efc7c2" },
  },
  // Blues
  {
    name: "Arctic",
    theme: { accentColor: "#5aa7c3", lightBg: "#cae9ff", lightText: "#1b4965", darkBg: "#0c1e2e", darkText: "#bee9e8" },
  },
  {
    name: "Baltic",
    theme: { accentColor: "#1c5d99", lightBg: "#ffffff", lightText: "#222222", darkBg: "#222222", darkText: "#bbcde5" },
  },
  {
    name: "Sorbet",
    theme: { accentColor: "#7aabe9", lightBg: "#fcf5c7", lightText: "#2a4a5e", darkBg: "#0e1e2c", darkText: "#ffc09f" },
  },
  // Purples · Pinks
  {
    name: "Twilight",
    theme: { accentColor: "#6d3fb0", lightBg: "#fbf3df", lightText: "#3a2560", darkBg: "#1b1330", darkText: "#f3d9a4" },
  },
  {
    name: "Tropica",
    theme: { accentColor: "#fa5ca4", lightBg: "#fce4d8", lightText: "#4a1530", darkBg: "#1a0a14", darkText: "#b5f8fe" },
  },
  {
    name: "Petal",
    theme: { accentColor: "#f8768d", lightBg: "#ffe5ec", lightText: "#5c1a30", darkBg: "#1a0810", darkText: "#ffc2d1" },
  },
  // Neutrals
  {
    name: "Slate",
    theme: { accentColor: "#5c677d", lightBg: "#eef0f4", lightText: "#1f2533", darkBg: "#0e1118", darkText: "#cdd3df" },
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
