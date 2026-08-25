import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/requireAuth";

// GET /api/revisions/[id] — snapshot 포함 단건 조회
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const { data, error } = await supabase
    .from("revisions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH /api/revisions/[id] — 부분 수정 (dismissed 등)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("revisions")
    .update({ dismissed: !!body.dismissed })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/revisions/[id] — 단건 삭제
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const { error } = await supabase.from("revisions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
