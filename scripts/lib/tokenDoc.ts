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

export const TOKEN_SOURCES = [
  "src/styles/tokens/_color.css",
  "src/styles/tokens/_spacing.css",
  "src/styles/tokens/_typography.css",
  "src/styles/tokens/_sizing.css",
  "src/styles/tokens/_radius.css",
  "src/styles/tokens/_shadow.css",
  "src/styles/tokens/_motion.css",
  "src/styles/tokens/_z-index.css",
  "src/styles/globals/_semantic.css",
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
  return lines.join("\n");
}
