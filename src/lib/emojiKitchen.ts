/* Emoji Kitchen — 두 이모지를 섞은 Google(Gboard) 그림. 조합 목록은 scripts/build-emoji-kitchen.mjs 가
   public/emoji-kitchen/ 에 만들어 둔다(meta.json + pairs.bin). 그림 자체는 gstatic 에 있고, 주소는
   날짜와 두 코드포인트로 만든다. 라이브러리 › 커스텀 이모지의 "조합" 창과 가져오기 API 가 같이 쓴다. */

/** g — meta.groups 의 분류 번호(유니코드 이모지 분류 순서). emojis 는 분류 → Gboard 순서로 놓여 있다 */
export interface KitchenEmoji { c: string; e: string; n: string; k: string; g: number }
export interface KitchenMeta { emojis: KitchenEmoji[]; groups: string[]; dates: string[] }
/** 이모지 i 와 섞을 수 있는 상대 j 와, 그 조합 그림의 날짜·좌우 */
export interface KitchenPair { j: number; date: string; left: string; right: string }

/** pairs.bin 을 읽어 이모지마다 조합 목록을 만든다. 파일엔 i ≤ j 쌍만 있으므로 양쪽에 넣는다 */
export function decodePairs(buf: ArrayBuffer, meta: KitchenMeta): KitchenPair[][] {
  const view = new DataView(buf);
  const n = meta.emojis.length;
  const out: KitchenPair[][] = Array.from({ length: n }, () => []);
  let o = 0;
  for (let i = 0; i < n; i++) {
    const count = view.getUint16(o, true); o += 2;
    for (let k = 0; k < count; k++) {
      const j = view.getUint16(o, true);
      const b = view.getUint8(o + 2);
      o += 3;
      const date = meta.dates[b >> 1];
      const [li, ri] = b & 1 ? [j, i] : [i, j];
      const pair = { date, left: meta.emojis[li].c, right: meta.emojis[ri].c };
      out[i].push({ j, ...pair });
      if (j !== i) out[j].push({ j: i, ...pair });
    }
  }
  return out;
}

/* 코드포인트 — 16진수 덩어리를 - 로 이은 것(예: 1f600, 2764-fe0f). 날짜 — yyyymmdd */
const CODE_RE = /^[0-9a-f]{4,6}(-[0-9a-f]{4,6})*$/;
const DATE_RE = /^\d{8}$/;

export const isKitchenCode = (s: unknown): s is string => typeof s === "string" && CODE_RE.test(s);
export const isKitchenDate = (s: unknown): s is string => typeof s === "string" && DATE_RE.test(s);

/** 조합 그림 주소. gstatic 은 덩어리마다 u 를 붙인다(2764-fe0f → u2764-ufe0f) */
export function kitchenImageUrl(date: string, left: string, right: string): string {
  const u = (c: string) => `u${c.split("-").join("-u")}`;
  return `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/${u(left)}/${u(left)}_${u(right)}.png`;
}
