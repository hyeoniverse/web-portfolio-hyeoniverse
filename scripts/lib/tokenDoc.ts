/**
 * 토큰 표 — CSS 토큰 파일에서 docs/tokens.md 를 만든다.
 *
 * 토큰의 원본은 CSS 다. 문서에 값을 손으로 옮겨 적으면 어긋난다(모션 시간이 문서 250ms, 실제 300ms 였다).
 * 그래서 표는 이 함수가 CSS 에서 뽑고, 테스트(src/__tests__/tokenDoc.test.ts)가 docs/tokens.md 와
 * 다르면 실패한다 — 토큰을 바꾸면 `npm run tokens:doc` 으로 표를 다시 만든다.
 *
 * 읽는 것: 사용자 정의 속성 선언(`--x: 값;`)과 그 선언이 놓인 자리(:root · 다크 테마 · 미디어 쿼리).
 * 모듈 CSS 의 지역 변수(`--_x`)는 토큰이 아니라 읽지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { converter, formatHex, parse, wcagContrast, type Color } from "culori";

export const TOKEN_SOURCES = [
  "src/styles/tokens/_color.css",
  "src/styles/tokens/_spacing.css",
  "src/styles/tokens/_typography.css",
  "src/styles/tokens/_size.css",
  "src/styles/tokens/_border.css",
  "src/styles/tokens/_radius.css",
  "src/styles/tokens/_shadow.css",
  "src/styles/tokens/_motion.css",
  "src/styles/tokens/_z-index.css",
  "src/styles/globals/_semantic.css",
  "src/styles/globals/_component.css",
  "src/styles/globals/_legacy-aliases.css",
];

interface Decl {
  name: string;
  value: string;
  /** 선언이 놓인 자리 — 기본(:root)이면 빈 문자열 */
  context: string;
}

/* 주석을 지운다 — 주석 안의 `--x:` 예시를 선언으로 읽지 않게 */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** CSS 한 파일의 토큰 선언을 순서대로 — 중괄호 깊이를 따라 바깥 선택자·@규칙을 자리로 붙인다 */
export function parseTokens(css: string): Decl[] {
  const src = stripComments(css);
  const out: Decl[] = [];
  const stack: string[] = [];
  let buf = "";
  for (const ch of src) {
    if (ch === "{") {
      stack.push(buf.trim().replace(/\s+/g, " "));
      buf = "";
    } else if (ch === "}") {
      flush();
      stack.pop();
      buf = "";
    } else if (ch === ";") {
      flush();
      buf = "";
    } else buf += ch;
  }
  return out;

  function flush() {
    const m = /^\s*(--(?!_)[\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(buf);
    if (!m) return;
    const context = stack.filter((s) => s !== ":root").join(" › ");
    out.push({ name: m[1], value: m[2].replace(/\s+/g, " "), context });
  }
}

/* 표 칸에 넣을 수 있게 — 파이프는 이스케이프, 백틱은 코드 칸을 깨므로 바꾼다 */
const cell = (s: string) => `\`${s.replace(/`/g, "'").replace(/\|/g, "\\|")}\``;

/* 다크 테마 자리 — [data-theme="dark"] 를 담은 선택자 */
const isDark = (ctx: string) => /data-theme=["']?dark/.test(ctx);

/* ── 대비 표(명세 3.1-4) — 역할 토큰 쌍(글자 × 배경)을 두 테마에서 잰다 ── */

/** 대비를 잴 쌍 — [글자, 배경, 기준, 무엇] */
const CONTRAST_PAIRS: [string, string, number, string][] = [
  ["--text-primary", "--bg-primary", 4.5, "본문"],
  ["--text-secondary", "--bg-primary", 4.5, "보조 글"],
  ["--text-tertiary", "--bg-primary", 4.5, "셋째 글"],
  ["--text-muted", "--bg-primary", 4.5, "흐린 글"],
  ["--text-muted", "--bg-secondary", 4.5, "흐린 글(둘째 면)"],
  ["--text-accent", "--bg-primary", 4.5, "강조 글 · 링크"],
  ["--text-on-accent", "--bg-accent-solid", 4.5, "강조 면 위 글"],
  ["--text-inverse", "--bg-inverse", 4.5, "뒤집힌 면 위 글"],
  ["--text-success-strong", "--bg-primary", 4.5, "성공 글"],
  ["--text-warning-strong", "--bg-primary", 4.5, "경고 글"],
  ["--text-info-strong", "--bg-primary", 4.5, "정보 글"],
  ["--text-error-strong", "--bg-primary", 4.5, "오류 글"],
  ["--text-success-strong", "--bg-success-soft", 4.5, "성공 배지"],
  ["--text-warning-strong", "--bg-warning-soft", 4.5, "경고 배지"],
  ["--text-info-strong", "--bg-info-soft", 4.5, "정보 배지"],
  ["--text-error-strong", "--bg-error-soft", 4.5, "오류 배지"],
  ["--text-success", "--bg-primary", 3, "성공 점 · 막대(글자 아님)"],
  ["--border-color-warning-solid", "--bg-primary", 3, "경고 점 · 막대의 테두리(글자 아님, D66)"],
  ["--text-error", "--bg-primary", 3, "오류 점 · 막대(글자 아님)"],
  ["--border-color-strong", "--bg-primary", 3, "컨트롤 경계(진한 테두리)"],
  ["--border-color-default", "--bg-primary", 3, "컨트롤 경계(기본 테두리)"],
  ["--bg-accent-solid", "--bg-primary", 3, "강조 면 · 포커스"],
];

const toRgb = converter("rgb");

/** 괄호 짝을 맞춰 함수 인자를 나눈다 */
function args(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** 첫 함수 호출 `name(` 의 인자 범위 */
function callAt(s: string, name: string): { start: number; end: number; inner: string } | null {
  const i = s.indexOf(`${name}(`);
  if (i < 0) return null;
  let depth = 0;
  for (let j = i + name.length; j < s.length; j++) {
    if (s[j] === "(") depth++;
    if (s[j] === ")" && --depth === 0) return { start: i, end: j + 1, inner: s.slice(i + name.length + 1, j) };
  }
  return null;
}

/** 토큰 값을 한 테마에서 실제 색으로 푼다 — var() 를 펴고, light-dark() 를 고르고, color-mix(… transparent) 를 투명도로 */
function resolveColor(expr: string, mode: "light" | "dark", defs: Map<string, string>, depth = 0): Color | undefined {
  if (depth > 20) return undefined;
  let s = expr.trim();
  for (let c; (c = callAt(s, "var")); ) {
    const [name] = args(c.inner);
    const v = defs.get(name);
    if (v === undefined) return undefined;
    s = s.slice(0, c.start) + v + s.slice(c.end);
  }
  for (let c; (c = callAt(s, "light-dark")); ) {
    const [l, d] = args(c.inner);
    s = s.slice(0, c.start) + (mode === "light" ? l : d) + s.slice(c.end);
  }
  const mix = callAt(s, "color-mix");
  if (mix) {
    const [, a, b] = args(mix.inner);
    const m = /^(.*)\s+([\d.]+)%$/.exec(a);
    if (!m || b !== "transparent") return undefined;
    const base = resolveColor(m[1], mode, defs, depth + 1);
    return base && { ...base, alpha: (base.alpha ?? 1) * (Number(m[2]) / 100) };
  }
  return parse(s);
}

/** 반투명 글자 · 배경은 아래 면(--bg-primary)에 얹은 색으로 잰다 */
function over(c: Color, under: Color): Color {
  const a = c.alpha ?? 1, f = toRgb(c)!, u = toRgb(under)!;
  return { mode: "rgb", r: f.r * a + u.r * (1 - a), g: f.g * a + u.g * (1 - a), b: f.b * a + u.b * (1 - a) };
}

function contrastSection(root: string): string[] {
  const defs = new Map<string, string>();
  for (const rel of TOKEN_SOURCES) for (const d of parseTokens(fs.readFileSync(path.join(root, rel), "utf8"))) if (!d.context && !defs.has(d.name)) defs.set(d.name, d.value);
  const lines = [
    "## 대비",
    "",
    "역할 토큰 쌍의 WCAG 2 대비. 글자 4.5:1(1.4.3), 컨트롤 경계 · 그래픽 3:1(1.4.11). 반투명 색은 `--bg-primary` 위에 얹은 색으로 잰다.",
    "사이트 설정의 테마 색을 바꾸면 값이 달라진다 — 그때는 설정 화면의 대비 점검표가 잰다.",
    "",
    "| 글자 · 앞 | 배경 | 무엇 | 기준 | 라이트 | 다크 |",
    "|---|---|---|---|---|---|",
  ];
  for (const [fg, bg, min, what] of CONTRAST_PAIRS) {
    const cellFor = (mode: "light" | "dark") => {
      const page = resolveColor("var(--bg-primary)", mode, defs);
      const b = resolveColor(`var(${bg})`, mode, defs);
      const f = resolveColor(`var(${fg})`, mode, defs);
      if (!page || !b || !f) return "?";
      const back = over(b, page);
      const r = wcagContrast(formatHex(over(f, back)), formatHex(back));
      return `${r.toFixed(2)}${r >= min ? "" : " ✗"}`;
    };
    lines.push(`| ${cell(fg)} | ${cell(bg)} | ${what} | ${min} | ${cellFor("light")} | ${cellFor("dark")} |`);
  }
  lines.push("");
  return lines;
}

/** docs/tokens.md 내용 */
export function buildTokenDoc(root: string): string {
  const lines: string[] = [
    "# 토큰 표",
    "",
    "> **손으로 고치지 않는다.** `npm run tokens:doc` 이 아래 CSS 에서 만든다(`scripts/lib/tokenDoc.ts`).",
    "> 규칙과 고르는 법은 [디자인 시스템 명세](./design-system.md). 여기는 값만 있다.",
    "> 토큰을 바꾸고 표를 다시 만들지 않으면 `tokenDoc.test.ts` 가 실패한다.",
    "",
  ];
  for (const rel of TOKEN_SOURCES) {
    const decls = parseTokens(fs.readFileSync(path.join(root, rel), "utf8"));
    if (decls.length === 0) continue;
    /* 이름마다 한 줄 — 기본값, 다크 테마 값, 그 밖의 조건부 값 */
    const rows = new Map<string, { base?: string; dark?: string; other: string[] }>();
    for (const d of decls) {
      const r = rows.get(d.name) ?? { other: [] };
      if (!d.context) r.base ??= d.value;
      else if (isDark(d.context)) r.dark ??= d.value;
      else r.other.push(`${d.context}: ${d.value}`);
      rows.set(d.name, r);
    }
    const hasDark = [...rows.values()].some((r) => r.dark);
    const hasOther = [...rows.values()].some((r) => r.other.length);
    lines.push(`## \`${rel}\``, "", `토큰 ${rows.size}개`, "");
    lines.push(`| 토큰 | 값 |${hasDark ? " 다크 |" : ""}${hasOther ? " 조건부 |" : ""}`);
    lines.push(`|---|---|${hasDark ? "---|" : ""}${hasOther ? "---|" : ""}`);
    for (const [name, r] of rows) {
      const row = [cell(name), r.base ? cell(r.base) : "—"];
      if (hasDark) row.push(r.dark ? cell(r.dark) : "");
      if (hasOther) row.push(r.other.map(cell).join("<br>"));
      lines.push(`| ${row.join(" | ")} |`);
    }
    lines.push("");
  }
  lines.push(...contrastSection(root));
  return lines.join("\n");
}
