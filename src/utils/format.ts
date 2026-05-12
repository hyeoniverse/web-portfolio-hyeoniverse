/**
 * 큰 숫자를 짧은 표기로 — 1000+ 은 "1.2k", 1000000+ 은 "3.4m".
 * 정수 자릿수는 그대로 (예: 1000 → "1k", 1500 → "1.5k").
 */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}
