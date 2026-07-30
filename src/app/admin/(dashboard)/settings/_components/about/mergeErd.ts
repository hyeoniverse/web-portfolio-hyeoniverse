/* SQL 가져오기 — 병합(추가) 모드.
 *
 * 교체는 배열을 통째로 갈아끼우면 끝이지만, 병합은 "무엇을 정답으로 볼지" 를 정해야 한다.
 * 이 파일의 규칙(합의된 결정):
 *
 *  1. 같은 이름 테이블 → **컬럼 병합**. ERD 에만 있던 컬럼은 지우지 않는다.
 *     (병합을 고르는 의도가 '잃지 않기' 라, 테이블 단위로 덮으면 부분 교체가 돼 예상과 어긋난다)
 *  2. 같은 컬럼이 양쪽에 → **SQL 값으로 갱신**. 타입·PK·FK 는 SQL 을 정답으로 본다.
 *     (SQL 을 가져오는 행위 자체가 "실제 스키마를 반영하겠다" 는 뜻)
 *  3. 컬럼 순서 → **SQL 정의 순서**. SQL 에 없는 기존 전용 컬럼은 그 뒤에 이어 붙인다.
 *  4. SQL 에 없는 테이블은 손대지 않는다.
 *
 * 단 **DROP/RENAME 은 예외** — "SQL 에 없음"과 "SQL 이 지웠음"은 다르다.
 * 전자는 유지(규칙 1·4), 후자는 삭제다. 파서가 지운 것을 따로 알려주므로 그대로 반영한다.
 * 이걸 구별하지 않으면 DROP TABLE / DROP COLUMN 이 병합 모드에서 조용히 무시된다.
 *
 * 관계는 중복을 만들지 않는다. 단, SQL 이 다시 정의한 컬럼에서 나가던 기존 관계는
 * 규칙 2 에 따라 SQL 쪽으로 대체한다(안 그러면 한 컬럼에서 선이 두 개 나간다). */

import type { ErdTable, ErdRelation } from "@/data/about/types";

/** 병합에 들어오는 쪽 — 파서가 알려주는 명시적 삭제까지 함께 받는다 */
export interface IncomingErd {
  tables: ErdTable[];
  relations: ErdRelation[];
  removedTables?: string[];
  removedColumns?: { table: string; column: string }[];
}

interface MergeStats {
  /** SQL 에만 있어 새로 추가된 테이블 */
  addedTables: number;
  /** 양쪽에 있어 컬럼이 합쳐진 테이블 */
  updatedTables: number;
  /** SQL 에 없어 그대로 둔 테이블 */
  keptTables: number;
  addedColumns: number;
  addedRelations: number;
  /** DROP/RENAME 으로 사라지는 것 */
  removedTables: number;
  removedColumns: number;
}

export interface MergeResult {
  tables: ErdTable[];
  relations: ErdRelation[];
  stats: MergeStats;
}

const relKey = (r: ErdRelation) => `${r.from}.${r.fromField}->${r.to}.${r.toField}`;

/* ── 적용 전 경고용 변경 내역 ─────────────────────────────
   숫자만 보여주면 "무엇이 덮어써지는지" 를 알 수 없다. 병합도 규칙 2 때문에
   기존 컬럼 정의를 덮으므로, 바뀌는 컬럼을 이름까지 짚어준다. */

interface ColumnChange { name: string; before: string; after: string }
interface TableChange { name: string; added: string[]; changed: ColumnChange[] }

export interface ImportPlan {
  mode: "merge" | "replace";
  /** SQL 에만 있어 새로 생기는 테이블 */
  addedTables: string[];
  /** 양쪽에 있어 컬럼이 바뀌는 테이블 */
  updatedTables: TableChange[];
  /** 손대지 않는 테이블 (merge 전용) */
  keptTables: string[];
  /** 사라지는 테이블 (replace 전용) */
  removedTables: string[];
  addedRelations: number;
  removedRelations: number;
}

/** 컬럼 정의를 사람이 읽는 한 줄로 — 무엇이 무엇으로 바뀌는지 비교용.
    새로 생긴 속성도 여기 들어와야 "바뀌었는데 경고에 안 뜨는" 일이 없다. */
const describeColumn = (c: ErdTable["columns"][number]) => [
  c.type,
  c.pk ? "PK" : "",
  c.fk ? `→ ${c.fk}` : "",
  c.required ? "NOT NULL" : "",
  c.unique ? "UNIQUE" : "",
  c.indexed ? "INDEX" : "",
  c.defaultValue ? `= ${c.defaultValue}` : "",
  c.enumValues?.length ? `(${c.enumValues.join(", ")})` : "",
  c.comment ? `— ${c.comment}` : "",
].filter(Boolean).join(" ");

/** 적용하면 무엇이 바뀌는지 미리 계산한다 (실제 반영은 하지 않는다) */
export function describeImport(
  current: { tables: ErdTable[]; relations: ErdRelation[] },
  incoming: IncomingErd,
  mode: "merge" | "replace",
): ImportPlan {
  const currentByName = new Map(current.tables.map((t) => [t.name, t]));
  const incomingNames = new Set(incoming.tables.map((t) => t.name));
  /* DROP/RENAME 은 병합 모드에서도 실제로 지운다 — 경고에 반드시 드러나야 한다 */
  const dropTables = new Set(incoming.removedTables ?? []);
  const dropColumns = new Set((incoming.removedColumns ?? []).map((c) => `${c.table}.${c.column}`));
  const asDeleted = (c: ErdTable["columns"][number]) =>
    ({ name: c.name, before: describeColumn(c), after: "(삭제)" });

  const addedTables: string[] = [];
  const updatedTables: TableChange[] = [];

  incoming.tables.forEach((inc) => {
    const cur = currentByName.get(inc.name);
    if (!cur) { addedTables.push(inc.name); return; }

    const curByName = new Map(cur.columns.map((c) => [c.name, c]));
    const added: string[] = [];
    const changed: ColumnChange[] = [];
    inc.columns.forEach((c) => {
      const before = curByName.get(c.name);
      if (!before) { added.push(c.name); return; }
      const b = describeColumn(before);
      const a = describeColumn(c);
      if (b !== a) changed.push({ name: c.name, before: b, after: a });
    });

    /* replace 는 SQL 에 없는 컬럼이 통째로 사라지고, merge 는 DROP 한 것만 사라진다 */
    const dropped = cur.columns
      .filter((c) => (mode === "replace"
        ? !inc.columns.some((x) => x.name === c.name)
        : dropColumns.has(`${cur.name}.${c.name}`)))
      .map(asDeleted);

    if (added.length || changed.length || dropped.length) {
      updatedTables.push({ name: inc.name, added, changed: [...changed, ...dropped] });
    }
  });

  /* SQL 이 언급하지 않은 테이블이라도 DROP COLUMN 대상이면 "그대로 유지" 가 아니다 */
  current.tables.forEach((cur) => {
    if (incomingNames.has(cur.name) || dropTables.has(cur.name)) return;
    const dropped = cur.columns.filter((c) => dropColumns.has(`${cur.name}.${c.name}`)).map(asDeleted);
    if (dropped.length) updatedTables.push({ name: cur.name, added: [], changed: dropped });
  });

  const changedNames = new Set(updatedTables.map((t) => t.name));
  const untouched = current.tables
    .filter((t) => !incomingNames.has(t.name) && !dropTables.has(t.name) && !changedNames.has(t.name))
    .map((t) => t.name);
  /* 병합에서도 DROP/RENAME 한 것은 사라진다 */
  const droppedNames = current.tables.filter((t) => dropTables.has(t.name)).map((t) => t.name);

  const merged = mergeErd(current, incoming);
  const nextRelations = mode === "merge" ? merged.relations : incoming.relations;

  return {
    mode,
    addedTables,
    updatedTables,
    keptTables: mode === "merge" ? untouched : [],
    removedTables: mode === "replace"
      ? current.tables.filter((t) => !incomingNames.has(t.name)).map((t) => t.name)
      : droppedNames,
    addedRelations: Math.max(0, nextRelations.length - current.relations.length),
    removedRelations: Math.max(0, current.relations.length - nextRelations.length),
  };
}

export function mergeErd(
  current: { tables: ErdTable[]; relations: ErdRelation[] },
  incoming: IncomingErd,
): MergeResult {
  const stats: MergeStats = {
    addedTables: 0, updatedTables: 0, keptTables: 0, addedColumns: 0, addedRelations: 0,
    removedTables: 0, removedColumns: 0,
  };

  const incomingByName = new Map(incoming.tables.map((t) => [t.name, t]));
  const currentNames = new Set(current.tables.map((t) => t.name));

  /* SQL 이 명시적으로 지운 것 — 규칙 1·4 의 "유지" 보다 우선한다 */
  const dropTables = new Set(incoming.removedTables ?? []);
  const dropColumns = new Set((incoming.removedColumns ?? []).map((c) => `${c.table}.${c.column}`));

  const surviving = current.tables.filter((t) => {
    if (!dropTables.has(t.name)) return true;
    stats.removedTables++;
    return false;
  });

  /* 기존 순서를 유지한 채 자리에서 갱신 — 테이블이 위아래로 튀면 다이어그램 배치가 통째로 달라진다 */
  const tables: ErdTable[] = surviving.map((cur) => {
    const inc = incomingByName.get(cur.name);
    if (!inc) {
      /* SQL 이 이 테이블의 컬럼만 지운 경우 — 테이블 자체는 갱신 대상이 아니다 */
      const kept = cur.columns.filter((c) => !dropColumns.has(`${cur.name}.${c.name}`));
      if (kept.length === cur.columns.length) { stats.keptTables++; return cur; }
      stats.removedColumns += cur.columns.length - kept.length;
      stats.updatedTables++;
      return { ...cur, columns: kept };
    }

    const curByName = new Map(cur.columns.map((c) => [c.name, c]));
    /* 규칙 3 — SQL 정의 순서가 먼저. 규칙 2 — 겹치는 컬럼은 SQL 정의를 그대로 쓴다. */
    const merged = inc.columns.map((c) => {
      if (!curByName.has(c.name)) stats.addedColumns++;
      return { ...c };
    });
    /* 규칙 1 — SQL 에 없던 기존 컬럼은 뒤에 살려둔다. 단 SQL 이 **지운** 컬럼은 빼고. */
    const incNames = new Set(inc.columns.map((c) => c.name));
    cur.columns.forEach((c) => {
      if (incNames.has(c.name)) return;
      if (dropColumns.has(`${cur.name}.${c.name}`)) { stats.removedColumns++; return; }
      merged.push(c);
    });

    stats.updatedTables++;
    /* 규칙 2 의 연장 — 뷰 여부와 설명도 SQL 을 정답으로 본다.
       단 SQL 이 말하지 않은 것(설명 없음)은 기존을 지우지 않는다. */
    const next: ErdTable = { ...cur, columns: merged };
    if (inc.kind) next.kind = inc.kind; else delete next.kind;
    if (inc.comment) next.comment = inc.comment;
    return next;
  });

  /* SQL 에만 있는 테이블은 뒤에 추가 */
  incoming.tables.forEach((inc) => {
    if (currentNames.has(inc.name)) return;
    tables.push(inc);
    stats.addedTables++;
  });

  /* SQL 이 다시 정의한 컬럼에서 나가던 관계는 SQL 것으로 대체 (규칙 2) */
  const redefined = new Set<string>();
  incoming.tables.forEach((t) => t.columns.forEach((c) => redefined.add(`${t.name}.${c.name}`)));

  /* 재정의된 컬럼의 관계는 위에서 걷어내고 SQL 것을 다시 넣는다 —
     그건 "새로 추가" 가 아니라 제자리 교체이므로, 원래 없던 것만 센다(미리보기 숫자가 부풀지 않게). */
  const originalKeys = new Set(current.relations.map(relKey));
  const relations = current.relations.filter((r) =>
    !redefined.has(`${r.from}.${r.fromField}`)
    && !dropColumns.has(`${r.from}.${r.fromField}`));
  const seen = new Set(relations.map(relKey));
  incoming.relations.forEach((r) => {
    const k = relKey(r);
    if (seen.has(k)) return;
    seen.add(k);
    relations.push(r);
    if (!originalKeys.has(k)) stats.addedRelations++;
  });

  /* 존재하지 않는 테이블을 가리키는 관계는 버린다 (교체 경로와 같은 규칙) */
  const known = new Set(tables.map((t) => t.name));
  return {
    tables,
    relations: relations.filter((r) => known.has(r.from) && known.has(r.to)),
    stats,
  };
}
