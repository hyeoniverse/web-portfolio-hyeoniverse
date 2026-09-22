// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

/* 휴지통 목록은 본문 없이 내려준다(#1109). 본문(content)이 목록 전송량의 대부분이라, 영구 삭제 뒤
   목록을 다시 받는 데만 1초 가까이 걸렸다. 검색은 select 와 상관없이 서버가 본문으로 거른다. */

const calls: { table: string; select: string; filters: string[] }[] = [];

/** PostgREST 빌더 흉내 — 무엇을 select 했는지와 어떤 거르기를 걸었는지만 적고, 빈 결과로 끝난다 */
function builder(table: string) {
  const rec = { table, select: "", filters: [] as string[] };
  calls.push(rec);
  const result = { data: [], count: 0, error: null };
  const b: Record<string, unknown> = {
    select(cols: string) { rec.select = cols; return b; },
    then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) { return Promise.resolve(result).then(res, rej); },
  };
  for (const m of ["not", "eq", "is", "in", "or", "order", "range", "contains", "overlaps", "limit", "ilike"]) {
    b[m] = (...args: unknown[]) => { rec.filters.push(`${m}:${JSON.stringify(args)}`); return b; };
  }
  return b;
}
const client = { from: (t: string) => builder(t) };

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => client }));
vi.mock("@/lib/api/requireAuth", () => ({ requireAuth: async () => ({ supabase: client, user: { id: "u" } }) }));
vi.mock("@/lib/api/validateCategory", () => ({ expandPostCategoryFilters: async () => [], ensureWorksCategory: async () => null }));

import { GET as worksGET } from "@/app/api/works/route";
import { GET as postsGET } from "@/app/api/posts/route";

const req = (path: string) => new Request(`http://local${path}`);

describe("휴지통 목록", () => {
  beforeEach(() => { calls.length = 0; });

  it("작업물 휴지통은 본문·긴 글·갤러리를 읽지 않는다", async () => {
    await worksGET(req("/api/works?trash=true&limit=100"));
    const cols = calls.find((c) => c.table === "works")!.select.split(",");
    for (const heavy of ["content_ko", "content_en", "gallery", "gallery_notes", "description_ko", "overview_ko"]) {
      expect(cols).not.toContain(heavy);
    }
    /* 표·툴팁·편집 권한 판정에 쓰는 칸은 남는다 */
    for (const need of ["id", "title", "image", "deleted_at", "purge_after", "team_members", "sort_order"]) {
      expect(cols).toContain(need);
    }
  });

  it("작업물 공개 목록은 그대로 모든 칸을 읽는다", async () => {
    await worksGET(req("/api/works"));
    expect(calls.find((c) => c.table === "works")!.select).toBe("*");
  });

  it("글 휴지통은 본문 없이 읽는다", async () => {
    await postsGET(req("/api/posts?trash=true&limit=100"));
    const select = calls.find((c) => c.table === "posts")!.select;
    expect(select).not.toMatch(/(^|,)\s*\*/);
    expect(select.split(",")).not.toContain("content");
    expect(select.split(",")).not.toContain("content_en");
  });

  it("휴지통 본문 검색은 서버가 본문 칸으로 거른다", async () => {
    await postsGET(req("/api/posts?trash=true&limit=100&search=hello&searchType=content"));
    const filters = calls.find((c) => c.table === "posts")!.filters.join(" ");
    expect(filters).toMatch(/content\.ilike/);
  });
});
