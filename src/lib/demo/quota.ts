import { createAdminClient } from "@/lib/supabase/admin";
import { demoLimits, type DemoFeature, type DemoLimits } from "@/lib/demo/limits";

/**
 * 데모 하루 상한 — DB 함수(demo_take · demo_refund · demo_remaining)를 서버 클라이언트로 부른다.
 * 서버리스 인스턴스마다 메모리가 따로라 메모리로 세면 상한이 인스턴스 수만큼 늘어난다. 그래서 DB 에 센다.
 *
 * 마이그레이션(2026_10_09_demo_usage.sql)을 적용하기 전이면 함수가 없다 — DemoQuotaUnavailable 을 던지고
 * 라우트는 503 으로 알린다. 세지 못하는 채로 공급자를 부르지는 않는다(상한 없는 열린 경로가 된다).
 */
export class DemoQuotaUnavailable extends Error {
  /** 함수 · 테이블이 아직 없다(마이그레이션 적용 전) */
  readonly missing: boolean;
  constructor(message: string, missing: boolean) {
    super(message);
    this.name = "DemoQuotaUnavailable";
    this.missing = missing;
  }
}

type RpcError = { code?: string; message?: string } | null;

/** 함수나 테이블이 없다는 오류인가 — PostgREST 는 PGRST202(함수 없음), Postgres 는 42883 · 42P01 */
export const isMissingQuota = (err: RpcError) =>
  !!err && (err.code === "PGRST202" || err.code === "PGRST205" || err.code === "42883" || err.code === "42P01");

async function call(fn: "demo_take" | "demo_refund" | "demo_remaining", feature: DemoFeature, ipHash: string, limits: DemoLimits): Promise<number> {
  let result: { data: unknown; error: RpcError };
  try {
    result = await createAdminClient().rpc(fn, { p_feature: feature, p_ip_hash: ipHash, p_per_ip: limits.perIp, p_total: limits.total });
  } catch (e) {
    /* 환경 변수가 없거나 연결이 끊겼다 */
    throw new DemoQuotaUnavailable(e instanceof Error ? e.message : String(e), false);
  }
  if (result.error) {
    const missing = isMissingQuota(result.error);
    if (!missing) console.error(`[demo] ${fn} 실패`, result.error.code, result.error.message);
    throw new DemoQuotaUnavailable(result.error.message ?? fn, missing);
  }
  const n = Number(result.data);
  if (!Number.isFinite(n)) throw new DemoQuotaUnavailable(`${fn} 응답을 읽지 못했습니다`, false);
  return n;
}

/** 한 번 쓴다. 남은 횟수(이번 것을 뺀 뒤), 상한에 닿았으면 -1 */
export function takeDemoQuota(feature: DemoFeature, ipHash: string, limits = demoLimits(feature)): Promise<number> {
  return call("demo_take", feature, ipHash, limits);
}

/** 만들지 못했으면(공급자 모두 실패) 한 번 돌려준다. 돌려주기도 실패하면 undefined — 응답은 막지 않는다 */
export async function refundDemoQuota(feature: DemoFeature, ipHash: string, limits = demoLimits(feature)): Promise<number | undefined> {
  try {
    return await call("demo_refund", feature, ipHash, limits);
  } catch (e) {
    console.error("[demo] 횟수를 돌려주지 못했습니다", feature, e instanceof Error ? e.message : e);
    return undefined;
  }
}

/** 지금 남은 횟수(쓰지 않음) */
export function readDemoRemaining(feature: DemoFeature, ipHash: string, limits = demoLimits(feature)): Promise<number> {
  return call("demo_remaining", feature, ipHash, limits);
}
