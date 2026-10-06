/* 편집기의 요약 옵션 — 관리자가 마지막에 고른 값을 브라우저에 남겨 다음 글에도 이어 쓴다(편의일 뿐이라 실패해도 기본값) */
import { DEFAULT_SUMMARY_OPTIONS, sanitizeSummaryOptions, type SummaryOptions } from "@/lib/ai/summary";

const KEY = "ai-summary-options";

export function loadSummaryOptions(): SummaryOptions {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanitizeSummaryOptions(JSON.parse(raw)) : DEFAULT_SUMMARY_OPTIONS;
  } catch {
    return DEFAULT_SUMMARY_OPTIONS;
  }
}

export function saveSummaryOptions(o: SummaryOptions) {
  try { window.localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* 사생활 보호 창 등 — 무시 */ }
}
