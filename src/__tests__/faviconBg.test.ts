import { describe, expect, it } from "vitest";
import { resolveFavicon, DEFAULT_FAVICON_TEXT_SHADOW, DEFAULT_FAVICON_BG_SHADOW, type FaviconRenderInput } from "@/lib/favicon";

const base: FaviconRenderInput = {
  shape: "circle",
  faviconRadius: "",
  faviconBgRatio: "1",
  weight: "light",
  logoText: "✦",
  logoFont: "",
  logoFontStretch: "",
  faviconBgLight: "",
  faviconBgDark: "",
  faviconBorderWidth: "0",
  faviconBorderColorLight: "",
  faviconBorderColorDark: "",
  faviconFontSize: "20",
  faviconColor: "",
  faviconColorDark: "",
  faviconTextShadow: DEFAULT_FAVICON_TEXT_SHADOW,
  faviconBgShadow: DEFAULT_FAVICON_BG_SHADOW,
  presetLight: "#0a0a0a",
  presetDark: "#f5f5f0",
};

describe("favicon 배경", () => {
  it("배경색을 비우면 투명 — 모양은 남는다(업로드 이미지는 이 모양으로 자른다)", () => {
    const r = resolveFavicon(base, "light");
    expect(r.hasBg).toBe(false);
    expect(r.hasShape).toBe(true);
  });

  it("배경색이 있으면 칠한다", () => {
    const r = resolveFavicon({ ...base, faviconBgLight: "#123456" }, "light");
    expect(r.hasBg).toBe(true);
    expect(r.bgColor).toBe("#123456");
  });

  it("모양이 none 이면 배경색이 있어도 칠하지 않는다", () => {
    const r = resolveFavicon({ ...base, shape: "none", faviconBgLight: "#123456" }, "light");
    expect(r.hasBg).toBe(false);
    expect(r.hasShape).toBe(false);
  });

  it("배경이 없으면 탭 바탕과 대비되는 로고색, 있으면 배경과 대비가 큰 로고색", () => {
    expect(resolveFavicon(base, "light").fgColor).toBe("#0a0a0a");
    expect(resolveFavicon(base, "dark").fgColor).toBe("#f5f5f0");
    expect(resolveFavicon({ ...base, faviconBgLight: "#111111" }, "light").fgColor).toBe("#f5f5f0");
    expect(resolveFavicon({ ...base, faviconBgLight: "#eeeeee" }, "light").fgColor).toBe("#0a0a0a");
  });
});
