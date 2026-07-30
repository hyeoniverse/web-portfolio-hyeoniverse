import { NextResponse } from "next/server";
import { QUERY_PARAM } from "@/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPopularPostIds } from "@/lib/popularity";

/** GET /api/posts/popular-ids?limit=5
 *  score (view + like*3 + comments*5) top N post id 리스트.
 *  PostsClient HOT 배지, admin 삭제 보호 모두 이 endpoint 결과 사용. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get(QUERY_PARAM.limit) ?? "5")));

  const admin = createAdminClient();
  const ids = await getPopularPostIds(admin, limit);

  return NextResponse.json({ ids: Array.from(ids) });
}
