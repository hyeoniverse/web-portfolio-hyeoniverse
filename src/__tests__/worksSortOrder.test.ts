// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

/* 작업물 정렬 순서(#873). 실제 PATCH/POST 라우트를 메모리 표 위에서 돌린다 — DB 에 닿지 않는다.
   편집기는 이 작업물의 자리만 보내고, 서버가 요청 하나 안에서 그 자리에 끼우고 나머지를 1..N 으로 다시 매긴다.
   예전처럼 밀리는 작업물마다 따로 보내면 저장 전에 순서가 바뀌고 요청끼리 덮어써 뒤섞였다(이슈에 재현 결과). */

type Row = { id: string; title: string; sort_order: number; created_at: string; deleted_at: string | null };
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
      is: (k: string, v: unknown) => { q.filters.push([k, v]); return selectBuilder; },
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
// 저장 뒤 공개 화면 갱신(#909) — Next 요청 밖이라 실제 revalidatePath 는 부를 수 없어, 불렸는지만 센다
const { revalidated } = vi.hoisted(() => ({ revalidated: vi.fn() }));
vi.mock("@/lib/api/revalidateWorks", () => ({ revalidatePublicWorks: revalidated }));

import { PATCH, DELETE } from "@/app/api/works/[id]/route";
import { POST } from "@/app/api/works/route";

const seed = (titles: string[]) => {
  db.rows = titles.map((t, i) => ({ id: t, title: t, sort_order: i + 1, created_at: `2026-01-01T00:00:0${i}Z`, deleted_at: null }));
};
const order = () => [...db.rows].filter((r) => !r.deleted_at).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)).map((r) => `${r.title}${r.sort_order}`).join(" ");
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

  /* 휴지통으로 보내기는 남은 작업물을 다시 매기지 않아 빈 번호가 남는다. 편집기는 자리를 옮겼을 때만 sort_order 를
     목록의 자리로 보낸다 — 예전처럼 원래 값(4)을 늘 보내면 빈 번호 뒤 D 가 한 칸 밀렸다(A1 B2 E3 D4) */
  it("빈 번호가 있어도 sort_order 없이 저장하면 순서를 건드리지 않는다", async () => {
    db.rows[2].deleted_at = "2026-09-13T00:00:00Z"; // C 를 휴지통으로 — A1 B2 (C3) D4 E5
    await patch("D", { title: "D (고침)" });
    expect(order()).toBe("A1 B2 D (고침)4 E5");
  });

  it("빈 번호 뒤 작업물을 목록의 자리(3번째)로 보내면 제자리를 지키며 다시 매겨진다", async () => {
    db.rows[2].deleted_at = "2026-09-13T00:00:00Z";
    await patch("D", { sort_order: 3 });
    expect(order()).toBe("A1 B2 D3 E4");
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

/* 작업물 상세는 미리 그려 캐시한다(#909). 쓰기가 끝나면 공개 목록·상세를 다시 그리게 해야 바뀐 내용이 바로 보인다.
   자리를 옮기는 경로는 placeWork 로 먼저 돌아가므로 따로 본다. */
describe("저장 뒤 공개 화면 갱신", () => {
  beforeEach(() => { seed(["A", "B", "C"]); revalidated.mockClear(); });
  const del = (id: string) => DELETE(new Request(`http://local/api/works/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });

  it("수정하면 다시 그리게 한다 — 자리를 옮기는 경로도", async () => {
    await patch("B", { title: "B2" });
    expect(revalidated).toHaveBeenCalledTimes(1);
    await patch("C", { sort_order: 1 });
    expect(revalidated).toHaveBeenCalledTimes(2);
  });

  it("새로 만들면 다시 그리게 한다 — 자리를 주는 경로도", async () => {
    await post({ title: "N" });
    await post({ title: "M", sort_order: 1 });
    expect(revalidated).toHaveBeenCalledTimes(2);
  });

  it("휴지통으로 보내면 다시 그리게 한다", async () => {
    await del("A");
    expect(revalidated).toHaveBeenCalledTimes(1);
  });
});
