import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonOk } from "@/lib/api/response";

interface ReportRow {
  id: string;
  comment_id: string;
  comment_type: "post" | "work";
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
}

/** GET /api/admin/reports?status=pending|resolved|dismissed|all
 *  목록 + 신고된 댓글 본문 join. 비인증 시에도 200 + 빈 리스트 (info leak 방지). */
export async function GET(request: Request) {
  /* 신고 목록은 중재 데이터다(신고자 해시·신고된 본문). 가드가 아예 없어서
     /api/admin 프록시가 요구하는 "로그인" 만 통과하면 레벨 1 저자도 전부 읽을 수 있었다.
     같은 테이블을 다루는 reports/[id] 는 이미 admin 등급이라 앞뒤도 맞지 않았다. */
  const { error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonOk({ reports: [], pendingCount: 0 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "pending";

  try {
    const admin = createAdminClient();

    let query = admin
      .from("comment_reports")
      .select("id, comment_id, comment_type, reason, status, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: rawReports, error } = await query;
    if (error) {
      console.warn("[admin/reports] query failed:", error.message);
      return jsonOk({ reports: [], pendingCount: 0 });
    }

    const reports = (rawReports ?? []) as ReportRow[];

    // 댓글 본문 + slug join — post / work 따로 fetch 해서 합침
    const postIds = reports.filter((r) => r.comment_type === "post").map((r) => r.comment_id);
    const workIds = reports.filter((r) => r.comment_type === "work").map((r) => r.comment_id);

    const [postRes, workRes] = await Promise.all([
      postIds.length > 0
        ? admin
            .from("comments")
            .select("id, content, nickname, is_deleted, post_id, posts:post_id(slug, title)")
            .in("id", postIds)
        : Promise.resolve({ data: [] }),
      workIds.length > 0
        ? admin
            .from("work_comments")
            .select("id, content, nickname, is_deleted, work_id, works:work_id(slug, title)")
            .in("id", workIds)
        : Promise.resolve({ data: [] }),
    ]);

    type CommentRow = {
      id: string;
      content: string;
      nickname: string;
      is_deleted: boolean;
      posts?: { slug?: string; title?: string };
      works?: { slug?: string; title?: string };
    };
    const postMap = new Map<string, CommentRow>(((postRes.data ?? []) as CommentRow[]).map((c) => [c.id, c]));
    const workMap = new Map<string, CommentRow>(((workRes.data ?? []) as CommentRow[]).map((c) => [c.id, c]));

    const enriched = reports.map((r) => {
      const c = r.comment_type === "post" ? postMap.get(r.comment_id) : workMap.get(r.comment_id);
      const parent = c?.posts ?? c?.works;
      return {
        ...r,
        comment: c
          ? {
              content: c.content,
              nickname: c.nickname,
              is_deleted: c.is_deleted,
              parentSlug: parent?.slug ?? null,
              parentTitle: parent?.title ?? null,
            }
          : null,
      };
    });

    /* 상태별 실제 총계 — 필터 칩이 "지금 보고 있는 목록의 길이" 가 아니라 각 상태에 몇 건이
       밀려 있는지를 보여줘야 어디를 열어야 할지 알 수 있다. */
    const countBy = (status?: "pending" | "resolved" | "dismissed") => {
      const q = admin.from("comment_reports").select("*", { count: "exact", head: true });
      return status ? q.eq("status", status) : q;
    };
    const [pendingRes, resolvedRes, dismissedRes, allRes] = await Promise.all([
      countBy("pending"), countBy("resolved"), countBy("dismissed"), countBy(),
    ]);

    return jsonOk({
      reports: enriched,
      pendingCount: pendingRes.count ?? 0,
      statusCounts: {
        pending: pendingRes.count ?? 0,
        resolved: resolvedRes.count ?? 0,
        dismissed: dismissedRes.count ?? 0,
        all: allRes.count ?? 0,
      },
    });
  } catch (e) {
    console.warn("[admin/reports] unexpected error:", e);
    return jsonOk({ reports: [], pendingCount: 0 });
  }
}
