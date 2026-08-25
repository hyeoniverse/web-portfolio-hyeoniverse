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
export const ACTION_TYPES = ["access_request", "device_login"] as const;

const ACTION_TYPE_SET: ReadonlySet<string> = new Set(ACTION_TYPES);

export function isActionType(type: string): boolean {
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
