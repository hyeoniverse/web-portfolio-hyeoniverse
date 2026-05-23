import { projects } from "@/data/projects";
import type { Project } from "@/data/projects";
import type { Work } from "@/types/work";
import { workToProject } from "@/types/work";

/** 정적 데이터를 DB에 주입 (중복 방지: count 재확인 후 삽입) */
async function seedWorksFromStatic(supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>) {
  if (projects.length === 0) return;

  // Race condition 방지: 삽입 직전에 한번 더 확인
  const { count } = await supabase
    .from("works")
    .select("*", { count: "exact", head: true });
  if (count && count > 0) return;

  const rows = projects.map((p, i) => ({
    number: p.number,
    title: p.title,
    subtitle_ko: p.subtitle.ko,
    subtitle_en: p.subtitle.en,
    categories_ko: p.categories?.ko ?? (p.category.ko ? [p.category.ko] : []),
    categories_en: p.categories?.en ?? (p.category.en ? [p.category.en] : []),
    year: p.year,
    description_ko: p.description.ko,
    description_en: p.description.en,
    role_ko: p.role.ko,
    role_en: p.role.en,
    tech: p.tech,
    image: p.image,
    size: p.size,
    content_ko: p.content.ko,
    content_en: p.content.en,
    gallery: p.gallery,
    live_url: p.liveUrl ?? "",
    github_url: p.githubUrl ?? "",
    published: true,
    sort_order: i,
  }));

  await supabase.from("works").insert(rows);
}

/**
 * Fetch works — DB에서 조회. DB가 비어있으면 정적 데이터를 주입 후 재조회.
 * 정적 데이터도 없으면 빈 배열 반환.
 */
export async function getWorks(): Promise<Project[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return projects;
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("works")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true });

    if (error) return projects;

    // DB 비어있음 → 정적 데이터가 있으면 주입
    if (!data || data.length === 0) {
      if (projects.length === 0) return [];

      await seedWorksFromStatic(supabase);

      // 주입 후 재조회
      const { data: seeded } = await supabase
        .from("works")
        .select("*")
        .eq("published", true)
        .order("sort_order", { ascending: true });

      if (seeded && seeded.length > 0) {
        return (seeded as Work[]).map(workToProject);
      }
      return projects; // seed 실패 시 정적 fallback
    }

    return (data as Work[]).map(workToProject);
  } catch {
    return projects;
  }
}
