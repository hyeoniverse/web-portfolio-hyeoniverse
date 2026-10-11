import { describe, expect, it } from "vitest";
import { altAz, localSiderealHours, seasonOf } from "@/lib/weather/stars";
import { SKY_CONSTELLATIONS, SKY_STARS } from "@/data/generated/skyCatalog";
import { minuteOfPhase, phaseOf, skyAnchors } from "@/lib/weather/sky";

const SEOUL = { lat: 37.57, lon: 126.98 };
/** 별자리 이름 자리(가운데쯤)의 고도 */
const alt = (id: string, date: Date) => {
  const c = SKY_CONSTELLATIONS.find((x) => x.id === id)!;
  const [ra, dec] = c.label;
  return altAz(ra, dec, SEOUL.lat, localSiderealHours(date, SEOUL.lon)).alt;
};
/** 북극성(작은곰자리 α, 적위 89°대) */
const polaris = () => {
  for (let i = 0; i < SKY_STARS.length; i += 3) if (SKY_STARS[i + 1] > 89) return [SKY_STARS[i], SKY_STARS[i + 1]];
  throw new Error("북극성 없음");
};

describe("별자리 위치", () => {
  it("가을 밤(10월 21시 KST)에는 페가수스 · 백조가 뜨고 오리온은 아직 지평선 아래", () => {
    const d = new Date(Date.UTC(2026, 9, 10, 12)); // 21:00 KST
    expect(alt("Peg", d)).toBeGreaterThan(20);
    expect(alt("Cyg", d)).toBeGreaterThan(20);
    expect(alt("Ori", d)).toBeLessThan(0);
  });

  it("겨울 밤(1월 22시 KST)에는 오리온이 높이 뜬다", () => {
    const d = new Date(Date.UTC(2026, 0, 15, 13)); // 22:00 KST
    expect(alt("Ori", d)).toBeGreaterThan(30);
  });

  it("목록은 맨눈 별 약 900개 · 88 별자리(뱀자리 두 조각)", () => {
    expect(SKY_STARS.length / 3).toBeGreaterThan(850);
    expect(new Set(SKY_CONSTELLATIONS.map((c) => c.id)).size).toBe(88);
  });

  it("북극성은 늘 위도만큼의 높이에 있다", () => {
    const [ra, dec] = polaris();
    expect(altAz(ra, dec, SEOUL.lat, localSiderealHours(new Date(Date.UTC(2026, 3, 1, 0)), SEOUL.lon)).alt).toBeCloseTo(SEOUL.lat, 0);
  });

  it("계절은 남반구에서 뒤집힌다", () => {
    expect(seasonOf(new Date(2026, 6, 1), 37)).toBe("summer");
    expect(seasonOf(new Date(2026, 6, 1), -33)).toBe("winter");
  });

  it("단계 ↔ 분은 서로 되돌아온다", () => {
    const a = skyAnchors(394, 1083);
    for (const m of [30, 400, 780, 1100, 1300]) expect(minuteOfPhase(phaseOf(m, a), a)).toBeCloseTo(m, 3);
  });
});
