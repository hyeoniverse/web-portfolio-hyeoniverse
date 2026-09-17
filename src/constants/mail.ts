/** 발신 메일 From 헤더 (Resend) — 알림·인증·댓글·초대 메일 공용.
 *  Resend 에서 hyeoniverse.com 도메인을 인증했으므로 사이트 도메인으로 보낸다.
 *  인증 전 임시 주소(onboarding@resend.dev)는 Resend 계정 본인에게만 발송돼
 *  댓글 알림·작성자 초대가 나가지 않았고, 승인 메일도 스팸으로 분류됐다. */
export const MAIL_FROM = "Hyeoniverse <noreply@hyeoniverse.com>";
