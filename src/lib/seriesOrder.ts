import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 시리즈 순번 — 관리 화면의 "#N" 은 sort_order 값이 아니라 사용자 정의 순서에서 몇 번째인지다.
 * sort_order 는 순서를 정하는 키일 뿐이라 0 · 빈 번호 · 중복이 섞여도 화면 번호는 1, 2, 3… 으로 이어진다.
 * 자리를 옮기면 전체를 1부터 다시 매겨 저장 값도 정돈된다.
 */

/** 사용자 정의 순서 — 목록 기본 정렬과 같다(sort_order 오름차순, 같으면 최신 먼저) */
async function orderedSeries(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("series")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as { id: string; sort_order: number }[];
}

/** id → 순번(1부터) */
export async function seriesPositions(supabase: SupabaseClient): Promise<Map<string, number>> {
  return new Map((await orderedSeries(supabase)).map((s, i) => [s.id, i + 1]));
}

/** id 를 position(1부터) 자리로 옮긴 순서. 범위를 벗어나면 맨 앞 · 맨 뒤 */
export function moveId(ids: string[], id: string, position: number): string[] {
  const rest = ids.filter((x) => x !== id);
  const at = Math.min(Math.max(Math.round(position) - 1, 0), rest.length);
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

/** 시리즈를 position 자리로 옮기고 전체 sort_order 를 1부터 다시 매긴다 — 값이 바뀐 행만 쓴다 */
export async function moveSeriesTo(supabase: SupabaseClient, id: string, position: number) {
  const rows = await orderedSeries(supabase);
  const current = new Map(rows.map((r) => [r.id, r.sort_order]));
  const next = moveId(rows.map((r) => r.id), id, position);
  await Promise.all(
    next
      .map((sid, i) => ({ sid, order: i + 1 }))
      .filter(({ sid, order }) => current.get(sid) !== order)
      .map(async ({ sid, order }) => {
        const { error } = await supabase.from("series").update({ sort_order: order }).eq("id", sid);
        if (error) throw error;
      }),
  );
}
