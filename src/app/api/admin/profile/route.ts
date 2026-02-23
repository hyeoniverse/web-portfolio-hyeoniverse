import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const admin = createAdminClient();

  const { error } = await admin
    .from("site_settings")
    .upsert(
      {
        id: "profile",
        config: body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
