import { describe, it, expect } from "vitest";
import { mergeErd, describeImport } from "@/app/admin/(dashboard)/settings/_components/about/mergeErd";
import type { ErdTable, ErdRelation } from "@/data/about/types";

/* SQL 가져오기 병합 규칙 (합의된 결정):
 *  1. 같은 이름 테이블 → 컬럼 병합, ERD 에만 있던 컬럼은 유지
 *  2. 같은 컬럼 → SQL 값으로 갱신 (타입·PK·FK)
 *  3. 컬럼 순서 → SQL 정의 순서, 기존 전용 컬럼은 뒤에
 *  4. SQL 에 없는 테이블은 손대지 않음
 * 되돌리기가 없는 동작이라 규칙을 여기서 고정한다. */

const T = (name: string, columns: ErdTable["columns"]): ErdTable => ({ name, columns });
const R = (from: string, fromField: string, to: string, toField: string): ErdRelation =>
  ({ from, fromField, to, toField, label: "N:1" });

describe("mergeErd", () => {
  it("규칙 1 — SQL 에 없던 기존 컬럼을 지우지 않는다", () => {
    const cur = { tables: [T("posts", [{ name: "id", type: "uuid", pk: true }, { name: "memo", type: "text" }])], relations: [] };
    const inc = { tables: [T("posts", [{ name: "id", type: "uuid", pk: true }, { name: "title", type: "text" }])], relations: [] };
    const out = mergeErd(cur, inc);
    expect(out.tables[0].columns.map((c) => c.name)).toEqual(["id", "title", "memo"]);
  });

  it("규칙 2 — 겹치는 컬럼은 SQL 정의(타입·PK·FK)로 갱신된다", () => {
    const cur = { tables: [T("a", [{ name: "code", type: "text", pk: true }])], relations: [] };
    const inc = { tables: [T("a", [{ name: "code", type: "varchar(20)" }])], relations: [] };
    const out = mergeErd(cur, inc);
    expect(out.tables[0].columns[0].type).toBe("varchar(20)");
    /* SQL 이 PK 라고 안 했으므로 PK 도 SQL 을 따른다 */
    expect(out.tables[0].columns[0].pk).toBeUndefined();
  });

  it("규칙 3 — 컬럼 순서는 SQL 정의 순서, 기존 전용 컬럼은 그 뒤", () => {
    const cur = { tables: [T("a", [{ name: "z", type: "text" }, { name: "keep", type: "text" }, { name: "a", type: "text" }])], relations: [] };
    const inc = { tables: [T("a", [{ name: "a", type: "text" }, { name: "z", type: "text" }])], relations: [] };
    const out = mergeErd(cur, inc);
    expect(out.tables[0].columns.map((c) => c.name)).toEqual(["a", "z", "keep"]);
  });

  it("규칙 4 — SQL 에 없는 테이블은 그대로 둔다", () => {
    const cur = { tables: [T("keep", [{ name: "id", type: "uuid" }]), T("a", [{ name: "id", type: "uuid" }])], relations: [] };
    const inc = { tables: [T("a", [{ name: "id", type: "uuid" }])], relations: [] };
    const out = mergeErd(cur, inc);
    expect(out.tables.map((t) => t.name)).toEqual(["keep", "a"]);
    expect(out.stats.keptTables).toBe(1);
    expect(out.stats.updatedTables).toBe(1);
  });

  it("새 테이블은 뒤에 추가되고 기존 테이블 순서는 유지된다", () => {
    const cur = { tables: [T("a", [{ name: "id", type: "uuid" }])], relations: [] };
    const inc = { tables: [T("b", [{ name: "id", type: "uuid" }])], relations: [] };
    const out = mergeErd(cur, inc);
    expect(out.tables.map((t) => t.name)).toEqual(["a", "b"]);
    expect(out.stats.addedTables).toBe(1);
  });

  it("같은 관계를 두 번 만들지 않는다", () => {
    const cur = {
      tables: [T("a", [{ name: "id", type: "uuid" }]), T("b", [{ name: "a_id", type: "uuid", fk: "a.id" }])],
      relations: [R("b", "a_id", "a", "id")],
    };
    const inc = {
      tables: [T("b", [{ name: "a_id", type: "uuid", fk: "a.id" }])],
      relations: [R("b", "a_id", "a", "id")],
    };
    const out = mergeErd(cur, inc);
    expect(out.relations).toHaveLength(1);
    expect(out.stats.addedRelations).toBe(0);
  });

  it("SQL 이 FK 를 바꾸면 그 컬럼의 기존 관계를 대체한다 (선이 두 개 나가지 않게)", () => {
    const cur = {
      tables: [T("a", [{ name: "id", type: "uuid" }]), T("c", [{ name: "id", type: "uuid" }]),
        T("b", [{ name: "ref", type: "uuid", fk: "a.id" }])],
      relations: [R("b", "ref", "a", "id")],
    };
    const inc = {
      tables: [T("b", [{ name: "ref", type: "uuid", fk: "c.id" }])],
      relations: [R("b", "ref", "c", "id")],
    };
    const out = mergeErd(cur, inc);
    expect(out.relations).toEqual([R("b", "ref", "c", "id")]);
  });

  it("존재하지 않는 테이블을 가리키는 관계는 버린다", () => {
    const cur = { tables: [T("a", [{ name: "id", type: "uuid" }])], relations: [] };
    const inc = { tables: [], relations: [R("a", "x", "ghost", "id")] };
    const out = mergeErd(cur, inc);
    expect(out.relations).toHaveLength(0);
  });
});

describe("describeImport — 적용 전 경고", () => {
  const cur = {
    tables: [
      T("posts", [{ name: "id", type: "uuid", pk: true }, { name: "title", type: "text" }, { name: "memo", type: "text" }]),
      T("legacy", [{ name: "id", type: "uuid" }]),
    ],
    relations: [],
  };
  const inc = {
    tables: [
      T("posts", [{ name: "id", type: "uuid", pk: true }, { name: "title", type: "varchar(200)" }, { name: "slug", type: "text" }]),
      T("brand_new", [{ name: "id", type: "uuid" }]),
    ],
    relations: [],
  };

  it("병합 — 바뀌는 컬럼을 이름과 전/후로 짚어준다", () => {
    const plan = describeImport(cur, inc, "merge");
    expect(plan.addedTables).toEqual(["brand_new"]);
    expect(plan.keptTables).toEqual(["legacy"]);
    expect(plan.removedTables).toEqual([]);

    const posts = plan.updatedTables.find((t) => t.name === "posts")!;
    expect(posts.added).toEqual(["slug"]);
    expect(posts.changed).toEqual([{ name: "title", before: "text", after: "varchar(200)" }]);
    /* 병합에선 memo 가 살아남으므로 삭제 항목이 없다 */
    expect(posts.changed.some((c) => c.after === "(삭제)")).toBe(false);
  });

  it("교체 — 사라지는 테이블과 컬럼까지 알려준다", () => {
    const plan = describeImport(cur, inc, "replace");
    expect(plan.removedTables).toEqual(["legacy"]);
    expect(plan.keptTables).toEqual([]);

    const posts = plan.updatedTables.find((t) => t.name === "posts")!;
    expect(posts.changed).toContainEqual({ name: "memo", before: "text", after: "(삭제)" });
  });
});

/* DROP/RENAME — "SQL 에 없음"(유지) 과 "SQL 이 지웠음"(삭제) 은 다르다.
   구별하지 않으면 병합 모드에서 삭제가 조용히 무시된다. */
describe("mergeErd — 명시적 삭제", () => {
  const cur = {
    tables: [
      T("posts", [{ name: "id", type: "uuid", pk: true }, { name: "legacy", type: "text" }]),
      T("junk", [{ name: "id", type: "uuid" }]),
    ],
    relations: [R("posts", "legacy", "junk", "id")],
  };

  it("DROP TABLE 이 병합 모드에서도 테이블을 지운다", () => {
    const out = mergeErd(cur, { tables: [], relations: [], removedTables: ["junk"] });
    expect(out.tables.map((t) => t.name)).toEqual(["posts"]);
    expect(out.stats.removedTables).toBe(1);
    /* 사라진 테이블로 향하던 관계도 함께 끊긴다 */
    expect(out.relations).toHaveLength(0);
  });

  it("DROP COLUMN 이 규칙 1(기존 컬럼 유지)에 되살아나지 않는다", () => {
    const out = mergeErd(cur, {
      tables: [], relations: [],
      removedColumns: [{ table: "posts", column: "legacy" }],
    });
    expect(out.tables[0].columns.map((c) => c.name)).toEqual(["id"]);
    expect(out.stats.removedColumns).toBe(1);
    /* 지워진 컬럼에서 나가던 선도 끊긴다 */
    expect(out.relations).toHaveLength(0);
  });

  it("삭제한 테이블은 '유지' 로 세지 않는다", () => {
    const out = mergeErd(cur, { tables: [], relations: [], removedTables: ["junk"] });
    expect(out.stats.keptTables).toBe(1);   // posts 만
  });

  it("경고에 삭제 대상이 이름과 함께 드러난다", () => {
    const plan = describeImport(cur, {
      tables: [], relations: [],
      removedTables: ["junk"],
      removedColumns: [{ table: "posts", column: "legacy" }],
    }, "merge");
    expect(plan.removedTables).toEqual(["junk"]);
    expect(plan.keptTables).not.toContain("junk");
    const posts = plan.updatedTables.find((t) => t.name === "posts")!;
    expect(posts.changed).toContainEqual({ name: "legacy", before: "text", after: "(삭제)" });
  });
});
