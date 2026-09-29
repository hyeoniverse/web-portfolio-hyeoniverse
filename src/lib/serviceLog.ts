/**
 * 서비스 호출 기록 — AI·외부 서비스·메일·GitHub·예약 작업·문의 폼 첨부의 성공/실패. 서버 전용.
 *
 * service_logs 테이블(supabase/migrations/2026_09_30_service_logs.sql)에 한 줄씩 넣는다. 테이블이 아직
 * 없으면(마이그레이션 적용 전) 예전 자리인 site_settings 의 ai_log 한 줄에 최근 LEGACY_LIMIT 건을 쓴다.
 * 예약 작업은 DB 안의 pg_cron 이 돌려서 DB 함수가 직접 넣는다(_log_cron).
 * 기록이 실패해도 본래 작업은 막지 않는다.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServiceLogCategory, ServiceLogEntry } from "@/lib/serviceLogTypes";

const TABLE = "service_logs";
const LEGACY_ROW = "ai_log";
const LEGACY_LIMIT = 300;

/** 테이블이 없다는 오류인가(마이그레이션 적용 전) */
const isMissingTable = (err: { code?: string; message?: string } | null) =>
  !!err && (err.code === "42P01" || err.code === "PGRST205" || /service_logs/.test(err.message ?? ""));

/** 키 등을 가린 앞부분만 남긴다 */
function clip(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  return text
    .replace(/\b[a-z]{2,4}[_-][A-Za-z0-9_-]{16,}/g, "[REDACTED]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/\s+/g, " ")
    .slice(0, 240);
}

export async function logService(entry: Omit<ServiceLogEntry, "at">): Promise<void> {
  const row = { ...entry, message: clip(entry.message) };
  try {
    const admin = createAdminClient();
    const { error } = await admin.from(TABLE).insert(row);
    if (!error) return;
    if (!isMissingTable(error)) {
      console.error("[serviceLog] insert failed", error.message);
      return;
    }
    /* 테이블이 없으면 예전 자리에 */
    const { data } = await admin.from("site_settings").select("config").eq("id", LEGACY_ROW).maybeSingle();
    const entries = ((data?.config as { entries?: ServiceLogEntry[] } | null)?.entries ?? []);
    await admin.from("site_settings").upsert({
      id: LEGACY_ROW,
      config: { entries: [{ ...row, at: new Date().toISOString() }, ...entries].slice(0, LEGACY_LIMIT) },
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[serviceLog] failed", e);
  }
}

/** 최근 기록(새것부터). category 로 거를 수 있다 */
export async function readServiceLog({ category, limit = 500 }: { category?: ServiceLogCategory; limit?: number } = {}): Promise<ServiceLogEntry[]> {
  const admin = createAdminClient();
  let q = admin.from(TABLE).select("at, category, provider, ok, kind, status, message, units, meta").order("at", { ascending: false }).limit(limit);
  if (category) q = q.eq("category", category);
  const { data, error } = await q;
  if (!error) return (data ?? []) as ServiceLogEntry[];
  if (!isMissingTable(error)) throw error;
  const { data: legacy } = await admin.from("site_settings").select("config").eq("id", LEGACY_ROW).maybeSingle();
  const entries = ((legacy?.config as { entries?: ServiceLogEntry[] } | null)?.entries ?? [])
    /* 예전 자리의 AI 기록에는 category 가 없다 */
    .map((e) => ({ ...e, category: e.category ?? "ai" }));
  return category ? entries.filter((e) => e.category === category) : entries;
}

export async function clearServiceLog(): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from(TABLE).delete().gte("id", 0);
  if (error && !isMissingTable(error)) throw error;
  await admin.from("site_settings").upsert({ id: LEGACY_ROW, config: { entries: [] }, updated_at: new Date().toISOString() });
}

/**
 * GitHub API 실패만 남긴다(category "github") — 성공은 페이지를 그릴 때마다 불려 기록이 넘친다.
 * 404 는 남기지 않는다(README 없는 저장소처럼 정상인 경우가 많다). 토큰 만료·권한·호출 한도·서버 오류·연결 실패를 본다.
 */
export async function logGithubFailure(where: string, result: Response | unknown): Promise<void> {
  if (result instanceof Response) {
    if (result.ok || result.status === 404) return;
    const body = await result.clone().text().catch(() => "");
    const { classifyFailure } = await import("@/lib/ai/health");
    /* GitHub 는 호출 한도를 403 + "rate limit" 으로도 준다 */
    const kind = /rate limit/i.test(body) ? "rate_limit" : classifyFailure(result.status, body);
    await logService({ category: "github", provider: "github", ok: false, kind, status: result.status, message: `${where} · ${result.status} ${body}`.trim() });
    return;
  }
  if (result instanceof Error && result.name === "AbortError") return; // 시간 초과로 끊은 것 — 느린 응답은 실패로 치지 않는다
  await logService({ category: "github", provider: "github", ok: false, kind: "network", message: `${where} · ${result instanceof Error ? result.message : String(result)}` });
}
