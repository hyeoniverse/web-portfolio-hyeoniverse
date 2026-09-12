// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import type { User } from "@supabase/supabase-js";

/* 글·작업물 편집, 시리즈 저장, 표지 이미지, 자동 번역이 실패할 때 화면이 번역할 수 있는 코드를 싣는지(#862).
   DB 는 편집 권한 조회만 흉내 내고, 외부 서비스는 fetch 흉내로 대신한다. */

const author = { id: "a1", email: "writer@example.com", app_metadata: { role: "author", permission_level: 10, author_id: "me" } } as unknown as User;
vi.mock("@/lib/api/requireAuth", () => ({ requireAuth: async () => ({ user: author, supabase: {} }) }));
const rows: Record<string, unknown> = {};
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: rows[table] ?? null, error: null }) }) }) }),
  }),
}));
vi.mock("@/lib/getSecret", () => ({ getSecret: async () => null }));

import { requirePostAccess } from "@/lib/api/requirePostAccess";
import { POST as createSeries } from "@/app/api/series/route";
import { GET as unsplash } from "@/app/api/cover/unsplash/route";
import { autoTranslate } from "@/utils/autoTranslate";
import { CodedError } from "@/lib/apiError";

async function bodyOf(res: Response) {
  return { status: res.status, body: await res.json() };
}

describe("편집 권한", () => {
  it("남의 글이면 POST_OWN_ONLY 와 지금 권한 레벨", async () => {
    rows.posts = { author_ids: ["someone-else"] };
    const r = await requirePostAccess("posts", "p1");
    const { status, body } = await bodyOf(r.error!);
    expect(status).toBe(403);
    expect(body.code).toBe("POST_OWN_ONLY");
    expect(typeof body.params.level).toBe("number");
  });
  it("팀원이 아닌 작업물이면 WORK_TEAM_ONLY", async () => {
    rows.works = { team_members: [{ author_id: "someone-else" }] };
    const r = await requirePostAccess("works", "w1");
    expect((await bodyOf(r.error!)).body.code).toBe("WORK_TEAM_ONLY");
  });
});

describe("시리즈·표지", () => {
  it("시리즈 제목이 길면 SERIES_TITLE_TOO_LONG 과 한도", async () => {
    const req = new Request("http://local/api/series", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "가".repeat(500) }) });
    const { status, body } = await bodyOf(await createSeries(req));
    expect(status).toBe(400);
    expect(body.code).toBe("SERIES_TITLE_TOO_LONG");
    expect(typeof body.params.max).toBe("number");
  });
  it("Unsplash 키가 없으면 UNSPLASH_KEY_MISSING", async () => {
    const { status, body } = await bodyOf(await unsplash(new Request("http://local/api/cover/unsplash?q=sky")));
    expect(status).toBe(503);
    expect(body.code).toBe("UNSPLASH_KEY_MISSING");
  });
});

describe("autoTranslate", () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it("실패하면 코드를 실은 CodedError 를 돌려준다(제공자 문장은 message 에만)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Gemini API error: 429", code: "TRANSLATION_FAILED" }), { status: 502 })));
    const r = await autoTranslate(["안녕"], "ko", "en");
    expect("error" in r).toBe(true);
    if ("error" in r) {
      expect(r.error).toBeInstanceOf(CodedError);
      expect(r.error.code).toBe("TRANSLATION_FAILED");
      expect(r.error.message).toBe("Gemini API error: 429");
    }
  });
  it("요청이 끊겨도 CodedError(코드 없음 — 화면은 대체 문구)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const r = await autoTranslate(["안녕"], "ko", "en");
    expect("error" in r && r.error instanceof CodedError && r.error.code === undefined).toBe(true);
  });
});
