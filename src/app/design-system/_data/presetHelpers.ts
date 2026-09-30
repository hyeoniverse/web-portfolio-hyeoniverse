import { THEME_PRESETS } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";
import { applyAccentAll, applyNeutralScale, applyTextAccent, themeVarKeys } from "@/lib/themeColors";

export function snapshotVars(root: HTMLElement): Map<string, string> {
  const map = new Map<string, string>();
  for (const key of themeVarKeys()) {
    map.set(key, root.style.getPropertyValue(key));
  }
  return map;
}

export function restoreVars(root: HTMLElement, snap: Map<string, string>) {
  for (const [key, val] of snap) {
    if (val) root.style.setProperty(key, val);
    else root.style.removeProperty(key);
  }
}

/** 프리셋 미리보기 — 사이트(ThemeProvider)와 같은 규칙으로 주입한다 */
export function applyPresetColors(
  root: HTMLElement,
  currentTheme: "light" | "dark",
  preset: (typeof THEME_PRESETS)[0]["theme"],
) {
  const dark = currentTheme === "dark";
  const bgHex = dark ? preset.darkBg : preset.lightBg;
  applyAccentAll(root, preset.accentColor);
  applyTextAccent(root, preset.accentColor, bgHex);
  const textHex = dark ? preset.darkText : preset.lightText;
  root.style.setProperty("--bg-primary", bgHex);
  root.style.setProperty("--text-primary", textHex);
  applyNeutralScale(root, bgHex, textHex);
}
