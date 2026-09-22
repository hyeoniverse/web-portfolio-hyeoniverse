import { cache } from "react";
import { projects } from "@/data/projects";
import type { Project } from "@/data/projects";
import type { Work } from "@/types/work";
import { workToProject } from "@/types/work";

/**
 * 발행된 작업물 — DB 에서 읽는다. 표가 비었거나 전부 미발행이면 빈 배열이고, 목록 화면은 빈 화면을 그린다.
 *
 * 정적 데이터(data/projects.ts)는 DB 를 쓸 수 없을 때(환경변수 없음·조회 실패)만 대신 쓴다. 홈(getHomeWorks)과 같다.
 * 예전에는 표가 비어 있으면 정적 데이터를 발행 상태로 DB 에 넣었다(seed). 그래서 관리자에서 작업물을 모두
 * 영구 삭제하면, 다음에 누가 /works 목록이나 작업물 상세를 여는 순간 데모 작업물 7개가 발행된 채로 되살아났다.
 */
async function fetchWorks(): Promise<Project[]> {
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
    return ((data ?? []) as Work[]).map(workToProject);
  } catch {
    return projects;
  }
}

/** 요청 안에서는 한 번만 조회한다 — 작업물 상세의 레이아웃·메타데이터·페이지가 함께 부른다(#891) */
export const getWorks = cache(fetchWorks);
