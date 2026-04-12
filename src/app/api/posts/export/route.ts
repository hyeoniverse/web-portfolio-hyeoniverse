import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

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

// GET /api/posts/export?id=xxx — 단일 포스트 .md 다운로드
// GET /api/posts/export?all=true — 전체 포스트 JSON(frontmatter+content) 반환
export async function GET(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all") === "true";
  const admin = createAdminClient();

  if (id) {
    const { data: post, error } = await admin
      .from("posts")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !post)
      return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const md = `${toFrontmatter(post)}\n\n${post.content}`;
    const fileName = `${post.slug}.md`;

    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  if (all) {
    const { data: posts, error } = await admin
      .from("posts")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const files = (posts ?? []).map((post) => ({
      fileName: `${post.slug}.md`,
      content: `${toFrontmatter(post)}\n\n${post.content}`,
    }));

    return NextResponse.json({ files, count: files.length });
  }

  return NextResponse.json(
    { error: "id 또는 all=true 파라미터 필요" },
    { status: 400 },
  );
}
