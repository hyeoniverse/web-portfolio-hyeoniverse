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

/**
 * 목록의 번호를 1..N 으로 촘촘하게 다시 매긴다.
 *
 * 관리 화면은 sort_order 를 그대로 번호로 찍는다. 그래서 값이 비거나 겹치면 목록에 1·2·4·9 처럼
 * 보인다. 새로 만들 때는 "맨 뒤 = 최댓값 + 1" 로 넣는데, 휴지통에 든 행이 큰 값을 쥐고 있거나
 * 지워서 중간이 비면 곧바로 어긋난다(저장소를 여러 개 한꺼번에 들일 때 특히 눈에 띈다).
 *
 * 지금 차례(sort_order, 같으면 만든 순)는 그대로 두고 번호만 고쳐 쓴다. 바뀌는 행만 쓴다.
 */
export async function renumberWorks(client: SupabaseClient): Promise<void> {
  const { data: all } = await client
    .from("works")
    .select("id, sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (!all) return;
  const updates = (all as { id: string; sort_order: number }[])
    .flatMap((w, i) => (w.sort_order !== i + 1 ? [{ id: w.id, sort_order: i + 1 }] : []));
  await Promise.all(updates.map((u) => client.from("works").update({ sort_order: u.sort_order }).eq("id", u.id)));
}
