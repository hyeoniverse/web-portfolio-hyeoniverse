import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { getUserRole, canEditPost } from "@/lib/api/roles";
import { notifyAdmin } from "@/lib/adminNotify";
import { formatPostTitle } from "@/utils/post";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/posts/[id]/request-access — 이 글에 대한 권한을 소유자에게 요청
 *
 * "소유자에게 요청해 주세요" 로 끝내면 요청할 방법이 화면 밖에 있다. 요청을 남길 수 있게 한다.
 * 권한을 주는 것은 아니고, 소유자 알림에 요청을 쌓아 둘 뿐이다 — 부여는 설정 › 저자에서 한다.
 *
 * 조회는 service_role 로 한다. 요청자는 이 글을 볼 수 없는 사람이고(그래서 요청하는 것이다),
 * 세션 클라이언트로 읽으면 정책이 걸러 제목조차 알 수 없다.
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("posts")
    .select("id, title, title_en, author_ids")
    .eq("id", id)
    .maybeSingle();

  if (!post) return jsonError("not found", 404);

  const role = getUserRole(auth.user);
  // 이미 다룰 수 있는 글이면 요청할 것이 없다.
  if (canEditPost(role, post.author_ids as string[] | null)) {
    return jsonError("이미 이 글을 다룰 수 있습니다.", 400);
  }

  const who = auth.user.email ?? auth.user.id;
  const title = formatPostTitle(post as Parameters<typeof formatPostTitle>[0]) || "제목 없음";

  await notifyAdmin({
    type: "access_request",
    title: "권한 요청",
    message: `${who} 님이 "${title}" 글에 대한 권한을 요청했습니다.`,
    metadata: { postId: post.id, requestedBy: who, userId: auth.user.id, authorId: role.authorId },
  });

  return NextResponse.json({ ok: true });
}
