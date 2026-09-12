import { NextResponse } from "next/server";
import type { ApiErrorCode, ErrorParams } from "@/lib/apiError";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * 의도한 실패를 알린다 — 입력이 잘못됐거나, 권한이 없거나, 이미 있는 값이거나.
 *
 * 여기 적는 `message` 는 **호출자에게 보여 줄 목적으로 우리가 직접 쓴 문장**이다.
 * 클라이언트가 이 값을 그대로 화면에 띄우거나(`data.error ?? "Failed to delete"`),
 * 코드처럼 비교하기도 한다(`data.error === "version_conflict"`). 그러니 문구를 바꿀 때는
 * 쓰는 쪽을 함께 확인해야 한다.
 *
 * 사용자가 평소 쓰다 만날 수 있는 실패는 `detail` 에 코드와 값을 함께 싣는다. 문장은 한 언어라,
 * 화면은 코드를 화면 언어 문구로 바꿔 보인다(`errorText`, #862). 이때 문장은 로그·개발용으로 남는다.
 */
export function jsonError(
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503 = 400,
  detail?: { code: ApiErrorCode; params?: ErrorParams },
) {
  return NextResponse.json(detail ? { error: message, ...detail } : { error: message }, { status });
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * 예상하지 못한 서버 오류.
 *
 * 전에는 받은 오류의 `message` 를 그대로 응답에 실었다. 이 자리에 오는 것은 대부분
 * Supabase 가 돌려준 Postgres 오류인데, 그 문장에는 제약 조건 이름이나 컬럼 이름이 섞여
 * 나온다. 우리가 쓴 문장이 아니라 DB 가 쓴 문장이므로 밖으로 내보낼 이유가 없다.
 * 게다가 이 헬퍼는 로그인 없이 부를 수 있는 라우트에서도 쓰인다(comment-reactions).
 *
 * 그래서 원인은 서버 로그에만 남기고 응답에는 고정된 문구를 준다. 개발 중에는 원문을
 * 그대로 돌려준다 — 브라우저 네트워크 탭에서 바로 보는 편이 빠르기 때문이다.
 *
 * 호출자에게 **보여 주려고 쓴 문장**은 이 함수가 아니라 `jsonError` 로 보낸다.
 *
 * @param context 로그에 함께 남길 위치 표시. 어느 라우트의 어느 단계인지 적는다.
 */
export function jsonServerError(error: unknown, context?: string) {
  const detail = describe(error);
  console.error(`[api] ${context ?? "unhandled"}: ${detail}`, error);

  return NextResponse.json(
    { error: process.env.NODE_ENV === "production" ? "Internal server error" : detail },
    { status: 500 },
  );
}
