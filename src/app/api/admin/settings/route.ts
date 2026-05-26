import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { notifyAdmin } from "@/lib/adminNotify";

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

  // 변경 감지용 — 이전 config 와 비교해 changed 된 top-level keys 만 알림
  const { data: prev } = await admin
    .from("site_settings")
    .select("config")
    .eq("id", "default")
    .single<{ config: Record<string, unknown> }>();

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

  // 설정 변경 알림 — 큰 설정(theme/contact/services/translation/aiSummary/seo 등) 수정 기록
  try {
    const oldCfg = (prev?.config ?? {}) as Record<string, unknown>;
    const newCfg = (body.config ?? {}) as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(oldCfg), ...Object.keys(newCfg)]);
    const changed: string[] = [];
    for (const k of allKeys) {
      if (JSON.stringify(oldCfg[k]) !== JSON.stringify(newCfg[k])) changed.push(k);
    }
    if (changed.length > 0) {
      await notifyAdmin({
        type: "config_changed",
        title: "사이트 설정 변경",
        message: `변경된 항목: ${changed.join(", ")}`,
        metadata: { changed_keys: changed },
      });
    }
  } catch { /* notify 실패는 swallow */ }

  return NextResponse.json(data);
}
