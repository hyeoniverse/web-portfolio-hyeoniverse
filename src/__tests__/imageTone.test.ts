// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DARK_THRESHOLD, regionLuminance } from "@/lib/imageTone";
import { colorTone, coveredRegion } from "@/lib/navBackdrop";

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

describe("colorTone — 배경색 밝기", () => {
  it("어두운 색 · 밝은 색을 가른다", () => {
    expect(colorTone("rgb(20, 20, 20)")).toBe("dark");
    expect(colorTone("oklch(97% 0.01 90)")).toBe("light");
  });
  it("거의 투명하면 모른다(뒤가 비친다)", () => {
    expect(colorTone("rgba(0, 0, 0, 0)")).toBeNull();
    expect(colorTone("rgba(0, 0, 0, 0.3)")).toBeNull();
  });
});

describe("coveredRegion — 로고가 덮는 이미지 구역", () => {
  it("상자를 덮어 채운 이미지에서 로고 사각형을 원본 비율 좌표로 옮긴다", () => {
    // 200x100 상자에 100x100 이미지 → 2배로 200x200 이 되어 위아래 50px 씩 잘린다
    const r = coveredRegion({ left: 0, top: 0, width: 200, height: 100 }, 100, 100, { left: 0, top: 0, width: 100, height: 50 });
    expect(r.x0).toBe(0);
    expect(r.x1).toBeCloseTo(0.5);
    expect(r.y0).toBeCloseTo(0.25);
    expect(r.y1).toBeCloseTo(0.5);
  });
});
