import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";

/**
 * GET /api/admin/dashboard/category?name=NAME
 * 특정 카테고리의 발행된 게시물 목록 (조회수 내림차순, top 5).
 * 대시보드 카테고리 도넛 클릭 시 inline expand 용.
 */
export async function GET(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  if (!name) return jsonError("missing category name", 400);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("posts")
    .select("id, title, slug, view_count, published, updated_at")
    .is("deleted_at", null)
    .eq("published", true)
    .eq("category", name)
    .order("view_count", { ascending: false })
    .limit(5);

  if (error) return jsonServerError(error);

  return jsonOk({ posts: data ?? [] });
}
