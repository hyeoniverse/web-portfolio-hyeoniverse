// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/* 공유 속도 제한 — rate_limit_hit RPC 대신 응답을 골라 돌려준다 */
const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

import { createMissLimiter, hitRateLimit, ipRateKey, rateLimitKey } from "@/lib/api/rateLimit";

const req = (ip: string) => new Request("https://example.com/api/x", { headers: { "x-forwarded-for": ip } });

describe("hitRateLimit", () => {
  beforeEach(() => { rpc.mockReset(); });

  it("규칙마다 창 길이를 붙인 bucket 으로 센다", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await hitRateLimit("b", "k", { windowSec: 60, max: 1 }, { windowSec: 600, max: 5 })).toBe(true);
    expect(rpc.mock.calls.map((c) => c[1].p_bucket)).toEqual(["b:60", "b:600"]);
  });

  it("규칙 하나라도 넘으면 false", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    expect(await hitRateLimit("b", "k", { windowSec: 60, max: 1 }, { windowSec: 600, max: 5 })).toBe(false);
  });

  it("DB 오류 · 예외면 통과(fail-open)", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "function does not exist" } });
    expect(await hitRateLimit("b", "k", { windowSec: 60, max: 1 })).toBe(true);
    rpc.mockRejectedValue(new Error("network"));
    expect(await hitRateLimit("b", "k", { windowSec: 60, max: 1 })).toBe(true);
  });

  it("주체 상한 · 전체 상한 중 하나라도 넘으면 false", async () => {
    const take = createMissLimiter("t", 5, 60);
    rpc.mockImplementation(async (_fn: string, args: { p_bucket: string }) => ({ data: !args.p_bucket.startsWith("t:all"), error: null }));
    expect(await take("1.1.1.1")).toBe(false);
  });
});

describe("rateLimitKey", () => {
  it("원문을 담지 않는 고정 길이 해시 · IP 마다 다르다", () => {
    const k = ipRateKey(req("203.0.113.7"));
    expect(k).toMatch(/^[0-9a-f]{32}$/);
    expect(k).not.toContain("203");
    expect(k).toBe(rateLimitKey("203.0.113.7"));
    expect(k).not.toBe(ipRateKey(req("203.0.113.8")));
    expect(ipRateKey(req("203.0.113.7"), "id")).not.toBe(k);
  });
});
