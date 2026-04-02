import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

// GET /api/admin/settings — 설정 조회 (공개)
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .select("config, updated_at")
    .eq("id", "default")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH /api/admin/settings — 설정 업데이트 (인증 필수)
export async function PATCH(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("site_settings")
    .upsert({ id: "default", config: body.config, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error("[Settings PATCH] DB error:", error.message, error.code, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/", "layout");

  return NextResponse.json(data);
}
