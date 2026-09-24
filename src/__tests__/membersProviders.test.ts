import { beforeEach, describe, expect, it, vi } from "vitest";
import { listMembers } from "@/lib/api/members";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/getSiteConfig", () => ({
  getSiteConfig: vi.fn(async () => ({ authors: [] })),
}));

/* 멤버 목록의 로그인 수단(provider) 판별 (#1149)
   — GoTrue 의 listUsers 는 identities 를 빈 배열로 반환하므로 app_metadata.providers 가 정본이다 */

function adminWith(users: unknown[]): SupabaseClient {
  return {
    auth: { admin: { listUsers: vi.fn(async () => ({ data: { users } })) } },
    from: () => ({
      select: () => ({ is: () => ({ order: () => ({ data: [] }) }) }),
    }),
  } as unknown as SupabaseClient;
}

const baseUser = {
  id: "u1",
  email: "owner@example.com",
  created_at: "2026-01-01T00:00:00Z",
  last_sign_in_at: "2026-09-24T00:00:00Z",
  app_metadata: { role: "owner", providers: ["email", "github"] },
  user_metadata: { user_name: "octo", avatar_url: "https://a/x.png" },
  identities: [] as unknown[],
};

beforeEach(() => vi.clearAllMocks());

describe("listMembers providers", () => {
  it("identities 가 빈 배열이어도 app_metadata.providers 로 GitHub 연결을 표시한다", async () => {
    const { members } = await listMembers(adminWith([baseUser]));
    expect(members[0].providers).toContain("github");
    expect(members[0].providers).toContain("email");
  });

  it("identities 가 채워져 오면 합집합으로 합친다 — 중복 없이", async () => {
    const u = { ...baseUser, identities: [{ provider: "github", identity_data: {} }] };
    const { members } = await listMembers(adminWith([u]));
    expect(members[0].providers.filter((p) => p === "github")).toHaveLength(1);
  });

  it("identities 가 비어도 user_metadata 의 GitHub 계정명으로 프로필 URL 을 만든다", async () => {
    const { members } = await listMembers(adminWith([baseUser]));
    expect(members[0].githubUrl).toBe("https://github.com/octo");
  });

  it("providers 정보가 아예 없으면 빈 배열 — 미연결 표시 유지", async () => {
    const u = { ...baseUser, app_metadata: { role: "owner" }, user_metadata: {} };
    const { members } = await listMembers(adminWith([u]));
    expect(members[0].providers).toEqual([]);
  });
});
