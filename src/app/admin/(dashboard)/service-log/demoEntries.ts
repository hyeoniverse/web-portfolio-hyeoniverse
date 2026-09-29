/**
 * /admin/service-log?demo — 기록이 없을 때 화면을 미리 보는 예시. 저장하지 않고 화면에만 그린다.
 * 모든 종류(AI·메일·GitHub·예약 작업·문의 폼 첨부)와 성공·실패가 한 번씩은 나오게 짰다.
 */
import type { ServiceLogEntry } from "@/lib/serviceLogTypes";

export function demoServiceLog(now: number): ServiceLogEntry[] {
  const at = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString();
  return [
    { at: at(2), category: "ai", provider: "fish", ok: true, units: 312 },
    { at: at(3), category: "ai", provider: "gemini", ok: false, kind: "expired", status: 400, message: "400 API key expired. Please renew the API key." },
    { at: at(3), category: "ai", provider: "openai", ok: true },
    { at: at(8), category: "mail", provider: "resend", ok: true, meta: { purpose: "comment-reply" } },
    { at: at(15), category: "cron", provider: "publish-scheduled", ok: true, units: 1 },
    { at: at(21), category: "ai", provider: "deepl", ok: true, units: 1840 },
    { at: at(34), category: "github", provider: "github", ok: false, kind: "rate_limit", status: 403, message: "403 API rate limit exceeded for 203.0.113.7" },
    { at: at(40), category: "ai", provider: "pexels", ok: false, kind: "rate_limit", status: 429, message: "429 Too Many Requests" },
    { at: at(52), category: "contact", provider: "contact-attachment", ok: false, kind: "billing", message: "File upload is not allowed on the free plan" },
    { at: at(75), category: "mail", provider: "resend", ok: false, kind: "invalid_key", status: 401, message: "401 API key is invalid", meta: { purpose: "new-device" } },
    { at: at(90), category: "ai", provider: "google_tts", ok: true, units: 2400 },
    { at: at(130), category: "ai", provider: "gemini", ok: true },
    { at: at(300), category: "ai", provider: "unsplash", ok: true },
    { at: at(610), category: "cron", provider: "purge-trash-scheduled", ok: true, units: 3 },
    { at: at(620), category: "cron", provider: "anonymize-site-visits", ok: true, units: 128 },
    { at: at(900), category: "ai", provider: "edge", ok: true },
  ];
}

/** 예시 모드의 공급자 상태 — 점의 네 가지 색이 모두 보이게 */
export const DEMO_STATES: Record<string, "ok" | "failing" | "off" | "nokey"> = {
  gemini: "off",
  pexels: "failing",
  edge: "ok",
  unsplash: "nokey",
};
