// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

/* 작업물 정렬 순서(#873). 실제 PATCH/POST 라우트를 메모리 표 위에서 돌린다 — DB 에 닿지 않는다.
   편집기는 이 작업물의 자리만 보내고, 서버가 요청 하나 안에서 그 자리에 끼우고 나머지를 1..N 으로 다시 매긴다.
   예전처럼 밀리는 작업물마다 따로 보내면 저장 전에 순서가 바뀌고 요청끼리 덮어써 뒤섞였다(이슈에 재현 결과). */

type Row = { id: string; title: string; sort_order: number; created_at: string; deleted_at: null };
const db: { rows: Row[] } = { rows: [] };

function fakeClient() {
  const from = () => {
    const q: { filters: Array<[string, unknown]>; orders: string[]; limitN?: number } = { filters: [], orders: [] };
    const run = () => {
      let r = db.rows.filter((x) => q.filters.every(([k, v]) => (x as Record<string, unknown>)[k] === v));
      r = [...r].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
      if (q.orders[0] === "sort_order desc") r.reverse();
      return q.limitN ? r.slice(0, q.limitN) : r;
    };
    const selectBuilder = {
      is: () => selectBuilder,
      eq: (k: string, v: unknown) => { q.filters.push([k, v]); return selectBuilder; },
      order: (col: string, o?: { ascending?: boolean }) => { q.orders.push(`${col}${o?.ascending === false ? " desc" : ""}`); return selectBuilder; },
      limit: (n: number) => { q.limitN = n; return selectBuilder; },
      single: async () => ({ data: run()[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then: (res: (v: unknown) => void) => Promise.resolve().then(() => res({ data: run().map((x) => ({ ...x })), error: null })),
    };
    return {
      select: () => selectBuilder,
      update: (payload: Partial<Row>) => ({
        eq: (_k: string, id: string) => {
          const apply = () => { const row = db.rows.find((x) => x.id === id); if (row) Object.assign(row, payload); return row; };
          return {
            then: (res: (v: unknown) => void) => Promise.resolve().then(() => res({ data: apply(), error: null })),
            select: () => ({ single: async () => ({ data: apply(), error: null }) }),
          };
        },
      }),
      insert: (row: Partial<Row>) => ({
        select: () => ({ single: async () => {
          const r = { id: `new-${db.rows.length}`, title: "N", created_at: `2026-09-13T00:00:${String(db.rows.length).padStart(2, "0")}Z`, deleted_at: null, sort_order: 0, ...row } as Row;
          db.rows.push(r); return { data: r, error: null };
        } }),
      }),
    };
  };
  return { from };
}

vi.mock("@/lib/api/requirePostAccess", () => ({
  requirePostAccess: async () => ({ supabase: fakeClient(), role: { isOwner: true, level: 100 }, user: {} }),
  policyBlocked: () => new Response(null, { status: 403 }),
}));
vi.mock("@/lib/api/requireRole", () => ({ requireRole: async () => ({ supabase: fakeClient(), user: {} }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeClient() }));
vi.mock("@/lib/api/validateCategory", () => ({ ensureWorksCategory: async () => {} }));

import { PATCH } from "@/app/api/works/[id]/route";
import { POST } from "@/app/api/works/route";

const seed = (titles: string[]) => {
  db.rows = titles.map((t, i) => ({ id: t, title: t, sort_order: i + 1, created_at: `2026-01-01T00:00:0${i}Z`, deleted_at: null }));
};
const order = () => [...db.rows].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)).map((r) => `${r.title}${r.sort_order}`).join(" ");
const patch = (id: string, body: object) => PATCH(new Request(`http://local/api/works/${id}`, { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
const post = (body: object) => POST(new Request("http://local/api/works", { method: "POST", body: JSON.stringify(body) }));

describe("작업물 정렬 순서", () => {
  beforeEach(() => seed(["A", "B", "C", "D", "E"]));

  it("이 작업물의 자리만 PATCH 하면 그 자리에 들고 나머지는 순서를 지킨 채 1..N", async () => {
    await patch("E", { sort_order: 2 });
    expect(order()).toBe("A1 E2 B3 C4 D5");
  });

  it("번호가 비거나 겹친 표에서도 지금 순서를 지키며 다시 매긴다", async () => {
    db.rows[1].sort_order = 5; db.rows[3].sort_order = 1; // A1 B5 C3 D1 E5 → 보이는 순서 A D C B E
    await patch("E", { sort_order: 2 });
    expect(order()).toBe("A1 E2 D3 C4 B5");
  });

  it("새 작업물에 자리를 주면 그 자리에 끼우고 다시 매긴다 — 1번째도 맨 앞", async () => {
    seed(["A", "B", "C", "D"]);
    await post({ title: "N", sort_order: 2 });
    expect(order()).toBe("A1 N2 B3 C4 D5");
    seed(["A", "B", "C", "D"]);
    await post({ title: "N", sort_order: 1 });
    expect(order()).toBe("N1 A2 B3 C4 D5");
  });

  it("새 작업물에 자리를 주지 않거나 0 이면 맨 뒤", async () => {
    seed(["A", "B", "C", "D"]);
    await post({ title: "N" });
    expect(order()).toBe("A1 B2 C3 D4 N5");
    seed(["A", "B", "C", "D"]);
    await post({ title: "N", sort_order: 0 });
    expect(order()).toBe("A1 B2 C3 D4 N5");
  });
});
