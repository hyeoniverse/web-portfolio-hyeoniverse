import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/requireAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// DELETE /api/custom-emojis/[id] — 커스텀 아이콘 기록 삭제 (admin 전용)
export async function DELETE(_request: Request, context: RouteContext) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await context.params;
  const { error } = await supabase.from("custom_emojis").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
