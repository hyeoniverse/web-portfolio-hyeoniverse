import { describe, it, expect } from "vitest";
import { parseAnyColorToOklch, parseAnyToOklch, hexToOklch, oklchToHex, type OKLCH } from "@/components/ui/ColorPicker/colorMath";
import { placePopover } from "@/components/ui/ColorPicker/popoverPlacement";
import { fillLcPad } from "@/components/ui/ColorPicker/lcPadPixels";

/* 색 고르기에서 화면과 무관한 계산들.
   오랫동안 1,200줄짜리 컴포넌트 안에 있어서 브라우저를 띄우지 않으면 확인할 수 없었다. */

/**
 * 두 색이 같은지 — OKLCH 값끼리 견준다.
 *
 * hex 로 되돌려 비교하면 안 된다. OKLCH 는 sRGB 보다 넓은 색을 담을 수 있어서
 * hex 로 되돌릴 때 화면이 낼 수 있는 범위로 깎이고, 그 과정에서 값이 어긋난다.
 * 여기서 보려는 것은 "문자열을 제대로 읽었는가" 이므로 읽어낸 값끼리 견준다.
 */
function sameOklch(got: OKLCH | null, expectedHex: string) {
  if (!got) return false;
  const want = hexToOklch(expectedHex);
  return Math.abs(got.l - want.l) < 0.5
    && Math.abs(got.c - want.c) < 0.005
    && Math.abs(((got.h - want.h + 540) % 360) - 180) < 1;
}

describe("붙여넣은 색 문자열 해석", () => {
  it("여섯 가지 표기를 모두 같은 빨강으로 읽는다", () => {
    const inputs = [
      "#ff0000",
      "ff0000",
      "rgb(255, 0, 0)",
      "rgba(255, 0, 0, 0.5)",
      "hsl(0, 100%, 50%)",
      "255, 0, 0",
    ];
    for (const raw of inputs) {
      const got = parseAnyColorToOklch(raw);
      expect(got, `${raw} 를 읽지 못했다`).not.toBeNull();
      expect(sameOklch(got, "#ff0000"), `${raw} → ${JSON.stringify(got)}`).toBe(true);
    }
  });

  it("hsv 와 hsb 를 같은 것으로 본다", () => {
    const a = parseAnyColorToOklch("hsv(120, 100%, 100%)");
    const b = parseAnyColorToOklch("hsb(120, 100%, 100%)");
    expect(a, "두 이름은 같은 방식이다").toEqual(b);
    expect(sameOklch(a, "#00ff00")).toBe(true);
  });

  it("색으로 볼 수 없는 글자는 null 을 돌려준다", () => {
    for (const raw of ["", "   ", "빨강", "#12345", "rgb(", "not a color"]) {
      expect(parseAnyColorToOklch(raw), `${raw} 를 색으로 읽었다`).toBeNull();
    }
  });

  it("바깥에서 받은 값은 oklch 표기든 hex 든 읽는다", () => {
    expect(sameOklch(parseAnyToOklch("#0000ff"), "#0000ff")).toBe(true);
    const fromOklch = parseAnyToOklch("oklch(60% 0.2 250)");
    expect(fromOklch.h).toBeCloseTo(250, 0);
  });
});

describe("hex ↔ OKLCH 왕복에서 생기는 어긋남", () => {
  /* 재현용 기록. hex 를 OKLCH 로 읽었다가 다시 hex 로 되돌리면 값이 조금 달라진다.
     화면이 낼 수 있는 범위로 깎는 과정에서 생기며, 순수한 원색일수록 크다.
     지금 크기를 못박아 두어 나중에 더 벌어지면 알아차릴 수 있게 한다. */
  const drift = (hex: string) => {
    const back = oklchToHex(hexToOklch(hex));
    const ch = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    return Math.max(...ch(hex).map((v, i) => Math.abs(v - ch(back)[i])));
  };

  it("지금은 채널당 24 를 넘지 않는다", () => {
    for (const hex of ["#ff0000", "#00ff00", "#0000ff", "#ffffff", "#000000", "#808080", "#d01046"]) {
      expect(drift(hex), `${hex} 의 어긋남`).toBeLessThanOrEqual(24);
    }
  });

  it("회색은 거의 어긋나지 않는다", () => {
    for (const hex of ["#ffffff", "#000000", "#808080"]) {
      expect(drift(hex), `${hex} 의 어긋남`).toBeLessThanOrEqual(1);
    }
  });
});

describe("띄운 판을 놓을 자리", () => {
  const anchor = (top: number, left: number, h = 30) => ({ top, bottom: top + h, left });

  it("자리가 넉넉하면 누른 것 바로 아래에 놓는다", () => {
    const { top, left } = placePopover(anchor(100, 200), 260, 320, 1440, 900);
    expect(top, "누른 것 아래 + 간격").toBe(136);
    expect(left, "왼쪽 맞춤").toBe(200);
  });

  it("오른쪽으로 넘치면 오른쪽 끝에 맞춘다", () => {
    const { left } = placePopover(anchor(100, 1300), 260, 320, 1440, 900);
    expect(left).toBe(1440 - 260 - 8);
  });

  it("왼쪽으로 넘치면 왼쪽 끝에 맞춘다", () => {
    const { left } = placePopover(anchor(100, -50), 260, 320, 1440, 900);
    expect(left).toBe(8);
  });

  it("아래가 모자라고 위가 넉넉하면 위로 뒤집는다", () => {
    const { top } = placePopover(anchor(700, 200), 260, 320, 1440, 900);
    expect(top, "누른 것 위 - 간격 - 판 높이").toBe(700 - 6 - 320);
  });

  it("위아래 모두 모자라면 화면 안에 넣는다", () => {
    const { top } = placePopover(anchor(100, 200), 260, 800, 1440, 500);
    expect(top).toBeGreaterThanOrEqual(8);
    expect(top).toBe(8);
  });
});

describe("밝기×채도 판의 픽셀", () => {
  it("모든 픽셀이 불투명하게 채워진다", () => {
    const [w, h] = [16, 12];
    const data = new Uint8ClampedArray(w * h * 4);
    fillLcPad(data, w, h, 30);
    for (let i = 3; i < data.length; i += 4) expect(data[i], `${i} 번째 픽셀의 투명도`).toBe(255);
  });

  it("왼쪽 끝은 밝기 0 이라 검정에 가깝다", () => {
    const [w, h] = [16, 12];
    const data = new Uint8ClampedArray(w * h * 4);
    fillLcPad(data, w, h, 30);
    // 맨 아래 줄(채도 0) 의 첫 픽셀
    const i = ((h - 1) * w + 0) * 4;
    expect(data[i]).toBeLessThan(20);
    expect(data[i + 1]).toBeLessThan(20);
    expect(data[i + 2]).toBeLessThan(20);
  });

  it("색상을 바꾸면 그려지는 픽셀도 달라진다", () => {
    const [w, h] = [16, 12];
    const a = new Uint8ClampedArray(w * h * 4);
    const b = new Uint8ClampedArray(w * h * 4);
    fillLcPad(a, w, h, 30);
    fillLcPad(b, w, h, 210);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});
