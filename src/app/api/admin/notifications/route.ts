import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/notifications — 알림 목록 (최근 50개)
// 테이블이 없거나 query 실패 시에도 200 + 빈 리스트로 graceful degradation —
// nav 폴링이 매번 500 으로 콘솔을 도배하지 않게 함.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[admin/notifications] query failed:", error.message);
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const { count } = await admin
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .eq("read", false);

    return NextResponse.json({ notifications: data ?? [], unreadCount: count ?? 0 });
  } catch (e) {
    console.warn("[admin/notifications] unexpected error:", e);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

// PATCH /api/admin/notifications — 읽음 처리
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids, markAllRead } = body;

  const admin = createAdminClient();

  if (markAllRead) {
    await admin
      .from("admin_notifications")
      .update({ read: true })
      .eq("read", false);
  } else if (ids && Array.isArray(ids)) {
    await admin
      .from("admin_notifications")
      .update({ read: true })
      .in("id", ids);
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/notifications — 알림 삭제
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids, deleteAll } = body;

  const admin = createAdminClient();

  if (deleteAll) {
    await admin.from("admin_notifications").delete().neq("id", "");
  } else if (ids && Array.isArray(ids)) {
    await admin.from("admin_notifications").delete().in("id", ids);
  }

  return NextResponse.json({ success: true });
}
