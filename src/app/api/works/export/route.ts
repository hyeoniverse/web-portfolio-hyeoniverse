import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

function toFrontmatter(work: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  if (work.title) lines.push(`title: "${work.title}"`);
  if (work.subtitle_ko) lines.push(`subtitle: "${work.subtitle_ko}"`);
  const catsKo = Array.isArray(work.categories_ko) ? work.categories_ko as string[] : [];
  if (catsKo.length > 0) lines.push(`category: ${catsKo.join(", ")}`);
  if (work.nature_ko) lines.push(`nature: ${work.nature_ko}`);
  if (work.year) lines.push(`year: ${work.year}`);
  const tech = work.tech as string[] | undefined;
  if (tech && tech.length > 0) lines.push(`tech: [${tech.join(", ")}]`);
  if (work.description_ko) lines.push(`description: "${work.description_ko}"`);
  if (work.role_ko) lines.push(`role: "${work.role_ko}"`);
  if (work.image) lines.push(`image: ${work.image}`);
  if (work.live_url) lines.push(`live_url: ${work.live_url}`);
  if (work.github_url) lines.push(`github_url: ${work.github_url}`);
  lines.push("---");
  return lines.join("\n");
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// GET /api/works/export?id=xxx — 단일 작업물 .md 다운로드
// GET /api/works/export?all=true — 전체 작업물 JSON 반환
export async function GET(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all") === "true";
  const admin = createAdminClient();

  if (id) {
    const { data: work, error } = await admin
      .from("works")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !work)
      return NextResponse.json({ error: "Work not found" }, { status: 404 });

    const md = `${toFrontmatter(work)}\n\n${work.content_ko}`;
    const fileName = `${slugify(work.title)}.md`;

    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  if (all) {
    const { data: works, error } = await admin
      .from("works")
      .select("*")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const files = (works ?? []).map((work) => ({
      fileName: `${slugify(work.title)}.md`,
      content: `${toFrontmatter(work)}\n\n${work.content_ko}`,
    }));

    return NextResponse.json({ files, count: files.length });
  }

  return NextResponse.json(
    { error: "id 또는 all=true 파라미터 필요" },
    { status: 400 },
  );
}
