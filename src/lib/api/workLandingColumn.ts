import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * works.landing 칸이 아직 없는 DB 에서도 작업물 저장이 되게 한다(2026_10_24_works_landing.sql 적용 전).
 * 칸이 없으면 그 칸만 빼고 저장하고, 뺐다는 사실을 응답 헤더로 알린다 — 편집 화면이 "마이그레이션을 적용해야 랜딩이 저장된다"고 안내한다.
 */
export const WORK_LANDING_DROPPED_HEADER = "x-work-landing-dropped";

let columnExists = false;

/** fields 에 landing 이 있는데 DB 에 칸이 없으면 fields 에서 뺀다. 뺐으면 true */
export async function dropWorkLandingIfMissing(client: SupabaseClient, fields: Record<string, unknown>): Promise<boolean> {
  if (!("landing" in fields) || columnExists) return false;
  const { error } = await client.from("works").select("landing").limit(1);
  if (!error) { columnExists = true; return false; }
  if (!/landing/.test(error.message ?? "") || (error.code !== "PGRST204" && error.code !== "42703")) return false;
  delete fields.landing;
  return true;
}
