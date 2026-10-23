/**
 * 글자 폭 어림 — 한글·한자·일본어 글자는 로마자의 두 배쯤 차지한다(#1062).
 *
 * 제목이 들어갈 자리에 몇 글자가 들어가는지 재려면 글자 수가 아니라 이 폭을 세야 한다.
 * 원통 배치(인트로·작업물 제목)와 flow 배치의 고정 제목이 같이 쓴다 — 재는 방법이 갈리면
 * 같은 제목이 배치마다 다른 크기로 줄어든다.
 */
const WIDE_CHAR = /[\u1100-\u11FF\u2E80-\uA4CF\uAC00-\uD7FF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60]/;

export function textUnits(text: string): number {
  let units = 0;
  for (const ch of text) units += WIDE_CHAR.test(ch) ? 2 : 1;
  return units;
}
