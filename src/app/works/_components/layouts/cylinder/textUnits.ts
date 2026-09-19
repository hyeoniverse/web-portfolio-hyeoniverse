/**
 * 글자 폭 어림 — 한글·한자·일본어 글자는 로마자의 두 배쯤 차지한다(#1062).
 *
 * 판 너비에 제목이 몇 글자 들어가는지 재려면 글자 수가 아니라 이 폭을 세야 한다. 인트로 패널과
 * 작업물 제목이 같이 쓴다 — 둘 다 같은 판 위에 있으니 재는 방법도 같아야 한다.
 */
const WIDE_CHAR = /[\u1100-\u11FF\u2E80-\uA4CF\uAC00-\uD7FF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60]/;

export function textUnits(text: string): number {
  let units = 0;
  for (const ch of text) units += WIDE_CHAR.test(ch) ? 2 : 1;
  return units;
}
