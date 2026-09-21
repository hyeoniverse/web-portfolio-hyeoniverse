import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * works.gallery_notes 칸이 아직 없는 DB 에서도 작업물 저장이 되게 한다.
 *
 * 슬라이드 음성(gallery_notes)은 마이그레이션(2026_09_21_works_gallery_notes.sql)을 적용해야 생긴다.
 * 적용 전 DB 에 그 칸을 담아 쓰면 PostgREST 가 "칸을 찾을 수 없다"(PGRST204)로 저장을 통째로 거절해,
 * 음성과 상관없는 제목·본문 저장까지 막혔다. 칸이 없으면 그 칸만 빼고 저장하고, 뺐다는 사실을
 * 응답 헤더(GALLERY_NOTES_DROPPED_HEADER)로 알린다 — 편집 화면이 "마이그레이션을 적용해야 음성이 저장된다" 고 안내한다.
 */
export const GALLERY_NOTES_DROPPED_HEADER = "x-gallery-notes-dropped";

/* 한 번 있다고 확인하면 다시 묻지 않는다. 없다는 결과는 기억하지 않는다 — 곧 적용될 수 있다 */
let columnExists = false;

function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return /gallery_notes/.test(error.message ?? "") && (error.code === "PGRST204" || error.code === "42703");
}

/** fields 에 gallery_notes 가 있는데 DB 에 칸이 없으면 fields 에서 뺀다. 뺐으면 true */
export async function dropGalleryNotesIfMissing(
  client: SupabaseClient,
  fields: Record<string, unknown>,
): Promise<boolean> {
  if (!("gallery_notes" in fields) || columnExists) return false;
  const { error } = await client.from("works").select("gallery_notes").limit(1);
  if (!error) {
    columnExists = true;
    return false;
  }
  if (!isMissingColumn(error)) return false;
  delete fields.gallery_notes;
  return true;
}
