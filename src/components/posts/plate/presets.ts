/** Checkerboard pattern for transparent-color indicators */
export const CHECKER_BG =
  "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 6px 6px";

/** 열블록 "기본" 배경 — 의도적으로 테마 고정값. --bg-primary 토큰은 라이트/다크에서 값이 뒤집혀
 *  기본 배경이 테마 따라 바뀌므로, 고정 뉴트럴(라이트 neutral-50)로 고정해 일관 유지. */
export const COLUMN_DEFAULT_BG = "oklch(97.3% 0.0082 91.48)";

/** 개별 열 px 너비 상·하한. 상한은 본문 폭(~800px)의 약 2배 — 넘치면 스크롤. */
/** 열 개수 하한/상한. 1열짜리 column_group 은 열 블록으로서 의미가 없어 2가 하한이다. */
export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 12;

export const COLUMN_MIN_PX = 40;
export const COLUMN_MAX_PX = 1600;
/** 열을 새로 추가할 때 붙는 기본 폭(px). px 로 고정된 열블록에서 기존 열 폭을 안 건드리고
 *  오른쪽에 이 폭짜리 열만 덧붙이기 위한 값. */
export const COLUMN_DEFAULT_PX = 240;
/** 열블록(그룹) 전체 폭 상한(px) — 모든 열 폭의 합.
 *  넉넉하게 COLUMN_MAX_PX(1600) x 3 — 최대 폭 열 3개가 나란히 들어가는 크기.
 *  열 하나 상한(COLUMN_MAX_PX)과는 별개로, 블록이 통째로 비상식적으로 넓어지는 것만 막는다. */
export const COLUMN_GROUP_MAX_PX = 4800;

/** Named color preset (hex + 한/영 이름) — swatch tooltip 용 */
export type NamedColor = { hex: string; ko: string; en: string };

/** Column-group background presets (warm/cool tints) — 이름 포함 */
export const COLUMN_BG_NAMED: NamedColor[] = [
  { hex: "#fef3c7", ko: "노랑", en: "Yellow" },
  { hex: "#dcfce7", ko: "초록", en: "Green" },
  { hex: "#dbeafe", ko: "파랑", en: "Blue" },
  { hex: "#fce7f3", ko: "분홍", en: "Pink" },
  { hex: "#f3e8ff", ko: "보라", en: "Purple" },
  { hex: "#fee2e2", ko: "빨강", en: "Red" },
  { hex: "#f3f4f6", ko: "회색", en: "Gray" },
];

/** Column divider(line) presets — 이름 포함 */
export const COLUMN_LINE_NAMED: NamedColor[] = [
  { hex: "#d1d5db", ko: "밝은 회색", en: "Light gray" },
  { hex: "#374151", ko: "진회색", en: "Dark gray" },
  { hex: "#000000", ko: "검정", en: "Black" },
  { hex: "#ef4444", ko: "빨강", en: "Red" },
  { hex: "#3b82f6", ko: "파랑", en: "Blue" },
  { hex: "#22c55e", ko: "초록", en: "Green" },
  { hex: "#8b5cf6", ko: "보라", en: "Purple" },
];

/** Callout background presets (Notion-inspired palette) */
export const CALLOUT_BG_PRESETS = [
  { color: "var(--bg-primary)" },
  { color: "var(--bg-tertiary)" },
  { color: "#e8d5b7" }, // 갈색 (Notion brown)
  { color: "#fedba0" }, // 노랑 (Notion yellow)
  { color: "#fbd5a0" }, // 주황 (Notion orange)
  { color: "#f5c2c2" }, // 빨강 (Notion red)
  { color: "#e8d0f0" }, // 보라 (Notion purple)
  { color: "#c5dbf0" }, // 파랑 (Notion blue)
  { color: "#c5e8d0" }, // 초록 (Notion green)
  { color: "#d4d4d4" }, // 회색 (Notion gray)
];

/** widths 에서 need(px) 만큼 **여유에 비례해서** 걷는다. 각 열은 COLUMN_MIN_PX 아래로 안 내려간다.
 *  반환 taken 은 실제로 걷은 총량 — 전부 MIN 이라 못 걷으면 need 보다 작다.
 *
 *  한 번만 훑어도 되는 이유: take 를 여유 총합(total) 이하로 자른 뒤 여유에 비례 배분하므로
 *  어떤 열도 제 여유보다 많이 걷히지 않는다(= MIN 을 뚫지 않는다). 재분배 루프가 필요 없다. */
export function takeFromColumns(widths: number[], need: number): { widths: number[]; taken: number } {
  const out = widths.map((w) => Math.round(w));
  const want = Math.max(0, Math.round(need));
  const room = out.map((w) => Math.max(0, w - COLUMN_MIN_PX));
  const total = room.reduce((a, b) => a + b, 0);
  const take = Math.min(want, total);
  if (take <= 0) return { widths: out, taken: 0 };
  const raw = room.map((r) => (r / total) * take);
  const cut = raw.map((x) => Math.floor(x));
  // 내림 잔여는 소수부가 큰 열부터 1px 씩 — 합이 정확히 take 가 되게.
  // (그냥 반올림하면 총폭이 몇 px 어긋나서 상한을 다시 넘기거나 덜 깎인다)
  let rest = take - cut.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; rest > 0 && k < order.length; k++) {
    const i = order[k].i;
    if (cut[i] < room[i]) { cut[i]++; rest--; }
  }
  return { widths: out.map((w, i) => w - cut[i]), taken: take };
}

/** 열을 하나 끼울 자리를 만든다 → { 기존 열들의 새 폭, 새 열 폭 }.
 *
 *  · 블록 상한(COLUMN_GROUP_MAX_PX)에 여유가 있으면 **기존 열은 절대 안 건드리고** 새 열에 기본 폭.
 *  · 여유가 모자랄 때만 부족분을 기존 열에서 비례로 걷어 총폭을 상한에 묶는다.
 *
 *  예전엔 `max(MIN, min(DEFAULT, 상한-사용))` 한 줄이었는데, 여유가 0 이면 바깥 max 가 그걸
 *  MIN(40) 으로 되살려서 상한을 조용히 뚫었다(4800 → 4840 → 4880 …). 그 상태에서 핸들을 잡으면
 *  cap 이 현재 폭보다 작아져 손도 안 댄 열이 즉시 줄어드는 2차 증상까지 있었다. */
export function fitColumnsForInsert(
  current: number[],
  desired: number = COLUMN_DEFAULT_PX,
): { widths: number[]; added: number } {
  const want = Math.max(COLUMN_MIN_PX, Math.min(COLUMN_MAX_PX, Math.round(desired)));
  const used = current.reduce((a, b) => a + Math.round(b), 0);
  const over = used + want - COLUMN_GROUP_MAX_PX;
  if (over <= 0) return { widths: current.map((w) => Math.round(w)), added: want };
  const { widths, taken } = takeFromColumns(current, over);
  // 기존 열을 전부 MIN 까지 깎아도 모자라면 새 열이 남은 만큼만 (그래도 MIN 은 보장 — 안 보이는 열 방지)
  return { widths, added: Math.max(COLUMN_MIN_PX, want - (over - taken)) };
}

/** total 을 weights 비율대로 **정수** 배분 (각 몫 최소 1, 합은 정확히 total).
 *  열 width(%) 전용 — @platejs/layout normalizer 가 합 100 인 정수를 요구하고,
 *  소수가 섞이면 수렴을 못 해 무한루프에 빠진다. */
export function distributeInts(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  if (total <= n) return weights.map(() => Math.max(1, Math.floor(total / n)));
  const wTotal = weights.reduce((a, b) => a + Math.max(0, b), 0) || n;
  const extra = total - n; // 각 열에 1 을 먼저 주고 나머지를 가중 분배
  const raw = weights.map((w) => (Math.max(0, w) / wTotal) * extra);
  const floored = raw.map((r) => Math.floor(r));
  const leftover = extra - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f);
  for (let k = 0; k < leftover; k++) floored[order[k % n].i]++;
  return floored.map((x) => x + 1);
}
