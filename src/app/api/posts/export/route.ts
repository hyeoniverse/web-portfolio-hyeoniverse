import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { getUserRole, PERM } from "@/lib/api/roles";
import { requirePostAccess, policyBlocked } from "@/lib/api/requirePostAccess";

function toFrontmatter(post: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  if (post.title) lines.push(`title: "${post.title}"`);
  if (post.slug) lines.push(`slug: ${post.slug}`);
  if (post.category) lines.push(`category: ${post.category}`);
  const tags = post.tags as string[] | undefined;
  if (tags && tags.length > 0) lines.push(`tags: [${tags.join(", ")}]`);
  if (post.excerpt) lines.push(`excerpt: "${post.excerpt}"`);
  if (post.cover_image) lines.push(`cover_image: ${post.cover_image}`);
  if (post.created_at)
    lines.push(`date: ${(post.created_at as string).slice(0, 10)}`);
  lines.push("---");
  return lines.join("\n");
}

// GET /api/posts/export?id=xxx          — 단일 포스트 .md 다운로드
// GET /api/posts/export?all=true        — 전체 포스트 JSON 반환
// GET /api/posts/export?series_id=xxx   — 시리즈 내 포스트 JSON 반환
export async function GET(request: Request) {
  const { supabase, user, error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all") === "true";
  const seriesId = searchParams.get("series_id");


  if (id) {
    /* 단건 내보내기는 대상이 정해져 있다. 세션 클라이언트로만 읽으면 권한 없는 글과
       없는 글이 똑같이 0행이라 있는 글에도 "없음" 이라고 답하게 된다. */
    const access = await requirePostAccess("posts", id);
    if (access.error) return access.error;

    const { data: post, error } = await access.supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !post) return policyBlocked();

    const md = `${toFrontmatter(post)}\n\n${post.content}`;
    const fileName = `${post.slug}.md`;

    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  if (all || seriesId) {
    let query = supabase
      .from("posts")
      .select("*")
      .is("deleted_at", null);

    /* 볼 수 있는 것과 다룰 수 있는 것은 다르다. RLS 만 믿으면 남이 쓴 **발행된** 글까지
       내려간다(공개 읽기 정책). 내보내기는 관리 작업이므로 편집 권한 기준으로 좁힌다.
       owner/admin 은 전부, 저자는 자기 글만. */
    const role = getUserRole(user);
    if (!role.isOwner && role.level < PERM.ADMIN) {
      if (!role.authorId) return NextResponse.json({ files: [] });
      query = query.contains("author_ids", [role.authorId]);
    }

    if (seriesId) query = query.eq("series_id", seriesId).order("series_order", { ascending: true });
    else query = query.order("created_at", { ascending: true });

    const { data: posts, error } = await query;

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const files = (posts ?? []).map((post) => ({
      fileName: `${post.slug}.md`,
      content: `${toFrontmatter(post)}\n\n${post.content}`,
    }));

    return NextResponse.json({ files, count: files.length });
  }

  return NextResponse.json(
    { error: "id, all=true, 또는 series_id 파라미터 필요" },
    { status: 400 },
  );
}
