/**
 * 문자 → 초성/이니셜 추출. 정렬 chip 필터 (한글 자음 / 영어 알파벳) 용도.
 *
 * - 한글 음절 (가–힣): 초성 (ㄱ-ㅎ) 반환. 쌍자음 (ㄲ/ㄸ/ㅃ/ㅆ/ㅉ) 은 base 자음 (ㄱ/ㄷ/ㅂ/ㅅ/ㅈ) 으로 normalize.
 * - 한글 자음 자체: 그대로 (또는 normalize).
 * - 영어: 대문자.
 * - 그 외: "#" (숫자/특수).
 */

const KO_INITIAL_BASE: readonly string[] = [
  "ㄱ", "ㄱ", "ㄴ", "ㄷ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅂ",
  "ㅅ", "ㅅ", "ㅇ", "ㅈ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/** UI 표시용 base 자음 14개 + 기타("#") */
export const KO_INITIALS: readonly string[] = [
  "ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "#",
];

/** UI 표시용 영어 알파벳 26 + 기타("#") */
export const EN_INITIALS: readonly string[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "#",
];

/** 한 글자에서 초성 추출. 한글이면 base 자음, 영어면 대문자, 그 외 "#". */
export function getInitial(s: string, lang: "ko" | "en"): string {
  if (!s) return "#";
  const ch = s[0];
  const code = ch.charCodeAt(0);
  if (lang === "ko") {
    // 한글 음절 (가–힣)
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const index = Math.floor((code - 0xAC00) / (21 * 28));
      return KO_INITIAL_BASE[index];
    }
    // 한글 자음 (ㄱ–ㅎ)
    if (code >= 0x3131 && code <= 0x314E) return ch;
    return "#";
  }
  // en
  if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) {
    return ch.toUpperCase();
  }
  return "#";
}
