import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { getSiteConfig } from "@/lib/getSiteConfig";
import type { Author } from "@/types/author";
import type { AccessRequestOutcome } from "@/lib/notificationTypes";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/notifications/[id]/resolve — 권한 요청 알림을 그 자리에서 처리
 *
 * body: { action: "grant" | "reject" }
 *
 * 권한 요청은 결정을 내려야 하는 알림인데 처리 경로가 없었다. 알림에는 요청자와 대상 글의
 * id 만 남고, 실제 부여는 글 편집 화면의 작성자 칩이나 작업물의 팀원 목록에서 따로 해야 했다.
 * 알림을 보고 → 어느 글인지 찾아가고 → 거기서 다시 요청자를 고르는 세 단계가 필요했다.
 *
 * 부여는 요청 종류에 따라 다른 자리에 쓴다.
 *   글      posts.author_ids 에 요청자의 저자 프로필을 추가 — canEditPost 가 이걸 본다
 *   작업물  works.team_members 에 항목 추가 — canEditWork 가 author_id 로 판정한다
 *
 * 세션 클라이언트로 쓴다. 관리자는 정책상 모든 글을 수정할 수 있고(can_edit_post 의 level>=2),
 * 작업물도 is_admin() 으로 통과하므로 service_role 이 필요 없다.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  /* 권한을 주고 뺏는 결정이라 관리자 이상만 한다 — 작업물 팀원 변경을 관리자로 제한한 것과 같은 기준. */
  const { supabase, error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = body.action;
  if (action !== "grant" && action !== "reject") {
    return NextResponse.json({ error: "action must be grant or reject" }, { status: 400 });
  }

  const { data: notif, error: readErr } = await supabase
    .from("admin_notifications")
    .select("id, type, metadata, read")
    .eq("id", id)
    .maybeSingle();

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!notif) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (notif.type !== "access_request") {
    return NextResponse.json({ error: "권한 요청 알림이 아닙니다." }, { status: 400 });
  }

  const metadata = (notif.metadata ?? {}) as Record<string, string>;
  if (metadata.resolved) {
    return NextResponse.json({ error: "이미 처리된 요청입니다." }, { status: 400 });
  }

  const authorId = metadata.authorId;
  const postId = metadata.postId;
  const workId = metadata.workId;

  if (action === "grant") {
    /* 저자 프로필이 없으면 줄 대상이 없다. 권한은 계정이 아니라 저자 프로필(author_id)에 붙는다. */
    if (!authorId) {
      return NextResponse.json(
        { error: "요청자에게 연결된 저자 프로필이 없어 권한을 부여할 수 없습니다. 멤버 설정에서 프로필을 먼저 만들어 주세요." },
        { status: 400 },
      );
    }

    if (postId) {
      const { data: post, error } = await supabase
        .from("posts").select("author_ids").eq("id", postId).maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!post) return NextResponse.json({ error: "대상 글이 없습니다. 삭제된 것 같습니다." }, { status: 404 });

      const current = Array.isArray(post.author_ids) ? (post.author_ids as string[]) : [];
      if (!current.includes(authorId)) {
        const { error: updErr } = await supabase
          .from("posts").update({ author_ids: [...current, authorId] }).eq("id", postId);
        if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    } else if (workId) {
      const { data: work, error } = await supabase
        .from("works").select("team_members").eq("id", workId).maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!work) return NextResponse.json({ error: "대상 작업물이 없습니다. 삭제된 것 같습니다." }, { status: 404 });

      const current = Array.isArray(work.team_members)
        ? (work.team_members as { author_id?: string; name?: string }[])
        : [];
      if (!current.some((m) => m?.author_id === authorId)) {
        /* 표시 이름은 저자 프로필에서 가져온다 — 팀원 카드에 이메일이 그대로 뜨지 않게. */
        const config = await getSiteConfig();
        const author = ((config.authors as Author[] | undefined) ?? []).find((a) => a.id === authorId);
        const { error: updErr } = await supabase
          .from("works")
          .update({
            team_members: [
              ...current,
              {
                author_id: authorId,
                name: author?.name || metadata.requestedBy || authorId,
                role_ko: "",
                role_en: "",
                ...(author?.avatar ? { avatar_url: author.avatar } : {}),
                ...(author?.email ? { email: author.email } : {}),
              },
            ],
          })
          .eq("id", workId);
        if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "요청 대상을 알 수 없는 알림입니다." }, { status: 400 });
    }
  }

  const outcome: AccessRequestOutcome = action === "grant" ? "granted" : "rejected";
  /* 결정을 내렸으면 읽음이다 — 목록의 "처리 필요" 판정이 read 하나를 기준으로 돈다. */
  const { error: markErr } = await supabase
    .from("admin_notifications")
    .update({
      read: true,
      metadata: { ...metadata, resolved: outcome, resolvedAt: new Date().toISOString() },
    })
    .eq("id", id);
  if (markErr) return NextResponse.json({ error: markErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, resolved: outcome });
}
