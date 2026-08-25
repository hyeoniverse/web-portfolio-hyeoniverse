import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/api/requireRole";

// GET /api/admin/profile — profile 데이터 조회
export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("site_settings")
    .select("config")
    .eq("id", "profile")
    .single();

  if (error || !data) {
    return NextResponse.json({ config: null });
  }

  return NextResponse.json({ config: data.config });
}

// PATCH /api/admin/profile — profile 데이터 저장
// Body: { data, savedDefaults } 또는 legacy 전체 config
export async function PATCH(request: Request) {
  /* site_settings 의 profile 행을 통째로 갈아 끼운다 — 사이트 공개 프로필 전체다.
     requireAuth 만으로는 로그인한 아무 멤버나 소유자의 프로필 페이지를 덮어쓸 수 있었다.
     (settings 라우트가 authors 슬라이스만 비소유자에게 허용하는 것과 대비된다) */
  const { error: authError } = await requireOwner();
  if (authError) return authError;

  const body = await request.json();
  const admin = createAdminClient();

  // 새 형식: { data, savedDefaults } — 그대로 저장
  // 레거시 형식: 전체 ProfileData — 그대로 저장 (하위 호환)
  const configToSave = body.data && body.savedDefaults
    ? { data: body.data, savedDefaults: body.savedDefaults }
    : body;

  const { error } = await admin
    .from("site_settings")
    .upsert(
      {
        id: "profile",
        config: configToSave,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
