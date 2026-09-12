import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 작업물 하나를 원하는 자리(1부터)에 끼우고, 휴지통에 없는 나머지를 지금 순서대로 1..N 으로 다시 매긴다.
 * 번호가 비거나 겹친 것도 함께 정리한다. `extra` 는 대상 작업물에 함께 쓸 필드다.
 *
 * 요청 하나 안에서 끝나야 한다(#873). 여러 요청이 저마다 전체를 읽고 다시 매기면 서로 덮어쓴다 —
 * 편집기가 밀리는 작업물마다 따로 보내던 때에는 저장 전에 순서가 바뀌거나 뒤섞였다.
 * 표가 비어 있으면 아무것도 하지 않고 false 를 돌려준다.
 */
export async function placeWork(
  client: SupabaseClient,
  id: string,
  position: number,
  extra: Record<string, unknown> = {},
): Promise<boolean> {
  const { data: all } = await client
    .from("works")
    .select("id, sort_order, created_at")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (!all || all.length === 0) return false;

  const without = (all as { id: string; sort_order: number }[]).filter((w) => w.id !== id);
  const desiredIdx = Math.max(0, Math.min(position - 1, without.length));
  const reordered = [...without.slice(0, desiredIdx), { id, sort_order: 0 }, ...without.slice(desiredIdx)];

  // 바뀌는 행만 쓴다 — 대상은 늘, 나머지는 번호가 달라진 것만
  const updates = reordered.flatMap((w, idx) => {
    const expected = idx + 1;
    if (w.id === id) return [{ id, payload: { ...extra, sort_order: expected } }];
    return w.sort_order !== expected ? [{ id: w.id, payload: { sort_order: expected } }] : [];
  });
  await Promise.all(updates.map((u) => client.from("works").update(u.payload).eq("id", u.id)));
  return true;
}
