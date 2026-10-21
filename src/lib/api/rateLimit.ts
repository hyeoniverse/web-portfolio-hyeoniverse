import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIp } from "@/utils/getIp";

/**
 * 공유 속도 제한 — DB(rate_limits · rate_limit_hit RPC)에서 (bucket, key, 시간 창) 횟수를 센다.
 *
 * 서버리스 인스턴스마다 메모리가 따로라 Map 기반 제한은 인스턴스 수만큼 늘어나 사실상 없었다.
 * key 에는 원문 IP · 이메일을 넣지 않는다 — HMAC 해시(앞에 "rl:" 를 붙여 다른 해시와 이어 볼 수 없게).
 *
 * DB 오류(마이그레이션 전 · 일시 장애)면 통과시킨다(fail-open) — 남용 방지 장치가 사이트를 멈추게 하지 않게.
 */
export interface RateLimitRule {
  /** 시간 창(초) */
  windowSec: number;
  /** 창 안에서 허용하는 횟수 */
  max: number;
}

export function rateLimitKey(...parts: string[]): string {
  const secret = process.env.DEMO_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHmac("sha256", secret).update(`rl:${parts.join("|")}`).digest("hex").slice(0, 32);
}

/** 요청 IP 기준 키 — Vercel 은 x-forwarded-for 를 스스로 채워 덮으므로 방문자가 바꿔 보낼 수 없다 */
export function ipRateKey(request: Request, ...extra: string[]): string {
  return rateLimitKey(getIp(request), ...extra);
}

/** 한 번 세고 허용 여부. 규칙 여럿이면 하나라도 넘으면 false(모든 규칙을 센다) */
export async function hitRateLimit(bucket: string, key: string, ...rules: RateLimitRule[]): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const results = await Promise.all(
      rules.map((r) => admin.rpc("rate_limit_hit", { p_bucket: `${bucket}:${r.windowSec}`, p_key: key, p_window_seconds: r.windowSec, p_max: r.max })),
    );
    for (const { data, error } of results) {
      if (error) return true; // fail-open
      if (data === false) return false;
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * 캐시에 없어 공급자(번역 · AI)를 부르는 요청의 상한 — 주체(IP · 사용자)마다, 그리고 전체 합계로.
 * 캐시에 있는 결과는 세지 않게 호출부가 공급자를 부르기 직전에만 부른다.
 *   기본: 주체마다 10분에 5번 — 한 사람이 언어를 몇 개 바꿔 보는 정도
 *         전체   10분에 60번 — 여러 IP 로 돌려도 비용이 묶이게
 */
export function createMissLimiter(bucket: string, perWho = 5, global = 60, windowSec = 600) {
  return async function take(who: string): Promise<boolean> {
    const [mine, all] = await Promise.all([
      hitRateLimit(bucket, rateLimitKey(who), { windowSec, max: perWho }),
      hitRateLimit(`${bucket}:all`, "all", { windowSec, max: global }),
    ]);
    return mine && all;
  };
}
