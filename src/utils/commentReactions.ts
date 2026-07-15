/** giscus 식 고정 이모지 반응 세트 (순서 고정) */
export const REACTION_EMOJIS = ["👍", "👎", "😄", "🎉", "😕", "❤️", "🚀", "👀"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** 허용된 반응 이모지인지 검증 */
export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return typeof value === "string" && (REACTION_EMOJIS as readonly string[]).includes(value);
}
