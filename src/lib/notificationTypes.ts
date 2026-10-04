/**
 * 알림을 "처리 필요" 와 "정보성" 으로 가르는 기준.
 *
 * 지금까지 알림은 댓글 / 시스템 / 신고 세 갈래였고, 사람이 결정을 내려야 하는 권한 요청이
 * 설정 변경·AI 실패·로그아웃 기록 같은 정보성 알림과 같은 "시스템" 통에 묻혔다. 정보성 알림은
 * 계속 쌓이므로 며칠만 지나도 아래로 밀려 보이지 않는다.
 *
 * 여기 있는 타입은 **관리자가 승인·거절 같은 결정을 내려야 하는 것**들이다.
 *   access_request  권한 요청 — 알림 상세에서 바로 부여·거절한다
 *   device_login    새 기기 로그인 시도 — 승인 메일을 확인해야 한다
 *
 * login_lockout · ai_failure · email_failure 처럼 알아 두면 되는 것은 넣지 않는다.
 * 신고(report)는 이미 전용 탭(ReportsList)에 처리 화면이 있어 묻히지 않는다.
 */
const ACTION_TYPES = ["access_request", "device_login"] as const;

const ACTION_TYPE_SET: ReadonlySet<string> = new Set(ACTION_TYPES);

function isActionType(type: string): boolean {
  return ACTION_TYPE_SET.has(type);
}

/**
 * 아직 처리하지 않은 알림인가.
 *
 * 판단 기준은 read 하나로 둔다. 권한 요청은 부여·거절할 때 서버가 읽음까지 함께 처리하므로
 * (notifications/[id]/resolve) "결정을 내렸다 = 읽음" 이 성립한다. 기준을 둘로 나누면
 * 목록·탭 카운트·상단 고정이 서로 다른 답을 내놓게 된다.
 */
export function isPending(n: { type: string; read: boolean }): boolean {
  return isActionType(n.type) && !n.read;
}

/** 권한 요청 처리 결과 — metadata.resolved 에 기록된다. */
export type AccessRequestOutcome = "granted" | "rejected";

/**
 * 메일로도 받을 알림 종류 — 설정 › 서비스 › 알림 메일의 체크 목록과 lib/adminNotify 가 같이 쓴다.
 * 묶음은 알림 화면의 갈래(댓글 · 보안 · 운영 · 권한)를 따른다. email_failure 는 메일이 안 가서 생기는 알림이라 뺀다.
 */
export const NOTIFY_EMAIL_GROUPS = [
  { id: "comment", types: ["comment", "reply", "like", "report"] },
  { id: "security", types: ["device_login", "device_approved", "login_lockout", "signout_all"] },
  { id: "ops", types: ["ai_failure", "cron_error", "config_changed", "migration_applied"] },
  { id: "access", types: ["access_request"] },
] as const;

export type NotifyEmailType = (typeof NOTIFY_EMAIL_GROUPS)[number]["types"][number];

/** 기본 — 사람이 봐야 하는 것만. 좋아요 · 승인 완료 · 로그아웃 · 설정 변경 · AI 실패는 알림 화면에만 쌓인다 */
export const NOTIFY_EMAIL_DEFAULT: NotifyEmailType[] = [
  "comment", "reply", "report", "device_login", "login_lockout", "access_request", "cron_error",
];

/**
 * 같은 종류 · 같은 제목이면 한 시간에 한 번만 메일로 — 잇따라 생기는 운영 알림(AI 실패 · 설정 변경 · 잠금)용.
 * 댓글 · 신고 · 권한 요청 · 새 기기처럼 건마다 다른 일은 매번 보낸다.
 */
export const NOTIFY_EMAIL_DEDUPED: ReadonlySet<string> = new Set([
  "like", "device_approved", "login_lockout", "signout_all", "ai_failure", "cron_error", "config_changed", "migration_applied",
]);
export const NOTIFY_EMAIL_DEDUPE_MS = 60 * 60 * 1000;
