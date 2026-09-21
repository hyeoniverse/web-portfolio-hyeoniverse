import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { getRepoProjectsBySlug } from "@/lib/getWorksProjects";
import { renumberWorks } from "@/lib/api/placeWork";
import type { Project } from "@/data/projects";

/**
 * POST /api/works/showcase/import — 목록을 채우고 있는 GitHub 저장소를 편집 가능한 작업물로 들인다.
 *
 * 저장소는 DB 에 행이 없어서 편집할 대상이 없었다(#1062). 여기서 README 로 만든 내용을 그대로
 * 작업물 행으로 옮겨 두면 편집 화면이 열리고, 그 뒤로는 보통 작업물과 다를 게 없다.
 *
 * **발행 상태로 들인다.** 저장소로 만든 상세 페이지는 이미 공개 화면에 나가 있다. 그것을 행으로
 * 옮겨 놓고 관리 화면에서만 "임시저장" 이라고 적으면, 같은 것이 한쪽에선 공개고 한쪽에선 초안이라
 * 서로 어긋난다. 공개 화면에 보이는 것은 발행됨이어야 한다.
 *
 * 들이는 순간부터 목록은 저장소 대신 이 행들을 보여 준다(getWorks 가 발행된 것을 찾으면 그걸 쓴다).
 * 그래서 목록의 "저장소 N개 가져오기" 는 한꺼번에 들여 같은 목록이 그대로 이어지게 한다.
 *
 * 같은 slug 가 이미 있으면 새로 만들지 않는다(두 번 눌러도 사본이 생기지 않는다). overwrite 를
 * 주면 그 행의 내용을 README 에서 새로 가져와 덮는다 — 발행 여부·차례·id 는 그대로 두므로
 * 주소와 좋아요·댓글이 유지된다. 손으로 고친 제목·설명은 덮인다(그래서 화면에서 한 번 더 묻는다).
 *
 * 발행에 필요한 칸(분류·성격·연도·대표 이미지·본문)은 저장소 단서로 고른 값으로 채운다(repoToProject).
 * 이미 들인 행은 덮어쓰지 않을 때도 **비어 있는 필수 칸만** 채운다 — 예전에 들인 작업물이 필수 칸이 비어
 * 저장이 막히던 것을 다시 불러오기만 해서 풀 수 있게. 손으로 채운 칸은 건드리지 않는다.
 */

type ExistingRow = {
  id: string;
  slug: string;
  categories_ko: string[] | null;
  categories_en: string[] | null;
  nature_ko: string | null;
  nature_en: string | null;
  year: string | null;
  image: string | null;
  content_ko: string | null;
  content_en: string | null;
};

const blank = (v: string | null | undefined) => !v || !v.trim();

/** 들여올 값 가운데 기존 행에서 비어 있는 필수 칸만 */
function missingRequired(row: ExistingRow, repo: Project): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (!row.categories_ko?.length && repo.categories?.ko.length) patch.categories_ko = repo.categories.ko;
  if (!row.categories_en?.length && repo.categories?.en.length) patch.categories_en = repo.categories.en;
  if (blank(row.nature_ko) && repo.nature?.ko) patch.nature_ko = repo.nature.ko;
  if (blank(row.nature_en) && repo.nature?.en) patch.nature_en = repo.nature.en;
  if (blank(row.year) && repo.year) patch.year = repo.year;
  if (blank(row.image) && repo.image) patch.image = repo.image;
  // 본문은 두 언어 중 하나만 있어도 발행된다 — 둘 다 비었을 때만 채운다
  if (blank(row.content_ko) && blank(row.content_en)) {
    patch.content_ko = repo.content.ko;
    patch.content_en = repo.content.en;
  }
  return patch;
}
export async function POST(request: Request) {
  const { supabase, error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  /* 이미 들인 저장소를 다시 고른 경우 — 내용을 새로 가져올지 */
  const overwrite = body?.overwrite === true;
  /* slug 하나(상세 화면의 편집) 또는 여럿(목록의 "모두 가져오기") */
  const slugs: string[] = typeof body?.slug === "string"
    ? [body.slug]
    : Array.isArray(body?.slugs) ? body.slugs.filter((s: unknown) => typeof s === "string") : [];

  const projects = await getRepoProjectsBySlug(slugs);
  const repos = projects.filter((p) => p.external && (slugs.length === 0 || slugs.includes(p.slug ?? "")));
  if (slugs.length > 0 && repos.length === 0) {
    return jsonError("Repository not found", 404, { code: "GITHUB_REPO_NOT_FOUND" });
  }
  if (repos.length === 0) return NextResponse.json({ ids: [], created: 0 });

  /* 이미 들여 둔 것은 다시 만들지 않는다 — 두 번 눌러도 사본이 생기지 않는다 */
  const { data: rows } = await supabase
    .from("works")
    .select("id, slug, categories_ko, categories_en, nature_ko, nature_en, year, image, content_ko, content_en")
    .in("slug", repos.map((p) => p.slug ?? ""));
  const existingRows = new Map(((rows ?? []) as ExistingRow[]).map((r) => [r.slug, r]));
  const existing = new Map([...existingRows].map(([slug, r]) => [slug, r.id]));

  /* 휴지통에 든 행은 빼고 센다 — 거기 큰 번호가 남아 있으면 새 행이 그 뒤로 건너뛴다 */
  const { data: maxRow } = await supabase
    .from("works")
    .select("sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let order = (maxRow?.sort_order ?? 0) + 1;

  /* 이미 있는 행 — overwrite 면 README 에서 새로 가져와 덮고, 아니면 비어 있는 필수 칸만 채운다.
     분류·성격은 덮어쓸 때도 비어 있을 때만 채운다(손으로 고른 값을 저장소 추측으로 바꾸지 않는다) */
  const again = repos.filter((p) => existingRows.has(p.slug ?? ""));
  if (!overwrite) {
    await Promise.all(again.map((repo) => {
      const row = existingRows.get(repo.slug ?? "")!;
      const patch = missingRequired(row, repo);
      return Object.keys(patch).length ? supabase.from("works").update(patch).eq("id", row.id) : null;
    }));
  }
  if (overwrite) {
    await Promise.all(again.map((repo) => supabase
      .from("works")
      .update({
        ...missingRequired(existingRows.get(repo.slug ?? "")!, repo),
        title: repo.title.ko,
        title_en: repo.title.en,
        subtitle_ko: repo.subtitle.ko,
        subtitle_en: repo.subtitle.en,
        year: repo.year,
        description_ko: repo.description.ko,
        description_en: repo.description.en,
        tech: repo.tech,
        image: repo.image,
        content_ko: repo.content.ko,
        content_en: repo.content.en,
        content_type: repo.contentType ?? "markdown",
        github_url: repo.githubUrl ?? "",
      })
      .eq("id", existing.get(repo.slug ?? ""))));
  }

  const fresh = repos.filter((p) => !existing.has(p.slug ?? ""));
  const inserted: { id: string; slug: string }[] = [];
  if (fresh.length > 0) {
    const { data, error } = await supabase
      .from("works")
      .insert(fresh.map((repo) => ({
        slug: repo.slug ?? "",
        title: repo.title.ko,
        title_en: repo.title.en,
        subtitle_ko: repo.subtitle.ko,
        subtitle_en: repo.subtitle.en,
        categories_ko: repo.categories?.ko ?? [],
        categories_en: repo.categories?.en ?? [],
        nature_ko: repo.nature?.ko ?? "",
        nature_en: repo.nature?.en ?? "",
        year: repo.year,
        description_ko: repo.description.ko,
        description_en: repo.description.en,
        tech: repo.tech,
        image: repo.image,
        content_ko: repo.content.ko,
        content_en: repo.content.en,
        content_type: repo.contentType ?? "markdown",
        gallery: repo.gallery ?? [],
        github_url: repo.githubUrl ?? "",
        published: true,
        sort_order: order++,
      })))
      .select("id, slug");
    if (error) return jsonServerError(error, "POST /api/works/showcase/import");
    inserted.push(...((data ?? []) as { id: string; slug: string }[]));
    /* 번호는 목록에 그대로 찍히므로 1..N 으로 촘촘하게 맞춘다 */
    await renumberWorks(supabase);
  }

  const idBySlug = new Map([...existing, ...inserted.map((r) => [r.slug, r.id] as const)]);
  /* 하나만 요청했으면 그 id 를 바로 돌려준다 — 상세 화면이 편집 화면으로 넘어가는 데 쓴다 */
  if (slugs.length === 1) {
    const id = idBySlug.get(slugs[0]);
    return NextResponse.json({ id, created: inserted.length > 0 }, { status: inserted.length > 0 ? 201 : 200 });
  }
  return NextResponse.json({ ids: [...idBySlug.values()], created: inserted.length }, { status: inserted.length > 0 ? 201 : 200 });
}
