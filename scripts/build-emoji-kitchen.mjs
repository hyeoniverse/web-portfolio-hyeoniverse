#!/usr/bin/env node
/* Emoji Kitchen 조합 목록을 가볍게 만든다 — 라이브러리 › 커스텀 이모지의 "조합" 창이 쓴다.
 *
 * 원본: xsalazar/emoji-kitchen-backend 의 metadata.json(약 99MB, 619개 이모지 · 조합 14만 7천 개).
 * 조합 이미지는 Google(gstatic)이 올려 둔 것이고, 주소는 날짜와 두 코드포인트로 만들 수 있다:
 *   https://www.gstatic.com/android/keyboard/emojikitchen/{날짜}/u{왼쪽}/u{왼쪽}_u{오른쪽}.png
 * 그래서 조합마다 (상대 이모지, 날짜, 좌우가 바뀌었는지)만 남긴다.
 *
 * 출력 (public/emoji-kitchen/)
 *   meta.json — { emojis: [{ c: 코드포인트, e: 글자, n: 이름, k: 검색어 }], dates: ["20201001", …] }
 *   pairs.bin — 이모지 i 마다 [uint16 개수][(uint16 j, uint8 (날짜<<1 | 바뀜)) × 개수], i ≤ j 인 쌍만
 *               "바뀜" = 이미지가 (j, i) 순서로 저장돼 있다
 *
 * 쓰는 법: node scripts/build-emoji-kitchen.mjs [metadata.json 경로]  (경로가 없으면 내려받는다)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SRC = "https://raw.githubusercontent.com/xsalazar/emoji-kitchen-backend/main/app/metadata.json";
const OUT = new URL("../public/emoji-kitchen/", import.meta.url);

const raw = process.argv[2] ? readFileSync(process.argv[2], "utf8") : await (await fetch(SRC)).text();
const { knownSupportedEmoji, data } = JSON.parse(raw);

/* 이모지 순서는 Gboard 순서 — 고르는 격자도 이 순서로 보인다 */
const codes = [...knownSupportedEmoji].sort((a, b) => (data[a]?.gBoardOrder ?? 1e9) - (data[b]?.gBoardOrder ?? 1e9));
const index = new Map(codes.map((c, i) => [c, i]));
const emojis = codes.map((c) => ({ c, e: data[c].emoji, n: data[c].alt, k: (data[c].keywords ?? []).slice(0, 8).join(" ") }));

const dates = [];
const dateIdx = (d) => { let i = dates.indexOf(d); if (i < 0) { i = dates.length; dates.push(d); } return i; };
const rows = codes.map(() => new Map()); // i → (j → byte)
for (const entry of Object.values(data)) {
  for (const list of Object.values(entry.combinations)) {
    for (const x of list) {
      if (!x.isLatest) continue;
      const l = index.get(x.leftEmojiCodepoint), r = index.get(x.rightEmojiCodepoint);
      if (l === undefined || r === undefined) continue;
      const [i, j, swapped] = l <= r ? [l, r, 0] : [r, l, 1];
      rows[i].set(j, (dateIdx(x.date) << 1) | swapped);
    }
  }
}
if (dates.length > 127) throw new Error(`날짜가 ${dates.length}개 — 7비트를 넘는다`);

const total = rows.reduce((a, m) => a + m.size, 0);
const buf = Buffer.alloc(codes.length * 2 + total * 3);
let o = 0;
rows.forEach((m) => {
  buf.writeUInt16LE(m.size, o); o += 2;
  for (const [j, b] of [...m].sort((a, b) => a[0] - b[0])) { buf.writeUInt16LE(j, o); buf.writeUInt8(b, o + 2); o += 3; }
});

mkdirSync(OUT, { recursive: true });
writeFileSync(new URL("meta.json", OUT), JSON.stringify({ emojis, dates }));
writeFileSync(new URL("pairs.bin", OUT), buf);
console.log(`emojis ${codes.length}, pairs ${total}, dates ${dates.length}, pairs.bin ${(buf.length / 1024).toFixed(0)}KB`);
