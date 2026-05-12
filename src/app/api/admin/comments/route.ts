import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonOk } from "@/lib/api/response";

/**
 * GET /api/admin/comments — admin 모더레이션용 통합 댓글 조회
 *
 * Query params:
 * - source: "posts" | "works" | "all" (default: "all")
 * - status: "active" | "deleted" | "all" (default: "active")
 * - search: 닉네임/내용 검색
 * - page: 1-indexed
 * - limit: 페이지당 (default 20, max 100)
 *
 * Returns: { items: Comment[], total: number, page, limit }
 */

/** PostgREST `or` 필터 안에서 안전하도록 검색어 escape — %/_ 는 LIKE wildcard, , 와 () 는 OR 구조 자체를 깨뜨릴 수 있음 */
function escapeOrSearch(s: string): string {
  return s.replace(/[%_,()\\]/g, (m) => `\\${m}`);
}

export async function GET(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const source = (searchParams.get("source") ?? "all") as "posts" | "works" | "all";
  const status = (searchParams.get("status") ?? "active") as "active" | "deleted" | "all";
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const offset = (page - 1) * limit;

  const admin = createAdminClient();

  type Row = {
    id: string;
    post_id?: string;
    work_id?: string;
    parent_id: string | null;
    nickname: string;
    content: string;
    is_admin: boolean;
    is_deleted: boolean;
    deleted_by: string | null;
    created_at: string;
    source: "posts" | "works";
    target_title?: string;
    target_slug?: string;
  };

  /**
   * 한 테이블 쿼리 + post/work 정보 join + 필터.
   * fetchLimit 까지만 가져옴 — `source === "all"` 일 때 합치고 잘라야 하므로 offset+limit 만큼 충분.
   */
  async function queryTable(
    table: "comments" | "work_comments",
    fkey: "post_id" | "work_id",
    fetchLimit: number,
  ) {
    let q = admin
      .from(table)
      .select(
        "id, " + fkey + ", parent_id, nickname, content, is_admin, is_deleted, deleted_by, created_at",
        { count: "exact" },
      );
    if (status === "active") q = q.eq("is_deleted", false);
    else if (status === "deleted") q = q.eq("is_deleted", true);
    if (search) {
      const esc = escapeOrSearch(search);
      q = q.or(`nickname.ilike.%${esc}%,content.ilike.%${esc}%`);
    }
    q = q.order("created_at", { ascending: false }).limit(fetchLimit);
    const { data, count, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    const targetIds = [...new Set(rows.map((r) => r[fkey] as string))];
    const targetTable = fkey === "post_id" ? "posts" : "works";
    const { data: targets } = await admin
      .from(targetTable)
      .select("id, title, slug")
      .in("id", targetIds);
    const map = new Map((targets ?? []).map((t) => [t.id as string, { title: t.title as string, slug: t.slug as string }]));

    return {
      total: count ?? 0,
      rows: rows.map((r) => {
        const t = map.get(r[fkey] as string);
        return {
          id: r.id as string,
          [fkey]: r[fkey] as string,
          parent_id: r.parent_id as string | null,
          nickname: r.nickname as string,
          content: r.content as string,
          is_admin: r.is_admin as boolean,
          is_deleted: r.is_deleted as boolean,
          deleted_by: r.deleted_by as string | null,
          created_at: r.created_at as string,
          source: targetTable === "posts" ? "posts" : "works",
          target_title: t?.title ?? "",
          target_slug: t?.slug ?? "",
        } as Row;
      }),
    };
  }

  let allRows: Row[] = [];
  let total = 0;

  if (source === "posts") {
    const r = await queryTable("comments", "post_id", offset + limit);
    allRows = r.rows;
    total = r.total;
  } else if (source === "works") {
    const r = await queryTable("work_comments", "work_id", offset + limit);
    allRows = r.rows;
    total = r.total;
  } else {
    // "all": 두 테이블 각각 최대 offset+limit 까지만 가져와 merge → JS slice.
    // 보수적이지만 이전 "전체 fetch" 보다 훨씬 적은 메모리.
    const [p, w] = await Promise.all([
      queryTable("comments", "post_id", offset + limit),
      queryTable("work_comments", "work_id", offset + limit),
    ]);
    allRows = [...p.rows, ...w.rows].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    total = p.total + w.total;
  }

  const items = allRows.slice(offset, offset + limit);

  return jsonOk({ items, total, page, limit });
}
