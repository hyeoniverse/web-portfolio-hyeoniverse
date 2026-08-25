import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * API 라우트에서 인증된 사용자를 요구하는 헬퍼.
 *
 * 인증 실패 시 401 NextResponse를, 성공 시 User + 이미 생성된 supabase 클라이언트를 반환.
 * 핸들러 본문에서 supabase 가 또 필요하면 `createClient()` 를 다시 호출할 필요 없이 그대로 재사용.
 *
 * CSRF 방어는 middleware (Origin/Referer 체크) 에서 처리됨 — 모든 /api/* mutation 에 일괄 적용.
 */
export async function requireAuth(): Promise<
  | { user: User; supabase: SupabaseClient; error?: never }
  | { user?: never; supabase?: never; error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  await syncStaleClaims(supabase, user);

  return { user, supabase };
}

/** 권한 판정에 쓰이는 클레임 — 이 값들이 어긋나면 코드와 정책의 판정이 갈린다. */
const CLAIM_KEYS = ["role", "permission_level", "author_id"] as const;

/**
 * 토큰에 담긴 권한 클레임이 낡았으면 세션을 갱신한다.
 *
 * `getUser()` 는 Auth 서버에 물어 **현재** app_metadata 를 돌려준다. 반면 같은 클라이언트가
 * 데이터베이스로 보내는 쿼리에는 브라우저가 들고 있는 access token 이 실리고, RLS 정책은
 * 그 토큰만 본다. 권한이 바뀐 직후에는 둘이 다른 값을 보게 된다.
 *
 * 그러면 코드의 등급 검사는 통과하는데 정책이 행을 걸러 0행이 돌아온다. 호출부는 그것을
 * "없음" 으로 읽어 404 를 낸다 — 권한 문제가 존재하지 않는 대상처럼 보이는 형태다.
 * (권한을 SQL 로 직접 바꾸면 Realtime broadcast 도 울리지 않아 화면 쪽 갱신도 걸리지 않는다.)
 *
 * 두 값이 어긋날 때만 갱신하므로 평상시 비용은 없다. 토큰 해석은 판정이 아니라 비교용이라
 * 서명을 다시 확인하지 않는다 — 그 검증은 이미 Supabase 가 했다.
 */
async function syncStaleClaims(supabase: SupabaseClient, user: User): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const claims = decodeClaims(session.access_token);
    if (!claims) return;

    const fresh = (user.app_metadata ?? {}) as Record<string, unknown>;
    const inToken = (claims.app_metadata ?? {}) as Record<string, unknown>;
    const differs = CLAIM_KEYS.some((k) => JSON.stringify(fresh[k]) !== JSON.stringify(inToken[k]));
    if (differs) await supabase.auth.refreshSession();
  } catch {
    /* 갱신 실패는 요청을 막지 않는다 — 판정 자체는 최신 app_metadata 로 이뤄진다 */
  }
}

/** JWT payload 만 꺼낸다(서명 검증 없음 — 비교 용도). */
function decodeClaims(token: string): { app_metadata?: Record<string, unknown> } | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json) as { app_metadata?: Record<string, unknown> };
}
