import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthorizedCron } from "@/lib/api/cronAuth";

const req = (headers: Record<string, string>) => new Request("https://example.com/api/cron/x", { headers });

describe("isAuthorizedCron", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("Bearer CRON_SECRET 만 받는다", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCron(req({ authorization: "Bearer s3cret" }))).toBe(true);
    expect(isAuthorizedCron(req({ authorization: "Bearer wrong!" }))).toBe(false);
    expect(isAuthorizedCron(req({}))).toBe(false);
  });

  it("x-vercel-cron 헤더만으로는 통과하지 못한다", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCron(req({ "x-vercel-cron": "1" }))).toBe(false);
  });

  it("CRON_SECRET 이 없으면 모두 거절한다", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isAuthorizedCron(req({ authorization: "Bearer " }))).toBe(false);
  });
});
