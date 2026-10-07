/**
 * AI 요약 프롬프트에서 관리자가 고칠 수 있는 부분 — 작성 지침(문체 · 블록 고르는 요령 · 피할 예).
 * 설정 › 서비스 › AI 자동 요약에서 고치고, 비우면 아래 기본값을 쓴다.
 *
 * 고칠 수 없는 부분(블록 정의 · 출력 형식 · 원문 자리)은 lib/api/aiSummaryProviders.buildSummaryPrompt 가 코드로 붙인다.
 * 그 부분이 바뀌면 화면이 요약을 읽지 못하므로 여기에 두지 않는다.
 *
 * 예시는 모두 지어낸 내용이다 — 이 사이트의 실제 수치를 넣으면 다른 글의 요약에 섞여 나온다.
 */

export const SUMMARY_GUIDE_MAX = 4000;

export const DEFAULT_SUMMARY_GUIDE = `## Voice
- Write like a Notion AI summary: facts first, one idea per sentence, scannable at a glance.
- Short sentences. Split instead of chaining clauses with "~하고, ~하며, ~했으며".
- Plain words. No praise or hype (최적화된, 혁신적인, 강력한, 효과적으로, 지속적으로, 다양한), no exclamation marks, no quotation marks.
- Keep technical terms and code identifiers as written (Next.js, \`useMemo\`). Numbers stay numbers.
- Describe the content, never the author: no "개발자는 … 보여줍니다", "역량을 증명합니다".
- English is a natural rewrite of the same content, not a word-for-word translation.

## Choosing blocks
- Let the text decide the shape. A how-to becomes steps, a performance write-up leads with metrics and a before/after compare, a retrospective opens with a quote and groups points under headings, an essay stays in short paragraphs.
- Mix block types so the box scans well, but keep it short: one idea per block.
- Emphasis is a spice: at most one **bold** or ==highlight== per sentence, and not in every sentence.

## Avoid (made-up examples of outputs that missed the mark)
- Wall of text in a paragraph: "검색 응답을 800ms에서 200ms로 줄이고 캐시 적중률을 40%에서 90%로 올렸으며 오류율도 낮췄습니다." → numbers go into metrics, each change into its own list item.
- Sentence-style headline: "사내 일정 앱의 성능과 보안을 최적화했습니다" → name the subject and the most specific fact: "검색 800ms → 200ms, 사내 일정 앱".
- Vague callout: "모든 시도가 성공하지는 않았습니다" → name what did not work, or drop the callout.
- Not a caveat: "모든 변경은 측정을 바탕으로 했습니다" → drop it.
- Praise for the author: "혼자서도 품질을 끝까지 끌어올리는 개발자임을 보여줍니다" → say what the reader can take from the content.
- The same shape every time: metrics + list + callout on a text with no numbers → choose blocks that fit this text.`;

/** 저장된 지침 — 비어 있으면 기본값. 제어 문자는 빼고(줄바꿈 · 탭은 둔다) 상한으로 자른다 */
export function sanitizeSummaryGuide(v: unknown): string {
  if (typeof v !== "string") return DEFAULT_SUMMARY_GUIDE;
  const s = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, SUMMARY_GUIDE_MAX);
  return s || DEFAULT_SUMMARY_GUIDE;
}
