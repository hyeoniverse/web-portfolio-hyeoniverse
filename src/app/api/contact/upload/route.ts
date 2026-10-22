import { createAdminClient } from "@/lib/supabase/admin";
import { contactAttachLimits } from "@/lib/contact/attachmentTypes";
import { hitRateLimit, rateLimitKey } from "@/lib/api/rateLimit";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { logService } from "@/lib/serviceLog";
import { verifyRecaptcha } from "@/lib/contact/recaptcha";
import { issueTicket } from "@/lib/contact/ticket";
import { CONTACT_BUCKET, clientIp, CONTACT_LIMITS } from "@/lib/contact/limits";

/**
 * POST /api/contact/upload — 문의 폼 첨부를 올릴 서명 URL 발급(공개). 파일 바이트는 브라우저가 서명 URL 로 비공개 버킷에
 * 바로 올린다 — Vercel 요청 크기 한도에 걸리지 않는다.
 *
 * 받는 것: { fileName, size, recaptchaToken? }
 * 확인: 설정의 첨부 켜짐 · 차단 확장자 · 크기(media.limits) · reCAPTCHA(켜져 있으면, action "contact_form").
 * 돌려주는 것: { ok, path, token, ticket? } — ticket 은 보내기(/api/contact)에서 reCAPTCHA 를 대신한다(lib/contact/ticket).
 */

const BLOCKED_EXT = new Set([
  "exe", "bat", "cmd", "com", "msi", "scr", "pif", "sh", "bash", "csh", "ksh",
  "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1", "dll", "sys", "drv", "html", "htm", "svg",
]);

const fail = (reason: string, status = 400) => Response.json({ ok: false, reason }, { status });

/** 저장 이름 — 경로에 쓸 수 없는 글자를 _ 로 바꾸고 길이를 자른다(확장자는 남긴다) */
function safeName(fileName: string): string {
  const cleaned = fileName.normalize("NFC").replace(/[^\w.\- ]/g, "_").replace(/\s+/g, " ").trim();
  return (cleaned || "file").slice(-120);
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!(await hitRateLimit("contact-upload", rateLimitKey(ip), ...CONTACT_LIMITS))) return fail("rate_limited", 429);

  const body = (await request.json().catch(() => null)) as { fileName?: unknown; size?: unknown; recaptchaToken?: unknown } | null;
  const fileName = typeof body?.fileName === "string" ? body.fileName : "";
  const size = typeof body?.size === "number" ? body.size : NaN;
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (!fileName || !ext || ext === fileName.toLowerCase() || !Number.isFinite(size) || size <= 0) return fail("invalid");

  const cfg = await getSiteConfig();
  if (!cfg.emailService?.enableFileUpload) return fail("disabled", 403);
  /* 받는 형식 · 크기 — 문의 서랍과 같은 목록(lib/contact/attachmentTypes). 차단 확장자는 기본 목록과 설정을 함께 본다 */
  const blocked = new Set([...BLOCKED_EXT, ...(cfg.media?.blockedExtensions ?? [])]);
  const allowed = contactAttachLimits(cfg.media?.limits as Record<string, number> | undefined, blocked);
  const limitMb = allowed[ext];
  if (limitMb === undefined) return fail("type", 400);
  if (size > limitMb * 1024 * 1024) return fail("too_large", 400);

  let ticket: string | undefined;
  const path = `${crypto.randomUUID()}/${safeName(fileName)}`;
  if (cfg.recaptcha?.enabled) {
    const result = await verifyRecaptcha({
      token: typeof body?.recaptchaToken === "string" ? body.recaptchaToken : "",
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
    ticket = issueTicket(path);
  }

  const { data, error } = await createAdminClient().storage.from(CONTACT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    await logService({ category: "contact", provider: "storage", ok: false, kind: "upload_url", message: error?.message });
    return fail("storage", 502);
  }
  return Response.json({ ok: true, bucket: CONTACT_BUCKET, path: data.path, token: data.token, ticket });
}
