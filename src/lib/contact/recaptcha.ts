/**
 * reCAPTCHA 서버 검증 — 문의 폼이 보낸 토큰을 Google 에 확인한다. 서버 전용.
 *
 * 비밀 키는 RECAPTCHA_SECRET_KEY(설정 › 서비스 › 환경 변수 또는 배포 환경 변수). NEXT_PUBLIC_ 을 붙이지 않는다 —
 * 붙이면 브라우저 번들에 실린다.
 * v3 는 점수(0~1)와 action 이름까지 본다: 폼이 executeRecaptcha(action) 로 받은 토큰이어야 하고 점수가 MIN_SCORE 이상.
 * 토큰은 한 번만 확인할 수 있다 — 같은 토큰을 두 번 보내면 두 번째는 timeout-or-duplicate 로 실패한다.
 */
import { getSecret } from "@/lib/getSecret";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
/** v3 통과 점수 — Google 권장 기본값 */
const MIN_SCORE = 0.5;

export type RecaptchaResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "missing_token" | "failed" | "network"; detail?: string };

export async function verifyRecaptcha({
  token,
  version,
  action,
  remoteIp,
}: {
  token: string | null | undefined;
  version: "v2" | "v3";
  /** v3 에서 기대하는 action 이름 */
  action: string;
  remoteIp?: string | null;
}): Promise<RecaptchaResult> {
  const secret = await getSecret("RECAPTCHA_SECRET_KEY");
  if (!secret) return { ok: false, reason: "not_configured" };
  if (!token) return { ok: false, reason: "missing_token" };

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  let data: { success?: boolean; score?: number; action?: string; "error-codes"?: string[] };
  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, cache: "no-store" });
    data = await res.json();
  } catch {
    return { ok: false, reason: "network" };
  }

  if (!data.success) return { ok: false, reason: "failed", detail: (data["error-codes"] ?? []).join(",") };
  if (version === "v3") {
    if (data.action && data.action !== action) return { ok: false, reason: "failed", detail: `action ${data.action}` };
    if (typeof data.score === "number" && data.score < MIN_SCORE) return { ok: false, reason: "failed", detail: `score ${data.score}` };
  }
  return { ok: true };
}
