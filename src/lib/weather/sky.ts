/**
 * 날씨 · 하늘 — About 의 하늘 배경(TimeSky)과 첫 화면 날씨 줄이 같이 쓴다.
 * 날씨는 Open-Meteo(키 없음)의 WMO 날씨 코드를 하늘에 그릴 수 있는 몇 가지로 묶는다.
 */

export type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";

export interface VisitorWeather {
  /** 방문자 도시(배포 환경의 IP 위치). 모르면 null */
  city: string | null;
  /** 위치를 몰라 서울로 대신했는지 */
  fallback: boolean;
  /** 위치(소수 첫째 자리, 약 10km) — 별자리 계산용 */
  lat: number;
  lon: number;
  /** 섭씨 · 정수 */
  temp: number | null;
  kind: WeatherKind;
  /** 오늘 해 뜨는 · 지는 시각 — 방문자 현지 기준 "HH:MM" 의 분(0~1439). 모르면 null */
  sunrise: number | null;
  sunset: number | null;
}

/** WMO 날씨 코드 → 묶음 (https://open-meteo.com/en/docs 의 weather_code 표) */
export function weatherKindOf(code: number | null | undefined): WeatherKind {
  if (code == null || !Number.isFinite(code)) return "clear";
  /* 0 맑음 · 1 대체로 맑음 → 맑음, 2 구름 조금 · 3 흐림 → 흐림(둘은 하늘에서 거의 구분되지 않는다) */
  if (code <= 1) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  if (code >= 51 && code <= 82) return "rain";
  return "cloudy";
}

/** "2026-10-09T06:31" → 그날의 분(391). 형식이 다르면 null */
export function minutesOf(iso: string | null | undefined): number | null {
  const m = iso?.match(/T(\d{2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/* ── 시각 → 하늘 단계 ──
   하루를 일곱 단계(새벽 · 해돋이 · 아침 · 한낮 · 노을 · 저녁 · 밤)로 나누고, 각 단계의 기준 시각은 그날의 해 뜨는 · 지는
   시각에서 정한다. 시각이 두 기준 사이 어디쯤인지를 0~7 의 연속 값(phase)으로 돌려준다 */

export const SKY_KEYS = ["dawn", "sunrise", "morning", "day", "dusk", "evening", "night"] as const;
export type SkyKey = (typeof SKY_KEYS)[number];

/** 해 시각을 모를 때 — 대략 봄 · 가을 */
const DEFAULT_SUNRISE = 6 * 60 + 20;
const DEFAULT_SUNSET = 18 * 60 + 30;

/** 단계마다의 기준 시각(분) */
export function skyAnchors(sunrise: number | null, sunset: number | null): number[] {
  const up = sunrise ?? DEFAULT_SUNRISE;
  const down = sunset ?? DEFAULT_SUNSET;
  return [
    up - 45, // 새벽 — 해 뜨기 전 어스름
    up, // 해돋이
    up + 120, // 아침
    (up + down) / 2, // 한낮
    down - 20, // 노을
    down + 40, // 저녁(블루아워)
    down + 120, // 밤
  ];
}

/** 하루의 분(0~1439) → 단계 위치(0~7, 7 은 다시 새벽) */
export function phaseOf(minute: number, anchors: number[]): number {
  const day = 24 * 60;
  const n = anchors.length;
  for (let i = 0; i < n; i++) {
    const a = anchors[i];
    const b = i + 1 < n ? anchors[i + 1] : anchors[0] + day;
    /* 자정을 넘는 구간(밤 → 새벽)은 하루를 더해 잰다 */
    const t = minute < a && i === n - 1 ? minute + day : minute;
    if (t >= a && t < b) return i + (t - a) / (b - a);
  }
  /* 첫 기준(새벽)보다 이른 시각 — 밤 구간 */
  const a = anchors[n - 1] - day;
  return n - 1 + (minute - a) / (anchors[0] - a);
}

/** 단계 위치(0~7) → 하루의 분 — phaseOf 의 반대. 스크롤로 흐른 하늘의 "그 시각"(별자리 위치)을 구한다 */
export function minuteOfPhase(phase: number, anchors: number[]): number {
  const day = 24 * 60;
  const n = anchors.length;
  const p = ((phase % n) + n) % n;
  const i = Math.floor(p);
  const a = anchors[i];
  const b = i + 1 < n ? anchors[i + 1] : anchors[0] + day;
  return (((a + (b - a) * (p - i)) % day) + day) % day;
}
