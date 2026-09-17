/** 발신 메일 From 헤더 (Resend) — 알림·인증·댓글·초대 메일 공용.
 *
 *  주소는 SITE_URL 에서 끌어온다. 도메인을 옮길 때 고칠 곳을 한 군데로 두기 위함이다.
 *  www 는 뗀다 — 메일 주소에 www 를 쓰지 않고, Resend 도메인 인증도 apex 에 건다.
 *
 *  SITE_URL 이 없거나 주소로 해석되지 않으면 Resend 의 임시 주소로 떨어진다. 이 주소는
 *  Resend 계정 본인에게만 발송되므로, 배포 환경에서 이게 쓰이고 있다면 SITE_URL 이 빠진 것이다.
 *
 *  주의: 새 도메인으로 옮길 때는 Resend 에서 그 도메인 인증을 먼저 마쳐야 한다.
 *  인증 없이 SITE_URL 만 바꾸면 모든 메일이 발송에 실패한다. */
function senderDomain(): string {
  try {
    return new URL(process.env.SITE_URL ?? "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const domain = senderDomain();

export const MAIL_FROM = domain
  ? `Hyeoniverse <noreply@${domain}>`
  : "Portfolio <onboarding@resend.dev>";
