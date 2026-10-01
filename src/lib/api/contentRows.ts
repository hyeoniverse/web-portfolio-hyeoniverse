/* 글·프로젝트 본문 중 어떤 표시(예: data-calendar-id=)가 든 것만 가져온다 — 라이브러리 탭이
   "이 자료를 어디서 쓰나"를 셀 때 쓴다. 휴지통 글은 뺀다. */
import type { SupabaseClient } from "@supabase/supabase-js";

/** 블록이 들어갈 수 있는 프로젝트 본문 칸 — 프로젝트 편집기에서 리치 텍스트로 쓰는 칸들 */
export const WORK_HTML_COLS = ["content_ko", "content_en", "overview_ko", "overview_en", "challenge_ko", "challenge_en", "solution_ko", "solution_en", "description_ko", "description_en"] as const;

export interface ContentRow {
  id: string;
  title: string;
  slug: string;
  html: string[];
}

/** marker 가 든 글·프로젝트 (marker 는 ilike 패턴 조각, 예: "data-poll-id=") */
export async function fetchContentRows(supabase: SupabaseClient, marker: string): Promise<{ posts: ContentRow[]; works: ContentRow[] }> {
  const like = `%${marker}%`;
  const [posts, works] = await Promise.all([
    supabase.from("posts").select("id, title, slug, content, content_en").is("deleted_at", null)
      .or(`content.ilike.${like},content_en.ilike.${like}`),
    supabase.from("works").select(`id, title, slug, ${WORK_HTML_COLS.join(", ")}`).is("deleted_at", null)
      .or(WORK_HTML_COLS.map((c) => `${c}.ilike.${like}`).join(",")),
  ]);
  if (posts.error) throw posts.error;
  if (works.error) throw works.error;
  type Row = Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    posts: ((posts.data ?? []) as Row[]).map((r) => ({ id: str(r.id), title: str(r.title), slug: str(r.slug), html: [str(r.content), str(r.content_en)] })),
    works: ((works.data ?? []) as unknown as Row[]).map((r) => ({ id: str(r.id), title: str(r.title), slug: str(r.slug), html: WORK_HTML_COLS.map((c) => str(r[c])) })),
  };
}
