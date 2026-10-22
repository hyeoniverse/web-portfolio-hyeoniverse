// @vitest-environment node
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

/* iframe 끼워 넣기 — 같은 출처와 MacFolio(macfolio.hyeoniverse.com)만. 관리 화면은 어디에도 */
type Rule = { source: string; headers: { key: string; value: string }[] };

async function rules(): Promise<Rule[]> {
  const cfg = nextConfig as unknown as { headers: () => Promise<Rule[]> };
  return cfg.headers();
}

const valueOf = (r: Rule | undefined, key: string) => r?.headers.find((h) => h.key === key)?.value;

describe("frame 헤더", () => {
  it("공개 화면은 같은 출처와 MacFolio 만 끼워 넣을 수 있다", async () => {
    const all = (await rules()).find((r) => r.source === "/:path*");
    expect(valueOf(all, "Content-Security-Policy")).toBe("frame-ancestors 'self' https://macfolio.hyeoniverse.com");
    /* X-Frame-Options(SAMEORIGIN)가 남으면 MacFolio 가 막힌다(ERR_BLOCKED_BY_RESPONSE) */
    expect(valueOf(all, "X-Frame-Options")).toBeUndefined();
  });

  it("관리 화면은 MacFolio 도 끼워 넣지 못한다", async () => {
    const admin = (await rules()).find((r) => r.source === "/admin/:path*");
    expect(valueOf(admin, "Content-Security-Policy")).toBe("frame-ancestors 'none'");
    expect(valueOf(admin, "X-Frame-Options")).toBe("DENY");
  });

  it("관찰 모드 정책의 frame-ancestors 도 같은 목록", async () => {
    const all = (await rules()).find((r) => r.source === "/:path*");
    expect(valueOf(all, "Content-Security-Policy-Report-Only")).toContain("frame-ancestors 'self' https://macfolio.hyeoniverse.com;");
  });
});
