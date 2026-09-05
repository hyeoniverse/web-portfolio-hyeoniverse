import { NextResponse } from "next/server";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { requireAuth } from "@/lib/api/requireAuth";

/** POST /api/admin/tags/remove — 게시물의 tags[] 에서 특정 tag 제거.
 *  범위는 정책이 정한다 — owner/admin 은 전체, 저자는 자기 글만.
 *  body: { tag: string }
 *  return: { affected: number }  // 영향 받은 post 수 */
export async function POST(req: Request) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = (await req.json().catch(() => ({}))) as { tag?: string };
  const tag = body.tag?.trim();
  if (!tag) {
    return jsonError("tag required", 400);
  }

  /* 세션 클라이언트로 읽고 쓴다 — 정책이 등급별 범위를 정한다.
     owner/admin 은 전체, 저자는 자기 글에서만 태그가 빠진다. */
  const { data, error } = await supabase
    .from("posts")
    .select("id, tags")
    .contains("tags", [tag]);

  if (error) return jsonServerError(error, "POST /api/admin/tags/remove");

  const rows = (data ?? []) as { id: string; tags: string[] | null }[];
  if (rows.length === 0) {
    return NextResponse.json({ affected: 0 });
  }

  /* 각 post 의 tags 배열에서 tag 제거 후 update */
  const updates = rows.map((r) => ({
    id: r.id,
    tags: (r.tags ?? []).filter((t) => t !== tag),
  }));

  let affected = 0;
  for (const u of updates) {
    const { error: updateErr } = await supabase
      .from("posts")
      .update({ tags: u.tags })
      .eq("id", u.id);
    if (!updateErr) affected += 1;
  }

  return NextResponse.json({ affected });
}
