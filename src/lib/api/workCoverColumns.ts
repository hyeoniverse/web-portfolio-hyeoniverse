import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * works.cover_position / cover_zoom 칸이 아직 없는 DB 에서도 작업물 저장이 되게 한다.
 *
 * 커버 위치 · 확대는 마이그레이션(2026_10_20_works_cover_position.sql)을 적용해야 생긴다.
 * 적용 전 DB 에 그 칸을 담아 쓰면 PostgREST 가 "칸을 찾을 수 없다"(PGRST204)로 저장을 통째로 거절해,
 * 위치와 상관없는 제목 · 본문 저장까지 막힌다. 칸이 없으면 두 칸만 빼고 저장하고, 뺐다는 사실을
 * 응답 헤더(WORK_COVER_DROPPED_HEADER)로 알린다 — 편집 화면이 "마이그레이션을 적용해야 위치가 저장된다" 고 안내한다.
 * galleryNotesColumn 과 같은 방식이다.
 */
export const WORK_COVER_DROPPED_HEADER = "x-work-cover-dropped";

const COVER_FIELDS = ["cover_position", "cover_zoom"] as const;

/* 한 번 있다고 확인하면 다시 묻지 않는다. 없다는 결과는 기억하지 않는다 — 곧 적용될 수 있다 */
let columnsExist = false;

function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return /cover_(position|zoom)/.test(error.message ?? "") && (error.code === "PGRST204" || error.code === "42703");
}

/** fields 에 커버 위치 · 확대가 있는데 DB 에 칸이 없으면 fields 에서 뺀다. 뺐으면 true */
export async function dropWorkCoverIfMissing(
  client: SupabaseClient,
  fields: Record<string, unknown>,
): Promise<boolean> {
  if (!COVER_FIELDS.some((f) => f in fields) || columnsExist) return false;
  const { error } = await client.from("works").select(COVER_FIELDS.join(",")).limit(1);
  if (!error) {
    columnsExist = true;
    return false;
  }
  if (!isMissingColumn(error)) return false;
  for (const f of COVER_FIELDS) delete fields[f];
  return true;
}
