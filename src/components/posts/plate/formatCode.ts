// ── 코드블록 포맷팅 (Prettier standalone, 브라우저) ──
// 에디터 전용. Prettier 본체와 언어 플러그인을 **클릭 시 지연 로딩**(lazy import)해 초기 번들에 안 실린다.
// 지원 언어만 매핑 — 나머지는 isFormattable=false 로 UI 에서 감춘다.
/* eslint-disable @typescript-eslint/no-explicit-any */

// 코드블록 언어 value → { prettier parser, 필요한 플러그인 lazy import }
const FORMATTERS: Record<string, { parser: string; load: () => Promise<any[]> }> = {
  javascript: { parser: "babel", load: async () => [await import("prettier/plugins/babel"), await import("prettier/plugins/estree")] },
  typescript: { parser: "typescript", load: async () => [await import("prettier/plugins/typescript"), await import("prettier/plugins/estree")] },
  json: { parser: "json", load: async () => [await import("prettier/plugins/babel"), await import("prettier/plugins/estree")] },
  css: { parser: "css", load: async () => [await import("prettier/plugins/postcss")] },
  scss: { parser: "scss", load: async () => [await import("prettier/plugins/postcss")] },
  less: { parser: "less", load: async () => [await import("prettier/plugins/postcss")] },
  xml: { parser: "html", load: async () => [await import("prettier/plugins/html")] }, // HTML/XML 블록
  markdown: { parser: "markdown", load: async () => [await import("prettier/plugins/markdown")] },
  yaml: { parser: "yaml", load: async () => [await import("prettier/plugins/yaml")] },
  graphql: { parser: "graphql", load: async () => [await import("prettier/plugins/graphql")] },
};

/** 이 언어를 Prettier 로 포맷팅할 수 있나 (지원 목록에 있나) */
export function isFormattable(lang: string | undefined | null): boolean {
  return !!lang && lang in FORMATTERS;
}

/** Prettier 로 포맷팅. 미지원/파싱 실패 시 throw. 성공 시 포맷된 코드(끝 개행 제거) 반환. */
export async function formatCode(lang: string, code: string): Promise<string> {
  const cfg = FORMATTERS[lang];
  if (!cfg) throw new Error(`unsupported language: ${lang}`);
  const [standalone, plugins] = await Promise.all([import("prettier/standalone"), cfg.load()]);
  const out = await standalone.format(code, {
    parser: cfg.parser,
    plugins: plugins as any,
    tabWidth: 2,
    printWidth: 100,
  });
  return out.replace(/\n$/, ""); // 코드블록은 code_line 단위라 마지막 개행 불필요
}
