import { NextResponse } from "next/server";
import { DemoInputError, readDemoBody } from "@/lib/demo/input";
import { demoIpHash } from "@/lib/demo/ip";
import { demoLimits, type DemoFeature } from "@/lib/demo/limits";
import { DemoQuotaUnavailable, readDemoRemaining, refundDemoQuota, takeDemoQuota } from "@/lib/demo/quota";
import { AI_PROVIDER_INFO, type AiProvider, type FailureKind, type ProviderFailure } from "@/lib/ai/providers";
import { filterEnabled } from "@/lib/ai/health";
import { getSecret } from "@/lib/getSecret";

/**
 * 데모 라우트 네 개(/api/demo/translate · summary · cover · speech)가 같이 쓰는 흐름.
 *
 *   GET   → { remaining, perIp, total }
 *   POST  입력 검사(400) → 기능이 꺼졌나(503) → 하루 상한에서 한 번 쓰기(429 · 503) → 공급자 호출
 *         → 성공 { ...결과, remaining } / 실패하면 쓴 횟수를 돌려주고 502 · 503
 *
 * 오류는 { message, remaining? } — message 는 화면에 그대로 보일 문장이다. 공급자가 쓴 문장 · 키는 싣지 않는다
 * (원인은 서버 로그와 설정 › 서비스의 상태 기록에 남는다).
 */

/** 실패한 공급자 하나 — 화면이 이유를 알릴 수 있게 이름과 원인 종류만 싣는다(공급자가 쓴 문장 · 키는 싣지 않는다) */
export type DemoFailure = { provider: string; kind: FailureKind };

/** 공급자 호출의 결과 — 실패면 상태 코드와 화면에 보일 문장, 그리고 공급자별 원인 */
export type DemoOutcome<T> = { ok: true; data: T } | { ok: false; status: 502 | 503; message: string; failures?: DemoFailure[] };

/** 응답에 실을 실패 목록 — 이미 꺼져 있어 건너뛴 공급자도 원인을 함께 알린다 */
export const publicFailures = (failures: readonly ProviderFailure[]): DemoFailure[] =>
  failures.filter((f) => f.kind !== "no_key").map((f) => ({ provider: providerLabel(f.provider), kind: f.kind }));

const NO_STORE = { "Cache-Control": "no-store" };

export function demoError(message: string, status: 400 | 429 | 502 | 503, remaining?: number, failures?: DemoFailure[]) {
  const body: Record<string, unknown> = { message };
  if (remaining !== undefined) body.remaining = remaining;
  if (failures?.length) body.failures = failures;
  return NextResponse.json(body, { status, headers: NO_STORE });
}

const QUOTA_MISSING = "체험 기능을 준비하고 있습니다. 잠시 뒤 다시 시도해 주세요.";
const QUOTA_FAILED = "남은 횟수를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
const LIMIT_REACHED = "오늘 쓸 수 있는 체험 횟수를 모두 썼습니다. 내일 다시 시도해 주세요.";
const UNEXPECTED = "결과를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.";

function quotaError(e: unknown) {
  if (e instanceof DemoQuotaUnavailable) return demoError(e.missing ? QUOTA_MISSING : QUOTA_FAILED, 503);
  throw e;
}

/**
 * GET — 이 방문자가 오늘 더 쓸 수 있는 횟수. usable 을 넘기면 지금 쓸 수 있는지도 함께(unavailable: true) —
 * 설정에서 꺼 두었거나 부를 공급자가 하나도 없으면(키 없음 · 이어진 실패로 꺼짐) 화면이 "남은 횟수" 대신 "쓸 수 없음"을 보인다.
 */
export async function handleDemoGet(request: Request, feature: DemoFeature, usable?: () => Promise<boolean>): Promise<Response> {
  const limits = demoLimits(feature);
  try {
    const [remaining, ok] = await Promise.all([readDemoRemaining(feature, demoIpHash(request), limits), usable ? usable().catch(() => true) : true]);
    const body: Record<string, unknown> = { remaining, perIp: limits.perIp, total: limits.total };
    if (!ok) body.unavailable = true;
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (e) {
    return quotaError(e);
  }
}

/** 공급자 가운데 하나라도 부를 수 있나 — 이어진 실패로 꺼지지 않았고, 키가 필요한 공급자면 키가 있다 */
export async function anyProviderUsable(ids: readonly AiProvider[]): Promise<boolean> {
  const { enabled } = await filterEnabled([...ids], (p) => p);
  for (const id of enabled) {
    const key = AI_PROVIDER_INFO[id]?.key;
    if (!key || (await getSecret(key))) return true;
  }
  return false;
}

export async function handleDemoPost<I, T extends object>(
  request: Request,
  feature: DemoFeature,
  steps: {
    /** 몸통을 검사해 입력으로. 맞지 않으면 DemoInputError */
    parse: (body: Record<string, unknown>) => I;
    /** 설정에서 기능을 꺼 두었으면 이유 문장(503). 횟수를 쓰기 전에 본다 */
    unavailable?: () => Promise<string | null>;
    run: (input: I) => Promise<DemoOutcome<T>>;
  },
): Promise<Response> {
  let input: I;
  try {
    input = steps.parse(await readDemoBody(request));
  } catch (e) {
    if (e instanceof DemoInputError) return demoError(e.message, 400);
    throw e;
  }

  const off = steps.unavailable ? await steps.unavailable() : null;
  if (off) return demoError(off, 503);

  const ipHash = demoIpHash(request);
  const limits = demoLimits(feature);
  let remaining: number;
  try {
    remaining = await takeDemoQuota(feature, ipHash, limits);
  } catch (e) {
    return quotaError(e);
  }
  if (remaining < 0) return demoError(LIMIT_REACHED, 429, 0);

  let outcome: DemoOutcome<T>;
  try {
    outcome = await steps.run(input);
  } catch (e) {
    console.error(`[demo/${feature}] 처리 중 오류`, e instanceof Error ? e.message : e);
    outcome = { ok: false, status: 502, message: UNEXPECTED };
  }
  if (!outcome.ok) {
    /* 만들지 못했으면 쓴 횟수를 돌려준다 */
    const back = await refundDemoQuota(feature, ipHash, limits);
    return demoError(outcome.message, outcome.status, back, outcome.failures);
  }
  return NextResponse.json({ ...outcome.data, remaining }, { headers: NO_STORE });
}

/** 공급자 이름 — 화면에 보일 이름(DeepL · Gemini …) */
export const providerLabel = (p: AiProvider) => AI_PROVIDER_INFO[p]?.label ?? p;

/**
 * fallback 순서에서 실제로 만든 공급자 — 앞에서부터 실패(꺼져 건너뛴 것 포함)로 남지 않은 첫 공급자.
 * 공급자 체인 함수들이 성공한 공급자를 돌려주지 않아 실패 기록으로 거꾸로 찾는다.
 */
export function succeededProvider<P extends string>(order: readonly P[], failures: readonly ProviderFailure[], toId: (p: P) => AiProvider): AiProvider | null {
  const failed = new Set(failures.map((f) => f.provider));
  for (const p of order) {
    const id = toId(p);
    if (!failed.has(id)) return id;
  }
  return null;
}

/** 모든 공급자가 키 없음이거나 꺼져 있었다 — 고장이 아니라 준비가 안 된 것(503) */
export const allUnavailable = (failures: readonly ProviderFailure[]) =>
  failures.length > 0 && failures.every((f) => f.kind === "no_key" || f.disabled || f.skipped);
