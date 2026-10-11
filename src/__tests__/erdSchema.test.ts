import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderErdSchema } from "@/lib/about/erdSchema";
import { erdTables, erdRelations, erdDesignNotes } from "@/data/about/erd";

/* About ERD 기본값은 setup.sql 에서 굽는다(scripts/gen-erd.ts). 굽지 않은 채 setup.sql 만 바뀌면 여기서 알린다 */
describe("ERD 기본값 — setup.sql 에서 생성", () => {
  const root = process.cwd();

  it("생성 파일이 setup.sql 과 같다 (다르면 npm run gen-erd)", () => {
    const { code, skipped } = renderErdSchema(readFileSync(path.join(root, "supabase/setup.sql"), "utf8"));
    expect(skipped).toBe(0);
    expect(readFileSync(path.join(root, "src/data/generated/erdSchema.ts"), "utf8")).toBe(code);
  });

  it("손으로 둔 논리 관계 · 설계 메모가 있는 테이블을 가리킨다", () => {
    const names = new Set(erdTables.map((t) => t.name));
    for (const r of erdRelations) {
      expect(names.has(r.from), `${r.from}`).toBe(true);
      expect(names.has(r.to), `${r.to}`).toBe(true);
    }
    for (const n of erdDesignNotes) expect(names.has(n.relatedTable), n.relatedTable).toBe(true);
  });
});
