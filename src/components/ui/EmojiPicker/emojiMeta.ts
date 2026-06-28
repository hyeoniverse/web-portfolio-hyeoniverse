import data from "@emoji-mart/data";

/* @emoji-mart/data (1870여 개) 에서 native 문자 → 영어 이름·키워드 맵 구성.
   검색(색/모양/종류 등 풍부한 영어 키워드) + 툴팁 이름에 사용. lazy + 메모이즈. */

type Meta = { name: string; kw: string };
let cache: Record<string, Meta> | null = null;

export function emojiMeta(): Record<string, Meta> {
  if (cache) return cache;
  const map: Record<string, Meta> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emojis = ((data as any)?.emojis ?? {}) as Record<string, any>;
  for (const id in emojis) {
    const e = emojis[id];
    const native: string | undefined = e?.skins?.[0]?.native;
    if (!native) continue;
    map[native] = {
      name: typeof e?.name === "string" ? e.name : "",
      kw: Array.isArray(e?.keywords) ? e.keywords.join(" ") : "",
    };
  }
  cache = map;
  return map;
}
