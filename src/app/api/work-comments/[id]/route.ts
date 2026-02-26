import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { getIdentity } from "@/utils/commenterIdentity";
import { isValidUUID } from "@/utils/commentValidation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// DELETE /api/work-comments/[id]
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const admin = createAdminClient();

  // admin 세션 확인
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await admin.from("work_comments").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const body = await request.json();
  const { commenter_id, target_id, password } = body;

  const { data: comment } = await admin
    .from("work_comments")
    .select("commenter_hash, password_hash")
    .eq("id", id)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // commenter_id 기반 검증
  let authorized = false;
  if (commenter_id && target_id && comment.commenter_hash) {
    const identity = getIdentity(commenter_id, target_id);
    authorized = comment.commenter_hash === identity.hash;
  }

  // password fallback
  if (!authorized && password && comment.password_hash) {
    authorized = await bcrypt.compare(password, comment.password_hash);
  }

  if (!authorized) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { error } = await admin.from("work_comments").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
