/**
 * 시리즈 카테고리 — 시리즈는 자기 카테고리를 갖지 않는다(#326 에서 편집 칸과 쓰기 경로를 없앴다).
 * 대신 소속 글들의 카테고리 중 가장 많은 것을 그 시리즈의 카테고리로 본다.
 *
 * 한 시리즈에 카테고리가 다른 글이 섞일 수 있어 하나를 골라야 한다. 수가 같으면 이름 순으로
 * 앞선 것을 골라, 같은 데이터면 어디서 읽어도 같은 값이 나오게 한다.
 * 글이 없거나 전부 비어 있으면 빈 문자열 — 부르는 쪽은 배지를 그리지 않는다.
 */
export function topPostCategory(categories: (string | null | undefined)[]): string {
  const tally = new Map<string, number>();
  for (const raw of categories) {
    const category = (raw ?? "").trim();
    if (!category) continue;
    tally.set(category, (tally.get(category) ?? 0) + 1);
  }
  let top = "";
  let topCount = 0;
  for (const [category, count] of tally) {
    if (count > topCount || (count === topCount && category.localeCompare(top) < 0)) {
      top = category;
      topCount = count;
    }
  }
  return top;
}
