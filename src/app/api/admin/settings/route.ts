import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { checkAboutErd } from "@/lib/api/validateAboutErd";
import { getUserRole } from "@/lib/api/roles";
import { notifyAdmin } from "@/lib/adminNotify";
import { getTabForConfigPath } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";
import { siteConfig } from "@/config/site.config";
import type { Author } from "@/types/author";

// config 는 { delta, savedDefaults } wrapper 구조 — 실제 값은 delta 안에 있음
function unwrapDelta(cfg: unknown): Record<string, unknown> {
  if (cfg && typeof cfg === "object") {
    const c = cfg as Record<string, unknown>;
    return ("delta" in c && c.delta && typeof c.delta === "object")
      ? (c.delta as Record<string, unknown>)
      : c;
  }
  return {};
}

/**
 * 비owner 저장 권한 검사 — 사이트 설정은 소유자 전용.
 * 비owner 는 `authors` 중 "본인 항목"만 추가/수정/삭제 가능. 그 외 변경은 차단.
 * 통과면 null, 위반이면 사유 문자열 반환.
 */
function checkNonOwnerConfig(
  oldCfg: unknown,
  newCfg: unknown,
  myAuthorId: string | null,
  myEmail: string | null | undefined,
): string | null {
  const oldDelta = unwrapDelta(oldCfg);
  const newDelta = unwrapDelta(newCfg);
  const email = myEmail?.toLowerCase() ?? null;
  const isMine = (a: Author) =>
    (!!myAuthorId && a.id === myAuthorId) || (!!email && !!a.email && a.email.toLowerCase() === email);

  // authors 외 다른 키가 바뀌면 차단
  for (const k of new Set([...Object.keys(oldDelta), ...Object.keys(newDelta)])) {
    if (k === "authors") continue;
    if (JSON.stringify(oldDelta[k]) !== JSON.stringify(newDelta[k])) {
      return "사이트 설정은 소유자만 변경할 수 있습니다.";
    }
  }

  // authors — 실제 값(delta 없으면 기본값) 기준으로 본인 항목만 변경 허용
  const defaults = ((siteConfig as { authors?: Author[] }).authors ?? []);
  const oldAuthors = (Array.isArray(oldDelta.authors) ? oldDelta.authors : defaults) as Author[];
  const newAuthors = (Array.isArray(newDelta.authors) ? newDelta.authors : defaults) as Author[];
  const oldById = new Map(oldAuthors.map((a) => [a.id, a]));
  const newById = new Map(newAuthors.map((a) => [a.id, a]));

  for (const [id, oldA] of oldById) {
    const newA = newById.get(id);
    if (!newA) {
      if (!isMine(oldA)) return "다른 사람의 프로필은 삭제할 수 없습니다.";
    } else if (JSON.stringify(oldA) !== JSON.stringify(newA)) {
      if (!isMine(oldA) && !isMine(newA)) return "다른 사람의 프로필은 수정할 수 없습니다.";
    }
  }
  for (const [id, newA] of newById) {
    if (!oldById.has(id) && !isMine(newA)) return "본인 프로필만 추가할 수 있습니다.";
  }
  return null;
}

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

// PATCH /api/admin/settings — 설정 업데이트 (인증 필수, 비owner 는 본인 프로필만)
export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();

  if (!body || typeof body !== "object" || !body.config || typeof body.config !== "object") {
    return NextResponse.json({ error: "config 가 없습니다." }, { status: 400 });
  }

  /* 필수값 검사 — 클라이언트를 거치지 않은 요청도 같은 규칙으로 막는다.
     사유를 error 에 담아야 설정 화면 저장 실패 메시지에 그대로 노출된다. */
  const erdViolation = checkAboutErd(body.config);
  if (erdViolation) return NextResponse.json({ error: erdViolation }, { status: 400 });

  const admin = createAdminClient();

  // 변경 감지/권한 검사용 — 이전 config
  const { data: prev } = await admin
    .from("site_settings")
    .select("config")
    .eq("id", "default")
    .single<{ config: Record<string, unknown> }>();

  // 비owner 는 사이트 설정 변경 불가 — 본인 프로필(authors)만 허용
  const role = getUserRole(auth.user);
  if (!role.isOwner) {
    const violation = checkNonOwnerConfig(prev?.config, body.config, role.authorId, auth.user.email);
    if (violation) return NextResponse.json({ error: "Forbidden", reason: violation }, { status: 403 });
  }

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

  // 설정 변경 알림 — delta 내부 키로 실제 변경된 섹션만 기록
  try {
    const oldDelta = unwrapDelta(prev?.config);
    const newDelta = unwrapDelta(body.config);
    const allKeys = new Set([...Object.keys(oldDelta), ...Object.keys(newDelta)]);
    const changed: string[] = [];
    for (const k of allKeys) {
      if (JSON.stringify(oldDelta[k]) !== JSON.stringify(newDelta[k])) changed.push(k);
    }
    if (changed.length > 0) {
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
