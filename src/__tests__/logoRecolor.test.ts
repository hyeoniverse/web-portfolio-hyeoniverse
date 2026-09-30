import { describe, it, expect } from "vitest";
import { analyzeLogo, recolorPixels } from "@/lib/logoRecolor";
import type { Rgb } from "@/utils/color";

/* 로고를 테마 색으로 칠하기 — 어떤 로고를 칠하고 어떤 로고를 그대로 두는지.
   브라우저 캔버스 없이 RGBA 배열로 확인한다. */

const INK: Rgb = [0x17, 0x15, 0x1b];
const PINK: Rgb = [0xd4, 0x00, 0x63];

/** 10×10 이미지 — 가장자리 한 줄은 투명, 안쪽은 fill(x, y) 가 정한 색 */
function logo(fill: (x: number, y: number) => Rgb | null, opaqueCorners = false): Uint8ClampedArray {
  const data = new Uint8ClampedArray(10 * 10 * 4);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const edge = x === 0 || y === 0 || x === 9 || y === 9;
      const c = edge && !opaqueCorners ? null : fill(x, y) ?? [255, 255, 255];
      const i = (y * 10 + x) * 4;
      if (c) data.set([...c, 255], i);
    }
  }
  return data;
}

describe("analyzeLogo", () => {
  it("잉크 한 색 로고 — 포인트 없음", () => {
    const p = analyzeLogo(logo(() => INK), 10)!;
    expect(p.ink.map(Math.round)).toEqual(INK);
    expect(p.accent).toBeNull();
  });

  it("잉크 + 분홍 점 — 많은 쪽이 잉크, 적은 쪽이 포인트", () => {
    const p = analyzeLogo(logo((x, y) => (x > 6 && y < 3 ? PINK : INK)), 10)!;
    expect(p.ink.map(Math.round)).toEqual(INK);
    expect(p.accent!.map(Math.round)).toEqual(PINK);
  });

  it("배경이 칠해진 이미지는 칠하지 않는다", () => {
    expect(analyzeLogo(logo(() => INK, true), 10)).toBeNull();
  });

  it("뚜렷한 색이 셋 이상이면 칠하지 않는다", () => {
    const three: Rgb[] = [INK, PINK, [0x20, 0xa0, 0x40]];
    expect(analyzeLogo(logo((x) => three[x % 3]), 10)).toBeNull();
  });

  it("완전히 투명한 이미지는 칠하지 않는다", () => {
    expect(analyzeLogo(new Uint8ClampedArray(10 * 10 * 4), 10)).toBeNull();
  });
});

describe("recolorPixels", () => {
  it("잉크는 새 잉크로, 포인트는 새 강조색으로, 알파는 그대로", () => {
    const data = logo((x, y) => (x > 6 && y < 3 ? PINK : INK));
    data[(5 * 10 + 5) * 4 + 3] = 128; // 반투명 잉크 한 점
    const palette = analyzeLogo(data, 10)!;
    const newInk: Rgb = [0x2a, 0x4e, 0x30], newAccent: Rgb = [0xbc, 0x47, 0x49];
    recolorPixels(data, palette, newInk, newAccent);
    const at = (x: number, y: number) => Array.from(data.slice((y * 10 + x) * 4, (y * 10 + x) * 4 + 4));
    expect(at(3, 5)).toEqual([...newInk, 255]);
    expect(at(8, 1)).toEqual([...newAccent, 255]);
    expect(at(5, 5)).toEqual([...newInk, 128]);
    expect(at(0, 0)).toEqual([0, 0, 0, 0]);
  });
});
