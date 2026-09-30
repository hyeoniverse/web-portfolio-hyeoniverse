import { describe, it, expect } from "vitest";
import { THEME_PRESETS } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";
import { MIN_TEXT_CONTRAST, neutralScale, readableAccent } from "@/lib/themeColors";
import { contrastRatio } from "@/utils/contrast";
import { hexToRgb } from "@/utils/color";

/* 기본 제공 테마가 읽히는지, 서로 겹치지 않는지.
   예전 프리셋은 파스텔 강조색이 라이트 배경에서 1.5~2.7 대비에 그쳤고, 분홍·파랑·노랑이
   두세 개씩 거의 같은 색으로 겹쳐 있었다. 새로 넣거나 고칠 때 같은 일이 없게 여기서 막는다. */

const ratio = (a: string, b: string) => contrastRatio(a, b) ?? 0;

/** CIELAB ΔE(1976) — 두 색이 눈에 얼마나 달라 보이는지 */
function deltaE(a: string, b: string): number {
  const lab = (hex: string) => {
    const lin = hexToRgb(hex)!.map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const [r, g, bl] = lin;
    const x = (r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047;
    const y = r * 0.2126 + g * 0.7152 + bl * 0.0722;
    const z = (r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883;
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

describe("THEME_PRESETS", () => {
  /* Default 는 CSS 토큰을 그대로 쓰고(다크 강조색·neutral 스케일이 따로 있다) 프리셋 값은 표시용이라 뺀다 */
  const presets = THEME_PRESETS.filter((p) => p.name !== "Default");

  it.each(presets)("$name — 기본 텍스트가 배경 대비 10 이상", ({ theme }) => {
    expect(ratio(theme.lightText, theme.lightBg)).toBeGreaterThanOrEqual(10);
    expect(ratio(theme.darkText, theme.darkBg)).toBeGreaterThanOrEqual(10);
  });

  it.each(presets)("$name — 라이트: 강조색 글자와 강조색 위 흰 글자가 AA", ({ theme }) => {
    expect(ratio(theme.accentColor, theme.lightBg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(ratio("#ffffff", theme.accentColor)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it.each(presets)("$name — 다크: 밝힌 강조색 글자와 그 위 검은 글자가 AA", ({ theme }) => {
    const accent = readableAccent(theme.accentColor, theme.darkBg);
    expect(ratio(accent, theme.darkBg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(ratio("#000000", accent)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it.each(presets)("$name — 강조색이 기본 텍스트와 구분된다", ({ theme }) => {
    expect(deltaE(theme.accentColor, theme.lightText)).toBeGreaterThanOrEqual(30);
  });

  it("강조색끼리 겹치지 않는다", () => {
    const close: string[] = [];
    for (let i = 0; i < THEME_PRESETS.length; i++) {
      for (let j = i + 1; j < THEME_PRESETS.length; j++) {
        const [a, b] = [THEME_PRESETS[i], THEME_PRESETS[j]];
        if (deltaE(a.theme.accentColor, b.theme.accentColor) < 25) close.push(`${a.name}-${b.name}`);
      }
    }
    expect(close).toEqual([]);
  });

  it("이름이 겹치지 않는다", () => {
    const names = THEME_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("neutralScale", () => {
  it("흐린 글자 단계(라이트 600 · 다크 500)는 대비가 낮은 조합에서도 AA 로 당겨진다", () => {
    // 옛 Meadow — 고정 비율로 섞으면 라이트 600 이 3.32, 다크 500 이 2.96 이었다
    const light = neutralScale("#f2e8cf", "#2a4e30")!;
    const dark = neutralScale("#141f12", "#a7c957")!;
    expect(ratio(light[600], "#f2e8cf")).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(ratio(dark[500], "#141f12")).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it("단계가 뒤집히지 않는다 — 뒤 단계일수록 배경 대비가 크거나 같다", () => {
    const s = neutralScale("#f2e8cf", "#2a4e30")!;
    const steps = [100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => ratio(s[n], "#f2e8cf"));
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1]);
  });

  it("대비가 충분한 조합은 원래 비율 그대로다", () => {
    expect(neutralScale("#ffffff", "#000000")![600]).toBe("#595959");
  });
});

describe("readableAccent", () => {
  it("이미 대비가 충분하면 그대로 돌려준다", () => {
    expect(readableAccent("#ff4da6", "#0a0a0a")).toBe("#ff4da6");
  });

  it("어두운 배경에서 모자라면 밝힌다", () => {
    const out = readableAccent("#1d5fb8", "#1b1d21");
    expect(out).not.toBe("#1d5fb8");
    expect(ratio(out, "#1b1d21")).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});
