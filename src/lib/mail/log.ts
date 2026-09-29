/**
 * Resend 메일 발송 결과를 서비스 호출 기록(lib/serviceLog, category "mail")에 남긴다 — 서버 전용.
 * 예전에는 실패가 서버 로그에만 남거나(관리자 알림) 아예 버려져(계정 보안·새 기기 메일) 키가 만료돼도 몰랐다.
 * purpose 는 어떤 메일인지 — 화면이 admin.aiHealth.logPurpose.<값> 으로 이름을 붙인다.
 */
import { logService } from "@/lib/serviceLog";
import { classifyFailure } from "@/lib/ai/health";

export type MailPurpose = "admin-notify" | "comment-reply" | "new-device" | "account-security" | "author-invite";

export async function logMail(purpose: MailPurpose, result: Response | unknown): Promise<void> {
  if (result instanceof Response) {
    if (result.ok) {
      await logService({ category: "mail", provider: "resend", ok: true, meta: { purpose } });
      return;
    }
    const body = await result.clone().text().catch(() => "");
    await logService({
      category: "mail",
      provider: "resend",
      ok: false,
      kind: classifyFailure(result.status, body),
      status: result.status,
      message: `${result.status} ${body}`.trim(),
      meta: { purpose },
    });
    return;
  }
  await logService({
    category: "mail",
    provider: "resend",
    ok: false,
    kind: "network",
    message: result instanceof Error ? result.message : String(result),
    meta: { purpose },
  });
}
