/**
 * About 코드의 두 언어 글 → src/data/generated/aboutDict.ts (빌드 전 생성)
 *
 * 사용법:
 *   npx tsx scripts/gen-about-dict.ts
 *   npx tsx scripts/gen-about-dict.ts --check   # 파일이 최신인지만 확인
 *
 * About 의 글은 거의 전부 코드에 { ko: "…", en: "…" } 쌍으로 박혀 있다(src/app/about/_data · 장 부품 · src/data/about ·
 * md 에서 구운 generated/aboutContent). 다른 언어로 볼 때 이 글들을 번역하려면 원문 목록이 필요해, 그 쌍의 영어 쪽을
 * 모은다(TypeScript 파서로 객체 글자를 찾는다 — ko · en 둘 다 그냥 문자열인 것만, ${…} 가 섞인 템플릿은 뺀다).
 * 번역은 /api/site-translate/content?bundle=about 이 언어마다 한 번 해 DB 에 저장한다.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const CHECK = process.argv.includes("--check");
const ROOT = process.cwd();
const OUT = path.join(ROOT, "src/data/generated/aboutDict.ts");

/* 훑을 곳 — 옛 패널(_panels, 관리자 미리보기용)은 뺀다 */
const DIRS = ["src/app/about", "src/data/about"];
const FILES = ["src/data/generated/aboutContent.ts"];
const SKIP = /[\\/]_panels[\\/]/;

function walk(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !SKIP.test(p) ? [p] : [];
  });
}

/** 그냥 문자열 글자 — "…" · '…' · `…`(자리 없음) */
function literal(node: ts.Expression | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function collect(file: string): string[] {
  const src = ts.createSourceFile(file, fs.readFileSync(path.join(ROOT, file), "utf8"), ts.ScriptTarget.Latest, true);
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      let ko: string | null = null;
      let en: string | null = null;
      let enObj: ts.ObjectLiteralExpression | null = null;
      let hasKoObj = false;
      for (const prop of node.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const name = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : "";
        if (name === "ko") { ko = literal(prop.initializer); hasKoObj = ts.isObjectLiteralExpression(prop.initializer); }
        if (name === "en") { en = literal(prop.initializer); if (ts.isObjectLiteralExpression(prop.initializer)) enObj = prop.initializer; }
      }
      const text = (en ?? "").trim() || (ko ?? "").trim();
      if (ko !== null && en !== null && text) out.push(text);
      /* { ko: { before, accent, after }, en: { … } } 처럼 언어마다 조각 묶음이면 영어 조각을 하나씩 */
      if (hasKoObj && enObj) {
        for (const p of enObj.properties) {
          const v = ts.isPropertyAssignment(p) ? literal(p.initializer) : null;
          if (v && v.trim()) out.push(v.trim());
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out;
}

const files = [...DIRS.flatMap(walk), ...FILES.filter((f) => fs.existsSync(path.join(ROOT, f)))].sort();
const source = [...new Set(files.flatMap(collect))].sort();

const body = `/* 자동 생성 — 손으로 고치지 마세요. 원본: About 코드의 { ko, en } 글(${files.length}개 파일), 생성: npm run gen-about-dict (scripts/gen-about-dict.ts) */

/** About 의 두 언어 글 중 영어 쪽(영어가 비었으면 한국어) — 다른 언어로 볼 때의 번역 원문 */
export const aboutSource: string[] = ${JSON.stringify(source, null, 2)};
`;

if (CHECK) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== body) {
    console.error("aboutDict.ts 가 최신이 아닙니다 — npm run gen-about-dict");
    process.exit(1);
  }
} else {
  fs.writeFileSync(OUT, body);
  console.log(`wrote ${path.relative(ROOT, OUT)} — ${source.length}개 글 (${files.length}개 파일)`);
}
