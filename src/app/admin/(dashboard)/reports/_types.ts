/** 신고 항목 — 신고 관리 페이지 · 알림 위젯(ReportsList) 공용 */
export interface Report {
  id: string;
  comment_id: string;
  comment_type: "post" | "work";
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
  comment: {
    content: string;
    nickname: string;
    is_deleted: boolean;
    parentSlug: string | null;
    parentTitle: string | null;
  } | null;
}

/** 신고 상태 필터 (all 포함) */
export type StatusFilter = "pending" | "resolved" | "dismissed" | "all";
