import { projects } from "@/data/projects";
import type { Project } from "@/data/projects";
import type { Work } from "@/types/work";
import { workToProject } from "@/types/work";

/**
 * Fetch works — Supabase가 설정되어 있으면 DB에서, 아니면 정적 데이터에서 반환.
 * published=true 만 반환 (admin은 API route에서 직접 조회).
 */
export async function getWorks(): Promise<Project[]> {
  // Supabase 미설정 → 정적 fallback
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

    if (error || !data || data.length === 0) {
      return projects;
    }

    return (data as Work[]).map(workToProject);
  } catch {
    return projects;
  }
}

/** 단일 work 조회 (상세 페이지용) */
export async function getWorkById(id: string): Promise<Project | undefined> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return projects.find((p) => p.id === id);
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("works")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      // DB에 없으면 정적 데이터에서 fallback
      return projects.find((p) => p.id === id);
    }

    return workToProject(data as Work);
  } catch {
    return projects.find((p) => p.id === id);
  }
}
