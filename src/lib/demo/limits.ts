/**
 * 라이브 데모의 기능과 하루 상한 — About 페이지에서 방문자가 사이트의 실제 AI 기능(번역 · 요약 · 커버 · 음성)을 불러 본다.
 *
 * 상한은 IP 마다 perIp 번, 사이트 전체 total 번(UTC 하루). 기본값은 아래 표이고 env 로 바꿀 수 있다.
 *   DEMO_TRANSLATE_PER_IP · DEMO_TRANSLATE_TOTAL · DEMO_SUMMARY_PER_IP · … · DEMO_SPEECH_TOTAL
 * 0 을 넣으면 그 기능을 끈다(DB 함수가 -1 을 돌려 429). 숫자가 아니면 기본값을 쓴다.
 * 세는 일은 DB(demo_usage · demo_take)가 한다 — supabase/migrations/2026_10_09_demo_usage.sql
 */
export const DEMO_FEATURES = ["translate", "summary", "cover", "speech"] as const;
export type DemoFeature = (typeof DEMO_FEATURES)[number];

export interface DemoLimits {
  perIp: number;
  total: number;
}

/** 커버는 한 장에 드는 값이 커서 하루 다섯 장만 */
export const DEFAULT_DEMO_LIMITS: Record<DemoFeature, DemoLimits> = {
  translate: { perIp: 3, total: 50 },
  summary: { perIp: 3, total: 50 },
  cover: { perIp: 1, total: 5 },
  speech: { perIp: 3, total: 50 },
};

/** 0 이상의 정수만 받는다 */
function readCount(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

export function demoLimits(feature: DemoFeature, env: Record<string, string | undefined> = process.env): DemoLimits {
  const key = feature.toUpperCase();
  const d = DEFAULT_DEMO_LIMITS[feature];
  return {
    perIp: readCount(env[`DEMO_${key}_PER_IP`], d.perIp),
    total: readCount(env[`DEMO_${key}_TOTAL`], d.total),
  };
}
