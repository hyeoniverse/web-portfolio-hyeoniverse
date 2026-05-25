import { NextResponse } from "next/server";
import { approveDeviceByToken } from "@/lib/auth/knownDevices";

type Lang = "ko" | "en";

/** Accept-Language 헤더 첫 번째 토큰만 확인. ko* 면 한국어, 아니면 영어. */
function detectLang(acceptLanguage: string | null): Lang {
  if (!acceptLanguage) return "en";
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("ko") ? "ko" : "en";
}

const T = {
  ko: {
    title_ok: "기기가 승인되었습니다",
    title_fail: "승인에 실패했습니다",
    msg_ok: "이제 해당 브라우저에서 로그인할 수 있습니다.",
    msg_expired: "승인 링크가 만료되었습니다. 새 기기에서 다시 로그인해주세요.",
    msg_invalid: "유효하지 않거나 이미 사용된 링크입니다.",
    msg_missing: "토큰이 없습니다.",
    cta: "로그인으로 돌아가기",
    htmlLang: "ko",
  },
  en: {
    title_ok: "Device approved",
    title_fail: "Approval failed",
    msg_ok: "You can now sign in from that browser.",
    msg_expired: "This approval link has expired. Try signing in again from the new device.",
    msg_invalid: "Invalid or already used link.",
    msg_missing: "Missing token",
    cta: "Back to login",
    htmlLang: "en",
  },
} satisfies Record<Lang, Record<string, string>>;

/** GET /api/admin/auth/approve-device?token=xxx
 *  이메일 링크 → token 검증 → device approved=true. 이후 같은 기기 (UA fingerprint) 에서
 *  비밀번호 재입력 후 정상 로그인. 결과 HTML 페이지 (Accept-Language 따라 ko/en). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const lang = detectLang(request.headers.get("accept-language"));
  const t = T[lang];

  if (!token) return htmlResponse({ ok: false, message: t.msg_missing, lang });

  const result = await approveDeviceByToken(token);
  if (!result.ok) {
    const message = result.reason === "expired" ? t.msg_expired : t.msg_invalid;
    return htmlResponse({ ok: false, message, lang });
  }
  return htmlResponse({
    ok: true,
    message: t.msg_ok,
    lang,
    loginUrl: `${url.origin}/admin/login`,
  });
}

function htmlResponse(args: {
  ok: boolean;
  message: string;
  lang: Lang;
  loginUrl?: string;
}) {
  const { ok, message, lang, loginUrl } = args;
  const t = T[lang];
  const title = ok ? t.title_ok : t.title_fail;
  // src/app/error.tsx 패턴 그대로 — 카드 없음, 가운데 정렬, circle border icon,
  // Instrument Serif 제목, capsule 버튼, decorative oval. 토큰값 직접 입력 (정적 HTML).
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="${t.htmlLang}"><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="/favicon-light.ico" media="(prefers-color-scheme: light)">
<link rel="icon" href="/favicon-dark.ico" media="(prefers-color-scheme: dark)">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-primary: #0f0f10;
    --text-primary: #f5f5f0;
    --text-secondary: #a1a1aa;
    --border-strong: 2px solid #f5f5f0;
    --border-light: 1px solid rgba(245, 245, 240, 0.12);
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg-primary: #f5f5f0;
      --text-primary: #0f0f10;
      --text-secondary: #71717a;
      --border-strong: 2px solid #0f0f10;
      --border-light: 1px solid rgba(15, 15, 16, 0.12);
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Space Grotesk", -apple-system, system-ui, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    padding: 24px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .content {
    flex: 1;
    z-index: 1;
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
  }
  .iconWrapper { margin-bottom: 32px; }
  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    border: var(--border-strong);
    width: 80px;
    height: 80px;
    border-radius: 50%;
  }
  .iconText {
    font-family: "Instrument Serif", serif;
    font-size: 3rem;
    font-weight: 400;
    line-height: 1;
    color: var(--text-primary);
  }
  h1 {
    margin: 0 0 16px;
    font-family: "Instrument Serif", serif;
    font-size: clamp(28px, 5vw, 44px);
    font-weight: 400;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }
  p {
    margin: 0 0 28px;
    font-family: "Space Grotesk", sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: var(--text-primary);
  }
  a.btn {
    display: inline-block;
    padding: 12px 32px;
    border: var(--border-strong);
    background: transparent;
    font-family: "Space Grotesk", sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-radius: 999px;
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  a.btn:hover {
    background: var(--text-primary);
    color: var(--bg-primary);
  }
  .decorOval1, .decorOval2 {
    position: absolute;
    border: var(--border-light);
    border-radius: 50%;
    pointer-events: none;
  }
  .decorOval1 {
    top: 10%; right: -10%;
    width: 400px; height: 200px;
    transform: rotate(-15deg);
  }
  .decorOval2 {
    bottom: 15%; left: -5%;
    width: 300px; height: 150px;
    transform: rotate(25deg);
  }
  @media (max-width: 768px) {
    .icon { width: 60px; height: 60px; }
    .iconText { font-size: 2rem; }
    .decorOval1, .decorOval2 { display: none; }
  }
</style>
</head><body>
<div class="content">
  <div class="iconWrapper">
    <div class="icon"><span class="iconText">${ok ? "✓" : "!"}</span></div>
  </div>
  <h1>${title}</h1>
  <p>${message}</p>
  ${loginUrl ? `<a class="btn" href="${loginUrl}">${t.cta}</a>` : ""}
</div>
<div class="decorOval1"></div>
<div class="decorOval2"></div>
</body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
