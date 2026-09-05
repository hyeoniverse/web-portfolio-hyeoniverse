import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";

/**
 * GET /api/admin/dashboard/category?name=NAME
 * 특정 카테고리의 발행된 게시물 목록 (조회수 내림차순, top 5).
 * 대시보드 카테고리 도넛 클릭 시 inline expand 용.
 */
export async function GET(request: Request) {
  /* 사이트 전체 통계·중재 데이터라 admin 등급 이상만 본다. requireAuth 만 있을 때는
     레벨 1 저자도 방문 통계·댓글·알림 집계를 볼 수 있었다.
     집계는 요청자 시야로 좁히면 안 되므로(저자 세션으로 읽으면 자기 글만 잡힌다)
     조회 자체는 service_role 을 유지하고, 대신 라우트를 등급으로 막는다. */
  const { error: authError } = await requireRole(PERM.ADMIN);
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

  if (error) return jsonServerError(error, "GET /api/admin/dashboard/category");

  return jsonOk({ posts: data ?? [] });
}
