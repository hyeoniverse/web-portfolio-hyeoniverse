/**
 * 한글 초성 + 부분일치 검색 util — 짧은 이름·태그·카테고리 필터용.
 *
 * ⚠️ 긴 본문 검색엔 쓰지 말 것: 초성열이 거의 모든 문장에 매칭돼 오탐이 남.
 *    본문/고급 문법(+/-/OR/regex) 검색은 `@/lib/searchQuery` 사용.
 */

/* 한글 음절 → 초성 (쌍자음 ㄲ/ㄸ/ㅃ/ㅆ/ㅉ 은 base 자음으로). 비한글 문자는 그대로. */
const KO_CHO = ["ㄱ", "ㄱ", "ㄴ", "ㄷ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅂ", "ㅅ", "ㅅ", "ㅇ", "ㅈ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

/** 문자열의 초성열 추출. "리액트" → "ㄹㅇㅌ", "React 19" → "react 19" */
export function getChosung(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) out += KO_CHO[Math.floor((code - 0xac00) / 588)];
    else out += ch;
  }
  return out;
}

/**
 * 부분일치 + 초성 매칭. query 가 주어진 텍스트 중 하나에 부분일치하거나,
 * 그 텍스트의 초성열에 포함되면 true.
 *
 * - 영문 부분일치: "r" / "re" / "act" → "React"
 * - 한글 부분일치: "리액트" → "리액트"
 * - 초성: "ㄹㅇ" / "ㄹㅇㅌ" → "리액트"
 *
 * 여러 후보(이름·별칭·카테고리 등)를 한 번에 넘기면 그중 하나라도 맞으면 true.
 */
export function matchesSearch(query: string, ...texts: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  for (const t of texts) {
    if (!t) continue;
    const lt = t.toLowerCase();
    if (lt.includes(q)) return true;
    if (getChosung(lt).includes(q)) return true;
  }
  return false;
}
