import { NextResponse } from "next/server";
import { jsonError, jsonServerError } from "@/lib/api/response";
import type { ApiErrorCode } from "@/lib/apiError";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { checkAboutErd } from "@/lib/api/validateAboutErd";
import { checkAboutContent } from "@/lib/api/validateAboutContent";
import { checkRequiredSettings } from "@/lib/api/validateRequiredSettings";
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

/** 비owner 저장을 막은 사유 — 문장은 로그·개발용, 화면은 코드를 화면 언어로(#862) */
type NonOwnerViolation = { message: string; code: ApiErrorCode };

/**
 * 비owner 저장 권한 검사 — 사이트 설정은 소유자 전용.
 * 비owner 는 `authors` 중 "본인 항목"만 추가/수정/삭제 가능. 그 외 변경은 차단.
 * 통과면 null, 위반이면 사유를 반환.
 */
function checkNonOwnerConfig(
  oldCfg: unknown,
  newCfg: unknown,
  myAuthorId: string | null,
  myEmail: string | null | undefined,
): NonOwnerViolation | null {
  const oldDelta = unwrapDelta(oldCfg);
  const newDelta = unwrapDelta(newCfg);
  const email = myEmail?.toLowerCase() ?? null;
  const isMine = (a: Author) =>
    (!!myAuthorId && a.id === myAuthorId) || (!!email && !!a.email && a.email.toLowerCase() === email);

  // authors 외 다른 키가 바뀌면 차단
  for (const k of new Set([...Object.keys(oldDelta), ...Object.keys(newDelta)])) {
    if (k === "authors") continue;
    if (JSON.stringify(oldDelta[k]) !== JSON.stringify(newDelta[k])) {
      return { message: "사이트 설정은 소유자만 변경할 수 있습니다.", code: "SETTINGS_OWNER_ONLY" };
    }
  }

  // authors — 실제 값(delta 없으면 기본값) 기준으로 본인 항목만 변경 허용
  const defaults = ((siteConfig as { authors?: Author[] }).authors ?? []);
  const oldAuthors = (Array.isArray(oldDelta.authors) ? oldDelta.authors : defaults) as Author[];
  const newAuthors = (Array.isArray(newDelta.authors) ? newDelta.authors : defaults) as Author[];

  /* 기준(old)에는 저장된 delta 뿐 아니라 site.config 의 기본 저자도 포함시킨다.
     기본 저자(소유자 프로필)는 delta 에 없어도 화면에는 항상 존재한다 — getSiteConfig 가
     보장한다. 그걸 빼고 비교하면, 비소유자가 자기 프로필만 고쳐 저장해도 소유자 항목이
     "새로 추가된 것" 으로 보여 "본인 프로필만 추가할 수 있습니다" 로 막힌다.
     저장된 값이 우선이므로 delta 쪽을 나중에 덮어쓴다. */
  const oldById = new Map<string, Author>();
  for (const a of defaults) oldById.set(a.id, a);
  for (const a of oldAuthors) oldById.set(a.id, a);
  const newById = new Map(newAuthors.map((a) => [a.id, a]));

  for (const [id, oldA] of oldById) {
    const newA = newById.get(id);
    if (!newA) {
      if (!isMine(oldA)) return { message: "다른 사람의 프로필은 삭제할 수 없습니다.", code: "PROFILE_DELETE_OTHERS" };
    } else if (JSON.stringify(oldA) !== JSON.stringify(newA)) {
      if (!isMine(oldA) && !isMine(newA)) return { message: "다른 사람의 프로필은 수정할 수 없습니다.", code: "PROFILE_EDIT_OTHERS" };
    }
  }
  for (const [id, newA] of newById) {
    if (!oldById.has(id) && !isMine(newA)) return { message: "본인 프로필만 추가할 수 있습니다.", code: "PROFILE_ADD_OTHERS" };
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
    return jsonServerError(error, "GET /api/admin/settings");
  }

  return NextResponse.json(data);
}

// PATCH /api/admin/settings — 설정 업데이트 (인증 필수, 비owner 는 본인 프로필만)
export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();

  if (!body || typeof body !== "object" || !body.config || typeof body.config !== "object") {
    return jsonError("config 가 없습니다.", 400);
  }

  /* 필수값 검사 — 클라이언트를 거치지 않은 요청도 같은 규칙으로 막는다.
     사유를 error 에 담아야 설정 화면 저장 실패 메시지에 그대로 노출된다. */
  const erdViolation = checkAboutErd(body.config);
  if (erdViolation) return jsonError(erdViolation, 400);

  /* About 본문 — 화면이 값을 믿고 바로 파고들어서, 빠지면 빈 칸이 아니라 페이지가 안 뜬다. */
  const aboutViolation = checkAboutContent(body.config);
  if (aboutViolation) return jsonError(aboutViolation, 400);

  const requiredViolation = checkRequiredSettings(body.config);
  if (requiredViolation) return jsonError(requiredViolation, 400);

  const admin = createAdminClient();

  // 변경 감지/권한 검사용 — 이전 config
  const { data: prev } = await admin
    .from("site_settings")
    .select("config")
    .eq("id", "default")
    .single<{ config: Record<string, unknown> }>();

  /* 여기는 세션 클라이언트로 옮기지 않는다.
     site_settings 는 config(jsonb) 한 행짜리 테이블이고, 비소유자에게 허용되는 범위가
     "그 행의 authors 배열 중 자기 항목" 이다. RLS 는 행 단위라 jsonb 내부의 일부만
     허용하도록 표현할 수 없다. 그래서 이 검사는 코드(checkNonOwnerConfig)가 맡고
     접근은 service_role 로 한다. admin/profile · admin/secrets 도 같은 이유다. */
  // 비owner 는 사이트 설정 변경 불가 — 본인 프로필(authors)만 허용
  const role = getUserRole(auth.user);
  if (!role.isOwner) {
    const violation = checkNonOwnerConfig(prev?.config, body.config, role.authorId, auth.user.email);
    if (violation) {
      return NextResponse.json({ error: "Forbidden", reason: violation.message, code: violation.code }, { status: 403 });
    }
  }

  const { data, error } = await admin
    .from("site_settings")
    .upsert({ id: "default", config: body.config, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error("[Settings PATCH] DB error:", error.message, error.code, error.details);
    return jsonServerError(error, "PATCH /api/admin/settings");
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
