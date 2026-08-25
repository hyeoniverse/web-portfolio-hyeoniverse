import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { buildGithubAuthorFields, githubLogin } from "@/lib/githubProfile";

/**
 * GET /api/admin/authors/github-profile — 로그인한 계정의 GitHub 프로필 값
 *
 * 멤버 편집 화면의 "GitHub 정보 불러오기" 가 쓴다. 예전에는 화면이 들고 있던 값
 * (이름·아바타·프로필 주소)만 채웠는데, 그 셋은 Supabase identity 에 담긴 전부라
 * 소개나 소속은 채울 수 없었다. 여기서 공개 API 까지 읽어 채울 수 있는 항목을 모두 돌려준다.
 *
 * 본인 계정만 조회한다 — 남의 GitHub 를 이 경로로 긁을 수 있으면 안 된다.
 */
export async function GET() {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  if (!githubLogin(user)) {
    return NextResponse.json(
      { error: "GitHub 로 로그인한 계정이 아니라 가져올 정보가 없습니다." },
      { status: 400 },
    );
  }

  return NextResponse.json(await buildGithubAuthorFields(user));
}
