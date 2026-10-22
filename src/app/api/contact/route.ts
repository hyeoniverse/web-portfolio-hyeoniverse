import { jsonOk } from "@/lib/api/response";
import { contactMessageWithAttachment } from "@/lib/contact/attachmentMessage";
import { hitRateLimit, rateLimitKey } from "@/lib/api/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getSecret } from "@/lib/getSecret";
import { logService } from "@/lib/serviceLog";
import { EMAIL_RE } from "@/utils/commentValidation";
import { sendContact, type ContactProvider } from "@/lib/contactSend";
import { verifyRecaptcha } from "@/lib/contact/recaptcha";
import { checkTicket } from "@/lib/contact/ticket";
import {
  ATTACHMENT_LINK_TTL_SEC,
  ATTACHMENT_PATH_RE,
  CONTACT_BUCKET,
  FIELD_MAX,
  clientIp,
  CONTACT_LIMITS,
} from "@/lib/contact/limits";

/**
 * POST /api/contact — 문의 폼 보내기. 방문자 브라우저 대신 서버가 공급자로 보낸다(lib/contactSend).
 *
 * 1. 입력 확인 — 이름 · 메일 · 본문 필수, 길이 제한(FIELD_MAX), 메일 모양.
 * 2. reCAPTCHA — 설정에서 켜 두었으면 서버가 Google 에 토큰을 확인한다(lib/contact/recaptcha). 첨부를 올리며 이미
 *    확인했으면 그때 받은 티켓으로 대신한다(lib/contact/ticket) — 토큰은 한 번만 확인할 수 있어서.
 * 3. 첨부 — 방문자가 비공개 버킷에 올린 파일(/api/contact/upload)의 내려받기 링크(7일)를 본문 끝에 붙인다.
 * 4. 공급자로 보낸다 — 키는 서버에서만 읽는다(설정 › 서비스 › 환경 변수).
 *
 * 응답은 { ok: true } 또는 { ok: false, reason } — 폼이 사유별로 안내한다.
 * reason: invalid · captcha · rate_limited · not_configured · rejected · network
 */

/** IP 당 10분에 5번 */

type Body = {
  name?: unknown;
  email?: unknown;
  title?: unknown;
  message?: unknown;
  recaptchaToken?: unknown;
  attachment?: { path?: unknown; name?: unknown; ticket?: unknown } | null;
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fail = (reason: string, status = 400) => Response.json({ ok: false, reason }, { status });

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!(await hitRateLimit("contact-send", rateLimitKey(ip), ...CONTACT_LIMITS))) return fail("rate_limited", 429);

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return fail("invalid");
  const name = str(body.name);
  const email = str(body.email);
  const title = str(body.title);
  const message = str(body.message);
  if (!name || !email || !message) return fail("invalid");
  if (name.length > FIELD_MAX.name || email.length > FIELD_MAX.email || title.length > FIELD_MAX.title
    || message.length > FIELD_MAX.message || !EMAIL_RE.test(email)) return fail("invalid");

  const cfg = await getSiteConfig();
  const attachmentPath = str(body.attachment?.path);
  const attachmentName = str(body.attachment?.name).slice(0, 120);
  if (attachmentPath && (!cfg.emailService?.enableFileUpload || !ATTACHMENT_PATH_RE.test(attachmentPath))) return fail("invalid");

  // ── reCAPTCHA ──
  if (cfg.recaptcha?.enabled) {
    const ticketOk = !!attachmentPath && checkTicket(str(body.attachment?.ticket), attachmentPath);
    if (!ticketOk) {
      const result = await verifyRecaptcha({
        token: str(body.recaptchaToken),
        version: cfg.recaptcha.version === "v2" ? "v2" : "v3",
        action: "contact_form",
        remoteIp: ip === "unknown" ? null : ip,
      });
      if (!result.ok) {
        if (result.reason === "not_configured") {
          await logService({ category: "contact", provider: "recaptcha", ok: false, kind: "not_configured", message: "RECAPTCHA_SECRET_KEY is not set" });
          return fail("not_configured", 503);
        }
        if (result.reason === "network") return fail("network", 502);
        return fail("captcha", 403);
      }
    }
  }

  // ── 첨부 — 설정(attachmentMode)에 따라 내려받기 링크(link) 또는 공급자 첨부(provider) ──
  const attachMode = cfg.emailService?.attachmentMode === "provider" ? "provider" : "link";
  let attachmentUrl = "";
  let attachmentFile: File | null = null;
  if (attachmentPath) {
    const bucket = createAdminClient().storage.from(CONTACT_BUCKET);
    if (attachMode === "provider") {
      /* 공급자 첨부 — 버킷의 파일을 내려받아 요청에 싣는다. 공급자가 첨부를 받지 않는 요금제면 공급자가 거절한다 */
      const { data, error } = await bucket.download(attachmentPath);
      if (error || !data) return fail("invalid");
      attachmentFile = new File([data], attachmentName || attachmentPath.split("/").pop() || "file", { type: data.type || "application/octet-stream" });
    } else {
      const { data, error } = await bucket.createSignedUrl(attachmentPath, ATTACHMENT_LINK_TTL_SEC, { download: attachmentName || true });
      if (error || !data) return fail("invalid");
      attachmentUrl = data.signedUrl;
    }
  }

  // ── 공급자로 보내기 ──
  const provider = (cfg.emailService?.provider ?? "formspree") as ContactProvider;
  const keyNames = [
    "NEXT_PUBLIC_FORMSPREE_ID", "NEXT_PUBLIC_WEB3FORMS_KEY",
    "NEXT_PUBLIC_EMAILJS_SERVICE_ID", "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "EMAILJS_PRIVATE_KEY",
  ];
  const keys = Object.fromEntries(await Promise.all(keyNames.map(async (k) => [k, await getSecret(k)] as const)));

  const form = new FormData();
  form.set("name", name);
  form.set("email", email);
  form.set("title", title);
  form.set("message", contactMessageWithAttachment(message, attachmentUrl ? { name: attachmentName, url: attachmentUrl } : null));
  /* EmailJS 는 템플릿 변수로만 칸을 그린다 — 첨부 이름 · 링크를 따로 넘겨 템플릿에서 {{attachment_name}} · {{attachment_url}} 로 쓸 수 있게.
     Formspree · Web3Forms 는 받은 칸을 모두 메일에 늘어놓아, 따로 넘기면 본문의 링크와 두 번 보인다 */
  if (attachmentUrl && provider === "emailjs") {
    form.set("attachment_name", attachmentName);
    form.set("attachment_url", attachmentUrl);
  }
  /* 공급자 첨부 — 칸 이름은 attachment(EmailJS 는 템플릿의 '변수 첨부' 이름을 attachment 로) */
  if (attachmentFile) form.set("attachment", attachmentFile);

  const result = await sendContact(provider, keys, form, process.env.SITE_URL || undefined);
  if (!result.ok) {
    await logService({
      category: "contact",
      provider,
      ok: false,
      kind: result.reason,
      message: result.reason === "rejected" ? result.detail : undefined,
    });
    if (result.reason === "network") return fail("network", 502);
    if (result.reason === "not_configured") return fail("not_configured", 503);
    return fail("rejected", 502);
  }
  return jsonOk({ ok: true });
}
