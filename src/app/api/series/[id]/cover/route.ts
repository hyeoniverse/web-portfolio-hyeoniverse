import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { createSeriesCover, removeAutoSeriesCover } from "@/lib/seriesCover";

/* POST /api/series/[id]/cover — 제목으로 커버를 (다시) 그려 이 시리즈의 커버로(admin only).
   커버를 지웠던 시리즈 · 자동 커버가 없던 예전 시리즈에 쓴다. 지난 자동 커버 파일은 지운다 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { data: cur, error: readError } = await supabase.from("series").select("id, title, title_en, cover_image").eq("id", id).maybeSingle();
  if (readError) return jsonServerError(readError, "POST /api/series/[id]/cover");
  if (!cur) return jsonError("Series not found", 404);

  try {
    const cover_image = await createSeriesCover(cur);
    const { data, error } = await supabase.from("series").update({ cover_image }).eq("id", id).select().single();
    if (error) return jsonServerError(error, "POST /api/series/[id]/cover");
    await removeAutoSeriesCover(cur.cover_image);
    return jsonOk(data);
  } catch (e) {
    return jsonServerError(e, "POST /api/series/[id]/cover");
  }
}
