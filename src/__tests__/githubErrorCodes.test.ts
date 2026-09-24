// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { User } from "@supabase/supabase-js";

/* GitHub 연동(댓글 저장소 불러오기·저장소 목록)이 실패할 때 화면이 번역할 수 있는 코드를 싣는지(#862).
   GitHub 는 fetch 흉내로 대신한다 — 네트워크에 닿지 않는다. */

const owner = { id: "o1", email: "owner@example.com", app_metadata: { role: "owner" } } as unknown as User;
vi.mock("@/lib/api/requireAuth", () => ({ requireAuth: async () => ({ user: owner, supabase: {} }) }));
const secret: { token: string | null } = { token: "ghp_test" };
vi.mock("@/lib/getSecret", () => ({ getSecret: async () => secret.token }));
vi.mock("@/lib/getSiteConfig", () => ({ getSiteConfig: async () => ({ authors: [] }) }));

import { GET as giscusRepo } from "@/app/api/admin/giscus-repo/route";
import { GET as githubRepos } from "@/app/api/admin/profile/github-repos/route";

const call = (repo: string) => giscusRepo(new Request(`http://local/api/admin/giscus-repo?repo=${encodeURIComponent(repo)}`));
const github = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })));

async function codeOf(res: Response) {
  return { status: res.status, code: (await res.json()).code };
}

describe("/api/admin/giscus-repo", () => {
  beforeEach(() => { secret.token = "ghp_test"; });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("형식이 틀리면 GITHUB_REPO_FORMAT", async () => {
    expect(await codeOf(await call("no-slash"))).toEqual({ status: 400, code: "GITHUB_REPO_FORMAT" });
  });
  it("토큰이 없으면 GITHUB_TOKEN_MISSING — 화면이 토큰 입력 칸을 여는 needsToken 도 그대로", async () => {
    secret.token = null;
    const res = await call("me/repo");
    const body = await res.json();
    expect(body).toMatchObject({ code: "GITHUB_TOKEN_MISSING", needsToken: true });
  });
  it("GitHub 가 401·403 이면 토큰 문제로", async () => {
    github(401, { message: "Bad credentials" });
    expect(await codeOf(await call("me/repo"))).toEqual({ status: 401, code: "GITHUB_TOKEN_INVALID" });
    github(403, { message: "Forbidden" });
    expect(await codeOf(await call("me/repo"))).toEqual({ status: 403, code: "GITHUB_TOKEN_FORBIDDEN" });
  });
  it("GraphQL 오류 종류마다 코드", async () => {
    github(200, { errors: [{ type: "NOT_FOUND", message: "x" }] });
    expect((await codeOf(await call("me/repo"))).code).toBe("GITHUB_REPO_NOT_FOUND");
    github(200, { errors: [{ type: "FORBIDDEN", message: "x" }] });
    expect((await codeOf(await call("me/repo"))).code).toBe("GITHUB_REPO_FORBIDDEN");
    github(200, { errors: [{ type: "RATE_LIMITED", message: "x" }] });
    expect((await codeOf(await call("me/repo"))).code).toBe("GITHUB_RATE_LIMITED");
    github(200, { errors: [{ type: "SOMETHING", message: "x" }] });
    expect((await codeOf(await call("me/repo"))).code).toBe("GITHUB_REQUEST_FAILED");
  });
  it("저장소가 비면 GITHUB_REPO_NOT_FOUND, 요청이 끊기면 GITHUB_REQUEST_FAILED", async () => {
    github(200, { data: { repository: null } });
    expect(await codeOf(await call("me/repo"))).toEqual({ status: 404, code: "GITHUB_REPO_NOT_FOUND" });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    expect(await codeOf(await call("me/repo"))).toEqual({ status: 502, code: "GITHUB_REQUEST_FAILED" });
  });
});

describe("/api/admin/profile/github-repos", () => {
  it("소유자 프로필에 GitHub 링크가 없으면 GITHUB_OWNER_LINK_MISSING", async () => {
    const res = await githubRepos(new Request("http://localhost/api/admin/profile/github-repos"));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toMatchObject({ code: "GITHUB_OWNER_LINK_MISSING", repos: [] });
  });
});
