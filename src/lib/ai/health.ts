/**
 * AI 공급자 상태와 사용량 — 서버 전용.
 *
 * 공급자를 부를 때마다 결과를 남긴다. 실패는 원인(키 만료·권한·한도…)으로 나눠 이어진 횟수를 세고,
 * 같은 공급자가 사람이 고쳐야 하는 원인으로 FATAL_LIMIT 번(저절로 풀릴 수 있는 원인은 TRANSIENT_LIMIT 번)
 * 이어 실패하면 그 공급자를 끈다. 꺼진 공급자는 fallback 순서에서 빠지고 요청을 보내지 않는다.
 * 설정 › 서비스의 상태 패널에서 다시 켜거나, 그 키를 바꾸면 풀린다. 한도·요청 속도처럼 시간이 지나면
 * 풀리는 원인은 정해진 시간 뒤 한 번 다시 시도한다.
 *
 * 저장은 site_settings 두 줄(ai_health · ai_usage). 읽고-고쳐-쓰기라 요청이 겹치면 한쪽 기록이 빠질 수
 * 있다 — 상태 표시와 대략의 사용량 용도라 트랜잭션까지는 쓰지 않는다.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { isDisabledNow } from "./status";
import { clearServiceLog, logService, readServiceLog } from "@/lib/serviceLog";
import type { ServiceLogEntry } from "@/lib/serviceLogTypes";
import {
  FATAL_KINDS,
  FATAL_LIMIT,
  TRANSIENT_LIMIT,
  type AiProvider,
  type FailureKind,
  type ProviderFailure,
  type ProviderHealth,
  type ProviderUsage,
} from "./providers";

const HEALTH_ROW = "ai_health";
const USAGE_ROW = "ai_usage";

/** 공급자 호출이 실패했을 때 던진다 — 상태 코드와 본문으로 원인을 가른다 */
export class ProviderError extends Error {
  readonly provider: AiProvider;
  readonly kind: FailureKind;
  readonly status?: number;

  constructor(provider: AiProvider, kind: FailureKind, message: string, status?: number) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.kind = kind;
    this.status = status;
  }
}

/** 키가 없어 부르지 않았다 */
export const missingKey = (provider: AiProvider, key: string) => new ProviderError(provider, "no_key", `${key} not configured`);

/**
 * 상태 코드와 본문으로 실패 원인을 가른다. 공급자마다 같은 원인을 다른 코드로 돌려준다:
 * Google 은 만료·잘못된 키를 400 으로, DeepL 은 잘못된 키를 403 으로, 한도 초과를 456 으로 준다.
 * 그래서 본문의 낱말을 먼저 보고, 없으면 상태 코드로 정한다.
 */
export function classifyFailure(status: number | undefined, body: string): FailureKind {
  const b = body.toLowerCase();
  if (/expired|renew the api key/.test(b)) return "expired";
  if (/api_key_invalid|invalid api key|invalid x-api-key|incorrect api key|invalid_api_key|authentication_error|invalid token|invalid credentials|unauthorized/.test(b)) return "invalid_key";
  if (/insufficient_quota|exceeded your current quota|quota exceeded|resource_exhausted|quota/.test(b) && status !== 403) return "quota";
  if (/credit balance|insufficient (credit|balance|funds)|payment required|billing|top up|not enough credits/.test(b)) return "billing";
  if (/permission_denied|service_disabled|has not been used|is disabled|not enabled|permission_error|access denied|forbidden/.test(b)) return "forbidden";
  if (status === undefined) return "network";
  if (status === 401) return "invalid_key";
  if (status === 402) return "billing";
  if (status === 403) return "forbidden";
  if (status === 456) return "quota";
  if (status === 429) return "rate_limit";
  if (status === 400 || status === 404 || status === 413 || status === 422) return "bad_request";
  if (status >= 500) return "server";
  return "unknown";
}

/** 응답에서 ProviderError 를 만든다 — 본문은 원인을 가르는 데 쓰고, 기록에는 키를 가린 앞부분만 남긴다 */
export async function providerErrorFrom(provider: AiProvider, res: Response): Promise<ProviderError> {
  const body = await res.text().catch(() => "");
  return new ProviderError(provider, classifyFailure(res.status, body), `${res.status} ${sanitize(body)}`.trim(), res.status);
}

/** fetch 자체가 실패했을 때(연결·시간 초과) */
export function networkError(provider: AiProvider, err: unknown): ProviderError {
  return new ProviderError(provider, "network", sanitize(err instanceof Error ? err.message : String(err)));
}

/** 어떤 오류든 ProviderError 로 — 공급자 함수가 일반 Error 를 던졌어도 원인을 가른다 */
export function toProviderError(provider: AiProvider, err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const status = Number(/\b([1-5]\d\d)\b/.exec(msg)?.[1]) || undefined;
  return new ProviderError(provider, classifyFailure(status, msg), sanitize(msg), status);
}

function sanitize(text: string): string {
  return text
    .replace(/\b[a-z]{2,4}[_-][A-Za-z0-9_-]{16,}/g, "[REDACTED]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/key=[^&\s"]+/gi, "key=[REDACTED]")
    .replace(/\s+/g, " ")
    .slice(0, 240);
}

/* ── 저장 ── */

type HealthMap = Partial<Record<AiProvider, ProviderHealth>>;
type UsageDoc = { month: string; providers: Partial<Record<AiProvider, ProviderUsage>> };

const monthKey = () => new Date().toISOString().slice(0, 7);

async function readRow<T>(id: string): Promise<T | null> {
  try {
    const { data } = await createAdminClient().from("site_settings").select("config").eq("id", id).maybeSingle();
    return (data?.config as T) ?? null;
  } catch {
    return null;
  }
}

async function writeRow(id: string, config: unknown): Promise<void> {
  try {
    await createAdminClient().from("site_settings").upsert({ id, config, updated_at: new Date().toISOString() });
  } catch (e) {
    console.error(`[ai/health] ${id} 저장 실패`, e);
  }
}

export async function readHealth(): Promise<HealthMap> {
  return (await readRow<{ providers?: HealthMap }>(HEALTH_ROW))?.providers ?? {};
}

async function updateHealth(fn: (map: HealthMap) => HealthMap): Promise<HealthMap> {
  const next = fn(await readHealth());
  await writeRow(HEALTH_ROW, { providers: next });
  return next;
}

/** 꺼져 있어 부르지 말아야 하나 — 판정은 화면과 같이 쓰는 lib/ai/status */
export function isDisabled(h: ProviderHealth | undefined, now = new Date()): boolean {
  return isDisabledNow(h, now.getTime());
}

/** fallback 순서에서 꺼진 공급자를 뺀다. 빠진 것은 skipped 로 돌려준다(응답에 실어 알린다) */
export async function filterEnabled<P extends string>(
  list: P[],
  toProvider: (p: P) => AiProvider,
): Promise<{ enabled: P[]; skipped: ProviderFailure[] }> {
  const health = await readHealth();
  const enabled: P[] = [];
  const skipped: ProviderFailure[] = [];
  for (const p of list) {
    const id = toProvider(p);
    const h = health[id];
    if (isDisabled(h)) skipped.push({ provider: id, kind: h!.disabled!.kind, disabled: true });
    else enabled.push(p);
  }
  return { enabled, skipped };
}

/** 실패를 남긴다. 키가 없던 것은 남기지 않는다. 이번에 꺼졌으면 disabled: true 를 돌려준다 */
export async function recordFailure(err: ProviderError): Promise<ProviderFailure> {
  if (err.kind === "no_key") return { provider: err.provider, kind: err.kind };
  let disabled = false;
  await updateHealth((map) => {
    const prev = map[err.provider] ?? { fails: 0 };
    /* 원인이 바뀌면 새로 센다 — 한도 초과 두 번 뒤 키 만료 한 번을 세 번으로 치지 않는다 */
    const fails = prev.kind === err.kind ? prev.fails + 1 : 1;
    const limit = FATAL_KINDS.has(err.kind) ? FATAL_LIMIT : TRANSIENT_LIMIT;
    const now = new Date().toISOString();
    const next: ProviderHealth = { ...prev, fails, kind: err.kind, status: err.status, message: err.message, at: now };
    if (fails >= limit && !isDisabled(prev)) {
      next.disabled = { kind: err.kind, at: now };
      disabled = true;
    }
    return { ...map, [err.provider]: next };
  });
  await appendLog({ at: new Date().toISOString(), provider: err.provider, ok: false, kind: err.kind, status: err.status, message: err.message });
  if (disabled) await notifyDisabled(err);
  return { provider: err.provider, kind: err.kind, ...(disabled ? { disabled: true } : {}) };
}

/** 성공하면 이어진 실패와 차단을 지운다(마지막 오류 문장은 남겨 둔다) */
export async function recordSuccess(provider: AiProvider): Promise<void> {
  const health = await readHealth();
  const h = health[provider];
  if (h && h.fails === 0 && !h.disabled) {
    /* 이미 정상인데 매번 쓰면 요청마다 쓰기가 한 번 는다 — 하루에 한 번만 okAt 을 고친다 */
    if (h.okAt && Date.now() - new Date(h.okAt).getTime() < 24 * 60 * 60 * 1000) return;
  }
  await updateHealth((map) => ({ ...map, [provider]: { ...(map[provider] ?? {}), fails: 0, disabled: undefined, okAt: new Date().toISOString() } }));
}

/** 설정 화면의 "다시 켜기"·키 교체 — 기록을 지운다 */
export async function resetProviders(providers: AiProvider[]): Promise<void> {
  if (providers.length === 0) return;
  await updateHealth((map) => {
    const next = { ...map };
    for (const p of providers) delete next[p];
    return next;
  });
}

async function notifyDisabled(err: ProviderError) {
  try {
    const { notifyAdmin } = await import("@/lib/adminNotify");
    await notifyAdmin({
      type: "ai_failure",
      title: `${err.provider} 공급자를 껐습니다`,
      message: `같은 원인(${err.kind})으로 여러 번 이어 실패해 요청을 멈췄습니다. 설정 › 서비스에서 원인을 고친 뒤 다시 켜 주세요. 마지막 응답: ${err.message}`,
      metadata: { provider: err.provider, kind: err.kind, status: err.status },
    });
  } catch { /* 알림 실패는 삼킨다 */ }
}

/* ── 사용량 ── */

export async function readUsage(): Promise<UsageDoc> {
  const doc = await readRow<UsageDoc>(USAGE_ROW);
  if (doc?.month === monthKey()) return { month: doc.month, providers: doc.providers ?? {} };
  return { month: monthKey(), providers: {} };
}

/** 이번 달 사용량에 더한다. units 는 공급자의 단위(chars·bytes). requests 단위면 비운다 */
export async function recordUsage(provider: AiProvider, units?: number): Promise<void> {
  const doc = await readUsage();
  const prev = doc.providers[provider] ?? { requests: 0, units: 0 };
  doc.providers[provider] = { requests: prev.requests + 1, units: prev.units + (units ?? 1) };
  await writeRow(USAGE_ROW, doc);
}

/** 성공한 한 번을 남긴다 — 상태와 사용량을 함께 */
export async function recordOk(provider: AiProvider, units?: number): Promise<void> {
  await Promise.all([
    recordSuccess(provider),
    recordUsage(provider, units),
    appendLog({ at: new Date().toISOString(), provider, ok: true, ...(units !== undefined ? { units } : {}) }),
  ]);
}

/* ── 호출 기록 — service_logs(lib/serviceLog) ── */

export async function readLog(): Promise<ServiceLogEntry[]> {
  return readServiceLog();
}

async function appendLog(entry: Omit<ServiceLogEntry, "category">): Promise<void> {
  const { at: _at, ...rest } = entry;
  await logService({ ...rest, category: "ai" });
}

export async function clearLog(): Promise<void> {
  await clearServiceLog();
}

/**
 * 외부 API 한 번 부르기 — 꺼져 있으면 부르지 않고(disabled), 결과를 상태·사용량에 남긴다.
 * fallback 체인이 없는 단건 호출(Unsplash·Pexels 검색 등)용. 실패하면 error 에 원인이 실린다.
 */
export async function trackedFetch(
  provider: AiProvider,
  url: string,
  init?: RequestInit,
): Promise<{ res: Response; disabled?: never; error?: never } | { res?: never; disabled: true; error?: never } | { res?: never; disabled?: never; error: ProviderError }> {
  if (isDisabled((await readHealth())[provider])) return { disabled: true };
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const error = networkError(provider, e);
    await recordFailure(error);
    return { error };
  }
  if (!res.ok) {
    const error = await providerErrorFrom(provider, res);
    await recordFailure(error);
    return { error };
  }
  await recordOk(provider);
  return { res };
}
