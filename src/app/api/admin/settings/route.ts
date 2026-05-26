import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { notifyAdmin } from "@/lib/adminNotify";
import { getTabForConfigPath } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";

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

  // 설정 변경 알림 — 큰 설정(theme/contact/services/translation/aiSummary/seo 등) 수정 기록.
  // config 는 { delta, savedDefaults } wrapper 구조이므로 delta 내부 키로 비교해야
  // "delta, savedDefaults" 같은 무의미한 wrapper 키 대신 실제 변경된 섹션이 보임.
  try {
    const unwrapDelta = (cfg: unknown): Record<string, unknown> => {
      if (cfg && typeof cfg === "object") {
        const c = cfg as Record<string, unknown>;
        return ("delta" in c && c.delta && typeof c.delta === "object")
          ? (c.delta as Record<string, unknown>)
          : c;
      }
      return {};
    };
    const oldDelta = unwrapDelta(prev?.config);
    const newDelta = unwrapDelta(body.config);
    const allKeys = new Set([...Object.keys(oldDelta), ...Object.keys(newDelta)]);
    const changed: string[] = [];
    for (const k of allKeys) {
      if (JSON.stringify(oldDelta[k]) !== JSON.stringify(newDelta[k])) changed.push(k);
    }
    if (changed.length > 0) {
      // 변경된 키들이 모두 같은 탭에 속하면 해당 탭으로 직접 이동, 아니면 settings 루트
      const tabs = new Set(changed.map((k) => getTabForConfigPath(k)));
      const url = tabs.size === 1
        ? `/admin/settings?tab=${[...tabs][0]}`
        : "/admin/settings";
      await notifyAdmin({
        type: "config_changed",
        title: "사이트 설정 변경",
        message: `변경된 항목: ${changed.join(", ")}`,
        metadata: { changed_keys: changed, url },
      });
    }
  } catch { /* notify 실패는 swallow */ }

  return NextResponse.json(data);
}
