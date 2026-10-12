import type { Language } from "@/types";

/** 신고 사유 프리셋 — 선택 후 상세 입력 가능. "other" 는 직접 입력. */
export const REPORT_REASONS: { value: string; labelKey: string }[] = [
  { value: "spam", labelKey: "comments.reportReasonSpam" },
  { value: "abuse", labelKey: "comments.reportReasonAbuse" },
  { value: "inappropriate", labelKey: "comments.reportReasonInappropriate" },
  { value: "privacy", labelKey: "comments.reportReasonPrivacy" },
  { value: "other", labelKey: "comments.reportReasonOther" },
];

/**
 * 저장된 신고 사유("프리셋 라벨 · 상세" — 신고한 사람의 언어로 저장된다)의 프리셋 라벨만 지금 화면 언어로 바꾼다.
 * 라벨은 정해진 글이라 번역하고, 뒤의 상세는 사람이 쓴 내용이라 원문 그대로 둔다. 프리셋이 아니면 그대로.
 */
export function localizeReportReason(
  reason: string,
  t: (key: string) => string,
  tLang: (key: string, lang: Language) => string,
): string {
  for (const { value, labelKey } of REPORT_REASONS) {
    if (value === "other") continue;
    for (const lang of ["ko", "en"] as const) {
      const label = tLang(labelKey, lang);
      if (reason === label) return t(labelKey);
      if (reason.startsWith(`${label} · `)) return t(labelKey) + reason.slice(label.length);
    }
  }
  return reason;
}
