// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";

/* 관리자 권한·멤버·설정 저장이 거절할 때 화면이 번역할 수 있는 코드를 싣는지(#862).
   실제 DB 에 닿지 않도록 관리자 클라이언트는 설정 조회만 흉내 내고, 그 밖의 호출은 실패하게 둔다. */

const current: { user: User } = { user: {} as User };
vi.mock("@/lib/api/requireAuth", () => ({
  requireAuth: async () => ({ user: current.user, supabase: {} }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "site_settings") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: { config: { delta: {} } } }) }) }),
        update: () => { throw new Error("must not write in rejection tests"); },
      };
    },
    auth: { admin: { getUserById: async () => { throw new Error("must not be called"); } } },
  }),
}));

import { requireRole, requireOwner } from "@/lib/api/requireRole";
import { authErrorCode } from "@/lib/api/authErrorCode";
import { DELETE as deleteMember } from "@/app/api/admin/authors/members/route";
import { PATCH as patchSettings } from "@/app/api/admin/settings/route";

const author = (level: number) => ({ id: "a1", email: "writer@example.com", app_metadata: { role: "author", permission_level: level } }) as unknown as User;
const owner = { id: "o1", email: "owner@example.com", app_metadata: { role: "owner" } } as unknown as User;

async function bodyOf(res: Response) {
  return { status: res.status, body: await res.json() };
}

describe("권한 거절", () => {
  beforeEach(() => { current.user = author(10); });

  it("권한 레벨이 모자라면 FORBIDDEN_LEVEL 과 필요한 레벨·지금 레벨", async () => {
    const r = await requireRole(999);
    expect(r.error).toBeTruthy();
    const { status, body } = await bodyOf(r.error!);
    expect(status).toBe(403);
    expect(body.code).toBe("FORBIDDEN_LEVEL");
    expect(body.params.required).toBe(999);
    expect(body.params.role).toBe("author");
    expect(typeof body.params.level).toBe("number");
  });

  it("소유자 전용이면 FORBIDDEN_OWNER 와 지금 계정", async () => {
    const r = await requireOwner();
    const { status, body } = await bodyOf(r.error!);
    expect(status).toBe(403);
    expect(body).toMatchObject({ code: "FORBIDDEN_OWNER", params: { email: "writer@example.com" } });
  });
});

describe("Supabase 인증 오류", () => {
  it("알아볼 수 있는 사유만 코드로 바꾼다", () => {
    expect(authErrorCode({ code: "invalid_credentials" })).toBe("AUTH_PASSWORD_WRONG");
    expect(authErrorCode({ code: "email_not_confirmed" })).toBe("AUTH_EMAIL_NOT_CONFIRMED");
    expect(authErrorCode({ code: "over_email_send_rate_limit" })).toBe("AUTH_RATE_LIMITED");
    expect(authErrorCode({ code: "same_password" })).toBe("ACCOUNT_SAME_PASSWORD");
    expect(authErrorCode({ code: "weak_password" })).toBe("ACCOUNT_PASSWORD_WEAK");
    expect(authErrorCode({ code: "email_exists" })).toBe("ACCOUNT_EMAIL_TAKEN");
    expect(authErrorCode({ code: "email_address_invalid" })).toBe("ACCOUNT_EMAIL_INVALID");
    expect(authErrorCode({ code: "something_new" })).toBeUndefined();
    expect(authErrorCode(null)).toBeUndefined();
  });
});

describe("멤버·설정 저장", () => {
  it("본인 계정을 지우려 하면 MEMBER_CANNOT_DELETE_SELF", async () => {
    current.user = owner;
    const res = await deleteMember(new Request("http://local/api/admin/authors/members?id=o1", { method: "DELETE" }));
    const { status, body } = await bodyOf(res);
    expect(status).toBe(400);
    expect(body.code).toBe("MEMBER_CANNOT_DELETE_SELF");
  });

  it("소유자가 아닌 사람이 사이트 설정을 바꾸면 SETTINGS_OWNER_ONLY", async () => {
    current.user = author(10);
    const req = new Request("http://local/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ config: { delta: { metadata: { title: "New title" } } } }),
    });
    const { status, body } = await bodyOf(await patchSettings(req));
    expect(status).toBe(403);
    expect(body.code).toBe("SETTINGS_OWNER_ONLY");
    expect(body.error).toBe("Forbidden");
  });
});
