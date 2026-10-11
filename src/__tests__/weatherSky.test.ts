import { describe, expect, it } from "vitest";
import { minutesOf, phaseOf, skyAnchors, weatherKindOf } from "@/lib/weather/sky";

describe("날씨 · 하늘 단계", () => {
  it("WMO 날씨 코드를 묶는다", () => {
    expect(weatherKindOf(0)).toBe("clear");
    expect(weatherKindOf(1)).toBe("clear");
    expect(weatherKindOf(2)).toBe("cloudy");
    expect(weatherKindOf(3)).toBe("cloudy");
    expect(weatherKindOf(45)).toBe("fog");
    expect(weatherKindOf(61)).toBe("rain");
    expect(weatherKindOf(81)).toBe("rain");
    expect(weatherKindOf(73)).toBe("snow");
    expect(weatherKindOf(95)).toBe("storm");
    expect(weatherKindOf(null)).toBe("clear");
  });

  it("ISO 시각에서 그날의 분을 꺼낸다", () => {
    expect(minutesOf("2026-10-09T06:34")).toBe(394);
    expect(minutesOf(undefined)).toBeNull();
  });

  it("시각을 해 뜨는 · 지는 시각 기준의 단계로 바꾼다", () => {
    const a = skyAnchors(394, 1083); // 06:34 · 18:03
    expect(Math.floor(phaseOf(394, a))).toBe(1); // 해돋이
    expect(Math.floor(phaseOf(13 * 60, a))).toBe(3); // 한낮
    expect(Math.floor(phaseOf(1083, a))).toBe(4); // 노을
    expect(Math.floor(phaseOf(23 * 60, a))).toBe(6); // 밤
    expect(Math.floor(phaseOf(2 * 60, a))).toBe(6); // 자정 넘은 밤
    expect(Math.floor(phaseOf(394 - 30, a))).toBe(0); // 새벽
  });
});
