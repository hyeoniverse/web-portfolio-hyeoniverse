import { createAdminClient } from "@/lib/supabase/admin";
import { getIp } from "@/utils/getIp";
import { jsonOk } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/posts/[id]/view — 조회수 증가 (IP+date 로 1일 1회 dedup)
// 누적 카운터(posts.view_count) + 시계열(post_views) 둘 다 IP 별 1일 1회만 증가.
// 이전엔 인증/dedup 없어 curl 루프로 조회수 무한 inflation + post_views DB 폭증 가능했음.
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const ip = getIp(request);
  const admin = createAdminClient();

  // 오늘 같은 IP 가 같은 글을 이미 봤는지 확인
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count: already } = await admin
    .from("post_views")
    .select("id", { count: "exact", head: true })
    .eq("post_id", id)
    .eq("ip", ip)
    .gte("viewed_at", todayStart.toISOString());

  if (already && already > 0) {
    // 이미 카운트됨 — silently 성공 반환 (클라엔 행동 변화 없음)
    return jsonOk({ success: true, deduped: true });
  }

  const { data: post } = await admin
    .from("posts")
    .select("view_count")
    .eq("id", id)
    .single();

  if (post) {
    await Promise.all([
      admin
        .from("posts")
        .update({ view_count: (post.view_count ?? 0) + 1 })
        .eq("id", id),
      admin
        .from("post_views")
        .insert({ post_id: id, ip }),
    ]);
  }

  return jsonOk({ success: true });
}
