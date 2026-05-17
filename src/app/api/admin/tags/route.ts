import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

/** GET /api/admin/tags — 모든 게시물에서 distinct tag 목록 (admin 전용) */
export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("posts")
    .select("tags")
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const set = new Set<string>();
  for (const row of (data ?? []) as { tags: string[] | null }[]) {
    if (row.tags) for (const t of row.tags) if (t) set.add(t);
  }

  const tags = Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  return NextResponse.json({ tags });
}
