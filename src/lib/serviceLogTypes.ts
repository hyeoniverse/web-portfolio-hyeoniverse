/** 서비스 호출 기록의 모양 — 서버(lib/serviceLog)와 화면(/admin/service-log)이 같이 쓴다 */

export const SERVICE_LOG_CATEGORIES = ["ai", "mail", "github", "cron", "contact"] as const;
export type ServiceLogCategory = (typeof SERVICE_LOG_CATEGORIES)[number];

export interface ServiceLogEntry {
  at: string;
  category: ServiceLogCategory;
  /** 공급자나 작업 이름 — ai 는 lib/ai/providers 의 AiProvider, 그 밖에는 resend · github · publish-scheduled … */
  provider: string;
  ok: boolean;
  /** 실패 원인(lib/ai/providers 의 FailureKind) */
  kind?: string | null;
  status?: number | null;
  message?: string | null;
  /** 양 — ai 는 사용량 단위(chars·bytes), cron 은 처리한 건수 */
  units?: number | null;
  /** 덧붙임 — mail 은 { purpose } (어떤 메일인지) */
  meta?: { purpose?: string } | null;
}

/** ai 가 아닌 기록의 이름 */
export const SERVICE_PROVIDER_LABEL: Record<string, { ko: string; en: string }> = {
  resend: { ko: "Resend 메일", en: "Resend mail" },
  github: { ko: "GitHub API", en: "GitHub API" },
  "publish-scheduled": { ko: "예약 발행", en: "Scheduled publish" },
  "purge-trash-scheduled": { ko: "휴지통 비우기", en: "Trash purge" },
  "anonymize-site-visits": { ko: "방문 IP 익명화", en: "Visit IP anonymization" },
  "contact-attachment": { ko: "문의 폼 첨부", en: "Contact attachment" },
};
