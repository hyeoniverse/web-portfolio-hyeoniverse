import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// DELETE /api/comments/[id] — 댓글 삭제 (비밀번호 검증 또는 admin)
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  // admin 세션 확인
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // admin — 바로 삭제
    const { error } = await admin.from("comments").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // guest — 비밀번호 검증
  const body = await request.json();
  const { password } = body;

  if (!password) {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 }
    );
  }

  const { data: comment } = await admin
    .from("comments")
    .select("password_hash")
    .eq("id", id)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const isMatch = await bcrypt.compare(password, comment.password_hash);
  if (!isMatch) {
    return NextResponse.json(
      { error: "Incorrect password" },
      { status: 403 }
    );
  }

  const { error } = await admin.from("comments").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
