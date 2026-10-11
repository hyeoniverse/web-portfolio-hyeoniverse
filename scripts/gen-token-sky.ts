/**
 * 토큰 CSS → src/data/generated/tokenSky.ts (빌드 전 생성)
 *
 * 사용법:
 *   npx tsx scripts/gen-token-sky.ts
 *   npx tsx scripts/gen-token-sky.ts --check   # 파일이 최신인지만 확인 (CI · 테스트 용)
 *
 * About 06 디자인 장의 "토큰 별하늘" — 토큰 하나가 별 하나다. 이름 · 층(원시 · 역할 · 컴포넌트) · 무리(색 · 글자 · 움직임 · 모양)만
 * 굽고, 값은 화면에서 var() 로 읽는다(테마를 바꾸면 같이 바뀌게). 옛 이름 별칭(_legacy-aliases.css)은 토큰이 아니라 뺀다.
 * 읽는 규칙은 scripts/lib/tokenDoc 의 parseTokens(docs/tokens.md 와 같은 파서).
 */
import fs from "node:fs";
import path from "node:path";
import { TOKEN_SOURCES, parseTokens } from "./lib/tokenDoc";

const CHECK = process.argv.includes("--check");
const ROOT = process.cwd();
const OUT = path.resolve(ROOT, "src/data/generated/tokenSky.ts");

type Layer = "raw" | "role" | "component";
type Group = "color" | "type" | "motion" | "form";

const layerOf = (file: string): Layer | null =>
  file.includes("/tokens/") ? "raw" : file.endsWith("_semantic.css") ? "role" : file.endsWith("_component.css") ? "component" : null;

/* 원시 토큰은 파일이 곧 무리 */
const RAW_GROUP: Record<string, Group> = { _color: "color", _typography: "type", _motion: "motion" };

const COLOR_LITERAL = /(^|[\s(,])(#[0-9a-f]{3,8}\b|oklch\(|oklab\(|rgba?\(|hsla?\(|color-mix\(|light-dark\(|transparent\b|currentcolor\b)/i;

const tokens: { name: string; layer: Layer; group: Group }[] = [];
const valueOf = new Map<string, string>();
const seen = new Set<string>();
for (const file of TOKEN_SOURCES) {
  const layer = layerOf(file);
  if (!layer) continue;
  for (const d of parseTokens(fs.readFileSync(path.join(ROOT, file), "utf8"))) {
    if (!valueOf.has(d.name)) valueOf.set(d.name, d.value);
    if (seen.has(d.name)) continue;
    seen.add(d.name);
    const base = path.basename(file, ".css");
    tokens.push({ name: d.name, layer, group: RAW_GROUP[base] ?? "form" });
  }
}

/* 색인지 — 값이 색 글자이거나, 색 토큰을 가리키면 색(가리키는 사슬을 따라간다) */
const colorMemo = new Map<string, boolean>();
const isColor = (name: string, depth = 0): boolean => {
  if (colorMemo.has(name)) return colorMemo.get(name)!;
  const v = valueOf.get(name) ?? "";
  let r = COLOR_LITERAL.test(v);
  if (!r && depth < 8) {
    const ref = /^var\((--[\w-]+)\)$/.exec(v.trim());
    if (ref) r = isColor(ref[1], depth + 1);
  }
  colorMemo.set(name, r);
  return r;
};

/* 역할 · 컴포넌트 토큰은 이름과 값으로 무리를 고른다 — 움직임 → 글자 → 색 → 나머지(모양) */
for (const t of tokens) {
  if (t.layer === "raw" && t.group !== "form") continue;
  if (/^--(duration|ease|motion)/.test(t.name)) t.group = "motion";
  else if (/^--font|line-height|letter-spacing/.test(t.name)) t.group = "type";
  else if (!/^--(shadow|border-(?!color))/.test(t.name) && isColor(t.name)) t.group = "color";
}

/* 무엇을 그릴지 — 별이 그 토큰의 생김새로 그려진다(색은 그 색, 크기는 그 크기의 네모, 모서리는 그 둥글기 …) */
type Kind =
  | "color" | "font" | "fontSize" | "fontWeight" | "fontFamily" | "lineHeight" | "tracking"
  | "size" | "pad" | "radius" | "shadow" | "border" | "blur" | "duration" | "ease" | "other";
const LENGTH = /^(0|-?[\d.]+(px|rem|em|vw|vh|%)|var\(--[\w-]+\)|(calc|clamp|min|max)\(.*\))$/;
const kindOf = (t: (typeof tokens)[number]): Kind => {
  const v = (valueOf.get(t.name) ?? "").trim();
  const n = t.name;
  if (t.group === "color") return "color";
  if (/^--duration/.test(n)) return "duration";
  if (/^--ease/.test(n)) return "ease";
  if (/shadow/.test(n)) return "shadow";
  if (/radius/.test(n)) return "radius";
  if (/^--blur/.test(n) || /^blur\(/.test(v)) return "blur";
  if (/^--font-size/.test(n)) return "fontSize";
  if (/^--font-weight/.test(n)) return "fontWeight";
  if (/line-height/.test(n)) return "lineHeight";
  if (/letter-spacing/.test(n)) return "tracking";
  if (/^--font-/.test(n)) return / \/ /.test(v) ? "font" : "fontFamily";
  if (/^--border/.test(n)) return "border";
  const parts = v.split(/\s+(?![^(]*\))/);
  if (t.group === "form" && parts.length > 1 && parts.every((x) => LENGTH.test(x))) return "pad";
  if (t.group === "form" && LENGTH.test(v)) return "size";
  return "other";
};

/* 글자 크기(px) — 크기 눈금을 작은 것부터 세우려고. var() 사슬을 풀고, rem 은 16px, vw 는 1440px 화면 기준으로 계산한다.
   글자 묶음(--font-*)은 그 안의 크기 토큰으로 */
const pxOf = (name: string, depth = 0): number | null => {
  const v = (valueOf.get(name) ?? "").trim();
  if (depth > 8 || !v) return null;
  const inner = v.match(/var\((--font-size-[\w-]+)\)/);
  if (/^--font-(?!size)/.test(name) && inner) return pxOf(inner[1], depth + 1);
  let expr = v.replace(/var\((--[\w-]+)\)/g, (_, n) => String(pxOf(n, depth + 1) ?? "NaN"));
  expr = expr
    .replace(/(-?[\d.]+)rem/g, (_, n) => String(+n * 16))
    .replace(/(-?[\d.]+)vw/g, (_, n) => String(+n * 14.4))
    .replace(/(-?[\d.]+)px/g, "$1")
    .replace(/(?<![.\w])min\(/g, "Math.min(")
    .replace(/(?<![.\w])max\(/g, "Math.max(")
    .replace(/clamp\(/g, "Math.min(Math.max(")
    .replace(/calc\(/g, "(");
  /* clamp(a, b, c) → Math.min(Math.max(a, b), c) — 인자 셋을 둘씩 묶는다 */
  expr = expr.replace(/Math\.min\(Math\.max\(([^,]+),([^,]+),([^)]+)\)/g, "Math.min(Math.max($1,$2),$3)");
  if (!/^[\d\s.+\-*/(),Mathinmx]*$/.test(expr)) return null;
  try {
    const n = Function(`return (${expr})`)() as number;
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
  } catch {
    return null;
  }
};

const body = `/* 자동 생성 — 손으로 고치지 마세요. 원본: ${TOKEN_SOURCES.filter((f) => layerOf(f)).length}개 토큰 CSS(scripts/lib/tokenDoc 의 TOKEN_SOURCES, 옛 이름 별칭 제외), 생성: npm run gen-token-sky (scripts/gen-token-sky.ts) */

export type TokenLayer = "raw" | "role" | "component";
export type TokenGroup = "color" | "type" | "motion" | "form";
export type TokenKind =
  | "color" | "font" | "fontSize" | "fontWeight" | "fontFamily" | "lineHeight" | "tracking"
  | "size" | "pad" | "radius" | "shadow" | "border" | "blur" | "duration" | "ease" | "other";

/** [이름, 층, 무리, 생김새, 글자 크기 px(글자 크기 · 묶음만, 1440px 화면 기준)] — CSS 에 선언된 순서. 값은 화면에서 var() 로 읽는다 */
export const tokenSky: [string, TokenLayer, TokenGroup, TokenKind, number | null][] = [
${tokens.map((t) => { const k = kindOf(t); const px = k === "fontSize" || k === "font" ? pxOf(t.name) : null; return `  ["${t.name}", "${t.layer}", "${t.group}", "${k}", ${px}],`; }).join("\n")}
];
`;

if (CHECK) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== body) {
    console.error("tokenSky.ts 가 최신이 아닙니다 — npm run gen-token-sky");
    process.exit(1);
  }
} else {
  fs.writeFileSync(OUT, body);
  const count = (k: keyof (typeof tokens)[number], v: string) => tokens.filter((t) => t[k] === v).length;
  const kinds: Record<string, number> = {};
  for (const t of tokens) kinds[kindOf(t)] = (kinds[kindOf(t)] ?? 0) + 1;
  console.log(kinds);
  console.log(
    `wrote ${path.relative(ROOT, OUT)} — ${tokens.length}개 · 원시 ${count("layer", "raw")} 역할 ${count("layer", "role")} 컴포넌트 ${count("layer", "component")} · 색 ${count("group", "color")} 글자 ${count("group", "type")} 움직임 ${count("group", "motion")} 모양 ${count("group", "form")}`,
  );
}
