import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

/** POST /api/admin/tags/remove — 모든 게시물의 tags[] 에서 특정 tag 제거 (admin 전용).
 *  body: { tag: string }
 *  return: { affected: number }  // 영향 받은 post 수 */
export async function POST(req: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = (await req.json().catch(() => ({}))) as { tag?: string };
  const tag = body.tag?.trim();
  if (!tag) {
    return NextResponse.json({ error: "tag required" }, { status: 400 });
  }

  const admin = createAdminClient();
  /* 해당 tag 를 포함한 모든 post fetch (admin so includes private/unpublished) */
  const { data, error } = await admin
    .from("posts")
    .select("id, tags")
    .contains("tags", [tag]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
    const { error: updateErr } = await admin
      .from("posts")
      .update({ tags: u.tags })
      .eq("id", u.id);
    if (!updateErr) affected += 1;
  }

  return NextResponse.json({ affected });
}
