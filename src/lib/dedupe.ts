/* ──────────────────────────────────────────────────────────────────────────
   Duplicate detection helpers — 태그/카테고리 등 짧은 라벨의 중복 검사를
   한 규칙으로 통일.

   정규화 규칙:
     - 대소문자 무시 (en/ko 둘 다 안전, 한글은 lowercase noop)
     - 공백 무시 ("Web App" === "webapp" === "WEB APP")

   필요 시 (예: 기호/하이픈도 무시) 여기 한 곳만 확장하면 모든 호출 사이트가
   같은 규칙을 따름.
   ────────────────────────────────────────────────────────────────────────── */

/** 비교용 정규화 — 대소문자 + 공백 무시 */
function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

/** 두 문자열이 정규화 비교에서 같은가 */
export function isSameKey(a: string, b: string): boolean {
  return normalizeForCompare(a) === normalizeForCompare(b);
}

/**
 * items 안에서 candidate 비교 키 중 하나라도 매칭되는 item 찾기.
 * - candidates: 비교할 입력 값들 (예: bilingual `{ko, en}` 의 ko와 en 두 개)
 * - getKeys: 각 item 에서 비교 키 추출 (예: `(c) => [c.ko, c.en]`)
 * - exclude: 편집 모드에서 자기 자신 제외용 predicate (선택)
 */
export function findDuplicate<T>(
  items: readonly T[],
  candidates: readonly string[],
  getKeys: (item: T) => readonly string[],
  exclude?: (item: T) => boolean,
): T | undefined {
  const normCandidates = candidates.map(normalizeForCompare).filter(Boolean);
  if (normCandidates.length === 0) return undefined;
  for (const item of items) {
    if (exclude?.(item)) continue;
    const keys = getKeys(item).map(normalizeForCompare).filter(Boolean);
    if (keys.some((k) => normCandidates.includes(k))) return item;
  }
  return undefined;
}
