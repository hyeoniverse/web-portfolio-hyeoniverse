import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { moveId, moveSeriesTo, seriesPositions } from "@/lib/seriesOrder";

/* 시리즈 순번 — 화면 번호는 sort_order 값이 아니라 순서상 몇 번째인지. 옮기면 전체를 1부터 다시 매긴다 */

type Row = { id: string; sort_order: number; created_at: string };

/** series 표 흉내 — select().order().order() 와 update().eq() 만 */
function fakeSupabase(rows: Row[]) {
  const writes: { id: string; sort_order: number }[] = [];
  const client = {
    from: () => ({
      select: () => {
        const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at));
        const chain = { order: () => chain, then: (res: (v: { data: Row[]; error: null }) => unknown) => res({ data: sorted, error: null }) };
        return chain;
      },
      update: (patch: { sort_order: number }) => ({
        eq: async (_col: string, id: string) => {
          writes.push({ id, sort_order: patch.sort_order });
          rows.find((r) => r.id === id)!.sort_order = patch.sort_order;
          return { error: null };
        },
      }),
    }),
  };
  return { client: client as unknown as SupabaseClient, writes };
}

describe("seriesOrder", () => {
  it("moveId — 그 자리에 끼우고, 범위를 벗어나면 맨 앞 · 맨 뒤", () => {
    expect(moveId(["a", "b", "c", "d"], "d", 2)).toEqual(["a", "d", "b", "c"]);
    expect(moveId(["a", "b", "c", "d"], "a", 3)).toEqual(["b", "c", "a", "d"]);
    expect(moveId(["a", "b", "c"], "b", 0)).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "a", 99)).toEqual(["b", "c", "a"]);
  });

  it("순번은 sort_order 값과 관계없이 1부터 이어진다 — 0 · 빈 번호 · 중복", async () => {
    const { client } = fakeSupabase([
      { id: "a", sort_order: 0, created_at: "2026-10-01" },
      { id: "b", sort_order: 4, created_at: "2026-10-02" },
      { id: "c", sort_order: 4, created_at: "2026-10-03" },
    ]);
    expect([...(await seriesPositions(client))]).toEqual([["a", 1], ["c", 2], ["b", 3]]);
  });

  it("옮기면 전체를 1부터 다시 매기고, 값이 바뀐 행만 쓴다", async () => {
    const rows = [
      { id: "a", sort_order: 0, created_at: "2026-10-01" },
      { id: "b", sort_order: 2, created_at: "2026-10-02" },
      { id: "c", sort_order: 5, created_at: "2026-10-03" },
    ];
    const { client, writes } = fakeSupabase(rows);
    await moveSeriesTo(client, "c", 1);
    expect([...(await seriesPositions(client))]).toEqual([["c", 1], ["a", 2], ["b", 3]]);
    expect(rows.map((r) => [r.id, r.sort_order])).toEqual([["a", 2], ["b", 3], ["c", 1]]);
    expect(writes.map((w) => w.id).sort()).toEqual(["a", "b", "c"]);

    writes.length = 0;
    await moveSeriesTo(client, "c", 1);
    expect(writes).toHaveLength(0);
  });
});
