import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/* 정의되지 않은 CSS 토큰을 fallback 없이 쓰면 **선언 전체가 무효** 가 된다.
   CSS 는 조용히 넘어가므로 눈으로도 lint 로도 안 잡히고, 그 스타일은 그냥 안 먹는다.

   실제로 이런 게 13종 · 57곳 쌓여 있었다 (`--input-h` 로 min-height 가 통째로 죽어 있었고,
   `--bg-elevated` 는 tooltip 배경이 투명이라 글자 뒤가 비쳤다).
   그래서 "토큰은 반드시 정의돼 있어야 한다" 를 여기서 강제한다. */

const SRC = path.resolve(__dirname, "..");

/** 런타임/빌드 타임에 주입돼 CSS 소스엔 정의가 없는 것들 — 이건 정상 */
const INJECTED = [
  /^--font-/, // next/font 가 variable 로 주입
  /^--shiki-/, // Shiki 가 토큰 span 에 인라인으로 주입
  /^--_/, // 컴포넌트 내부 context 변수 (같은 파일/부모에서 정의)
  /^--tw-/, // Tailwind 내부
];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(css|tsx|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("CSS 커스텀 프로퍼티", () => {
  it("fallback 없이 쓰는 토큰은 반드시 정의돼 있어야 한다", () => {
    const files = walk(SRC).filter((f) => !f.includes("__tests__") && !f.includes("/data/about/"));
    const sources = new Map(files.map((f) => [f, fs.readFileSync(f, "utf8")]));

    // 정의: `--x: value` (CSS) 또는 "--x" (tsx 인라인 style / next/font variable)
    const defined = new Set<string>();
    for (const s of sources.values()) {
      for (const m of s.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
      for (const m of s.matchAll(/"(--[\w-]+)"/g)) defined.add(m[1]);
      for (const m of s.matchAll(/'(--[\w-]+)'/g)) defined.add(m[1]);
    }

    const dead: Record<string, string[]> = {};
    for (const [f, s] of sources) {
      // var(--x) — 쉼표(fallback) 없이 바로 닫히는 것만
      for (const m of s.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
        const name = m[1];
        if (defined.has(name)) continue;
        if (INJECTED.some((re) => re.test(name))) continue;
        (dead[name] ??= []).push(path.relative(SRC, f));
      }
    }

    const report = Object.entries(dead).map(([n, fs_]) => `${n}  ←  ${[...new Set(fs_)].join(", ")}`);
    expect(report, `정의 없는 토큰 — 이 선언들은 조용히 무효가 된다:\n  ${report.join("\n  ")}`).toEqual([]);
  });
});
