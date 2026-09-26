/* 국가 코드 표시 헬퍼 — 대시보드 국가별 방문 패널과 시간대 히트맵 상세가 함께 쓴다(#1161) */

/** ISO 3166-1 alpha-2 → 국기 이모지 (regional indicator 두 글자 조합) */
export function flagEmoji(code: string): string {
  return code.replace(/./g, (ch) =>
    String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65),
  );
}

/** ISO 3166-1 alpha-2 → 화면 언어의 국가 이름. 모르는 코드는 코드 그대로 보여준다. */
export function countryName(code: string, language: "ko" | "en"): string {
  try {
    return (
      new Intl.DisplayNames([language === "ko" ? "ko" : "en"], {
        type: "region",
      }).of(code) ?? code
    );
  } catch {
    return code;
  }
}
