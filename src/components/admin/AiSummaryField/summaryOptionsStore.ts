/* 편집기의 요약 옵션 — 관리자가 마지막에 고른 값을 브라우저에 남겨 다음 글에도 이어 쓴다(편의일 뿐이라 실패하면 사이트 기본값) */
import { sanitizeSummaryOptions, type SummaryOptions } from "@/lib/ai/summary";

const KEY = "ai-summary-options";

/** 남은 값이 없으면 null — 부르는 쪽이 사이트 기본값(설정 › 서비스)을 쓴다 */
export function loadSummaryOptions(): SummaryOptions | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanitizeSummaryOptions(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveSummaryOptions(o: SummaryOptions) {
  try { window.localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* 사생활 보호 창 등 — 무시 */ }
}
