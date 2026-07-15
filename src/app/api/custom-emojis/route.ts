import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

// GET /api/custom-emojis — 에디터 이모지 picker 의 업로드(커스텀) 아이콘 기록 (admin 전용)
export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("custom_emojis")
    .select("id, name, src, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/custom-emojis — 기록 추가 { name, src }
export async function POST(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  let body: { name?: unknown; src?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const src = typeof body.src === "string" ? body.src.trim() : "";
  const name = typeof body.name === "string" ? body.name.slice(0, 120) : "";
  if (!src) return NextResponse.json({ error: "src required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("custom_emojis")
    .insert({ name, src })
    .select("id, name, src, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
