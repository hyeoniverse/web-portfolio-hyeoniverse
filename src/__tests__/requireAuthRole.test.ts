import { afterEach, describe, expect, it, vi } from "vitest";

/* requireAuth — 역할 없는 계정(Supabase 에 직접 가입해 초대 확인을 거치지 않은 세션)은 403.
   예전엔 로그인만 확인해 그런 계정도 관리 API 를 썼다 */
let currentUser: Record<string, unknown> | null = null;
let aal = "aal2";
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser } }),
      getSession: async () => ({ data: { session: null } }),
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: aal, nextLevel: "aal2" }, error: null }) },
    },
  }),
}));

const { requireAuth } = await import("@/lib/api/requireAuth");

describe("requireAuth", () => {
  afterEach(() => { currentUser = null; aal = "aal2"; vi.unstubAllEnvs(); });

  it("세션이 없으면 401", async () => {
    const r = await requireAuth();
    expect(r.error?.status).toBe(401);
  });

  it("역할 없는 계정은 403", async () => {
    currentUser = { id: "u1", email: "stranger@example.com", app_metadata: {} };
    const r = await requireAuth();
    expect(r.error?.status).toBe(403);
  });

  it("작성자 · 소유자는 통과", async () => {
    currentUser = { id: "u2", email: "author@example.com", app_metadata: { role: "author", permission_level: 1 } };
    expect((await requireAuth()).error).toBeUndefined();
    vi.stubEnv("OWNER_EMAIL", "owner@example.com");
    currentUser = { id: "u3", email: "owner@example.com", app_metadata: {} };
    expect((await requireAuth()).error).toBeUndefined();
  });

  it("2단계 인증을 거치지 않은(aal1) 세션은 403 MFA_REQUIRED", async () => {
    currentUser = { id: "u2", email: "author@example.com", app_metadata: { role: "author", permission_level: 1 } };
    aal = "aal1";
    const r = await requireAuth();
    expect(r.error?.status).toBe(403);
    expect((await r.error!.json()).code).toBe("MFA_REQUIRED");
  });
});
