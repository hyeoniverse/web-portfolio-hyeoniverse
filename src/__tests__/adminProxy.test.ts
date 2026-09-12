// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* proxy 가 권한이 모자란 관리자 화면을 글 목록으로 보내는지(#883). Supabase 는 흉내로 대신한다 — 인증 서버에 닿지 않는다.
   메일 링크 로그인은 /admin(대시보드)으로 들어오므로, 작성자는 대시보드를 그리기 전에 여기서 돌려보낸다. */

type FakeUser = { id: string; email: string; app_metadata: Record<string, unknown> };
const state: { user: FakeUser | null; refreshed: boolean } = { user: null, refreshed: false };

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: { setAll: (c: { name: string; value: string; options: object }[]) => void } }) => ({
    auth: {
      getUser: async () => {
        // 토큰을 새로 받은 경우를 흉내 낸다 — 새 토큰 쿠키가 응답에 실린다
        if (state.refreshed) opts.cookies.setAll([{ name: "sb-test-auth-token", value: "fresh", options: { path: "/" } }]);
        return { data: { user: state.user } };
      },
    },
  }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.local";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
const { proxy } = await import("@/proxy");

const author: FakeUser = { id: "u1", email: "a@example.com", app_metadata: { role: "author", permission_level: 1 } };
const admin: FakeUser = { id: "u2", email: "b@example.com", app_metadata: { role: "author", permission_level: 2 } };
const owner: FakeUser = { id: "u3", email: "c@example.com", app_metadata: { role: "owner" } };

const open = (path: string) =>
  proxy(new NextRequest(`http://localhost${path}`, { headers: { cookie: "sb-test-auth-token=old" } }));
const passedThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";

beforeEach(() => { state.user = null; state.refreshed = false; });

describe("proxy — 관리자 화면 권한", () => {
  it("작성자가 대시보드·알림·신고로 들어오면 글 목록으로 보낸다", async () => {
    state.user = author;
    for (const path of ["/admin", "/admin/notifications", "/admin/reports"]) {
      const res = await open(path);
      expect(res.status, path).toBe(307);
      expect(new URL(res.headers.get("location") ?? "").pathname, path).toBe("/admin/posts");
    }
  });

  it("작성자도 글 목록·설정은 그대로 연다", async () => {
    state.user = author;
    expect(passedThrough(await open("/admin/posts"))).toBe(true);
    expect(passedThrough(await open("/admin/settings"))).toBe(true);
  });

  it("API 는 돌려보내지 않는다 — 권한 판정은 route 가 한다", async () => {
    state.user = author;
    expect(passedThrough(await open("/api/admin/dashboard"))).toBe(true);
  });

  it("관리자와 소유자는 대시보드를 연다", async () => {
    for (const user of [admin, owner]) {
      state.user = user;
      expect(passedThrough(await open("/admin"))).toBe(true);
    }
  });

  it("돌려보낼 때 새로 받은 토큰 쿠키를 함께 싣는다", async () => {
    state.user = author;
    state.refreshed = true;
    const res = await open("/admin");
    expect(res.status).toBe(307);
    expect(res.headers.get("set-cookie") ?? "").toContain("sb-test-auth-token=fresh");
  });
});
