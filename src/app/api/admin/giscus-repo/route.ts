import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { getSecret } from "@/lib/getSecret";

/**
 * GET /api/admin/giscus-repo?repo=owner/name — giscus 설정용
 * 저장소의 GraphQL node id(repoId) + Discussion 카테고리 목록을 불러온다.
 * (카테고리·categoryId 는 저장소마다 다르고 opaque 라 GitHub API 로만 확정 가능)
 *
 * 필요 env: GITHUB_TOKEN (공개 저장소 읽기용 PAT — GraphQL 은 인증 토큰 필수)
 * admin 전용(requireAuth).
 */
export async function GET(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const repo = (searchParams.get("repo") ?? "").trim();
  const m = repo.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!m) {
    return NextResponse.json({ error: "repo 형식은 owner/name 이어야 합니다." }, { status: 400 });
  }
  const [, owner, name] = m;

  // admin secrets(DB) 우선, 없으면 process.env fallback — admin 화면에서 입력한 토큰도 인식
  const token = await getSecret("GITHUB_TOKEN");
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN 환경변수가 필요합니다 (공개 저장소 읽기용 PAT).", needsToken: true },
      { status: 500 },
    );
  }

  // emojiHTML — emoji 필드는 :mega: 같은 shortcode 라, HTML 안 실제 유니코드를 추출해 쓴다.
  const query =
    "query($owner:String!,$name:String!){repository(owner:$owner,name:$name){id hasDiscussionsEnabled discussionCategories(first:50){nodes{id name emoji emojiHTML}}}}";

  let res: Response;
  try {
    res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "portfolio-giscus-setup",
      },
      body: JSON.stringify({ query, variables: { owner, name } }),
    });
  } catch {
    return NextResponse.json({ error: "GitHub 요청에 실패했습니다." }, { status: 502 });
  }

  const json: {
    data?: { repository?: { id: string; hasDiscussionsEnabled: boolean; discussionCategories?: { nodes?: { id: string; name: string; emoji: string; emojiHTML: string }[] } } };
    errors?: { message: string; type?: string }[];
    message?: string;
  } | null = await res.json().catch(() => null);

  // HTTP 레벨 인증/권한 오류 — 토큰 자체 문제
  if (res.status === 401) {
    return NextResponse.json({ error: "GitHub 토큰이 유효하지 않습니다 (인증 실패 · Bad credentials). 토큰 값을 다시 확인해 주세요." }, { status: 401 });
  }
  if (res.status === 403) {
    return NextResponse.json({ error: "GitHub 토큰의 권한이 부족하거나 호출 한도를 초과했습니다. 토큰 권한(공개 저장소 읽기)을 확인해 주세요." }, { status: 403 });
  }
  if (!res.ok || !json) {
    return NextResponse.json({ error: json?.message || `GitHub API 오류 (${res.status})` }, { status: 502 });
  }

  // GraphQL 오류 — type 별 세분화
  if (json.errors?.length) {
    const e = json.errors[0];
    switch (e.type) {
      case "NOT_FOUND":
        return NextResponse.json({ error: "저장소를 찾을 수 없거나 접근 권한이 없습니다. 저장소 이름(owner/name)과 공개 여부, 토큰 권한을 확인해 주세요." }, { status: 404 });
      case "FORBIDDEN":
        return NextResponse.json({ error: "이 저장소를 읽을 권한이 토큰에 없습니다." }, { status: 403 });
      case "RATE_LIMITED":
        return NextResponse.json({ error: "GitHub API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
      default:
        return NextResponse.json({ error: e.message || "GitHub GraphQL 오류가 발생했습니다." }, { status: 502 });
    }
  }

  const repository = json.data?.repository;
  if (!repository) {
    return NextResponse.json({ error: "저장소를 찾을 수 없습니다. 이름(owner/name)이 정확한지, 공개 저장소인지 확인해 주세요." }, { status: 404 });
  }

  // emojiHTML(<g-emoji>📣</g-emoji>) 안의 실제 유니코드 추출. 커스텀 img 이모지 등 추출 불가면 빈 값(:shortcode: 노출 방지).
  const stripTags = (s: string) => (s || "").replace(/<[^>]*>/g, "").trim();
  const categories = (repository.discussionCategories?.nodes ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    emoji: stripTags(c.emojiHTML),
  }));

  return NextResponse.json({
    repoId: repository.id,
    discussionsEnabled: !!repository.hasDiscussionsEnabled,
    categories,
  });
}
