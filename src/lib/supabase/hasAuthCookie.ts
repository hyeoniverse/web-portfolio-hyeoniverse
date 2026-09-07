"use client";

/**
 * 로그인 흔적이 있는지 쿠키로만 먼저 살핀다.
 *
 * Supabase 브라우저 클라이언트는 313 KiB 다. 로그인 여부를 물어보려고 그것을 받는데,
 * 방문자는 대부분 로그인하지 않은 상태다. "로그인 안 했다" 는 답 하나를 얻으려고
 * 313 KiB 를 내려받고, 그 사이 화면에 필요한 것들이 뒤로 밀린다.
 *
 * 세션이 있으면 `sb-<프로젝트>-auth-token` 쿠키가 생긴다(HttpOnly 가 아니라 JS 에서 읽힌다).
 * 그 쿠키가 없으면 로그인 상태일 수 없으므로 클라이언트를 받지 않는다.
 * 있으면 예전과 똑같이 받아서 실제 세션을 확인한다 — 쿠키만으로 로그인됐다고 단정하지 않는다.
 */
export function hasAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => /^\s*sb-.*-auth-token(\.\d+)?=/.test(c));
}
