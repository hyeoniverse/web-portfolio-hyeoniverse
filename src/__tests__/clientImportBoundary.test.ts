// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* 클라이언트 번들 경계 — "use client" 파일에서 값 import 를 따라가다 아래 모듈에 닿으면 그 코드가 브라우저 번들에 실린다.
   상수 하나 때문에 큰 모듈을 통째로 끌고 온 일이 여러 번 있었다(docs/perf-baseline.md 2026-10 측정):
   · lib/about/apiMap — TypeScript 파서(typescript, gzip 1 MB)가 /about 에 실렸다 → 상수는 apiMapShape
   · lib/githubShowcase · lib/ai/models — 서버 전용(DB · 비밀값)이 프로필 · 설정 화면에 실렸다 → githubRepoKey · modelDefaults
   타입만 가져가는 import(import type · { type X })는 지워지므로 세지 않는다. 동적 import(import())는 따로 받으므로 세지 않는다 */

const root = path.resolve(__dirname, "../..");

/** 클라이언트에서 닿으면 안 되는 것 — 파일(src 기준)과 npm 패키지 */
const FORBIDDEN_FILES = ["src/lib/supabase/admin.ts", "src/lib/getSecret.ts"];
const FORBIDDEN_PACKAGES = ["typescript"];

const IMPORT = /^\s*(?:import|export)\s+(?!type\b)([^"';]*?)\s*from\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm;
const TYPE_ONLY = /^\{\s*(?:type\s+\w+(?:\s+as\s+\w+)?\s*,?\s*)+\}$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "__tests__") walk(p, out);
    } else if (/\.tsx?$/.test(e.name)) out.push(path.relative(root, p));
  }
  return out;
}

function resolve(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join("src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.join(path.dirname(from), spec);
  else return `npm:${spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]}`;
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const f = path.normalize(base + ext);
    if (fs.existsSync(path.join(root, f)) && fs.statSync(path.join(root, f)).isFile()) return f;
  }
  return null;
}

const files = walk(path.join(root, "src"));
const deps = new Map<string, string[]>();
for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), "utf8");
  const list: string[] = [];
  for (const m of src.matchAll(IMPORT)) {
    const names = (m[1] ?? "").trim();
    if (names && TYPE_ONLY.test(names)) continue;
    const r = resolve(m[2] ?? m[3], f);
    if (r) list.push(r);
  }
  deps.set(f, list);
}

/** f 에서 금지 대상까지 가는 길 — 없으면 null */
const memo = new Map<string, string[] | null>();
function pathToForbidden(f: string, stack: Set<string>): string[] | null {
  if (memo.has(f)) return memo.get(f)!;
  if (FORBIDDEN_FILES.includes(f) || FORBIDDEN_PACKAGES.some((p) => f === `npm:${p}`)) return [f];
  if (f.startsWith("npm:") || stack.has(f)) return null;
  stack.add(f);
  let found: string[] | null = null;
  for (const d of deps.get(f) ?? []) {
    const p = pathToForbidden(d, stack);
    if (p) { found = [f, ...p]; break; }
  }
  stack.delete(f);
  memo.set(f, found);
  return found;
}

describe("클라이언트 번들 경계", () => {
  it("\"use client\" 파일은 서버 전용 모듈 · typescript 에 닿지 않는다", () => {
    const leaks = files
      .filter((f) => /^\s*["']use client["']/.test(fs.readFileSync(path.join(root, f), "utf8")))
      .map((f) => pathToForbidden(f, new Set()))
      .filter((p): p is string[] => !!p)
      .map((p) => p.join(" → "));
    expect(leaks).toEqual([]);
  });
});
