/* 글 본문 중 어떤 표시(예: data-calendar-id=)가 든 것만 가져온다 — 라이브러리 탭이
   "이 자료를 어디서 쓰나"를 셀 때 쓴다. 휴지통 글은 뺀다. */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ContentRow {
  id: string;
  title: string;
  slug: string;
  html: string[];
}

/** marker 가 든 글 (marker 는 ilike 패턴 조각, 예: "data-poll-id="). publishedOnly 면 공개된 것만.
 *  작업물은 랜딩으로만 그려 본문(블록이 들어갈 칸)이 없다 — works 는 늘 빈 목록이고, 호출부의 모양은 그대로 둔다 */
export async function fetchContentRows(supabase: SupabaseClient, marker: string, opts: { publishedOnly?: boolean } = {}): Promise<{ posts: ContentRow[]; works: ContentRow[] }> {
  const like = `%${marker}%`;
  let postsQ = supabase.from("posts").select("id, title, slug, content, content_en").is("deleted_at", null)
    .or(`content.ilike.${like},content_en.ilike.${like}`);
  if (opts.publishedOnly) postsQ = postsQ.eq("published", true);
  const posts = await postsQ;
  if (posts.error) throw posts.error;
  type Row = Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    posts: ((posts.data ?? []) as Row[]).map((r) => ({ id: str(r.id), title: str(r.title), slug: str(r.slug), html: [str(r.content), str(r.content_en)] })),
    works: [],
  };
}
