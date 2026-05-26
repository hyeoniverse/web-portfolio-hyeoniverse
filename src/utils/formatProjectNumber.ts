/** Project display number — sort_order 에서 derive (zero-pad 2자리).
 *  사용자가 보는 "#01", "#02" 등은 정렬 순서와 항상 일치해야 하므로 단일 source 로 통일.
 *  sort_order 1 → "01", 12 → "12", 0 이하는 "00" 으로 clamp. */
export function formatProjectNumber(sortOrder: number | undefined | null): string {
  const n = typeof sortOrder === "number" && sortOrder > 0 ? sortOrder : 0;
  return String(n).padStart(2, "0");
}
