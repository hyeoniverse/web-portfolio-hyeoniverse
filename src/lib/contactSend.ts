/**
 * 문의 폼 공급자 전송 — 설정 › 서비스 › 이메일 서비스에서 고른 공급자로 보낸다. 서버(/api/contact)가 부른다.
 *
 * 예전에는 방문자 브라우저가 공급자로 바로 보냈다. 그러면 reCAPTCHA 를 서버에서 확인할 수 없고(봇이 공급자로 바로
 * 보내면 그만이다), 공급자 키도 브라우저에 실려야 했다. 지금은 서버가 입력 · reCAPTCHA 를 확인한 뒤 서버 키로 보낸다.
 *
 * 첨부 파일은 방문자가 비공개 버킷에 직접 올린다(/api/contact/upload) — Vercel 요청 크기 한도에 걸리지 않는다.
 * 전하는 방식은 설정(emailService.attachmentMode)을 따른다: link 면 내려받기 링크를 본문에 붙이고(요금제 상관없음),
 * provider 면 서버가 파일을 내려받아 form 의 attachment 칸에 싣는다(공급자 유료 요금제). 여기서는 form 을 그대로 넘긴다.
 *
 * - EmailJS 를 서버에서 부르려면 EmailJS 계정 › Security 의 "Allow EmailJS API for non-browser applications" 를 켜고,
 *   Private Key 를 EMAILJS_PRIVATE_KEY 로 넣어야 한다(accessToken).
 * - Formspree 폼에 "허용 도메인"을 걸어 두었다면 서버 요청이 막힐 수 있다 — referer 로 사이트 주소를 보낸다.
 */

export type ContactProvider = "formspree" | "web3forms" | "emailjs";

export type ContactSendResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "rejected" | "network"; detail?: string };

/** 공개 키 이름(설정 › 서비스 › 환경 변수) */
export const CONTACT_KEYS = {
  formspree: ["NEXT_PUBLIC_FORMSPREE_ID"],
  web3forms: ["NEXT_PUBLIC_WEB3FORMS_KEY"],
  emailjs: ["NEXT_PUBLIC_EMAILJS_SERVICE_ID", "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY"],
} as const;

async function post(url: string, body: FormData, headers?: HeadersInit): Promise<Response | null> {
  try {
    return await fetch(url, { method: "POST", body, headers });
  } catch {
    return null;
  }
}

export async function sendContact(
  provider: ContactProvider,
  keys: Record<string, string | undefined>,
  form: FormData,
  /** 서버에서 보낼 때 — Formspree 허용 도메인 검사용 사이트 주소 */
  referer?: string,
): Promise<ContactSendResult> {
  if (provider === "web3forms") {
    const accessKey = keys.NEXT_PUBLIC_WEB3FORMS_KEY;
    if (!accessKey) return { ok: false, reason: "not_configured" };
    const body = new FormData();
    for (const [k, v] of form) body.append(k, v);
    body.set("access_key", accessKey);
    /* 받은 메일의 제목·보낸 사람 이름 — Web3Forms 가 쓰는 예약 칸 */
    body.set("subject", String(form.get("title") || "Contact form"));
    body.set("from_name", String(form.get("name") || ""));
    body.set("replyto", String(form.get("email") || ""));
    const res = await post("https://api.web3forms.com/submit", body, { Accept: "application/json" });
    if (!res) return { ok: false, reason: "network" };
    const data = await res.json().catch(() => null);
    return res.ok && data?.success ? { ok: true } : { ok: false, reason: "rejected", detail: data?.message };
  }

  if (provider === "emailjs") {
    const serviceId = keys.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = keys.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = keys.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
    if (!serviceId || !templateId || !publicKey) return { ok: false, reason: "not_configured" };
    const body = new FormData();
    for (const [k, v] of form) body.append(k, v);
    body.set("service_id", serviceId);
    body.set("template_id", templateId);
    body.set("user_id", publicKey);
    /* 서버에서 부를 때 필요한 비공개 키(EmailJS › Security) */
    if (keys.EMAILJS_PRIVATE_KEY) body.set("accessToken", keys.EMAILJS_PRIVATE_KEY);
    const res = await post("https://api.emailjs.com/api/v1.0/email/send-form", body);
    if (!res) return { ok: false, reason: "network" };
    /* 성공하면 본문이 "OK" 글자 하나다. 실패는 사람이 읽는 문장 */
    return res.ok ? { ok: true } : { ok: false, reason: "rejected", detail: (await res.text().catch(() => "")).slice(0, 200) };
  }

  const formId = keys.NEXT_PUBLIC_FORMSPREE_ID;
  if (!formId) return { ok: false, reason: "not_configured" };
  const res = await post(`https://formspree.io/f/${encodeURIComponent(formId)}`, form, {
    Accept: "application/json",
    ...(referer ? { Referer: referer } : {}),
  });
  if (!res) return { ok: false, reason: "network" };
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => null);
  const errors = Array.isArray(data?.errors) ? data.errors.map((e: { message?: string }) => e?.message).filter(Boolean).join(", ") : "";
  return { ok: false, reason: "rejected", detail: errors || data?.error };
}
