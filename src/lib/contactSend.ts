/**
 * 문의 폼 전송 — 설정 › 서비스 › 이메일 서비스에서 고른 공급자로 방문자 브라우저가 바로 보낸다.
 *
 * 예전에는 공급자 설정과 상관없이 Formspree(@formspree/react, 폼 ID 고정)로만 보냈다. 세 공급자 모두
 * 브라우저에서 부르는 쪽을 공식 경로로 두고 있고 키도 공개용이라(NEXT_PUBLIC_*), 서버를 거치지 않는다
 * (서버를 거치면 첨부가 Vercel 요청 크기 한도에 걸린다).
 *
 * 첨부는 폼의 attachment 칸을 그대로 싣는다 — 받아 주는지는 공급자 요금제에 달렸다.
 * - Formspree: 파일 업로드는 유료 요금제에서만 받는다(무료 요금제는 없음)
 * - Web3Forms: 파일 첨부는 유료(Pro) 요금제에서만 받는다
 * - EmailJS: 유료 요금제에서만(무료는 첨부 없음). send-form 이 폼의 파일을 템플릿의 "변수 첨부(Variable
 *   Attachment)"로 붙인다 — 템플릿에서 매개변수 이름을 attachment 로 맞춰야 한다
 * reCAPTCHA 토큰(g-recaptcha-response)은 셋 모두에 함께 보낸다 — Formspree·EmailJS 는 대시보드에 비밀 키를
 * 넣으면 검증하고, 검증을 쓰지 않는 공급자는 무시한다.
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
    const res = await post("https://api.emailjs.com/api/v1.0/email/send-form", body);
    if (!res) return { ok: false, reason: "network" };
    /* 성공하면 본문이 "OK" 글자 하나다. 실패는 사람이 읽는 문장 */
    return res.ok ? { ok: true } : { ok: false, reason: "rejected", detail: (await res.text().catch(() => "")).slice(0, 200) };
  }

  const formId = keys.NEXT_PUBLIC_FORMSPREE_ID;
  if (!formId) return { ok: false, reason: "not_configured" };
  const res = await post(`https://formspree.io/f/${encodeURIComponent(formId)}`, form, { Accept: "application/json" });
  if (!res) return { ok: false, reason: "network" };
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => null);
  const errors = Array.isArray(data?.errors) ? data.errors.map((e: { message?: string }) => e?.message).filter(Boolean).join(", ") : "";
  return { ok: false, reason: "rejected", detail: errors || data?.error };
}
