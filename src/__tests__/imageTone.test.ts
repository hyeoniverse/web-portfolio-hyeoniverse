// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DARK_THRESHOLD, regionLuminance } from "@/lib/imageTone";
import { heroBackdrop } from "@/stores/navBackdropStore";

/* 2x2 RGBA — 왼쪽 위만 검정, 나머지 흰색 */
const px = (rgb: number[][]) => new Uint8ClampedArray(rgb.flatMap((c) => [...c, 255]));
const img = px([[0, 0, 0], [255, 255, 255], [255, 255, 255], [255, 255, 255]]);

describe("regionLuminance — 커버 구역 밝기", () => {
  it("구역 안 픽셀만 평균한다", () => {
    expect(regionLuminance(img, 2, 2, { x0: 0, y0: 0, x1: 0.5, y1: 0.5 })).toBe(0);
    expect(regionLuminance(img, 2, 2, { x0: 0.5, y0: 0, x1: 1, y1: 1 })).toBeCloseTo(1);
  });

  it("덮인 검은 막만큼 어둡게 본다", () => {
    expect(regionLuminance(img, 2, 2, { x0: 0.5, y0: 0.5, x1: 1, y1: 1 }, 0.6)).toBeCloseTo(0.4);
    expect(regionLuminance(img, 2, 2, { x0: 0.5, y0: 0.5, x1: 1, y1: 1 }, 0.6)).toBeLessThan(DARK_THRESHOLD);
  });
});

describe("heroBackdrop — 로고 뒤 배경", () => {
  it("커버가 로고 밑에 있고 밝기를 쟀을 때만 커버 밝기를 쓴다", () => {
    expect(heroBackdrop({ overHero: true, heroTone: "dark" })).toBe("dark");
    expect(heroBackdrop({ overHero: false, heroTone: "dark" })).toBeNull();
    expect(heroBackdrop({ overHero: true, heroTone: null })).toBeNull();
  });
});
