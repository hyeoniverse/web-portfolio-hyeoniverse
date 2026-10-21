import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeLanding, pruneLanding } from "@/types/workLanding";

/**
 * works.landing_ko / landing_en 칸 — 저장 전에 모양을 맞추고, 칸이 아직 없는 DB 에서도 작업물 저장이 되게 한다.
 *
 * 랜딩 페이지 칸은 마이그레이션(2026_10_22_works_landing.sql)을 적용해야 생긴다. 적용 전 DB 에 그 칸을 담아 쓰면
 * PostgREST 가 "칸을 찾을 수 없다"(PGRST204)로 저장을 통째로 거절해 제목 · 본문 저장까지 막힌다.
 * 칸이 없으면 두 칸만 빼고 저장하고, 뺐다는 사실을 응답 헤더(WORK_LANDING_DROPPED_HEADER)로 알린다.
 * workCoverColumns 와 같은 방식이다.
 */
export const WORK_LANDING_DROPPED_HEADER = "x-work-landing-dropped";

const LANDING_FIELDS = ["landing_ko", "landing_en"] as const;

let columnsExist = false;

function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return /landing_(ko|en)/.test(error.message ?? "") && (error.code === "PGRST204" || error.code === "42703");
}

/** 요청 본문의 랜딩 값을 모양에 맞추고 빈 줄을 덜어 낸다 */
export function normalizeLandingFields(fields: Record<string, unknown>): void {
  for (const f of LANDING_FIELDS) {
    if (f in fields) fields[f] = pruneLanding(normalizeLanding(fields[f]));
  }
}

/** fields 에 랜딩 칸이 있는데 DB 에 칸이 없으면 fields 에서 뺀다. 뺐으면 true */
export async function dropWorkLandingIfMissing(
  client: SupabaseClient,
  fields: Record<string, unknown>,
): Promise<boolean> {
  if (!LANDING_FIELDS.some((f) => f in fields) || columnsExist) return false;
  const { error } = await client.from("works").select(LANDING_FIELDS.join(",")).limit(1);
  if (!error) {
    columnsExist = true;
    return false;
  }
  if (!isMissingColumn(error)) return false;
  for (const f of LANDING_FIELDS) delete fields[f];
  return true;
}
