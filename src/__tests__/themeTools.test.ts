import { describe, it, expect } from "vitest";
import { auditTheme } from "@/lib/themeAudit";
import { HARMONY_RULES, extractColors, harmonyHues, harmonyTheme, themesFromColors, usableAccent } from "@/lib/themeGenerate";
import { contrastRatio } from "@/utils/contrast";

/* 설정 화면의 테마 도구 — 대비 점검, 색상환 추천, 이미지에서 색 뽑기. */

const ratio = (a: string, b: string) => contrastRatio(a, b) ?? 0;

describe("auditTheme", () => {
  it("기본 테마는 부적합이 아니다", () => {
    const a = auditTheme({ accentColor: "#d40063", lightBg: "#f5f5f0", lightText: "#1a1a1a", darkBg: "#0a0a0a", darkText: "#f5f5f0" });
    expect(a.verdict).not.toBe("poor");
    expect(a.modes.map((m) => m.mode)).toEqual(["light", "dark"]);
  });

  it("본문 글자가 배경에 묻히면 부적합", () => {
    const a = auditTheme({ accentColor: "#d40063", lightBg: "#f5f5f0", lightText: "#c8c8c0", darkBg: "#0a0a0a", darkText: "#f5f5f0" });
    expect(a.verdict).toBe("poor");
    expect(a.modes[0].rows.find((r) => r.key === "body")!.status).toBe("fail");
  });

  it("파스텔 강조색은 링크를 자동 보정한 것으로 표시하고, 버튼 글자는 테마 글자색으로 읽힌다", () => {
    const a = auditTheme({ accentColor: "#fbc45d", lightBg: "#f7ede2", lightText: "#3d2e1e", darkBg: "#1c130e", darkText: "#f5cac3" });
    const light = a.modes[0].rows;
    expect(light.find((r) => r.key === "link")!.corrected).toBe(true);
    expect(light.find((r) => r.key === "link")!.status).toBe("pass");
    expect(light.find((r) => r.key === "button")!.status).toBe("pass");
  });
});

describe("harmonyTheme", () => {
  const bases = ["#d40063", "#1c5d99", "#4d753d", "#fbc45d", "#6d3fb0"];
  it.each(HARMONY_RULES)("%s — 어떤 기준색이든 본문 대비 10 이상, 부적합 없음", (rule) => {
    for (const b of bases) {
      const t = harmonyTheme(b, rule);
      expect(ratio(t.lightText, t.lightBg)).toBeGreaterThanOrEqual(10);
      expect(ratio(t.darkText, t.darkBg)).toBeGreaterThanOrEqual(10);
      expect(auditTheme(t).verdict).not.toBe("poor");
    }
  });

  it("보색 규칙은 배경·글자 색상을 반대편에 둔다", () => {
    const [a, b, c] = harmonyHues("#1c5d99", "complementary");
    expect(Math.round(Math.abs(((b - a + 540) % 360) - 180))).toBe(180);
    expect(c).toBe(b);
  });

  it("너무 밝은 강조색은 쓸 만한 명도로 당긴다", () => {
    expect(ratio("#ffffff", usableAccent("#ffe9a8"))).toBeGreaterThan(ratio("#ffffff", "#ffe9a8"));
  });
});

describe("extractColors · themesFromColors", () => {
  /** 70% 남색 + 30% 주황, 일부 투명 */
  function image(): Uint8ClampedArray {
    const d = new Uint8ClampedArray(100 * 4);
    for (let i = 0; i < 100; i++) {
      const c = i < 60 ? [0x1c, 0x2a, 0x5a, 255] : i < 90 ? [0xe8, 0x59, 0x0c, 255] : [0, 0, 0, 0];
      d.set(c, i * 4);
    }
    return d;
  }

  it("많이 차지하는 색부터, 투명 픽셀은 빼고", () => {
    const colors = extractColors(image(), 4);
    expect(colors[0].share).toBeCloseTo(60 / 90, 1);
    expect(colors[0].hex).toBe("#1c2a5a");
    expect(colors.some((c) => c.hex === "#e8590c")).toBe(true);
  });

  it("뽑은 색으로 만든 테마는 읽힌다", () => {
    const themes = themesFromColors(extractColors(image(), 4));
    expect(themes.length).toBeGreaterThan(0);
    for (const t of themes) expect(auditTheme(t).verdict).not.toBe("poor");
  });

  it("빈 이미지는 후보가 없다", () => {
    expect(themesFromColors(extractColors(new Uint8ClampedArray(16)))).toEqual([]);
  });
});
