/**
 * 큰 숫자를 짧은 표기로 — 1000+ 은 "1.2k", 1000000+ 은 "3.4m".
 * 정수 자릿수는 그대로 (예: 1000 → "1k", 1500 → "1.5k").
 */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

/**
 * ISO 날짜 문자열 → admin 리스트용 짧은 한국어 표기 "YY.MM.DD" (구분점 뒤 공백/후행점 제거).
 * 빈 값이면 빈 문자열.
 */
export function formatAdminShortDate(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso)
    .toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" })
    .replace(/\.\s/g, ".")
    .replace(/\.$/, "");
}

/**
 * 번역 문구의 `{{이름}}` 자리를 값으로 채운다. 값에 없는 이름은 그대로 둔다.
 * 값은 글자 그대로 들어간다 — `String.replace` 에 문자열을 넘기면 태그 이름 속 `$&` 같은 표기를 특수하게 읽는다.
 */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (hole, name: string) => (name in values ? String(values[name]) : hole));
}
