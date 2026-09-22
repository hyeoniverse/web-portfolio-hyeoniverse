// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

/* 작업물 표가 비었을 때 데모 작업물을 넣지 않는다. 예전에는 표가 비면 data/projects.ts 를 발행 상태로
   DB 에 넣어(seed), 관리자에서 작업물을 모두 지운 뒤 누가 목록을 열면 데모 작업물이 되살아났다. */

const inserted: unknown[] = [];
const state: { rows: unknown[]; error: { message: string } | null } = { rows: [], error: null };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const q: Record<string, unknown> = {
        select: () => q,
        eq: () => q,
        order: () => Promise.resolve({ data: state.rows, error: state.error }),
        insert: (rows: unknown) => { inserted.push(rows); return Promise.resolve({ error: null }); },
      };
      return q;
    },
  }),
}));

describe("getWorks", () => {
  beforeEach(() => {
    vi.resetModules();
    inserted.length = 0;
    state.rows = [];
    state.error = null;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://local";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test";
  });

  it("표가 비었으면 빈 목록이고, 데모 작업물을 넣지 않는다", async () => {
    const { getWorks } = await import("@/lib/getWorks");
    expect(await getWorks()).toEqual([]);
    expect(inserted).toHaveLength(0);
  });

  it("DB 를 읽지 못하면 정적 데이터로 대신한다(넣지는 않는다)", async () => {
    state.error = { message: "down" };
    const { getWorks } = await import("@/lib/getWorks");
    const { projects } = await import("@/data/projects");
    expect(await getWorks()).toEqual(projects);
    expect(inserted).toHaveLength(0);
  });
});
