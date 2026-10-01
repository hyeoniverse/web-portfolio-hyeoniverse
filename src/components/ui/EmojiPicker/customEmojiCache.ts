/* 커스텀(업로드) 이모지의 브라우저 캐시 — 피커가 즉시 보이려고 localStorage 에 둔다.
   설정 › 라이브러리에서 지울 때도 같은 캐시를 비워야 피커에 남지 않는다. */
export const CUSTOM_EMOJI_KEY = "custom-emojis";
export const RECENT_EMOJI_KEY = "recent-emojis";

/** 이 src 의 이모지를 캐시와 최근 사용에서 뺀다 */
export function forgetCustomEmoji(src: string): void {
  try {
    const list = JSON.parse(localStorage.getItem(CUSTOM_EMOJI_KEY) || "[]") as { src?: string }[];
    localStorage.setItem(CUSTOM_EMOJI_KEY, JSON.stringify(list.filter((c) => c?.src !== src)));
    const recent = JSON.parse(localStorage.getItem(RECENT_EMOJI_KEY) || "[]") as string[];
    localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(recent.filter((v) => v !== `img:${src}`)));
  } catch { /* 저장소를 못 쓰면 비울 것도 없다 */ }
}
