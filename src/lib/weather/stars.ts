/**
 * 별자리 — About 하늘 배경에 방문자 위치 · 날짜 · 시각의 실제 별 위치로 별자리를 깐다.
 *
 * 별 · 별자리 데이터는 data/generated/skyCatalog(J2000 적경(시) · 적위(도)). 세차(약 26년에 0.36°)는 화면에서 보이지 않을 만큼이라 무시한다.
 * 계산은 표준식: 그리니치 항성시 → 지방 항성시 → 시간각 → 고도 · 방위각.
 */

const RAD = Math.PI / 180;

/** 그 순간의 지방 항성시(시) — 경도는 동경 + */
export function localSiderealHours(date: Date, lonDeg: number): number {
  const d = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
  const gmst = 18.697374558 + 24.06570982441908 * d;
  return (((gmst + lonDeg / 15) % 24) + 24) % 24;
}

/** 적경 · 적위 → 고도 · 방위각(도, 방위각은 북 0 · 동 90) */
export function altAz(raH: number, decDeg: number, latDeg: number, lst: number): { alt: number; az: number } {
  const H = (lst - raH) * 15 * RAD;
  const dec = decDeg * RAD;
  const lat = latDeg * RAD;
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(-Math.cos(dec) * Math.sin(H), Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(H));
  return { alt: alt / RAD, az: ((az / RAD) % 360 + 360) % 360 };
}

/** 계절 — 북반구 기준 달로 정하고, 남반구면 뒤집는다 */
export type Season = "spring" | "summer" | "autumn" | "winter";
export function seasonOf(date: Date, latDeg: number): Season {
  const m = date.getMonth();
  const north: Season = m >= 2 && m <= 4 ? "spring" : m >= 5 && m <= 7 ? "summer" : m >= 8 && m <= 10 ? "autumn" : "winter";
  if (latDeg >= 0) return north;
  return ({ spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" } as const)[north];
}
