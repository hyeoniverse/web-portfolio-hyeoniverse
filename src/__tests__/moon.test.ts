import { describe, expect, it } from "vitest";
import { moonPhaseName, moonState } from "@/lib/weather/moon";

/* 기준 — 실제 달력의 위상(UTC). 저정밀 식이라 몇 시간 어긋나는 건 허용한다 */
describe("달 위상", () => {
  it("2024-04-08 18:21 UTC 개기일식(삭) — 거의 안 빛난다", () => {
    expect(moonState(new Date(Date.UTC(2024, 3, 8, 18, 21))).illum).toBeLessThan(0.01);
  });

  it("2024-09-18 02:34 UTC 보름 — 거의 다 빛난다", () => {
    const m = moonState(new Date(Date.UTC(2024, 8, 18, 2, 34)));
    expect(m.illum).toBeGreaterThan(0.99);
    expect(moonPhaseName(m.phase).en).toBe("Full moon");
  });

  it("2025-01-06 23:56 UTC 상현 — 반쯤, 차오르는 중", () => {
    const m = moonState(new Date(Date.UTC(2025, 0, 6, 23, 56)));
    expect(m.illum).toBeGreaterThan(0.45);
    expect(m.illum).toBeLessThan(0.55);
    expect(m.waxing).toBe(true);
  });

  it("개기월식(2025-03-14 06:58 UTC)엔 달이 해의 반대편(적경 12시간 차)", () => {
    const m = moonState(new Date(Date.UTC(2025, 2, 14, 6, 58)));
    const diff = Math.abs(((((m.ra - m.sunRa) % 24) + 24) % 24) - 12);
    expect(diff).toBeLessThan(0.3);
  });
});
