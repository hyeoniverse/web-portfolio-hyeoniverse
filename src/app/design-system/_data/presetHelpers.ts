import { THEME_PRESETS } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";

const ACCENT_ALPHAS = [1, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];
const ACCENT_LIGHT_ALPHAS = [40, 60, 70, 90];
const NEUTRAL_STOPS = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 999];
const MID_BLENDS: [number, number][] = [
  [100, 0.05], [200, 0.12], [300, 0.22], [400, 0.33],
  [500, 0.46], [600, 0.65], [700, 0.80], [800, 0.92],
];
const NEUTRAL_ALPHA_STEPS = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

function rgbHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("")}`;
}

function getAllVarKeys(): string[] {
  const keys = ["--color-accent", "--color-accent-dark", "--color-accent-light", "--bg-primary", "--text-primary"];
  for (const a of ACCENT_ALPHAS) keys.push(`--color-accent-alpha-${a}`);
  for (const a of ACCENT_LIGHT_ALPHAS) keys.push(`--color-accent-light-alpha-${a}`);
  for (const n of NEUTRAL_STOPS) keys.push(`--color-neutral-${n}`);
  for (const a of NEUTRAL_ALPHA_STEPS) {
    keys.push(`--color-neutral-alpha-${a}`);
    keys.push(`--color-inverse-alpha-${a}`);
  }
  return keys;
}

export function snapshotVars(root: HTMLElement): Map<string, string> {
  const map = new Map<string, string>();
  for (const key of getAllVarKeys()) {
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

export function applyPresetColors(
  root: HTMLElement,
  currentTheme: "light" | "dark",
  preset: (typeof THEME_PRESETS)[0]["theme"],
) {
  const rgb = hexToRgb(preset.accentColor);
  if (!rgb) return;
  const [r, g, b] = rgb;
  root.style.setProperty("--color-accent", preset.accentColor);
  for (const a of ACCENT_ALPHAS) {
    root.style.setProperty(`--color-accent-alpha-${a}`, `rgba(${r}, ${g}, ${b}, ${a / 100})`);
  }
  root.style.setProperty("--color-accent-dark", `rgb(${Math.round(r * 0.78)}, ${Math.round(g * 0.78)}, ${Math.round(b * 0.78)})`);
  const lr = Math.min(255, Math.round(r + (255 - r) * 0.4));
  const lg = Math.min(255, Math.round(g + (255 - g) * 0.4));
  const lb = Math.min(255, Math.round(b + (255 - b) * 0.4));
  root.style.setProperty("--color-accent-light", `rgb(${lr}, ${lg}, ${lb})`);
  for (const a of ACCENT_LIGHT_ALPHAS) {
    root.style.setProperty(`--color-accent-light-alpha-${a}`, `rgba(${lr}, ${lg}, ${lb}, ${a / 100})`);
  }

  const bgHex = currentTheme === "light" ? preset.lightBg : preset.darkBg;
  const textHex = currentTheme === "light" ? preset.lightText : preset.darkText;
  root.style.setProperty("--bg-primary", bgHex);
  root.style.setProperty("--text-primary", textHex);

  const bgRgb = hexToRgb(bgHex);
  const textRgb = hexToRgb(textHex);
  if (!bgRgb || !textRgb) return;
  const black: [number, number, number] = [0, 0, 0];

  root.style.setProperty("--color-neutral-0", "#ffffff");
  root.style.setProperty("--color-neutral-50", bgHex);
  for (const [n, t] of MID_BLENDS) {
    root.style.setProperty(`--color-neutral-${n}`, rgbHex(lerpRgb(bgRgb, textRgb, t)));
  }
  root.style.setProperty("--color-neutral-900", textHex);
  root.style.setProperty("--color-neutral-950", rgbHex(lerpRgb(textRgb, black, 0.3)));
  root.style.setProperty("--color-neutral-999", "#000000");

  for (const a of NEUTRAL_ALPHA_STEPS) {
    root.style.setProperty(`--color-neutral-alpha-${a}`, `rgba(${textRgb[0]}, ${textRgb[1]}, ${textRgb[2]}, ${a / 100})`);
    root.style.setProperty(`--color-inverse-alpha-${a}`, `rgba(${bgRgb[0]}, ${bgRgb[1]}, ${bgRgb[2]}, ${a / 100})`);
  }
}
