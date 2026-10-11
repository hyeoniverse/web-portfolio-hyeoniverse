/* setup.sql → ERD 기본값 파일 내용(scripts/gen-erd.ts 가 쓰고, 테스트가 최신인지 대조한다) */
import { parseSqlErd } from "@/lib/about/parseSqlErd";

/* 비어 있다는 뜻뿐인 기본값 — 거의 모든 칼럼에 붙어 정작 의미 있는 기본값(now() · false · 'markdown' …)이 묻힌다 */
const EMPTY_DEFAULT = /^(''|'\{\}'|'\[\]'|'\{\}'::jsonb|'\[\]'::jsonb|ARRAY\[\]::text\[\]|NULL)$/i;

export function renderErdSchema(sql: string): { code: string; skipped: number } {
  const parsed = parseSqlErd(sql);
  const { relations, skipped } = parsed;
  const tables = parsed.tables.map((t) => ({
    ...t,
    columns: t.columns.map(({ defaultValue, ...c }) =>
      defaultValue && !EMPTY_DEFAULT.test(defaultValue.trim()) ? { ...c, defaultValue } : c),
  }));
  const code = [
    "/* 자동 생성 — 손으로 고치지 마세요. 원본: supabase/setup.sql, 생성: npm run gen-erd (scripts/gen-erd.ts) */",
    'import type { ErdTable, ErdRelation } from "@/data/about/types";',
    "",
    `export const schemaTables: ErdTable[] = ${JSON.stringify(tables, null, 2)};`,
    "",
    `export const schemaRelations: ErdRelation[] = ${JSON.stringify(relations, null, 2)};`,
    "",
  ].join("\n");
  return { code, skipped };
}
